-- NEACEA — verifica viste PT, SOLO LETTURA.
-- Non contiene DDL o scritture e non recupera record cliente.

select
  table_name,
  column_name,
  ordinal_position,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('pt_calendar_sessions', 'pt_dashboard_metrics')
  and column_name in ('appointment_id', 'operator_id', 'trainer_id', 'performed_by_operator_id')
order by table_name, ordinal_position;

-- Interpretazione attesa:
-- - pt_calendar_sessions deve esporre performed_by_operator_id per i consumatori
--   che devono distinguere pianificazione ed esecuzione;
-- - pt_dashboard_metrics resta una vista di carico/programmazione. Le statistiche
--   sulle prestazioni svolte devono leggere appointments.performed_by_operator_id.
