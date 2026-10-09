-- Partner association and explicit provisional appointments; no automatic historical guesses.
alter table public.clients add column pt_partner_id text references public.clients(id);
alter table public.clients add constraint clients_partner_distinct check(pt_partner_id is distinct from id);
create function public.calendar_is_provisional(a jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(a->>'notes','') like '%[ORARIO-PROVVISORIO]%';
$$;
create function public.calendar_pair_client_check() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.clients; partner public.clients;
begin
 select * into c from public.clients where id=new.id;
 if c.pt_partner_id is not null then
  select * into partner from public.clients where id=c.pt_partner_id;
  if partner.pt_partner_id is distinct from c.id or not (to_jsonb(c.package_types) ? 'PT 1:2') or not (to_jsonb(partner.package_types) ? 'PT 1:2') then raise exception 'PT 1:2 richiede associazione reciproca con un altro cliente'; end if;
 elsif to_jsonb(c.package_types) ? 'PT 1:2' then
  if TG_OP='INSERT' or new.package_types is distinct from old.package_types or new.pt_partner_id is distinct from old.pt_partner_id then raise exception 'Seleziona il secondo cliente per confermare PT 1:2'; end if;
 end if;
 return new;
end $$;
create constraint trigger calendar_pair_client_check after insert or update on public.clients deferrable initially deferred for each row execute function public.calendar_pair_client_check();

-- Keep public OIDs and dependent callers unchanged.
do $$ begin
 execute replace(pg_get_functiondef('public.calendar_save_appointment(jsonb,jsonb)'::regprocedure),'FUNCTION public.calendar_save_appointment(', 'FUNCTION public.calendar_save_appointment_pre_review(');
 -- Provisional bookings do not block a confirmed pair.
 execute replace(replace(pg_get_functiondef('public.calendar_save_appointment_pre_review(jsonb,jsonb)'::regprocedure),
  'and x.status<>''annullato'' and x.date=', 'and x.status<>''annullato'' and not public.calendar_is_provisional(to_jsonb(x)) and x.date='),
  'if a->>''service_id''=''pt12'' and a->>''status''<>''annullato'' and (oldrow',
  'if not public.calendar_is_provisional(a) and a->>''service_id''=''pt12'' and a->>''status''<>''annullato'' and (oldrow');
end $$;
create or replace function public.calendar_save_appointment(p_appointment jsonb,p_expected jsonb default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a jsonb:=p_appointment; oldrow jsonb; cid text; partner text;
begin
 lock table public.appointments,public.clients in share row exclusive mode;
 select to_jsonb(x) into oldrow from public.appointments x where id=a->>'id';
 if public.calendar_is_provisional(a) and a->>'status' not in ('prenotato','annullato') then raise exception 'Conferma prima l’orario effettivo della seduta'; end if;
 if a->>'service_id'='pt12' and a->>'status'<>'annullato' and (oldrow is null or oldrow->'client_ids' is distinct from a->'client_ids' or oldrow->>'service_id' is distinct from 'pt12') then
  if jsonb_array_length(a->'client_ids') is distinct from 2 then raise exception 'PT 1:2 richiede due clienti associati'; end if;
  for cid in select jsonb_array_elements_text(a->'client_ids') loop
   select pt_partner_id into partner from public.clients where id=cid;
   if partner is null or not(a->'client_ids' ? partner) or partner=cid then raise exception 'Associa prima i due clienti nella scheda pacchetto'; end if;
  end loop;
 end if;
 if public.calendar_is_provisional(oldrow) and not public.calendar_is_provisional(a) and a->>'status'<>'annullato' then
  if exists(select 1 from public.appointments x where x.id<>a->>'id' and x.status<>'annullato' and not public.calendar_is_provisional(to_jsonb(x)) and x.date=(a->>'date')::date and (x.operator_id=a->>'operator_id' or exists(select 1 from jsonb_array_elements_text(a->'client_ids') i where to_jsonb(x.client_ids) ? i.value)) and x.start_time<(a->>'start_time')::time+(a->>'duration_min')::int*interval '1 minute' and x.start_time+x.duration_min*interval '1 minute'>(a->>'start_time')::time) then raise exception 'Orario ancora occupato: sposta la seduta o cambia PT prima di confermare'; end if;
 end if;
 return public.calendar_save_appointment_pre_review(a,p_expected);
end $$;
revoke all on function public.calendar_save_appointment_pre_review(jsonb,jsonb),public.calendar_pair_client_check(),public.calendar_is_provisional(jsonb) from public,anon,authenticated;
grant execute on function public.calendar_save_appointment_pre_review(jsonb,jsonb),public.calendar_is_provisional(jsonb) to service_role;

-- Supports JSONB participants in production and legacy SQL arrays without changing table types.
-- Owner-only correction of existing PT sessions. One transaction, no balance reconstruction.
create or replace function public.calendar_correct_pt_sessions(p_actor_id text, p_request_id uuid, p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare actor jsonb; roles text[]; item jsonb; a public.appointments; b public.appointments;
 expected public.appointments; proposed jsonb; ids text[] := '{}'; touched text[] := '{}';
 snapshots jsonb := '{}'; c public.clients; usage_before int; usage_after int; has_records boolean;
 result jsonb; ctx jsonb; participants jsonb; source_row jsonb; cid text; link jsonb; merged_status text; delta int;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 select array_agg(lower(value)) into roles from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]'));
 if actor is null or not coalesce(roles && array['owner','admin','administrator','amministratore','titolare','super_admin','direzione'],false) then raise exception 'Operazione riservata alla Direzione'; end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 100 then raise exception 'Seleziona da 1 a 100 sedute'; end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments, public.clients in share row exclusive mode;
 ctx:=jsonb_build_object('id',p_actor_id,'name',trim(concat(actor->>'nome',' ',actor->>'cognome')),'email',actor->>'email','role','owner','source','calendar','request_id',p_request_id,'operation','pt_correction');
 perform set_config('neacea.audit_context',ctx::text,true);
 -- Validate every original snapshot before touching any row.
 for item in select value from jsonb_array_elements(p_changes) loop
  if item->>'serviceId' is null or item->>'serviceId' not in ('pt11','pt12') then raise exception 'Tipo PT non valido'; end if;
  for proposed in select value from jsonb_array_elements(jsonb_build_array(item->'before') || case when item ? 'partner' then jsonb_build_array(item->'partner') else '[]'::jsonb end) loop
   expected:=jsonb_populate_record(null::public.appointments,proposed);
   if expected.id is null or expected.id=any(ids) then raise exception 'Seduta duplicata o mancante'; end if;
   select * into a from public.appointments where id=expected.id;
   if not found or public.calendar_appointment_fields(to_jsonb(a)) is distinct from public.calendar_appointment_fields(to_jsonb(expected)) then raise exception 'Una seduta è cambiata: aggiorna l’anteprima'; end if;
   if a.service_id is null or a.service_id not in ('pt11','pt12') or a.status is null or a.status not in ('prenotato','fatto','noshow') or a.operator_id is null or coalesce(jsonb_array_length(to_jsonb(a.client_ids)),0) not between 1 and 2 or a.date is null or a.start_time is null or coalesce(a.duration_min,0)<=0 then raise exception 'Seduta PT non correggibile'; end if;
   if jsonb_array_length(to_jsonb(a.client_ids)) <> (select count(distinct v.value) from jsonb_array_elements_text(to_jsonb(a.client_ids)) v) then raise exception 'Partecipanti duplicati'; end if;
   if exists(select 1 from jsonb_array_elements_text(to_jsonb(a.client_ids)) cid where not exists(select 1 from public.clients cl where cl.id=cid.value)) then raise exception 'Cliente mancante'; end if;
   ids:=array_append(ids,a.id); touched:=touched||array(select jsonb_array_elements_text(to_jsonb(a.client_ids)));
  end loop;
 end loop;
 -- Snapshot consumption, including old cycles. Never reset counters from history.
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_before from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c.id) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  snapshots:=snapshots||jsonb_build_object(c.id,jsonb_build_object('used',usage_before,'remaining',c.sessions_remaining));
 end loop;
 for item in select value from jsonb_array_elements(p_changes) loop
  select * into a from public.appointments where id=item->'before'->>'id';
  perform set_config('neacea.audit_context',(ctx||jsonb_build_object('mergedAppointmentId',item->'partner'->>'id'))::text,true);
  if item ? 'partner' then
   select * into b from public.appointments where id=item->'partner'->>'id';
   if item->>'serviceId'<>'pt12' or jsonb_array_length(to_jsonb(a.client_ids))<>1 or jsonb_array_length(to_jsonb(b.client_ids))<>1 or exists(select 1 from jsonb_array_elements_text(to_jsonb(a.client_ids)) cid where to_jsonb(b.client_ids) @> jsonb_build_array(cid.value))
    or (a.date,a.start_time,a.duration_min,a.operator_id) is distinct from (b.date,b.start_time,b.duration_min,b.operator_id) then
    raise exception 'Per unire due sedute servono clienti distinti, stesso PT, data, orario e durata';
   end if;
   if (a.status='prenotato') is distinct from (b.status='prenotato') then raise exception 'Completa entrambe le presenze prima di unire'; end if;
   participants:='{}';
   for source_row in select value from jsonb_array_elements(jsonb_build_array(to_jsonb(a),to_jsonb(b))) loop
    cid:=source_row->'client_ids'->>0;
    link:=jsonb_build_object('cycleId',coalesce(substring(source_row->>'notes' from '\[CICLO-PACCHETTO-ID\s+([^\]]+)\]'),''),'start',coalesce(substring(source_row->>'notes' from '\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]'),''),'status',source_row->>'status');
    if link->>'start'='' and link->>'cycleId'='' then raise exception 'Collegamento storico al pacchetto mancante: verifica la decorrenza'; end if;
    participants:=participants||jsonb_build_object(cid,link);
   end loop;
   merged_status:=case when a.status='prenotato' then 'prenotato' when a.status='noshow' and b.status='noshow' then 'noshow' else 'fatto' end;
   -- Keep compiled training records attached to their original appointment.
   if to_regclass('public.pt_session_records') is not null then
    execute 'select exists(select 1 from public.pt_session_records where appointment_id=$1)' into has_records using b.id;
    if has_records then raise exception 'La seconda seduta contiene una scheda allenamento compilata: non può essere unita automaticamente'; end if;
   end if;
   update public.appointments set status='annullato',updated_at=clock_timestamp() where id=b.id;
   update public.appointments set status=merged_status,notes=coalesce(a.notes,'')||E'\n[NEACEA-PT-SESSION-V1]'||jsonb_build_object('version',1,'rateCents',1500,'participants',participants)::text||'[/NEACEA-PT-SESSION-V1]',service_id='pt12',client_ids=(jsonb_populate_record(null::public.appointments,jsonb_build_object('client_ids',to_jsonb(a.client_ids)||to_jsonb(b.client_ids)))).client_ids,updated_at=clock_timestamp() where id=a.id;
  else
   if item->>'serviceId'='pt11' and jsonb_array_length(to_jsonb(a.client_ids))<>1 then raise exception 'Una seduta in coppia non può diventare individuale senza separare i partecipanti'; end if;
   if item->>'serviceId'='pt12' and jsonb_array_length(to_jsonb(a.client_ids))<>2 then raise exception 'Seleziona il secondo cliente per unire le sedute'; end if;
   if a.service_id=item->>'serviceId' then raise exception 'Il tipo della seduta è già corretto'; end if;
   update public.appointments set service_id=item->>'serviceId',updated_at=clock_timestamp() where id=a.id;
  end if;

 end loop;
 for c in select * from public.clients where id=any(touched) loop
  select count(*) into usage_after from public.appointments x where to_jsonb(x.client_ids) @> jsonb_build_array(c.id) and public.calendar_uses_current_session(to_jsonb(x),to_jsonb(c));
  delta:=usage_after-(snapshots->c.id->>'used')::int;
  if (snapshots->c.id->>'remaining')::int-delta<0 then raise exception 'La correzione porterebbe il pacchetto sotto zero: verifica prima il residuo'; end if;
  update public.clients set sessions_remaining=(snapshots->c.id->>'remaining')::int-delta,updated_at=clock_timestamp() where id=c.id and sessions_remaining is distinct from (snapshots->c.id->>'remaining')::int-delta;
 end loop;
 select jsonb_build_object('appointments',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) into result from public.appointments x where x.id=any(ids);
 return result;
end;
$$;
revoke all on function public.calendar_correct_pt_sessions(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_correct_pt_sessions(text,uuid,jsonb) to service_role;

create function public.calendar_save_pair_client(p_actor_id text,p_request_id uuid,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb:=p_payload->'client'; partner public.clients; previous public.clients; result jsonb; partner_types jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 lock table public.clients in share row exclusive mode;
 select jsonb_object_agg(e.key,e.value) into c from jsonb_each(c) e join information_schema.columns col on col.table_schema='public' and col.table_name='clients' and col.column_name=e.key;
 select * into previous from public.clients where id=c->>'id';
 if previous.id is not null and previous.updated_at is distinct from (p_payload->>'expectedUpdatedAt')::timestamptz then raise exception 'Cliente cambiato: ricarica prima di salvare'; end if;
 if c->>'pt_partner_id' is null or c->>'pt_partner_id'=c->>'id' or not(c->'package_types' ? 'PT 1:2') then raise exception 'Seleziona il secondo cliente per PT 1:2'; end if;
 select * into partner from public.clients where id=c->>'pt_partner_id';
 if partner.id is null or not partner.active or lower(coalesce(partner.stato_abbonamento,'')) like '%ibern%' then raise exception 'Secondo cliente non attivo'; end if;
 if (partner.pt_partner_id is not null and partner.pt_partner_id<>c->>'id') or (previous.pt_partner_id is not null and previous.pt_partner_id<>partner.id) then raise exception 'Un cliente è già associato a un’altra coppia: verifica con la Direzione'; end if;
 select coalesce(jsonb_agg(value),'[]') into partner_types from jsonb_array_elements_text(to_jsonb(partner.package_types)) where value not in ('PT 1:1','PT 1:2');
 result:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('rows',jsonb_build_array(c,jsonb_build_object('id',partner.id,'pt_partner_id',c->>'id','package_types',partner_types||'"PT 1:2"'::jsonb,'tipo_servizio','PT 1:2','updated_at',clock_timestamp()))));
 return result;
end $$;
revoke all on function public.calendar_save_pair_client(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_save_pair_client(text,uuid,jsonb) to service_role;

-- Payments record money already transferred by Direction; never initiate a transfer.
create table public.pt_trainer_payments (
 id uuid primary key, operator_id text not null references public.operators(id), period date not null check(extract(day from period)=1),
 paid_on date not null, amount_cents integer not null check(amount_cents>0), method text not null check(method in ('bonifico','contanti','altro')),
 note text not null default '' check(length(note)<=1000), actor_id text not null references public.operators(id), created_at timestamptz not null default now(),
 voided_at timestamptz, voided_by text references public.operators(id), void_reason text,
 check ((voided_at is null and voided_by is null and void_reason is null) or (voided_at is not null and voided_by is not null and length(btrim(void_reason))>0))
);
create index pt_trainer_payments_period on public.pt_trainer_payments(period,operator_id);
alter table public.pt_trainer_payments enable row level security;
revoke all on public.pt_trainer_payments from public,anon,authenticated;
grant select,insert,update on public.pt_trainer_payments to service_role;
create function public.calendar_pt_payments(p_actor_id text,p_operation text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare period_date date; oldrow public.pt_trainer_payments; payment public.pt_trainer_payments; result jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required'; end if;
 perform public.calendar_audit_read(p_actor_id,'{}');
 period_date:=(p_payload->>'period')::date;
 if period_date is null or extract(day from period_date)<>1 then raise exception 'Mese non valido'; end if;
 if p_operation='register' then
  payment:=jsonb_populate_record(null::public.pt_trainer_payments,p_payload-'actor_id'-'created_at'-'voided_at'-'voided_by'-'void_reason');
  if payment.paid_on>current_date then raise exception 'Indica la data di un pagamento già effettuato'; end if;
  if not exists(select 1 from public.operator_effective_roles o where o.operator_id=payment.operator_id and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where lower(r.value) in ('pt','personal_trainer','personal trainer'))) then raise exception 'Seleziona un Personal Trainer'; end if;
  perform pg_advisory_xact_lock(hashtextextended(payment.id::text,0));
  select * into oldrow from public.pt_trainer_payments where id=payment.id;
  if oldrow.id is not null then
   if (oldrow.operator_id,oldrow.period,oldrow.paid_on,oldrow.amount_cents,oldrow.method,oldrow.note,oldrow.actor_id) is distinct from (payment.operator_id,period_date,payment.paid_on,payment.amount_cents,payment.method,coalesce(payment.note,''),p_actor_id) then raise exception 'Richiesta già usata per un altro pagamento'; end if;
  else
   insert into public.pt_trainer_payments(id,operator_id,period,paid_on,amount_cents,method,note,actor_id) values(payment.id,payment.operator_id,period_date,payment.paid_on,payment.amount_cents,payment.method,coalesce(payment.note,''),p_actor_id);
  end if;
 elsif p_operation='void' then
  if length(btrim(coalesce(p_payload->>'reason','')))=0 then raise exception 'Indica il motivo della rettifica'; end if;
  update public.pt_trainer_payments set voided_at=now(),voided_by=p_actor_id,void_reason=p_payload->>'reason' where id=(p_payload->>'id')::uuid and period=period_date and voided_at is null;
  if not exists(select 1 from public.pt_trainer_payments where id=(p_payload->>'id')::uuid and period=period_date) then raise exception 'Pagamento non trovato'; end if;
 elsif p_operation<>'list' then raise exception 'Operazione pagamenti non valida'; end if;
 select jsonb_build_object('payments',coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]')) into result from public.pt_trainer_payments t where period=period_date;
 return result;
end $$;
revoke all on function public.calendar_pt_payments(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_pt_payments(text,text,jsonb) to service_role;

create function public.calendar_pt_payment_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception 'I pagamenti si rettificano senza eliminare lo storico'; end if;
 if (to_jsonb(new)-'voided_at'-'voided_by'-'void_reason') is distinct from (to_jsonb(old)-'voided_at'-'voided_by'-'void_reason') or old.voided_at is not null or new.voided_at is null then raise exception 'Registrazione immutabile: usa una rettifica motivata'; end if;
 return new;
end $$;
create trigger calendar_pt_payment_immutable before update or delete on public.pt_trainer_payments for each row execute function public.calendar_pt_payment_immutable();
revoke all on function public.calendar_pt_payment_immutable() from public,anon,authenticated;

do $$ begin
 execute replace(pg_get_functiondef('public.calendar_audit_fields(text,jsonb)'::regprocedure),'FUNCTION public.calendar_audit_fields(', 'FUNCTION public.calendar_audit_fields_pre_review(');
end $$;
create or replace function public.calendar_audit_fields(kind text,row_data jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb:=public.calendar_audit_fields_pre_review(kind,row_data);
begin
 if kind='clients' then result:=result||jsonb_build_object('pt_partner_id',row_data->'pt_partner_id'); end if;
 if kind='appointments' then result:=result||jsonb_build_object('provisional_time',public.calendar_is_provisional(row_data)); end if;
 return result;
end $$;
revoke all on function public.calendar_audit_fields_pre_review(text,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_audit_fields_pre_review(text,jsonb) to service_role;
