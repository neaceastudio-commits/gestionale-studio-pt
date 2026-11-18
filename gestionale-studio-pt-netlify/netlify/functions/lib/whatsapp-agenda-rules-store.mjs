import rules from './whatsapp-agenda-rule.js';
import agendaModel from './whatsapp-agenda-text.js';
import {deliveryStatuses} from './whatsapp-delivery.mjs';
import {active,nextRun,production,rulePrefix as prefix,runPrefix,runId,uuid} from './whatsapp-matrix-time.mjs';
export async function agendaRules(input, store, {actor,env={},context,templates,provider,now=()=>new Date()}={}) {
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  async function latest(record){
    let last=record.lastRun||null;
    if(active(record)&&Date.parse(record.nextRunAt)<=now().getTime()){
      const id=runId(record),run=await store.getWithMetadata(runPrefix+id,{type:'json'});
      if(run)last={id,scheduledAt:record.nextRunAt,status:'Invio in corso o in attesa del servizio.'};
    }
    if(last){const outcome=await store.getWithMetadata(runPrefix+last.id+'/outcome',{type:'json'});if(outcome)last={...last,...outcome.data}}
    return last;
  }
  if(input.action==='agenda-run-status'){
    if(typeof input.id!=='string'||!/^([a-f0-9-]{36})\/\d{4}-\d{2}-\d{2}T\d{4}$/.test(input.id))return reply({error:'invalid_run'},400);
    const plan=(await store.getWithMetadata(runPrefix+input.id+'/plan',{type:'json'}))?.data;
    if(!plan)return reply({messages:[],notice:'Nessun messaggio preparato per questa scadenza.'});
    const receipts=await Promise.all(plan.items.map((item,i)=>store.getWithMetadata(runPrefix+input.id+'/part-'+i,{type:'json'})));
    const ids=receipts.filter(r=>r?.data?.messageId).map(r=>r.data.messageId),states=new Map();
    for(let i=0;i<ids.length;i+=100){const result=await (await deliveryStatuses({messageIds:ids.slice(i,i+100)},{store,env})).json();for(const r of result.results)states.set(r.messageId,r)}
    return reply({messages:plan.items.map((item,i)=>({contact:item.contact,part:item.part,parts:item.parts,status:states.get(receipts[i]?.data?.messageId)?.status||receipts[i]?.data?.status||'Non inviato',codes:states.get(receipts[i]?.data?.messageId)?.codes||[]}))});
  }
  if(input.action==='agenda-rules') {
    const {blobs}=await store.list({prefix});
    const rows=await Promise.all(blobs.map(b=>store.getWithMetadata(b.key,{type:'json'})));
    return reply({rules:(await Promise.all(rows.filter(r=>r?.data).map(async r=>({...r.data,enabled:active(r.data),lastRun:await latest(r.data),revision:r.etag})))).sort((a,b)=>a.title.localeCompare(b.title,'it'))});
  }
  if(input.action==='agenda-toggle-rule'){
    if(!uuid.test(input.id)||!uuid.test(input.requestId)||typeof input.enabled!=='boolean'||typeof input.revision!=='string')return reply({error:'invalid_rule'},400);
    const old=await store.getWithMetadata(prefix+input.id,{type:'json'});
    if(!old)return reply({error:'not_found'},404);
    if(old.data.toggleRequestId===input.requestId&&active(old.data)===input.enabled)return reply({rule:{...old.data,revision:old.etag}});
    if(old.etag!==input.revision)return reply({error:'version_conflict'},409);
    let record={...old.data,lastRun:await latest(old.data),enabled:false,activation:null,nextRunAt:null,toggleRequestId:input.requestId,updatedAt:now().toISOString()};
    if(input.enabled){
      if(!production(context,env))return reply({error:'Attivazione disponibile solo sul dominio di produzione.'},409);
      if(!actor?.id||!(env.PT_ACCESS_SECRET||env.RESEND_API_KEY)||!env.WHATSAPP_ACCESS_TOKEN||env.WHATSAPP_SENDER_PHONE!=='+393520525230'||env.WHATSAPP_PHONE_NUMBER_ID!=='1153168214557448'||!/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION||''))return reply({error:'Configurazione della programmazione non disponibile.'},409);
      const issue=agendaModel.templateIssue((await templates(env)).templates);
      if(issue)return reply({error:issue},409);
      await provider.verifySender();
      rules.validateRule(old.data);
      record={...record,schemaVersion:2,enabled:true,activation:{id:input.requestId,ownerId:actor.id,at:now().toISOString()},nextRunAt:nextRun(old.data,now())};
    }
    const saved=await store.setJSON(prefix+input.id,record,{onlyIfMatch:old.etag});
    if(!saved.modified)return reply({error:'version_conflict'},409);
    return reply({rule:{...record,revision:saved.etag}});
  }
  const r=input.rule;
  if(!uuid.test(r?.id)||typeof r.title!=='string'||!r.title.trim()||r.title.length>90||
     typeof r.intro!=='string'||r.intro.length>2000||typeof r.link!=='string'||
     r.link.length>2000||(r.link&&!/^https?:\/\//i.test(r.link))) return reply({error:'invalid_rule'},400);
  let spec;
  try{spec=rules.validateRule(r)}catch{return reply({error:'invalid_rule'},400)}
  const previous=r.revision?await store.getWithMetadata(prefix+r.id,{type:'json'}):null;
  // Editing always pauses. Neither enabled nor activation supplied by clients is trusted.
  const record={...spec,id:r.id,title:r.title.trim(),intro:r.intro,link:r.link,schemaVersion:2,enabled:false,activation:null,nextRunAt:null,updatedAt:now().toISOString(),lastRun:previous?.data?await latest(previous.data):null};
  const options=r.revision?{onlyIfMatch:r.revision}:{onlyIfNew:true};
  const result=await store.setJSON(prefix+r.id,record,options);
  if(!result.modified)return reply({error:'version_conflict'},409);
  return reply({rule:{...record,revision:result.etag}});
}
