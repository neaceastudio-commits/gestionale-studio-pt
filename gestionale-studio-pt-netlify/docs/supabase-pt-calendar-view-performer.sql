-- NEACEA — estensione additiva di pt_calendar_sessions.
-- SQL PREPARATO, NON ESEGUITO AUTOMATICAMENTE.
-- Prerequisito: eseguire prima supabase-pt-responsibility-execution.sql.
-- Non modifica appointments, non esegue backfill e non cambia pt_dashboard_metrics.

begin;

do $$
declare
  existing_definition text;
begin
  if not exists (
    select 1
    from information_schema.views
    where table_schema = 'public' and table_name = 'pt_calendar_sessions'
  ) then
    raise exception 'Vista public.pt_calendar_sessions non trovata';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pt_calendar_sessions'
      and column_name = 'performed_by_operator_id'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pt_calendar_sessions'
      and column_name = 'appointment_id'
  ) then
    raise exception 'Aggiornamento bloccato: pt_calendar_sessions non espone appointment_id';
  end if;

  select pg_get_viewdef('public.pt_calendar_sessions'::regclass, true)
    into existing_definition;

  -- pg_get_viewdef può terminare la definizione con ";". Dentro una
  -- sottoquery quel terminatore produce SQL invalido.
  existing_definition := rtrim(existing_definition, E' \n\r\t;');

  execute format(
    'create or replace view public.pt_calendar_sessions as '
    'select existing_view.*, appointments.performed_by_operator_id '
    'from (%s) existing_view '
    'left join public.appointments appointments on appointments.id = existing_view.appointment_id',
    existing_definition
  );
end $$;

commit;

-- pt_dashboard_metrics non viene alterata: descrive assegnazioni e carico di
-- calendario. Le metriche di prestazione/compenso devono essere calcolate dalla
-- colonna esecutore di appointments, senza fallback su operator_id.
