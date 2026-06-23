-- Archivio consensi compilati online dal cliente.
-- Esegui questo script nel SQL editor Supabase prima di usare /consenso-cliente/.

create table if not exists public.consensi_cliente (
  id text primary key,
  cliente_id text null,
  email text null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consensi_cliente_cliente_id_idx
  on public.consensi_cliente (cliente_id);

create index if not exists consensi_cliente_email_idx
  on public.consensi_cliente (email);

alter table public.consensi_cliente enable row level security;

drop policy if exists "Consensi cliente inseribili da form pubblico" on public.consensi_cliente;
create policy "Consensi cliente inseribili da form pubblico"
  on public.consensi_cliente
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Consensi cliente aggiornabili da form pubblico" on public.consensi_cliente;
create policy "Consensi cliente aggiornabili da form pubblico"
  on public.consensi_cliente
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Consensi cliente leggibili da gestionale" on public.consensi_cliente;
create policy "Consensi cliente leggibili da gestionale"
  on public.consensi_cliente
  for select
  to anon, authenticated
  using (true);
