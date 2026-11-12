-- Local candidate only. Apply remotely only with explicit release authorization.
create table public.calendar_schedule_receipts (
 request_id uuid primary key, actor_id text not null, payload jsonb not null,
 result jsonb not null, created_at timestamptz not null default now()
);
alter table public.calendar_schedule_receipts enable row level security;
revoke all on public.calendar_schedule_receipts from public,anon,authenticated,service_role;
grant select,insert on public.calendar_schedule_receipts to service_role;

create function public.calendar_schedule_at(c jsonb,d date) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare raw text; schedule jsonb;
begin
 raw:=substring(coalesce(c->>'notes','') from '\[NEACEA-SCHEDULE-V1\]\s*([\s\S]*?)\s*\[/NEACEA-SCHEDULE-V1\]');
 if raw is null then return null;end if;
 if raw::jsonb->'cycle' is distinct from public.calendar_pt_current_link(c) then return null;end if;
 select value->'slots' into schedule from jsonb_array_elements(raw::jsonb->'patterns')
 where (value->>'from')::date<=d order by value->>'from' desc limit 1;
 return schedule;
end $$;
revoke all on function public.calendar_schedule_at(jsonb,date) from public,anon,authenticated;
grant execute on function public.calendar_schedule_at(jsonb,date) to service_role;

