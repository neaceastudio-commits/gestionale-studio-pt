import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextRun,instant,runId,rulePrefix,runPrefix,siteId,active} from '../netlify/functions/lib/whatsapp-matrix-time.mjs';
import {agendaRules} from '../netlify/functions/lib/whatsapp-agenda-rules-store.mjs';
import {tick,execute,signedRun,validSignature,workerHandler} from '../netlify/functions/lib/whatsapp-matrix-engine.mjs';
import {receiveEvents} from '../netlify/functions/lib/whatsapp-delivery.mjs';
import model from '../app/calendario-studio/js/whatsapp-agenda-text.js';
const id='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222';
const base={id,title:'Agenda mattina',intro:'Ciao {nome}',link:'',frequency:'daily',weekday:3,time:'08:00',period:'day',offset:0};
const context={site:{id:siteId},deploy:{context:'production',published:true}};
const env={WHATSAPP_AGENDA_SITE_ID:siteId,WHATSAPP_SENDER_PHONE:'+393520525230',WHATSAPP_PHONE_NUMBER_ID:'1153168214557448',WHATSAPP_ACCESS_TOKEN:'LOCAL_ONLY',WHATSAPP_API_VERSION:'v25.0',PT_ACCESS_SECRET:'SYNTHETIC_SCHEDULE_SECRET'};
const templates=async()=>({templates:[{name:model.name,language:model.language,status:'APPROVED',supported:true,header:null,body:model.body,footer:model.footer,parameterCount:10}]});
function blobStore(){
 const rows=new Map();let revision=0;
 return {rows,get:async k=>structuredClone(rows.get(k)?.data||null),list:async({prefix})=>({blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),getWithMetadata:async(k)=>{const v=rows.get(k);return v?structuredClone(v):null},
 setJSON:async(k,v,o={})=>put(k,v,o),set:async(k,v,o={})=>put(k,v,o)};
 function put(k,v,o){if(o.onlyIfNew&&rows.has(k)||o.onlyIfMatch&&rows.get(k)?.etag!==o.onlyIfMatch)return {modified:false};const etag='etag-'+(++revision);rows.set(k,{data:structuredClone(v),metadata:o.metadata||{},etag});return {modified:true,etag}}
}
function fixture(count=13){
 let time=new Date('2026-11-18T06:59:00Z'),onPost=()=>{},uncertain=false;const store=blobStore(),posts=[],dispatches=[];
 const row={operatorId:'trainer-one',name:'Trainer Alfa',count,incomplete:false,entries:Array.from({length:count},(_,i)=>({day:'2026-11-18',text:'09:00 · Cliente sintetico '+i+' · PT 1:1 · 0/8'})),text:'Agenda sintetica Alfa'};
 const report={start:'2026-11-18',end:'2026-11-18',agendas:[row,{...row,operatorId:'trainer-missing',name:'Trainer senza numero',count:1,entries:row.entries.slice(0,1)}]};
 const provider={verifySender:async()=>{},settings:async()=>({operators:[{id:row.operatorId,active:true,whatsapp_phone:'+393331234567'}]}),weeklyAgenda:async(day,period)=>{assert.equal(day,'2026-11-18');assert.equal(period,'day');return structuredClone(report)}};
 const db=async(table,{query})=>{
  assert.notEqual(table,'clients','scheduled execution must never address clients');
  if(table==='operators')return [{id:row.operatorId,active:true,roles:['PT'],whatsapp_phone:'+393331234567'}];
  assert.equal(table,'operator_effective_roles');return query.includes('owner-operator')?[{active:true,system_roles:['owner']}]:[{active:true,system_roles:['PT']}];
 };
 const fetchImpl=async(url,opts={})=>{
  if(String(url).includes('whatsapp-matrix-worker-background')){dispatches.push(JSON.parse(opts.body));assert.equal(validSignature(opts.body,opts.headers['X-NEACEA-Schedule'],env,time),true);return new Response(null,{status:202})}
  assert.match(String(url),/^https:\/\/graph.facebook.com\//);
  if(opts.method==='POST'){
   assert.match(String(url),/\/messages$/,'no media uploads');const payload=JSON.parse(opts.body);assert.equal(payload.type,'template');assert.equal(payload.to,'393331234567');assert.ok(!payload.text&&!payload.image&&!payload.document);posts.push(payload);await onPost();if(uncertain)throw Error('network_timeout');return Response.json({messages:[{id:'wamid.synthetic'+posts.length}]});
  }
  const t=(await templates()).templates[0];return Response.json({data:[{name:t.name,language:t.language,status:t.status,components:[{type:'BODY',text:t.body},{type:'FOOTER',text:t.footer}]}]});
 };
 const opts={store,env,context,db,provider,fetchImpl,now:()=>time};
 const ruleOptions={actor:{id:'owner-operator',role:'owner'},env,context,templates,provider,now:()=>time};
 async function save(rule=base){return (await agendaRules({action:'agenda-save-rule',rule},store,ruleOptions)).json()}
 async function activate(){const {rule}=await save();const response=await agendaRules({action:'agenda-toggle-rule',id,revision:rule.revision,enabled:true,requestId:rid},store,ruleOptions);assert.equal(response.status,200);return (await response.json()).rule}
 return {store,report,posts,dispatches,opts,ruleOptions,save,activate,time:t=>time=new Date(t),onPost:fn=>onPost=fn,uncertain:()=>uncertain=true};
}

test('Rome scheduling uses future instants, weekly dates, DST gaps and repeated hours once',()=>{
 assert.equal(nextRun(base,new Date('2026-11-18T06:59Z')),'2026-11-18T07:00:00.000Z');
 assert.equal(nextRun(base,new Date('2026-11-18T07:00Z')),'2026-11-19T07:00:00.000Z');
 assert.equal(nextRun({...base,frequency:'weekly',weekday:1},new Date('2026-11-18T06:59Z')),'2026-11-23T07:00:00.000Z');
 assert.equal(nextRun(base,new Date('2027-07-18T05:59Z')),'2027-07-18T06:00:00.000Z');
 assert.equal(instant('2027-03-28','02:30'),null);
 assert.equal(nextRun({...base,time:'02:30'},new Date('2027-03-27T23:00Z')),'2027-03-29T00:30:00.000Z');
 assert.equal(instant('2026-10-25','02:30').toISOString(),'2026-10-25T00:30:00.000Z');
 assert.equal(nextRun({...base,time:'02:30'},new Date('2026-10-25T00:45Z')),'2026-10-26T01:30:00.000Z');
});
test('all saved and legacy rules stay off; no worker or provider activity before explicit activation',async()=>{
 const f=fixture();const {rule}=await f.save({...base,enabled:true,schemaVersion:2,activation:{id:rid,ownerId:'forged'},nextRunAt:'2026-11-18T07:00Z'});
 assert.equal(rule.enabled,false);assert.equal(rule.activation,null);assert.equal(rule.nextRunAt,null);
 await f.store.setJSON(rulePrefix+'legacy',{...base,id:'legacy',enabled:true});f.time('2026-11-18T07:00Z');
 assert.deepEqual(await tick(f.opts),{status:'ready',dispatched:0});assert.equal(f.posts.length,0);assert.equal(f.dispatches.length,0);
 assert.equal(active({...base,enabled:true}),false);
 const listed=await (await agendaRules({action:'agenda-rules'},f.store)).json();assert.ok(listed.rules.every(r=>!r.enabled));
});
test('individual activation is published-production only, idempotent, persistent and guarded by revisions; editing pauses',async()=>{
 const f=fixture(),{rule}=await f.save();const toggle={action:'agenda-toggle-rule',id,revision:rule.revision,enabled:true,requestId:rid};
 assert.equal((await agendaRules(toggle,f.store,{...f.ruleOptions,context:{...context,deploy:{context:'deploy-preview',published:false}}})).status,409);
 const first=await (await agendaRules(toggle,f.store,f.ruleOptions)).json();assert.equal(first.rule.enabled,true);assert.equal(first.rule.nextRunAt,'2026-11-18T07:00:00.000Z');assert.equal(f.posts.length,0);
 assert.deepEqual(await (await agendaRules(toggle,f.store,f.ruleOptions)).json(),first,'lost-response retry keeps the original activation');
 const concurrent=await Promise.all([f.save({...base,revision:rule.revision}),f.save({...base,revision:first.rule.revision})]);
 assert.equal(concurrent[0].error,'version_conflict');assert.equal(concurrent[1].rule.enabled,false);
 const reloaded=await (await agendaRules({action:'agenda-rules'},f.store)).json();assert.equal(reloaded.rules[0].enabled,false);assert.equal(reloaded.rules[0].nextRunAt,null);assert.equal(f.posts.length,0);
});
test('due occurrence dispatches approved template parts once despite concurrent workers and repeated cron; outcomes persist',async()=>{
 const f=fixture(),rule=await f.activate();await tick(f.opts);assert.equal(f.dispatches.length,0);
 f.time('2026-11-18T07:00Z');await Promise.all([tick(f.opts),tick(f.opts)]);const run=runId(rule);
 await Promise.all([execute(run,f.opts),execute(run,f.opts)]);await execute(run,f.opts);
 assert.equal(f.posts.length,3);assert.ok(f.posts.every(p=>p.template.name===model.name));
 const outcome=(await f.store.getWithMetadata(runPrefix+run+'/outcome')).data;assert.equal(outcome.accepted,3);assert.equal(outcome.excluded,1);
 await tick(f.opts);const current=(await f.store.getWithMetadata(rulePrefix+id)).data;
 assert.equal(current.nextRunAt,'2026-11-19T07:00:00.000Z');assert.equal(current.lastRun.accepted,3);
 await execute(run,f.opts);assert.equal(f.posts.length,3);
 assert.equal((await (await agendaRules({action:'agenda-rules'},f.store)).json()).rules[0].lastRun.accepted,3);
});
test('pausing after one accepted part stops the remaining parts and never reactivates the matrix',async()=>{
 const f=fixture(),rule=await f.activate();f.time('2026-11-18T07:00Z');await tick(f.opts);
 f.onPost(async()=>{const latest=await f.store.getWithMetadata(rulePrefix+id);await agendaRules({action:'agenda-toggle-rule',id,revision:latest.etag,requestId:'33333333-3333-4333-8333-333333333333',enabled:false},f.store,f.ruleOptions)});
 await execute(runId(rule),f.opts);assert.equal(f.posts.length,1);await tick(f.opts);assert.equal(f.posts.length,1);assert.equal((await f.store.getWithMetadata(rulePrefix+id)).data.enabled,false);
 assert.match((await f.store.getWithMetadata(runPrefix+runId(rule)+'/outcome')).data.status,/Interrotta/);
});
test('calendar changes between parts and uncertain Meta responses stop safely without retrying messages',async()=>{
 for(const kind of ['calendar','uncertain']){
  const f=fixture(),rule=await f.activate();f.time('2026-11-18T07:00Z');await tick(f.opts);
  if(kind==='calendar')f.onPost(async()=>{f.report.agendas[0].text+=' cambiata'});else f.uncertain();
  await execute(runId(rule),f.opts);await execute(runId(rule),f.opts);await tick(f.opts);assert.equal(f.posts.length,1);
  assert.match((await f.store.getWithMetadata(runPrefix+runId(rule)+'/outcome')).data.status,/Invio interrotto/);
 }
});
test('late schedules, revoked owners and nonpublished contexts cannot send; legacy scheduler flag stays irrelevant',async()=>{
 for(const kind of ['late','revoked','preview','unpublished']){
  const f=fixture(),rule=await f.activate();f.time('2026-11-18T07:00Z');await tick(f.opts);
  if(kind==='late'){f.time('2026-11-18T07:20Z');await tick(f.opts)}
  if(kind==='revoked')f.opts.db=async()=>[{active:false,system_roles:['owner']}];
  if(kind==='preview')f.opts.context={...context,deploy:{context:'deploy-preview',published:false}};
  if(kind==='unpublished')f.opts.context={...context,deploy:{context:'production',published:false}};
  await execute(runId(rule),f.opts);assert.equal(f.posts.length,0);
 }
});
test('worker requires signed bounded fresh requests and exact published site; valid request with no manifest cannot send',async()=>{
 const f=fixture(),handler=workerHandler({...f.opts,store:()=>f.store});const signed=signedRun(id+'/2026-11-18T0800',env,f.opts.now());
 const req=(body=signed.body,sig=signed.signature)=>new Request('https://calendar.test/worker',{method:'POST',body,headers:{'X-NEACEA-Schedule':sig}});
 assert.equal((await handler(req(),context)).status,204);
 assert.equal((await handler(req(signed.body,'f'.repeat(64)),context)).status,403);
 assert.equal((await handler(req(signed.body.replace('0800','0900')),context)).status,403);
 f.time('2026-11-18T07:10Z');assert.equal((await handler(req(),context)).status,403);
 assert.equal((await handler(req(),{...context,site:{id:'other'}})).status,404);assert.equal(f.posts.length,0);
});

test('scheduled receipts show actual callback delivery independently for every part',async()=>{
 const f=fixture(1),rule=await f.activate();f.time('2026-11-18T07:00Z');await tick(f.opts);await execute(runId(rule),f.opts);
 const action={action:'agenda-run-status',id:runId(rule)};
 let status=await (await agendaRules(action,f.store,f.ruleOptions)).json();assert.equal(status.messages[0].status,'Accettato da Meta');
 const body={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:env.WHATSAPP_PHONE_NUMBER_ID},statuses:[{id:'wamid.synthetic1',status:'delivered',timestamp:String(Math.floor(f.opts.now().getTime()/1000))}]}}]}]};
 const callback=await receiveEvents(new Request('https://calendar.test/events/LOCAL_PATH',{method:'POST',body:JSON.stringify(body)}),{store:f.store,env:{...env,WHATSAPP_WEBHOOK_PATH_SECRET:'LOCAL_PATH'},now:()=>f.opts.now().getTime()});assert.equal(callback.status,200);
 status=await (await agendaRules(action,f.store,f.ruleOptions)).json();assert.equal(status.messages[0].status,'Consegnato');assert.equal(f.posts.length,1);
});
test('activation fails closed if the approved agenda template is unavailable or changed',async()=>{
 const f=fixture(),{rule}=await f.save();const response=await agendaRules({action:'agenda-toggle-rule',id,revision:rule.revision,enabled:true,requestId:rid},f.store,{...f.ruleOptions,templates:async()=>({templates:[]})});assert.equal(response.status,409);assert.equal((await f.store.getWithMetadata(rulePrefix+id)).data.enabled,false);assert.equal(f.posts.length,0);
});
