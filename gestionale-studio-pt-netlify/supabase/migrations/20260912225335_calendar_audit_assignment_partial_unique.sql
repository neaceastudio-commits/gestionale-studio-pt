-- Production has a partial unique index on (trainer_id, client_id) WHERE active IS TRUE.
-- Reuse an active/inactive relation explicitly under the gateway's global write lock.
-- No table, index, policy, grant or preexisting data changes.
create or replace function public.calendar_audit_set_assignment(p_client text,p_trainer text,p_actor text)
returns void language plpgsql security invoker set search_path='' as $$
declare existing_id text;
begin
 if current_setting('role',true)<>'service_role' or nullif(current_setting('neacea.audit_context',true),'') is null then raise exception 'Verified assignment context required';end if;
 if not exists(select 1 from public.clients where id=p_client) then raise exception 'Client missing';end if;
 if p_trainer is not null and not exists(select 1 from public.operators where id=p_trainer and active) then raise exception 'Active operator required';end if;
 lock table public.appointments in share row exclusive mode;
 update public.trainer_client_assignments set active=false,ended_at=clock_timestamp(),updated_at=clock_timestamp()
 where client_id=p_client and active and trainer_id is distinct from p_trainer;
 if p_trainer is not null then
  select id into existing_id from public.trainer_client_assignments
  where trainer_id=p_trainer and client_id=p_client
  order by active desc,updated_at desc,id limit 1 for update;
  if existing_id is not null then
   update public.trainer_client_assignments set active=true,assigned_by=p_actor,ended_at=null,updated_at=clock_timestamp()
   where id=existing_id and not active;
  else
   insert into public.trainer_client_assignments(id,trainer_id,client_id,assigned_by,assignment_source,active,notes)
   values('tca_audit_'||md5(p_client||':'||p_trainer),p_trainer,p_client,p_actor,'manual',true,'');
  end if;
 end if;
end; $$;
