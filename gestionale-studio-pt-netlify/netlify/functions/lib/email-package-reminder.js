'use strict';
const {createHash}=require('node:crypto');
const {romeTime}=require('./whatsapp-agenda');
const signature=require('./email-agenda-signature');
const SITE='4f4adb33-910e-45a8-89ca-3564c2d9930e';
const hash=v=>createHash('sha256').update(v).digest('hex');
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cycle(client){
 const notes=String(client.notes||'');const block=[...notes.matchAll(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/g)].at(-1);
 if(block){try{const ledger=JSON.parse(block[1]);const open=ledger.cycles.filter(c=>!c.closedAt);if(open.length!==1)return null;return {id:open[0].id,start:open[0].startDate,legacy:open[0].legacy===true};}catch{return null;}}
 const start=notes.match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/i)?.[1]||String(client.data_conferma||client.data_inizio||client.package_start||'').slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(start)?{id:'',start,legacy:true}:null;
}
function belongs(a,c){const id=String(a.notes||'').match(/\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]/i)?.[1];if(c.id&&id)return c.id===id;if(c.id&&!c.legacy)return false;const start=String(a.notes||'').match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/i)?.[1];return start?start===c.start:a.date>=c.start;}
function candidates(clients,appointments,instant){
 const {day,time}=romeTime(instant),result=[];
 for(const client of clients){
  if(client.active!==true||Number(client.sessions_remaining)!==2||Number(client.sessions_total)<2||!Number.isInteger(Number(client.sessions_total)))continue;
  const email=String(client.email||'').trim();if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email))continue;
  const c=cycle(client);if(!c||(!c.id&&!c.start))continue;
  const rows=appointments.filter(a=>['pt11','pt12'].includes(a.service_id)&&a.client_ids?.includes(client.id)&&belongs(a,c)&&a.status==='prenotato').sort((a,b)=>(a.date+a.start_time+a.id).localeCompare(b.date+b.start_time+b.id));
  // Saved balance is authoritative. Reject overdue or excess bookings; the last session may still need scheduling.
  if(rows.length<1||rows.length>2||String(rows[0].notes||'').includes('[ORARIO-PROVVISORIO]')||rows[0].date!==day||String(rows[0].start_time).slice(0,5)<=time||(rows[1]&&rows[1].date<=day))continue;
  result.push({key:'delivery/'+hash(client.id+'|'+(c.id||c.start)),clientId:client.id,email,name:client.nome||' ',appointmentId:rows[0].id,day});
 }
 return result;
}
function message(item,env){
 const paragraphs=[`Ciao ${esc(item.name.trim())},`,'ti ricordiamo che oggi è in programma la <strong>penultima seduta del tuo pacchetto Personal Training</strong>. Dopo questa seduta, ti resterà un ultimo appuntamento del pacchetto attuale.','Se desideri proseguire il tuo percorso, puoi già contattare la segreteria per concordare il rinnovo e organizzare le prossime sedute.','Puoi rispondere direttamente a questa email oppure parlarne con noi quando vieni in studio.','A presto!'];
 return {from:'NEACEA Desk <neacea.desk@gmail.com>',to:[item.email],reply_to:'neacea.desk@gmail.com',subject:'Il tuo pacchetto Personal Training sta per terminare',text:paragraphs.map(p=>p.replace(/<[^>]*>/g,'')).join('\n\n')+'\n\nCordiali saluti,\nNEACEA Desk · Segreteria e Accoglienza\nNEACEA STUDIO S.R.L.\nVia Francia 28, 09045 Quartu Sant’Elena (CA)\n+39 352 052 5230 · neacea.desk@gmail.com\nwww.neacea.com',html:`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promemoria pacchetto Personal Training</title><style>@media(max-width:600px){#neacea-signature td[width="178"],#neacea-signature td[width="362"]{display:block!important;width:auto!important;padding:8px 0!important;border:0!important;text-align:left!important}#neacea-signature img[width="156"]{margin:0!important}}</style></head><body style="margin:0;padding:24px 16px;background:#fff;color:#222;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:auto"><div style="font-size:15px;line-height:1.65">${paragraphs.map(p=>`<p style="margin:0 0 18px">${p}</p>`).join('')}</div><div style="margin-top:28px">${signature}</div></div></body></html>`};
}
function createService({db,store,env,now=()=>new Date(),fetchImpl=fetch}){
 async function all(table,query){const rows=[];for(let offset=0;;offset+=1000){const part=await db(table,query+'&order=id&limit=1000&offset='+offset);if(!Array.isArray(part))throw Error('database_invalid');rows.push(...part);if(part.length<1000)return rows;}}
 async function preview(){const [clients,appointments]=await Promise.all([all('clients','?select=id,nome,email,active,sessions_remaining,sessions_total,notes,data_conferma,data_inizio,package_start'),all('appointments','?select=id,date,start_time,status,service_id,client_ids,notes&service_id=in.(pt11,pt12)&status=eq.prenotato')]);return candidates(clients,appointments,now());}
 async function run(deploy){
  if(env.EMAIL_PACKAGE_REMINDER_ENABLED!=='true'||env.SITE_ID!==SITE||env.CONTEXT!=='production')return {skipped:'disabled'};
  const instant=now(),{day,time}=romeTime(instant);
  if((await store.get('verification',{type:'json'}))?.deploy!==deploy){const items=await preview();await store.setJSON('verification',{deploy,at:instant.toISOString(),eligible:items.length});return {verified:true,eligible:items.length};}
  if(time<'08:00'||time>='09:00')return {skipped:'outside_window'};
  if(!env.GMAIL_REMINDER_SECRET||!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(env.GMAIL_REMINDER_WEBAPP_URL||''))throw Error('email_unconfigured');
  const items=await preview();let accepted=0,pending=0;
  // Bounded work per invocation; later runs pick up any unsent eligible cycle.
  let attempted=0;
  for(const item of items){const previous=await store.getWithMetadata(item.key,{type:'json'});const old=previous?.data;
   if(old&&['accepted','failed','expired','uncertain'].includes(old.status))continue;
   if(old?.day&&old.day!==day){const {payload,...meta}=old;await store.setJSON(item.key,{...meta,status:'expired',leaseUntil:0},{onlyIfMatch:previous.etag});continue;}
   if(old?.leaseUntil>instant.getTime())continue;
   if(attempted++>=2)break;
   const record={...(old||{day,clientId:item.clientId,appointmentId:item.appointmentId,payload:message(item,env),createdAt:instant.toISOString()}),status:'pending',leaseUntil:instant.getTime()+120000};
   const claim=await store.setJSON(item.key,record,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});if(!claim.modified)continue;
   let status='pending',messageId=null;
   try{const response=await fetchImpl(env.GMAIL_REMINDER_WEBAPP_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.GMAIL_REMINDER_SECRET,key:item.key.slice(9),day,payload:record.payload}),signal:AbortSignal.timeout(8000)});const data=await response.json();if(response.ok&&data.status==='accepted'&&data.sender==='neacea.desk@gmail.com'){status='accepted';messageId=data.id;}else if(data.status==='uncertain')status='uncertain';else if(data.status==='rejected')status='failed';}catch{}
   const final={...record,status,messageId,leaseUntil:0};if(status!=='pending')delete final.payload;
   const saved=await store.setJSON(item.key,final,{onlyIfMatch:claim.etag});if(!saved.modified)throw Error('claim_changed');if(status==='accepted')accepted++;if(status==='pending')pending++;
  }
  const result={at:instant.toISOString(),eligible:items.length,accepted,pending};await store.setJSON('last-run',result);return result;
 }
 return {preview,run};
}
module.exports={cycle,belongs,candidates,message,createService,SITE};
