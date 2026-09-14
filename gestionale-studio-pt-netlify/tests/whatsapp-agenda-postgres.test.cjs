const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { start, seed, rpc } = require('./helpers/calendar-postgres.cjs');
(async()=>{
 const pg=await start(),c=pg.client;let second;
 try{
  await seed(c);
  await c.query("insert into operators(id,nome,cognome,email,roles) values('owner','Direzione','TEST','owner@example.test',array['owner']);create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role");
  await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260912212042_calendar_activity_audit.sql'),'utf8'));
  const before=(await c.query("select jsonb_build_object('clients',(select jsonb_agg(to_jsonb(c)) from clients c),'appointments',(select jsonb_agg(to_jsonb(a)) from appointments a),'availability',(select jsonb_agg(to_jsonb(v)) from operator_availability v)) v")).rows[0].v;
  await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260914152909_whatsapp_agenda_pt_v1.sql'),'utf8'));
  assert.ok((await c.query('select whatsapp_phone,whatsapp_agenda_enabled from operators')).rows.every(o=>o.whatsapp_phone===null&&o.whatsapp_agenda_enabled===false));
  await c.query('set role service_role');
  await rpc(c,'calendar_audit_write',{p_actor_id:'owner',p_actor_role:'owner',p_source:'calendar',p_request_id:'00000000-0000-4000-8000-000000000001',p_operation:'operator',p_payload:{method:'PATCH',rows:[{id:'pt',whatsapp_phone:'+393331234567',whatsapp_agenda_enabled:true}]}});
  const saved=(await c.query("select whatsapp_phone,whatsapp_agenda_enabled from operators where id='pt'")).rows[0];assert.equal(saved.whatsapp_agenda_enabled,true);assert.equal(saved.whatsapp_phone,'+393331234567');
  await assert.rejects(rpc(c,'calendar_audit_write',{p_actor_id:'pt',p_actor_role:'pt',p_source:'calendar',p_request_id:'00000000-0000-4000-8000-000000000002',p_operation:'operator',p_payload:{method:'PATCH',rows:[{id:'pt',whatsapp_phone:'+393331234569'}]}}),/direction/i);
  await assert.rejects(rpc(c,'calendar_audit_write',{p_actor_id:'owner',p_actor_role:'owner',p_source:'calendar',p_request_id:'00000000-0000-4000-8000-000000000003',p_operation:'operator',p_payload:{method:'PATCH',rows:[{id:'pt',whatsapp_phone:'123'}]}}),/check constraint/);
  await c.query('reset role');
  assert.ok(!JSON.stringify((await c.query('select * from calendar_audit_log')).rows).includes('+393331234567'),'No phone copied into existing audit');
  for(const role of ['anon','authenticated']){
   await c.query('set role '+role);
   for(const q of ["select * from whatsapp_agenda_sends","select whatsapp_agenda_claim('2026-09-14','pt')","update operators set whatsapp_agenda_enabled=true","delete from whatsapp_agenda_sends"] )await assert.rejects(c.query(q),/permission denied/);
   await c.query('reset role');
  }
  second=await pg.connection();await c.query('set role service_role');await second.query('set role service_role');
  const results=await Promise.all([c.query("select whatsapp_agenda_claim('2026-09-14','pt') claimed"),second.query("select whatsapp_agenda_claim('2026-09-14','pt') claimed")]);
  assert.deepEqual(results.map(r=>r.rows[0].claimed).sort(),[false,true]);
  assert.equal((await c.query("select count(*)::int n from whatsapp_agenda_sends")).rows[0].n,1);
  await c.query("select whatsapp_agenda_finish('2026-09-14','pt','uncertain',null,'provider_outcome_unknown')");
  assert.equal((await second.query("select whatsapp_agenda_claim('2026-09-14','pt') claimed")).rows[0].claimed,false);
  assert.equal((await c.query("select whatsapp_agenda_claim('2026-09-15','pt') claimed")).rows[0].claimed,true);
  assert.equal((await c.query("select whatsapp_agenda_claim('2026-09-14','pt2') claimed")).rows[0].claimed,true);
  await assert.rejects(c.query('delete from whatsapp_agenda_sends'),/permission denied/);
  await c.query('reset role');
  const after=(await c.query("select jsonb_build_object('clients',(select jsonb_agg(to_jsonb(c)) from clients c),'appointments',(select jsonb_agg(to_jsonb(a)) from appointments a),'availability',(select jsonb_agg(to_jsonb(v)) from operator_availability v)) v")).rows[0].v;assert.deepEqual(after,before);
  console.log('PASS PostgreSQL: default disabled, E.164, Direction gateway, unchanged operational data, private ledger, two concurrent connections one claim, uncertain never retried, next day independent');
 }finally{if(second)await second.end();await pg.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
