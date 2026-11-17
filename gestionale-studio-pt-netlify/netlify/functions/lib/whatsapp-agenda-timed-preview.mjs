import {randomUUID,timingSafeEqual} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import {sendSelected} from './whatsapp-compose.mjs';
import {agendaRevision} from './whatsapp-agenda-document.mjs';
import {listTemplates} from './whatsapp-templates.mjs';
import {deliveryStatuses} from './whatsapp-delivery.mjs';
import ruleTools from './whatsapp-agenda-rule.js';
export const targets=[{id:'staff_1776161672858',name:'Alessandro',suffix:'4254'},{id:'op_1789402428545_hgw9',name:'Tamara',suffix:'2637'}];
const planKey='agenda-timed-preview-v1/plan',claimKey='agenda-timed-preview-v1/claim';
const rule={frequency:'weekly',weekday:1,time:'08:00',period:'week',offset:0};
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
export function previewAllowed(context,env){return context.deploy?.context==='deploy-preview'&&!context.deploy.published&&context.site?.id==='28855faa-de52-4e4c-b1c2-e2db4965670f'&&env.WHATSAPP_AGENDA_SITE_ID===context.site.id}
export async function authorized(input,request,env,authenticate,now=Date.now){
 if(typeof input?.accessToken==='string'&&(await authenticate(input.accessToken))?.role==='owner')return true;
 // A short-lived machine credential permits only this fixed, one-shot preview test.
 let config;try{config=JSON.parse(env.WHATSAPP_AGENDA_PREVIEW_TEST_AUTH||'{}')}catch{return false}
 const key=request.headers.get('x-neacea-preview-test')||'';
 return typeof config.key==='string'&&config.key.length>=40&&Number.isFinite(config.expiresAt)&&now()<config.expiresAt&&equal(key,config.key);
}
export async function readTimedAgenda({store,env}){
 const plan=await store.get(planKey,{type:'json'});
 if(!plan)return {state:'ready',targets:targets.map(({id,name})=>({id,name}))};
 const results=await Promise.all(targets.map(async t=>({id:t.id,name:t.name,...await store.get(planKey+'/result/'+t.id,{type:'json'})})));
 const messageIds=results.map(r=>r.messageId).filter(Boolean);
 const delivery=messageIds.length?await(await deliveryStatuses({messageIds},{store,env})).json():{results:[]};
 return {...plan,results:results.map(r=>({...r,delivery:delivery.results.find(x=>x.messageId===r.messageId)||null}))};
}
export async function runTimedAgenda({store,env,db,provider,now=Date.now,wait=sleep,send=sendSelected,templates=listTemplates}){
 let plan=await store.get(planKey,{type:'json'});
 if(!plan){
  const [directory,catalogue]=await Promise.all([provider.directory(),templates(env)]);
  for(const t of targets){const op=directory.operators.find(o=>o.id===t.id);if(!op?.active||!op.whatsapp_phone?.endsWith(t.suffix))throw Error('recipient_unavailable')}
  if(!catalogue.templates.some(t=>t.name==='neacea_agenda_pt_documento_v1'&&t.language==='it'&&t.status==='APPROVED'&&t.supported))throw Error('template_unavailable');
  await provider.verifySender();
  await store.setJSON(planKey,{state:'scheduled',createdAt:now(),dueAt:now()+120000,batch:randomUUID(),rule,targets:targets.map(({id,name})=>({id,name}))},{onlyIfNew:true});
  plan=await store.get(planKey,{type:'json'});
 }
 if(plan.state!=='scheduled')return;
 while(now()<plan.dueAt)await wait(Math.min(30000,plan.dueAt-now()));
 if(!(await store.set(claimKey,'claimed',{onlyIfNew:true})).modified)return;
 if(now()>plan.dueAt+300000){await store.setJSON(planKey,{...plan,state:'expired',completedAt:now()});return}
 await store.setJSON(planKey,{...plan,state:'running',startedAt:now()});
 let failures=0;
 for(const target of targets){
  let result;
  try{
   const projection=ruleTools.projection(rule,'today',new Date(now()));
   const report=await provider.weeklyAgenda(projection.day,projection.period);
   const row=report.agendas.find(a=>a.operatorId===target.id);
   if(!row||!row.count||row.incomplete)throw Error('agenda_unavailable');
   const response=await send({batch:plan.batch,contact:'pt:'+target.id,agenda:{rule,previewAt:'today',revision:agendaRevision(report,row)}},{db,env,provider,store:()=>store});
   const outcome=await response.json();
   result={status:outcome.status,messageId:outcome.messageId||null,count:row.count,start:report.start,end:report.end,attemptedAt:now()};
   if(!result.messageId)failures++;
  }catch{failures++;result={status:'Prova non completata. Verificare agenda e configurazione.',messageId:null,attemptedAt:now()}}
  await store.setJSON(planKey+'/result/'+target.id,result);
 }
 await store.setJSON(planKey,{...plan,state:failures?'completed_with_errors':'completed',completedAt:now()});
}
