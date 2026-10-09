-- Sharing is explicit. No grants are inferred or imported from appointments.
create table public.pt_client_shares (
 cliente_id text not null references public.clients(id),
 operator_id text not null references public.operators(id),
 active boolean not null default false,
 updated_by text not null references public.operators(id),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(cliente_id,operator_id)
);
alter table public.pt_client_shares enable row level security;
revoke all on public.pt_client_shares from public,anon,authenticated,service_role;
grant select on public.pt_client_shares to service_role;
create index pt_client_shares_operator_idx on public.pt_client_shares(operator_id) where active;

create function public.pt_set_client_share(p_actor_id text,p_cliente_id text,p_operator_id text,p_active boolean,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.operators; oldrow public.pt_client_shares; saved public.pt_client_shares;
begin
 select * into actor from public.operators where id=p_actor_id and active;
 if actor.id is null or lower(actor.email) is distinct from 'nutrizione.gianlucapirisi@gmail.com'
 or not exists(select 1 from public.operator_effective_roles o,
 lateral jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r
 where o.operator_id=p_actor_id and o.active and lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione'))
 then raise exception 'PT_SHARE_FORBIDDEN';end if;
 if p_active is null or p_request_id is null then raise exception 'PT_SHARE_INVALID';end if;
 perform 1 from public.clients where id=p_cliente_id for update;
 if not found then raise exception 'PT_SHARE_CLIENT_MISSING';end if;
 if not exists(select 1 from public.operator_effective_roles o,
 lateral jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r
 where o.operator_id=p_operator_id and o.active and lower(r.value) in ('pt','personal_trainer','personal trainer'))
 then raise exception 'PT_SHARE_TRAINER_MISSING';end if;
 select * into oldrow from public.pt_client_shares where cliente_id=p_cliente_id and operator_id=p_operator_id;
 if oldrow.active is not distinct from p_active then return jsonb_build_object('success',true,'share',to_jsonb(oldrow));end if;
 insert into public.pt_client_shares(cliente_id,operator_id,active,updated_by)
 values(p_cliente_id,p_operator_id,p_active,p_actor_id)
 on conflict(cliente_id,operator_id) do update set active=excluded.active,updated_by=excluded.updated_by,updated_at=clock_timestamp()
 returning * into saved;
 insert into public.calendar_audit_log(actor_operator_id,actor_name,actor_email,actor_role,action,entity_type,entity_id,client_ids,before_data,after_data,source,request_id,metadata)
 values(actor.id,concat_ws(' ',actor.nome,actor.cognome),actor.email,'owner','client_sharing_changed','pt_client_shares',p_cliente_id||':'||p_operator_id,jsonb_build_array(p_cliente_id),to_jsonb(oldrow),to_jsonb(saved),'calendar',p_request_id,jsonb_build_object('operator_id',p_operator_id,'active',p_active));
 return jsonb_build_object('success',true,'share',to_jsonb(saved));
end $$;
revoke all on function public.pt_set_client_share(text,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.pt_set_client_share(text,text,text,boolean,uuid) to service_role;

-- Serialize revocations with session writes; the existing RPC still verifies the
-- appointment author, participant, date, version and immutable activity record.
create function public.pt_require_client_share() returns trigger language plpgsql security definer set search_path='' as $$
declare referent text;
begin
 select pt_assegnato into referent from public.clients where id=new.cliente_id for update;
 if referent is distinct from new.operator_id and not exists(select 1 from public.pt_client_shares where cliente_id=new.cliente_id and operator_id=new.operator_id and active)
 then raise exception 'PT_SESSION_FORBIDDEN';end if;
 return new;
end $$;
revoke all on function public.pt_require_client_share() from public,anon,authenticated;
create trigger pt_session_requires_sharing before insert or update on public.pt_session_records for each row execute function public.pt_require_client_share();

create or replace function public.pt_save_session_record(p_appointment_id text,p_cliente_id text,p_program_id text,p_actor_id text,p_data jsonb,p_expected_version integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
 if not exists(select 1 from public.clients where id=p_cliente_id and pt_assegnato=p_actor_id)
 and not exists(select 1 from public.pt_client_shares where cliente_id=p_cliente_id and operator_id=p_actor_id and active)
 then raise exception 'PT_SESSION_FORBIDDEN';end if;
 if not exists(select 1 from public.schede_allenamento where id=p_program_id and cliente_id=p_cliente_id) then raise exception 'PT_SESSION_PROGRAM_MISMATCH';end if;
 if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' or jsonb_typeof(p_data->'rows') is distinct from 'array'
    or jsonb_typeof(p_data->'notes') is distinct from 'string' or length(p_data->>'notes')>4000 then raise exception 'PT_SESSION_INVALID';end if;
 if jsonb_array_length(p_data->'rows')>200 or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('rows','notes')) then raise exception 'PT_SESSION_INVALID';end if;
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
end $$;
revoke all on function public.pt_save_session_record(text,text,text,text,jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.pt_save_session_record(text,text,text,text,jsonb,integer,uuid) to service_role;
