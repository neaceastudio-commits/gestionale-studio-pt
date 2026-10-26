-- Proposal only: apply after explicit authorization, then release the Calendar.
-- Additive, existing clients remain unclassified. No change to active/history.
alter table public.clients add column client_group text
  check (client_group in ('regular','occasional'));

create function public.calendar_set_client_group(
  p_actor_id text, p_client_id text, p_group text, p_expected_group text, p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor jsonb; roles text[]; previous public.clients; result jsonb;
begin
  if current_setting('role',true)<>'service_role' then raise exception 'Service gateway required'; end if;
  if p_group is not null and p_group not in ('regular','occasional') then raise exception 'Gruppo cliente non valido'; end if;
  select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
  select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
  if actor is null or not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then
    raise exception 'Gruppi riservati alla Direzione';
  end if;
  lock table public.appointments in share row exclusive mode;
  select * into previous from public.clients where id=p_client_id for update;
  if not found or previous.active is false then raise exception 'Cliente attivo non trovato'; end if;
  -- An identical retry is a no-op; a different concurrent choice is preserved.
  if previous.client_group is not distinct from p_group then return to_jsonb(previous); end if;
  if previous.client_group is distinct from p_expected_group then raise exception 'Gruppo modificato da un altro dispositivo: ricarica e riprova'; end if;
  result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',
    jsonb_build_object('method','PATCH','rows',jsonb_build_array(jsonb_build_object('id',p_client_id,'client_group',p_group,'updated_at',clock_timestamp()))));
  return result->0;
end $$;
revoke all on function public.calendar_set_client_group(text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.calendar_set_client_group(text,text,text,text,uuid) to service_role;
