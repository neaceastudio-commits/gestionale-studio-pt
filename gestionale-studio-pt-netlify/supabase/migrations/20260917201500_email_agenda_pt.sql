begin;
create table public.email_agenda_deliveries (
 agenda_day date not null,
 operator_id text not null references public.operators(id),
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','accepted','failed')),
 claim_token uuid,
 locked_until timestamptz,
 attempts integer not null default 0,
 provider_message_id text,
 error text,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(agenda_day,operator_id)
);
-- Immutable payload is required for safe provider retries; never exposed to clients.
alter table public.email_agenda_deliveries enable row level security;
revoke all on public.email_agenda_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.email_agenda_deliveries to service_role;
create function public.email_agenda_claim(p_day date,p_operator_id text,p_payload jsonb,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_day <> (clock_timestamp() at time zone 'Europe/Rome')::date then raise exception 'Invalid agenda day'; end if;
 -- Retain delivery evidence, but clear client names and email bodies after 7 days.
 update public.email_agenda_deliveries set payload='{}'::jsonb where agenda_day < p_day-7 and payload<>'{}'::jsonb;
 insert into public.email_agenda_deliveries(agenda_day,operator_id,payload)
 values(p_day,p_operator_id,p_payload) on conflict do nothing;
 update public.email_agenda_deliveries set claim_token=p_token,locked_until=clock_timestamp()+interval '2 minutes',attempts=attempts+1,updated_at=clock_timestamp()
 where agenda_day=p_day and operator_id=p_operator_id and status='pending' and attempts<7
 and (locked_until is null or locked_until<clock_timestamp()) returning payload into result;
 return result;
end; $$;
create function public.email_agenda_finish(p_day date,p_operator_id text,p_token uuid,p_status text,p_message_id text,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_status not in ('pending','accepted','failed') then raise exception 'Invalid delivery status';end if;
 update public.email_agenda_deliveries set status=p_status,provider_message_id=p_message_id,error=p_error,updated_at=clock_timestamp(),locked_until=clock_timestamp()+interval '4 minutes'
 where agenda_day=p_day and operator_id=p_operator_id and claim_token=p_token and status='pending';
 return found;
end; $$;
revoke all on function public.email_agenda_claim(date,text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.email_agenda_finish(date,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.email_agenda_claim(date,text,jsonb,uuid) to service_role;
grant execute on function public.email_agenda_finish(date,text,uuid,text,text,text) to service_role;
commit;
