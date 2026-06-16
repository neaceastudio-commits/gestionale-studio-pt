-- Campi aggiuntivi usati dal consenso informato PT precompilato.
-- Esegui questo script nel SQL editor di Supabase.

alter table public.clients
  add column if not exists nascita date,
  add column if not exists sesso text,
  add column if not exists codice_fiscale text,
  add column if not exists documento text,
  add column if not exists indirizzo text,
  add column if not exists contatto_emergenza text;

alter table public.acquisizioni
  add column if not exists codice_fiscale text,
  add column if not exists documento text,
  add column if not exists indirizzo text,
  add column if not exists contatto_emergenza text;
