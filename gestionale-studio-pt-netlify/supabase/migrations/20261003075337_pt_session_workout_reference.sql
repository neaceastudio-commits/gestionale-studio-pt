CREATE OR REPLACE FUNCTION public.pt_save_session_record(p_appointment_id text, p_cliente_id text, p_program_id text, p_actor_id text, p_data jsonb, p_expected_version integer, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 appt public.appointments; actor public.operators; oldrow public.pt_session_records; saved public.pt_session_records;
 rowdata jsonb; stamp timestamptz := clock_timestamp();
begin
 -- service_role is granted EXECUTE exclusively; actor identity comes from the signed server session.
 select * into actor from public.operators where id=p_actor_id and active;
 if actor.id is null or coalesce((to_jsonb(actor)->>'portal_access_enabled')::boolean,true)=false then raise exception 'PT_SESSION_FORBIDDEN';end if;
 select * into appt from public.appointments where id=p_appointment_id for update;
 if appt.id is null or appt.operator_id is distinct from p_actor_id or not coalesce(appt.client_ids @> jsonb_build_array(p_cliente_id),false)
    or not coalesce(appt.service_id in ('pt11','pt12'),false) or not coalesce(appt.status in ('prenotato','fatto'),false) or appt.date is null then raise exception 'PT_SESSION_FORBIDDEN';end if;
 if appt.date > (now() at time zone 'Europe/Rome')::date then raise exception 'PT_SESSION_FUTURE';end if;
 -- Check before idempotent retries as well as mutations.
 perform 1 from public.clients where id=p_cliente_id for update;
 -- The locked appointment above is the explicit assignment; no second client grant is required.
 if not exists(select 1 from public.schede_allenamento where id=p_program_id and cliente_id=p_cliente_id) then raise exception 'PT_SESSION_PROGRAM_MISMATCH';end if;
 if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' or jsonb_typeof(p_data->'rows') is distinct from 'array'
    or jsonb_typeof(p_data->'notes') is distinct from 'string' or length(p_data->>'notes')>4000 then raise exception 'PT_SESSION_INVALID';end if;
 if jsonb_array_length(p_data->'rows')>200 or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('rows','notes','workout')) then raise exception 'PT_SESSION_INVALID';end if;
 if p_data ? 'workout' then
   if jsonb_typeof(p_data->'workout') is distinct from 'object'
      or jsonb_typeof(p_data->'workout'->'sheet') is distinct from 'string'
      or (p_data->'workout'->>'sheet') !~ '^[A-Z][A-Z0-9_-]{0,15}$'
      or jsonb_typeof(p_data->'workout'->'week') is distinct from 'number'
      or (p_data->'workout'->>'week') !~ '^[0-9]+$'
      or (p_data->'workout'->>'week')::numeric not between 0 and 103
      or exists(select 1 from jsonb_object_keys(p_data->'workout') k where k not in ('sheet','week')) then raise exception 'PT_SESSION_INVALID';end if;
 end if;
 for rowdata in select value from jsonb_array_elements(p_data->'rows') loop
   if jsonb_typeof(rowdata)<>'object' then raise exception 'PT_SESSION_INVALID';end if;
   if exists(select 1 from jsonb_object_keys(rowdata) k where k not in ('exercise','load','reps','rir','notes'))
      or exists(select 1 from unnest(array['exercise','load','reps','rir','notes']) k where jsonb_typeof(rowdata->k) is distinct from 'string')
      or length(btrim(rowdata->>'exercise')) not between 1 and 160 or length(rowdata->>'load')>40
      or length(rowdata->>'reps')>40 or length(rowdata->>'rir')>20 or length(rowdata->>'notes')>1000 then raise exception 'PT_SESSION_INVALID';end if;
 end loop;
 select * into oldrow from public.pt_session_records where appointment_id=p_appointment_id and cliente_id=p_cliente_id and operator_id=p_actor_id for update;
 if oldrow.id is not null and oldrow.request_id=p_request_id then
   if oldrow.data is distinct from p_data or oldrow.program_id is distinct from p_program_id then raise exception 'PT_SESSION_REQUEST_REUSED';end if;
   return jsonb_build_object('record',to_jsonb(oldrow));
 end if;
 if coalesce(oldrow.version,0) is distinct from p_expected_version then return jsonb_build_object('conflict',true,'current',to_jsonb(oldrow));end if;
 insert into public.pt_session_records(appointment_id,cliente_id,operator_id,program_id,appointment_date,appointment_time,operator_name,data,version,request_id,updated_at)
 values(p_appointment_id,p_cliente_id,p_actor_id,p_program_id,appt.date,appt.start_time,concat_ws(' ',actor.nome,actor.cognome),p_data,coalesce(oldrow.version,0)+1,p_request_id,stamp)
 on conflict(appointment_id,cliente_id,operator_id) do update set program_id=excluded.program_id,appointment_date=excluded.appointment_date,appointment_time=excluded.appointment_time,operator_name=excluded.operator_name,data=excluded.data,version=excluded.version,request_id=excluded.request_id,updated_at=excluded.updated_at
 returning * into saved;
 insert into public.calendar_audit_log(actor_operator_id,actor_name,actor_email,actor_role,action,entity_type,entity_id,client_ids,before_data,after_data,source,request_id,metadata)
 values(actor.id,concat_ws(' ',actor.nome,actor.cognome),actor.email,'pt','training_session_saved','pt_session_records',saved.id::text,jsonb_build_array(p_cliente_id),
 to_jsonb(oldrow),to_jsonb(saved),'calendar',p_request_id,jsonb_build_object('origin','pt_portal','appointment_id',appt.id,'date',appt.date,'start_time',appt.start_time));
 return jsonb_build_object('record',to_jsonb(saved));
end $function$
