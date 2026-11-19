import {test} from 'node:test';
import assert from 'node:assert/strict';
import models from '../app/calendario-studio/js/whatsapp-client-models.js';
import {buildClientItems,createClientService} from '../netlify/functions/lib/whatsapp-client-service.mjs';
import {agendaRules} from '../netlify/functions/lib/whatsapp-agenda-rules-store.mjs';
import {sendSelected} from '../netlify/functions/lib/whatsapp-compose.mjs';
import {tick,execute} from '../netlify/functions/lib/whatsapp-matrix-engine.mjs';
import {siteId,rulePrefix,runPrefix,runId,nextRun} from '../netlify/functions/lib/whatsapp-matrix-time.mjs';
const start='2026-11-02',at='2026-11-19T07:00:00.000Z';
const rule=(kind='appointment',extra={})=>({audience:'clients',kind,frequency:'daily',weekday:4,time:'08:00',...(kind==='remaining'?{remainingThreshold:2}:{daysBefore:1}),...extra});
const client=(id='a',extra={})=>({id,nome:id==='a'?'Mario':'Lucia',cognome:'Cliente',active:true,telefono:id==='a'?'+393331234567':'+393331234568',sessions_total:8,sessions_remaining:2,data_conferma:start,package_start:start,stato_abbonamento:'Attivo',notes:'[CICLO-PACCHETTO '+start+']',...extra});
const appointment=(id='one',extra={})=>({id,date:'2026-11-20',start_time:'09:00:00',service_id:'pt12',client_ids:['a','b'],operator_id:'pt-one',status:'prenotato',notes:'[CICLO-PACCHETTO '+start+']',...extra});
const context={site:{id:siteId},deploy:{context:'production',published:true}};
const env={WHATSAPP_AGENDA_SITE_ID:siteId,WHATSAPP_SENDER_PHONE:'+393520525230',WHATSAPP_PHONE_NUMBER_ID:'1153168214557448',WHATSAPP_ACCESS_TOKEN:'LOCAL_ONLY',WHATSAPP_API_VERSION:'v25.0',PT_ACCESS_SECRET:'LOCAL_SCHEDULE_SECRET'};
const catalogue=(status='APPROVED',category='UTILITY')=>({templates:models.kinds.map(k=>({...models.byKind[k],status,category,header:null,supported:true}))});
function blobStore(){
 const rows=new Map();let v=0;
 const put=async(key,data,opts={})=>{if(opts.onlyIfNew&&rows.has(key)||opts.onlyIfMatch&&rows.get(key)?.etag!==opts.onlyIfMatch)return {modified:false};const etag='r'+(++v);rows.set(key,{data:structuredClone(data),etag,metadata:opts.metadata||{}});return {modified:true,etag}};
 return {rows,get:async k=>structuredClone(rows.get(k)?.data||null),getWithMetadata:async k=>structuredClone(rows.get(k)||null),list:async({prefix})=>({blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),setJSON:put,set:put};
}
function fixture(){
 const store=blobStore(),posts=[];let now=new Date('2026-11-19T06:59:00Z'),status='APPROVED',category='UTILITY',onPost=()=>{},uncertain=false;
 const data={clients:[client()],appointments:[appointment(),appointment('two',{date:'2026-11-21'})]};
 const db=async(table,{query})=>{
  const params=new URLSearchParams(query);
  if(table==='operator_effective_roles')return [{active:true,system_roles:['owner']}];
  assert.ok(['clients','appointments'].includes(table),'client automations never read PT recipients');
  let rows=data[table];
  if(params.has('id'))rows=rows.filter(r=>params.get('id')==='eq.'+r.id);
  if(params.has('date'))rows=rows.filter(r=>params.get('date')==='eq.'+r.date);
  if(params.has('status'))rows=rows.filter(r=>params.get('status')==='eq.'+r.status);
  if(params.has('client_ids')){const ids=JSON.parse(params.get('client_ids').slice(3));rows=rows.filter(r=>ids.every(id=>r.client_ids.includes(id)))}
  const offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||1000);return structuredClone(rows.slice(offset,offset+limit));
 };
 const clientProvider=createClientService({db,now:()=>now}),provider={verifySender:async()=>{}};
 const fetchImpl=async(url,opts={})=>{
  if(String(url).includes('worker-background'))return new Response(null,{status:202});
  assert.match(String(url),/^https:\/\/graph.facebook.com\//);
  if(opts.method==='POST'){assert.match(String(url),/\/messages$/);const p=JSON.parse(opts.body);assert.equal(p.type,'template');assert.ok(!p.text&&!p.document&&!p.image);posts.push(p);await onPost();if(uncertain)throw Error('timeout');return Response.json({messages:[{id:'wamid.client'+posts.length}]})}
  return Response.json({data:models.specs.map(t=>({...t,status,category}))});
 };
 const opts={store,db,env,context,provider,clientProvider,fetchImpl,now:()=>now};
 const ruleOpts={actor:{id:'owner',role:'owner'},env,context,provider,clientProvider,templates:async()=>catalogue(status,category),now:()=>now};
 const save=async(r,id='11111111-1111-4111-8111-111111111111')=>{const response=await agendaRules({action:'agenda-save-rule',rule:{...r,id,title:'Matrice clienti',intro:'',link:'',enabled:true}},store,ruleOpts);assert.equal(response.status,200);return (await response.json()).rule};
 const activate=async(r,id)=>{const saved=await save(r,id),requestId='22222222-2222-4222-8222-222222222222';const response=await agendaRules({action:'agenda-toggle-rule',id:saved.id,revision:saved.revision,requestId,enabled:true},store,ruleOpts);assert.equal(response.status,200,await response.clone().text());return (await response.json()).rule};
 return {store,posts,data,opts,ruleOpts,save,activate,clock:t=>now=new Date(t),template:s=>status=s,category:s=>category=s,onPost:fn=>onPost=fn,uncertain:()=>uncertain=true};
}

test('appointment reminders are individual and exclude inactive, archived, missing phones, cancelled, provisional and past appointments',()=>{
 const data={clients:[client(),client('b'),client('archived',{active:false}),client('hibernated',{stato_abbonamento:'Ibernato'}),client('missing',{telefono:''})],appointments:[appointment(),appointment('cancel',{status:'annullato'}),appointment('provisional',{notes:'[ORARIO-PROVVISORIO]'}),appointment('pending',{notes:'[RINNOVO-PREVISTO renewal]'}),appointment('block',{service_id:'blocco'}),appointment('past',{date:'2026-11-18'})]};
 const result=buildClientItems(rule(),at,data,new Date(at));assert.equal(result.items.length,2);assert.equal(result.excluded,1);
 assert.ok(result.items.every(i=>i.contact.startsWith('cliente:')&&!i.text.includes('Lucia')||i.contact==='cliente:b'));
 assert.ok(result.items.find(i=>i.contact==='cliente:a').text.includes('Mario'));assert.ok(!result.items.find(i=>i.contact==='cliente:a').text.includes('Lucia'));
 assert.ok(!result.items.find(i=>i.contact==='cliente:b').text.includes('Mario'));
 assert.equal(buildClientItems(rule('appointment',{daysBefore:0}),at,{clients:[client()],appointments:[appointment('old',{date:'2026-11-19',start_time:'07:30'})]},new Date('2026-11-18T10:00Z')).items.length,0,'preview excludes appointments before the future scheduled check');
});
test('paired participant cancellation never generates that client’s reminder',()=>{
 const a=appointment('pair',{notes:'[NEACEA-PT-SESSION-V1]'+JSON.stringify({version:1,participants:{a:{status:'annullato'},b:{status:'prenotato'}}})+'[/NEACEA-PT-SESSION-V1]'});
 assert.deepEqual(buildClientItems(rule(),at,{clients:[client(),client('b')],appointments:[a]},new Date(at)).items.map(i=>i.contact),['cliente:b']);
});
test('remaining uses saved counters and stable cycle-threshold identity; expiry requires an exactly complete current plan',()=>{
 const data={clients:[client()],appointments:[appointment(),appointment('two',{date:'2026-11-21'}),appointment('next',{date:'2027-02-01',notes:'[RINNOVO-PREVISTO next]'})]};
 const remaining=buildClientItems(rule('remaining'),at,data,new Date(at)).items[0];assert.match(remaining.body,/2 sedute residue su 8/);
 const changed=buildClientItems(rule('remaining'),at,{...data,clients:[client('a',{sessions_remaining:1})]},new Date(at)).items[0];assert.equal(changed.eventKey,remaining.eventKey);assert.notEqual(changed.revision,remaining.revision);
 const renewed=buildClientItems(rule('remaining'),at,{...data,clients:[client('a',{data_conferma:'2026-11-10',notes:'[CICLO-PACCHETTO 2026-11-10]'})]},new Date(at)).items[0];assert.notEqual(renewed.eventKey,remaining.eventKey);
 const expiry=buildClientItems(rule('expiry',{daysBefore:3}),at,data,new Date(at));assert.equal(expiry.items.length,1);assert.match(expiry.items[0].body,/21\/11\/2026/);assert.ok(!expiry.items[0].body.includes('2027'));
 for(const extra of [{sessions_remaining:3},{sessions_remaining:1},{sessions_remaining:-1},{sessions_remaining:null},{notes:'[NEACEA-PACKAGE-LEDGER-V1]invalid[/NEACEA-PACKAGE-LEDGER-V1]'}])assert.equal(buildClientItems(rule('expiry',{daysBefore:3}),at,{...data,clients:[client('a',extra)]},new Date(at)).items.length,0);
});
test('save/preview never enable or send, boundaries are immutable and every client model must match approved UTILITY content',async()=>{
 const f=fixture();for(const kind of models.kinds){const saved=await f.save(rule(kind),{'appointment':'11111111-1111-4111-8111-111111111111','remaining':'33333333-3333-4333-8333-333333333333','expiry':'44444444-4444-4444-8444-444444444444'}[kind]);assert.equal(saved.enabled,false);assert.equal(saved.activation,null);assert.equal(saved.nextRunAt,null)}
 const preview=await (await agendaRules({action:'agenda-preview-rule',rule:rule()},f.store,f.ruleOpts)).json();assert.equal(preview.recipients.length,1);assert.equal(preview.scheduledAt,at);assert.equal(f.posts.length,0);
 const saved=(await (await agendaRules({action:'agenda-rules'},f.store,f.ruleOpts)).json()).rules.find(r=>r.kind==='appointment');
 const forged=await agendaRules({action:'agenda-save-rule',rule:{...saved,audience:'assigned_trainer',source:'pt_bookings',period:'day',offset:0}},f.store,f.ruleOpts);assert.equal(forged.status,409);
 const toggle={action:'agenda-toggle-rule',id:saved.id,revision:saved.revision,requestId:'55555555-5555-4555-8555-555555555555',enabled:true};
 for(const status of ['PENDING','REJECTED','PAUSED']){f.template(status);assert.equal((await agendaRules(toggle,f.store,f.ruleOpts)).status,409)}
 f.template('APPROVED');f.category('MARKETING');assert.equal((await agendaRules(toggle,f.store,f.ruleOpts)).status,409);assert.equal(f.posts.length,0);
 assert.equal(models.templateIssue('appointment',catalogue().templates.map(t=>({...t,body:t.body+' changed'}))).length>0,true);
});
test('client schedules run only after activation and deduplicate the same condition across days and matrices',async()=>{
 const f=fixture(),r=await f.activate(rule('remaining'));await tick(f.opts);assert.equal(f.posts.length,0);
 f.clock(at);await tick(f.opts);await Promise.all([execute(runId(r),f.opts),execute(runId(r),f.opts)]);await execute(runId(r),f.opts);assert.equal(f.posts.length,1);
 assert.equal(f.posts[0].to,'393331234567');assert.equal(f.posts[0].template.name,models.byKind.remaining.name);
 await tick(f.opts);const next=(await f.store.getWithMetadata(rulePrefix+r.id)).data;f.clock(next.nextRunAt);f.data.clients[0].sessions_remaining=1;await tick(f.opts);await execute(runId(next),f.opts);assert.equal(f.posts.length,1,'same threshold and cycle are not notified daily');
 const outcome=(await f.store.getWithMetadata(runPrefix+runId(next)+'/outcome')).data;assert.equal(outcome.alreadyNotified,1);
 const another=await f.activate(rule('remaining'),'66666666-6666-4666-8666-666666666666');f.clock(another.nextRunAt);await tick(f.opts);await execute(runId(another),f.opts);assert.equal(f.posts.length,1,'another matrix with the same condition cannot duplicate it');
});
test('cancelled or changed source data is skipped, pause stops later recipients, uncertain requests are never retried',async()=>{
 for(const mode of ['cancelled','pause','uncertain']){
  const f=fixture();f.data.clients.push(client('b'));const r=await f.activate(rule());f.clock(at);await tick(f.opts);
  if(mode==='cancelled'){
   let calls=0;const original=f.opts.clientProvider.plan;f.opts.clientProvider={plan:async(...args)=>{const p=await original(...args);if(calls++===0)f.data.appointments[0].status='annullato';return p}};
  }
  if(mode==='pause')f.onPost(async()=>{const old=await f.store.getWithMetadata(rulePrefix+r.id);await f.store.setJSON(rulePrefix+r.id,{...old.data,enabled:false,activation:null,nextRunAt:null},{onlyIfMatch:old.etag})});
  if(mode==='uncertain')f.uncertain();
  await execute(runId(r),f.opts);await execute(runId(r),f.opts);
  assert.equal(f.posts.length,mode==='cancelled'?0:1);
 }
});
test('client rule validation rejects bad values, schedules honor Rome and forged event keys cannot alter manual claims',async()=>{
 for(const bad of [{kind:'unknown'},{daysBefore:-1},{daysBefore:31},{time:'24:00'},{weekday:7}])assert.throws(()=>models.validateRule(rule('appointment',bad)));
 assert.equal(nextRun(rule('remaining'),new Date('2026-07-01T05:59Z')),'2026-07-01T06:00:00.000Z');
 const f=fixture();const saved=await f.save(rule('remaining'));f.clock(at);await tick(f.opts);assert.equal(f.posts.length,0);assert.equal(saved.enabled,false);
 const request={batch:'77777777-7777-4777-8777-777777777777',contact:'cliente:a',template:models.render('remaining',['Mario','02/11/2026','2','8']).template,clientEventKey:'client:remaining:'+('a'.repeat(64))};
 await sendSelected(request,{...f.opts,store:()=>f.store});await sendSelected({...request,clientEventKey:'client:remaining:'+('b'.repeat(64))},{...f.opts,store:()=>f.store});assert.equal(f.posts.length,1);assert.ok([...f.store.rows.keys()].every(k=>!k.startsWith('scheduled-client/')));

});

test('changing the recipient phone after lookup stops before the provider POST',async()=>{
 const f=fixture(),r=await f.activate(rule('remaining'));f.clock(at);await tick(f.opts);f.opts.provider.verifySender=async()=>{f.data.clients[0].telefono='+393339999999'};await execute(runId(r),f.opts);assert.equal(f.posts.length,0);
});
test('submitted client templates and the shared runtime definitions stay identical',async()=>{
 const {readFile}=await import('node:fs/promises');const specs=JSON.parse(await readFile(new URL('../config/whatsapp-client-templates.json',import.meta.url),'utf8'));assert.deepEqual(specs,models.specs);for(const kind of models.kinds){const spec=models.byKind[kind];assert.equal(spec.category,'UTILITY');assert.deepEqual(spec.components.map(c=>c.type),['BODY','FOOTER']);assert.ok(models.render(kind,spec.components[0].example.body_text[0]).body.length<1024)}
});
