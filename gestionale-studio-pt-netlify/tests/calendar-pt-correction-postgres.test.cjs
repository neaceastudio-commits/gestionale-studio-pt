const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {start,seed,rpc}=require('./helpers/calendar-postgres.cjs');
(async()=>{
 const db=await start(),c=db.client;
 try{
  await seed(c);
  await c.query(`insert into operators(id,nome,email,roles) values('owner','TEST','test@example.test',array['owner']);
   create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;
   grant select on operator_effective_roles to service_role;
   insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,buffer_min,status,notes) values
   ('a','pt11',array['test'],'pt','2026-09-15','17:00',60,10,'fatto',''),('b','pt11',array['other'],'pt','2026-09-15','17:00',60,10,'fatto',''),
   ('c','pt12',array['test'],'pt','2026-09-17','17:00',60,10,'prenotato',''),
   ('d','pt11',array['test'],'pt','2026-09-19','17:00',60,10,'fatto','[CICLO-PACCHETTO-ID A]'),
   ('e','pt11',array['other'],'pt','2026-09-19','17:00',60,10,'fatto','[CICLO-PACCHETTO-ID B]');
   update clients set sessions_remaining=7;`);
  for(const file of ['20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql'])await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
  const row=async id=>(await c.query('select to_jsonb(a) r from appointments a where id=$1',[id])).rows[0].r;
  const apply=async(changes,actor='owner',role='service_role')=>{await c.query('set role '+role);try{return(await c.query('select calendar_correct_pt_sessions($1,$2,$3) r',[actor,crypto.randomUUID(),JSON.stringify(changes)])).rows[0].r;}finally{await c.query('reset role');}};
  const pair={before:await row('a'),partner:await row('b'),serviceId:'pt12'};
  await assert.rejects(apply([pair],'pt'),/Direzione/);
  await assert.rejects(apply([pair],'owner','anon'),/permission denied/);
  await assert.rejects(apply([pair,pair]),/duplicata/);
  await assert.rejects(apply([{...pair,partner:{...pair.partner,status:'prenotato'}}]),/cambiata/);
  // A later invalid change rolls back the earlier valid merge and its audit records.
  await assert.rejects(apply([pair,{before:await row('c'),serviceId:'pt12'}]),/secondo cliente/);
  assert.equal((await row('b')).status,'fatto');assert.equal((await row('a')).service_id,'pt11');
  assert.equal((await c.query('select count(*)::int n from calendar_audit_log')).rows[0].n,0);
  const result=await apply([pair]);assert.equal(result.appointments.length,2);
  assert.deepEqual((await row('a')).client_ids,['test','other']);assert.equal((await row('b')).status,'annullato');
  assert.deepEqual((await c.query('select sessions_remaining from clients order by id')).rows.map(x=>x.sessions_remaining),[7,7]);
  assert.equal((await c.query("select sum(duration_min)::int n from appointments where status='fatto' and date='2026-09-15'")).rows[0].n,60);
  await assert.rejects(apply([pair]),/cambiata/,'uncertain retry cannot decrement twice');
  await apply([{before:await row('c'),serviceId:'pt11'}]);assert.equal((await row('c')).service_id,'pt11');
  const logs=(await c.query("select * from calendar_audit_log where action='pt_sessions_corrected'")).rows;
  assert.equal(logs.length,3);assert.ok(logs.every(x=>x.actor_operator_id==='owner'));assert.equal(logs[0].metadata.mergedAppointmentId,'b');
  // Donor training records prevent loss of the existing workout reference.
  await c.query('create table pt_session_records(appointment_id text); grant select on pt_session_records to service_role;');
  await c.query("insert into pt_session_records values('e')");
  const otherPair={before:await row('d'),partner:await row('e'),serviceId:'pt12'};
  await assert.rejects(apply([otherPair]),/scheda allenamento compilata/);
  assert.equal((await row('e')).status,'fatto');
  await c.query('delete from pt_session_records');
  await c.query('set role service_role');
  try { await rpc(c,'calendar_audit_write',{p_actor_id:'owner',p_actor_role:'owner',p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'client',p_payload:{method:'PATCH',rows:['test','other'].map((id,i)=>({id,notes:'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({cycles:[{id:i?'B':'A',startDate:'2026-09-15',legacy:false}]})+'[/NEACEA-PACKAGE-LEDGER-V1]'}))}}); }
  finally { await c.query('reset role'); }
  await assert.rejects(apply([otherPair]),/Cicli pacchetto diversi/);
  assert.equal((await row('d')).service_id,'pt11');assert.equal((await row('e')).status,'fatto');
  assert.deepEqual((await c.query('select sessions_remaining from clients order by id')).rows.map(x=>x.sessions_remaining),[7,7]);
  const acl=(await c.query("select prosecdef from pg_proc where oid='public.calendar_correct_pt_sessions(text,uuid,jsonb)'::regprocedure")).rows[0];assert.equal(acl.prosecdef,false);

  const shared=await row('a');
  await assert.rejects(apply([{before:shared,serviceId:'pt11'}]),/separare/);
  console.log('PASS: atomic merge, past sessions, unchanged balances, type correction, stale retry, owner-only access and rollback');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
