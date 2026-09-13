-- One authoritative runtime flag for browser and every audited save, including CalDAV.
-- Default remains strict until the explicitly authorized production activation.
create table public.calendar_runtime_flags (
  key text primary key check (key = 'CALENDAR_FLEX_MODE'),
  enabled boolean not null default false
);
alter table public.calendar_runtime_flags enable row level security;
revoke all on public.calendar_runtime_flags from public,anon,authenticated,service_role;
grant select on public.calendar_runtime_flags to service_role;
insert into public.calendar_runtime_flags(key,enabled) values ('CALENDAR_FLEX_MODE',false);
create function public.calendar_flex_mode() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select enabled from public.calendar_runtime_flags where key='CALENDAR_FLEX_MODE'),false);
$$;
revoke all on function public.calendar_flex_mode() from public,anon,authenticated;
grant execute on function public.calendar_flex_mode() to service_role;

-- CREATE OR REPLACE preserves the service-role-only ACL and existing audit transaction.
CREATE OR REPLACE FUNCTION public.calendar_save_appointment(p_appointment jsonb, p_expected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare old_row public.appointments; new_row public.appointments; expected_row public.appointments;
  c public.clients; touched jsonb := '[]'::jsonb; old_json jsonb; new_json jsonb;
  delta integer; affected integer; existed boolean; conflicts record; flex boolean; planning_warnings jsonb := '[]'::jsonb;
begin
  perform set_config('lock_timeout', '5s', true);
  lock table public.appointments, public.clients in share row exclusive mode;
  flex := public.calendar_flex_mode();
  new_row := jsonb_populate_record(null::public.appointments, p_appointment);
  if new_row.id is null or new_row.status not in ('prenotato','fatto','noshow','annullato') then raise exception 'Invalid appointment'; end if;
  select * into old_row from public.appointments where id = new_row.id;
  existed := found;
  old_json := case when existed then to_jsonb(old_row) else null end;
  new_json := to_jsonb(new_row);
  expected_row := jsonb_populate_record(null::public.appointments, p_expected);
  -- Uncertain response retry: identical intended fields are already saved.
  if existed and public.calendar_appointment_fields(to_jsonb(old_row)) = public.calendar_appointment_fields(new_json) then
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into touched from public.clients x
      where to_jsonb(new_row.client_ids) @> jsonb_build_array(x.id);
    return jsonb_build_object('appointment', to_jsonb(old_row), 'clients', touched);
  end if;
  if (existed and (p_expected is null or public.calendar_appointment_fields(old_json) is distinct from public.calendar_appointment_fields(to_jsonb(expected_row))))
     or (not existed and p_expected is not null) then
    raise exception using errcode='40001', message='Appointment changed: reload before retrying';
  end if;
  if exists(select 1 from jsonb_array_elements_text(coalesce(old_json->'client_ids','[]'::jsonb) || coalesce(new_json->'client_ids','[]'::jsonb)) cid
    where not exists(select 1 from public.clients x where x.id::text=cid)) then
    raise exception 'Client missing or inaccessible';
  end if;
  -- READ COMMITTED is required: after waiting for the lock, each VOLATILE
  -- statement must see the preceding writer's commit, not a transaction snapshot.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Calendar save requires READ COMMITTED';
  end if;
  if new_row.status <> 'annullato' then
    if flex and (not existed or old_row.duration_min is distinct from new_row.duration_min) and (coalesce(new_row.duration_min,0) < 15 or new_row.duration_min > 240 or new_row.duration_min % 15 <> 0) then
      raise exception 'Duration must be a multiple of 15 minutes between 15 and 240';
    end if;
    if new_row.date is null or new_row.start_time is null or coalesce(new_row.duration_min,0) <= 0
       or new_row.service_id is null or new_row.service_id not in
         ('pt11','pt12','circuit','nutrizione','check','visbody','baiobit','blocco') then
      raise exception 'Invalid appointment slot/service';
    end if;
    -- Fail closed if RLS could hide another booking or active participant.
    -- This does not bypass RLS or grant any additional privilege.
    if exists (
      select 1 from (values ('public.appointments'::regclass),('public.clients'::regclass)) t(rel)
      where row_security_active(t.rel) and (
        not exists (select 1 from pg_catalog.pg_policy p where p.polrelid=t.rel
          and p.polcmd in ('r','*') and p.polpermissive
          and pg_get_expr(p.polqual,p.polrelid) = 'true'
          and exists(select 1 from unnest(p.polroles) role_id
            where case when role_id=0 then true else pg_has_role(current_user,role_id,'USAGE') end))
        or exists (select 1 from pg_catalog.pg_policy p where p.polrelid=t.rel
          and p.polcmd in ('r','*') and not p.polpermissive
          and exists(select 1 from unnest(p.polroles) role_id
            where case when role_id=0 then true else pg_has_role(current_user,role_id,'USAGE') end))
      )
    ) then
      raise exception 'Calendar conflict validation requires complete calendar visibility';
    end if;
    with services(id,room,max_load) as (values
      ('pt11','pt',1),('pt12','pt',2),('circuit','pt',6),
      ('nutrizione','nutri',1),('check','nutri',1),('visbody','valut',1),
      ('baiobit',null,0),('blocco',null,0)
    ), slots as (
      select a.* from public.appointments a
        where a.id <> new_row.id and a.date = new_row.date and a.status <> 'annullato'
      union all select new_row.*
    ), visible as (
      select a.id, a.operator_id, a.client_ids, s.room,
        extract(epoch from a.start_time::time)/60 as lo,
        extract(epoch from a.start_time::time)/60 + a.duration_min as hi,
        least(s.max_load, participants.n) as room_load
      from slots a join services s on s.id = a.service_id
      cross join lateral (select count(*)::int n from public.clients participant
        where participant.active is distinct from false and to_jsonb(a.client_ids) @> jsonb_build_array(participant.id)) participants
      where a.service_id = 'blocco' or participants.n > 0
    ), candidate as (select * from visible where id = new_row.id),
    overlapping as (
      select v.* from visible v, candidate n
      where v.id <> n.id and v.lo < n.hi and n.lo < v.hi
    ), boundaries as (
      select lo as t from candidate
      union select o.lo from overlapping o, candidate n where o.lo > n.lo and o.lo < n.hi
    )
    select
      exists(select 1 from overlapping o, candidate n
        where nullif(n.operator_id::text,'') is not null and o.operator_id = n.operator_id) as operator_conflict,
      exists(select 1 from overlapping o, candidate n,
        lateral jsonb_array_elements_text(to_jsonb(n.client_ids)) cid
        where to_jsonb(o.client_ids) @> jsonb_build_array(cid)) as client_conflict,
      exists(select 1 from boundaries b, candidate n where n.room is not null and
        n.room_load + (select coalesce(sum(o.room_load),0) from overlapping o
          where o.room = n.room and o.lo <= b.t and b.t < o.hi)
        > case n.room when 'pt' then 6 else 1 end) as room_conflict
    into conflicts;
    if flex then
      if conflicts.operator_conflict then planning_warnings := planning_warnings || '["operator_overlap"]'::jsonb; end if;
      if conflicts.client_conflict then planning_warnings := planning_warnings || '["client_overlap"]'::jsonb; end if;
      if conflicts.room_conflict then planning_warnings := planning_warnings || '["room_capacity"]'::jsonb; end if;
    else
    if conflicts.operator_conflict then
      raise exception using errcode='23P01', message='Calendar conflict: operator occupied';
    elsif conflicts.client_conflict then
      raise exception using errcode='23P01', message='Calendar conflict: client occupied';
    elsif conflicts.room_conflict then
      raise exception using errcode='23P01', message='Calendar conflict: room capacity exceeded';
    end if;
    end if;
  end if;
  -- Compute counter deltas before changing cycle inference or the appointment.
  for c in select * from public.clients x where
    coalesce(old_json->'client_ids','[]'::jsonb) @> jsonb_build_array(x.id)
    or coalesce(new_json->'client_ids','[]'::jsonb) @> jsonb_build_array(x.id)
  loop
    delta := public.calendar_uses_current_session(old_json,to_jsonb(c))::integer - public.calendar_uses_current_session(new_json,to_jsonb(c))::integer;
    if delta <> 0 and coalesce(c.sessions_total,0) > 0 then
      update public.clients set sessions_remaining = greatest(0, least(sessions_total, coalesce(sessions_remaining,0) + delta)), updated_at = clock_timestamp() where id = c.id;
      get diagnostics affected = row_count;
      if affected <> 1 then raise exception 'Client balance not saved'; end if;
    end if;
  end loop;
  if existed then
    update public.appointments set service_id=new_row.service_id, client_ids=new_row.client_ids, operator_id=new_row.operator_id,
      date=new_row.date, start_time=new_row.start_time, duration_min=new_row.duration_min, buffer_min=new_row.buffer_min,
      status=new_row.status, notes=new_row.notes, updated_at=clock_timestamp() where id=new_row.id returning * into new_row;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'Appointment not saved'; end if;
  else
    insert into public.appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,buffer_min,status,notes,created_at,updated_at)
      values(new_row.id,new_row.service_id,new_row.client_ids,new_row.operator_id,new_row.date,new_row.start_time,new_row.duration_min,new_row.buffer_min,new_row.status,new_row.notes,now(),clock_timestamp()) returning * into new_row;
  end if;
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into touched from public.clients x where
    coalesce(old_json->'client_ids','[]'::jsonb) @> jsonb_build_array(x.id) or to_jsonb(new_row.client_ids) @> jsonb_build_array(x.id);
  return jsonb_build_object('appointment', to_jsonb(new_row), 'clients', touched, 'warnings', planning_warnings);
end;
$function$;
