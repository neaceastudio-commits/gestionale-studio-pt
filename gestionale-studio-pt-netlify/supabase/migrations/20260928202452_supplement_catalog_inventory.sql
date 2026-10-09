begin;
-- PT sessions are signed by the existing gateway, not Supabase Auth JWTs.
-- No browser role may access these tables: all reads pass through supplements API.
create table public.supplement_products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 200),
 brand text not null default '', description text not null default '', content jsonb not null default '{}',
 image_url text not null default '', image_scale numeric not null default 1 check(image_scale between 1 and 3), status text not null default 'draft' check(status in ('draft','published','archived')),
 verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by text not null
);
create unique index supplement_products_identity on public.supplement_products(lower(trim(name)),lower(trim(brand)));
create table public.supplement_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.supplement_products(id),
 label text not null, format text not null default '', sku text unique, ean text unique,
 content jsonb not null default '{}', image_url text not null default '', active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by text not null,
 unique(product_id,label,format)
);
create table public.supplement_prices (
 variant_id uuid primary key references public.supplement_variants(id), public_price numeric(12,2) check(public_price >= 0 and public_price <> 'NaN'::numeric),
 suggested_price numeric(12,2) generated always as (round(public_price * 0.8,2)) stored,
 actual_sale_price numeric(12,2) check(actual_sale_price >= 0 and actual_sale_price <> 'NaN'::numeric), reorder_level integer not null default 2 check(reorder_level>=0),
 tax_basis text not null default 'unknown' check(tax_basis in ('unknown','gross','net')), vat_rate numeric(5,2) check(vat_rate between 0 and 100),
 updated_at timestamptz not null default now(), updated_by text not null
);
create table public.supplement_tags (
 id uuid primary key default gen_random_uuid(), family text not null, label text not null,
 color text not null default '#033d27' check(color ~ '^#[0-9A-Fa-f]{6}$'), unique(family,label),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by text not null
);
create table public.supplement_product_tags (
 product_id uuid not null references public.supplement_products(id), tag_id uuid not null references public.supplement_tags(id), primary key(product_id,tag_id)
);
create table public.supplement_sources (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.supplement_products(id),
 variant_id uuid references public.supplement_variants(id), source_url text not null, source_name text not null,
 verified_at timestamptz, extracted jsonb not null default '{}', created_at timestamptz not null default now(), created_by text not null
);
create table public.supplement_documents (
 id uuid primary key default gen_random_uuid(), reference text not null unique, sha256 text unique,
 status text not null default 'review' check(status in ('review','imported')), rows jsonb not null default '[]',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by text not null
);
create table public.supplement_inventory_movements (
 id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.supplement_variants(id),
 kind text not null check(kind in ('PURCHASE','SALE','ADJUSTMENT','RETURN','DAMAGE','OTHER')),
 quantity integer not null check(quantity <> 0), unit_cost numeric(20,8) not null check(unit_cost>=0 and unit_cost <> 'NaN'::numeric),
 value_delta numeric(18,4) not null, sale_price numeric(12,2) check(sale_price>=0 and sale_price <> 'NaN'::numeric), tax_basis text not null check(tax_basis in ('gross','net')),
 vat_rate numeric(5,2), document_id uuid references public.supplement_documents(id), document_ref text not null default '',
 lot text not null default '', notes text not null default '', occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(), created_by text not null,
 request_id uuid not null unique, request_payload jsonb not null, return_of uuid references public.supplement_inventory_movements(id),
 check((kind in ('PURCHASE','RETURN') and quantity>0) or (kind in ('SALE','DAMAGE') and quantity<0) or kind in ('ADJUSTMENT','OTHER')),
 check(kind not in ('SALE','RETURN') or sale_price is not null)
);
create index supplement_variants_product_idx on public.supplement_variants(product_id);
create index supplement_movements_variant_idx on public.supplement_inventory_movements(variant_id,created_at);
create index supplement_sources_product_idx on public.supplement_sources(product_id);
create index supplement_product_tags_tag_idx on public.supplement_product_tags(tag_id);
create index supplement_movements_document_idx on public.supplement_inventory_movements(document_id);
create table public.supplement_audit (
 id uuid primary key default gen_random_uuid(), actor_id text not null, operation text not null, entity_id uuid,
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['supplement_products','supplement_variants','supplement_prices','supplement_tags','supplement_product_tags','supplement_sources','supplement_documents','supplement_inventory_movements','supplement_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
 execute format('grant select on public.%I to service_role',t);
 end loop;
end $$;
-- Weighted inventory value is kept in immutable ledger entries, no mutable stock counter.
create view public.supplement_inventory with (security_invoker=true) as
 select v.id as variant_id, coalesce(sum(m.quantity),0)::integer as stock,
 coalesce(sum(m.value_delta),0) as inventory_value,
 case when sum(m.quantity)>0 then sum(m.value_delta)/sum(m.quantity) else 0 end as average_cost,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price else 0 end),0) as revenue,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price+m.value_delta else 0 end),0) as gross_profit
 from public.supplement_variants v left join public.supplement_inventory_movements m on m.variant_id=v.id group by v.id;
