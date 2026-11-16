-- Restore an empty open successor, appending bookings without changing history.
create function public.calendar_restore_empty_renewal(p_actor_id text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.calendar_expected_renewals; a jsonb; old_state text; output jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select * into p from public.calendar_expected_renewals where id=(p_payload->>'id')::uuid for update;
 if not found or p.state not in ('pending','confirmed') then raise exception 'Rinnovo non aperto';end if;
 if exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then return to_jsonb(p);end if;
 if p.version is distinct from (p_payload->>'version')::int then raise exception 'Proposta cambiata: ricarica';end if;
 if coalesce(p.plan->>'issue','')<>'' then raise exception 'Completa giorni, orari e PT prima di generare le date';end if;
 if jsonb_typeof(p_payload->'appointments') is distinct from 'array' or jsonb_array_length(p_payload->'appointments') not between 1 and 100 then raise exception 'Lezioni non valide';end if;
 for a in select value from jsonb_array_elements(p_payload->'appointments') loop
  if exists(select 1 from public.appointments x where x.id=a->>'id') then raise exception 'Lo storico non può essere riutilizzato';end if;
  if a->'client_ids' is distinct from p.client_ids or a->>'service_id' is distinct from p.plan->>'serviceId' or
     not exists(select 1 from jsonb_array_elements(p.plan->'slots') s where (s->>'day')::int=extract(dow from (a->>'date')::date)::int and
       (s->>'time')::time=(a->>'start_time')::time and s->>'operatorId'=a->>'operator_id' and (s->>'duration')::int=(a->>'duration_min')::int) then raise exception 'Le date devono rispettare il piano del rinnovo';end if;
 end loop;
 old_state:=p.state;
 output:=public.calendar_expected_renewal(p_actor_id,'edit',jsonb_build_object('id',p.id,'version',p.version,'plan',p.plan,'appointments',p_payload->'appointments'));
 if old_state='confirmed' then output:=public.calendar_expected_renewal(p_actor_id,'confirm',jsonb_build_object('id',p.id,'version',(output->>'version')::int));end if;
 return output;
end $$;
revoke all on function public.calendar_restore_empty_renewal(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_restore_empty_renewal(text,jsonb) to service_role;
