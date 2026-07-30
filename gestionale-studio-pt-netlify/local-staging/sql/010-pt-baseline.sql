\set ON_ERROR_STOP on

begin;

create table public.operators (
  id text primary key,
  nome text not null default '',
  cognome text not null default '',
  email text not null default '',
  roles jsonb not null default '[]'::jsonb,
  color text not null default '#2563EB',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id text primary key,
  nome text not null default '',
  cognome text not null default '',
  email text not null default '',
  telefono text not null default '',
  nascita date,
  sesso text not null default '',
  codice_fiscale text not null default '',
  documento text not null default '',
  indirizzo text not null default '',
  contatto_emergenza text not null default '',
  package_types jsonb not null default '[]'::jsonb,
  package_frequency text not null default '',
  sessions_total integer not null default 0 check (sessions_total >= 0),
  sessions_remaining integer not null default 0 check (sessions_remaining >= 0),
  giorni_settimana jsonb not null default '[]'::jsonb,
  package_start date,
  data_inizio date,
  data_scadenza date,
  notes text not null default '',
  pt_assegnato text,
  tipo_servizio text not null default '',
  tipo_abbonamento text not null default '',
  stato_abbonamento text not null default '',
  stato_pagamento text not null default '',
  importo numeric(12,2) not null default 0,
  obiettivo text not null default '',
  professione text not null default '',
  come text not null default '',
  motivazione integer,
  sessioni_pref text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id text primary key,
  service_id text not null,
  client_ids jsonb not null default '[]'::jsonb,
  operator_id text references public.operators(id)
    on update cascade on delete restrict,
  date date not null,
  start_time time not null,
  duration_min integer not null default 60 check (duration_min > 0),
  buffer_min integer not null default 0 check (buffer_min >= 0),
  status text not null default 'prenotato',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainer_client_assignments (
  id text primary key,
  trainer_id text not null references public.operators(id) on delete cascade,
  client_id text not null references public.clients(id) on delete cascade,
  assigned_by text references public.operators(id) on delete set null,
  assignment_source text not null default 'manual',
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

create view public.pt_assigned_clients as
select
  assignment.id as assignment_id,
  assignment.trainer_id,
  trainer.nome as trainer_nome,
  trainer.cognome as trainer_cognome,
  trainer.email as trainer_email,
  trainer.roles as trainer_roles,
  assignment.client_id,
  client.nome,
  client.cognome,
  client.telefono,
  client.email,
  client.professione,
  client.obiettivo,
  client.active as client_active,
  assignment.assignment_source,
  assignment.active as assignment_active,
  assignment.notes as assignment_notes,
  assignment.created_at as assigned_at,
  assignment.ended_at
from public.trainer_client_assignments assignment
join public.operators trainer on trainer.id = assignment.trainer_id
join public.clients client on client.id = assignment.client_id
where assignment.active is true
  and client.active is true
  and trainer.active is true;

create view public.pt_calendar_sessions as
select
  appointment.id as appointment_id,
  appointment.operator_id as trainer_id,
  trainer.nome as trainer_nome,
  trainer.cognome as trainer_cognome,
  client_ref.client_id,
  client.nome,
  client.cognome,
  appointment.service_id,
  appointment.date,
  appointment.start_time,
  appointment.duration_min,
  appointment.status,
  appointment.notes,
  appointment.created_at,
  appointment.updated_at
from public.appointments appointment
cross join lateral jsonb_array_elements_text(appointment.client_ids) as client_ref(client_id)
left join public.operators trainer on trainer.id = appointment.operator_id
left join public.clients client on client.id = client_ref.client_id
where appointment.operator_id is not null
  and appointment.status <> 'annullato';

create view public.pt_dashboard_metrics as
select
  operator.id as trainer_id,
  operator.nome as trainer_nome,
  operator.cognome as trainer_cognome,
  count(distinct assigned.client_id) as clienti_assegnati,
  count(distinct today.appointment_id) as sedute_oggi,
  count(distinct week.appointment_id) as sedute_settimana,
  0::integer as clienti_senza_programma,
  0::integer as clienti_da_rivalutare
from public.operators operator
left join public.pt_assigned_clients assigned
  on assigned.trainer_id = operator.id
left join public.pt_calendar_sessions today
  on today.trainer_id = operator.id
  and today.date = current_date
left join public.pt_calendar_sessions week
  on week.trainer_id = operator.id
  and week.date >= date_trunc('week', current_date)::date
  and week.date < (date_trunc('week', current_date)::date + 7)
where operator.active is true
group by operator.id, operator.nome, operator.cognome;

alter table public.operators enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.trainer_client_assignments enable row level security;

create policy operators_read_only
  on public.operators for select to anon, authenticated
  using (true);

create policy clients_read_only
  on public.clients for select to anon, authenticated
  using (true);

create policy appointments_read_only
  on public.appointments for select to anon, authenticated
  using (true);

create policy trainer_client_assignments_read_only
  on public.trainer_client_assignments for select to anon, authenticated
  using (true);

grant select on public.operators, public.clients, public.appointments,
  public.trainer_client_assignments
  to anon, authenticated;

grant select on public.pt_assigned_clients, public.pt_calendar_sessions,
  public.pt_dashboard_metrics
  to anon, authenticated;

grant all on public.operators, public.clients, public.appointments,
  public.trainer_client_assignments
  to service_role;

grant select on public.pt_assigned_clients, public.pt_calendar_sessions,
  public.pt_dashboard_metrics
  to service_role;

commit;
