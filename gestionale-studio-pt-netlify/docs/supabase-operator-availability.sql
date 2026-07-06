-- Disponibilita PT per calendario studio.
-- Sicuro da rieseguire: crea la tabella se manca e aggiorna le policy pubbliche gia usate dal calendario.

create table if not exists public.operator_availability (
  operator_id text not null,
  day_key text not null check (day_key in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  slots jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (operator_id, day_key)
);

alter table public.operator_availability enable row level security;

drop policy if exists "operator_availability_select" on public.operator_availability;
drop policy if exists "operator_availability_insert" on public.operator_availability;
drop policy if exists "operator_availability_update" on public.operator_availability;
drop policy if exists "operator_availability_delete" on public.operator_availability;

create policy "operator_availability_select"
on public.operator_availability for select
using (true);

create policy "operator_availability_insert"
on public.operator_availability for insert
with check (true);

create policy "operator_availability_update"
on public.operator_availability for update
using (true)
with check (true);

create policy "operator_availability_delete"
on public.operator_availability for delete
using (true);
