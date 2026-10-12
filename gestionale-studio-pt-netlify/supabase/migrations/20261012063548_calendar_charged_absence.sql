-- Opt-in charge for late cancellations. Existing no-shows remain unchanged.
-- Keep the public OIDs, ACLs, package links, proposal rules and atomic writer.
do $$ begin
 execute replace(pg_get_functiondef('public.calendar_uses_current_session(jsonb,jsonb)'::regprocedure),
  'FUNCTION public.calendar_uses_current_session(', 'FUNCTION public.calendar_uses_current_session_pre_charged(');
 execute replace(pg_get_functiondef('public.calendar_audit_fields(text,jsonb)'::regprocedure),
  'FUNCTION public.calendar_audit_fields(', 'FUNCTION public.calendar_audit_fields_pre_charged(');
end $$;
revoke all on function public.calendar_uses_current_session_pre_charged(jsonb,jsonb),public.calendar_audit_fields_pre_charged(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_uses_current_session_pre_charged(jsonb,jsonb),public.calendar_audit_fields_pre_charged(text,jsonb) to service_role;

create or replace function public.calendar_uses_current_session(a jsonb,c jsonb) returns boolean
language plpgsql volatile security invoker set search_path='' as $$
begin
 if a->>'status'='noshow' and a->>'service_id' in ('pt11','circuit') and strpos(coalesce(a->>'notes',''),'[ASSENZA-SCALATA]')>0 then
  -- Only the accounting predicate sees a synthetic status; the row stays absent.
  return public.calendar_uses_current_session_pre_charged(a||jsonb_build_object('status','fatto'),c);
 end if;
 return public.calendar_uses_current_session_pre_charged(a,c);
end $$;

create or replace function public.calendar_audit_fields(kind text,row_data jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb:=public.calendar_audit_fields_pre_charged(kind,row_data);
begin
 if kind='appointments' and row_data is not null then
  result:=result||jsonb_build_object('charged_absence',row_data->>'status'='noshow' and row_data->>'service_id' in ('pt11','circuit') and strpos(coalesce(row_data->>'notes',''),'[ASSENZA-SCALATA]')>0);
 end if;
 return result;
end $$;
