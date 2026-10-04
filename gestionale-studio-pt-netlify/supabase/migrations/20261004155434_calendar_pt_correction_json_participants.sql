-- Supports JSONB participants in production and legacy SQL arrays without changing table types.
-- Owner-only correction of existing PT sessions. One transaction, no balance reconstruction.
create or replace function public.calendar_correct_pt_sessions(p_actor_id text, p_request_id uuid, p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare actor jsonb; roles text[]; item jsonb; a public.appointments; b public.appointments;
 expected public.appointments; proposed jsonb; ids text[] := '{}'; touched text[] := '{}';
 snapshots jsonb := '{}'; c public.clients; usage_before int; usage_after int; has_records boolean;
 result jsonb; ctx jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
 if actor is null or not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then raise exception 'Operazione riservata alla Direzione'; end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 100 then raise exception 'Seleziona da 1 a 100 sedute'; end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments, public.clients in share row exclusive mode;
 ctx:=jsonb_build_object('id',p_actor_id,'name',trim(concat(actor->>'nome',' ',actor->>'cognome')),'email',actor->>'email','role','owner','source','calendar','request_id',p_request_id,'operation','pt_correction');
 perform set_config('neacea.audit_context',ctx::text,true);
 -- Validate every original snapshot before touching any row.
 for item in select value from jsonb_array_elements(p_changes) loop
  if item->>'serviceId' is null or item->>'serviceId' not in ('pt11','pt12') then raise exception 'Tipo PT non valido'; end if;
  for proposed in select value from jsonb_array_elements(jsonb_build_array(item->'before') || case when item ? 'partner' then jsonb_build_array(item->'partner') else '[]'::jsonb end) loop
   expected:=jsonb_populate_record(null::public.appointments,proposed);
   if expected.id is null or expected.id=any(ids) then raise exception 'Seduta duplicata o mancante'; end if;
   select * into a from public.appointments where id=expected.id;
   if not found or public.calendar_appointment_fields(to_jsonb(a)) is distinct from public.calendar_appointment_fields(to_jsonb(expected)) then raise exception 'Una seduta è cambiata: aggiorna l’anteprima'; end if;
   if a.service_id is null or a.service_id not in ('pt11','pt12') or a.status is null or a.status not in ('prenotato','fatto','noshow') or a.operator_id is null or coalesce(jsonb_array_length(to_jsonb(a.client_ids)),0) not between 1 and 2 or a.date is null or a.start_time is null or coalesce(a.duration_min,0)<=0 then raise exception 'Seduta PT non correggibile'; end if;
   if jsonb_array_length(to_jsonb(a.client_ids)) <> (select count(distinct v.value) from jsonb_array_elements_text(to_jsonb(a.client_ids)) v) then raise exception 'Partecipanti duplicati'; end if;
   if exists(select 1 from jsonb_array_elements_text(to_jsonb(a.client_ids)) cid where not exists(select 1 from public.clients cl where cl.id=cid.value)) then raise exception 'Cliente mancante'; end if;
   ids:=array_append(ids,a.id); touched:=touched||array(select jsonb_array_elements_text(to_jsonb(a.client_ids)));
  end loop;
 end loop;
 -- Snapshot consumption, including old cycles. Never reset counters from history.
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_before from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c.id) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  snapshots:=snapshots||jsonb_build_object(c.id,usage_before);
 end loop;
 for item in select value from jsonb_array_elements(p_changes) loop
  select * into a from public.appointments where id=item->'before'->>'id';
  perform set_config('neacea.audit_context',(ctx||jsonb_build_object('mergedAppointmentId',item->'partner'->>'id'))::text,true);
  if item ? 'partner' then
   select * into b from public.appointments where id=item->'partner'->>'id';
   if item->>'serviceId'<>'pt12' or jsonb_array_length(to_jsonb(a.client_ids))<>1 or jsonb_array_length(to_jsonb(b.client_ids))<>1 or exists(select 1 from jsonb_array_elements_text(to_jsonb(a.client_ids)) cid where to_jsonb(b.client_ids) @> jsonb_build_array(cid.value))
    or (a.date,a.start_time,a.duration_min,a.operator_id,a.status) is distinct from (b.date,b.start_time,b.duration_min,b.operator_id,b.status) then
    raise exception 'Per unire due sedute servono clienti distinti, stesso PT, data, orario, durata e stato';
   end if;
   -- Keep compiled training records attached to their original appointment.
   if to_regclass('public.pt_session_records') is not null then
    execute 'select exists(select 1 from public.pt_session_records where appointment_id=$1)' into has_records using b.id;
    if has_records then raise exception 'La seconda seduta contiene una scheda allenamento compilata: non può essere unita automaticamente'; end if;
   end if;
   update public.appointments set status='annullato',updated_at=clock_timestamp() where id=b.id;
   update public.appointments set service_id='pt12',client_ids=(jsonb_populate_record(null::public.appointments,jsonb_build_object('client_ids',to_jsonb(a.client_ids)||to_jsonb(b.client_ids)))).client_ids,updated_at=clock_timestamp() where id=a.id;
  else
   if item->>'serviceId'='pt11' and jsonb_array_length(to_jsonb(a.client_ids))<>1 then raise exception 'Una seduta in coppia non può diventare individuale senza separare i partecipanti'; end if;
   if item->>'serviceId'='pt12' and jsonb_array_length(to_jsonb(a.client_ids))<>2 then raise exception 'Seleziona il secondo cliente per unire le sedute'; end if;
   if a.service_id=item->>'serviceId' then raise exception 'Il tipo della seduta è già corretto'; end if;
   update public.appointments set service_id=item->>'serviceId',updated_at=clock_timestamp() where id=a.id;
  end if;

 end loop;
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_after from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c.id) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  if usage_after is distinct from (snapshots->>c.id)::int then raise exception 'Cicli pacchetto diversi: la correzione altererebbe le sessioni residue. Nessuna modifica salvata'; end if;
 end loop;
 select jsonb_build_object('appointments',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) into result from public.appointments x where x.id=any(ids);
 return result;
end;
$$;
revoke all on function public.calendar_correct_pt_sessions(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_correct_pt_sessions(text,uuid,jsonb) to service_role;
