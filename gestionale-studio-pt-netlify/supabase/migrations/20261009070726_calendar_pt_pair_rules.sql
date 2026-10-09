-- PT pairs: independent package links and attendance, atomic owner renewal.
-- No existing appointment, package balance or financial record is rewritten.
create function public.calendar_pt_session(a jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare raw text; data jsonb;
begin
 raw:=substring(coalesce(a->>'notes','') from '\[NEACEA-PT-SESSION-V1\]([\s\S]*?)\[/NEACEA-PT-SESSION-V1\]');
 if raw is null then return null; end if;
 data:=raw::jsonb;
 if data->>'version' is distinct from '1' or jsonb_typeof(data->'participants') is distinct from 'object' then raise exception 'Metadati seduta PT non validi'; end if;
 return data;
end $$;

create function public.calendar_pt_current_link(c jsonb) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare ledger jsonb; cycle jsonb; persisted text; inferred text;
begin
 ledger:=substring(coalesce(c->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]')::jsonb;
 select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value,n) order by case when coalesce(value->>'closedAt','')='' then 0 else 1 end,n desc limit 1;
 persisted:=coalesce(substring(coalesce(c->>'notes','') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),nullif(c->>'data_conferma',''));
 select max(coalesce(substring(coalesce(x.notes,'') from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),substring(coalesce(x.notes,'') from 'Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})'))) into inferred from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c->>'id') and x.service_id in ('pt11','pt12','circuit');
 return jsonb_build_object('cycleId',coalesce(cycle->>'id',''),'start',coalesce(nullif(cycle->>'startDate',''),persisted,inferred,nullif(c->>'data_inizio',''),nullif(c->>'package_start',''),''));
end $$;
revoke all on function public.calendar_pt_current_link(jsonb) from public,anon,authenticated;
grant execute on function public.calendar_pt_current_link(jsonb) to service_role;

-- Keep the public function OID, ACL and existing dependencies intact.
do $copy$ begin
 execute replace(pg_get_functiondef('public.calendar_uses_current_session(jsonb,jsonb)'::regprocedure),
  'FUNCTION public.calendar_uses_current_session(', 'FUNCTION public.calendar_uses_current_session_pre_pair(');
