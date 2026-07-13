-- Archivio esercizi studio per il Portale Personal Trainer.
-- Sicuro da rieseguire: crea la tabella se manca e aggiorna le policy pubbliche gia usate dalle app Netlify.

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

create index if not exists pt_exercise_archive_group_idx
  on public.pt_exercise_archive (group_name);

create index if not exists pt_exercise_archive_line_idx
  on public.pt_exercise_archive (line);

create index if not exists pt_exercise_archive_active_idx
  on public.pt_exercise_archive (active);

alter table public.pt_exercise_archive enable row level security;

drop policy if exists "pt_exercise_archive_select" on public.pt_exercise_archive;
drop policy if exists "pt_exercise_archive_insert" on public.pt_exercise_archive;
drop policy if exists "pt_exercise_archive_update" on public.pt_exercise_archive;

create policy "pt_exercise_archive_select"
on public.pt_exercise_archive for select
to anon, authenticated
using (true);

create policy "pt_exercise_archive_insert"
on public.pt_exercise_archive for insert
to anon, authenticated
with check (true);

create policy "pt_exercise_archive_update"
on public.pt_exercise_archive for update
to anon, authenticated
using (true)
with check (true);
