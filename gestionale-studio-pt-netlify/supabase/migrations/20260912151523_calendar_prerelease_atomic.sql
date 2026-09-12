-- LOCAL PRE-RELEASE MIGRATION. Do not apply remotely without release approval.
-- Invoker functions preserve the table privileges and RLS of their callers.
begin;

create or replace function public.calendar_planning_snapshot()
returns jsonb language sql volatile security invoker set search_path = '' as $$
  with data as (select jsonb_build_object(
    'clients', coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.clients c), '[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.appointments a), '[]'::jsonb),
    'operators', coalesce((select jsonb_agg(to_jsonb(o) order by o.id) from public.operators o), '[]'::jsonb),
    'availability', coalesce((select jsonb_agg(to_jsonb(v) order by v.operator_id, v.day_key) from public.operator_availability v), '[]'::jsonb)
  ) as value)
  select value || jsonb_build_object('revision', md5(value::text)) from data;
$$;
revoke all on function public.calendar_planning_snapshot() from public, anon, authenticated;
grant execute on function public.calendar_planning_snapshot() to service_role;

create or replace function public.calendar_commit_package(p_revision text, p_client_id text, p_rows jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare current_snapshot jsonb; row_data jsonb; stored public.appointments; ids jsonb := '[]'::jsonb;
begin
  perform set_config('lock_timeout', '5s', true);
  -- Shared lock order with calendar_save_appointment. Also excludes legacy REST
  -- writes while checking the snapshot and inserting the whole package.
  lock table public.appointments, public.clients, public.operators, public.operator_availability in share row exclusive mode;
  current_snapshot := public.calendar_planning_snapshot();
  if p_revision is distinct from current_snapshot->>'revision' then
    return jsonb_build_object('success', false, 'code', 'calendar_changed');
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Invalid package rows';
  end if;
  for row_data in select value from jsonb_array_elements(p_rows) loop
    if row_data->>'status' is distinct from 'prenotato' or row_data->'client_ids' is distinct from jsonb_build_array(p_client_id) then
      raise exception 'Invalid package client/status';
    end if;
    stored := jsonb_populate_record(null::public.appointments, row_data);
    insert into public.appointments(id, service_id, client_ids, operator_id, date, start_time, duration_min, buffer_min, status, notes, created_at, updated_at)
      values(stored.id, stored.service_id, stored.client_ids, stored.operator_id, stored.date, stored.start_time, stored.duration_min, stored.buffer_min, stored.status, stored.notes, now(), now());
    ids := ids || jsonb_build_array(stored.id);
  end loop;
  return jsonb_build_object('success', true, 'appointmentIds', ids);
end;
$$;
revoke all on function public.calendar_commit_package(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.calendar_commit_package(text,text,jsonb) to service_role;

-- Same cycle priority as the calendar: current ledger, explicit start,
-- appointment marker, acquisition start. No totals or personal details returned.
create or replace function public.calendar_uses_current_session(a jsonb, c jsonb)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
declare ledger_text text; ledger jsonb; cycle jsonb; start_date text; marker text; cycle_id text; persisted text; inferred text;
begin
  if a is null or a->>'status' is distinct from 'fatto' or a->>'service_id' not in ('pt11','pt12','circuit')
     or not coalesce(a->'client_ids' @> jsonb_build_array(c->>'id'), false) then return false; end if;
  ledger_text := substring(coalesce(c->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]');
  if ledger_text is not null then
    ledger := ledger_text::jsonb;
    select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value, n)
      order by case when coalesce(value->>'closedAt','') = '' then 0 else 1 end, n desc limit 1;
  end if;
  persisted := coalesce(substring(coalesce(c->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'), nullif(c->>'data_conferma',''));
  select max(coalesce(substring(coalesce(x.notes,'') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
    substring(coalesce(x.notes,'') from 'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})'))) into inferred
    from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c->>'id') and x.service_id in ('pt11','pt12','circuit');
  start_date := coalesce(nullif(cycle->>'startDate',''), persisted, inferred, nullif(c->>'data_inizio',''), nullif(c->>'package_start',''));
  marker := coalesce(substring(coalesce(a->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),
    substring(coalesce(a->>'notes','') from 'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})'));
  cycle_id := substring(coalesce(a->>'notes','') from '\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]');
  if nullif(cycle->>'id','') is not null then
    if cycle_id is not null then return cycle_id = cycle->>'id'; end if;
    if coalesce((cycle->>'legacy')::boolean,false) = false then return false; end if;
  end if;
  if persisted is not null then return start_date is null or a->>'date' >= start_date; end if;
  if marker is not null then return start_date is null or marker = start_date; end if;
  return start_date is null or a->>'date' >= start_date;
end;
$$;
revoke all on function public.calendar_uses_current_session(jsonb,jsonb) from public;
grant execute on function public.calendar_uses_current_session(jsonb,jsonb) to anon, authenticated, service_role;

create or replace function public.calendar_appointment_fields(a jsonb)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select jsonb_object_agg(key,value) from jsonb_each(a) where key = any(array[
    'id','service_id','client_ids','operator_id','date','start_time','duration_min','buffer_min','status','notes']);
$$;
revoke all on function public.calendar_appointment_fields(jsonb) from public;
grant execute on function public.calendar_appointment_fields(jsonb) to anon, authenticated, service_role;

create or replace function public.calendar_save_appointment(p_appointment jsonb, p_expected jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare old_row public.appointments; new_row public.appointments; expected_row public.appointments;
  c public.clients; touched jsonb := '[]'::jsonb; old_json jsonb; new_json jsonb;
  delta integer; affected integer; existed boolean;
begin
  perform set_config('lock_timeout', '5s', true);
  lock table public.appointments, public.clients in share row exclusive mode;
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
  return jsonb_build_object('appointment', to_jsonb(new_row), 'clients', touched);
end;
$$;
revoke all on function public.calendar_save_appointment(jsonb,jsonb) from public;
grant execute on function public.calendar_save_appointment(jsonb,jsonb) to anon, authenticated, service_role;
-- No table grants and no changes to existing RLS policies.
commit;
