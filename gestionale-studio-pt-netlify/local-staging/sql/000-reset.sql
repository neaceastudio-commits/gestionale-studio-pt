\set ON_ERROR_STOP on

begin;

drop schema if exists public cascade;
create schema public;

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  grant all on tables to service_role;

commit;
