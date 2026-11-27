-- Explicit activation; preserve existing programs, loads and privileges.
create or replace function public.pt_save_program_with_current(
  p_program_id text, p_cliente_id text, p_data jsonb,
  p_expected_updated_at timestamptz default null, p_actor_id text default null,
  p_force boolean default false, p_load_rows jsonb default '[]'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_new boolean; v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('pt-client:'||p_cliente_id,0));
  v_new := not exists(select 1 from public.schede_allenamento where id=p_program_id);
  v_result := public.pt_save_program(p_program_id,p_cliente_id,p_data,p_expected_updated_at,p_actor_id,p_force,p_load_rows);
  if v_result->>'success' = 'true' and v_new and coalesce(p_data->>'archived','false') <> 'true'
     and coalesce(p_data#>>'{pt_studio_state,meta,lifecycle}',p_data->>'lifecycle','active') <> 'preparation' then
    insert into public.pt_client_current_programs(cliente_id,program_id) values(p_cliente_id,p_program_id)
    on conflict(cliente_id) do update set program_id=excluded.program_id,updated_at=clock_timestamp();
  end if;
  if v_result->>'success' = 'true' and p_data->>'archived' = 'true' then
    update public.pt_client_current_programs set program_id=(
      select id from public.schede_allenamento where cliente_id=p_cliente_id
      and coalesce(data->>'archived','false') <> 'true'
      and coalesce(data#>>'{pt_studio_state,meta,lifecycle}',data->>'lifecycle','active') <> 'preparation'
      order by created_at desc nulls last,id desc limit 1
    ),updated_at=clock_timestamp() where cliente_id=p_cliente_id and program_id=p_program_id;
  end if;
  return v_result || jsonb_build_object('currentProgramId',(select program_id from public.pt_client_current_programs where cliente_id=p_cliente_id));
end $$;

create or replace function public.pt_set_current_program(p_cliente_id text,p_program_id text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_row public.schede_allenamento; v_date date;
begin
  perform pg_advisory_xact_lock(hashtextextended('pt-client:'||p_cliente_id,0));
  select * into v_row from public.schede_allenamento where id=p_program_id and cliente_id=p_cliente_id
    and coalesce(data->>'archived','false') <> 'true' for update;
  if not found then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;
  if coalesce(v_row.data#>>'{pt_studio_state,meta,lifecycle}',v_row.data->>'lifecycle','active')='preparation' then
    v_date := nullif(coalesce(v_row.data#>>'{pt_studio_state,meta,assignedAt}',v_row.data->>'assigned_at'),'')::date;
    if v_date is null or v_date>(now() at time zone 'Europe/Rome')::date then raise exception 'PROGRAM_ACTIVATION_DATE_INVALID'; end if;
    update public.schede_allenamento set data=jsonb_set(jsonb_set(data,'{lifecycle}','"active"'::jsonb),'{pt_studio_state,meta,lifecycle}','"active"'::jsonb),updated_at=clock_timestamp()
    where id=p_program_id returning * into v_row;
  end if;
  insert into public.pt_client_current_programs(cliente_id,program_id) values(p_cliente_id,p_program_id)
  on conflict(cliente_id) do update set program_id=excluded.program_id,updated_at=clock_timestamp();
  return jsonb_build_object('currentProgramId',p_program_id,'row',to_jsonb(v_row));
end $$;
