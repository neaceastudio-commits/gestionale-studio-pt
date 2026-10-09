const assert=require('node:assert/strict');
const core=require('../tools/apple-caldav-production/functions/lib/core.cjs');
class Store {
 constructor(){this.m=new Map;this.v=0}
 async getWithMetadata(k){return structuredClone(this.m.get(k)||null)}
 async get(k){return (await this.getWithMetadata(k))?.data||null}
 async getMetadata(k){return this.getWithMetadata(k)}
 async setJSON(k,data,o={}){const old=this.m.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};const etag=String(++this.v);this.m.set(k,{data:structuredClone(data),etag});return {modified:true,etag}}
 async list({prefix}){return {blobs:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}
}
(async()=>{
 const env={SITE_NAME:'neacea-caldav-gianluca',SITE_ID:'TEST',APPLE_CALDAV_SITE_ID:'TEST',APPLE_CALDAV_ACTOR_ID:'staff_1',APPLE_CALDAV_USER:'ventofresco55@gmail.com',APPLE_CALDAV_SYNC_ENABLED:'true',APPLE_CALDAV_URL:'https://p00-caldav.icloud.com/test/',APPLE_CALDAV_START_AT:'2026-09-01T00:00:00Z'};
 const clients=['Alice','Bob'].map(id=>({id,nome:id,active:true,sessions_total:12,sessions_remaining:12}));
 const appointments=[['a','Alice','2026-09-14'],['b','Alice','2026-09-16'],['c','Bob','2026-09-18']].map(([id,client,date])=>({id,client_ids:[client],service_id:'pt11',operator_id:'staff_1',date,start_time:'19:00:00',duration_min:60,status:'prenotato',created_at:'2026-09-13T12:00:00Z'}));
 const corrections=[];let fullReads=0,puts=0,failHref='';const objects=new Map,store=new Store;
 const cal={verify:async()=>{},read:async h=>structuredClone(objects.get(h)||null),put:async(h,ics,etag)=>{if(h===failHref)throw Error('412');assert.equal(objects.get(h)?.etag,etag);objects.set(h,{ics,etag:String(++puts)})},delete:async(h,etag)=>{assert.equal(objects.get(h)?.etag,etag);objects.delete(h)}};
 const db=async(table,{query='',method}={})=>{
  assert.ok(!method||method==='GET','Display sync must never write to NEACEA');
  if(table==='calendar_audit_log')return corrections.filter(log=>'eq.'+log.after_data.id===new URLSearchParams(query.slice(1)).get('entity_id'));
  if(table==='clients'){fullReads++;return structuredClone(clients)}
  if(table==='operators')return [{id:'staff_1',nome:'Gianluca',active:true}];
  if(table==='operator_effective_roles')return [{operator_id:'staff_1',system_roles:['owner']}];
  assert.equal(table,'appointments');const q=new URLSearchParams(query.slice(1));
  return structuredClone(q.has('id')?appointments.filter(a=>a.id===q.get('id').slice(3)):q.has('offset')&&+q.get('offset')>0?[]:appointments);
 };
 const s=core.service({env,db,store,cal,now:()=>Date.parse('2026-09-14T08:00:00Z')});
 assert.equal((await s.run()).created,3);
 const mappings=[...store.m.values()].map(x=>x.data).filter(x=>x.id),identity=structuredClone(mappings);
 const text=id=>objects.get(mappings.find(m=>m.id===id).href).ics.replace(/\r?\n[ \t]/g,'');
 for(const id of ['a','b','c'])assert.match(text(id),/0\/12/);
 // Reproduce Margini: a completed session changes the client's saved counters,
 // while all subsequent bookings retain the same state/operator/times.
 appointments[0].status='fatto';clients[0].sessions_remaining=10;clients[1].sessions_remaining=11;
 const before=JSON.stringify({clients,appointments});fullReads=0;
 assert.equal((await s.run()).errors,0);assert.equal(fullReads,1);
 assert.match(text('a'),/SUMMARY:✓ PT 1:1 · Alice · 2\/12/);
 assert.match(text('b'),/SUMMARY:PT 1:1 · Alice · 2\/12/);assert.match(text('b'),/Sedute residue: 10/);
 assert.match(text('c'),/SUMMARY:PT 1:1 · Bob · 1\/12/);
 assert.equal(JSON.stringify({clients,appointments}),before);assert.equal(objects.size,3);
 for(const m of identity){const current=await store.get('mapping/'+require('node:crypto').createHash('sha256').update(m.id).digest('hex'));for(const k of ['uid','href','marker'])assert.equal(current[k],m[k]);assert.deepEqual(core.parse(objects.get(m.href).ics).slot,core.slot(appointments.find(a=>a.id===m.id)))}
 const stable=puts;await s.run();assert.equal(puts,stable,'No writes just because DTSTAMP changed');
 // Counter-only corrections and existing stale text repair need no status toggle.
 clients[0].sessions_remaining=9;failHref=mappings.find(m=>m.id==='b').href;
 assert.equal((await s.run()).errors,1);assert.match(text('b'),/2\/12/);failHref='';
 assert.equal((await s.run()).errors,0);assert.match(text('b'),/3\/12/);
 // Scheduling changes refresh the sibling description as well as the moved event.
 appointments[1].start_time='18:00:00';assert.equal((await s.run()).errors,0);assert.match(text('a'),/Mercoledì 18:00/);
 const stable2=puts;await s.run();assert.equal(puts,stable2);
 // Unverified participant/service edits remain blocked. A recorded correction refreshes
 // the original Apple event, retaining its UID and without creating another event.
 const prior=structuredClone(appointments[0]);appointments[0].service_id='pt12';appointments[0].client_ids=['Alice','Bob'];
 assert.equal((await s.run()).errors,1);assert.match(text('a'),/PT 1:1/);
 corrections.push({before_data:prior,after_data:structuredClone(appointments[0])});
 assert.equal((await s.run()).errors,0);assert.match(text('a'),/PT 1:2/);assert.match(text('a'),/Alice/);assert.match(text('a'),/Bob/);
 const afterCorrection=puts;assert.equal((await s.run()).errors,0);assert.equal(puts,afterCorrection);assert.equal(objects.size,3);
 console.log('PASS all-client display refresh: completed and untouched future events, saved counters, scheduling, retry, identity, no duplicates/DB writes, one shared snapshot and idempotency');
})().catch(e=>{console.error(e);process.exitCode=1});
