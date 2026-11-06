-- Overlaps are planning alerts, as requested by the owner. Authorization,
-- optimistic locking, cycle validation, counters and audit remain unchanged.
do $$ declare def text; target regprocedure; begin
 target:='public.calendar_save_appointment_pre_pair(jsonb,jsonb)'::regprocedure;
 def:=pg_get_functiondef(target);
 if position('if flex then' || chr(10) || '      if conflicts.operator_conflict' in def)=0 then raise exception 'Unexpected overlap validator'; end if;
 def:=replace(def,'if flex then' || chr(10) || '      if conflicts.operator_conflict','if true then' || chr(10) || '      if conflicts.operator_conflict');
 execute def;
 target:='public.calendar_save_appointment_pre_review(jsonb,jsonb)'::regprocedure;
 def:=pg_get_functiondef(target);
 if position('then raise exception ''PT o cliente già impegnato in questo orario''; end if;' in def)=0 then raise exception 'Unexpected pair validator'; end if;
 -- The underlying writer already returns operator/client/room warnings.
 def:=replace(def,'then raise exception ''PT o cliente già impegnato in questo orario''; end if;','then null; end if;');
 execute def;
end $$;

-- A deterministic replacement ID is the durable deduplication key. Both rows
-- are committed in this one transaction; no browser-owned partial save.
create function public.calendar_cancel_and_recover(p_actor_id text,p_actor_role text,p_request_id uuid,p_expected jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare original jsonb; replacement jsonb; cancelled jsonb; result jsonb; actor jsonb; roles text[];
 c jsonb; first_client jsonb; cycle jsonb; link jsonb; participants jsonb:='{}'; days jsonb; other_days jsonb;
 proposal public.calendar_expected_renewals; recovery_proposal_id uuid; spec jsonb; slot jsonb;
 cid text; trainer text; recovery_id text; notes text; stamp timestamptz:=clock_timestamp();
 cursor_day date; tail date; wanted text; slot_time time; reference jsonb; planned int; count_ids int;
 warnings jsonb:='[]'; touched jsonb; weekdays text[]:=array['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
 if actor is null or p_actor_role not in ('owner','pt','secretary') then raise exception 'Operatore non autorizzato'; end if;
 if p_actor_role='owner' and not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then raise exception 'Owner role required'; end if;
 if p_actor_role='pt' and not coalesce(roles && array['pt','personal_trainer','personal trainer'],false) then raise exception 'PT role required'; end if;
 if p_actor_role='secretary' and not coalesce(roles && array['secretary','segreteria'],false) then raise exception 'Secretary role required'; end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select to_jsonb(a) into original from public.appointments a where a.id=p_expected->>'id';
 if original is null then raise exception 'Appuntamento mancante'; end if;
 if p_actor_role='pt' and original->>'operator_id' is distinct from p_actor_id then raise exception 'Appointment belongs to another PT'; end if;
 if original->>'service_id' not in ('pt11','pt12','circuit') then raise exception 'Recupero disponibile solo per sedute del pacchetto'; end if;
 recovery_id:='recovery_'||md5(original->>'id');
 select to_jsonb(a) into replacement from public.appointments a where a.id=recovery_id;
 if replacement is not null then
  if original->>'status' is distinct from 'annullato' or strpos(coalesce(replacement->>'notes',''),'[RECUPERO-DA '||(original->>'id')||']')=0 then raise exception 'Collegamento recupero non coerente'; end if;
 else
  if public.calendar_appointment_fields(original) is distinct from public.calendar_appointment_fields(to_jsonb(jsonb_populate_record(null::public.appointments,p_expected))) then raise exception 'Appuntamento cambiato: ricarica prima di riprovare'; end if;
  count_ids:=jsonb_array_length(original->'client_ids');
  if count_ids<1 or original->>'service_id'='pt12' and count_ids<>2 then raise exception 'Verifica i partecipanti della seduta'; end if;
  select p.* into proposal from public.calendar_expected_renewal_appointments m join public.calendar_expected_renewals p on p.id=m.proposal_id where m.appointment_id=original->>'id';
  if proposal.state='declined' then raise exception 'Proposta di rinnovo annullata'; end if;
  if proposal.state in ('pending','confirmed') then recovery_proposal_id:=proposal.id; end if;
  for cid in select jsonb_array_elements_text(original->'client_ids') loop
   select to_jsonb(x) into c from public.clients x where x.id=cid;
   if c is null or c->>'active' is distinct from 'true' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Cliente non attivo: recupero non salvato'; end if;
   if first_client is null then first_client:=c;trainer:=c->>'pt_assegnato'; end if;
   if nullif(trainer,'') is null or c->>'pt_assegnato' is distinct from trainer then raise exception 'Verifica il PT assegnato al pacchetto di entrambe le persone'; end if;
   if p_actor_role='pt' and trainer is distinct from p_actor_id then raise exception 'Recupero riservato al PT assegnato o alla Direzione'; end if;
   if recovery_proposal_id is null and not public.calendar_uses_current_session(original||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(original->>'notes',''),'"status":\s*"(prenotato|noshow)"','"status":"fatto"','g')),c) then raise exception 'La seduta appartiene a un ciclo precedente: verifica il pacchetto prima del recupero'; end if;
   cycle:=null;
   select value into cycle from jsonb_array_elements(substring(coalesce(c->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]')::jsonb->'cycles') with ordinality e(value,n) where coalesce(value->>'closedAt','')='' order by n desc limit 1;
   other_days:=case when jsonb_typeof(cycle->'days')='array' and cycle->'days'<>'[]' then cycle->'days'
     when jsonb_typeof(c->'giorni_settimana')='array' and c->'giorni_settimana'<>'[]' then c->'giorni_settimana'
     else jsonb_build_array(weekdays[extract(dow from (original->>'date')::date)::int+1]) end;
   if days is null then days:=other_days;else select coalesce(jsonb_agg(value),'[]') into days from jsonb_array_elements(days) where other_days @> jsonb_build_array(value);end if;
   if recovery_proposal_id is not null then
    select value into spec from jsonb_array_elements(proposal.plan->'clients') where value->>'id'=cid;
    link:=jsonb_build_object('cycleId',spec->>'cycleId','start',proposal.plan->>'startDate');
   else link:=public.calendar_pt_current_link(c); end if;
   participants:=participants||jsonb_build_object(cid,link||jsonb_build_object('status','prenotato'));
  end loop;
  if not exists(select 1 from public.operator_effective_roles o where o.operator_id=trainer and o.active and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where lower(r.value) in ('pt','personal_trainer','personal trainer'))) then raise exception 'PT assegnato non attivo'; end if;
  if recovery_proposal_id is not null then
   select jsonb_agg(to_jsonb(weekdays[(value->>'day')::int+1])) into days from jsonb_array_elements(proposal.plan->'slots');
  end if;
  if coalesce(jsonb_array_length(days),0)=0 then raise exception 'I pacchetti della coppia non hanno giorni condivisi: verifica la pianificazione'; end if;
  -- Append at the end of THIS cycle. Next renewals and other clients do not
  -- change the date, including occupied trainer slots.
  tail:=(original->>'date')::date;
  select greatest(tail,max(x.date)) into tail from public.appointments x where x.status<>'annullato' and x.service_id=original->>'service_id' and x.client_ids @> jsonb_build_array(first_client->>'id') and
   case when recovery_proposal_id is not null then exists(select 1 from public.calendar_expected_renewal_appointments m where m.appointment_id=x.id and m.proposal_id=recovery_proposal_id)
   else public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"(prenotato|noshow)"','"status":"fatto"','g')),first_client) end;
  cursor_day:=greatest(tail+1,(stamp at time zone 'Europe/Rome')::date);
  for recovery_search_step in 0..730 loop
   wanted:=weekdays[extract(dow from cursor_day)::int+1];
   if days ? wanted then
    if recovery_proposal_id is not null then select value into slot from jsonb_array_elements(proposal.plan->'slots') where (value->>'day')::int=extract(dow from cursor_day)::int limit 1;slot_time:=(slot->>'time')::time;
    else
     select to_jsonb(x) into reference from public.appointments x where x.status<>'annullato' and x.service_id=original->>'service_id' and x.client_ids @> jsonb_build_array(first_client->>'id') and extract(dow from x.date)=extract(dow from cursor_day) and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"(prenotato|noshow)"','"status":"fatto"','g')),first_client) order by x.date desc,x.updated_at desc,x.id desc limit 1;
     select value into cycle from jsonb_array_elements(substring(coalesce(first_client->>'notes','') from '\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[/NEACEA-PACKAGE-LEDGER-V1\]')::jsonb->'cycles') with ordinality e(value,n) where coalesce(value->>'closedAt','')='' order by n desc limit 1;
     slot_time:=coalesce(nullif(reference->>'start_time','')::time,nullif(cycle->>'time','')::time,nullif(first_client->>'orario_preferito','')::time,(original->>'start_time')::time);
    end if;
    if slot_time is not null and (cursor_day>(stamp at time zone 'Europe/Rome')::date or slot_time>(stamp at time zone 'Europe/Rome')::time) then exit;end if;
   end if;
   cursor_day:=cursor_day+1;
  end loop;
  if not(days ? weekdays[extract(dow from cursor_day)::int+1]) or slot_time is null then raise exception 'Impossibile determinare data e orario dal pacchetto'; end if;
  cancelled:=public.calendar_audit_write(p_actor_id,p_actor_role,'calendar',p_request_id,'save',jsonb_build_object('appointment',original||jsonb_build_object('status','annullato'),'expected',original));
  original:=cancelled->'appointment';
  if recovery_proposal_id is null then
   for cid in select jsonb_array_elements_text(original->'client_ids') loop
    select to_jsonb(x) into c from public.clients x where x.id=cid;
    select count(*) into planned from public.appointments x where x.status='prenotato' and x.client_ids @> jsonb_build_array(cid) and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),c);
    if coalesce((c->>'sessions_remaining')::int,0)<=planned then raise exception 'Il pacchetto non ha sedute disponibili per il recupero'; end if;
   end loop;
  end if;
  notes:='Recupero automatico [RECUPERO-DA '||(original->>'id')||']';
  if original->>'service_id' in ('pt11','pt12') then notes:=notes||E'\n[NEACEA-PT-SESSION-V1]'||jsonb_build_object('version',1,'rateCents',case when original->>'service_id'='pt12' then 1500 else 1000 end,'participants',participants)::text||'[/NEACEA-PT-SESSION-V1]';
  else notes:=notes||' [CICLO-PACCHETTO-ID '||(participants->(first_client->>'id')->>'cycleId')||'] [CICLO-PACCHETTO '||(participants->(first_client->>'id')->>'start')||']';end if;
  replacement:=jsonb_build_object('id',recovery_id,'service_id',original->>'service_id','client_ids',original->'client_ids','operator_id',trainer,'date',cursor_day,'start_time',slot_time,'duration_min',original->'duration_min','buffer_min',original->'buffer_min','status','prenotato','notes',notes);
  if recovery_proposal_id is not null then insert into public.calendar_expected_renewal_appointments values(recovery_id,recovery_proposal_id);end if;
  result:=public.calendar_audit_write(p_actor_id,p_actor_role,'calendar',p_request_id,'save',jsonb_build_object('appointment',replacement));
  replacement:=result->'appointment';
 end if;
 -- Recompute overlap alerts on retry, even when the original response was lost.
 if exists(select 1 from public.appointments x where x.id<>replacement->>'id' and x.status<>'annullato' and x.date=(replacement->>'date')::date and x.operator_id=replacement->>'operator_id' and x.start_time<(replacement->>'start_time')::time+(replacement->>'duration_min')::int*interval '1 minute' and x.start_time+x.duration_min*interval '1 minute'>(replacement->>'start_time')::time) then warnings:=warnings||'["operator_overlap"]'::jsonb;end if;
 if exists(select 1 from public.appointments x where x.id<>replacement->>'id' and x.status<>'annullato' and x.date=(replacement->>'date')::date and exists(select 1 from jsonb_array_elements_text(replacement->'client_ids') i where x.client_ids @> jsonb_build_array(i.value)) and x.start_time<(replacement->>'start_time')::time+(replacement->>'duration_min')::int*interval '1 minute' and x.start_time+x.duration_min*interval '1 minute'>(replacement->>'start_time')::time) then warnings:=warnings||'["client_overlap"]'::jsonb;end if;
 select jsonb_agg(to_jsonb(x)) into touched from public.clients x where original->'client_ids' @> jsonb_build_array(x.id);
 return jsonb_build_object('appointment',original,'recovery',replacement,'clients',touched,'planning_warnings',coalesce(result->'warnings','[]'::jsonb)||warnings);
end $$;
revoke all on function public.calendar_cancel_and_recover(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_cancel_and_recover(text,text,uuid,jsonb) to service_role;
