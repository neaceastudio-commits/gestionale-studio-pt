'use strict';
const crypto = require('node:crypto');
const packages = require('./apple-calendar-package');
const session = require('./pt-session-metadata');
const DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const active = c => c && c.active !== false && !/ibern/i.test(c.stato_abbonamento || '');
const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
const plus = (date,n) => new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const key = link => `${link.id||link.cycleId||''}|${link.start||''}`;
const tag = p => `[RINNOVO-PREVISTO ${p.id}]`;
function ledger(c) {
 const raw=String(c.notes||'').match(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/)?.[1];
 return raw?JSON.parse(raw):{version:1,cycles:[]};
}
function infer(clients,appointments,day=today()) {
 const primary=clients[0], sid=clients.length===2?'pt12':'pt11';
 const histories=clients.map(c=>{const rows=appointments.filter(a=>a.client_ids?.includes(c.id)&&['pt11','pt12'].includes(a.service_id)&&!a.notes?.includes('[RINNOVO-PREVISTO '));return {c,rows,ctx:packages.context(c,rows)};});
 const rows=histories.flatMap(h=>h.rows.filter(a=>a.status!=='annullato'&&packages.inCycle(a,h.ctx)));
 const last=rows.map(a=>a.date).sort().at(-1)||day;
 const currentLedger=[...ledger(primary).cycles].reverse().find(c=>!c.closedAt)||{};
 const days=currentLedger.days?.length?currentLedger.days:primary.giorni_settimana||[];
 const slots=days.map(name=>{
  const d=DAYS.findIndex(x=>x.toLowerCase()===String(name).toLowerCase());
  const candidates=rows.filter(a=>a.service_id===sid&&new Date(a.date+'T12:00:00Z').getUTCDay()===d&&!a.notes?.includes('[ORARIO-PROVVISORIO]')).sort((a,b)=>b.date.localeCompare(a.date));
  // A single rescheduled session must not replace the established weekly pattern.
  const counts=new Map();for(const a of candidates){const k=[a.start_time.slice(0,5),a.operator_id,a.duration_min].join('|');const v=counts.get(k)||{n:0,a};v.n++;counts.set(k,v);}
  const ranked=[...counts.values()].sort((a,b)=>b.n-a.n||b.a.date.localeCompare(a.a.date));const a=ranked[0]?.a;
  return {day:d,time:a?.start_time.slice(0,5)||currentLedger.time||'',operatorId:a?.operator_id||currentLedger.operatorId||primary.pt_assegnato||'',duration:a?.duration_min||60};
 });
 let issue='';
 if(!slots.length||slots.some(s=>s.day<0||!s.time||!s.operatorId))issue='Completa giorni, orari e PT della proposta.';
 if(rows.some(a=>a.status==='prenotato'&&a.notes?.includes('[ORARIO-PROVVISORIO]')))issue='Orari variabili: concorda gli orari prima di generare le lezioni.';
 for(const h of histories){const booked=h.rows.filter(a=>a.status==='prenotato'&&packages.inCycle(a,h.ctx)).length;if(Number(h.c.sessions_remaining)>booked)issue='Il pacchetto corrente ha sedute residue ancora da programmare: verifica la decorrenza.';}
 return {serviceId:sid,startDate:plus(last>=day?last:plus(day,-1),1),slots,issue,
  clients:histories.map(({c,ctx})=>({id:c.id,source:{cycleId:ctx.id,start:ctx.start},cycleId:'expected_'+crypto.randomUUID().replaceAll('-',''),sessions:Number(c.sessions_total),amount:Number(c.importo)||0}))};
}
function appointmentsFor(p,existing=[],day=today()) {
 const plan=p.plan;
 if(plan.issue)return [];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate)||!Array.isArray(plan.slots)||!plan.slots.length||plan.slots.length>7)throw Error('Completa la decorrenza e i giorni della proposta');
 if(new Set(plan.slots.map(s=>Number(s.day))).size!==plan.slots.length)throw Error('Scegli giorni distinti');
 for(const s of plan.slots)if(!Number.isInteger(Number(s.day))||s.day<0||s.day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)||!s.operatorId||!Number.isInteger(Number(s.duration))||s.duration<15||s.duration>240||s.duration%15)throw Error('Orario, PT o durata non validi');
 for(const c of plan.clients)if(!Number.isInteger(c.sessions)||c.sessions<1||c.sessions>100||!Number.isFinite(c.amount)||c.amount<0)throw Error('Numero lezioni o importo non valido');
 if(plan.clients.length===2&&plan.clients[0].sessions!==plan.clients[1].sessions)throw Error('La proposta condivisa richiede lo stesso numero di lezioni; i residui precedenti restano separati');
 const count=plan.clients[0].sessions, kept=existing.filter(a=>a.status!=='prenotato'&&a.status!=='annullato');
 if(count<kept.length)throw Error('Non puoi eliminare lezioni già svolte');
 const reusable=existing.filter(a=>a.status==='prenotato').sort(packages.order||((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time)));
 const result=[...kept];
 for(let i=0;i<730&&result.length<count;i++){
  const date=plus(plan.startDate,i),slot=plan.slots.find(s=>Number(s.day)===new Date(date+'T12:00:00Z').getUTCDay());
  if(!slot||date<day||kept.some(a=>a.date===date))continue;
  const participants=Object.fromEntries(plan.clients.map(c=>[c.id,{cycleId:c.cycleId,start:plan.startDate,status:'prenotato'}]));
  const notes=[tag(p),'Rinnovo previsto — da confermare',`[NEACEA-PT-SESSION-V1]${JSON.stringify({version:1,rateCents:plan.serviceId==='pt12'?1500:1000,participants})}[/NEACEA-PT-SESSION-V1]`].join('\n');
  result.push({id:reusable.shift()?.id||'expected_'+crypto.randomUUID().replaceAll('-',''),service_id:plan.serviceId,client_ids:plan.clients.map(c=>c.id),operator_id:slot.operatorId,date,start_time:slot.time,duration_min:Number(slot.duration),buffer_min:0,status:'prenotato',notes});
 }
 if(result.length!==count)throw Error('Non sono disponibili abbastanza date nel periodo della proposta');
 return result;
}
function activationClients(p,clients,appointments) {
 const now=new Date().toISOString();
 return p.plan.clients.map(spec=>{
  const c=clients.find(c=>c.id===spec.id),l=ledger(c);const prev=[...l.cycles].reverse().find(x=>!x.closedAt);
  if(prev){prev.closedAt=now;prev.sessionsRemainingAtClose=Number(c.sessions_remaining);prev.sessionsCompletedAtClose=Number(c.sessions_total)-Number(c.sessions_remaining);prev.sessionsScheduledAtClose=0;}
  else l.cycles.push({id:'legacy_'+spec.id+'_'+spec.source.start,startDate:spec.source.start,legacy:true,source:'legacy',closedAt:now,sessionsTotal:Number(c.sessions_total),sessionsRemainingAtClose:Number(c.sessions_remaining),amount:Number(c.importo)||0,openingPaidAmount:c.stato_pagamento==='Pagato'?Number(c.importo)||0:0,legacyPaymentStatus:c.stato_pagamento,payments:[]});
  const used=appointments.filter(a=>a.status!=='annullato'&&(session.status(a,c.id)==='fatto'||p.plan.serviceId==='pt12'&&session.status(a,c.id)==='noshow')).length;
  l.cycles.push({id:spec.cycleId,source:'renewal',legacy:false,startDate:p.plan.startDate,createdAt:now,closedAt:'',sessionsTotal:spec.sessions,amount:spec.amount,openingPaidAmount:0,payments:[],frequency:p.plan.slots.length+'x settimana',days:p.plan.slots.map(s=>DAYS[s.day]),time:p.plan.slots[0].time,operatorId:p.plan.slots[0].operatorId,note:'Rinnovo previsto confermato dalla Direzione'});l.updatedAt=now;l.createdAt||=now;
  const clean=String(c.notes||'').replace(/\[NEACEA-PACKAGE-LEDGER-V1\][\s\S]*?\[\/NEACEA-PACKAGE-LEDGER-V1\]/g,'').replace(/\[CICLO-PACCHETTO\s+[^\]]+\]/g,'').trim();
  return {id:c.id,expectedUpdatedAt:c.updated_at,patch:{id:c.id,notes:clean+'\n[NEACEA-PACKAGE-LEDGER-V1]\n'+JSON.stringify(l)+'\n[/NEACEA-PACKAGE-LEDGER-V1]',sessions_total:spec.sessions,sessions_remaining:Math.max(0,spec.sessions-used),package_start:p.plan.startDate,data_conferma:p.plan.startDate,package_frequency:p.plan.slots.length+'x settimana',giorni_settimana:p.plan.slots.map(s=>DAYS[s.day]),importo:spec.amount,stato_pagamento:'Da pagare'}};
 });
}
function createService({db}) {
 const rpc=(actor,action,payload)=>db('rpc/calendar_expected_renewal',{method:'POST',body:{p_actor_id:actor,p_action:action,p_payload:payload}});
 async function snapshot(){const [clients,appointments,proposals]=await Promise.all([all('clients'),all('appointments'),all('calendar_expected_renewals')]);return {clients,appointments,proposals};}
 async function all(table){const rows=[];for(let n=0;n<100000;n+=1000){const page=await db(table,{query:`?select=*&order=id&limit=1000&offset=${n}`});rows.push(...page);if(page.length<1000)return rows;}throw Error('Calendario troppo ampio');}
 async function run(actor='staff_1') {
  const s=await snapshot(), results=[];
  for(const p of s.proposals.filter(p=>p.state==='confirmed')){
   const cs=p.plan.clients.map(c=>s.clients.find(x=>x.id===c.id));
   if(cs.some(c=>!active(c)))continue;
   const ready=cs.every(c=>Number(c.sessions_remaining)===0&&!s.appointments.some(a=>a.status==='prenotato'&&a.client_ids?.includes(c.id)&&!a.notes?.includes('[RINNOVO-PREVISTO ')&&packages.inCycle(a,packages.context(c,s.appointments.filter(x=>x.client_ids?.includes(c.id)&&!x.notes?.includes('[RINNOVO-PREVISTO '))))));
   if(ready){try{await rpc(actor,'activate',{id:p.id,version:p.version,clients:activationClients(p,cs,s.appointments.filter(a=>a.notes?.includes(tag(p))))});results.push({id:p.id,activated:true});}catch(e){results.push({id:p.id,error:e.message});}}
  }
  const handled=new Set();
  for(const c of s.clients.filter(c=>active(c)&&Number(c.sessions_total)>0&&Number(c.sessions_remaining)<=2&&c.package_types?.some(t=>/^PT 1:[12]$/.test(t)))){
   if(handled.has(c.id)||s.proposals.some(p=>['pending','confirmed'].includes(p.state)&&p.client_ids.includes(c.id)))continue;
   const cs=c.pt_partner_id?[c,s.clients.find(x=>x.id===c.pt_partner_id)]:[c];
   if(cs.some(x=>!active(x))||cs.length===2&&cs[1].pt_partner_id!==c.id)continue;
   cs.forEach(x=>handled.add(x.id));
   const p={id:crypto.randomUUID(),plan:infer(cs,s.appointments)};
   if(s.proposals.some(old=>old.plan.clients.some(pc=>p.plan.clients.some(nc=>pc.id===nc.id&&key(pc.source)===key(nc.source)))))continue;
   let appointments;try{appointments=appointmentsFor(p);}catch(e){p.plan.issue=e.message;appointments=[];}
   try{await rpc(actor,'create',{...p,appointments,clients:cs.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))});results.push({id:p.id,created:true});}
   catch(e){if(appointments.length){try{p.plan.issue='Calendario da verificare: '+e.message;await rpc(actor,'create',{...p,appointments:[],clients:cs.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))});results.push({id:p.id,review:true});}catch(err){results.push({id:p.id,error:err.message});}}else results.push({id:p.id,error:e.message});}
  }
  return {results};
 }
 async function handle(actor,input){
  if(input.action==='refresh'){await run(actor);input={action:'list'};}
  if(input.action==='list'){const s=await snapshot();return {proposals:s.proposals.filter(p=>['pending','confirmed'].includes(p.state)&&p.client_ids.every(id=>active(s.clients.find(c=>c.id===id)))).map(p=>({...p,names:p.client_ids.map(id=>{const c=s.clients.find(c=>c.id===id);return `${c?.nome||''} ${c?.cognome||''}`.trim();}),performed:s.appointments.filter(a=>a.notes?.includes(tag(p))&&['fatto','noshow'].includes(a.status)).length,booked:s.appointments.filter(a=>a.notes?.includes(tag(p))&&a.status==='prenotato').length}))};}
  if(!['edit','confirm','decline'].includes(input.action))throw Error('Azione rinnovo non valida');
  const s=await snapshot(),p=s.proposals.find(p=>p.id===input.id);if(!p)throw Error('Proposta non trovata');
  if(input.action==='edit'){
   const next={...p,plan:{...p.plan,startDate:input.startDate,slots:input.slots,issue:'',clients:p.plan.clients.map(c=>({...c,sessions:Number(input.clients?.find(x=>x.id===c.id)?.sessions),amount:Number(input.clients?.find(x=>x.id===c.id)?.amount)}))}};
   if(s.appointments.some(a=>a.notes?.includes(tag(p))&&['fatto','noshow'].includes(a.status))&&next.plan.startDate!==p.plan.startDate)throw Error('La decorrenza resta invariata dopo la prima lezione svolta');
   return rpc(actor,'edit',{id:p.id,version:input.version,plan:next.plan,appointments:appointmentsFor(next,s.appointments.filter(a=>a.notes?.includes(tag(p))))});
  }
  const r=await rpc(actor,input.action,{id:p.id,version:input.version});
  if(input.action==='confirm'){
   const result=await run(actor),updated=await db('calendar_expected_renewals',{query:'?id=eq.'+encodeURIComponent(p.id)});
   return {...(updated[0]||r),activationError:result.results.find(x=>x.id===p.id&&x.error)?.error||null};
  }
  return r;
 }
 return {run,handle,snapshot};
}
module.exports={infer,appointmentsFor,activationClients,createService};
