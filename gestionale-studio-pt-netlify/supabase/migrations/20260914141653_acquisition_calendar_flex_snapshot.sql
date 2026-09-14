-- Planning and commit share the authoritative flex flag. No data backfill.
begin;
create or replace function public.calendar_planning_snapshot()
returns jsonb language sql volatile security invoker set search_path = '' as $$
  with data as (select jsonb_build_object(
    'flexMode', public.calendar_flex_mode(),
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
    if coalesce(stored.duration_min,0) < 15 or stored.duration_min > 240 or stored.duration_min % 15 <> 0 then raise exception 'Duration must be a multiple of 15 between 15 and 240'; end if;
    insert into public.appointments(id, service_id, client_ids, operator_id, date, start_time, duration_min, buffer_min, status, notes, created_at, updated_at)
      values(stored.id, stored.service_id, stored.client_ids, stored.operator_id, stored.date, stored.start_time, stored.duration_min, stored.buffer_min, stored.status, stored.notes, now(), now());
    ids := ids || jsonb_build_array(stored.id);
  end loop;
  return jsonb_build_object('success', true, 'appointmentIds', ids);
end;
$$;
revoke all on function public.calendar_commit_package(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.calendar_commit_package(text,text,jsonb) to service_role;


commit;
