-- Suspension is administrative: never renew, recover, refund, or rewrite a ledger.
create function public.calendar_client_lifecycle(p_actor_id text,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb; actor jsonb; roles text[]; a jsonb; next_row jsonb;
 result jsonb; touched jsonb:='[]'; remaining jsonb; rows_now jsonb; rows_expected jsonb;
 target text:=p_payload->>'clientId'; action text:=p_payload->>'action';
 status text:=p_payload->>'status'; today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
 if actor is null or not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then raise exception 'Owner role required';end if;
 if target is null or action is null or action not in ('archive','reactivate') or
    action='archive' and (status is null or status not in ('Ibernato','Non rinnova','Eliminato')) then raise exception 'Operazione cliente non valida';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients in share row exclusive mode;
 select to_jsonb(x) into c from public.clients x where x.id=target;
 if c is null then raise exception 'Cliente non trovato';end if;
 -- An identical retry after a lost response must not touch the package again.
 if action='archive' and c->>'active'='false' and c->>'stato_abbonamento'=status or
    action='reactivate' and c->>'active'='true' and c->>'stato_abbonamento'='Attivo' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into touched from public.appointments x where
   x.client_ids @> jsonb_build_array(target) or x.id in
    (select value->>'id' from jsonb_array_elements(coalesce(p_payload->'expectedAppointments','[]')));
  return jsonb_build_object('client',c,'appointments',touched);
 end if;
 if nullif(p_payload->>'expectedUpdatedAt','') is null or
    (c->>'updated_at')::timestamptz is distinct from (p_payload->>'expectedUpdatedAt')::timestamptz then
  raise exception 'Cliente cambiato: ricarica prima di riprovare';
 end if;
 if action='archive' then
  if jsonb_typeof(p_payload->'expectedAppointments') is distinct from 'array' then raise exception 'Anteprima prenotazioni mancante';end if;
  select coalesce(jsonb_agg(public.calendar_appointment_fields(to_jsonb(x)) order by x.id),'[]') into rows_now
   from public.appointments x where x.client_ids @> jsonb_build_array(target) and x.date>=today and x.status='prenotato';
  select coalesce(jsonb_agg(public.calendar_appointment_fields(to_jsonb(jsonb_populate_record(null::public.appointments,value))) order by value->>'id'),'[]') into rows_expected
   from jsonb_array_elements(p_payload->'expectedAppointments');
  if rows_now is distinct from rows_expected then raise exception 'Prenotazioni cambiate: ricarica prima di riprovare';end if;
  for a in select to_jsonb(x) from public.appointments x where x.client_ids @> jsonb_build_array(target) and x.date>=today and x.status='prenotato' order by x.id loop
   select coalesce(jsonb_agg(value),'[]') into remaining from jsonb_array_elements(a->'client_ids')
    where value<>to_jsonb(target) and exists(select 1 from public.clients x where x.id=value#>>'{}' and x.active);
   next_row:=a||case when a->>'service_id'<>'pt12' and jsonb_array_length(remaining)>0
    then jsonb_build_object('client_ids',remaining) else jsonb_build_object('status','annullato') end;
   -- Call the audited SQL primitive directly, never the automatic-recovery route.
   result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',next_row,'expected',a));
   touched:=touched||jsonb_build_array(result->'appointment');
  end loop;
 end if;
 result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(
  jsonb_build_object('id',target,'active',action='reactivate','stato_abbonamento',case when action='reactivate' then 'Attivo' else status end,'updated_at',clock_timestamp()))));
 return jsonb_build_object('client',result->0,'appointments',touched);
end $$;
revoke all on function public.calendar_client_lifecycle(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_client_lifecycle(text,uuid,jsonb) to service_role;
