-- NEACEA — rollback protetto della migrazione PT esecutore
-- PREPARATO, NON ESEGUITO AUTOMATICAMENTE.
-- Funziona soltanto finché la nuova colonna non contiene dati.

begin;

do $$
begin
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
