begin;
-- Extend the existing immutable ledger. Historical costs and quantities are untouched.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.supplement_inventory_movements'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%' loop
 execute format('alter table public.supplement_inventory_movements drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.supplement_inventory_movements
 add constraint supplement_movement_kind check(kind in ('PURCHASE','SAMPLE','SALE','RETURN','ADJUSTMENT','DAMAGE','OTHER')),
 add constraint supplement_movement_sign check((kind in ('PURCHASE','SAMPLE','RETURN') and quantity>0) or (kind in ('SALE','DAMAGE') and quantity<0) or kind in ('ADJUSTMENT','OTHER')),
 add constraint supplement_movement_sale check(kind not in ('SALE','RETURN') or sale_price is not null),
 add constraint supplement_sample_zero check(kind<>'SAMPLE' or (unit_cost=0 and value_delta=0));
create or replace view public.supplement_inventory with (security_invoker=true) as
 select v.id as variant_id,coalesce(sum(m.quantity),0)::integer stock,coalesce(sum(m.value_delta),0) inventory_value,
 case when sum(m.quantity)>0 then sum(m.value_delta)/sum(m.quantity) else 0 end average_cost,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price else 0 end),0) revenue,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price+m.value_delta else 0 end),0) gross_profit,
 coalesce(sum(m.quantity) filter(where m.kind='PURCHASE'),0)::integer purchased_units,
 coalesce(sum(m.quantity) filter(where m.kind='SAMPLE'),0)::integer sample_units,
 coalesce(sum(m.value_delta) filter(where m.kind='PURCHASE')/nullif(sum(m.quantity) filter(where m.kind='PURCHASE'),0),0) purchase_average_cost
 from public.supplement_variants v left join public.supplement_inventory_movements m on m.variant_id=v.id group by v.id;
alter table public.supplement_prices add column suggested_neacea_price numeric(14,4) generated always as (case when tax_basis='gross' then round(public_price*0.8) when tax_basis='net' and vat_rate is not null then round(round(public_price*(1+vat_rate/100)*0.8)/(1+vat_rate/100),4) end) stored;
create table public.supplement_workflow_requests(
 request_id uuid primary key,actor_id text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now());
