-- Additive only: acquisitions remain the live fallback for client birthdays.
begin;
set local lock_timeout = '750ms';
lock table public.operators, public.clients in access exclusive mode;
alter table public.clients add column if not exists nascita date;
alter table public.operators add column if not exists nascita date;
alter table public.clients add constraint clients_birthdate_valid check (nascita is null or nascita between date '1900-01-01' and current_date) not valid;
alter table public.operators add constraint operators_birthdate_valid check (nascita is null or nascita between date '1900-01-01' and current_date) not valid;
alter table public.clients validate constraint clients_birthdate_valid;
alter table public.operators validate constraint operators_birthdate_valid;
notify pgrst, 'reload schema';
commit;
