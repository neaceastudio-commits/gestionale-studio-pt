-- Persistenza sicura e atomica del Portale Personal Trainer.
-- Questa migrazione va applicata prima del deploy del portale aggiornato.

create table if not exists public.pt_program_revisions (
  id text primary key,
  program_id text not null,
  cliente_id text not null,
  data jsonb not null,
  source_updated_at timestamptz null,
  created_by text null,
  created_at timestamptz not null default now()
);

create index if not exists pt_program_revisions_program_created_idx
  on public.pt_program_revisions (program_id, created_at desc);

create index if not exists pt_program_revisions_cliente_created_idx
  on public.pt_program_revisions (cliente_id, created_at desc);

create table if not exists public.pt_hand_grip_measurements (
  id text primary key,
  cliente_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pt_hand_grip_cliente_updated_idx
  on public.pt_hand_grip_measurements (cliente_id, updated_at desc);

alter table public.pt_hand_grip_measurements enable row level security;
revoke all privileges on table public.pt_hand_grip_measurements from public, anon, authenticated;
grant select, insert, update, delete on table public.pt_hand_grip_measurements to service_role;

alter table public.pt_program_revisions enable row level security;
revoke all privileges on table public.pt_program_revisions from public, anon, authenticated;
grant select, insert, update, delete on table public.pt_program_revisions to service_role;

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
  v_revision_id text;
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

  if found then
    v_revision_id := p_program_id || ':' || floor(extract(epoch from v_now) / 600)::bigint::text;
    insert into public.pt_program_revisions (
      id,
      program_id,
      cliente_id,
      data,
      source_updated_at,
      created_by,
      created_at
    ) values (
      v_revision_id,
      p_program_id,
      p_cliente_id,
      v_existing.data,
      v_existing.updated_at,
      nullif(btrim(p_actor_id), ''),
      v_now
    )
    on conflict (id) do nothing;
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
    'revision', case
      when v_revision_id is null then null
      else jsonb_build_object(
        'id', v_revision_id,
        'program_id', p_program_id,
        'cliente_id', p_cliente_id,
        'created_by', nullif(btrim(p_actor_id), ''),
        'created_at', v_now
      )
    end
  );
end;
$$;

revoke all on function public.pt_save_program(text, text, jsonb, timestamptz, text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.pt_save_program(text, text, jsonb, timestamptz, text, boolean, jsonb)
  to service_role;

create table if not exists public.pt_exercise_archive (
  id text primary key,
  name text not null,
  group_name text not null,
  line text not null default 'all',
  tags jsonb not null default '[]'::jsonb,
  recovery text not null default '75 sec',
  notes text not null default '',
  active boolean not null default true,
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_exercise_archive_group_idx on public.pt_exercise_archive (group_name);

-- Le tabelle condivise schede_allenamento e carichi_allenamento sono ancora
-- usate dalla Scheda Cliente legacy. Il rilascio PT non ne modifica i permessi:
-- la chiusura generale richiede prima la migrazione degli altri consumatori.
-- Le nuove strutture dedicate al portale sono riservate alla API server.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'pt_hand_grip_measurements',
    'pt_exercise_archive',
    'pt_program_revisions'
  ] loop
    if to_regclass('public.' || table_name) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to service_role', table_name);

    for policy_name in
      select pol.polname
        from pg_policy pol
       where pol.polrelid = to_regclass('public.' || table_name)
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end;
$$;