revoke all on public.supplement_inventory from public,anon,authenticated;
grant select on public.supplement_inventory to service_role;

-- Internal gateway; service_role only. Current operator roles are rechecked in SQL.
create function public.supplement_write(p_actor text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; p_id uuid; old_row jsonb; result jsonb; row_data jsonb; v public.supplement_variants; price public.supplement_prices;
 previous public.supplement_inventory_movements; sale public.supplement_inventory_movements;
 qty integer; stock_qty integer; cost numeric; inventory_total numeric; kind text; req uuid; sale_amount numeric; basis text; product public.supplement_products;
begin
 if not exists(select 1 from public.operator_effective_roles o where o.operator_id::text=p_actor and o.active=true
 and (coalesce(to_jsonb(o)->'system_roles','[]') || coalesce(to_jsonb(o)->'legacy_roles','[]')) ?| array['owner','admin','administrator','amministratore','titolare','super_admin','direzione']) then raise exception 'FORBIDDEN'; end if;
 if p_action='product' then
 p_id=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
 select * into product from supplement_products where id=p_id for update;
 old_row=to_jsonb(product);
 if found and (p_data->>'updated_at')::timestamptz is distinct from product.updated_at then raise exception 'CONFLICT'; end if;
 if p_data->>'status'='published' and (coalesce(p_data->>'image_url','')='' or coalesce(p_data->>'brand','')='' or coalesce(p_data->>'source_url','')='' or p_data->>'approved' is distinct from 'true') then raise exception 'VERIFICATION_REQUIRED'; end if;
 insert into supplement_products(id,name,brand,description,content,image_url,image_scale,status,verified_at,updated_by)
 values(p_id,p_data->>'name',coalesce(p_data->>'brand',''),coalesce(p_data->>'description',''),coalesce(p_data->'content','{}'),coalesce(p_data->>'image_url',''),coalesce((p_data->>'image_scale')::numeric,1),coalesce(p_data->>'status','draft'),case when p_data->>'approved'='true' then now() end,p_actor)
 on conflict(id) do update set name=excluded.name,brand=excluded.brand,description=excluded.description,content=excluded.content,image_url=excluded.image_url,image_scale=excluded.image_scale,status=excluded.status,verified_at=excluded.verified_at,updated_at=clock_timestamp(),updated_by=p_actor;
 for row_data in select * from jsonb_array_elements(p_data->'variants') loop
 v_id=coalesce(nullif(row_data->>'id','')::uuid,gen_random_uuid());
 if exists(select 1 from supplement_variants where id=v_id and product_id<>p_id) then raise exception 'VARIANT_MISMATCH'; end if;
 insert into supplement_variants(id,product_id,label,format,sku,ean,content,image_url,active,updated_by)
 values(v_id,p_id,row_data->>'label',coalesce(row_data->>'format',''),nullif(row_data->>'sku',''),nullif(row_data->>'ean',''),coalesce(row_data->'content','{}'),coalesce(row_data->>'image_url',''),coalesce((row_data->>'active')::boolean,true),p_actor)
 on conflict(id) do update set label=excluded.label,format=excluded.format,sku=excluded.sku,ean=excluded.ean,content=excluded.content,image_url=excluded.image_url,active=excluded.active,updated_at=now(),updated_by=p_actor;
 if exists(select 1 from supplement_inventory_movements where variant_id=v_id) and exists(select 1 from supplement_prices where variant_id=v_id and tax_basis<>coalesce(row_data->>'tax_basis','unknown')) then raise exception 'TAX_BASIS_LOCKED'; end if;
 insert into supplement_prices(variant_id,public_price,actual_sale_price,reorder_level,tax_basis,vat_rate,updated_by)
 values(v_id,nullif(row_data->>'public_price','')::numeric,nullif(row_data->>'actual_sale_price','')::numeric,coalesce((row_data->>'reorder_level')::integer,2),coalesce(row_data->>'tax_basis','unknown'),nullif(row_data->>'vat_rate','')::numeric,p_actor)
 on conflict(variant_id) do update set public_price=excluded.public_price,actual_sale_price=excluded.actual_sale_price,reorder_level=excluded.reorder_level,tax_basis=excluded.tax_basis,vat_rate=excluded.vat_rate,updated_at=now(),updated_by=p_actor;
 end loop;
 delete from supplement_product_tags where product_id=p_id;
 insert into supplement_product_tags select p_id,value::uuid from jsonb_array_elements_text(coalesce(p_data->'tags','[]'));
 if coalesce(p_data->>'source_url','')<>'' then
 insert into supplement_sources(product_id,source_url,source_name,verified_at,extracted,created_by) values(p_id,p_data->>'source_url',coalesce(p_data->>'source_name','Produttore'),case when p_data->>'approved'='true' then now() end,coalesce(p_data->'content','{}'),p_actor);
 end if;
 select to_jsonb(p) into result from supplement_products p where id=p_id;
 v_id=p_id;
 elsif p_action='tag' then
 v_id=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
 select to_jsonb(t) into old_row from supplement_tags t where id=v_id;
 insert into supplement_tags(id,family,label,color,updated_by) values(v_id,p_data->>'family',p_data->>'label',coalesce(p_data->>'color','#033d27'),p_actor)
 on conflict(id) do update set family=excluded.family,label=excluded.label,color=excluded.color,updated_by=p_actor,updated_at=now() returning to_jsonb(supplement_tags.*) into result;
 elsif p_action='movement' then
 req=(p_data->>'request_id')::uuid;
 -- Serialize retries as well as competing sales. Prevent double spending stock.
 perform pg_advisory_xact_lock(hashtextextended(req::text,0));
 select * into previous from supplement_inventory_movements where request_id=req;
 if found then
 if previous.request_payload<>p_data or previous.created_by<>p_actor then raise exception 'REQUEST_REUSED'; end if;
 return to_jsonb(previous);
 end if;
 v_id=(p_data->>'variant_id')::uuid;
 select * into v from supplement_variants where id=v_id for update;
 if not found or not v.active then raise exception 'VARIANT_NOT_ACTIVE'; end if;
 select * into price from supplement_prices where variant_id=v_id;
 basis=price.tax_basis;
 if basis is null or basis='unknown' then raise exception 'TAX_BASIS_REQUIRED'; end if;
 select coalesce(sum(quantity),0),coalesce(sum(value_delta),0) into stock_qty,inventory_total from supplement_inventory_movements where variant_id=v_id;
 qty=(p_data->>'quantity')::integer; kind=p_data->>'kind';
 if qty is null or qty=0 or abs(qty)>100000 then raise exception 'INVALID_QUANTITY'; end if;
 if kind in ('PURCHASE','SALE','RETURN','DAMAGE') and qty<0 then raise exception 'INVALID_QUANTITY'; end if;
 if kind in ('SALE','DAMAGE') then qty=-abs(qty); elsif kind in ('PURCHASE','RETURN') then qty=abs(qty); end if;
 if stock_qty+qty<0 then raise exception 'INSUFFICIENT_STOCK'; end if;
 if kind='PURCHASE' or (qty>0 and kind in ('ADJUSTMENT','OTHER')) then
 cost=nullif(p_data->>'unit_cost','')::numeric;
 if cost is null or cost<0 then raise exception 'COST_REQUIRED'; end if;
 else cost=case when stock_qty>0 then inventory_total/stock_qty else 0 end; end if;
 sale_amount=nullif(p_data->>'sale_price','')::numeric;
 if kind='SALE' then sale_amount=coalesce(sale_amount,price.actual_sale_price,price.suggested_price); end if;
 if kind='RETURN' then
 select * into sale from supplement_inventory_movements m where m.id=(p_data->>'return_of')::uuid and m.kind='SALE' and m.variant_id=v_id;
 if not found then raise exception 'RETURN_SALE_REQUIRED'; end if;
 if qty+coalesce((select sum(quantity) from supplement_inventory_movements where return_of=sale.id),0)>-sale.quantity then raise exception 'EXCESS_RETURN'; end if;
 cost=sale.unit_cost; sale_amount=sale.sale_price;
 end if;
 if kind in ('SALE','RETURN') and (sale_amount is null or sale_amount<0) then raise exception 'SALE_PRICE_REQUIRED'; end if;
 if kind in ('ADJUSTMENT','OTHER','DAMAGE') and length(trim(coalesce(p_data->>'notes','')))=0 then raise exception 'NOTES_REQUIRED'; end if;
 insert into supplement_inventory_movements(variant_id,kind,quantity,unit_cost,value_delta,sale_price,tax_basis,vat_rate,document_id,document_ref,lot,notes,occurred_at,created_by,request_id,request_payload,return_of)
 values(v_id,kind,qty,cost,case when qty=-stock_qty then -inventory_total else round(qty*cost,4) end,sale_amount,basis,price.vat_rate,nullif(p_data->>'document_id','')::uuid,coalesce(p_data->>'document_ref',''),coalesce(p_data->>'lot',''),coalesce(p_data->>'notes',''),coalesce(nullif(p_data->>'occurred_at','')::timestamptz,now()),p_actor,req,p_data,case when kind='RETURN' then (p_data->>'return_of')::uuid end)
 returning to_jsonb(supplement_inventory_movements.*) into result;
 elsif p_action='document' then
 v_id=coalesce(nullif(p_data->>'id','')::uuid,gen_random_uuid());
 perform 1 from supplement_documents where id=v_id for update;
 if exists(select 1 from supplement_documents where id=v_id and status='imported') then raise exception 'ALREADY_IMPORTED'; end if;
 insert into supplement_documents(id,reference,sha256,rows,created_by) values(v_id,p_data->>'reference',nullif(p_data->>'sha256',''),p_data->'rows',p_actor)
 on conflict(id) do update set reference=excluded.reference,rows=excluded.rows,updated_at=now() returning to_jsonb(supplement_documents.*) into result;
 elsif p_action='import_document' then
 v_id=(p_data->>'id')::uuid;
 select to_jsonb(d) into old_row from supplement_documents d where id=v_id for update;
 if old_row is null then raise exception 'DOCUMENT_MISSING'; end if;
 if old_row->>'status'='imported' then return old_row; end if;
 for row_data in select * from jsonb_array_elements(old_row->'rows') loop
 if coalesce(row_data->>'variant_id','')='' then raise exception 'MATCH_REVIEW_REQUIRED'; end if;
 perform supplement_write(p_actor,'movement',row_data || jsonb_build_object('kind','PURCHASE','document_id',v_id,'document_ref',old_row->>'reference'));
 end loop;
 update supplement_documents set status='imported',updated_at=now() where id=v_id returning to_jsonb(supplement_documents.*) into result;
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into supplement_audit(actor_id,operation,entity_id,before_data,after_data) values(p_actor,p_action,v_id,old_row,result);
 return result;
end $$;
revoke all on function public.supplement_write(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.supplement_write(text,text,jsonb) to service_role;
insert into supplement_tags(family,label,color,updated_by)
select family,label,color,'initial-taxonomy' from (values
('Obiettivo','Performance','#033d27'),('Obiettivo','Salute','#033d27'),('Obiettivo','Forza','#033d27'),('Obiettivo','Potenza','#033d27'),('Obiettivo','Energia','#033d27'),('Obiettivo','Recupero','#033d27'),('Obiettivo','Sonno','#033d27'),('Obiettivo','Benessere','#033d27'),
('Momento','Pre-workout','#163f73'),('Momento','Intra-workout','#163f73'),('Momento','Post-workout','#163f73'),('Momento','Quotidiano','#163f73'),
('Tipologia','Creatina','#5a7288'),('Tipologia','Proteine','#5a7288'),('Tipologia','Carboidrati','#5a7288'),('Tipologia','Minerali','#5a7288'),('Tipologia','Aminoacidi','#5a7288'),('Tipologia','Estratti','#5a7288'),('Tipologia','Alimenti sportivi','#5a7288'),('Tipologia','Pre-workout','#5a7288'),
('Caratteristiche','Senza glutine','#2d6a4f'),('Caratteristiche','Senza lattosio','#2d6a4f'),('Caratteristiche','Senza caffeina','#2d6a4f'),('Caratteristiche','Vegan','#2d6a4f'),('Caratteristiche','Vegetariano','#2d6a4f')) s(family,label,color);

-- Identification drafts only. The actual STIV supplements DDT is not available.
do $$ declare p uuid; v uuid; item jsonb; variant text; begin
 for item in select * from jsonb_array_elements($seed$[{"name": "Perfect Cream", "format": "300 g", "variants": ["Pistacchio"]}, {"name": "Hydro 90 BV 104", "format": "900 g", "variants": ["Wafer Nocciola", "Cioccolato Fondente", "Cioccolato"]}, {"name": "PW1 Pre Workout", "format": "300 g", "variants": ["Con caffeina · Agrumi", "Senza caffeina · Tè alla Pesca"]}, {"name": "Creatine Monohydrate", "format": "300 g", "variants": ["Neutro"]}, {"name": "Collagene Rigenera", "format": "333 g", "variants": ["Vaniglia"]}, {"name": "Gel Give Me Five", "format": "50 ml", "variants": ["Lemon Cola"]}, {"name": "Avena Farina Gluten Free", "format": "1 kg", "variants": ["Vaniglia", "Cocco Cioccolato Bianco"]}, {"name": "Bromelina", "format": "60 cpr", "variants": ["Standard"]}, {"name": "Magnesio Bisglicinato", "format": "90 cpr", "variants": ["Standard"]}, {"name": "Low Sugar Pancake Gluten Free", "format": "800 g", "variants": ["Cookies"]}, {"name": "Crema di Arachidi Peanut Butter", "format": "350 g", "variants": ["Smooth"]}, {"name": "Crema di Arachidi Peanut Butter Iperproteico", "format": "", "variants": ["Crunch"]}, {"name": "NAC 600 Plus", "format": "60 cpr", "variants": ["Standard"]}, {"name": "Cluster Dextrin Pure", "format": "500 g", "variants": ["Standard"]}, {"name": "Maltodestrine", "format": "1 kg", "variants": ["Standard"]}]$seed$::jsonb) loop
 insert into supplement_products(name,updated_by) values(item->>'name','initial-unverified-list') returning id into p;
 for variant in select * from jsonb_array_elements_text(item->'variants') loop
 insert into supplement_variants(product_id,label,format,updated_by) values(p,variant,item->>'format','initial-unverified-list') returning id into v;
 insert into supplement_prices(variant_id,updated_by) values(v,'initial-unverified-list');
 end loop;end loop;end $$;

-- The reference image identifies Powerbar. Official content is staged for review;
-- no DDT codes, economic values, stock or publication are inferred.
do $$ declare candidate jsonb; p uuid; begin
 candidate=$candidate${"id": "creatine-preview", "name": "Creatine Monohydrate", "brand": "Powerbar · Black Line", "image_scale": 2.3, "description": "Creatina monoidrato Creapure®, in polvere e dal gusto neutro.", "image_url": "https://www.powerbar.com/cdn/shop/files/Black-Line-Packshot-Creatine.png?v=1784627539&width=1000", "verified_at": "2026-09-28T20:00:00Z", "content": {"what": "Integratore alimentare in polvere a base di creatina monoidrato Creapure®.", "effects": "La creatina aumenta le prestazioni fisiche in attività ripetitive, di elevata intensità e di breve durata. L’effetto si ottiene con 3 g di creatina al giorno.", "usefulness": "Può essere considerata nel contesto di allenamenti che prevedono sforzi brevi e intensi.", "audience": "Adulti che praticano esercizio fisico ad alta intensità.", "usage": "Il produttore indica una porzione al giorno: mescolare 3,4 g di polvere in 200 ml di acqua o succo.", "nutrition": "Per porzione di 3,4 g:\nCreatina: 3,0 g\nPer 100 g: creatina 87,9 g.", "ingredients": "Creatina monoidrato.", "allergens": "Può contenere uova, soia e latte. Verificare sempre l’etichetta della confezione disponibile in studio.", "warnings": "Non superare la dose consigliata. Tenere lontano dai bambini. Non indicato per bambini e adolescenti. Può causare aumento di peso. Non sostituisce una dieta varia ed equilibrata e uno stile di vita sano."}, "tags": [{"id": "creatina", "family": "Tipologia", "label": "Creatina", "color": "#033d27"}, {"id": "performance", "family": "Obiettivo", "label": "Performance", "color": "#033d27"}], "variants": [{"id": "creatine-neutral", "label": "Neutro", "format": "300 g", "available": false, "content": {}}], "sources": [{"source_url": "https://www.powerbar.com/de-de/products/creatine-monohydrate", "source_name": "Powerbar · scheda ufficiale", "verified_at": "2026-09-28T20:00:00Z"}]}$candidate$::jsonb;
 select id into p from supplement_products where name='Creatine Monohydrate' and brand='';
 update supplement_products set brand=candidate->>'brand',description=candidate->>'description',content=candidate->'content',image_url=candidate->>'image_url',image_scale=2.3 where id=p;
 insert into supplement_sources(product_id,source_url,source_name,extracted,created_by) values(p,'https://www.powerbar.com/de-de/products/creatine-monohydrate','Powerbar · scheda ufficiale',candidate->'content','official-source-draft');
 insert into supplement_product_tags select p,id from supplement_tags where (family='Tipologia' and label='Creatina') or (family='Obiettivo' and label='Performance');
end $$;
commit;
