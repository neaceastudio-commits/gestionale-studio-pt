-- NEACEA — postflight produzione PT, SOLO LETTURA.
-- Prerequisito: entrambe le migrazioni additive sono state applicate.
-- Non restituisce dati anagrafici o singoli record.

select
  table_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'appointments' and column_name = 'performed_by_operator_id')
    or (
      table_name = 'pt_calendar_sessions'
      and column_name in ('appointment_id', 'trainer_id', 'performed_by_operator_id')
    )
  )
order by table_name, ordinal_position;

select
  constraint_name,
  constraint_type,
  is_deferrable,
  initially_deferred
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
  count(*) as performer_values_after_additive_migration
from public.appointments
where nullif(performed_by_operator_id, '') is not null;

select
  count(*) as calendar_performer_mismatches
from public.pt_calendar_sessions calendar
join public.appointments appointment
  on appointment.id = calendar.appointment_id
where calendar.performed_by_operator_id
  is distinct from appointment.performed_by_operator_id;

select
  table_name,
  column_name,
  ordinal_position
from information_schema.columns
where table_schema = 'public'
  and table_name = 'pt_dashboard_metrics'
order by ordinal_position;
