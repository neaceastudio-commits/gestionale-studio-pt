begin;
drop view public.supplement_inventory;
-- Four net decimals preserve exact whole-euro VAT-inclusive selling prices.
alter table public.supplement_prices alter column actual_sale_price type numeric(14,4);
alter table public.supplement_inventory_movements alter column sale_price type numeric(14,4);
create view public.supplement_inventory with (security_invoker=true) as
 select v.id as variant_id, coalesce(sum(m.quantity),0)::integer as stock,
 coalesce(sum(m.value_delta),0) as inventory_value,
 case when sum(m.quantity)>0 then sum(m.value_delta)/sum(m.quantity) else 0 end as average_cost,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price else 0 end),0) as revenue,
 coalesce(sum(case when m.kind in ('SALE','RETURN') then -m.quantity*m.sale_price+m.value_delta else 0 end),0) as gross_profit
 from public.supplement_variants v left join public.supplement_inventory_movements m on m.variant_id=v.id group by v.id;
revoke all on public.supplement_inventory from public,anon,authenticated;
grant select on public.supplement_inventory to service_role;


-- Match the existing API role normalization (e.g. legacy role "Direzione").
-- No new roles or grants: only the already supported role names are accepted.
do $fix$ declare body text; old_check text := '(coalesce(to_jsonb(o)->''system_roles'',''[]'') || coalesce(to_jsonb(o)->''legacy_roles'',''[]'')) ?| array[''owner'',''admin'',''administrator'',''amministratore'',''titolare'',''super_admin'',''direzione'']';
new_check text := 'exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->''system_roles'',''[]'') || coalesce(to_jsonb(o)->''legacy_roles'',''[]'')) as r(role_name) where lower(r.role_name) = any(array[''owner'',''admin'',''administrator'',''amministratore'',''titolare'',''super_admin'',''direzione'']))';
begin
 select pg_get_functiondef('public.supplement_write(text,text,jsonb)'::regprocedure) into body;
 if position(old_check in body)>0 then execute replace(body,old_check,new_check);
 elsif position(new_check in body)=0 then raise exception 'SUPPLEMENT_ROLE_CHECK_CHANGED'; end if;
end $fix$;
commit;