create function public.calendar_package_schedule(p_actor_id text,p_request_id uuid,p_payload jsonb,p_preview boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare actor jsonb; c jsonb; other_c jsonb; a jsonb; r jsonb; spec jsonb; slot jsonb;
 target text:=p_payload->>'clientId'; from_day date:=(p_payload->>'fromDate')::date;
 today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
 local_now time:=(clock_timestamp() at time zone 'Europe/Rome')::time;
 sid text; ids jsonb; client_ids jsonb; expected_ids jsonb; actual jsonb; expected jsonb;
 rows_before jsonb; planned jsonb:='[]'; saved jsonb:='[]'; clients_result jsonb:='[]'; warnings jsonb:='[]';
 cursor_day date; chosen_time time; item_index int:=0; slots jsonb:=p_payload->'slots';
 receipt public.calendar_schedule_receipts; output jsonb; raw text; patterns jsonb; old_slots jsonb; old_time time; old_day text; notes text;
 weekdays text[]:=array['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 if actor is null or not exists(select 1 from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]')) x where lower(x.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) then raise exception 'Cambio orari riservato alla Direzione';end if;
 if p_request_id is null or target is null or from_day is null then raise exception 'Scegli una data da oggi in poi';end if;
 if jsonb_typeof(slots) is distinct from 'array' or jsonb_array_length(slots) not between 1 and 7 then raise exception 'Scegli da uno a sette giorni';end if;
 if exists(select 1 from jsonb_array_elements(slots) s where (s->>'day') is null or (s->>'day')!~'^[0-6]$' or coalesce(s->>'time','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$') or (select count(distinct value->>'day') from jsonb_array_elements(slots))<>jsonb_array_length(slots) then raise exception 'Giorni duplicati oppure orari non validi';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients,public.calendar_expected_renewals in share row exclusive mode;
 select * into receipt from public.calendar_schedule_receipts where request_id=p_request_id;
 if found and not p_preview then
  if receipt.actor_id<>p_actor_id or receipt.payload is distinct from p_payload then raise exception 'Identificativo gia utilizzato';end if;
  return receipt.result;
 end if;
 if from_day<today then raise exception 'Scegli una data da oggi in poi';end if;
 select to_jsonb(x) into c from public.clients x where x.id=target;
 if c is null or c->>'active' is distinct from 'true' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Cliente non attivo';end if;
 sid:=case when c->'package_types' ? 'PT 1:1' then 'pt11' when c->'package_types' ? 'PT 1:2' then 'pt12' when c->'package_types' ? 'Circuit' then 'circuit' else null end;
 if sid is null then raise exception 'Pacchetto non compatibile';end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.date,x.start_time,x.id),'[]') into rows_before from public.appointments x
 where x.status='prenotato' and x.date>=from_day and x.service_id=sid and x.client_ids @> jsonb_build_array(target)
 and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),c);
 if jsonb_array_length(rows_before) not between 1 and 100 then raise exception 'Nessuna lezione da riprogrammare oppure piu di 100 lezioni';end if;
 select jsonb_agg(public.calendar_appointment_fields(value) order by value->>'id') into actual from jsonb_array_elements(rows_before);
 if jsonb_typeof(p_payload->'expectedAppointments') is distinct from 'array' then raise exception 'Anteprima mancante';end if;
 select jsonb_agg(public.calendar_appointment_fields(to_jsonb(jsonb_populate_record(null::public.appointments,value))) order by value->>'id') into expected from jsonb_array_elements(p_payload->'expectedAppointments');
 if actual is distinct from expected then raise exception 'Lezioni cambiate: aggiorna l’anteprima prima di salvare';end if;
 select jsonb_agg(distinct i.value order by i.value) into client_ids from jsonb_array_elements(rows_before) a cross join lateral jsonb_array_elements(a->'client_ids') i;
 select jsonb_agg(value->>'id' order by value->>'id') into expected_ids from jsonb_array_elements(p_payload->'clients');
 if expected_ids is distinct from client_ids then raise exception 'Partecipanti dell’anteprima non validi';end if;
 if sid='pt12' and jsonb_array_length(client_ids)<>2 or sid<>'pt12' and jsonb_array_length(client_ids)<>1 then raise exception 'Le sedute di gruppo richiedono la gestione condivisa dal Calendario';end if;
 for spec in select value from jsonb_array_elements(p_payload->'clients') loop
  select to_jsonb(x) into other_c from public.clients x where x.id=spec->>'id';
  if other_c is null or other_c->>'active' is distinct from 'true' or lower(coalesce(other_c->>'stato_abbonamento','')) like '%ibern%' then raise exception 'Partecipante non attivo';end if;
  if nullif(spec->>'expectedUpdatedAt','') is null or (spec->>'expectedUpdatedAt')::timestamptz is distinct from (other_c->>'updated_at')::timestamptz then raise exception 'Pacchetto cambiato: aggiorna l’anteprima';end if;
  if sid='pt12' and (other_c->>'pt_partner_id' is null or not(client_ids ? (other_c->>'pt_partner_id')) or other_c->>'pt_partner_id'=other_c->>'id') then raise exception 'Verifica l’associazione della coppia';end if;
  if exists(select 1 from jsonb_array_elements(rows_before) a where not public.calendar_uses_current_session(a||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(a->>'notes',''),'"status":\s*"prenotato"','"status":"fatto"','g')),other_c)) then raise exception 'La seduta appartiene a un altro ciclo: verifica la coppia';end if;
 end loop;
 cursor_day:=from_day;
 for a in select value from jsonb_array_elements(rows_before) loop
  chosen_time:=null;
  for step in 0..730 loop
   select value into slot from jsonb_array_elements(slots) where (value->>'day')::int=extract(dow from cursor_day)::int;
   if slot is not null and (cursor_day>today or (slot->>'time')::time>local_now) then chosen_time:=(slot->>'time')::time;exit;end if;
   cursor_day:=cursor_day+1;
  end loop;
  if chosen_time is null then raise exception 'Non ci sono abbastanza date valide';end if;
  planned:=planned||jsonb_build_array(a||jsonb_build_object('date',cursor_day,'start_time',chosen_time));
  cursor_day:=cursor_day+1;
 end loop;
 select jsonb_agg(value->>'id') into ids from jsonb_array_elements(rows_before);
 -- Calculate overlaps against the resulting agenda, excluding replaced times.
 with services(id,room,max_load) as (values ('pt11','pt',1),('pt12','pt',2),('circuit','pt',6),('nutrizione','nutri',1),('check','nutri',1),('visbody','valut',1),('baiobit',null,0),('blocco',null,0)), virtual as (
  select to_jsonb(x) a from public.appointments x where x.status<>'annullato' and not(ids ? x.id)
  union all select value from jsonb_array_elements(planned)
 ), visible as (
  select v.a,s.room,extract(epoch from (v.a->>'start_time')::time)/60 lo,
   extract(epoch from (v.a->>'start_time')::time)/60+(v.a->>'duration_min')::int hi,least(s.max_load,p.n) room_load
  from virtual v join services s on s.id=v.a->>'service_id'
  cross join lateral (select count(*)::int n from public.clients c where c.active is distinct from false and v.a->'client_ids' ? c.id) p
  where s.id='blocco' or p.n>0
 ), hits as (
  select distinct a->>'id' id,'agenda_overlap' code from jsonb_array_elements(planned) a join visible v on v.a->>'id'<>a->>'id' and v.a->>'date'=a->>'date'
  and v.lo<extract(epoch from (a->>'start_time')::time)/60+(a->>'duration_min')::int
  and v.hi>extract(epoch from (a->>'start_time')::time)/60
  and (v.a->>'operator_id'=a->>'operator_id' or exists(select 1 from jsonb_array_elements_text(a->'client_ids') i where v.a->'client_ids' ? i.value))
  union
  select n.a->>'id','room_capacity' from visible n where ids ? (n.a->>'id') and n.room is not null
  and exists(select 1 from (select n.lo t union select o.lo from visible o where o.a->>'date'=n.a->>'date' and o.room=n.room and o.lo>n.lo and o.lo<n.hi) b
   where (select coalesce(sum(o.room_load),0) from visible o where o.a->>'date'=n.a->>'date' and o.room=n.room and o.lo<=b.t and o.hi>b.t)>case n.room when 'pt' then 6 else 1 end)
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code)),'[]') into warnings from hits;
 if p_preview then
  select jsonb_agg(to_jsonb(x) order by x.id) into clients_result from public.clients x where client_ids ? x.id;
  return jsonb_build_object('requestId',p_request_id,'preview',true,'appointments',planned,'clients',clients_result,'warnings',warnings);
 end if;
 -- Audited primitives validate every row. Any failure rolls back ALL rows and notes.
 for a in select value from jsonb_array_elements(planned) loop
  select value into expected from jsonb_array_elements(rows_before) where value->>'id'=a->>'id';
  r:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',a,'expected',expected));
  saved:=saved||jsonb_build_array(r->'appointment');
 end loop;
 for spec in select value from jsonb_array_elements(p_payload->'clients') loop
  select to_jsonb(x) into other_c from public.clients x where x.id=spec->>'id';
  raw:=substring(coalesce(other_c->>'notes','') from '\[NEACEA-SCHEDULE-V1\]\s*([\s\S]*?)\s*\[/NEACEA-SCHEDULE-V1\]');
  if raw is null then
   old_slots:='[]';
   for old_day in select jsonb_array_elements_text(coalesce(other_c->'giorni_settimana','[]')) loop
    select (v.a->>'start_time')::time into old_time from (
     select to_jsonb(x) a from public.appointments x where not(ids ? x.id) and x.client_ids @> jsonb_build_array(other_c->>'id') and x.service_id=sid and x.status<>'annullato'
     union all select value from jsonb_array_elements(rows_before)
    ) v where extract(dow from (v.a->>'date')::date)::int=array_position(weekdays,old_day)-1 order by v.a->>'date' desc,v.a->>'id' desc limit 1;
    old_slots:=old_slots||jsonb_build_array(jsonb_build_object('day',array_position(weekdays,old_day)-1,'time',to_char(coalesce(old_time,(rows_before->0->>'start_time')::time),'HH24:MI')));
   end loop;
   patterns:=jsonb_build_array(jsonb_build_object('from','0001-01-01','slots',old_slots));
  else select coalesce(jsonb_agg(value order by value->>'from'),'[]') into patterns from jsonb_array_elements(raw::jsonb->'patterns') where (value->>'from')::date<from_day;
  end if;
  patterns:=patterns||jsonb_build_array(jsonb_build_object('from',from_day,'slots',slots));
  notes:=regexp_replace(coalesce(other_c->>'notes',''),'\s*\[NEACEA-SCHEDULE-V1\][\s\S]*?\[/NEACEA-SCHEDULE-V1\]','','g')||E'\n[NEACEA-SCHEDULE-V1]'||jsonb_build_object('version',1,'cycle',public.calendar_pt_current_link(other_c),'patterns',patterns)::text||'[/NEACEA-SCHEDULE-V1]';
  r:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(jsonb_build_object('id',other_c->>'id','notes',notes))));
  clients_result:=clients_result||r;
 end loop;
 output:=jsonb_build_object('requestId',p_request_id,'preview',false,'appointments',saved,'clients',clients_result,'warnings',warnings);
 insert into public.calendar_schedule_receipts(request_id,actor_id,payload,result) values(p_request_id,p_actor_id,p_payload,output);
 return output;
