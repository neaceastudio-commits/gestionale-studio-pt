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
 const s=core.service({env,db,store,cal,now:()=>time});
 const add=id=>{rows.set(id,{id,client_ids:['c'],operator_id:'staff_1',service_id:'pt11',status:'prenotato',date:'2027-01-20',start_time:'10:00:00',duration_min:60,created_at:'2026-09-18T10:00:00Z'});return rows.get(id)};
 return {s,rows,objects,store,writes,add,advance:()=>time+=61000,setFailDb:v=>failDb=v,setDeleteFails:v=>deleteFails=v,setCost:v=>cost=v};
}
test('deleted booking requires two observations, retires exact event and retains identity without DB writes',async()=>{
 const f=fixture();f.add('old');await f.s.provision('old');const m=await f.store.get(key('old'));f.rows.delete('old');f.add('replacement');
 const first=await f.s.run();assert.equal(first.missingSourcePending,1);assert.equal(first.retired,0);assert.ok(f.objects.has(m.href));
 const snapshot=JSON.stringify([...f.rows]);f.advance();const next=await f.s.run();assert.equal(next.retired,1);assert.equal(next.errors,0);assert.equal(f.objects.size,1);assert.equal(JSON.stringify([...f.rows]),snapshot);
 const retired=await f.store.get(key('old'));assert.equal(retired.stage,'retired');for(const k of ['uid','href','marker'])assert.equal(retired[k],m[k]);assert.equal(retired.baseline.apple,null);
 const before=f.writes.length;await f.s.run();assert.equal(f.writes.length,before);assert.equal(f.objects.size,1);
});
test('transient absence or DB error never deletes an event',async()=>{
 const f=fixture(),n=f.add('a');await f.s.provision('a');f.rows.delete('a');await f.s.run();f.rows.set('a',n);await f.s.run();assert.equal((await f.store.get(key('a'))).sourceMissingSince,null);f.setFailDb(true);await assert.rejects(f.s.run(),/DB unavailable/);assert.equal(f.objects.size,1);assert.equal(f.writes.filter(w=>w.type==='delete').length,0);
});
test('foreign identity, concurrent Apple edits and missing completed sessions require review',async()=>{
 for(const scenario of ['marker','uid','time','completed']){
 const f=fixture();f.add('a');if(scenario==='completed')f.rows.get('a').status='fatto';await f.s.link('a');const m=await f.store.get(key('a'));
 if(scenario==='completed'){f.rows.delete('a');assert.equal((await f.s.run()).errors,1);}else{f.rows.delete('a');await f.s.run();const a=f.objects.get(m.href);if(scenario==='marker')a.ics=a.ics.replace(m.marker,'foreign');if(scenario==='uid')a.ics=a.ics.replace(m.uid,'foreign');if(scenario==='time')a.ics=core.rewrite(a.ics,{...m.baseline.apple,start_time:'11:00'});f.advance();assert.equal((await f.s.run()).errors,1);}
 assert.ok(f.objects.has(m.href));assert.equal(f.writes.filter(w=>w.type==='delete').length,0);
 }
});
test('conditional deletion failure retains baseline and retries safely',async()=>{
 const f=fixture();f.add('a');await f.s.provision('a');f.rows.delete('a');await f.s.run();f.advance();const m=await f.store.get(key('a'));f.setDeleteFails(true);assert.equal((await f.s.run()).errors,1);assert.deepEqual((await f.store.get(key('a'))).baseline,m.baseline);f.setDeleteFails(false);assert.equal((await f.s.run()).retired,1);
});
test('new booking lane cannot starve behind existing events or a failing new row',async()=>{
 const f=fixture();for(let i=0;i<32;i++){const id='old'+String(i).padStart(2,'0');f.add(id);await f.s.provision(id)}
 for(let i=0;i<24;i++)f.add('new'+String(i).padStart(2,'0'));
 // Ineligible rendering is retried, but the cursor still visits all other rows.
 f.add('new00bad').client_ids=['inactive'];f.setCost(1000);
 const before=JSON.stringify([...f.rows]);let created=0,processed=0;
 for(let i=0;i<12;i++){const r=await f.s.run();created+=r.created;processed+=r.processed;f.advance();}
 assert.equal(created,24);assert.ok(processed>32);assert.equal(f.objects.size,56);assert.equal(JSON.stringify([...f.rows]),before);assert.ok((await f.store.get(key('new23')))?.etag);
});
