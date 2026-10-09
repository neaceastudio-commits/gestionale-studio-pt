const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {start,seed}=require('./helpers/calendar-postgres.cjs');
(async()=>{const db=await start(),c=db.client;try{
 await seed(c);await c.query("insert into operators(id,email,roles) values('owner','owner@example.test',array['Direzione']);create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role");
 for(const name of ['20260912212042_calendar_activity_audit.sql','20260917133826_pt_portal_access_control.sql'])await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8'));
 const state=async()=>(await c.query("select portal_access_enabled,portal_access_version,active,roles from operators where id='pt'")).rows[0];
 assert.deepEqual(await state(),{portal_access_enabled:true,portal_access_version:0,active:true,roles:['PT']});
 async function set(enabled){await c.query('set role service_role');try{await c.query('select calendar_audit_write($1,$2,$3,$4,$5,$6)',['owner','owner','calendar',crypto.randomUUID(),'operator',JSON.stringify({method:'PATCH',rows:[{id:'pt',portal_access_enabled:enabled}]})]);}finally{await c.query('reset role')}}
 await set(false);assert.deepEqual(await state(),{portal_access_enabled:false,portal_access_version:1,active:true,roles:['PT']});
 const log=(await c.query("select before_data,after_data from calendar_audit_log where entity_type='operators' order by id desc limit 1")).rows[0];assert.equal(log.before_data.portal_access_enabled,true);assert.equal(log.after_data.portal_access_enabled,false);
 await set(false);assert.equal((await state()).portal_access_version,1);
 await set(true);assert.equal((await state()).portal_access_version,2);
 for(const role of ['anon','authenticated']){await c.query('set role '+role);await assert.rejects(c.query("update operators set portal_access_enabled=false where id='pt'"));await c.query('reset role')}
 assert.equal((await c.query("select pt_assegnato from clients where id='test'")).rows[0].pt_assegnato,'pt');
 console.log('PASS PostgreSQL: access flag, revocation version, immutable audit, public writes denied, assignments and Staff unchanged.');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
