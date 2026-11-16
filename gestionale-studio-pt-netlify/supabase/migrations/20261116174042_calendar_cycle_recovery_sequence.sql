-- Future planning only. Original attendance, dates and financial ledger stay intact.
create table public.calendar_sequence_events(
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default clock_timestamp(),
 actor_id text not null, proposal_id uuid not null references public.calendar_expected_renewals(id),
 before_data jsonb not null, after_data jsonb not null
);
alter table public.calendar_sequence_events enable row level security;
revoke all on public.calendar_sequence_events from public,anon,authenticated;
grant select,insert on public.calendar_sequence_events to service_role;

create function public.calendar_planning_in_current(a jsonb,c jsonb) returns boolean
language sql volatile security invoker set search_path='' as $$
 select public.calendar_uses_current_session(a||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(a->>'notes',''),'"status":\s*"(prenotato|noshow)"','"status":"fatto"','g')),c);
$$;

create function public.calendar_align_renewal(p_actor_id text,p_actor_role text,p_proposal_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.calendar_expected_renewals; before_plan jsonb; actor jsonb; roles text[]; spec jsonb; c jsonb;
 tail date; first_day date; cursor_day date; slot jsonb; a jsonb; oldrow jsonb; data jsonb; participants jsonb;
 clean text; rid uuid:=gen_random_uuid(); shifted int:=0; start_date text; day_now date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
 if actor is null or p_actor_role not in ('owner','pt','secretary') then raise exception 'Operatore non autorizzato';end if;
 if p_actor_role='owner' and not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then raise exception 'Owner role required';end if;
 if p_actor_role='pt' and not coalesce(roles && array['pt','personal_trainer','personal trainer'],false) then raise exception 'PT role required';end if;
 if p_actor_role='secretary' and not coalesce(roles && array['secretary','segreteria'],false) then raise exception 'Secretary role required';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select * into p from public.calendar_expected_renewals where id=p_proposal_id for update;
 if not found or p.state not in ('pending','confirmed') then return jsonb_build_object('shifted',0);end if;
 before_plan:=to_jsonb(p);
 for spec in select value from jsonb_array_elements(p.plan->'clients') loop
  select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
  if c is null or c->>'active' is distinct from 'true' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Cliente non attivo';end if;
  if p_actor_role='pt' and c->>'pt_assegnato' is distinct from p_actor_id then raise exception 'Pacchetto riservato al PT assegnato';end if;
  if public.calendar_pt_current_link(c) is distinct from spec->'source' then raise exception 'Il pacchetto corrente è cambiato';end if;
  select greatest(tail,max(x.date)) into tail from public.appointments x where x.status<>'annullato' and x.date>=day_now and public.calendar_planning_in_current(to_jsonb(x),c);
 end loop;
 if tail is null then return jsonb_build_object('shifted',0);end if;
 -- An exceptional already-used successor must be corrected explicitly; never
 -- silently change a performed appointment or its package attribution here.
 if exists(select 1 from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status in ('fatto','noshow') and x.date<=tail) then raise exception 'Serve una rettifica tracciata dello storico prima di traslare il rinnovo';end if;
 select min(x.date) into first_day from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status='prenotato' and x.date>=day_now;
 if first_day is null or first_day>tail then return jsonb_build_object('shifted',0);end if;
 if jsonb_typeof(p.plan->'slots') is distinct from 'array' or jsonb_array_length(p.plan->'slots')=0 then raise exception 'Completa gli orari del rinnovo';end if;
 cursor_day:=greatest(tail+1,day_now);
 -- If all active rows are future bookings, the actual first new slot is the
 -- new start. Otherwise preserve the historic start and move only future rows.
 start_date:=p.plan->>'startDate';
 if not exists(select 1 from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status<>'annullato' and (x.date<day_now or x.status<>'prenotato')) then
  for step in 0..730 loop
   select value into slot from jsonb_array_elements(p.plan->'slots') where (value->>'day')::int=extract(dow from cursor_day)::int limit 1;
   exit when slot is not null;
   cursor_day:=cursor_day+1;
  end loop;
  if slot is null then raise exception 'Giorni del rinnovo non validi';end if;
  start_date:=cursor_day::text;
  update public.calendar_expected_renewals set plan=jsonb_set(plan,'{startDate}',to_jsonb(start_date)) where id=p.id returning * into p;
 end if;
 perform set_config('neacea.expected_edit',p.id::text,true);
 perform set_config('neacea.aligning','true',true);
 -- The existing writer returns room/PT alerts and keeps trainer substitutions.
 for oldrow in select to_jsonb(x) from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status='prenotato' and x.date>=day_now order by x.date,x.start_time,x.id loop
  for step in 0..730 loop
   select value into slot from jsonb_array_elements(p.plan->'slots') where (value->>'day')::int=extract(dow from cursor_day)::int limit 1;
   exit when slot is not null and not exists(select 1 from public.appointments x where x.status<>'annullato' and x.date=cursor_day and exists(select 1 from jsonb_array_elements_text(p.client_ids) cid where x.client_ids @> jsonb_build_array(cid.value)) and not exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=x.id and m.proposal_id=p.id) and x.start_time<(slot->>'time')::time+(oldrow->>'duration_min')::int*interval '1 minute' and x.start_time+x.duration_min*interval '1 minute'>(slot->>'time')::time);
   cursor_day:=cursor_day+1;
  end loop;
  if slot is null then raise exception 'Impossibile pianificare il rinnovo';end if;
  data:=public.calendar_pt_session(oldrow);participants:='{}';
  for spec in select value from jsonb_array_elements(p.plan->'clients') loop
   participants:=participants||jsonb_build_object(spec->>'id',(data->'participants'->(spec->>'id'))||jsonb_build_object('start',start_date));
  end loop;
  clean:=regexp_replace(coalesce(oldrow->>'notes',''),'\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g');
  a:=oldrow||jsonb_build_object('date',cursor_day,'start_time',(slot->>'time')::time,'notes',clean||E'\n[NEACEA-PT-SESSION-V1]'||(data||jsonb_build_object('participants',participants))::text||'[/NEACEA-PT-SESSION-V1]');
  perform public.calendar_audit_write(p_actor_id,p_actor_role,'calendar',rid,'save',jsonb_build_object('appointment',a,'expected',oldrow));
  shifted:=shifted+1;cursor_day:=cursor_day+1;
 end loop;
 perform set_config('neacea.expected_edit','',true);
 perform set_config('neacea.aligning','',true);
 update public.calendar_expected_renewals set version=version+1,updated_at=clock_timestamp() where id=p.id returning * into p;
 insert into public.calendar_sequence_events(actor_id,proposal_id,before_data,after_data) values(p_actor_id,p.id,before_plan,to_jsonb(p));
 return jsonb_build_object('shifted',shifted,'proposal',to_jsonb(p));
