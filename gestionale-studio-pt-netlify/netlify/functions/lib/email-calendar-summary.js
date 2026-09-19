'use strict';
const {romeTime}=require('./whatsapp-agenda');
const signature=require('./email-agenda-signature');
const RECIPIENT='neacea.desk@gmail.com';
const SITE='4f4adb33-910e-45a8-89ca-3564c2d9930e';
const SERVICES={pt11:'PT 1:1',pt12:'PT 1:2',nutrizione:'Nutrizione — 1ª visita',check:'Check Nutrizionale',visbody:'Visbody',baiobit:'Baiobit',circuit:'Circuit',blocco:'Blocco agenda'};
const STATES={prenotato:'Prenotato',fatto:'Fatto',noshow:'No-show',annullato:'Annullato'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=r=>r?[r.nome,r.cognome].filter(Boolean).join(' ').trim():'';
const dateLabel=day=>new Intl.DateTimeFormat('it-IT',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(day+'T12:00:00Z'));
function windowFor(now){
 const {day,time}=romeTime(now),end=new Date(day+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);
 return {day,time,start:day+'T'+time,end:end.toISOString().slice(0,10)+'T'+time};
}
function buildSummary({appointments,clients,operators},now,env){
 const range=windowFor(now),cs=new Map(clients.map(c=>[c.id,c])),ops=new Map(operators.map(o=>[o.id,o]));
 const rows=appointments.filter(a=>{const t=a.date+'T'+String(a.start_time).slice(0,5);return t>=range.start&&t<range.end;}).sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time)||a.id.localeCompare(b.id));
 if(new Set(rows.map(a=>a.id)).size!==rows.length)throw Error('duplicate_appointment_rows');
 const totals={},days=new Map();
 const items=rows.map(a=>{
  const status=STATES[a.status]||a.status||'Stato non disponibile';totals[status]=(totals[status]||0)+1;
  const item={id:a.id,date:a.date,time:String(a.start_time).slice(0,5),duration:a.duration_min,clients:(a.client_ids||[]).map(id=>name(cs.get(id))||'Cliente non disponibile ('+id+')').join(' + ')||'—',pt:name(ops.get(a.operator_id))||'Operatore non disponibile',service:SERVICES[a.service_id]||a.service_id||'Appuntamento',status};
  if(!days.has(item.date))days.set(item.date,[]);days.get(item.date).push(item);return item;
 });
 const interval=`Dal ${dateLabel(range.day)} alle ${range.time} al ${dateLabel(range.end.slice(0,10))} alle ${range.time} (Europe/Rome)`;
 const subject=`NEACEA · Calendario prossimi 30 giorni · ${range.day.split('-').reverse().join('/')}`;
 const counts=Object.entries(totals).map(([s,n])=>`${s}: ${n}`).join(' · ');
 const note='Fotografia del Calendario NEACEA al momento della preparazione. Include tutti i servizi, gli operatori e gli stati, anche gli annullati. Le modifiche successive compariranno nel riepilogo della domenica seguente. Il CSV allegato contiene tutte le righe, anche se il programma di posta abbrevia la mail.';
 const line=i=>`${i.time} · ${i.duration} min · ${i.clients} · ${i.service} · ${i.pt} · ${i.status}`;
 const sections=[...days].map(([day,items])=>`<h2 style="font-size:17px;margin-top:26px">${esc(dateLabel(day))}</h2><table role="presentation" width="100%">${items.map(i=>`<tr><td style="padding:10px 0;border-bottom:1px solid #e4eaf0;line-height:1.6">${esc(line(i))}</td></tr>`).join('')}</table>`).join('');
 const text=[subject,interval,`Totale: ${items.length} appuntamenti`,counts,'',note,'',...[...days].flatMap(([d,is])=>[dateLabel(d),...is.map(line),'']),'NEACEA Desk · Segreteria e Accoglienza','NEACEA STUDIO S.R.L.','Via Francia 28, Quartu Sant’Elena','+39 352 052 5230 · neacea.desk@gmail.com'].join('\n');
 const html=`<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><style>@media(max-width:600px){#neacea-signature td[width="178"],#neacea-signature td[width="362"]{display:block!important;width:auto!important;padding:8px 0!important;border:0!important;text-align:left!important}#neacea-signature img[width="156"]{margin:0!important}}</style></head><body style="font-family:Arial,sans-serif;color:#17314a;margin:0;background:#f3f6f8"><table role="presentation" width="100%"><tr><td style="padding:20px"><table role="presentation" width="100%" style="max-width:760px;margin:auto;background:#fff"><tr><td style="padding:24px"><h1 style="font-size:24px">Calendario · prossimi 30 giorni</h1><p>${esc(interval)}</p><p><strong>${items.length} appuntamenti</strong><br>${esc(counts)}</p><p style="font-size:13px;line-height:1.6">${esc(note)}</p>${sections||'<p>Nessun appuntamento nel periodo.</p>'}<div style="margin-top:32px">${signature}</div></td></tr></table></td></tr></table></body></html>`;
 // Quote every cell and neutralize formulas before the CSV is opened in Excel.
 const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';
 const csv='\uFEFF'+[['ID appuntamento','Data','Ora','Durata (min)','Clienti','Operatore/PT','Servizio','Stato'],...items.map(i=>[i.id,i.date,i.time,i.duration,i.clients,i.pt,i.service,i.status])].map(r=>r.map(cell).join(';')).join('\r\n');
 return {range,count:items.length,totals,message:{from:env.EMAIL_AGENDA_FROM,to:[RECIPIENT],reply_to:env.EMAIL_AGENDA_REPLY_TO||RECIPIENT,subject,text,html,attachments:[{filename:`calendario-neacea-${range.day}-30-giorni.csv`,content:Buffer.from(csv).toString('base64')}]}};
}
function createService({db,store,env=process.env,now=()=>new Date(),fetchImpl=fetch}){
 async function all(table,query){const rows=[];for(let offset=0;;offset+=1000){const page=await db(table,{query:query+`&limit=1000&offset=${offset}`});if(!Array.isArray(page))throw Error('invalid_database_response');rows.push(...page);if(page.length<1000)return rows;}}
 async function preview(instant=now()){
  const range=windowFor(instant);
  const [appointments,clients,operators]=await Promise.all([
   all('appointments',`?select=id,date,start_time,duration_min,client_ids,operator_id,service_id,status&date=gte.${range.day}&date=lte.${range.end.slice(0,10)}&order=id`),
   all('clients','?select=id,nome,cognome&order=id'),all('operators','?select=id,nome,cognome&order=id')]);
  return buildSummary({appointments,clients,operators},instant,env);
 }
 async function run(){
  if(env.EMAIL_CALENDAR_SUMMARY_ENABLED!=='true')return {skipped:'disabled'};
  if(env.SITE_ID!==SITE||env.CONTEXT!=='production')return {skipped:'site_or_context_mismatch'};
  const instant=now(),{day,time}=romeTime(instant);
  if(new Date(day+'T12:00:00Z').getUTCDay()!==0||time<'20:00'||time>='21:00')return {skipped:'outside_sunday_window'};
  if(!env.RESEND_API_KEY||!env.EMAIL_AGENDA_FROM)throw Error('email_provider_not_configured');
  const key='delivery/'+day;let entry=await store.getWithMetadata(key,{type:'json'});
  if(entry?.data.status==='accepted'||entry?.data.status==='failed')return {day,status:entry.data.status,messageId:entry.data.messageId||null};
  if(entry?.data.leaseUntil>instant.getTime())return {day,status:'already_claimed'};
  const summary=entry?null:await preview(instant);
  const record={...(entry?.data||{payload:summary.message,count:summary.count,range:summary.range,createdAt:instant.toISOString(),attempts:0}),status:'pending',leaseUntil:instant.getTime()+120000,attempts:(entry?.data.attempts||0)+1};
  const claim=await store.setJSON(key,record,entry?{onlyIfMatch:entry.etag}:{onlyIfNew:true});
  if(!claim.modified)return {day,status:'already_claimed'};
  let status='pending',messageId=null,error='provider_outcome_unknown';
  try{
   const r=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'neacea-calendar-30days/'+day},body:JSON.stringify(record.payload),signal:AbortSignal.timeout(8000)});
   const data=await r.json();if(r.ok&&typeof data.id==='string'){status='accepted';messageId=data.id;error=null;}else{status=r.status===429||r.status>=500||r.status===409?'pending':'failed';error='provider_http_'+r.status;}
  }catch{}
  const final={...record,status,messageId,error,leaseUntil:0};
  if(status!=='pending')delete final.payload;
  const saved=await store.setJSON(key,final,{onlyIfMatch:claim.etag});
  if(!saved.modified)throw Error('delivery_result_not_saved');
  // Old retry payloads are no longer needed. Keep only delivery metadata.
  const old=await store.list({prefix:'delivery/'});
  for(const blob of old.blobs.filter(b=>b.key<key)){const previous=await store.getWithMetadata(blob.key,{type:'json'});if(previous?.data.payload){const {payload,...metadata}=previous.data;await store.setJSON(blob.key,{...metadata,status:metadata.status==='pending'?'expired':metadata.status},{onlyIfMatch:previous.etag});}}
  return {day,status,messageId,count:record.count,error};
 }
 return {preview,run};
}
module.exports={createService,buildSummary,windowFor,RECIPIENT,SITE};
