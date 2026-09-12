-- Apply only together with authenticated calendar/acquisition endpoints.
create table public.calendar_audit_log (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default clock_timestamp(),
 actor_operator_id text, actor_name text not null, actor_email text, actor_role text not null,
 action text not null, entity_type text not null, entity_id text not null,
 client_ids jsonb not null default '[]', before_data jsonb, after_data jsonb,
 source text not null check(source in ('calendar','acquisition','system','apple')),
 request_id uuid not null, metadata jsonb not null default '{}'
);
create index calendar_audit_time_idx on public.calendar_audit_log(created_at desc,id desc);
create index calendar_audit_clients_idx on public.calendar_audit_log using gin(client_ids);
alter table public.calendar_audit_log enable row level security;
revoke all on public.calendar_audit_log from public,anon,authenticated,service_role;
revoke all on sequence public.calendar_audit_log_id_seq from public,anon,authenticated,service_role;

create function public.calendar_audit_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Calendar audit is append-only'; end; $$;
create trigger calendar_audit_immutable before update or delete or truncate on public.calendar_audit_log
 for each statement execute function public.calendar_audit_immutable();

create function public.calendar_audit_fields(kind text, row_data jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb; ledger_text text; ledger jsonb; cycle jsonb;
begin
 if row_data is null then return null;end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into result from jsonb_each(row_data)
 where key=any(case kind when 'appointments' then array['id','date','start_time','duration_min','buffer_min','service_id','operator_id','client_ids','status']
 when 'operator_availability' then array['operator_id','day_key','slots']
 when 'operators' then array['id','nome','cognome','active','roles']
 else array['id','sessions_total','sessions_remaining','pt_assegnato','package_start','data_inizio','data_conferma','active','package_types'] end);
 if kind in ('clients','appointments') then
  result:=result||jsonb_build_object('cycle_start',substring(coalesce(row_data->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),'cycle_id',substring(coalesce(row_data->>'notes','') from '\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]'));
 end if;
 if kind='clients' then
  ledger_text:=substring(coalesce(row_data->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]');
  if ledger_text is not null then
   begin
    ledger:=ledger_text::jsonb;
    select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value,n) order by case when coalesce(value->>'closedAt','')='' then 0 else 1 end,n desc limit 1;
    result:=result||jsonb_build_object('cycle_id',cycle->>'id','cycle_start',cycle->>'startDate');
   exception when others then result:=result||'{"cycle_parse_error":true}'::jsonb;end;
  end if;
 end if;
 return result;
end; $$;

-- Only this trigger can insert log rows. Context is created by service-only RPCs.
create function public.calendar_audit_capture() returns trigger language plpgsql security definer set search_path='' as $$
declare ctx jsonb; b jsonb; a jsonb; actions text[]; item text; ids jsonb; eid text;
begin
 b:=case when TG_OP='INSERT' then null else public.calendar_audit_fields(TG_TABLE_NAME,to_jsonb(old)) end;
 a:=case when TG_OP='DELETE' then null else public.calendar_audit_fields(TG_TABLE_NAME,to_jsonb(new)) end;
 -- Client notes/clinical/economic fields are deliberately outside the audit.
 if TG_TABLE_NAME='clients' and TG_OP='UPDATE' and a=b then return new; end if;
 ctx:=nullif(current_setting('neacea.audit_context',true),'')::jsonb;
 if current_setting('role',true) is distinct from 'service_role' or ctx is null then
   raise exception using errcode='42501',message='Verified calendar audit context required';
 end if;
 if TG_TABLE_NAME='operator_availability' then
  eid:=coalesce(a,b)->>'operator_id'||':'||(coalesce(a,b)->>'day_key');ids:='[]';
  actions:=array[case when a=b then 'availability_noop' else 'availability_changed' end];
 elsif TG_TABLE_NAME='operators' then
  eid:=coalesce(a,b)->>'id';ids:='[]';actions:=array['operator_profile_changed'];
 elsif TG_TABLE_NAME='clients' then
  eid:=coalesce(a,b)->>'id';ids:=jsonb_build_array(eid);actions:=array['client_package_changed'];
 else
  eid:=coalesce(a,b)->>'id';select coalesce(jsonb_agg(distinct value),'[]') into ids from jsonb_array_elements(coalesce(a->'client_ids','[]')||coalesce(b->'client_ids','[]'));
  if TG_OP='INSERT' then actions:=array[case when ctx->>'operation'='package' then 'package_appointment_created' else 'appointment_created' end];
  elsif TG_OP='DELETE' then actions:=array['appointment_deleted'];
  else
   actions:=array[]::text[];
   if (a->'date',a->'start_time') is distinct from (b->'date',b->'start_time') then actions:=array_append(actions,'appointment_moved'); end if;
   if a->'operator_id' is distinct from b->'operator_id' then actions:=array_append(actions,'operator_changed'); end if;
   if a->'service_id' is distinct from b->'service_id' then actions:=array_append(actions,'service_changed'); end if;
   if a->'status' is distinct from b->'status' then
    if b->>'status'='fatto' then actions:=array_append(actions,'done_reverted'); end if;
    actions:=array_append(actions,case a->>'status' when 'fatto' then 'marked_done' when 'annullato' then 'appointment_cancelled' when 'noshow' then 'marked_noshow' else 'status_changed' end);
   end if;
   if cardinality(actions)=0 then actions:=array[case when a=b then 'appointment_noop' else 'appointment_updated' end];end if;
  end if;
 end if;
 foreach item in array actions loop
  insert into public.calendar_audit_log(actor_operator_id,actor_name,actor_email,actor_role,action,entity_type,entity_id,client_ids,before_data,after_data,source,request_id,metadata)
  values(ctx->>'id',ctx->>'name',ctx->>'email',ctx->>'role',item,TG_TABLE_NAME,eid,ids,b,a,ctx->>'source',(ctx->>'request_id')::uuid,jsonb_build_object('automatic',ctx->>'source'='system','noop',a=b));
 end loop;
 if TG_OP='DELETE' then return old; else return new; end if;
end; $$;
create trigger calendar_audit_appointments after insert or update or delete on public.appointments for each row execute function public.calendar_audit_capture();
create trigger calendar_audit_availability after insert or update or delete on public.operator_availability for each row execute function public.calendar_audit_capture();
create trigger calendar_audit_operators after insert or update or delete on public.operators for each row execute function public.calendar_audit_capture();
create trigger calendar_audit_clients after insert or update or delete on public.clients for each row execute function public.calendar_audit_capture();

-- Direct REST and legacy RPC mutations must not bypass audit. All writes go through the service gateway.
revoke insert,update,delete,truncate on public.appointments,public.operator_availability,public.clients,public.operators from public,anon,authenticated;
revoke truncate on public.appointments,public.operator_availability,public.clients,public.operators from service_role;
-- Role assignments must not be editable through the public Data API.
do $$begin if to_regclass('public.operator_system_roles') is not null then execute 'revoke insert,update,delete,truncate on public.operator_system_roles from public,anon,authenticated';end if;end$$;
revoke execute on function public.calendar_save_appointment(jsonb,jsonb) from anon,authenticated;

create function public.calendar_audit_write(p_actor_id text,p_actor_role text,p_source text,p_request_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor jsonb; roles text[]; ctx jsonb; r jsonb; oldrow jsonb; result jsonb; results jsonb:='[]'; k text; cols text; updates text; fields text[]; slots jsonb; oldslots jsonb; target text;
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service gateway required';end if;
 if p_source not in ('calendar','acquisition','system') then raise exception 'Invalid source';end if;
 if p_source='system' then
  if p_actor_id is not null or p_actor_role<>'system' then raise exception 'Invalid system identity';end if;
  ctx:=jsonb_build_object('name','Sistema','role','system');
 else
  select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
  if actor is null then raise exception 'Inactive operator';end if;
  select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
  if p_actor_role='owner' and not roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'] then raise exception 'Owner role required';end if;
  if p_actor_role='pt' and not roles && array['pt','personal_trainer','personal trainer'] then raise exception 'PT role required';end if;
  if p_actor_role='secretary' and not roles && array['secretary','segreteria'] then raise exception 'Secretary role required';end if;
  if p_actor_role not in ('owner','pt','secretary') then raise exception 'Invalid actor role';end if;
  ctx:=jsonb_build_object('id',p_actor_id,'name',trim(concat(actor->>'nome',' ',actor->>'cognome')),'email',actor->>'email','role',p_actor_role);
 end if;
 ctx:=ctx||jsonb_build_object('source',p_source,'request_id',p_request_id,'operation',p_operation);
 perform set_config('neacea.audit_context',ctx::text,true);
 -- Global lock ordering matches the existing save RPC and prevents stale authorization/read races.
 lock table public.appointments in share row exclusive mode;
 if p_operation='package' then
  if p_actor_role<>'owner' then raise exception 'Package planning requires owner';end if;
  result:=public.calendar_commit_package(p_payload->>'revision',p_payload->>'clientId',p_payload->'rows');
 elsif p_operation in ('save','delete') then
  r:=p_payload->'appointment';target:=coalesce(r->>'id',p_payload->>'id');
  select to_jsonb(a) into oldrow from public.appointments a where a.id=target;
  if p_actor_role='pt' and (coalesce(oldrow->>'operator_id',r->>'operator_id') is distinct from p_actor_id or (p_operation='save' and r->>'operator_id' is distinct from p_actor_id)) then raise exception 'Appointment belongs to another PT';end if;
  if p_actor_role='pt' and p_operation='save' and exists(select 1 from jsonb_array_elements_text(coalesce(r->'client_ids','[]')) i where not coalesce(oldrow->'client_ids','[]') @> jsonb_build_array(i.value) and not exists(select 1 from public.clients c where c.id=i.value and c.pt_assegnato=p_actor_id and c.active)) then raise exception 'New participant belongs to another PT';end if;
  if p_operation='delete' then
   if oldrow is null then raise exception 'Appointment missing';end if;
   perform public.calendar_save_appointment(oldrow||'{"status":"annullato"}'::jsonb,oldrow);
   delete from public.appointments where id=target;result:='{}';
  else result:=public.calendar_save_appointment(r,case when p_payload ? 'expected' then p_payload->'expected' else oldrow end);end if;
 elsif p_operation='availability' then
  for r in select value from jsonb_array_elements(p_payload->'rows') loop
   if p_actor_role='pt' and r->>'operator_id' is distinct from p_actor_id then raise exception 'Availability belongs to another PT';end if;
   select coalesce(jsonb_agg(v order by v),'[]') into slots from (select distinct trim(value) v from jsonb_array_elements_text(r->'slots') where trim(value)<>'') s;
   select a.slots into oldslots from public.operator_availability a where a.operator_id=r->>'operator_id' and a.day_key=r->>'day_key';
   select coalesce(jsonb_agg(v order by v),'[]') into oldslots from (select distinct trim(value) v from jsonb_array_elements_text(coalesce(oldslots,'[]')) where trim(value)<>'') s;
   if slots=oldslots then
    -- Record an explicit system no-op without changing availability timestamps.
    if p_source='system' then
     perform public.calendar_audit_noop(ctx,r->>'operator_id'||':'||(r->>'day_key'));
    end if;
    continue;
   end if;
   insert into public.operator_availability(operator_id,day_key,slots,updated_at) values(r->>'operator_id',r->>'day_key',slots,clock_timestamp())
   on conflict(operator_id,day_key) do update set slots=excluded.slots,updated_at=excluded.updated_at;
  end loop;result:='[]';
 elsif p_operation in ('client','operator') then
  if p_operation='operator' and p_actor_role<>'owner' then raise exception 'Operator changes require direction';end if;
  target:=case p_operation when 'operator' then 'operators' else 'clients' end;
  -- Existing client editor fields are stored unchanged, but only operational fields reach the audit.
  for r in select value from jsonb_array_elements(p_payload->'rows') loop
   if nullif(r->>'id','') is null then raise exception 'Client id required';end if;
   if p_actor_role='pt' then
    select to_jsonb(c) into oldrow from public.clients c where c.id=r->>'id';
    if oldrow->>'pt_assegnato' is distinct from p_actor_id or (r ? 'pt_assegnato' and r->>'pt_assegnato' is distinct from p_actor_id) then raise exception 'Client belongs to another PT';end if;
   end if;
   if p_payload->>'method'='PATCH' then
    execute format('select to_jsonb(t) from public.%I t where id=$1',target) into oldrow using r->>'id';
    if oldrow is null then raise exception 'Entity missing';end if;
   end if;
   select array_agg(key order by key) into fields from jsonb_object_keys(r) key;
   select string_agg(format('%I',f),','),string_agg(format('%I=excluded.%I',f,f),',') filter(where f<>'id') into cols,updates from unnest(fields) f;
   execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(id) do update set %s returning to_jsonb(%I.*)',target,cols,cols,target,updates,target) into result using r;
   results:=results||jsonb_build_array(result);
  end loop;result:=results;
 else raise exception 'Unsupported audit operation';end if;
 perform set_config('neacea.audit_context','',true);
 return result;
end; $$;

create function public.calendar_audit_noop(ctx jsonb,eid text) returns void language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true)<>'service_role' or ctx->>'source'<>'system' or current_setting('neacea.audit_context',true) is distinct from ctx::text then raise exception 'Invalid system context';end if;
 insert into public.calendar_audit_log(actor_name,actor_role,action,entity_type,entity_id,source,request_id,metadata) values('Sistema','system','availability_noop','operator_availability',eid,'system',(ctx->>'request_id')::uuid,'{"automatic":true,"noop":true}');
end; $$;

create function public.calendar_audit_read(p_actor_id text,p_filters jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare allowed boolean; result jsonb;
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Service gateway required';end if;
 select exists(select 1 from public.operator_effective_roles o, lateral jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where o.operator_id=p_actor_id and o.active and lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) into allowed;
 if not allowed then raise exception 'Direction only';end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
  select * from public.calendar_audit_log a where
  (nullif(p_filters->>'from','') is null or a.created_at >= (p_filters->>'from')::timestamptz) and
  (nullif(p_filters->>'to','') is null or a.created_at < (p_filters->>'to')::timestamptz) and
  (nullif(p_filters->>'actor','') is null or a.actor_operator_id=p_filters->>'actor') and
  (nullif(p_filters->>'client','') is null or a.client_ids @> jsonb_build_array(p_filters->>'client')) and
  (nullif(p_filters->>'action','') is null or a.action=p_filters->>'action') and
  (nullif(p_filters->>'source','') is null or a.source=p_filters->>'source') and
  (nullif(p_filters->>'beforeId','') is null or a.id < (p_filters->>'beforeId')::bigint)
  order by a.id desc limit 100
 ) q;return result;
end; $$;
revoke all on function public.calendar_audit_write(text,text,text,uuid,text,jsonb),public.calendar_audit_read(text,jsonb),public.calendar_audit_noop(jsonb,text),public.calendar_audit_capture(),public.calendar_audit_immutable(),public.calendar_audit_fields(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_audit_write(text,text,text,uuid,text,jsonb),public.calendar_audit_read(text,jsonb),public.calendar_audit_noop(jsonb,text) to service_role;
