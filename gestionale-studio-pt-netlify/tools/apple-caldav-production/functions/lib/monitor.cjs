'use strict';
const crypto=require('node:crypto');
const {XMLParser,XMLValidator}=require('fast-xml-parser');
const {CalDAV,parse,slot}=require('./core.cjs');
const {buildCalendar}=require('../../../../netlify/functions/apple-calendar')._test;
const {romeTime}=require('../../../../netlify/functions/lib/whatsapp-agenda');
const SITE='305b1dd7-9d1e-4e96-87ef-5619de0f5130';
const list=v=>v===undefined?[]:Array.isArray(v)?v:[v];
const display=ics=>ics.replace(/\r?\n[ \t]/g,'').split(/\r?\n/).filter(l=>/^(SUMMARY|DESCRIPTION|LOCATION|CATEGORIES|STATUS):/.test(l)).sort().join('\n');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function inventory(cal){
 await cal.verify();
 const response=await cal.request(cal.base,'REPORT','<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"/></c:comp-filter></c:filter></c:calendar-query>',{Depth:'1','Content-Type':'application/xml'});
 if(response.status!==207)throw Error('Apple HTTP '+response.status);
 const xml=await response.text();if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Risposta Apple non valida');
 const tree=new XMLParser({removeNSPrefix:true,ignoreAttributes:false,parseTagValue:false,trimValues:false}).parse(xml);
 if(!tree.multistatus)throw Error('Inventario Apple incompleto');
 return list(tree.multistatus.response).map(r=>{const props=list(r.propstat);const good=props.find(p=>/\s200(?:\s|$)/.test(String(p.status))&&p.prop?.['calendar-data']);const data=good?.prop?.['calendar-data'];const ics=typeof data==='string'?data:data?.['#text'];if(!ics){console.error(JSON.stringify({inventoryResponse:{keys:Object.keys(r),props:props.map(p=>({status:p.status,keys:Object.keys(p.prop||{})}))}}));throw Error('Evento Apple non leggibile');}return {href:cal.url(r.href),ics};});
}
function compare({rows,clients,operators,mappings,events,lastRun,now,cal}){
 const issues=[],names=new Map(clients.map(c=>[c.id,[c.nome,c.cognome].filter(Boolean).join(' ')]));
 const add=(code,id,detail='')=>{const row=rows.find(r=>r.id===id);issues.push({key:hash([code,id,detail]),code,id,detail,label:row?`${row.date} ${row.start_time.slice(0,5)} · ${(row.client_ids||[]).map(i=>names.get(i)||i).join(' + ')}`:id||''});};
 if(!lastRun?.at||now-Date.parse(lastRun.at)>600000)add('Sincronizzazione non aggiornata','');
 for(const f of lastRun?.failures||[])add('Errore sincronizzazione',f.key,f.error);
 const full=buildCalendar(rows,clients,operators).body,expected=new Map((full.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[]).map(e=>[e.match(/^UID:(.*)\r?$/m)?.[1].trim().split('@')[0],e]));
 const byHref=new Map(events.map(e=>[cal.url(e.href),e]));const knownUids=new Set(mappings.map(m=>m.uid));const uidCounts=new Map();
 for(const e of events){const uid=e.ics.replace(/\r?\n[ \t]/g,'').match(/^UID:(.*)\r?$/m)?.[1].trim();if(knownUids.has(uid))uidCounts.set(uid,(uidCounts.get(uid)||0)+1);}
 const local=romeTime(new Date(now));
 for(const r of rows){if(r.status!=='annullato'&&r.date+' '+r.start_time.slice(0,5)>=local.day+' '+local.time&&!mappings.some(m=>m.id===r.id&&m.stage!=='retired'))add('Appuntamento non collegato',r.id);}
 for(const m of mappings){const r=rows.find(r=>r.id===m.id),e=byHref.get(cal.url(m.href));
  if((uidCounts.get(m.uid)||0)>1)add('Evento duplicato',m.id);
  if(m.stage==='retired'){if(e)add('Evento ritirato ancora presente',m.id);continue;}
  if(!r){add('Appuntamento sorgente mancante',m.id);continue;}
  if(m.stage!=='linked')add('Collegamento incompleto',m.id);
  if(r.status==='annullato'){if(e)add('Evento annullato ancora presente',m.id);continue;}
  if(!e){add('Evento mancante su Apple',m.id);continue;}
  let a;try{a=parse(e.ics);}catch{add('Evento Apple non verificabile',m.id);continue;}
  if(a.uid!==m.uid||a.marker!==m.marker)add('Identità evento diversa',m.id);
  if(JSON.stringify(a.slot)!==JSON.stringify(slot(r)))add('Data, ora o durata diverse',m.id,JSON.stringify(a.slot));
  const f=expected.get(r.id);if(!f)add('Contenuto NEACEA non disponibile',m.id);else if(display(f)!==display(e.ics))add('PT, stato o contenuto diversi',m.id,hash(display(e.ics)));
 }
 return {at:new Date(now).toISOString(),checked:mappings.filter(m=>m.stage!=='retired').length,appleEvents:events.length,issues:issues.sort((a,b)=>a.key.localeCompare(b.key))};
}
function service({env,store,syncStore,db,cal=new CalDAV(env),now=Date.now,fetchImpl=fetch}){
 async function all(table,query){let out=[];for(let offset=0;;offset+=1000){const p=await db(table,{query:query+'&limit=1000&offset='+offset});if(!Array.isArray(p))throw Error('Database non leggibile');out.push(...p);if(p.length<1000)return out;}}
 async function inspect(){let phase='sources';const read=async(label,p)=>{try{return await p;}catch(error){const reason=label==='apple-inventory'&&/^(Apple HTTP \d+|Risposta Apple non valida|Inventario Apple incompleto|Evento Apple non leggibile|Outside dedicated collection|CalDAV verification failed|Wrong dedicated calendar|Invalid DAV XML)$/.test(error.message)?': '+error.message:'';throw Error(label+reason);}};try{const [rows,clients,operators,blobs,lastRun,events]=await Promise.all([read('appointments',all('appointments','?select=id,date,start_time,duration_min,client_ids,operator_id,service_id,status,notes&order=id')),read('clients',all('clients','?select=id,nome,cognome,active,sessions_total,sessions_remaining,package_start,data_inizio,data_conferma,notes&order=id')),read('operators',all('operators','?select=id,nome,cognome,active&order=id')),read('mapping-list',syncStore.list({prefix:'mapping/'})),read('last-run',syncStore.get('last-run',{type:'json'})),read('apple-inventory',inventory(cal))]);phase='mapping-read';const mappings=await Promise.all(blobs.blobs.map(b=>syncStore.get(b.key,{type:'json'})));if(mappings.some(m=>!m))throw Error('Mapping incompleto');phase='comparison';return compare({rows,clients,operators,mappings,events,lastRun,now:now(),cal});}catch(error){const source=phase==='sources'?error.message:phase;return {at:new Date(now()).toISOString(),checked:0,issues:[{key:hash('inspection_failed'),code:'Controllo incompleto: Apple o NEACEA non leggibile',id:'',detail:source,label:''}]};}}
 async function run(deploy){
  if(env.CALDAV_MONITOR_ENABLED!=='true'||env.SITE_ID!==SITE||env.CONTEXT!=='production')return {skipped:'disabled_or_wrong_site'};
  const verification=await store.get('verification',{type:'json'});
  // A new release gets a read-only probe, even outside the nightly mail window.
  if(verification?.deploy!==deploy){const report=await inspect();await store.setJSON('verification',{deploy,...report});return {verified:true,issues:report.issues.length};}
  const {day,time}=romeTime(new Date(now()));if(time<'23:30'||time>'23:55')return {skipped:'outside_window'};
  const key='day/'+day;const entry=await store.getWithMetadata(key,{type:'json'});if(entry?.data.done)return {skipped:'already_checked'};
  if(entry?.data.leaseUntil>now()||entry?.data.nextCheck>now())return {skipped:'waiting'};
  let state={...entry?.data,leaseUntil:now()+90000};let claim=await store.setJSON(key,state,entry?{onlyIfMatch:entry.etag}:{onlyIfNew:true});if(!claim.modified)return {skipped:'claimed'};
  if(!state.payload){const report=await inspect(),known=await store.get('known',{type:'json'})||[];const fresh=report.issues.filter(i=>!known.includes(i.key));await store.setJSON('last-report',report);
   if(fresh.length){const fingerprint=hash(fresh.map(i=>i.key));if(state.candidate!==fingerprint){await store.setJSON(key,{candidate:fingerprint,nextCheck:now()+120000,leaseUntil:0},{onlyIfMatch:claim.etag});return {confirming:fresh.length};}
    state={...state,keys:report.issues.map(i=>i.key),payload:{from:env.EMAIL_AGENDA_FROM||'NEACEA Desk <desk@neacea.com>',to:['neacea.desk@gmail.com'],reply_to:'neacea.desk@gmail.com',subject:'NEACEA · Anomalie allineamento calendario · '+day,text:['Controllo serale NEACEA / Apple',...fresh.map(i=>`${i.code}${i.label?' · '+i.label:''}${i.detail?' · '+i.detail:''}`),'','Gli eventi manuali Apple sono esclusi. Nessun evento o dato è stato modificato.','','NEACEA Desk · Segreteria e Accoglienza','NEACEA STUDIO S.R.L.'].join('\n')}};const saved=await store.setJSON(key,state,{onlyIfMatch:claim.etag});if(!saved.modified)throw Error('Claim changed');claim=saved;
   }else{await store.setJSON('known',report.issues.map(i=>i.key));await store.setJSON(key,{done:true,checked:report.checked,leaseUntil:0},{onlyIfMatch:claim.etag});return {ok:true,issues:report.issues.length};}
  }
  if(!env.RESEND_API_KEY)throw Error('Email non configurata');
  const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'neacea-caldav-monitor/'+day},body:JSON.stringify(state.payload),signal:AbortSignal.timeout(8000)});const data=await response.json();
  if(!response.ok||!data.id)throw Error('Invio email non confermato');
  await store.setJSON('known',state.keys);await store.setJSON(key,{done:true,messageId:data.id,leaseUntil:0},{onlyIfMatch:claim.etag});return {notified:true};
 }
 return {inspect,run};
}
module.exports={service,compare,inventory,SITE};
