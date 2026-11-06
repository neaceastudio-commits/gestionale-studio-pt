-- Synthetic smoke against the installed schema. The inner subtransaction is
-- deliberately rolled back, including clients, operator, bookings and audit.
do $smoke$
declare actor text; prefix text:='_codex_recovery_smoke_20261106_'; pt text; a text; b text; sid text;
 ledger jsonb; row_data jsonb; source jsonb; result jsonb; retried jsonb; id text; proof jsonb;
begin
 perform set_config('role','service_role',true);
 perform set_config('lock_timeout','5s',true);
 perform set_config('statement_timeout','20s',true);
 if exists(select 1 from public.clients where starts_with(clients.id,prefix)) or exists(select 1 from public.operators where starts_with(operators.id,prefix)) then raise exception 'Synthetic prefix already exists';end if;
 select o.operator_id into actor from public.operator_effective_roles o where o.active and exists(select 1 from jsonb_array_elements_text(coalesce(to_jsonb(o)->'system_roles','[]')||coalesce(to_jsonb(o)->'legacy_roles','[]')) r where lower(r.value) in ('owner','admin','administrator','amministratore','titolare','super_admin','direzione')) order by o.operator_id limit 1;
 if actor is null then raise exception 'Verified owner missing';end if;
 pt:=prefix||gen_random_uuid()::text;a:=prefix||'a';b:=prefix||'b';sid:=prefix||'source';
 begin
  perform public.calendar_audit_write(actor,'owner','calendar',gen_random_uuid(),'operator',jsonb_build_object('rows',jsonb_build_array(jsonb_build_object('id',pt,'nome','TEST RECOVERY','cognome','SYNTHETIC','email','recovery-smoke@example.invalid','roles',jsonb_build_array('PT'),'active',true,'portal_access_enabled',false,'whatsapp_agenda_enabled',false))));
  foreach id in array array[a,b] loop
   ledger:=jsonb_build_object('version',1,'cycles',jsonb_build_array(jsonb_build_object('id',id,'startDate','2099-10-01','closedAt','','legacy',false,'sessionsTotal',12,'amount',0,'payments','[]'::jsonb,'days',jsonb_build_array('Lunedì','Mercoledì','Giovedì'),'time','17:00','operatorId',pt)));
   perform public.calendar_audit_write(actor,'owner','calendar',gen_random_uuid(),'client',jsonb_build_object('rows',jsonb_build_array(jsonb_build_object('id',id,'nome','TEST RECOVERY','cognome','SYNTHETIC','package_types',jsonb_build_array('PT 1:1'),'sessions_total',12,'sessions_remaining',12,'pt_assegnato',pt,'package_start','2099-10-01','data_conferma','2099-10-01','giorni_settimana',jsonb_build_array('Lunedì','Mercoledì','Giovedì'),'notes','[NEACEA-PACKAGE-LEDGER-V1]'||ledger::text||'[/NEACEA-PACKAGE-LEDGER-V1]'))));
  end loop;
  select to_jsonb(c) into row_data from public.clients c where c.id=a;
  perform public.calendar_save_pair_client(actor,gen_random_uuid(),jsonb_build_object('client',row_data||jsonb_build_object('package_types',jsonb_build_array('PT 1:2'),'pt_partner_id',b),'expectedUpdatedAt',row_data->>'updated_at'));
  row_data:=jsonb_build_object('id',sid,'service_id','pt12','client_ids',jsonb_build_array(a,b),'operator_id',pt,'date','2099-11-02','start_time','17:00:00','duration_min',60,'buffer_min',10,'status','fatto','notes','Synthetic recovery smoke; rolled back');
  source:=public.calendar_audit_write(actor,'owner','calendar',gen_random_uuid(),'save',jsonb_build_object('appointment',row_data))->'appointment';
  perform public.calendar_audit_write(actor,'owner','calendar',gen_random_uuid(),'save',jsonb_build_object('appointment',row_data||jsonb_build_object('id',prefix||'tail','date','2099-11-04','status','prenotato')));
  perform public.calendar_audit_write(actor,'owner','calendar',gen_random_uuid(),'save',jsonb_build_object('appointment',row_data||jsonb_build_object('id',prefix||'busy','service_id','blocco','client_ids','[]'::jsonb,'date','2099-11-05','status','prenotato')));
  result:=public.calendar_cancel_and_recover(actor,'owner',gen_random_uuid(),source);
  if result->'appointment'->>'status'<>'annullato' or result->'recovery'->>'date'<>'2099-11-05' or result->'recovery'->>'start_time'<>'17:00:00' or result->'recovery'->'client_ids' is distinct from jsonb_build_array(a,b) then raise exception 'Recovery slot or participants mismatch';end if;
  if not(result->'planning_warnings' ? 'operator_overlap') then raise exception 'Missing overlap alert';end if;
  if exists(select 1 from public.clients c where c.id in (a,b) and c.sessions_remaining<>12) then raise exception 'Refund mismatch';end if;
  retried:=public.calendar_cancel_and_recover(actor,'owner',gen_random_uuid(),source);
  if retried->'recovery'->>'id' is distinct from result->'recovery'->>'id' then raise exception 'Retry duplicated recovery';end if;
  if (select count(*) from public.appointments x where x.id='recovery_'||md5(sid))<>1 then raise exception 'Recovery persistence mismatch';end if;
  proof:=jsonb_build_object('pair',true,'refund',true,'overlap',true,'retry',true,'databaseReadBack',true);
  raise exception using errcode='PT001',message='ROLLBACK_SYNTHETIC_RECOVERY_SMOKE';
 exception when sqlstate 'PT001' then
  if sqlerrm<>'ROLLBACK_SYNTHETIC_RECOVERY_SMOKE' then raise;end if;
 end;
 if proof is null or exists(select 1 from public.clients c where starts_with(c.id,prefix)) or exists(select 1 from public.operators o where starts_with(o.id,prefix)) or exists(select 1 from public.appointments x where starts_with(x.id,prefix) or x.id='recovery_'||md5(sid)) then raise exception 'Synthetic rollback verification failed';end if;
end $smoke$;
select 'PASS: installed SQL pair recovery, refund, overlap alert, retry, read-back and complete synthetic rollback' as smoke_result;
