-- One reviewed successor per source package. Reservations do not create receivables.
create table public.calendar_expected_renewals(
 id uuid primary key, state text not null default 'pending' check(state in ('pending','confirmed','declined','activated')),
 version integer not null default 1, client_ids jsonb not null, plan jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.calendar_expected_renewal_clients(
 proposal_id uuid references public.calendar_expected_renewals(id),client_id text references public.clients(id),source_key text not null,
 primary key(proposal_id,client_id),unique(client_id,source_key)
);
create table public.calendar_expected_renewal_appointments(
 appointment_id text primary key,proposal_id uuid not null references public.calendar_expected_renewals(id)
);
alter table public.calendar_expected_renewals enable row level security;
alter table public.calendar_expected_renewal_clients enable row level security;
alter table public.calendar_expected_renewal_appointments enable row level security;
revoke all on public.calendar_expected_renewals,public.calendar_expected_renewal_clients,public.calendar_expected_renewal_appointments from public,anon,authenticated;
grant select,insert,update on public.calendar_expected_renewals to service_role;
grant select,insert on public.calendar_expected_renewal_clients,public.calendar_expected_renewal_appointments to service_role;

-- Registered future links remain separate from the client's current package.
create function public.calendar_expected_link(a jsonb,c jsonb,link jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.calendar_expected_renewal_appointments m join public.calendar_expected_renewals p on p.id=m.proposal_id,
 jsonb_array_elements(p.plan->'clients') spec where m.appointment_id=a->>'id' and spec->>'id'=c->>'id'
 and spec->>'cycleId'=link->>'cycleId' and p.plan->>'startDate'=link->>'start'
 and p.state in ('pending','confirmed','activated') and a->'client_ids'=p.client_ids and a->>'service_id'=p.plan->>'serviceId');
$$;
-- Extend the pair validator without bypassing its attendance, partner and conflict rules.
do $$ declare def text; begin
 def:=pg_get_functiondef('public.calendar_save_appointment_pre_review(jsonb,jsonb)'::regprocedure);
 if position('Il collegamento deve corrispondere al pacchetto corrente' in def)=0 then raise exception 'Pair validator version mismatch'; end if;
 def:=replace(def,'is distinct from public.calendar_pt_current_link(c) then raise exception',
 'is distinct from public.calendar_pt_current_link(c) and not public.calendar_expected_link(a,c,participant) then raise exception');
 def:=replace(def,$old$(participant-'status') is distinct from ((previous->'participants'->cid)-'status') then$old$,$new$(participant-'status') is distinct from ((previous->'participants'->cid)-'status') and not (coalesce(current_setting('neacea.expected_edit',true),'')=coalesce((select m.proposal_id::text from public.calendar_expected_renewal_appointments m where m.appointment_id=a->>'id'),'missing') and oldrow->>'status' in ('prenotato','annullato') and public.calendar_expected_link(a,c,participant)) then$new$);
 execute def;
end $$;
-- Do not infer the current legacy cycle from future renewal reservations.
do $$ declare def text; begin
 def:=pg_get_functiondef('public.calendar_pt_current_link(jsonb)'::regprocedure);
 def:=replace(def,'where to_jsonb(x.client_ids)', 'where not exists(select 1 from public.calendar_expected_renewal_appointments m join public.calendar_expected_renewals p on p.id=m.proposal_id where m.appointment_id=x.id and p.state<>''activated'') and to_jsonb(x.client_ids)');
 execute def;
end $$;
do $$ begin
 execute replace(pg_get_functiondef('public.calendar_uses_current_session(jsonb,jsonb)'::regprocedure),'FUNCTION public.calendar_uses_current_session(', 'FUNCTION public.calendar_uses_current_session_pre_expected(');
 execute replace(pg_get_functiondef('public.calendar_save_appointment(jsonb,jsonb)'::regprocedure),'FUNCTION public.calendar_save_appointment(', 'FUNCTION public.calendar_save_appointment_pre_expected(');
end $$;
create or replace function public.calendar_uses_current_session(a jsonb,c jsonb) returns boolean
language plpgsql volatile security invoker set search_path='' as $$
declare link jsonb; synthetic jsonb;
begin
 if exists(select 1 from public.calendar_expected_renewal_appointments m join public.calendar_expected_renewals p on p.id=m.proposal_id where m.appointment_id=a->>'id' and p.state<>'activated') then return false; end if;
 -- Individual future lessons also carry an explicit cycle, like paired ones.
 link:=public.calendar_pt_session(a)->'participants'->(c->>'id');
 if a->>'service_id'='pt11' and link is not null then
  synthetic:=a||jsonb_build_object('notes','[CICLO-PACCHETTO-ID '||(link->>'cycleId')||'] [CICLO-PACCHETTO '||(link->>'start')||']');
  return public.calendar_uses_current_session_pre_expected(synthetic,c);
 end if;
 return public.calendar_uses_current_session_pre_expected(a,c);
end $$;
create or replace function public.calendar_save_appointment(p_appointment jsonb,p_expected jsonb default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p public.calendar_expected_renewals; a jsonb:=p_appointment; oldrow jsonb; cid text; c jsonb; link jsonb;
begin
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select x.* into p from public.calendar_expected_renewal_appointments m join public.calendar_expected_renewals x on x.id=m.proposal_id where m.appointment_id=a->>'id';
 if found then
  select to_jsonb(x) into oldrow from public.appointments x where x.id=a->>'id';
  if a->'client_ids' is distinct from p.client_ids or a->>'service_id' is distinct from p.plan->>'serviceId' then raise exception 'Modifica i partecipanti tramite la proposta di rinnovo'; end if;
  if p.state='declined' and a->>'status'='prenotato' then raise exception 'Proposta annullata'; end if;
  for cid in select jsonb_array_elements_text(p.client_ids) loop
   select to_jsonb(x) into c from public.clients x where x.id=cid;
   link:=public.calendar_pt_session(a)->'participants'->cid;
   if not public.calendar_expected_link(a,c,link) and a->>'status'<>'annullato' and p.state<>'declined' then raise exception 'Collegamento proposta non valido'; end if;
  end loop;
  if p.state in ('pending','confirmed') then
   a:=a||jsonb_build_object('notes',regexp_replace(coalesce(a->>'notes',''),'\[RINNOVO-(PREVISTO|CONFERMATO) [^\]]+\]|Rinnovo previsto — da confermare|Rinnovo confermato — in attesa di decorrenza','','g')||E'\n[RINNOVO-PREVISTO '||p.id||']'||case when p.state='pending' then E'\nRinnovo previsto — da confermare' else E'\n[RINNOVO-CONFERMATO '||p.id||']\nRinnovo confermato — in attesa di decorrenza' end);
  end if;
 elsif coalesce(a->>'notes','') like '%[RINNOVO-PREVISTO %' then raise exception 'Proposta non registrata';
 end if;
 return public.calendar_save_appointment_pre_expected(a,p_expected);
end $$;

create function public.calendar_expected_renewal(p_actor_id text,p_action text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare p public.calendar_expected_renewals; plan jsonb; spec jsonb; c jsonb; a jsonb; oldrow jsonb; item jsonb; patch jsonb; rid uuid:=gen_random_uuid(); ids jsonb; expected_link jsonb; output jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 perform public.calendar_audit_read(p_actor_id,'{}'); -- checks the current Direction role
 if p_action not in ('create','edit','confirm','decline','activate') then raise exception 'Azione non valida'; end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 if p_action='create' then
  plan:=p_payload->'plan';
  select jsonb_agg(value->>'id' order by n) into ids from jsonb_array_elements(plan->'clients') with ordinality e(value,n);
  if jsonb_array_length(ids) not between 1 and 2 or plan->>'serviceId' is distinct from (case when jsonb_array_length(ids)=2 then 'pt12' else 'pt11' end) then raise exception 'Partecipanti non validi'; end if;
  for spec in select value from jsonb_array_elements(plan->'clients') loop
   select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
   if c is null or c->>'active'='false' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Cliente non attivo'; end if;
   if not exists(select 1 from jsonb_array_elements(p_payload->'clients') x where x->>'id'=c->>'id' and x->>'expectedUpdatedAt'=c->>'updated_at') then raise exception 'Pacchetto cambiato: ricarica'; end if;
   if spec->'source' is distinct from public.calendar_pt_current_link(c) then raise exception 'Ciclo sorgente cambiato'; end if;
   if exists(select 1 from public.calendar_expected_renewals x where x.state in ('pending','confirmed') and x.client_ids @> jsonb_build_array(c->>'id')) then raise exception 'Esiste già una proposta aperta'; end if;
  end loop;
  insert into public.calendar_expected_renewals(id,client_ids,plan) values((p_payload->>'id')::uuid,ids,plan) returning * into p;
  for spec in select value from jsonb_array_elements(plan->'clients') loop
   insert into public.calendar_expected_renewal_clients values(p.id,spec->>'id',coalesce(spec->'source'->>'cycleId','')||'|'||coalesce(spec->'source'->>'start',''));
  end loop;
 else
  select * into p from public.calendar_expected_renewals where id=(p_payload->>'id')::uuid for update;
  if not found then raise exception 'Proposta non trovata'; end if;
  if p_action='confirm' and p.state in ('confirmed','activated') or p_action='decline' and p.state='declined' or p_action='activate' and p.state='activated' then return to_jsonb(p); end if;
  if p.version is distinct from (p_payload->>'version')::int then raise exception 'Proposta cambiata: ricarica'; end if;
  if p_action in ('edit','confirm','decline') and p.state<>'pending' or p_action='activate' and p.state<>'confirmed' then raise exception 'Stato proposta non compatibile'; end if;
  for spec in select value from jsonb_array_elements(p.plan->'clients') loop
   select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
   if p_action<>'decline' and (c->>'active'='false' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%') then raise exception 'Cliente non attivo'; end if;
   if spec->'source' is distinct from public.calendar_pt_current_link(c) then raise exception 'Il pacchetto corrente è cambiato: verifica la proposta'; end if;
  end loop;
 end if;
 if p_action in ('create','edit') then
  plan:=p_payload->'plan';
  if p_action='edit' then
   if plan->>'serviceId' is distinct from p.plan->>'serviceId' or (select jsonb_agg(value-'sessions'-'amount') from jsonb_array_elements(plan->'clients')) is distinct from (select jsonb_agg(value-'sessions'-'amount') from jsonb_array_elements(p.plan->'clients')) then raise exception 'Identità del rinnovo non modificabile'; end if;
   if plan->>'startDate' is distinct from p.plan->>'startDate' and exists(select 1 from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id and a.status in ('fatto','noshow')) then raise exception 'Decorrenza bloccata dopo la prima presenza'; end if;
   update public.calendar_expected_renewals set plan=p_payload->'plan' where id=p.id returning * into p;
  end if;
  if jsonb_typeof(p_payload->'appointments') is distinct from 'array' or jsonb_array_length(p_payload->'appointments')>100 then raise exception 'Lezioni non valide'; end if;
  for spec in select value from jsonb_array_elements(plan->'clients') loop
   if (spec->>'sessions')::int not between 1 and 100 or (spec->>'amount')::numeric<0 then raise exception 'Sedute o importo non validi'; end if;
   if coalesce(plan->>'issue','')='' and jsonb_array_length(p_payload->'appointments')<>(spec->>'sessions')::int then raise exception 'Numero appuntamenti diverso dal pacchetto'; end if;
  end loop;
  perform set_config('neacea.expected_edit',p.id::text,true);
  for oldrow in select to_jsonb(a) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id loop
   if not exists(select 1 from jsonb_array_elements(p_payload->'appointments') a where a->>'id'=oldrow->>'id') and oldrow->>'status'<>'annullato' then
    if oldrow->>'status'<>'prenotato' then raise exception 'Lezioni svolte da conservare'; end if;
    perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',oldrow||'{"status":"annullato"}'::jsonb,'expected',oldrow));
   end if;
  end loop;
  for oldrow in select to_jsonb(a) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id and a.status='prenotato' loop
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',oldrow||'{"status":"annullato"}'::jsonb,'expected',oldrow));
  end loop;
  for a in select value from jsonb_array_elements(p_payload->'appointments') loop
   select to_jsonb(x) into oldrow from public.appointments x where x.id=a->>'id';
   if oldrow is not null and not exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=a->>'id' and m.proposal_id=p.id) then raise exception 'Appuntamento estraneo alla proposta'; end if;
   if oldrow->>'status' in ('fatto','noshow') then
    if a is distinct from oldrow then raise exception 'Lezioni svolte non modificabili dalla proposta'; end if;
    continue;
   end if;
   if a->>'status' is distinct from 'prenotato' or (a->>'date')::date<(now() at time zone 'Europe/Rome')::date then raise exception 'La proposta genera soltanto prenotazioni future'; end if;
   insert into public.calendar_expected_renewal_appointments values(a->>'id',p.id) on conflict do nothing;
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_strip_nulls(jsonb_build_object('appointment',a,'expected',oldrow)));
  end loop;
  perform set_config('neacea.expected_edit','',true);
 elsif p_action='confirm' then
  if coalesce(p.plan->>'issue','')<>'' or not exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then raise exception 'Completa prima la programmazione della proposta'; end if;
  if exists(select 1 from jsonb_array_elements(p.plan->'clients') spec where (spec->>'sessions')::int<>(select count(*) from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato')) then raise exception 'Lezioni modificate in calendario: aggiorna prima la proposta'; end if;
  update public.calendar_expected_renewals set state='confirmed' where id=p.id;
  for oldrow in select to_jsonb(a) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id and a.status<>'annullato' loop
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',oldrow,'expected',oldrow));
  end loop;
 elsif p_action='decline' then
  for oldrow in select to_jsonb(a) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id and a.status='prenotato' and a.date>=(now() at time zone 'Europe/Rome')::date loop
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',oldrow||'{"status":"annullato"}'::jsonb,'expected',oldrow));
  end loop;
  update public.calendar_expected_renewals set state='declined' where id=p.id;
 elsif p_action='activate' then
  perform set_config('neacea.expected_activate',p.id::text,true);
  for spec in select value from jsonb_array_elements(p.plan->'clients') loop
   select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
   if (c->>'sessions_remaining')::int<>0 or exists(select 1 from public.appointments a where a.status='prenotato' and a.client_ids @> jsonb_build_array(c->>'id') and not exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=a.id) and public.calendar_uses_current_session(to_jsonb(a)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(a.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),c)) then raise exception 'Chiudi prima le lezioni del pacchetto precedente'; end if;
   select value into item from jsonb_array_elements(p_payload->'clients') where value->>'id'=c->>'id';patch:=item->'patch';
   if item->>'expectedUpdatedAt' is distinct from c->>'updated_at' then raise exception 'Pacchetto cambiato: ricarica'; end if;
   if exists(select 1 from jsonb_object_keys(patch) k where k<>all(array['id','notes','sessions_total','sessions_remaining','package_start','data_conferma','package_frequency','giorni_settimana','importo','stato_pagamento'])) or patch->>'id' is distinct from c->>'id' or patch->>'sessions_total' is distinct from spec->>'sessions' or patch->>'stato_pagamento' is distinct from 'Da pagare' or (patch->>'importo')::numeric<>(spec->>'amount')::numeric then raise exception 'Rinnovo non coerente'; end if;
   if public.calendar_pt_current_link(c||patch) is distinct from jsonb_build_object('cycleId',spec->>'cycleId','start',p.plan->>'startDate') then raise exception 'Registro rinnovo non coerente'; end if;
   if (patch->>'sessions_remaining')::int is distinct from greatest(0,(spec->>'sessions')::int-(select count(*)::int from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id and (a.status='fatto' or a.service_id='pt12' and a.status='noshow'))) then raise exception 'Residuo rinnovo non coerente con le presenze'; end if;
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(patch||jsonb_build_object('updated_at',clock_timestamp()))));
  end loop;
  update public.calendar_expected_renewals set state='activated' where id=p.id;
  for oldrow in select to_jsonb(a) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=p.id loop
   -- Remove only presentation markers. Identity, attendance and explicit cycle stay intact.
   a:=oldrow||jsonb_build_object('notes',regexp_replace(coalesce(oldrow->>'notes',''),'\[RINNOVO-(PREVISTO|CONFERMATO) [^\]]+\]|Rinnovo previsto — da confermare|Rinnovo confermato — in attesa di decorrenza','','g'));
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',a,'expected',oldrow));
  end loop;
 end if;
 perform set_config('neacea.expected_activate','',true);
 perform public.calendar_expected_audit(p_actor_id,p_action,p.id,rid);
 update public.calendar_expected_renewals set version=version+1,updated_at=clock_timestamp() where id=p.id returning to_jsonb(calendar_expected_renewals) into output;
 return output;
end $$;
revoke all on function public.calendar_expected_link(jsonb,jsonb,jsonb),public.calendar_expected_renewal(text,text,jsonb),public.calendar_uses_current_session_pre_expected(jsonb,jsonb),public.calendar_save_appointment_pre_expected(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_expected_link(jsonb,jsonb,jsonb),public.calendar_expected_renewal(text,text,jsonb),public.calendar_uses_current_session_pre_expected(jsonb,jsonb),public.calendar_save_appointment_pre_expected(jsonb,jsonb) to service_role;

-- A concurrent manual renewal must not create a second successor behind the proposal.
create function public.calendar_expected_client_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
declare p public.calendar_expected_renewals;
begin
 if public.calendar_pt_current_link(to_jsonb(new)) is distinct from public.calendar_pt_current_link(to_jsonb(old)) then
  select x.* into p from public.calendar_expected_renewals x where x.client_ids @> jsonb_build_array(new.id) and x.state in ('pending','confirmed') limit 1;
  if found and coalesce(current_setting('neacea.expected_activate',true),'')<>p.id::text then raise exception 'Esiste un rinnovo previsto: usa Conferma rinnovo nella sezione Rinnovi previsti'; end if;
 end if;
 return new;
end $$;
create trigger calendar_expected_client_guard before update on public.clients for each row execute function public.calendar_expected_client_guard();
revoke all on function public.calendar_expected_client_guard() from public,anon,authenticated;
grant execute on function public.calendar_expected_client_guard() to service_role;
create index calendar_expected_renewal_appointments_proposal on public.calendar_expected_renewal_appointments(proposal_id);

-- Append-only audit remains inaccessible to the ordinary service-role table API.
create function public.calendar_expected_audit(actor_id text,operation text,proposal_id uuid,request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 perform public.calendar_audit_read(actor_id,'{}');
 if operation not in ('create','edit','confirm','decline','activate') then raise exception 'Azione non valida'; end if;
 insert into public.calendar_audit_log(actor_operator_id,actor_name,actor_email,actor_role,action,entity_type,entity_id,client_ids,before_data,after_data,source,request_id,metadata)
 select o.operator_id,concat_ws(' ',o.nome,o.cognome),o.email,'owner','expected_renewal_'||operation,'calendar_expected_renewals',p.id::text,p.client_ids,null,to_jsonb(p),'calendar',request_id,jsonb_build_object('automatic',operation in ('create','activate')) from public.operator_effective_roles o,public.calendar_expected_renewals p where o.operator_id=actor_id and p.id=proposal_id;
end $$;
revoke all on function public.calendar_expected_audit(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.calendar_expected_audit(text,text,uuid,uuid) to service_role;