end $$;

create function public.calendar_current_slots(c jsonb,p_day date) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare ledger jsonb; cycle jsonb; schedule jsonb; slots jsonb; day_name text; d int; reference jsonb; t text;
 weekdays text[]:=array['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
begin
 ledger:=substring(coalesce(c->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]')::jsonb;
 select value into cycle from jsonb_array_elements(ledger->'cycles') with ordinality e(value,n) where coalesce(value->>'closedAt','')='' order by n desc limit 1;
 schedule:=substring(coalesce(c->>'notes','') from '\[NEACEA-SCHEDULE-V1\]\s*([\s\S]*?)\s*\[/NEACEA-SCHEDULE-V1\]')::jsonb;
 if schedule->'cycle' is null or schedule->'cycle'=public.calendar_pt_current_link(c) then
  select value->'slots' into slots from jsonb_array_elements(schedule->'patterns') where value->>'from'<=p_day::text order by value->>'from' desc limit 1;
  if slots is not null then return slots;end if;
 end if;
 slots:='[]';
 for day_name in select jsonb_array_elements_text(coalesce(nullif(cycle->'days','[]'),c->'giorni_settimana','[]')) loop
  d:=array_position(weekdays,day_name)-1;if d is null then continue;end if;
  select to_jsonb(x) into reference from public.appointments x where x.status<>'annullato' and public.calendar_planning_in_current(to_jsonb(x),c) and extract(dow from x.date)::int=d and strpos(coalesce(x.notes,''),'[ORARIO-PROVVISORIO]')=0
   order by (select count(*) from public.appointments a where a.status<>'annullato' and public.calendar_planning_in_current(to_jsonb(a),c) and extract(dow from a.date)::int=d and a.start_time=x.start_time) desc,x.date desc,x.id desc limit 1;
  t:=coalesce(nullif(reference->>'start_time',''),nullif(cycle->>'time',''),nullif(c->>'orario_preferito',''));
  if t is not null then slots:=slots||jsonb_build_array(jsonb_build_object('day',d,'time',t,'duration',coalesce((reference->>'duration_min')::int,60)));end if;
 end loop;
 return slots;
end $$;

-- Direction maintenance: flag unknown outcomes, reserve unplanned current
-- credits, then align the successor. No presence, absence or payment inferred.
create function public.calendar_maintain_package(p_actor_id text,p_proposal_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.calendar_expected_renewals; spec jsonb; c jsonb; primary_client jsonb; a jsonb; r jsonb; link jsonb;
 missing int; wanted int; planned int; cursor_day date; slot jsonb; slots jsonb; participants jsonb:='{}'; clean text;
 added int:=0; flagged int:=0; rid uuid:=gen_random_uuid(); result jsonb; day_now date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select * into p from public.calendar_expected_renewals where id=p_proposal_id for update;
 if not found or p.state not in ('pending','confirmed') then return jsonb_build_object('added',0,'flagged',0);end if;
 for spec in select value from jsonb_array_elements(p.plan->'clients') loop
  select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
  if c->>'active' is distinct from 'true' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Cliente non attivo';end if;
  if public.calendar_pt_current_link(c) is distinct from spec->'source' then raise exception 'Il pacchetto corrente è cambiato';end if;
  if primary_client is null then primary_client:=c;end if;
  for a in select to_jsonb(x) from public.appointments x where x.status='prenotato' and x.date<day_now and x.client_ids @> jsonb_build_array(c->>'id') and x.service_id in ('pt11','pt12','circuit') and strpos(coalesce(x.notes,''),'[ESITO-DA-VERIFICARE]')=0 loop
   perform public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',a||jsonb_build_object('notes',coalesce(a->>'notes','')||E'\n[ESITO-DA-VERIFICARE] Esito non registrato: nessuna presenza o assenza attribuita.'),'expected',a));flagged:=flagged+1;
  end loop;
  select count(*)::int into planned from public.appointments x where x.status='prenotato' and x.date>=day_now and public.calendar_planning_in_current(to_jsonb(x),c);
  wanted:=greatest(0,(c->>'sessions_remaining')::int-planned);
  if missing is not null and missing<>wanted then return jsonb_build_object('added',0,'flagged',flagged,'issue','Residui diversi nella coppia: pianifica le sedute individuali prima del rinnovo');end if;
  missing:=wanted;
  participants:=participants||jsonb_build_object(c->>'id',public.calendar_pt_current_link(c)||jsonb_build_object('status','prenotato'));
 end loop;
 if coalesce(missing,0)>0 then
  -- Only registered slots may be used. A missing weekday time is never guessed.
  select greatest(day_now,coalesce(max(x.date)+1,day_now)) into cursor_day from public.appointments x where x.status<>'annullato' and public.calendar_planning_in_current(to_jsonb(x),primary_client);
  for n in 1..missing loop
   for step in 0..730 loop
    slots:=public.calendar_current_slots(primary_client,cursor_day);
    select value into slot from jsonb_array_elements(slots) where (value->>'day')::int=extract(dow from cursor_day)::int limit 1;
    exit when slot is not null and (cursor_day>day_now or (slot->>'time')::time>(clock_timestamp() at time zone 'Europe/Rome')::time);
    cursor_day:=cursor_day+1;
   end loop;
   if slot is null then raise exception 'Orari del pacchetto non determinabili';end if;
   clean:='Pianificazione residuo del pacchetto corrente [RESIDUO-AUTOMATICO]'||E'\n[NEACEA-PT-SESSION-V1]'||jsonb_build_object('version',1,'rateCents',case when p.plan->>'serviceId'='pt12' then 1500 else 1000 end,'participants',participants)::text||'[/NEACEA-PT-SESSION-V1]';
   a:=jsonb_build_object('id','residual_'||replace(gen_random_uuid()::text,'-',''),'service_id',p.plan->>'serviceId','client_ids',p.client_ids,'operator_id',primary_client->>'pt_assegnato','date',cursor_day,'start_time',(slot->>'time')::time,'duration_min',(slot->>'duration')::int,'buffer_min',0,'status','prenotato','notes',clean);
   r:=public.calendar_audit_write(p_actor_id,'owner','calendar',rid,'save',jsonb_build_object('appointment',a));added:=added+1;cursor_day:=cursor_day+1;
  end loop;
 end if;
 result:=public.calendar_align_renewal(p_actor_id,'owner',p.id);
 return result||jsonb_build_object('added',added,'flagged',flagged);
end $$;

-- An automatic cancellation and all resulting successor shifts commit together.
do $$ declare def text; oldtext text:='-- Recompute overlap alerts on retry, even when the original response was lost.'; begin
 def:=pg_get_functiondef('public.calendar_cancel_and_recover(text,text,uuid,jsonb)'::regprocedure);
 if position(oldtext in def)=0 then raise exception 'Recovery definition mismatch';end if;
 def:=replace(def,'where x.status=''prenotato'' and x.client_ids','where x.status=''prenotato'' and x.date >= (clock_timestamp() at time zone ''Europe/Rome'')::date and x.client_ids');
 def:=replace(def,oldtext,$new$
 for proposal in select x.* from public.calendar_expected_renewals x where x.state in ('pending','confirmed') and exists(select 1 from jsonb_array_elements_text(original->'client_ids') cid where x.client_ids @> jsonb_build_array(cid.value)) loop
  perform public.calendar_align_renewal(p_actor_id,p_actor_role,proposal.id);
 end loop;
 -- Recompute overlap alerts on retry, even when the original response was lost.$new$);
 def:=replace(def,'''recovery'',replacement,''clients'',touched,','''recovery'',replacement,''renewal_appointments'',(select coalesce(jsonb_agg(to_jsonb(a)),''[]''::jsonb) from public.appointments a join public.calendar_expected_renewal_appointments m on m.appointment_id=a.id join public.calendar_expected_renewals ep on ep.id=m.proposal_id where ep.state in (''pending'',''confirmed'') and exists(select 1 from jsonb_array_elements_text(original->''client_ids'') cid where ep.client_ids @> jsonb_build_array(cid.value))),''clients'',touched,');
 execute def;
end $$;

-- The same atomic ordering applies when Direction adds or moves a current
-- lesson manually. Recursive writes made by the alignment itself are excluded.
do $$ declare def text; oldtext text:='return public.calendar_save_appointment_pre_expected(a,p_expected);';begin
 def:=pg_get_functiondef('public.calendar_save_appointment(jsonb,jsonb)'::regprocedure);
 if position(oldtext in def)=0 then raise exception 'Appointment wrapper mismatch';end if;
 def:=replace(def,'declare p public.calendar_expected_renewals;','declare ctx jsonb; result jsonb; shifted_rows jsonb; successor public.calendar_expected_renewals; p public.calendar_expected_renewals;');
 def:=replace(def,oldtext,$new$
 result:=public.calendar_save_appointment_pre_expected(a,p_expected);
 ctx:=nullif(current_setting('neacea.audit_context',true),'')::jsonb;
 if coalesce(current_setting('neacea.aligning',true),'')<>'true' and ctx->>'id' is not null and a->>'status'='prenotato' and (a->>'date')::date >= (clock_timestamp() at time zone 'Europe/Rome')::date and a->>'service_id' in ('pt11','pt12','circuit') and not exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=a->>'id') then
  for successor in select x.* from public.calendar_expected_renewals x where x.state in ('pending','confirmed') and exists(select 1 from jsonb_array_elements_text(a->'client_ids') cid where x.client_ids @> jsonb_build_array(cid.value)) loop
   perform public.calendar_align_renewal(ctx->>'id',ctx->>'role',successor.id);
  end loop;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into shifted_rows from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id join public.calendar_expected_renewals ep on ep.id=m.proposal_id where ep.state in ('pending','confirmed') and exists(select 1 from jsonb_array_elements_text(a->'client_ids') cid where ep.client_ids @> jsonb_build_array(cid.value));
  result:=result||jsonb_build_object('renewal_appointments',shifted_rows);
 end if;
 return result;$new$);execute def;
end $$;

-- Past reservations remain unresolved history. They must not block an already
-- exhausted package indefinitely. Their status and counters are left unchanged.
do $$ declare def text; oldtext text:='where a.status=''prenotato'' and a.client_ids';begin
 def:=pg_get_functiondef('public.calendar_expected_renewal(text,text,jsonb)'::regprocedure);
 if position(oldtext in def)=0 then raise exception 'Activation definition mismatch';end if;
 def:=replace(def,oldtext,'where a.status=''prenotato'' and a.date >= (clock_timestamp() at time zone ''Europe/Rome'')::date and a.client_ids');execute def;
end $$;

do $$ declare def text; oldtext text:='p_action in (''edit'',''confirm'',''decline'') and p.state<>''pending''';begin
 def:=pg_get_functiondef('public.calendar_expected_renewal(text,text,jsonb)'::regprocedure);
 if position(oldtext in def)=0 then raise exception 'Decline guard mismatch';end if;
 def:=replace(def,oldtext,oldtext||' and not (p_action=''decline'' and p.state=''confirmed'')');execute def;
end $$;

-- Some live installations still have the original guard. Normalize only the
-- verified empty-confirmed case needed by calendar_restore_empty_renewal.
do $$ declare def text; guard text; replacement text;begin
 def:=pg_get_functiondef('public.calendar_expected_renewal(text,text,jsonb)'::regprocedure);
 if position('if p_action=''edit'' and p.state=''confirmed'' then' in def)=0 then
  guard:=$g$if p_action in ('edit','confirm','decline') and p.state<>'pending' and not (p_action='decline' and p.state='confirmed') or p_action='activate' and p.state<>'confirmed' then raise exception 'Stato proposta non compatibile'; end if;$g$;
  replacement:=$g$if p_action='edit' and p.state='confirmed' then
   if exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then raise exception 'Stato proposta non compatibile: il rinnovo ha lezioni attive';end if;
  elsif p_action in ('edit','confirm','decline') and p.state<>'pending' and not (p_action='decline' and p.state='confirmed') or p_action='activate' and p.state<>'confirmed' then raise exception 'Stato proposta non compatibile';end if;$g$;
  if position(guard in def)=0 then raise exception 'Original confirmed guard mismatch';end if;
  def:=replace(def,guard,replacement);
  def:=replace(def,'set plan=p_payload->''plan'' where id=p.id returning * into p','set plan=p_payload->''plan'',state=''pending'' where id=p.id returning * into p');
  execute def;
 end if;
 if position('Riprogramma il rinnovo: tutte le prenotazioni sono state annullate' in def)=0 then
  guard:=$g$elsif p_action='activate' then
  perform set_config('neacea.expected_activate',p.id::text,true);$g$;
  replacement:=$g$elsif p_action='activate' then
  if not exists(select 1 from public.calendar_expected_renewal_appointments m join public.appointments a on a.id=m.appointment_id where m.proposal_id=p.id and a.status<>'annullato') then raise exception 'Riprogramma il rinnovo: tutte le prenotazioni sono state annullate';end if;
  perform set_config('neacea.expected_activate',p.id::text,true);$g$;
  if position(guard in def)=0 then raise exception 'Original activation guard mismatch';end if;
  def:=replace(def,guard,replacement);execute def;
 end if;
end $$;

revoke all on function public.calendar_planning_in_current(jsonb,jsonb),public.calendar_current_slots(jsonb,date),public.calendar_align_renewal(text,text,uuid),public.calendar_maintain_package(text,uuid) from public,anon,authenticated;
grant execute on function public.calendar_planning_in_current(jsonb,jsonb),public.calendar_current_slots(jsonb,date),public.calendar_align_renewal(text,text,uuid),public.calendar_maintain_package(text,uuid) to service_role;

-- Non rinnova stops the successor, not delivery of already owed lessons.
do $$ declare def text; oldtext text:='for a in select to_jsonb(x) from public.appointments x where x.client_ids';begin
 if to_regprocedure('public.calendar_client_lifecycle(text,uuid,jsonb)') is null then return;end if;
 def:=pg_get_functiondef('public.calendar_client_lifecycle(text,uuid,jsonb)'::regprocedure);
 if position(oldtext in def)=0 then raise exception 'Lifecycle definition mismatch';end if;
 def:=replace(def,'declare c jsonb;','declare proposal public.calendar_expected_renewals; keep_current boolean; c jsonb;');
 def:=replace(def,'if action=''archive'' and c->>''active''=''false'' and c->>''stato_abbonamento''=status or','if action=''archive'' and c->>''stato_abbonamento''=status and (c->>''active''=''false'' or status=''Non rinnova'') or');
 def:=replace(def,oldtext,$new$
 if status='Non rinnova' then
  for proposal in select p.* from public.calendar_expected_renewals p where p.state in ('pending','confirmed') and p.client_ids @> jsonb_build_array(target) loop
   perform public.calendar_expected_renewal(p_actor_id,'decline',jsonb_build_object('id',proposal.id,'version',proposal.version));
  end loop;
  keep_current:=coalesce((c->>'sessions_remaining')::int,0)>0 or exists(select 1 from public.appointments x where x.status='prenotato' and x.date>=today and public.calendar_planning_in_current(to_jsonb(x),c));
  result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(jsonb_build_object('id',target,'active',keep_current,'stato_abbonamento',status,'updated_at',clock_timestamp()))));
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into touched from public.appointments x where x.client_ids @> jsonb_build_array(target);
  return jsonb_build_object('client',result->0,'appointments',touched);
 end if;
 for a in select to_jsonb(x) from public.appointments x where x.client_ids$new$);execute def;
end $$;

-- Exceptional, explicitly reviewed correction of an already performed lesson.
-- The private definer is necessary only to remove the erroneous proposal map:
-- ordinary service-role table access deliberately cannot delete such links.
create schema if not exists calendar_private;
revoke all on schema calendar_private from public,anon,authenticated;
grant usage on schema calendar_private to service_role;
create function calendar_private.repair_crossed_renewal(p_actor_id text,p_proposal_id uuid,p_request_id uuid,p_expected jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.calendar_expected_renewals; c jsonb; done_row jsonb; future_row jsonb; a jsonb; spec jsonb; link jsonb;
 before_data jsonb; data jsonb; clean text; first_date date; receipt public.calendar_sequence_events; result jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select * into receipt from public.calendar_sequence_events where id=p_request_id;
 if found then
  if receipt.actor_id<>p_actor_id or receipt.proposal_id<>p_proposal_id or receipt.before_data->'request' is distinct from p_expected then raise exception 'Identificativo rettifica già utilizzato';end if;
  return receipt.after_data;
 end if;
 select * into p from public.calendar_expected_renewals where id=p_proposal_id for update;
 if not found or p.state<>'confirmed' or p.plan->>'serviceId'<>'pt11' or jsonb_array_length(p.client_ids)<>1 then raise exception 'Rettifica disponibile soltanto per un rinnovo individuale confermato';end if;
 spec:=p.plan->'clients'->0;
 select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
 select to_jsonb(x) into done_row from public.appointments x where x.id=p_expected->>'performedId';
 select to_jsonb(x) into future_row from public.appointments x where x.id=p_expected->>'futureId';
 if p.version is distinct from (p_expected->>'proposalVersion')::int or c->>'updated_at' is distinct from p_expected->>'clientUpdatedAt' or done_row->>'updated_at' is distinct from p_expected->>'performedUpdatedAt' or future_row->>'updated_at' is distinct from p_expected->>'futureUpdatedAt' then raise exception 'Dati cambiati: prepara una nuova rettifica';end if;
 if c->>'active' is distinct from 'true' or (c->>'sessions_remaining')::int<>1 or spec->'source' is distinct from public.calendar_pt_current_link(c) then raise exception 'Verifica il credito del pacchetto precedente';end if;
 if done_row->>'status' is distinct from 'fatto' or done_row->'client_ids' is distinct from p.client_ids or future_row->'client_ids' is distinct from p.client_ids or future_row->>'status' is distinct from 'prenotato' or future_row->>'service_id' is distinct from 'pt11' or (done_row->>'date')::date >= (clock_timestamp() at time zone 'Europe/Rome')::date or (future_row->>'date')::date < (clock_timestamp() at time zone 'Europe/Rome')::date then raise exception 'La rettifica conserva una presenza reale e una prenotazione futura';end if;
 if not exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=done_row->>'id' and m.proposal_id=p.id) or not public.calendar_planning_in_current(future_row,c) or exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=future_row->>'id') then raise exception 'Collegamenti della rettifica non coerenti';end if;
 if (select count(*) from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status in ('fatto','noshow'))<>1 or (select count(*) from public.appointments x where x.status='prenotato' and public.calendar_planning_in_current(to_jsonb(x),c))<>1 or (select count(*) from public.appointments x where public.calendar_uses_current_session(to_jsonb(x),c))<>(c->>'sessions_total')::int-1 then raise exception 'Il caso richiede una revisione specifica delle presenze';end if;
 before_data:=jsonb_build_object('request',p_expected,'client',c,'performed',done_row,'future',future_row,'proposal',to_jsonb(p));
 -- Move only package attribution: the actual performed lesson keeps its ID,
 -- date, trainer, status, audit text and accrued trainer fee.
 delete from public.calendar_expected_renewal_appointments where appointment_id=done_row->>'id' and proposal_id=p.id;
 data:=public.calendar_pt_session(done_row);
 data:=jsonb_set(data,array['participants',c->>'id'],(data->'participants'->(c->>'id'))||public.calendar_pt_current_link(c));
 clean:=regexp_replace(regexp_replace(coalesce(done_row->>'notes',''),'\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g'),'\[RINNOVO-(PREVISTO|CONFERMATO) [^\]]+\]|Rinnovo previsto — da confermare|Rinnovo confermato — in attesa di decorrenza','','g');
 a:=done_row||jsonb_build_object('notes',clean||E'\n[RETTIFICA-CICLO '||p_request_id||'] Presenza già registrata attribuita al credito del pacchetto precedente.'||E'\n[NEACEA-PT-SESSION-V1]'||data::text||'[/NEACEA-PT-SESSION-V1]');
 perform public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',a,'expected',done_row));
 insert into public.calendar_expected_renewal_appointments values(future_row->>'id',p.id);
 select min(x.date) into first_date from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status<>'annullato';
 update public.calendar_expected_renewals set plan=jsonb_set(plan,'{startDate}',to_jsonb(first_date::text)),version=version+1,updated_at=clock_timestamp() where id=p.id returning * into p;
 perform set_config('neacea.expected_edit',p.id::text,true);
 for a in select to_jsonb(x) from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status='prenotato' loop
  data:=jsonb_build_object('version',1,'rateCents',1000,'participants',jsonb_build_object(c->>'id',jsonb_build_object('cycleId',spec->>'cycleId','start',first_date::text,'status','prenotato')));
  clean:=regexp_replace(coalesce(a->>'notes',''),'\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g');
  clean:=clean||E'\n[RETTIFICA-CICLO '||p_request_id||'] Collegamento rinnovo riallineato, data e stato conservati.'||E'\n[RINNOVO-PREVISTO '||p.id||']\n[NEACEA-PT-SESSION-V1]'||data::text||'[/NEACEA-PT-SESSION-V1]';
  perform public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',a||jsonb_build_object('notes',clean),'expected',a));
 end loop;
 perform set_config('neacea.expected_edit','',true);
 select to_jsonb(x) into c from public.clients x where x.id=c->>'id';
 if (c->>'sessions_remaining')::int<>0 or (select count(*) from public.appointments x join public.calendar_expected_renewal_appointments m on m.appointment_id=x.id where m.proposal_id=p.id and x.status<>'annullato')<>(spec->>'sessions')::int then raise exception 'Rettifica incompleta: annullamento della transazione';end if;
 result:=jsonb_build_object('client',c,'proposal',to_jsonb(p),'performedId',done_row->>'id','futureId',future_row->>'id','reason','Presenza reale attribuita al pacchetto precedente; prenotazione futura trasferita al rinnovo. Nessuna presenza o pagamento creati.');
 insert into public.calendar_sequence_events(id,actor_id,proposal_id,before_data,after_data) values(p_request_id,p_actor_id,p.id,before_data,result);
 return result;
end $$;
revoke all on function calendar_private.repair_crossed_renewal(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function calendar_private.repair_crossed_renewal(text,uuid,uuid,jsonb) to service_role;
create function public.calendar_repair_crossed_renewal(p_actor_id text,p_proposal_id uuid,p_request_id uuid,p_expected jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select calendar_private.repair_crossed_renewal(p_actor_id,p_proposal_id,p_request_id,p_expected);
$$;
revoke all on function public.calendar_repair_crossed_renewal(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_repair_crossed_renewal(text,uuid,uuid,jsonb) to service_role;
