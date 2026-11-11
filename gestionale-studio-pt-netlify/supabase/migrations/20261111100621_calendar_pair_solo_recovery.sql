-- Individual delivery consumes only the active person's existing PT 1:2 cycle.
-- Keep the ordinary two-person PT 1:2 contract unchanged.
create function public.calendar_plan_pair_solo(p_actor_id text,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor jsonb; c jsonb; partner jsonb; spec jsonb; a jsonb; r jsonb;
 receipt public.calendar_pt_pair_receipts; link jsonb; count_rows int; planned int;
 saved jsonb:='[]'; warnings jsonb:='[]'; result jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 if actor is null or not exists(select 1 from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]')) r where lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) then raise exception 'Recuperi individuali riservati alla Direzione';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients in share row exclusive mode;
 select * into receipt from public.calendar_pt_pair_receipts where request_id=p_request_id;
 if found then
  if receipt.actor_id<>p_actor_id or receipt.payload<>p_payload or receipt.result->>'mode' is distinct from 'pair_solo' then raise exception 'Identificativo già utilizzato';end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into saved from public.appointments x where x.id in(select value->>'id' from jsonb_array_elements(receipt.result->'appointments'));
  select to_jsonb(x) into c from public.clients x where x.id=p_payload->'clients'->0->>'id';
  return jsonb_build_object('mode','pair_solo','requestId',p_request_id,'appointments',saved,'clients',jsonb_build_array(c),'warnings',receipt.result->'warnings');
 end if;
 if p_payload->>'mode' is distinct from 'pair_solo' or jsonb_typeof(p_payload->'clients') is distinct from 'array' or jsonb_array_length(p_payload->'clients')<>1 or jsonb_typeof(p_payload->'appointments') is distinct from 'array' then raise exception 'Piano individuale non valido';end if;
 count_rows:=jsonb_array_length(p_payload->'appointments');if count_rows not between 1 and 100 then raise exception 'Seleziona da 1 a 100 recuperi';end if;
 spec:=p_payload->'clients'->0;
 if spec->'renewal' is not null and spec->'renewal'<>'null'::jsonb then raise exception 'I recuperi non rinnovano il pacchetto';end if;
 select to_jsonb(x) into c from public.clients x where x.id=spec->>'id';
 if c is null or c->>'active' is distinct from 'true' or lower(coalesce(c->>'stato_abbonamento','')) like '%ibern%' or not(c->'package_types' ? 'PT 1:2') then raise exception 'Serve un cliente attivo con pacchetto PT 1:2';end if;
 if nullif(spec->>'expectedUpdatedAt','') is null or (c->>'updated_at')::timestamptz is distinct from (spec->>'expectedUpdatedAt')::timestamptz then raise exception 'Pacchetto cambiato: ricarica e prepara una nuova anteprima';end if;
 select to_jsonb(x) into partner from public.clients x where x.id=c->>'pt_partner_id';
 if partner is null or partner->>'id' is distinct from p_payload->>'suspendedPartnerId' or partner->>'pt_partner_id' is distinct from c->>'id' or not(partner->'package_types' ? 'PT 1:2') or not(partner->>'active'='false' or lower(coalesce(partner->>'stato_abbonamento','')) like '%ibern%') then raise exception 'Il recupero individuale richiede il proprio partner sospeso';end if;
 if not exists(select 1 from public.operator_effective_roles o where o.operator_id=c->>'pt_assegnato' and o.active and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where lower(r.value) in ('pt','personal_trainer','personal trainer'))) then raise exception 'PT assegnato non attivo';end if;
 select count(*) into planned from public.appointments x where x.status='prenotato' and x.client_ids @> jsonb_build_array(c->>'id') and public.calendar_uses_current_session(to_jsonb(x)||jsonb_build_object('status','fatto','notes',regexp_replace(coalesce(x.notes,''),'"status":\s*"prenotato"','"status":"fatto"','g')),c);
 if count_rows>coalesce((c->>'sessions_remaining')::int,0)-planned then raise exception 'Recuperi superiori al residuo disponibile';end if;
 link:=public.calendar_pt_current_link(c);
 for a in select value from jsonb_array_elements(p_payload->'appointments') loop
  if a->>'service_id' is distinct from 'pt11' or a->>'status' is distinct from 'prenotato' or a->'client_ids' is distinct from jsonb_build_array(c->>'id') or a->>'operator_id' is distinct from c->>'pt_assegnato' or coalesce((a->>'duration_min')::int,0)<>60 or exists(select 1 from public.appointments x where x.id=a->>'id') then raise exception 'Seduta individuale non valida o già esistente';end if;
  if (a->>'date') is null or (a->>'date')::date<(clock_timestamp() at time zone 'Europe/Rome')::date or nullif(a->>'start_time','') is null then raise exception 'Indica data futura e orario del recupero';end if;
  a:=a||jsonb_build_object('notes','Recupero individuale da pacchetto PT 1:2'||case when coalesce(link->>'cycleId','')<>'' then ' [CICLO-PACCHETTO-ID '||(link->>'cycleId')||']' else '' end||case when coalesce(link->>'start','')<>'' then ' [CICLO-PACCHETTO '||(link->>'start')||']' else '' end);
  r:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'save',jsonb_build_object('appointment',a));
  saved:=saved||jsonb_build_array(r->'appointment');warnings:=warnings||coalesce(r->'warnings','[]');
 end loop;
 select to_jsonb(x) into c from public.clients x where x.id=c->>'id';
 result:=jsonb_build_object('mode','pair_solo','requestId',p_request_id,'appointments',saved,'clients',jsonb_build_array(c),'warnings',warnings);
 insert into public.calendar_pt_pair_receipts(request_id,actor_id,payload,result) values(p_request_id,p_actor_id,p_payload,result);
 return result;
end $$;
revoke all on function public.calendar_plan_pair_solo(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_plan_pair_solo(text,uuid,jsonb) to service_role;
