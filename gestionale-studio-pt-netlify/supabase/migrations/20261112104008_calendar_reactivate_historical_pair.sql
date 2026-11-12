-- Reactivation asks for the partner; pair validation is never bypassed.
create function public.calendar_reactivate_pair(p_actor_id text,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb; partner jsonb; previous_partner jsonb; actor jsonb; rows_out jsonb;
 receipt public.calendar_pt_pair_receipts; own_types jsonb; partner_types jsonb; result jsonb;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service gateway required';end if;
 select to_jsonb(o) into actor from public.operator_effective_roles o where o.operator_id=p_actor_id and o.active;
 if actor is null or not exists(select 1 from jsonb_array_elements_text(coalesce(actor->'system_roles','[]')||coalesce(actor->'legacy_roles','[]')) r where lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) then raise exception 'Riattivazione coppia riservata alla Direzione';end if;
 if p_request_id is null or p_payload->>'clientId' is null or p_payload->>'partnerId' is null or p_payload->>'clientId'=p_payload->>'partnerId' then raise exception 'Scegli due clienti distinti';end if;
 perform set_config('lock_timeout','5s',true);
 lock table public.appointments,public.clients in share row exclusive mode;
 select * into receipt from public.calendar_pt_pair_receipts where request_id=p_request_id;
 if found then
  if receipt.actor_id<>p_actor_id or receipt.payload is distinct from p_payload or receipt.result->>'mode'<>'reactivate_pair' then raise exception 'Identificativo gia utilizzato';end if;
  return receipt.result;
 end if;
 select to_jsonb(x) into c from public.clients x where x.id=p_payload->>'clientId';
 select to_jsonb(x) into partner from public.clients x where x.id=p_payload->>'partnerId';
 if c is null or c->>'active' is distinct from 'false' or not(c->'package_types' ? 'PT 1:2') then raise exception 'Seleziona un cliente PT 1:2 nello storico';end if;
 if partner is null or partner->>'active' is distinct from 'true' or lower(coalesce(partner->>'stato_abbonamento','')) like '%ibern%' or not(partner->'package_types' ? 'PT 1:1' or partner->'package_types' ? 'PT 1:2') then raise exception 'Il secondo cliente deve avere un pacchetto PT attivo';end if;
 if nullif(c->>'pt_assegnato','') is null or c->>'pt_assegnato' is distinct from partner->>'pt_assegnato' then raise exception 'Scegli due persone seguite dallo stesso PT';end if;
 if nullif(p_payload->>'expectedUpdatedAt','') is null or nullif(p_payload->>'partnerExpectedUpdatedAt','') is null or (c->>'updated_at')::timestamptz is distinct from (p_payload->>'expectedUpdatedAt')::timestamptz or (partner->>'updated_at')::timestamptz is distinct from (p_payload->>'partnerExpectedUpdatedAt')::timestamptz then raise exception 'Uno dei pacchetti e cambiato: aggiorna l’anteprima';end if;
 if partner->>'pt_partner_id' is not null and partner->>'pt_partner_id'<>c->>'id' then raise exception 'Il secondo cliente e gia associato a un’altra coppia';end if;
 if c->>'pt_partner_id' is not null and c->>'pt_partner_id'<>partner->>'id' then
  select to_jsonb(x) into previous_partner from public.clients x where x.id=c->>'pt_partner_id';
  if previous_partner->>'pt_partner_id'=c->>'id' and previous_partner->'package_types' ? 'PT 1:2' then raise exception 'La vecchia coppia e ancora associata: verifica prima il cambio di partner';end if;
 end if;
 select coalesce(jsonb_agg(value),'[]')||'"PT 1:2"'::jsonb into own_types from jsonb_array_elements(c->'package_types') where value not in ('"PT 1:1"'::jsonb,'"PT 1:2"'::jsonb);
 select coalesce(jsonb_agg(value),'[]')||'"PT 1:2"'::jsonb into partner_types from jsonb_array_elements(partner->'package_types') where value not in ('"PT 1:1"'::jsonb,'"PT 1:2"'::jsonb);
 rows_out:=public.calendar_audit_write(p_actor_id,'owner','calendar',p_request_id,'client',jsonb_build_object('method','PATCH','rows',jsonb_build_array(
  jsonb_build_object('id',c->>'id','active',true,'stato_abbonamento','Attivo','pt_partner_id',partner->>'id','package_types',own_types,'tipo_servizio','PT 1:2'),
  jsonb_build_object('id',partner->>'id','pt_partner_id',c->>'id','package_types',partner_types,'tipo_servizio','PT 1:2'))));
 result:=jsonb_build_object('mode','reactivate_pair','requestId',p_request_id,'clients',rows_out);
 insert into public.calendar_pt_pair_receipts(request_id,actor_id,payload,result) values(p_request_id,p_actor_id,p_payload,result);
 return result;
end $$;
revoke all on function public.calendar_reactivate_pair(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.calendar_reactivate_pair(text,uuid,jsonb) to service_role;