end $$;
revoke all on function public.calendar_package_schedule(text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.calendar_package_schedule(text,uuid,jsonb,boolean) to service_role;

-- Recoveries follow the effective weekly plan, including when a day has no
-- remaining reservation from which an hour could otherwise be inferred.
do $patch$ declare body text;begin
 body:=pg_get_functiondef('public.calendar_cancel_and_recover(text,text,uuid,jsonb)'::regprocedure);
 if position('cursor_day:=greatest' in body)=0 or position('if days ? wanted then' in body)=0 then raise exception 'Unexpected recovery function';end if;
 body:=replace(body,'wanted:=weekdays[extract(dow from cursor_day)::int+1];',
 $new$wanted:=weekdays[extract(dow from cursor_day)::int+1];
   if recovery_proposal_id is null and public.calendar_schedule_at(first_client,cursor_day) is not null then
    select jsonb_agg(to_jsonb(weekdays[(value->>'day')::int+1])) into days from jsonb_array_elements(public.calendar_schedule_at(first_client,cursor_day));
   end if;$new$);
 body:=replace(body,'slot_time:=coalesce(nullif(reference->>''start_time'','''')::time,',
 $new$slot_time:=coalesce((select (value->>'time')::time from jsonb_array_elements(public.calendar_schedule_at(first_client,cursor_day)) where (value->>'day')::int=extract(dow from cursor_day)::int),nullif(reference->>'start_time','')::time,$new$);
 execute body;
end $patch$;
