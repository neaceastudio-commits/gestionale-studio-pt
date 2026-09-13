const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http'),{spawn}=require('node:child_process');
const {start,rpc}=require('./helpers/calendar-postgres.cjs');
(async()=>{const pg=await start(),c=pg.client,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'apple-sync-')),originalFetch=global.fetch;let server;
try{
 await c.query(`insert into operators(id,nome,email,roles) values('owner','Direction','owner@example.test',array['owner']),('TEST_PT','TEST','pt@example.test',array['PT']);
 insert into clients(id,nome,sessions_total,sessions_remaining,package_types,package_start,pt_assegnato) values('TEST_CLIENT','TEST',8,8,array['PT 1:1'],'2026-09-15','TEST_PT');
 insert into operator_availability values('TEST_PT','tue','["08:00-22:00"]',now());
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;`);
 for(const name of ['20260912212042_calendar_activity_audit.sql','20260912225335_calendar_audit_assignment_partial_unique.sql'])await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8'));
 const write=async body=>{await c.query('set role service_role');try{return await rpc(c,'calendar_audit_write',body)}finally{await c.query('reset role')}};
 const edit=async appointment=>write({p_actor_id:'owner',p_actor_role:'owner',p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'save',p_payload:{appointment,expected:(await row())||undefined}});
 const row=async()=> (await c.query("select to_jsonb(a) r from appointments a where id='TEST_ONE'")).rows[0]?.r||null;
 await edit({id:'TEST_ONE',service_id:'pt11',client_ids:['TEST_CLIENT'],operator_id:'TEST_PT',date:'2026-09-15',start_time:'17:00:00',duration_min:60,buffer_min:0,status:'prenotato',notes:'DO_NOT_EXPORT'});
 Object.assign(process.env,{PT_ACCESS_SECRET:'SIM_ONLY',SUPABASE_SERVICE_ROLE_KEY:'SIM_ONLY',APPLE_TEST_SYNC_ENABLED:'true',APPLE_TEST_APPOINTMENT_IDS:'TEST_ONE'});
 const payload=Buffer.from(JSON.stringify({operatorId:'owner',email:'owner@example.test',accessLevel:'owner',exp:Date.now()+600000})).toString('base64url');const token=payload+'.'+crypto.createHmac('sha256','SIM_ONLY').update(payload).digest('base64url');
 global.fetch=async(url,opts)=>{try{const u=new URL(url);let data;if(u.pathname.endsWith('/operator_effective_roles'))data=(await c.query("select * from operator_effective_roles where operator_id=$1",[u.searchParams.get('operator_id').slice(3)])).rows;else if(u.pathname.endsWith('/appointments'))data=[await row()];else if(u.pathname.endsWith('/rpc/calendar_audit_write'))data=await write(JSON.parse(opts.body));else throw Error('Unexpected database endpoint');return {ok:true,text:async()=>JSON.stringify(data)}}catch(e){return{ok:false,status:409,text:async()=>JSON.stringify({message:e.message})}}};
 const handler=require('../netlify/functions/apple-test-sync').handler;
 const call=async input=>handler({httpMethod:'POST',body:JSON.stringify({accessToken:token,id:'TEST_ONE',...input})});
 const ics=hour=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:neacea-test-TEST_ONE\r\nDTSTART;TZID=Europe/Rome:20260915T${hour}0000\r\nDTEND;TZID=Europe/Rome:20260915T${Number(hour)+1}0000\r\nSUMMARY:TEST\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
 let event=ics('17'),version=1,readError=false,etagRace=false;const requests=[];
 server=http.createServer(async(req,res)=>{try{let body='';for await(const chunk of req)body+=chunk;
 requests.push(req.method+' '+req.url);
 if(req.url==='/gateway'){const r=await handler({httpMethod:req.method,body});res.writeHead(r.statusCode,r.headers);return res.end(r.body)}
 if(req.headers.authorization!=='Basic '+Buffer.from('SIM:SIM').toString('base64')){res.writeHead(401);return res.end()}
 if(req.method==='PROPFIND'){res.writeHead(207);return res.end('<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:propstat><d:prop><d:displayname>NEACEA TEST — Gianluca</d:displayname><d:resourcetype><c:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>')}
 assert.equal(req.url,'/test/one.ics');
 if(req.method==='GET'){res.writeHead(readError?500:event?200:404,{'ETag':`"${version}"`});return res.end(event||'')}
 if(etagRace||req.headers['if-match']!==`"${version}"`){res.writeHead(412);return res.end()}
 if(req.method==='PUT')event=body;else if(req.method==='DELETE')event=null;else throw Error('Unexpected method');version++;res.writeHead(204);res.end();
 }catch(e){res.writeHead(500);res.end('Simulation error')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const env={...process.env,APPLE_TEST_CALDAV_URL:base+'/test/',APPLE_TEST_CALDAV_USER:'SIM',APPLE_TEST_CALDAV_PASSWORD:'SIM',APPLE_TEST_GATEWAY_URL:base+'/gateway',APPLE_TEST_ACCESS_TOKEN:token,APPLE_TEST_MAPPING_DB:path.join(tmp,'mapping.sqlite'),APPLE_TEST_LOCAL_SIMULATION:'true'};
 const run=(args=['once'],success=true)=>new Promise((resolve,reject)=>{const child=spawn('python3',[path.join(__dirname,'../tools/apple-test-sync/sync.py'),...args],{env});let out='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>out+=b);child.on('error',reject);child.on('close',code=>{try{assert.equal(code,success?0:1,out);resolve(out)}catch(e){reject(e)}})});
 const balance=async()=>assert.equal((await c.query("select sessions_remaining from clients where id='TEST_CLIENT'")).rows[0].sessions_remaining,8);
 await run(['link','--appointment','TEST_ONE','--href','one.ics']);
 event=ics('18');version++;await run();assert.equal((await row()).start_time,'18:00:00');await balance();console.log('PASS Apple 17→18 → NEACEA 18; residue 8');
 await edit({...await row(),start_time:'19:00:00'});await run();assert.match(event,/DTSTART:20260915T170000Z/);await balance();console.log('PASS NEACEA 18→19 → Apple 19; residue 8');
 event=null;version++;await run();assert.equal((await row()).status,'annullato');await balance();console.log('PASS Apple deletion → annullato; residue 8');
 await run();await balance(); // Persistent mapping reload and idempotent retry.
 assert.equal((await call({operation:'save',expected:JSON.parse((await call({operation:'read'})).body),patch:{sessions_remaining:0}})).statusCode,400);
 assert.equal((await handler({httpMethod:'POST',body:JSON.stringify({id:'TEST_ONE',operation:'read',accessToken:token+'x'})})).statusCode,403);
 // Reset only local fixtures, then verify protected states, recurrence, errors and conflicts.
 await edit({...await row(),status:'prenotato',start_time:'19:00:00'});event=ics('19');version++;await run();
 readError=true;await run(['once'],false);readError=false;assert.equal((await row()).status,'prenotato');
 event=ics('19').replace('SUMMARY:TEST','RRULE:FREQ=DAILY\r\nSUMMARY:TEST');await run(['once'],false);event=ics('19');
 await edit({...await row(),start_time:'20:00:00'});event=ics('18');await run(['once'],false);assert.equal((await row()).start_time,'20:00:00');
 event=ics('19');etagRace=true;await run(['once'],false);etagRace=false;await run();
 await edit({...await row(),status:'fatto'});event=null;await run(['once'],false);assert.equal((await row()).status,'fatto');assert.equal((await c.query("select sessions_remaining from clients")).rows[0].sessions_remaining,7);
 assert.equal((await call({operation:'save',expected:JSON.parse((await call({operation:'read'})).body),patch:{status:'annullato'}})).statusCode,409);
 await edit({...await row(),status:'noshow'});await run(['once'],false);await balance();
 await edit({...await row(),status:'prenotato'});event=ics('20');await run();await edit({...await row(),status:'annullato'});await run();assert.equal(event,null);await balance();
 const logs=(await c.query("select * from calendar_audit_log where source='calendar'")).rows;assert.ok(logs.length>=2);assert.ok(logs.every(l=>l.actor_operator_id==='owner'));assert.ok(!JSON.stringify(logs).includes('DO_NOT_EXPORT'));
 assert.ok(requests.every(r=>r.endsWith('/gateway')||r.endsWith('/test/')||r.endsWith('/test/one.ics')));console.log('PASS persistence, idempotence, actor/audit, forbidden fields, Fatto/no-show, recurrence, errors, conflict, ETag and NEACEA cancellation guards');
}finally{global.fetch=originalFetch;if(server)await new Promise(r=>server.close(r));await pg.close();fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
