-- NEACEA — preflight produzione PT, SOLO LETTURA.
-- Eseguire nel SQL Editor e salvare integralmente il risultato prima di
-- applicare qualunque DDL. Non restituisce dati anagrafici o singoli record.

select
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'appointments' and column_name in (
      'id',
      'client_ids',
      'operator_id',
      'performed_by_operator_id',
      'date',
      'start_time',
      'status'
    ))
    or (table_name = 'operators' and column_name = 'id')
    or (table_name = 'clients' and column_name in ('id', 'pt_assegnato'))
  )
order by table_name, ordinal_position;

select
  table_name,
  column_name,
  ordinal_position,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('pt_calendar_sessions', 'pt_dashboard_metrics')
order by table_name, ordinal_position;

select
  viewname,
  definition
from pg_views
where schemaname = 'public'
  and viewname in ('pt_calendar_sessions', 'pt_dashboard_metrics')
order by viewname;

select
  constraint_name,
  constraint_type
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'appointments'
  and constraint_name = 'appointments_performer_pt_fk';

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'appointments'
  and indexname = 'appointments_performer_pt_idx';

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'appointments',
    'pt_calendar_sessions',
    'pt_dashboard_metrics'
  )
order by table_name, grantee, privilege_type;

select
  (select count(*) from public.appointments) as appointments_count,
  (select count(*) from public.pt_calendar_sessions) as calendar_rows_count,
  (select count(*) from public.pt_dashboard_metrics) as dashboard_rows_count,
  (select count(*) from public.appointments where operator_id is null) as appointments_without_scheduled_pt,
  (select count(*) from public.clients where nullif(pt_assegnato, '') is null) as clients_without_responsible_pt,
  (
    select count(*)
    from public.clients client
    where nullif(client.pt_assegnato, '') is not null
      and not exists (
        select 1
        from public.operators operator
        where operator.id = client.pt_assegnato
      )
  ) as clients_with_invalid_responsible_pt,
  (
    select count(*)
    from (
      select client_id
      from public.trainer_client_assignments
      where active is true and ended_at is null
      group by client_id
      having count(*) > 1
    ) duplicated
  ) as clients_with_parallel_active_assignments;
