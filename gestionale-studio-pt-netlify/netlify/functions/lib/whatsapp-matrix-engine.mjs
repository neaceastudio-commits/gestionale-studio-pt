import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {active,production,rulePrefix,runPrefix,runId,nextRun,agendaDay,isClientRule} from './whatsapp-matrix-time.mjs';
import {agendaRevision} from './whatsapp-agenda-document.mjs';
import agendaModel from './whatsapp-agenda-text.js';
import {sendSelected} from './whatsapp-compose.mjs';
const maxDelay=15*60000;
const owners=new Set(['owner','admin','administrator','amministratore','titolare','super_admin','direzione']);
const secret=env=>env.PT_ACCESS_SECRET||env.RESEND_API_KEY;
const signature=(text,env)=>createHmac('sha256',secret(env)).update('whatsapp-matrix-worker-v1\n'+text).digest('hex');
export function signedRun(id,env,now=new Date()){
 const body=JSON.stringify({id,at:now.toISOString()});return {body,signature:signature(body,env)};
}
export function validSignature(body,sig,env,now=new Date()){
 try{const data=JSON.parse(body);if(!secret(env)||!Number.isFinite(Date.parse(data.at))||Math.abs(now-Date.parse(data.at))>5*60000||!/^\w[\w/-]*T\d{4}$/.test(data.id)||data.id.length>100||!/^[a-f0-9]{64}$/.test(sig||''))return false;return timingSafeEqual(Buffer.from(signature(body,env)),Buffer.from(sig))}catch{return false}
}
const runKey=id=>runPrefix+id;
const batchId=id=>{const h=createHash('sha256').update('agenda-matrix-v1/'+id).digest('hex').slice(0,32);return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)};
const read=(store,key)=>store.getWithMetadata(key,{type:'json'});
async function finish(store,id,status,extra={}){await store.setJSON(runKey(id)+'/outcome',{status,at:new Date().toISOString(),...extra},{onlyIfNew:true})}
async function authorized(run,{store,db,context,env,now}){
 if(!production(context,env)||now()-Date.parse(run.scheduledAt)>maxDelay)return false;
 const current=await read(store,rulePrefix+run.rule.id);
 if(!active(current?.data)||current.data.activation.id!==run.rule.activation.id||current.data.nextRunAt!==run.scheduledAt)return false;
 const rows=await db('operator_effective_roles',{query:'?select=active,system_roles,legacy_roles&operator_id=eq.'+encodeURIComponent(run.rule.activation.ownerId)});
 return rows.some(r=>r.active===true&&[...(r.system_roles||[]),...(r.legacy_roles||[])].some(role=>owners.has(String(role).toLowerCase())));
}
// Cron coordinates durable occurrences only. All provider work runs in the
// background function, avoiding the scheduler's 30-second execution limit.
export async function tick({store,env,context,fetchImpl=fetch,now=()=>new Date()}){
 if(!production(context,env))return {status:'inactive',dispatched:0};
 const {blobs}=await store.list({prefix:rulePrefix});let dispatched=0;const started=Date.now();
 for(const blob of blobs){
  if(Date.now()-started>22000)break;
  const current=await read(store,blob.key),rule=current?.data;
  if(!active(rule)||Date.parse(rule.nextRunAt)>now().getTime())continue;
  const id=runId(rule),key=runKey(id);
  let outcome=await read(store,key+'/outcome');
  if(!outcome&&now()-Date.parse(rule.nextRunAt)>maxDelay){
   await finish(store,id,'Scadenza saltata o interrotta. Nessun recupero automatico.');outcome=await read(store,key+'/outcome');
  }
  if(outcome){
   await store.setJSON(blob.key,{...rule,nextRunAt:nextRun(rule,now()),lastRun:{id,scheduledAt:rule.nextRunAt,...outcome.data}},{onlyIfMatch:current.etag});continue;
  }
  if(dispatched>=4||!secret(env))continue;
  await store.setJSON(key,{rule,scheduledAt:rule.nextRunAt,batch:batchId(id)},{onlyIfNew:true});
  const signed=signedRun(id,env,now());
  const response=await fetchImpl('https://calendario.neacea.com/.netlify/functions/whatsapp-matrix-worker-background',{method:'POST',redirect:'error',signal:AbortSignal.timeout(4500),headers:{'Content-Type':'application/json','X-NEACEA-Schedule':signed.signature},body:signed.body});
  if(response.status!==202)throw Error('matrix_worker_unavailable');
  dispatched++;
 }
 return {status:'ready',dispatched};
}
export async function execute(id,{store,env,context,db,provider,clientProvider,send=sendSelected,fetchImpl=fetch,now=()=>new Date()}){
 if(!production(context,env)||await read(store,runKey(id)+'/outcome'))return;
 const run=(await read(store,runKey(id)))?.data;
 if(!run)return;
 const check=()=>authorized(run,{store,db,context,env,now});
 if(!await check()){await finish(store,id,'Interrotta: matrice disattivata, autorizzazione revocata o scadenza superata.');return}
 if(isClientRule(run.rule))return executeClients(id,run,{store,env,context,db,provider,clientProvider,send,fetchImpl,now},check);
 let plan=(await read(store,runKey(id)+'/plan'))?.data;
 if(!plan){
  const [report,settings]=await Promise.all([provider.weeklyAgenda(agendaDay(run.rule,run.scheduledAt),run.rule.period),provider.settings()]);
  const items=[];let excluded=0;
  for(const row of report.agendas){
   const pt=settings.operators.find(o=>o.id===row.operatorId&&o.active);
   if(!row.count)continue;
   if(!pt?.whatsapp_phone||row.incomplete){excluded++;continue}
   let pages;try{pages=agendaModel.pages(report,row)}catch{await finish(store,id,'Agenda troppo lunga o incompleta. Nessun invio eseguito.');return}
   for(const page of pages)items.push({contact:'pt:'+row.operatorId,revision:agendaRevision(report,row),part:page.part,parts:pages.length});
  }
  await store.setJSON(runKey(id)+'/plan',{items,excluded},{onlyIfNew:true});
  plan=(await read(store,runKey(id)+'/plan')).data;
 }
 let accepted=0;
 for(const [index,item]of plan.items.entries()){
  let receipt=(await read(store,runKey(id)+'/part-'+index))?.data;
  if(!receipt){
   if(!await check()){await finish(store,id,'Interrotta: matrice disattivata, autorizzazione revocata o scadenza superata.',{accepted,total:plan.items.length,excluded:plan.excluded});return}
   let claimed=false;
   const response=await send({batch:run.batch,contact:item.contact,agenda:{rule:run.rule,previewAt:'today',format:'template',revision:item.revision,part:item.part,parts:item.parts}},{db,env,provider,store:()=>store,fetchImpl,scheduledAt:run.scheduledAt,beforeDispatch:check,onClaimed:()=>{claimed=true}});
   receipt=await response.json();
   // Another worker may own an in-flight claim. Never retry that message and
   // never mark its outcome until its worker has had time to persist it.
   if(receipt.status==='Esito da verificare'&&!claimed)return;
   await store.setJSON(runKey(id)+'/part-'+index,{...receipt,contact:item.contact,part:item.part,at:now().toISOString()},{onlyIfNew:true});
   receipt=(await read(store,runKey(id)+'/part-'+index)).data;
  }
  if(receipt.status!=='Accettato da Meta'){
   await finish(store,id,'Invio interrotto · '+receipt.status,{accepted,total:plan.items.length,excluded:plan.excluded});return;
  }
  accepted++;
 }
 await finish(store,id,plan.items.length?'Invii accettati da Meta.':'Nessun PT con agenda e numero disponibile.',{accepted,total:plan.items.length,excluded:plan.excluded});
}

