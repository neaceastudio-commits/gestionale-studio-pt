-- Preserve existing access; block only when Direzione explicitly disables a PT.
alter table public.operators
  add column if not exists portal_access_enabled boolean not null default true,
  add column if not exists portal_access_version integer not null default 0;

create or replace function public.pt_portal_access_version_bump()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.portal_access_enabled is distinct from new.portal_access_enabled then
    new.portal_access_version := old.portal_access_version + 1;
  else
    new.portal_access_version := old.portal_access_version;
  end if;
  return new;
end;
$$;
revoke all on function public.pt_portal_access_version_bump() from public, anon, authenticated;
drop trigger if exists pt_portal_access_version on public.operators;
create trigger pt_portal_access_version before update on public.operators
for each row execute function public.pt_portal_access_version_bump();
-- Existing operator mutations remain available only through the audited service gateway.
revoke insert, update, delete on public.operators from anon, authenticated;

-- Include the access decision in the existing immutable activity log.
create or replace function public.calendar_audit_fields(kind text, row_data jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; ledger_text text; ledger jsonb; cycle jsonb;
begin
 if row_data is null then return null;end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into result from jsonb_each(row_data)
 where key=any(case kind when 'appointments' then array['id','date','start_time','duration_min','buffer_min','service_id','operator_id','client_ids','status']
 when 'operator_availability' then array['operator_id','day_key','slots']
 when 'trainer_client_assignments' then array['id','trainer_id','client_id','assigned_by','assignment_source','active','ended_at']
 when 'operators' then array['id','nome','cognome','active','roles','portal_access_enabled','portal_access_version']
 else array['id','sessions_total','sessions_remaining','pt_assegnato','package_start','data_inizio','data_conferma','active','package_types','package_frequency','giorni_settimana','tipo_servizio','tipo_abbonamento','stato_abbonamento'] end);
 if kind in ('clients','appointments') then
  result:=result||jsonb_build_object('cycle_start',substring(coalesce(row_data->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),'cycle_id',substring(coalesce(row_data->>'notes','') from '\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]'));
 end if;
 if kind='clients' then
  ledger_text:=substring(coalesce(row_data->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]');
  if ledger_text is not null then
   begin
    ledger:=ledger_text::jsonb;
    select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value,n) order by case when coalesce(value->>'closedAt','')='' then 0 else 1 end,n desc limit 1;
    result:=result||jsonb_build_object('cycle_id',cycle->>'id','cycle_start',cycle->>'startDate');
   exception when others then result:=result||'{"cycle_parse_error":true}'::jsonb;end;
  end if;
 end if;
 return result;
end; $$;
