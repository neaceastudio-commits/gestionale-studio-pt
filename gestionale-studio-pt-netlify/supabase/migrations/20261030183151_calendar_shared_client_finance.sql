-- Gateway server-only: lock, optimistic concurrency, and the existing audit
-- remain in the same transaction. No new table, RLS policy or public grant.
create function public.calendar_save_client_finance(p_actor_id text,p_client_id text,p_expected jsonb,p_values jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous public.clients; result jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 select * into previous from public.clients where id=p_client_id for update;
 if previous.id is null or not previous.active then raise exception 'Cliente attivo non trovato'; end if;
 if p_expected is null or (p_expected->'notes',p_expected->'importo',p_expected->'stato_pagamento',p_expected->'email') is distinct from
    (to_jsonb(previous)->'notes',to_jsonb(previous)->'importo',to_jsonb(previous)->'stato_pagamento',to_jsonb(previous)->'email') then
  raise exception 'Dati economici cambiati: aggiorna prima di salvare';
 end if;
 if exists(select 1 from jsonb_object_keys(p_values) k where k not in ('notes','importo','stato_pagamento'))
    or not p_values ?& array['notes','importo','stato_pagamento']
    or jsonb_typeof(p_values->'notes') is distinct from 'string'
    or jsonb_typeof(p_values->'importo') is distinct from 'number'
    or jsonb_typeof(p_values->'stato_pagamento') is distinct from 'string'
    or (p_values->>'importo')::numeric<0
    or p_values->>'stato_pagamento' not in ('Da pagare','Parziale','Pagato','Da riconciliare') then raise exception 'Dati economici non validi'; end if;
 result:=public.calendar_audit_write(p_actor_id,'owner','calendar',gen_random_uuid(),'client',
  jsonb_build_object('method','PATCH','rows',jsonb_build_array(p_values||jsonb_build_object('id',p_client_id,'updated_at',clock_timestamp()))));
 return result->0;
end $$;
revoke all on function public.calendar_save_client_finance(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_save_client_finance(text,text,jsonb,jsonb) to service_role;