alter table public.supplement_workflow_requests enable row level security;
revoke all on public.supplement_workflow_requests from public,anon,authenticated,service_role;
grant select on public.supplement_workflow_requests to service_role;
create or replace function public.supplement_write(p_actor text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; p_id uuid; old_row jsonb; result jsonb; row_data jsonb; v public.supplement_variants; price public.supplement_prices;
 previous public.supplement_inventory_movements; sale public.supplement_inventory_movements;
 qty integer; stock_qty integer; cost numeric; inventory_total numeric; kind text; req uuid; sale_amount numeric; basis text; product public.supplement_products;
begin
 if not exists(select 1 from public.operator_effective_roles o where o.operator_id::text=p_actor and o.active=true
 and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]') || coalesce(to_jsonb(o)->'legacy_roles','[]')) r(role_name) where lower(r.role_name)=any(array['owner','admin','administrator','amministratore','titolare','super_admin','direzione']))) then raise exception 'FORBIDDEN'; end if;
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
 if kind in ('PURCHASE','SAMPLE','SALE','RETURN','DAMAGE') and qty<0 then raise exception 'INVALID_QUANTITY'; end if;
 if kind in ('SALE','DAMAGE') then qty=-abs(qty); elsif kind in ('PURCHASE','SAMPLE','RETURN') then qty=abs(qty); end if;
 if stock_qty+qty<0 then raise exception 'INSUFFICIENT_STOCK'; end if;
 if kind='SAMPLE' then
 if coalesce(nullif(p_data->>'unit_cost','')::numeric,0)<>0 then raise exception 'SAMPLE_COST_ZERO'; end if; cost=0;
 elsif kind='PURCHASE' or (qty>0 and kind in ('ADJUSTMENT','OTHER')) then
 cost=nullif(p_data->>'unit_cost','')::numeric;
 if cost is null or cost<0 then raise exception 'COST_REQUIRED'; end if;
 else cost=case when stock_qty>0 then inventory_total/stock_qty else 0 end; end if;
 sale_amount=nullif(p_data->>'sale_price','')::numeric;
 if kind='SALE' then sale_amount=coalesce(sale_amount,price.actual_sale_price,case when price.tax_basis='gross' then round(price.public_price*0.8) when price.vat_rate is not null then round(round(price.public_price*(1+price.vat_rate/100)*0.8)/(1+price.vat_rate/100),4) end); end if;
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
 if coalesce(row_data->>'variant_id','')='' then
 if coalesce(row_data->>'brand','')='' or coalesce(row_data->>'name','')='' or coalesce(row_data->>'format','')='' then raise exception 'MATCH_REVIEW_REQUIRED'; end if;
 perform supplement_workflow(p_actor,'intake',row_data || jsonb_build_object('kind',coalesce(row_data->>'kind','PURCHASE'),'document_id',v_id,'document_ref',old_row->>'reference'));
 continue; end if;
 if coalesce(row_data->>'kind','PURCHASE') not in ('PURCHASE','SAMPLE') then raise exception 'INVALID_SUPPLY_KIND'; end if;
 perform supplement_write(p_actor,'movement',row_data || jsonb_build_object('kind',coalesce(row_data->>'kind','PURCHASE'),'document_id',v_id,'document_id',v_id,'document_ref',old_row->>'reference'));
 end loop;
 update supplement_documents set status='imported',updated_at=now() where id=v_id returning to_jsonb(supplement_documents.*) into result;
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into supplement_audit(actor_id,operation,entity_id,before_data,after_data) values(p_actor,p_action,v_id,old_row,result);
 return result;
end $$;
revoke all on function public.supplement_write(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.supplement_write(text,text,jsonb) to service_role;

create function public.supplement_workflow(p_actor text,p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare req uuid; prior supplement_workflow_requests; p supplement_products; v supplement_variants; pr supplement_prices;
 pid uuid; vid uuid; ids uuid[]; result jsonb; payload jsonb; variants jsonb; item jsonb; tid uuid; tags jsonb; source jsonb; old_data jsonb;
begin
 if not exists(select 1 from operator_effective_roles o where o.operator_id::text=p_actor and o.active=true and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r(role_name) where lower(r.role_name)=any(array['owner','admin','administrator','amministratore','titolare','super_admin','direzione']))) then raise exception 'FORBIDDEN'; end if;
 req=(p_data->>'request_id')::uuid;
 if req is null then raise exception 'REQUEST_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('supplement-workflow',0));
 select * into prior from supplement_workflow_requests where request_id=req;
 if found then
 if prior.actor_id<>p_actor or prior.payload<>jsonb_build_object('action',p_action,'data',p_data) then raise exception 'REQUEST_REUSED'; end if;
 return prior.result;
 end if;
 if p_action='intake' then
 if coalesce(trim(p_data->>'brand'),'')='' or coalesce(trim(p_data->>'name'),'')='' or coalesce(trim(p_data->>'format'),'')='' then raise exception 'IDENTITY_REQUIRED'; end if;
 if coalesce(p_data->>'kind','') not in ('PURCHASE','SAMPLE') then raise exception 'INVALID_SUPPLY_KIND'; end if;
 select array_agg(id) into ids from supplement_variants where (nullif(trim(p_data->>'ean'),'') is not null and ean=trim(p_data->>'ean')) or (nullif(trim(p_data->>'sku'),'') is not null and lower(sku)=lower(trim(p_data->>'sku')));
 if cardinality(ids)>1 then raise exception 'IDENTITY_CONFLICT'; end if;
 vid=ids[1];
 if vid is null then
 select sv.id into vid from supplement_variants sv join supplement_products sp on sp.id=sv.product_id
 where lower(trim(sp.brand))=lower(trim(p_data->>'brand')) and lower(trim(sp.name))=lower(trim(p_data->>'name'))
 and lower(trim(sv.label))=lower(coalesce(nullif(trim(p_data->>'variant'),''),'Standard')) and lower(trim(sv.format))=lower(trim(p_data->>'format'));
 end if;
 if vid is null then
 select id into pid from supplement_products where lower(trim(brand))=lower(trim(p_data->>'brand')) and lower(trim(name))=lower(trim(p_data->>'name')) for update;
 if pid is null then insert into supplement_products(name,brand,updated_by) values(trim(p_data->>'name'),trim(p_data->>'brand'),p_actor) returning id into pid; end if;
 insert into supplement_variants(product_id,label,format,ean,sku,updated_by) values(pid,coalesce(nullif(trim(p_data->>'variant'),''),'Standard'),trim(p_data->>'format'),nullif(trim(p_data->>'ean'),''),nullif(trim(p_data->>'sku'),''),p_actor) returning id into vid;
 insert into supplement_prices(variant_id,tax_basis,vat_rate,updated_by) values(vid,coalesce(p_data->>'tax_basis','gross'),nullif(p_data->>'vat_rate','')::numeric,p_actor);
 else
 select * into v from supplement_variants where id=vid for update; pid=v.product_id;
 if (nullif(p_data->>'ean','') is not null and v.ean is not null and v.ean<>trim(p_data->>'ean')) or (nullif(p_data->>'sku','') is not null and v.sku is not null and lower(v.sku)<>lower(trim(p_data->>'sku'))) then raise exception 'IDENTITY_CONFLICT'; end if;
 update supplement_variants set ean=coalesce(ean,nullif(trim(p_data->>'ean'),'')),sku=coalesce(sku,nullif(trim(p_data->>'sku'),'')) where id=vid;
 select * into pr from supplement_prices where variant_id=vid;
 if coalesce(p_data->>'tax_basis',pr.tax_basis)<>pr.tax_basis then raise exception 'TAX_BASIS_LOCKED'; end if;
 end if;
 result=supplement_write(p_actor,'movement',jsonb_build_object('variant_id',vid,'kind',p_data->>'kind','quantity',p_data->'quantity','unit_cost',case when p_data->>'kind'='SAMPLE' then to_jsonb(0) else p_data->'unit_cost' end,'request_id',req,'document_id',p_data->>'document_id','document_ref',coalesce(p_data->>'document_ref',''),'lot',coalesce(p_data->>'lot',''),'notes',coalesce(p_data->>'notes','')));
 if p_data->>'kind'='SAMPLE' and coalesce(nullif(p_data->>'unit_cost','')::numeric,0)<>0 then raise exception 'SAMPLE_COST_ZERO'; end if;
 result=jsonb_build_object('product_id',pid,'variant_id',vid,'movement',result);
 elsif p_action in ('enrich','publish') then
 vid=(p_data->>'variant_id')::uuid;
 select * into v from supplement_variants where id=vid for update;
 if not found then raise exception 'VARIANT_NOT_ACTIVE'; end if;
 select * into p from supplement_products where id=v.product_id for update;
 if (p_data->>'updated_at')::timestamptz is distinct from p.updated_at then raise exception 'CONFLICT'; end if;
 old_data=to_jsonb(p); pid=p.id;
 if p_action='publish' then
 if p_data->>'approved' is distinct from 'true' or p.image_url='' or p.brand='' or coalesce(p.content->>'what','')='' or coalesce(p.content->>'effects','')='' or coalesce(p.content->>'usage','')='' or not exists(select 1 from supplement_sources where product_id=pid and verified_at is not null) or not exists(select 1 from supplement_prices where variant_id=vid and public_price is not null) then raise exception 'VERIFICATION_REQUIRED'; end if;
 update supplement_products set status='published',verified_at=now(),updated_at=clock_timestamp(),updated_by=p_actor where id=pid;
 else
 update supplement_products set description=coalesce(p_data->>'description',description),content=content||coalesce(p_data->'content','{}'),image_url=coalesce(p_data->>'image_url',image_url),status='draft',verified_at=null,updated_at=clock_timestamp(),updated_by=p_actor where id=pid;
 if p_data ? 'public_price' then update supplement_prices set public_price=(p_data->>'public_price')::numeric,updated_at=now(),updated_by=p_actor where variant_id=vid; end if;
 if p_data ? 'actual_sale_price' then update supplement_prices set actual_sale_price=nullif(p_data->>'actual_sale_price','')::numeric,updated_at=now(),updated_by=p_actor where variant_id=vid; end if;
 for item in select * from jsonb_array_elements(coalesce(p_data->'tags','[]')) loop
 insert into supplement_tags(family,label,color,updated_by) values(item->>'family',item->>'label',coalesce(item->>'color','#033d27'),p_actor) on conflict(family,label) do update set label=excluded.label returning id into tid;
 insert into supplement_product_tags values(pid,tid) on conflict do nothing;
 end loop;
 for source in select * from jsonb_array_elements(coalesce(p_data->'sources','[]')) loop
 insert into supplement_sources(product_id,variant_id,source_url,source_name,verified_at,extracted,created_by) values(pid,vid,source->>'url',coalesce(source->>'name','Produttore'),(p_data->>'verification_date')::timestamptz,p_data,p_actor);
 end loop;
 end if;
 select to_jsonb(sp) into result from supplement_products sp where id=pid;
 result=jsonb_build_object('product',result,'variant_id',vid);
 else raise exception 'UNKNOWN_ACTION'; end if;
 insert into supplement_audit(actor_id,operation,entity_id,before_data,after_data) values(p_actor,p_action,pid,old_data,result);
 insert into supplement_workflow_requests values(req,p_actor,jsonb_build_object('action',p_action,'data',p_data),result,now());
 return result;
end $$;
revoke all on function public.supplement_workflow(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.supplement_workflow(text,text,jsonb) to service_role;
comment on view public.supplement_inventory is 'Purchased/sample units are cumulative receipts; stock and sale costs use weighted-average valuation. Individual receipt lots retain actual unit cost.';

-- Small original receipts are private, capped at 2.5 MB per file by the API.
create table public.supplement_document_files(
 document_id uuid primary key references supplement_documents(id),mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
 filename text not null,base64 text not null check(length(base64)<=3500000));
alter table public.supplement_document_files enable row level security;
revoke all on public.supplement_document_files from public,anon,authenticated,service_role;
grant select on public.supplement_document_files to service_role;
create function public.supplement_upload(p_actor text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare doc supplement_documents;
begin
 if not exists(select 1 from operator_effective_roles o where o.operator_id::text=p_actor and o.active=true and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r(role_name) where lower(r.role_name)=any(array['owner','admin','administrator','amministratore','titolare','super_admin','direzione']))) then raise exception 'FORBIDDEN'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_data->>'sha256',0));
 select * into doc from supplement_documents where sha256=p_data->>'sha256';
 if found then return to_jsonb(doc); end if;
 insert into supplement_documents(reference,sha256,rows,created_by) values(p_data->>'reference',p_data->>'sha256','[]',p_actor) returning * into doc;
 insert into supplement_document_files values(doc.id,p_data->>'mime_type',p_data->>'filename',p_data->>'base64');
 insert into supplement_audit(actor_id,operation,entity_id,after_data) values(p_actor,'upload_document',doc.id,to_jsonb(doc));
 return to_jsonb(doc);
end $$;
revoke all on function public.supplement_upload(text,jsonb) from public,anon,authenticated;
grant execute on function public.supplement_upload(text,jsonb) to service_role;
commit;
