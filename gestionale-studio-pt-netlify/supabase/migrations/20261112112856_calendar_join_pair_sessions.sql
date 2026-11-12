-- Join the selected partner's existing individual bookings without creating appointments.
create function public.calendar_join_pair_sessions(p_actor_id text,p_request_id uuid,p_payload jsonb,p_preview boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
#variable_conflict use_column
declare actor jsonb; joining jsonb; source_client jsonb; spec jsonb; a jsonb; old_row jsonb; expected jsonb;
 receipt public.calendar_pt_pair_receipts; ids jsonb; members jsonb; count_rows int; booked int;
 participants jsonb; notes text; planned jsonb:='[]'; saved jsonb:='[]'; warnings jsonb:='[]'; result jsonb; r jsonb;
 today date:=(clock_timestamp() at time zone 'Europe/Rome')::date; local_time_now time:=(clock_timestamp() at time zone 'Europe/Rome')::time;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 if actor is null or not exists(select 1 from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]')) r where lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) then raise exception 'Conversione sedute riservata alla Direzione';end if;
 if p_request_id is null or p_preview is null then raise exception 'Anteprima mancante';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients in share row exclusive mode;
 select * into receipt from public.calendar_pt_pair_receipts where request_id=p_request_id;
 if found and not p_preview then
  if receipt.actor_id<>p_actor_id or receipt.payload is distinct from p_payload or receipt.result->>'mode' is distinct from 'join_pair_sessions' then raise exception 'Identificativo già utilizzato';end if;
  return receipt.result;
 end if;
 if jsonb_typeof(p_payload->'clients') is distinct from 'array' or jsonb_array_length(p_payload->'clients')<>2 or p_payload->'clients'->0->>'id' is null or p_payload->'clients'->0->>'id'=p_payload->'clients'->1->>'id' or jsonb_typeof(p_payload->'expectedAppointments') is distinct from 'array' then raise exception 'Seleziona la coppia e le sedute';end if;
 count_rows:=jsonb_array_length(p_payload->'expectedAppointments');
 if count_rows not between 1 and 100 or (select count(distinct value->>'id') from jsonb_array_elements(p_payload->'expectedAppointments'))<>count_rows then raise exception 'Seleziona da una a cento sedute distinte';end if;
 select to_jsonb(c) into joining from public.clients c where c.id=p_payload->'clients'->0->>'id';
 select to_jsonb(c) into source_client from public.clients c where c.id=p_payload->'clients'->1->>'id';
 for spec in select value from jsonb_array_elements(p_payload->'clients') loop
  select to_jsonb(c) into a from public.clients c where c.id=spec->>'id';
  if a is null or a->>'active' is distinct from 'true' or lower(coalesce(a->>'stato_abbonamento','')) like '%ibern%' or not(a->'package_types' ? 'PT 1:2') then raise exception 'Servono due pacchetti PT 1:2 attivi';end if;
  if nullif(spec->>'expectedUpdatedAt','') is null or (a->>'updated_at')::timestamptz is distinct from (spec->>'expectedUpdatedAt')::timestamptz then raise exception 'Pacchetto cambiato: aggiorna l’anteprima';end if;
 end loop;
 if joining->>'pt_partner_id' is distinct from source_client->>'id' or source_client->>'pt_partner_id' is distinct from joining->>'id' or nullif(joining->>'pt_assegnato','') is null or joining->>'pt_assegnato' is distinct from source_client->>'pt_assegnato' then raise exception 'Verifica la coppia e il PT assegnato';end if;
 if not exists(select 1 from public.operator_effective_roles o where o.operator_id=joining->>'pt_assegnato' and o.active and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where lower(r.value) in ('pt','personal_trainer','personal trainer'))) then raise exception 'PT assegnato non attivo';end if;
 select count(*) into booked from public.appointments x where x.status='prenotato' and x.client_ids @> jsonb_build_array(joining->>'id') and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),joining);
 if count_rows>coalesce((joining->>'sessions_remaining')::int,0)-booked then raise exception 'Le sedute selezionate superano il residuo ancora da programmare';end if;
 members:=jsonb_build_array(source_client->>'id',joining->>'id');
 participants:=jsonb_build_object(source_client->>'id',public.calendar_pt_current_link(source_client)||jsonb_build_object('status','prenotato'),joining->>'id',public.calendar_pt_current_link(joining)||jsonb_build_object('status','prenotato'));
 for expected in select value from jsonb_array_elements(p_payload->'expectedAppointments') loop
  select to_jsonb(x) into old_row from public.appointments x where x.id=expected->>'id';
  if old_row is null or public.calendar_appointment_fields(old_row) is distinct from public.calendar_appointment_fields(to_jsonb(jsonb_populate_record(null::public.appointments,expected))) then raise exception 'Una seduta è cambiata: aggiorna l’anteprima';end if;
  if old_row->>'status' is distinct from 'prenotato' or old_row->>'service_id' is distinct from 'pt11' or old_row->'client_ids' is distinct from jsonb_build_array(source_client->>'id') or old_row->>'operator_id' is distinct from source_client->>'pt_assegnato' or coalesce((old_row->>'duration_min')::int,0)<>60 or public.calendar_is_provisional(old_row) then raise exception 'Seleziona una seduta individuale prenotata del compagno';end if;
  if (old_row->>'date')::date<today or (old_row->>'date')::date=today and (old_row->>'start_time')::time<=local_time_now then raise exception 'La seduta deve essere futura e non ancora iniziata';end if;
  if not public.calendar_uses_current_session(old_row||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(old_row->>'notes',''),'"status":\s*"prenotato"','"status":"fatto"','g')),source_client) then raise exception 'La seduta appartiene a un altro ciclo del compagno';end if;
  notes:=regexp_replace(coalesce(old_row->>'notes',''),'\s*\[NEACEA-PT-SESSION-V1\][\s\S]*?\[/NEACEA-PT-SESSION-V1\]','','g')||E'\nConversione in seduta condivisa PT 1:2\n[NEACEA-PT-SESSION-V1]'||jsonb_build_object('version',1,'rateCents',1500,'participants',participants)::text||'[/NEACEA-PT-SESSION-V1]';
  planned:=planned||jsonb_build_array(old_row||jsonb_build_object('service_id','pt12','client_ids',members,'notes',notes));
 end loop;
 select jsonb_agg(value->>'id') into ids from jsonb_array_elements(planned);
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
 if not p_preview then
  for a in select value from jsonb_array_elements(planned) loop
   select value into old_row from jsonb_array_elements(p_payload->'expectedAppointments') where value->>'id'=a->>'id';
   -- Both cycle links and every original were checked above. This dedicated
   -- conversion adds a new participant to a booked row; the general historical
   -- edit guard requires every old participant to have already been present.
   perform set_config('neacea.audit_context',jsonb_build_object('id',p_actor_id,'name',trim(concat(actor->>'nome',' ',actor->>'cognome')),'email',actor->>'email','role','owner','source','calendar','request_id',p_request_id,'operation','join_pair_sessions')::text,true);
   update public.appointments set service_id='pt12',client_ids=a->'client_ids',notes=a->>'notes',updated_at=clock_timestamp() where id=a->>'id';
   select to_jsonb(x) into r from public.appointments x where x.id=a->>'id';
   saved:=saved||jsonb_build_array(r);
  end loop;
 else saved:=planned;
 end if;
 select jsonb_agg(to_jsonb(c) order by c.id) into a from public.clients c where members ? c.id;
 result:=jsonb_build_object('mode','join_pair_sessions','requestId',p_request_id,'preview',p_preview,'appointments',saved,'clients',a,'warnings',warnings);
 if not p_preview then insert into public.calendar_pt_pair_receipts(request_id,actor_id,payload,result) values(p_request_id,p_actor_id,p_payload,result);end if;
 return result;
end $$;
revoke all on function public.calendar_join_pair_sessions(text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.calendar_join_pair_sessions(text,uuid,jsonb,boolean) to service_role;
