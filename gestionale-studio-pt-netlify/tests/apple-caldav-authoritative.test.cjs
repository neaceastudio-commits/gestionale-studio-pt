'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const core=require('../tools/apple-caldav-production/functions/lib/core.cjs');
const key=id=>'mapping/'+crypto.createHash('sha256').update(id).digest('hex');
function fixture(){
 let time=Date.parse('2026-09-18T12:00:00Z'),version=0,failDb=false,deleteFails=false,cost=0;
 const rows=new Map(),objects=new Map(),values=new Map(),writes=[];
 const store={get:async k=>structuredClone(values.get(k)?.data||null),getWithMetadata:async k=>structuredClone(values.get(k)||null),getMetadata:async k=>values.get(k)||null,list:async({prefix})=>({blobs:[...values.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),setJSON:async(k,data,o={})=>{const old=values.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return {modified:false};const etag=String(++version);values.set(k,{data:structuredClone(data),etag});return {modified:true,etag}}};
 const db=async(table,{query='',method='GET'}={})=>{assert.equal(method,'GET','Reconciliation must not write appointments, counters or audit');if(failDb&&table==='appointments')throw Error('DB unavailable');if(table==='operator_effective_roles')return [{operator_id:'staff_1',system_roles:['owner']}];if(table==='clients')return [{id:'c',nome:'Simulated',active:true,sessions_total:8,sessions_remaining:8}];if(table==='operators')return [{id:'staff_1',nome:'Trainer'}];assert.equal(table,'appointments');const q=new URLSearchParams(query.slice(1));let all=[...rows.values()].sort((a,b)=>a.id.localeCompare(b.id));if(q.has('id'))all=all.filter(r=>r.id===q.get('id').slice(3));if(q.has('offset'))all=all.slice(+q.get('offset'),+q.get('offset')+1000);return structuredClone(all)};
 const cal={verify:async()=>{},read:async h=>{time+=cost;return structuredClone(objects.get(h)||null)},put:async(h,ics,tag)=>{time+=cost;assert.equal(objects.get(h)?.etag,tag);writes.push({type:'put',h});objects.set(h,{ics,etag:String(++version)})},delete:async(h,tag)=>{assert.equal(objects.get(h)?.etag,tag);if(deleteFails)throw Error('Conditional delete refused');writes.push({type:'delete',h});objects.delete(h)}};
 const env={SITE_NAME:'neacea-caldav-gianluca',SITE_ID:'TEST',APPLE_CALDAV_SITE_ID:'TEST',APPLE_CALDAV_ACTOR_ID:'staff_1',APPLE_CALDAV_USER:'ventofresco55@gmail.com',APPLE_CALDAV_SYNC_ENABLED:'true',APPLE_CALDAV_URL:'https://p00-caldav.icloud.com/test/',APPLE_CALDAV_START_AT:'2026-09-01T00:00:00Z'};
 const s=core.service({env,db,store,cal,now:()=>time,sourceOfTruth:'neacea'});
 const add=id=>{rows.set(id,{id,client_ids:['c'],operator_id:'staff_1',service_id:'pt11',status:'prenotato',date:'2027-01-20',start_time:'10:00:00',duration_min:60,created_at:'2026-09-18T10:00:00Z'});return rows.get(id)};
 return {s,rows,objects,store,writes,add,advance:()=>time+=61000,setFailDb:v=>failDb=v,setDeleteFails:v=>deleteFails=v,setCost:v=>cost=v};
}
test('web calendar overrides an Apple move and recreates an Apple deletion without DB writes',async()=>{
 const f=fixture(),n=f.add('a');await f.s.provision('a');const m=await f.store.get(key('a'));
 f.objects.get(m.href).ics=core.rewrite(f.objects.get(m.href).ics,{...core.slot(n),start_time:'16:00'});
 n.start_time='17:00:00';const before=JSON.stringify([...f.rows]);
 assert.equal((await f.s.run()).errors,0);assert.deepEqual(core.parse(f.objects.get(m.href).ics).slot,core.slot(n));
 f.objects.delete(m.href);assert.equal((await f.s.run()).errors,0);assert.equal(f.objects.size,1);
 assert.equal(JSON.stringify([...f.rows]),before);assert.equal((await f.store.get('last-run')).sourceOfTruth,'neacea');
 const count=f.writes.length;await f.s.run();assert.equal(f.writes.length,count);
});
test('pending link is completed from the current web time and participants without duplication',async()=>{
 const f=fixture(),n=f.add('a');await f.s.provision('a');let m=await f.store.get(key('a'));
 await f.store.setJSON(key('a'),{...m,stage:'pending'});n.start_time='17:00:00';n.operator_id='new-trainer';n.service_id='pt12';
 assert.equal((await f.s.run()).errors,0);assert.equal(f.objects.size,1);assert.equal((await f.store.get(key('a'))).stage,'linked');
 const remote=core.parse(f.objects.get(m.href).ics);assert.equal(remote.slot.start_time,'17:00');assert.equal(remote.uid,m.uid);assert.equal(remote.marker,m.marker);
});
test('deleted completed web appointment retires its owned event after two observations even if Apple moved it',async()=>{
 for(const status of ['fatto','noshow','prenotato']){
 const f=fixture(),n=f.add('a');n.status=status;await f.s.link('a');const m=await f.store.get(key('a'));
 f.objects.get(m.href).ics=core.rewrite(f.objects.get(m.href).ics,{...core.slot(n),start_time:'16:00'});f.rows.delete('a');
 assert.equal((await f.s.run()).missingSourcePending,1);assert.equal(f.objects.size,1);f.advance();
 assert.equal((await f.s.run()).retired,1);assert.equal(f.objects.size,0);assert.equal((await f.store.get(key('a'))).stage,'retired');
 }
});
test('cancelled and no longer visible participants disappear, and reopening restores the same identity',async()=>{
 const f=fixture(),n=f.add('a');await f.s.provision('a');const m=await f.store.get(key('a'));
 for(const scenario of ['cancelled','inactive']){
 if(scenario==='cancelled')n.status='annullato';else n.client_ids=['inactive'];
 assert.equal((await f.s.run()).errors,0);assert.equal(f.objects.size,0);
 n.status='prenotato';n.client_ids=['c'];assert.equal((await f.s.run()).errors,0);assert.equal(f.objects.size,1);
 const remote=core.parse(f.objects.get(m.href).ics);assert.equal(remote.uid,m.uid);assert.equal(remote.marker,m.marker);
 }
});
test('foreign identity, database failure and conditional delete failure cannot destroy events',async()=>{
 for(const scenario of ['marker','db','etag']){
 const f=fixture();f.add('a');await f.s.provision('a');const m=await f.store.get(key('a'));
 if(scenario==='marker'){f.objects.get(m.href).ics=f.objects.get(m.href).ics.replace(m.marker,'foreign');assert.equal((await f.s.run()).errors,1);}
 if(scenario==='db'){f.setFailDb(true);await assert.rejects(f.s.run(),/DB unavailable/);}
 if(scenario==='etag'){f.rows.delete('a');await f.s.run();f.advance();f.setDeleteFails(true);assert.equal((await f.s.run()).errors,1);assert.equal((await f.store.get(key('a'))).stage,'linked');}
 assert.equal(f.objects.size,1);
 }
});
test('a transient missing source is reset when the web appointment returns',async()=>{
 const f=fixture(),n=f.add('a');await f.s.provision('a');f.rows.delete('a');await f.s.run();f.rows.set('a',n);f.advance();await f.s.run();
 assert.equal(f.objects.size,1);assert.equal((await f.store.get(key('a'))).sourceMissingSince,null);
});
