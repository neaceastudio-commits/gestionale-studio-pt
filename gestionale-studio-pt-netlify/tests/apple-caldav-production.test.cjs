const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {start,seed,rpc}=require('./helpers/calendar-postgres.cjs');
const core=require('../tools/apple-caldav-production/functions/lib/core.cjs');
class Store{constructor(){this.m=new Map;this.v=0}async getWithMetadata(k){const x=this.m.get(k);return x?structuredClone(x):null}async get(k){return (await this.getWithMetadata(k))?.data||null}async getMetadata(k){return this.getWithMetadata(k)}async setJSON(k,data,o={}){const old=this.m.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};const etag=String(++this.v);this.m.set(k,{data:structuredClone(data),etag});return {modified:true,etag}}async list({prefix}){return{blobs:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}async delete(k){this.m.delete(k)}}
(async()=>{const pg=await start(),c=pg.client;try{
 await seed(c);await c.query("insert into operators(id,nome,cognome,email,roles) values('staff_1','Gianluca','SIM','owner@example.test',array['owner']);create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role");
 for(const f of ['20260912212042_calendar_activity_audit.sql','20260912225335_calendar_audit_assignment_partial_unique.sql'])await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
 const write=async body=>{await c.query('set role service_role');try{return await rpc(c,'calendar_audit_write',body)}finally{await c.query('reset role')}};
 const edit=async row=>write({p_actor_id:'staff_1',p_actor_role:'owner',p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'save',p_payload:{appointment:row}});
 const row=async()=> (await c.query("select to_jsonb(a) r from appointments a where id='TEST_CLOUD'")).rows[0].r;
 const date='2026-09-15';await edit({id:'TEST_CLOUD',service_id:'pt11',client_ids:['test'],operator_id:'pt',date,start_time:'17:00:00',duration_min:60,buffer_min:0,status:'prenotato',notes:'PRIVATE_CLINICAL'});
 const created=(await row()).created_at;
 const env={SITE_NAME:'neacea-caldav-gianluca',SITE_ID:'SIM',APPLE_CALDAV_SITE_ID:'SIM',APPLE_CALDAV_ACTOR_ID:'staff_1',APPLE_CALDAV_USER:'ventofresco55@gmail.com',APPLE_CALDAV_SYNC_ENABLED:'true',APPLE_CALDAV_URL:'https://p00-caldav.icloud.com/test/',APPLE_CALDAV_START_AT:'2026-09-01T00:00:00Z'};
 let failRead=false,failPut=false;
 const objects=new Map;let etag=0;
 const cal={verify:async()=>{},read:async h=>{if(failRead)throw Error('HTTP 500');return structuredClone(objects.get(h)||null)},put:async(h,ics,tag)=>{if(failPut)throw Error('412');const old=objects.get(h);assert.equal(old?.etag,tag);objects.set(h,{ics,etag:String(++etag)})},delete:async(h,tag)=>{assert.equal(objects.get(h).etag,tag);objects.delete(h)}};
 const db=async(table,{query='',body}={})=>{if(table==='rpc/calendar_audit_write')return write(body);assert.ok(['clients','appointments','operators','operator_effective_roles'].includes(table));let rows=(await c.query(`select to_jsonb(a) r from ${table} a`)).rows.map(x=>x.r);const q=new URLSearchParams(query.slice(1));if(q.has('operator_id'))rows=rows.filter(x=>x.operator_id===q.get('operator_id').slice(3));if(q.has('id'))rows=rows.filter(x=>x.id===q.get('id').slice(3));if(q.has('offset'))rows=rows.slice(+q.get('offset'),+q.get('offset')+1000);if(q.has('created_at'))rows=rows.filter(x=>Date.parse(x.created_at)>=Date.parse(q.get('created_at').slice(4)));if(q.has('status'))rows=rows.filter(x=>q.get('status').startsWith('neq.')?x.status!==q.get('status').slice(4):x.status===q.get('status').slice(3));return rows};
 const store=new Store,s=core.service({env,db,cal,store});
 for(const patch of [{date:'2020-01-01'},{status:'annullato'},{service_id:'nutrizione'}]){
  const denied=core.service({env,cal,store:new Store,db:async(t,o)=>{const rows=await db(t,o);return t==='appointments'?rows.map(r=>({...r,...patch})):rows}});
  assert.equal((await denied.linkStatus('TEST_CLOUD')).eligible,false);await assert.rejects(denied.link('TEST_CLOUD'),/future PT/);
 }

 const balance=async()=>assert.equal((await c.query("select sessions_remaining from clients where id='test'")).rows[0].sessions_remaining,8);
 await s.provision('TEST_CLOUD');assert.equal(objects.size,1);const href=[...objects.keys()][0];let a=await cal.read(href);assert.ok(!a.ics.includes('PRIVATE_CLINICAL'));assert.ok(!a.ics.includes('METHOD:'));assert.ok(!a.ics.includes('RRULE:'));
 await cal.put(href,core.rewrite(a.ics,{date,start_time:'18:00',duration_min:60}),a.etag);await s.run();assert.equal((await row()).start_time,'18:00:00');await balance();console.log('PASS cloud Apple 17→18; balance 8');
 await edit({...await row(),start_time:'19:00:00'});await s.run();a=await cal.read(href);assert.equal(core.parse(a.ics).slot.start_time,'19:00');await balance();console.log('PASS cloud NEACEA 18→19; balance 8');
 await cal.delete(href,a.etag);await s.run();assert.equal((await row()).status,'annullato');await balance();console.log('PASS cloud Apple delete→annullato; balance 8');
 await s.run();await balance();await s.removeMapping('TEST_CLOUD');assert.equal((await store.list({prefix:'mapping/'})).blobs.length,0);
 // New application bookings only; old rows and unknown Apple events are never imported.
 await edit({...await row(),status:'prenotato'});env.APPLE_CALDAV_START_AT=new Date(Date.parse(created)+60000).toISOString();await assert.rejects(s.provision('TEST_CLOUD'),/Historical/);await s.run();assert.equal(objects.size,0);
 assert.deepEqual(await s.linkStatus('TEST_CLOUD'),{eligible:true,linked:false});
 failPut=true;await assert.rejects(s.link('TEST_CLOUD'),/412/);assert.equal(objects.size,0);failPut=false;await s.run();assert.equal(objects.size,1);await s.link('TEST_CLOUD');const first=await cal.read(href);await s.link('TEST_CLOUD');assert.equal(objects.size,1);assert.deepEqual(await cal.read(href),first);await balance();
 assert.equal((await s.linkStatus('TEST_CLOUD')).linked,true);
 a=await cal.read(href);await cal.put(href,core.rewrite(a.ics,{date,start_time:'18:00',duration_min:60}),a.etag);await s.run();assert.equal((await row()).start_time,'18:00:00');await balance();
 await edit({...await row(),start_time:'19:00:00'});await s.run();
 console.log('PASS manual historical one-to-one link, persistent mapping, repeated click unchanged, Apple→NEACEA, balance 8');
 env.APPLE_CALDAV_START_AT='2026-09-01T00:00:00Z';
 failRead=true;const result=await s.run();assert.equal(result.errors,1);assert.equal((await row()).status,'prenotato');failRead=false;
 a=await cal.read(href);await cal.put(href,core.rewrite(a.ics,{date,start_time:'18:00',duration_min:60}),a.etag);await edit({...await row(),start_time:'20:00:00'});assert.equal((await s.run()).errors,1);assert.equal((await row()).start_time,'20:00:00');
 a=await cal.read(href);await cal.put(href,core.rewrite(a.ics,{date,start_time:'19:00',duration_min:60}),a.etag);failPut=true;assert.equal((await s.run()).errors,1);failPut=false;await s.run();
 await edit({...await row(),status:'fatto'});a=await cal.read(href);await cal.delete(href,a.etag);await s.run();assert.equal((await row()).status,'fatto');assert.equal((await c.query("select sessions_remaining from clients where id='test'")).rows[0].sessions_remaining,7);
 await edit({...await row(),status:'noshow'});await s.run();assert.equal((await row()).status,'noshow');await balance();
 await store.setJSON('lease',{owner:'other',until:Date.now()+120000});await assert.rejects(s.run(),/already running/);
 await store.setJSON('lease',{until:0});
 // Dedicated bootstrap snapshot, including protected future states, with a historical creation boundary.
 const bootstrapStore=new Store,bootstrapObjects=new Map;let version=0;
 const bootstrapCal={verify:async()=>{},read:async h=>structuredClone(bootstrapObjects.get(h)||null),put:async(h,ics,tag)=>{assert.equal(bootstrapObjects.get(h)?.etag,tag);bootstrapObjects.set(h,{ics,etag:String(++version)})},delete:async h=>bootstrapObjects.delete(h)};
 env.APPLE_CALDAV_START_AT=new Date(Date.parse(created)+60000).toISOString();
 const bs=core.service({env,db,cal:bootstrapCal,store:bootstrapStore});const snap=JSON.stringify(await row());
 assert.deepEqual(await bs.bootstrapPreview(),{found:1,linked:0,toCreate:1});const job=await bs.bootstrapStart();assert.deepEqual(job.ids,['TEST_CLOUD']);
 assert.ok((await bs.bootstrapRun()).complete);assert.equal(bootstrapObjects.size,1);assert.deepEqual(await bs.bootstrapPreview(),{found:1,linked:1,toCreate:0});await bs.bootstrapStart();await bs.bootstrapRun();assert.equal(bootstrapObjects.size,1);assert.equal(JSON.stringify(await row()),snap);await balance();assert.equal((await bs.reconcile()).verified,1);
 // New appointments continue to be exported automatically, without replaying bootstrap.
 await cal.delete(href,(await cal.read(href))?.etag).catch(()=>{});await edit({...await row(),status:'prenotato'});await edit({...await row(),id:'TEST_NEW_DEFAULT',date:'2026-09-17',start_time:'18:00:00'});
 env.APPLE_CALDAV_START_AT=new Date(Date.parse(created)-60000).toISOString();await bs.run();assert.equal(bootstrapObjects.size,2);await balance();
 assert.ok([...bootstrapStore.m.values()].some(x=>x.data.id==='TEST_NEW_DEFAULT'&&x.data.origin==='automatic'&&x.data.etag));
 console.log('PASS one-time bootstrap: snapshot, mapped skip, idempotency, no balance/status writes, remote reconciliation and new-booking default');
 const sample='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:SIM\r\nDTSTART:20260915T150000Z\r\nDTEND:20260915T160000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';assert.equal(core.parse(sample).slot.start_time,'17:00');assert.throws(()=>core.parse(sample.replace('END:VEVENT','RRULE:FREQ=DAILY\r\nEND:VEVENT')),/Recurrence/);assert.throws(()=>core.instant('20261025T023000'),/DST/);assert.throws(()=>core.instant('20260329T023000'),/DST/);
 const client=new core.CalDAV({APPLE_CALDAV_URL:env.APPLE_CALDAV_URL,APPLE_CALDAV_USER:'SIM',APPLE_CALDAV_PASSWORD:'SIM'});assert.throws(()=>client.url('../else.ics'),/Outside/);assert.throws(()=>client.url('https://example.com/x'),/Outside/);
 env.SITE_NAME='new-calendar-neacea';await assert.rejects(s.run(),/Isolated/);
 console.log('PASS locks, conflict/ETag, privacy, no backfill/import, protected states, DST, recurrence and production isolation');
}finally{await pg.close()}})().catch(e=>{console.error(e);process.exitCode=1});
