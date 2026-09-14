begin;
alter table public.operators
  add column whatsapp_phone text,
  add column whatsapp_agenda_enabled boolean not null default false,
  add constraint operators_whatsapp_phone_e164 check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint operators_whatsapp_enabled_phone check (not whatsapp_agenda_enabled or whatsapp_phone is not null);

-- No bodies, client names, recipient numbers or tokens in this delivery ledger.
create table public.whatsapp_agenda_sends (
  agenda_day date not null,
  operator_id text not null references public.operators(id),
  status text not null default 'claimed' check (status in ('claimed','accepted','failed','uncertain')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  provider_message_id text,
  error text check (length(error) <= 80),
  primary key (agenda_day, operator_id)
);
alter table public.whatsapp_agenda_sends enable row level security;
revoke all on public.whatsapp_agenda_sends from public, anon, authenticated;
grant select, insert, update on public.whatsapp_agenda_sends to service_role;
revoke delete, truncate on public.whatsapp_agenda_sends from service_role;

create function public.whatsapp_agenda_claim(p_day date, p_operator_id text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  insert into public.whatsapp_agenda_sends(agenda_day,operator_id)
  values(p_day,p_operator_id) on conflict(agenda_day,operator_id) do nothing;
  return found;
end; $$;
create function public.whatsapp_agenda_finish(p_day date, p_operator_id text, p_status text, p_message_id text, p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if p_status not in ('accepted','failed','uncertain') then raise exception 'Invalid delivery status'; end if;
  update public.whatsapp_agenda_sends set status=p_status,provider_message_id=p_message_id,error=p_error,updated_at=clock_timestamp()
  where agenda_day=p_day and operator_id=p_operator_id and status='claimed';
  return found;
end; $$;
revoke all on function public.whatsapp_agenda_claim(date,text) from public,anon,authenticated;
revoke all on function public.whatsapp_agenda_finish(date,text,text,text,text) from public,anon,authenticated;
grant execute on function public.whatsapp_agenda_claim(date,text) to service_role;
grant execute on function public.whatsapp_agenda_finish(date,text,text,text,text) to service_role;
commit;