async function executeClients(id,run,{store,env,db,provider,clientProvider,send,fetchImpl,now},check){
 let plan=(await read(store,runKey(id)+'/plan'))?.data;
 if(!plan){
  const computed=await clientProvider.plan(run.rule,run.scheduledAt);
  const items=computed.items.map(({contact,eventKey,revision,part,parts})=>({contact,eventKey,revision,part,parts}));
  await store.setJSON(runKey(id)+'/plan',{items,excluded:computed.excluded},{onlyIfNew:true});
  plan=(await read(store,runKey(id)+'/plan')).data;
 }
 let accepted=0,alreadyNotified=0,skipped=0;
 for(const [index,item]of plan.items.entries()){
  let receipt=(await read(store,runKey(id)+'/part-'+index))?.data;
  if(!receipt){
   if(!await check()){await finish(store,id,'Interrotta: matrice disattivata, autorizzazione revocata o scadenza superata.',{accepted,total:plan.items.length,excluded:plan.excluded,alreadyNotified,skipped});return}
   const current=async()=>{const r=await clientProvider.plan(run.rule,run.scheduledAt,{clientId:item.contact.slice(8)});return r.items.find(r=>r.eventKey===item.eventKey&&r.revision===item.revision)};
   const fresh=await current();
   if(!fresh)receipt={status:'Non inviato · dati cambiati o condizione cessata.'};
   else{
    let claimed=false;
    const response=await send({batch:run.batch,contact:item.contact,body:fresh.body,template:fresh.template,file:null},{db,env,provider,store:()=>store,fetchImpl,scheduledAt:run.scheduledAt,clientEventKey:item.eventKey,onClaimed:()=>{claimed=true},beforeDispatch:async()=>await check()&&Boolean(await current())});
    receipt=await response.json();
    if(receipt.status==='Esito da verificare'&&!claimed)return;
    if(receipt.status==='Accettato da Meta'&&!claimed)receipt.status='Già notificato';
   }
   await store.setJSON(runKey(id)+'/part-'+index,{...receipt,contact:item.contact,part:0,at:now().toISOString()},{onlyIfNew:true});
   receipt=(await read(store,runKey(id)+'/part-'+index)).data;
  }
  if(receipt.status==='Accettato da Meta')accepted++;
  else if(receipt.status==='Già notificato')alreadyNotified++;
  else if(receipt.status.startsWith('Non inviato'))skipped++;
  else{await finish(store,id,'Invio interrotto · '+receipt.status,{accepted,total:plan.items.length,excluded:plan.excluded,alreadyNotified,skipped});return}
 }
 await finish(store,id,plan.items.length?'Controllo clienti completato.':'Nessun cliente corrisponde alla condizione.',{accepted,total:plan.items.length,excluded:plan.excluded,alreadyNotified,skipped});
}
export function workerHandler(deps){return async(request,context)=>{
 if(!production(context,deps.env)||request.method!=='POST')return new Response(null,{status:404});
 const body=await request.text();
 if(body.length>1000||!validSignature(body,request.headers.get('X-NEACEA-Schedule'),deps.env,deps.now?.()||new Date()))return new Response(null,{status:403});
 await execute(JSON.parse(body).id,{...deps,context,store:deps.store()});
 return new Response(null,{status:204});
}}
