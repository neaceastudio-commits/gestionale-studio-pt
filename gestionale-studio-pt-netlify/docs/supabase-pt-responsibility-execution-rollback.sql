-- NEACEA — rollback protetto della migrazione PT esecutore
-- PREPARATO, NON ESEGUITO AUTOMATICAMENTE.
-- Funziona soltanto prima dell'estensione di pt_calendar_sessions e finché la
-- nuova colonna non contiene dati. Dopo l'estensione della vista usare il
-- rollback applicativo descritto nel runbook, lasciando lo schema additivo.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'performed_by_operator_id'
  ) then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pt_calendar_sessions'
      and column_name = 'performed_by_operator_id'
  ) then
    raise exception 'Rollback strutturale bloccato: pt_calendar_sessions dipende da performed_by_operator_id. Usare il rollback applicativo senza eliminare la colonna.';
  end if;

  if exists (
    select 1
    from public.appointments
    where performed_by_operator_id is not null
      and performed_by_operator_id <> ''
  ) then
    raise exception 'Rollback bloccato: performed_by_operator_id contiene dati';
  end if;
end $$;

alter table public.appointments
  drop constraint if exists appointments_performer_pt_fk;

drop index if exists public.appointments_performer_pt_idx;

alter table public.appointments
  drop column if exists performed_by_operator_id;

commit;
