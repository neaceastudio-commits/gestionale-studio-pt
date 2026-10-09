-- Extend the existing protected audit trigger; no new log write grants.
create or replace function public.calendar_audit_capture() returns trigger language plpgsql security definer set search_path='' as $$
declare ctx jsonb; b jsonb; a jsonb; actions text[]; item text; ids jsonb; eid text;
begin
 b:=case when TG_OP='INSERT' then null else public.calendar_audit_fields(TG_TABLE_NAME,to_jsonb(old)) end;
 a:=case when TG_OP='DELETE' then null else public.calendar_audit_fields(TG_TABLE_NAME,to_jsonb(new)) end;
 -- Client notes/clinical/economic fields are deliberately outside the audit.
 ctx:=nullif(current_setting('neacea.audit_context',true),'')::jsonb;
 if current_setting('role',true) is distinct from 'service_role' or ctx is null then
   raise exception using errcode='42501',message='Verified calendar audit context required';
 end if;
 if TG_TABLE_NAME='clients' and TG_OP='UPDATE' and (to_jsonb(new)-'updated_at')=(to_jsonb(old)-'updated_at') then return new; end if;
 if TG_TABLE_NAME='operator_availability' then
  eid:=coalesce(a,b)->>'operator_id'||':'||(coalesce(a,b)->>'day_key');ids:='[]';
  actions:=array[case when a=b then 'availability_noop' else 'availability_changed' end];
 elsif TG_TABLE_NAME='trainer_client_assignments' then
  eid:=coalesce(a,b)->>'id';ids:=jsonb_build_array(coalesce(a,b)->>'client_id');actions:=array['trainer_assignment_changed'];
 elsif TG_TABLE_NAME='operators' then
  eid:=coalesce(a,b)->>'id';ids:='[]';actions:=array['operator_profile_changed'];
 elsif TG_TABLE_NAME='clients' then
  eid:=coalesce(a,b)->>'id';ids:=jsonb_build_array(eid);actions:=array[case when a=b then 'client_details_changed' else 'client_package_changed' end];
 else
  eid:=coalesce(a,b)->>'id';select coalesce(jsonb_agg(distinct value),'[]') into ids from jsonb_array_elements(coalesce(a->'client_ids','[]')||coalesce(b->'client_ids','[]'));
  if TG_OP='INSERT' then actions:=array[case when ctx->>'operation'='package' then 'package_appointment_created' else 'appointment_created' end];
  elsif TG_OP='DELETE' then actions:=array['appointment_deleted'];
  else
   actions:=array[]::text[];
   if (a->'date',a->'start_time') is distinct from (b->'date',b->'start_time') then actions:=array_append(actions,'appointment_moved'); end if;
   if a->'operator_id' is distinct from b->'operator_id' then actions:=array_append(actions,'operator_changed'); end if;
   if a->'service_id' is distinct from b->'service_id' then actions:=array_append(actions,'service_changed'); end if;
   if a->'status' is distinct from b->'status' then
    if b->>'status'='fatto' then actions:=array_append(actions,'done_reverted'); end if;
    actions:=array_append(actions,case a->>'status' when 'fatto' then 'marked_done' when 'annullato' then 'appointment_cancelled' when 'noshow' then 'marked_noshow' else 'status_changed' end);
   end if;
   if ctx->>'operation'='pt_correction' then actions:=array_append(actions,'pt_sessions_corrected'); end if;
   if cardinality(actions)=0 then actions:=array[case when a=b then 'appointment_noop' else 'appointment_updated' end];end if;
  end if;
 end if;
 foreach item in array actions loop
  insert into public.calendar_audit_log(actor_operator_id,actor_name,actor_email,actor_role,action,entity_type,entity_id,client_ids,before_data,after_data,source,request_id,metadata)
  values(ctx->>'id',ctx->>'name',ctx->>'email',ctx->>'role',item,TG_TABLE_NAME,eid,ids,b,a,ctx->>'source',(ctx->>'request_id')::uuid,jsonb_build_object('mergedAppointmentId',ctx->>'mergedAppointmentId','automatic',ctx->>'source'='system','noop',a=b and TG_TABLE_NAME<>'clients'));
 end loop;
 if TG_OP='DELETE' then return old; else return new; end if;
