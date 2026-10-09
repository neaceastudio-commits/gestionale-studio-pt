-- Shared prescriptions only. Patient identity and execution history never belong here.
create table public.pt_program_templates (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{10,120}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  snapshot jsonb not null check (
    (jsonb_typeof(snapshot) = 'object'
    and snapshot->>'format' = 'neacea-program-editor-v1'
    and jsonb_typeof(snapshot->'program'->'days') = 'array'
    and octet_length(snapshot::text) <= 600000) is true
  ),
  created_by text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index pt_program_templates_active_created_idx
  on public.pt_program_templates (created_at desc, id asc)
  where archived_at is null;

alter table public.pt_program_templates enable row level security;
revoke all privileges on table public.pt_program_templates from public, anon, authenticated, service_role;
grant select, insert, update on table public.pt_program_templates to service_role;
comment on table public.pt_program_templates is
  'Studio-wide training templates. Server-only: authenticated PT API checks source ownership and author/owner withdrawal. No patient records.';
