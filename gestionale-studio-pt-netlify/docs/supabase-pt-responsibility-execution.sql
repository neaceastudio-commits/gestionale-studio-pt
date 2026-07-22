-- NEACEA — PT esecutore della prestazione
-- MIGRAZIONE ADDITIVA PREPARATA, NON ESEGUITA AUTOMATICAMENTE.
-- Non modifica clients.pt_assegnato, appointments.operator_id o record esistenti.
-- Non effettua alcun backfill: lo storico senza prova resta NULL.

begin;

alter table public.appointments
  add column if not exists performed_by_operator_id text;

comment on column public.appointments.performed_by_operator_id is
  'operators.id del PT che ha realmente eseguito la prestazione. NULL significa non registrato e non deve essere dedotto da operator_id.';

create index if not exists appointments_performer_pt_idx
  on public.appointments (performed_by_operator_id)
  where performed_by_operator_id is not null and performed_by_operator_id <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_performer_pt_fk'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_performer_pt_fk
      foreign key (performed_by_operator_id) references public.operators(id)
      on update cascade on delete restrict not valid;
  end if;
end $$;

commit;

-- Non validare il vincolo e non rendere il campo obbligatorio finché lo storico
-- e i flussi di scrittura non sono stati verificati su staging.
