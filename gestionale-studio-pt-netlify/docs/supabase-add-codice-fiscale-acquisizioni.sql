alter table public.acquisizioni
  add column if not exists codice_fiscale text,
  add column if not exists contatto_emergenza text;
