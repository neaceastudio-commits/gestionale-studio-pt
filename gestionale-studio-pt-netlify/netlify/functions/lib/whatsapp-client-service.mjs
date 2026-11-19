import {createHash} from 'node:crypto';
import models from './whatsapp-client-models.js';
import packageTools from './apple-calendar-package.js';
import participant from './pt-session-metadata.js';
import agenda from './whatsapp-agenda.js';
import {normalize} from './whatsapp-compose.mjs';
import {shift,instant} from './whatsapp-matrix-time.mjs';
const labels={pt11:'PT 1:1',pt12:'PT 1:2',nutrizione:'Nutrizione — prima visita',check:'Check nutrizionale',visbody:'Visbody',baiobit:'Baiobit',circuit:'Circuit Training'};
const idValid=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(id);
const dateValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
const clean=s=>String(s||'').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ').replace(/\s+/g,' ').trim().slice(0,100);
const dateLabel=day=>day.split('-').reverse().join('/');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function live(client){return client.active===true&&!/ibern|archiv|sospes/i.test(String(client.stato_abbonamento||''))&&idValid(client.id)}
function validLedger(client){
 const blocks=[...String(client.notes||'').matchAll(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/g)];
 if(!blocks.length)return !String(client.notes||'').includes('[NEACEA-PACKAGE-LEDGER-V1]');
 try{const ledger=JSON.parse(blocks.at(-1)[1]);return Array.isArray(ledger.cycles)&&(!ledger.cycles.length||ledger.cycles.some(c=>!c.closedAt))}catch{return false}
}
function item(rule,client,identity,parameters,source){
 const rendered=models.render(rule.kind,parameters),contact='cliente:'+client.id;
 const eventKey='client:'+rule.kind+':'+digest([client.id,...identity]);
 return {contact,name:clean(client.nome+' '+(client.cognome||'')),eventKey,revision:digest([contact,rendered,source,normalize(client.telefono)]),...rendered,part:0,parts:1};
}
export function buildClientItems(rule,scheduledAt,{clients,appointments},now=new Date()){
 rule=models.validateRule(rule);const day=agenda.romeTime(new Date(scheduledAt)).day,items=[],reference=new Date(Math.max(now.getTime(),new Date(scheduledAt).getTime()));let excluded=0;
 for(const client of clients){
  if(!live(client))continue;
  const first=clean(client.nome);if(!first||!normalize(client.telefono)||normalize(client.telefono)==='+393520525230'){excluded++;continue}
  const rows=appointments.filter(a=>Array.isArray(a.client_ids)&&a.client_ids.includes(client.id));
  try{
   if(rule.kind==='appointment'){
    const target=shift(day,rule.daysBefore);
    for(const a of rows){
     if(a.date!==target||a.status!=='prenotato'||!labels[a.service_id]||participant.status(a,client.id)!=='prenotato')continue;
     if(String(a.notes||'').includes('[ORARIO-PROVVISORIO]')||String(a.notes||'').includes('[RINNOVO-PREVISTO ')&&!String(a.notes||'').includes('[RINNOVO-CONFERMATO '))continue;
     const time=String(a.start_time||'').slice(0,5),at=dateValid(a.date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?instant(a.date,time):null;
     if(!idValid(a.id)||!at||at<=reference)continue;
     items.push(item(rule,client,['appointment',a.id,a.date,time,rule.daysBefore],[first,dateLabel(a.date),time,labels[a.service_id]],[a.id,a.date,time,a.service_id,a.operator_id]));
    }
    continue;
   }
   if(!Number.isInteger(client.sessions_total)||client.sessions_total<=0||!Number.isInteger(client.sessions_remaining)||client.sessions_remaining<0||client.sessions_remaining>client.sessions_total||!validLedger(client)){excluded++;continue}
   // Respect each participant's own status for paired lessons without changing
   // the stored appointment or the shared canonical cycle adapter.
   const own=rows.map(a=>({...a,status:participant.status(a,client.id)}));
   const info=packageTools.packageInfo(client,own,day),start=info.ctx.start;
   if(!dateValid(start)||start>day){excluded++;continue}
   const cycle=info.ctx.id||'legacy:'+start;
   if(rule.kind==='remaining'){
    if(info.remaining<=rule.remainingThreshold)items.push(item(rule,client,['remaining',cycle,start,rule.remainingThreshold],[first,dateLabel(start),String(info.remaining),String(info.total)],[cycle,start,info.remaining,info.total]));
   }else{
    if(info.remaining<=0||info.toSchedule!==0||info.scheduled!==info.remaining||!dateValid(info.endDate)||info.endDate<day||info.endDate>shift(day,rule.daysBefore))continue;
    const future=own.filter(a=>a.status==='prenotato'&&a.date>=day&&packageTools.inCycle(a,info.ctx));
    if(future.some(a=>String(a.notes||'').includes('[ORARIO-PROVVISORIO]'))){excluded++;continue}
    items.push(item(rule,client,['expiry',cycle,start,info.endDate,rule.daysBefore],[first,dateLabel(start),dateLabel(info.endDate)],[cycle,start,info.endDate,info.remaining,info.scheduled]));
   }
  }catch{excluded++}
 }
 return {items:items.sort((a,b)=>a.contact.localeCompare(b.contact)||a.body.localeCompare(b.body,'it')||a.eventKey.localeCompare(b.eventKey)),excluded};
}
export function createClientService({db,now=()=>new Date()}){
 async function all(table,query){const rows=[];for(let offset=0;offset<100000;offset+=1000){const page=await db(table,{query:query+'&limit=1000&offset='+offset});if(!Array.isArray(page))throw Error('client_data_unavailable');rows.push(...page);if(page.length<1000)return rows}throw Error('client_read_limit')}
 async function plan(rule,scheduledAt,{clientId}={}){
  rule=models.validateRule(rule);if(clientId&&!idValid(clientId))throw Error('invalid_client');
  const clients=await all('clients','?select=id,nome,cognome,active,telefono,sessions_total,sessions_remaining,notes,data_conferma,package_start,stato_abbonamento&order=id'+(clientId?'&id=eq.'+encodeURIComponent(clientId):''));
  const day=agenda.romeTime(new Date(scheduledAt)).day;
  const query='?select=id,date,start_time,service_id,client_ids,operator_id,status,notes&order=id'+(clientId?'&client_ids=cs.'+encodeURIComponent(JSON.stringify([clientId])):'')+(rule.kind==='appointment'?'&date=eq.'+shift(day,rule.daysBefore)+'&status=eq.prenotato':'');
  const appointments=clients.some(live)?await all('appointments',query):[];
  return buildClientItems(rule,scheduledAt,{clients,appointments},now());
 }
 return {plan};
}
