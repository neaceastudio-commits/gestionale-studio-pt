const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {start,seed,rpc}=require('./helpers/calendar-postgres.cjs');
(async()=>{const pg=await start(),c=pg.client,original=global.fetch;try{
 await seed(c);
 await c.query("insert into operators(id,nome,cognome,email,roles) values('owner','Direzione','SIM','owner@example.test',array['owner']);create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role");
 for(const migration of ['20260912212042_calendar_activity_audit.sql','20260912225335_calendar_audit_assignment_partial_unique.sql','20260913211931_calendar_flex_mode.sql','20260914141653_acquisition_calendar_flex_snapshot.sql'])await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',migration),'utf8'));
 process.env.PT_ACCESS_SECRET='test-only';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const {handler}=require('../netlify/functions/schedule-client-package');
 const p=Buffer.from(JSON.stringify({email:'owner@example.test',operatorId:'owner',accessLevel:'owner',exp:Date.now()+3600000})).toString('base64url');const accessToken=p+'.'+crypto.createHmac('sha256','test-only').update(p).digest('base64url');
 let flipBeforeCommit=false,writes=0;
 global.fetch=async(url,options)=>{const name=new URL(url).pathname.split('/').pop();if(name==='operator_effective_roles')return {ok:true,text:async()=>JSON.stringify([{operator_id:'owner',system_roles:['owner']}])};const b=JSON.parse(options.body||'{}');if(name==='calendar_audit_write'){writes++;if(flipBeforeCommit){flipBeforeCommit=false;await c.query('update calendar_runtime_flags set enabled=false')}}const connection=await pg.connection();try{await connection.query('set role service_role');const result=await rpc(connection,name,b);return {ok:true,text:async()=>JSON.stringify(result)}}finally{await connection.end()}};
 const request=async patch=>{const result=await handler({httpMethod:'POST',body:JSON.stringify({accessToken,serviceId:'pt11',operatorId:'pt',startDate:'2026-09-15',schedule:[{weekday:'Martedì',time:'06:15',durationMin:30},{weekday:'Giovedì',time:'18:15',durationMin:45}],...patch})});return {status:result.statusCode,...JSON.parse(result.body)}};
 const before=(await c.query("select md5(string_agg(to_jsonb(c)::text,'' order by id)) hash from clients c")).rows[0].hash;
 await c.query('update calendar_runtime_flags set enabled=true');
 const preview=await request({dryRun:true,preview:{sessionsTotal:8,sessionsUsed:0}});assert.equal(preview.status,200);assert.equal(preview.appointments.length,8);assert.ok(preview.plan.warnings.length);assert.equal(preview.plan.skipped.length,0);assert.equal(writes,0);assert.equal((await c.query('select count(*)::int n from appointments')).rows[0].n,0);
 assert.equal((await request({preview:{sessionsTotal:8,sessionsUsed:0}})).status,400,'preview input cannot write');
 assert.equal((await request({dryRun:true,preview:{sessionsTotal:8,sessionsUsed:9}})).status,400);
 const changed=await request({clientId:'test',confirmation:{...preview.confirmation,slots:[]}});assert.equal(changed.code,'preview_changed');assert.equal(writes,0);
 flipBeforeCommit=true;const raced=await request({clientId:'test',confirmation:preview.confirmation});assert.equal(raced.code,'calendar_changed');assert.equal((await c.query('select count(*)::int n from appointments')).rows[0].n,0);assert.equal((await c.query('select count(*)::int n from calendar_audit_log')).rows[0].n,0);
 const strict=await request({dryRun:true,preview:{sessionsTotal:8,sessionsUsed:0},flexMode:true});assert.equal(strict.plan.flexMode,false,'browser cannot force flag');assert.ok(strict.plan.skipped.length);assert.ok(strict.appointments.every(a=>a.startTime!=='06:15'));
 await c.query('update calendar_runtime_flags set enabled=true');
 const result=await request({clientId:'test',confirmation:preview.confirmation});assert.equal(result.status,200);assert.equal(result.appointmentIds.length,8);
 const rows=(await c.query('select date::text,start_time::text,duration_min,operator_id,service_id from appointments order by date,start_time')).rows;
 assert.deepEqual(rows.map(a=>({date:a.date,startTime:a.start_time.slice(0,5),durationMin:a.duration_min,operatorId:a.operator_id,serviceId:a.service_id})),preview.confirmation.slots);
 assert.equal((await request({clientId:'test',confirmation:preview.confirmation})).plan.created,0,'lost response retry never duplicates');
 assert.equal((await c.query("select count(*)::int n from calendar_audit_log where action='package_appointment_created' and source='acquisition' and actor_operator_id='owner'")).rows[0].n,8);
 assert.equal((await c.query("select md5(string_agg(to_jsonb(c)::text,'' order by id)) hash from clients c")).rows[0].hash,before,'saved balances/packages/clients unchanged');
 // Duration validation under the same lock rejects a whole invalid package.
 const snap=await rpc(c,'calendar_planning_snapshot');await c.query('set role service_role');try{await assert.rejects(rpc(c,'calendar_audit_write',{p_actor_id:'owner',p_actor_role:'owner',p_source:'acquisition',p_request_id:crypto.randomUUID(),p_operation:'package',p_payload:{revision:snap.revision,clientId:'test',rows:[{...snap.appointments[0],id:'bad_duration',duration_min:20}]}}),/Duration/)}finally{await c.query('reset role')}
 assert.equal((await c.query('select count(*)::int n from appointments')).rows[0].n,8);
 console.log('PASS preview read-only → exact 8 mixed-duration dates, flex warnings, authoritative flag, flag race rollback, audit, retry idempotence, unchanged balances/history');
}finally{global.fetch=original;await pg.close()}})().catch(e=>{console.error(e);process.exitCode=1});
