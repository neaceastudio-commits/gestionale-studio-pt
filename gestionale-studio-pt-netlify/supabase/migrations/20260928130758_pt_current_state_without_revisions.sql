-- Autosave updates the same program. Actual former programs remain in client history.
-- Preserve locking, optimistic concurrency, atomic loads and the current-program wrapper.
-- Existing revision rows are left untouched; no new snapshots are produced.
begin;
create or replace function public.pt_save_program(
  p_program_id text,
  p_cliente_id text,
  p_data jsonb,
  p_expected_updated_at timestamptz default null,
  p_actor_id text default null,
  p_force boolean default false,
  p_load_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing public.schede_allenamento%rowtype;
  v_saved public.schede_allenamento%rowtype;
  v_now timestamptz := clock_timestamp();
  v_sync_token text := coalesce(p_data #>> '{save_meta,sync_token}', v_now::text);
begin
  if coalesce(btrim(p_program_id), '') = '' or coalesce(btrim(p_cliente_id), '') = '' then
    raise exception 'PROGRAM_IDENTIFIERS_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_program_id, 0));

  select *
    into v_existing
    from public.schede_allenamento
   where id = p_program_id
   for update;

  if found and v_existing.cliente_id is distinct from p_cliente_id then
    raise exception 'PROGRAM_CLIENT_MISMATCH';
  end if;

  if found and not p_force and v_existing.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object(
      'success', false,
      'code', 'PROGRAM_CONFLICT',
      'current', to_jsonb(v_existing)
    );
  end if;

  insert into public.schede_allenamento (id, cliente_id, data, updated_at)
  values (p_program_id, p_cliente_id, p_data, v_now)
  on conflict (id) do update set
    cliente_id = excluded.cliente_id,
    data = excluded.data,
    updated_at = excluded.updated_at
  returning * into v_saved;

  if jsonb_typeof(coalesce(p_load_rows, '[]'::jsonb)) = 'array' then
    insert into public.carichi_allenamento (id, cliente_id, data, updated_at)
    select
      item ->> 'id',
      p_cliente_id,
      item -> 'data',
      v_now
    from jsonb_array_elements(coalesce(p_load_rows, '[]'::jsonb)) as item
    where coalesce(item ->> 'id', '') <> ''
      and jsonb_typeof(item -> 'data') = 'object'
    on conflict (id) do update set
      cliente_id = excluded.cliente_id,
      data = excluded.data,
      updated_at = excluded.updated_at;
  end if;

  delete from public.carichi_allenamento
   where cliente_id = p_cliente_id
     and data ->> 'program_id' = p_program_id
     and coalesce(data ->> 'sync_token', '') <> v_sync_token;

  return jsonb_build_object(
    'success', true,
    'row', to_jsonb(v_saved),
    'revision', null
  );
end;
$$;

revoke all on function public.pt_save_program(text, text, jsonb, timestamptz, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.pt_save_program(text, text, jsonb, timestamptz, text, boolean, jsonb)
  to service_role;

commit;
