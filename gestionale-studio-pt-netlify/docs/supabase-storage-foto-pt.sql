-- Setup foto Scheda PT
-- Esegui questo script una volta in Supabase SQL Editor.
-- Il codice app usa il bucket pubblico "client-photos" e salva nel DB solo URL/path.
-- Upload/eliminazione passano dalla Netlify Function con SUPABASE_SERVICE_ROLE_KEY.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-photos',
  'client-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pt foto public read" on storage.objects;
create policy "pt foto public read"
on storage.objects for select
using (bucket_id = 'client-photos');
