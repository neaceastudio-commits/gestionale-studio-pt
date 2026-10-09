-- Additive library organization. Existing client programs/snapshots are not rewritten.
create table public.pt_program_folders (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{10,120}$'),
  name text not null check (length(btrim(name)) between 1 and 120),
  parent_id text references public.pt_program_folders(id) on delete set null,
  created_by text not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (parent_id is distinct from id)
);
create index pt_program_folders_parent_idx on public.pt_program_folders(parent_id);
alter table public.pt_program_templates
  add column folder_id text references public.pt_program_folders(id) on delete set null,
  add column updated_at timestamptz not null default clock_timestamp(),
  add column last_request_id text;
create index pt_program_templates_folder_idx on public.pt_program_templates(folder_id);

-- Version every mutation, including FK reparenting caused by deleting a folder.
create function public.pt_library_version() returns trigger language plpgsql security invoker
set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  if tg_table_name = 'pt_program_folders' then
    if new.parent_id is distinct from old.parent_id and new.parent_id is not null then
      raise exception 'FOLDER_REPARENT_NOT_SUPPORTED';
    end if;
  end if;
  return new;
end $$;
create trigger pt_folder_version before update on public.pt_program_folders
  for each row execute function public.pt_library_version();
create trigger pt_template_version before update on public.pt_program_templates
  for each row execute function public.pt_library_version();

create table public.pt_client_current_programs (
  cliente_id text primary key references public.clients(id) on delete cascade,
  program_id text references public.schede_allenamento(id) on delete cascade,
  updated_at timestamptz not null default clock_timestamp()
);
create index pt_client_current_program_idx on public.pt_client_current_programs(program_id);
-- Freeze the previously selected default once; later edits never reorder current/history.
insert into public.pt_client_current_programs(cliente_id,program_id)
select distinct on (s.cliente_id) s.cliente_id,s.id
from public.schede_allenamento s join public.clients c on c.id=s.cliente_id
where coalesce(s.data->>'archived','false') <> 'true'
order by s.cliente_id,
  coalesce(nullif(s.data->>'period',''),nullif(s.data#>>'{pt_studio_state,meta,period}',''),to_char(s.updated_at,'YYYY-MM')) desc,
  s.updated_at desc nulls last,s.id;

alter table public.pt_program_folders enable row level security;
alter table public.pt_client_current_programs enable row level security;
revoke all on public.pt_program_folders, public.pt_client_current_programs from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.pt_program_folders to service_role;
grant select,insert,update on public.pt_client_current_programs to service_role;

-- Reuse existing atomic persistence/revisions/loads, adding only current-program selection.
create function public.pt_save_program_with_current(
  p_program_id text, p_cliente_id text, p_data jsonb,
  p_expected_updated_at timestamptz default null, p_actor_id text default null,
  p_force boolean default false, p_load_rows jsonb default '[]'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_new boolean; v_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('pt-client:'||p_cliente_id,0));
  v_new := not exists(select 1 from public.schede_allenamento where id=p_program_id);
  v_result := public.pt_save_program(p_program_id,p_cliente_id,p_data,p_expected_updated_at,p_actor_id,p_force,p_load_rows);
  if v_result->>'success' = 'true' and v_new and coalesce(p_data->>'archived','false') <> 'true' then
    insert into public.pt_client_current_programs(cliente_id,program_id) values(p_cliente_id,p_program_id)
    on conflict(cliente_id) do update set program_id=excluded.program_id,updated_at=clock_timestamp();
  end if;
  if v_result->>'success' = 'true' and p_data->>'archived' = 'true' then
    update public.pt_client_current_programs set program_id=(
      select id from public.schede_allenamento where cliente_id=p_cliente_id
      and coalesce(data->>'archived','false') <> 'true'
      order by created_at desc nulls last,id desc limit 1
    ),updated_at=clock_timestamp() where cliente_id=p_cliente_id and program_id=p_program_id;
  end if;
  return v_result || jsonb_build_object('currentProgramId',(select program_id from public.pt_client_current_programs where cliente_id=p_cliente_id));
end $$;

create function public.pt_set_current_program(p_cliente_id text,p_program_id text)
returns jsonb language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('pt-client:'||p_cliente_id,0));
  perform 1 from public.schede_allenamento where id=p_program_id and cliente_id=p_cliente_id
    and coalesce(data->>'archived','false') <> 'true' for update;
  if not found then raise exception 'PROGRAM_NOT_AVAILABLE'; end if;
  insert into public.pt_client_current_programs(cliente_id,program_id) values(p_cliente_id,p_program_id)
  on conflict(cliente_id) do update set program_id=excluded.program_id,updated_at=clock_timestamp();
  return jsonb_build_object('currentProgramId',p_program_id);
end $$;
revoke all on function public.pt_library_version(), public.pt_save_program_with_current(text,text,jsonb,timestamptz,text,boolean,jsonb),public.pt_set_current_program(text,text) from public,anon,authenticated;
grant execute on function public.pt_save_program_with_current(text,text,jsonb,timestamptz,text,boolean,jsonb),public.pt_set_current_program(text,text) to service_role;