end $copy$;
revoke all on function public.calendar_uses_current_session_pre_pair(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_uses_current_session_pre_pair(jsonb,jsonb) to service_role;
create or replace function public.calendar_uses_current_session(a jsonb,c jsonb) returns boolean
language plpgsql volatile security invoker set search_path='' as $$
declare data jsonb; participant jsonb; synthetic jsonb;
begin
 data:=public.calendar_pt_session(a);
 if a->>'service_id' is distinct from 'pt12' or data is null then return public.calendar_uses_current_session_pre_pair(a,c); end if;
 participant:=data->'participants'->(c->>'id');
 if a->>'status' not in ('fatto','noshow') or participant->>'status' not in ('fatto','noshow') or participant is null then return false; end if;
 synthetic:=a||jsonb_build_object('status','fatto','notes',
  case when coalesce(participant->>'cycleId','')<>'' then '[CICLO-PACCHETTO-ID '||(participant->>'cycleId')||'] ' else '' end ||
  case when coalesce(participant->>'start','')<>'' then '[CICLO-PACCHETTO '||(participant->>'start')||']' else '' end);
 return public.calendar_uses_current_session_pre_pair(synthetic,c);
end $$;

-- Keep the public function OID, ACL and existing dependencies intact.
do $copy$ begin
 execute replace(pg_get_functiondef('public.calendar_save_appointment(jsonb,jsonb)'::regprocedure),
  'FUNCTION public.calendar_save_appointment(', 'FUNCTION public.calendar_save_appointment_pre_pair(');
end $copy$;
revoke all on function public.calendar_save_appointment_pre_pair(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_save_appointment_pre_pair(jsonb,jsonb) to service_role;
create or replace function public.calendar_save_appointment(p_appointment jsonb,p_expected jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare a jsonb:=p_appointment; oldrow jsonb; data jsonb; previous jsonb; participant jsonb; cid text; c jsonb;
 participants jsonb:='{}'; clean text; state text; aggregate_state text; ctx jsonb;
begin
 lock table public.appointments,public.clients in share row exclusive mode;
 select to_jsonb(x) into oldrow from public.appointments x where x.id=a->>'id';
 ctx:=nullif(current_setting('neacea.audit_context',true),'')::jsonb;
 if oldrow->>'service_id' in ('pt11','pt12') and a->>'service_id' is distinct from oldrow->>'service_id' and ctx->>'role' is distinct from 'owner' then raise exception 'Il tipo PT può essere cambiato solo dalla Direzione'; end if;
 if a->>'service_id'='pt12' and (a->>'status' is null or a->>'status' not in ('prenotato','fatto','noshow','annullato')) then raise exception 'Stato seduta non valido'; end if;
 if a->>'service_id'='pt12' and a->>'status'<>'annullato' then
  if jsonb_array_length(a->'client_ids') is distinct from 2 or (select count(distinct value) from jsonb_array_elements_text(a->'client_ids'))<>2 then raise exception 'PT 1:2 richiede due clienti distinti in una sola seduta'; end if;
  -- Completed legacy sessions keep their old consumption until an explicit correction.
  if oldrow is not null and oldrow->>'status' in ('fatto','noshow') and public.calendar_pt_session(oldrow) is null then
   if a->>'status' is distinct from oldrow->>'status' or public.calendar_pt_session(a) is not null then raise exception 'Seduta storica: richiede correzione della Direzione'; end if;
  else
   data:=public.calendar_pt_session(a); previous:=public.calendar_pt_session(oldrow);
   for cid in select jsonb_array_elements_text(a->'client_ids') loop
    select to_jsonb(x) into c from public.clients x where x.id=cid;
    if c is null or c->>'active'='false' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Partecipante non attivo'; end if;
    if oldrow is not null and previous is null and not public.calendar_uses_current_session_pre_pair(oldrow||jsonb_build_object('status','fatto'),c) then raise exception 'Seduta fuori dal ciclo corrente: verifica il collegamento prima di registrare le presenze'; end if;
    participant:=data->'participants'->cid;
    if participant is null then
     participant:=previous->'participants'->cid;
     if participant is null then
      participant:=public.calendar_pt_current_link(c);
     end if;
     participant:=participant||jsonb_build_object('status',a->>'status');
    end if;
    if not coalesce(previous->'participants' ? cid,false) and (jsonb_build_object('cycleId',coalesce(participant->>'cycleId',''),'start',coalesce(participant->>'start',''))) is distinct from public.calendar_pt_current_link(c) then raise exception 'Il collegamento deve corrispondere al pacchetto corrente'; end if;
    if previous->'participants' ? cid and (participant-'status') is distinct from ((previous->'participants'->cid)-'status') then raise exception 'Il collegamento al pacchetto della seduta non può essere sostituito'; end if;
    state:=participant->>'status';
    if state is null or state not in ('prenotato','fatto','noshow') then raise exception 'Presenza partecipante non valida'; end if;
    if a->>'status'='prenotato' and state<>'prenotato' or a->>'status' in ('fatto','noshow') and state='prenotato' then raise exception 'Completa le presenze di entrambi'; end if;
    participants:=participants||jsonb_build_object(cid,participant);
   end loop;
   select case when bool_and(value->>'status'='prenotato') then 'prenotato' when bool_and(value->>'status'='noshow') then 'noshow' else 'fatto' end into aggregate_state from jsonb_each(participants);
   if a->>'status' is distinct from aggregate_state then raise exception 'Stato seduta non coerente con le presenze'; end if;
   clean:=regexp_replace(coalesce(a->>'notes',''),'\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g');
   a:=a||jsonb_build_object('notes',btrim(clean,E' \r\n\t')||E'\n[NEACEA-PT-SESSION-V1]'||jsonb_build_object('version',1,'rateCents',1500,'participants',participants)::text||'[/NEACEA-PT-SESSION-V1]');
  end if;
 end if;
 -- Never allow a new pair to double-book a trainer or participant, including Flex mode.
 if a->>'service_id'='pt12' and a->>'status'<>'annullato' and (oldrow is null or (a->>'date',a->>'start_time',a->>'duration_min',a->>'operator_id',a->'client_ids') is distinct from (oldrow->>'date',oldrow->>'start_time',oldrow->>'duration_min',oldrow->>'operator_id',oldrow->'client_ids')) then
  if exists(select 1 from public.appointments x where x.id<>a->>'id' and x.status<>'annullato' and x.date=(a->>'date')::date
    and (x.operator_id=a->>'operator_id' or exists(select 1 from jsonb_array_elements_text(a->'client_ids') i where to_jsonb(x.client_ids) @> jsonb_build_array(i.value)))
    and x.start_time < (a->>'start_time')::time + (a->>'duration_min')::int*interval '1 minute'
    and x.start_time + x.duration_min*interval '1 minute' > (a->>'start_time')::time) then raise exception 'PT o cliente già impegnato in questo orario'; end if;
 end if;
 return public.calendar_save_appointment_pre_pair(a,p_expected);
end $$;

create table public.calendar_pt_pair_receipts(request_id uuid primary key,actor_id text not null,payload jsonb not null,result jsonb not null,created_at timestamptz not null default now());
alter table public.calendar_pt_pair_receipts enable row level security;
revoke all on public.calendar_pt_pair_receipts from public,anon,authenticated;
grant select,insert on public.calendar_pt_pair_receipts to service_role;
create function public.calendar_renew_pt_pair(p_actor_id text,p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare actor jsonb; receipt public.calendar_pt_pair_receipts; item jsonb; c jsonb; patch jsonb; ids text[]:='{}'; a jsonb; result jsonb; saved jsonb:='[]'; output_clients jsonb; capacity int; planned int; cycle jsonb; raw text; keys text[];
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 if actor is null or not exists(select 1 from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]')) r where lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) then raise exception 'Rinnovo coppia riservato alla Direzione'; end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients in share row exclusive mode;
 select * into receipt from public.calendar_pt_pair_receipts where request_id=p_request_id;
 if found then
  if receipt.actor_id<>p_actor_id or receipt.payload<>p_payload then raise exception 'Identificativo rinnovo già utilizzato'; end if;
  return receipt.result;
 end if;
 if jsonb_typeof(p_payload->'clients') is distinct from 'array' or jsonb_typeof(p_payload->'appointments') is distinct from 'array' or jsonb_array_length(p_payload->'clients') is distinct from 2 or coalesce(jsonb_array_length(p_payload->'appointments'),0) not between 1 and 100 then raise exception 'Seleziona due clienti e da 1 a 100 sedute'; end if;
 for item in select value from jsonb_array_elements(p_payload->'clients') loop
  select to_jsonb(x) into c from public.clients x where x.id=item->>'id';
  if c is null or c->>'id'=any(ids) or c->>'active'='false' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Partecipanti non validi'; end if;
  if c->>'updated_at' is distinct from item->>'expectedUpdatedAt' then raise exception 'Il pacchetto è cambiato: ricarica e prepara una nuova anteprima'; end if;
  if not coalesce(c->'package_types' @> '["PT 1:2"]'::jsonb,false) then raise exception 'Entrambi i clienti devono avere un pacchetto PT 1:2'; end if;
  ids:=array_append(ids,c->>'id');
  patch:=item->'renewal';
  if patch is not null and patch<>'null'::jsonb then
   if exists(select 1 from public.appointments x where x.status='prenotato' and to_jsonb(x.client_ids) @> jsonb_build_array(c->>'id') and x.service_id in ('pt11','pt12','circuit')) then raise exception 'Prima del rinnovo chiudi o annulla le sedute ancora prenotate del cliente'; end if;
   select array_agg(key) into keys from jsonb_object_keys(patch) key;
   if not keys <@ array['id','notes','package_frequency','giorni_settimana','package_start','data_conferma','sessions_total','sessions_remaining','importo','stato_pagamento','tipo_servizio','updated_at'] or patch->>'id' is distinct from c->>'id' then raise exception 'Campi rinnovo non validi'; end if;
   if (patch->>'sessions_total')::int not between 1 and 100 or patch->>'sessions_total' is distinct from patch->>'sessions_remaining' then raise exception 'Numero sedute rinnovo non valido'; end if;
   raw:=substring(coalesce(patch->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]');
   select value into cycle from jsonb_array_elements(raw::jsonb->'cycles') with ordinality e(value,n) order by n desc limit 1;
   if cycle->>'id' is null or cycle->>'startDate' is distinct from patch->>'data_conferma' or coalesce(cycle->>'closedAt','')<>'' or cycle->>'sessionsTotal' is distinct from patch->>'sessions_total' then raise exception 'Registro rinnovo non coerente'; end if;
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(patch||jsonb_build_object('updated_at',clock_timestamp()))));
  end if;
  select to_jsonb(x) into c from public.clients x where x.id=item->>'id';
  select count(*) into planned from public.appointments x where x.status='prenotato' and to_jsonb(x.client_ids) @> jsonb_build_array(c->>'id') and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),c);
  capacity:=coalesce((c->>'sessions_remaining')::int,0)-planned;
  if jsonb_array_length(p_payload->'appointments')>capacity then raise exception 'Sedute superiori al residuo disponibile di un partecipante'; end if;
 end loop;
 for a in select value from jsonb_array_elements(p_payload->'appointments') loop
  if a->>'service_id' is distinct from 'pt12' or a->>'status' is distinct from 'prenotato' or (a->'client_ids') @> to_jsonb(ids) is not true or jsonb_array_length(a->'client_ids')<>2 or exists(select 1 from public.appointments x where x.id=a->>'id') then raise exception 'Seduta condivisa non valida o già esistente'; end if;
  if (a->>'date')::date<current_date then raise exception 'Le nuove sedute devono partire da oggi o da una data futura'; end if;
  -- New rows must refer to each participant's current package (not caller-controlled cycles).
  a:=a||jsonb_build_object('notes',regexp_replace(coalesce(a->>'notes',''),'\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g'));
  result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',a));
  saved:=saved||jsonb_build_array(result->'appointment');
 end loop;
 select jsonb_agg(to_jsonb(x)) into output_clients from public.clients x where x.id=any(ids);
 result:=jsonb_build_object('appointments',saved,'clients',output_clients,'requestId',p_request_id);
 insert into public.calendar_pt_pair_receipts(request_id,actor_id,payload,result) values(p_request_id,p_actor_id,p_payload,result);
 return result;
end $$;
revoke all on function public.calendar_pt_session(jsonb),public.calendar_uses_current_session(jsonb,jsonb),public.calendar_save_appointment(jsonb,jsonb),public.calendar_renew_pt_pair(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_pt_session(jsonb),public.calendar_uses_current_session(jsonb,jsonb),public.calendar_save_appointment(jsonb,jsonb),public.calendar_renew_pt_pair(text,uuid,jsonb) to service_role;

-- Independent attendance changes are visible in the existing append-only audit.
-- Keep the public function OID, ACL and existing dependencies intact.
do $copy$ begin
 execute replace(pg_get_functiondef('public.calendar_audit_fields(text,jsonb)'::regprocedure),
  'FUNCTION public.calendar_audit_fields(', 'FUNCTION public.calendar_audit_fields_pre_pair(');
end $copy$;
revoke all on function public.calendar_audit_fields_pre_pair(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_audit_fields_pre_pair(text,jsonb) to service_role;
create or replace function public.calendar_audit_fields(kind text,row_data jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare result jsonb; participants jsonb;
begin
 result:=public.calendar_audit_fields_pre_pair(kind,row_data);
 if kind='appointments' then
  select jsonb_object_agg(key,jsonb_build_object('status',value->>'status','cycleId',value->>'cycleId','start',value->>'start')) into participants from jsonb_each(public.calendar_pt_session(row_data)->'participants');
  if participants is not null then result:=result||jsonb_build_object('pt_participants',participants); end if;
 end if;
 return result;
end $$;

revoke all on function public.calendar_audit_fields(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_audit_fields(text,jsonb) to service_role;