end; $$;

-- Owner-only correction of existing PT sessions. One transaction, no balance reconstruction.
create function public.calendar_correct_pt_sessions(p_actor_id text, p_request_id uuid, p_changes jsonb)
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
   if a.service_id is null or a.service_id not in ('pt11','pt12') or a.status is null or a.status not in ('prenotato','fatto','noshow') or a.operator_id is null or coalesce(cardinality(a.client_ids),0) not between 1 and 2 or a.date is null or a.start_time is null or coalesce(a.duration_min,0)<=0 then raise exception 'Seduta PT non correggibile'; end if;
   if cardinality(a.client_ids) <> (select count(distinct v) from unnest(a.client_ids) v) then raise exception 'Partecipanti duplicati'; end if;
   if exists(select 1 from unnest(a.client_ids) cid where not exists(select 1 from public.clients cl where cl.id=cid)) then raise exception 'Cliente mancante'; end if;
   ids:=array_append(ids,a.id); touched:=touched||a.client_ids;
  end loop;
 end loop;
 -- Snapshot consumption, including old cycles. Never reset counters from history.
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_before from public.appointments x where c.id=any(x.client_ids) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  snapshots:=snapshots||jsonb_build_object(c.id,usage_before);
 end loop;
 for item in select value from jsonb_array_elements(p_changes) loop
  select * into a from public.appointments where id=item->'before'->>'id';
  perform set_config('neacea.audit_context',(ctx||jsonb_build_object('mergedAppointmentId',item->'partner'->>'id'))::text,true);
  if item ? 'partner' then
   select * into b from public.appointments where id=item->'partner'->>'id';
   if item->>'serviceId'<>'pt12' or cardinality(a.client_ids)<>1 or cardinality(b.client_ids)<>1 or a.client_ids && b.client_ids
    or (a.date,a.start_time,a.duration_min,a.operator_id,a.status) is distinct from (b.date,b.start_time,b.duration_min,b.operator_id,b.status) then
    raise exception 'Per unire due sedute servono clienti distinti, stesso PT, data, orario, durata e stato';
   end if;
   -- Keep compiled training records attached to their original appointment.
   if to_regclass('public.pt_session_records') is not null then
    execute 'select exists(select 1 from public.pt_session_records where appointment_id=$1)' into has_records using b.id;
    if has_records then raise exception 'La seconda seduta contiene una scheda allenamento compilata: non può essere unita automaticamente'; end if;
   end if;
   update public.appointments set status='annullato',updated_at=clock_timestamp() where id=b.id;
   update public.appointments set service_id='pt12',client_ids=a.client_ids||b.client_ids,updated_at=clock_timestamp() where id=a.id;
  else
   if item->>'serviceId'='pt11' and cardinality(a.client_ids)<>1 then raise exception 'Una seduta in coppia non può diventare individuale senza separare i partecipanti'; end if;
   if item->>'serviceId'='pt12' and cardinality(a.client_ids)<>2 then raise exception 'Seleziona il secondo cliente per unire le sedute'; end if;
   if a.service_id=item->>'serviceId' then raise exception 'Il tipo della seduta è già corretto'; end if;
   update public.appointments set service_id=item->>'serviceId',updated_at=clock_timestamp() where id=a.id;
  end if;

 end loop;
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_after from public.appointments x where c.id=any(x.client_ids) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  if usage_after is distinct from (snapshots->>c.id)::int then raise exception 'Cicli pacchetto diversi: la correzione altererebbe le sessioni residue. Nessuna modifica salvata'; end if;
 end loop;
 select jsonb_build_object('appointments',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) into result from public.appointments x where x.id=any(ids);
 return result;
end;
$$;
revoke all on function public.calendar_correct_pt_sessions(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_correct_pt_sessions(text,uuid,jsonb) to service_role;
