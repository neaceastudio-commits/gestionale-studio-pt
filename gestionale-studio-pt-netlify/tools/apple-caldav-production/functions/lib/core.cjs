'use strict';
const crypto=require('node:crypto');
const {XMLParser,XMLValidator}=require('fast-xml-parser');
const auth=require('../../../../netlify/functions/lib/calendar-audit-auth');
const {buildCalendar}=require('../../../../netlify/functions/apple-calendar')._test;
const NAME='NEACEA — Operativo',HOST='neacea-caldav-gianluca.netlify.app';
const need=(ok,code)=>{if(!ok)throw Error(code)},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const list=x=>x===undefined?[]:Array.isArray(x)?x:[x];
const parts=(ms,tz='Europe/Rome')=>Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
function instant(value,tz='Europe/Rome'){
 need(/^\d{8}T\d{6}Z?$/.test(value),'Timed event required');const a=value.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/).slice(1).map(Number);const raw=Date.UTC(a[0],a[1]-1,a[2],a[3],a[4],a[5]);
 need(new Date(raw).toISOString().replace(/[-:]/g,'').slice(0,15)===value.slice(0,15),'Invalid date');if(value.endsWith('Z'))return raw;
 const offsets=new Set([-86400000,0,86400000].map(d=>{const p=parts(raw+d,tz);return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-(raw+d)}));
 const candidates=[...offsets].map(o=>raw-o).filter(ms=>{const p=parts(ms,tz);return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`===value});need(candidates.length===1,'Ambiguous or missing DST time');return candidates[0];
}
const slot=n=>({date:n.date,start_time:n.start_time.slice(0,5),duration_min:n.duration_min});
// Compare only NEACEA-owned display fields, never volatile ICS timestamps.
const display=ics=>ics.replace(/\r?\n[ \t]/g,'').split(/\r?\n/).filter(l=>/^(SUMMARY|DESCRIPTION|LOCATION|CATEGORIES|STATUS):/.test(l)).sort().join('\n');
const guard=n=>({client_ids:n.client_ids,operator_id:n.operator_id,service_id:n.service_id,status:n.status});
function parse(ics){
 const lines=ics.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);need(lines.filter(l=>l==='BEGIN:VEVENT').length===1&&lines.filter(l=>l==='END:VEVENT').length===1,'One VEVENT required');
 // VTIMEZONE daylight/standard RRULEs describe the clock, not repeated appointments.
 const body=lines.slice(lines.indexOf('BEGIN:VEVENT')+1,lines.indexOf('END:VEVENT'));need(!body.some(l=>/^(RRULE|RDATE|EXDATE|RECURRENCE-ID)[;:]/i.test(l)),'Recurrence forbidden');need(!body.some(l=>/^(BEGIN|END):/.test(l)),'Nested components unsupported');const props={};for(const l of body){const k=l.split(/[;:]/)[0].toUpperCase();(props[k]??=[]).push(l)}
 need(props.UID?.length===1&&props.DTSTART?.length===1,'UID and DTSTART required');const time=l=>{need(!l.includes('VALUE=DATE'),'Timed event required');const head=l.slice(0,l.indexOf(':')),v=l.slice(l.indexOf(':')+1),tz=head.match(/;TZID="?([^;"]+)/)?.[1];return instant(v,tz||'Europe/Rome')};const start=time(props.DTSTART[0]);need((props.DTEND?.length||0)+(props.DURATION?.length||0)===1,'End required');
 let end;if(props.DTEND)end=time(props.DTEND[0]);else{const d=props.DURATION[0].match(/^DURATION:PT(?:(\d+)H)?(?:(\d+)M)?$/);need(d,'Unsupported duration');end=start+((+d[1]||0)*60+(+d[2]||0))*60000}
 const minutes=(end-start)/60000;need(Number.isInteger(minutes)&&minutes>0&&minutes<=480&&start%60000===0,'Invalid duration');const p=parts(start);
 return {uid:props.UID[0].slice(4),marker:props['X-NEACEA-LINK-ID']?.[0].split(':')[1],slot:{date:`${p.year}-${p.month}-${p.day}`,start_time:`${p.hour}:${p.minute}`,duration_min:minutes}};
}
const stamp=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function rewrite(ics,s){parse(ics);const t=instant(s.date.replace(/-/g,'')+'T'+s.start_time.slice(0,5).replace(':','')+'00');let inside=false;const out=[];for(const l of ics.replace(/\r?\n[ \t]/g,'').split(/\r?\n/)){if(!l)continue;if(l==='BEGIN:VEVENT')inside=true;const k=l.split(/[;:]/)[0];if(inside&&k==='DTSTART')out.push('DTSTART:'+stamp(t),'DTEND:'+stamp(t+s.duration_min*60000));else if(!inside||!['DTEND','DURATION','DTSTAMP','LAST-MODIFIED','SEQUENCE'].includes(k)){if(l==='END:VEVENT')out.push('DTSTAMP:'+stamp(Date.now()));out.push(l)}if(l==='END:VEVENT')inside=false}return out.join('\r\n')+'\r\n'}
class CalDAV{
 constructor(env,fetcher=fetch){this.base=env.APPLE_CALDAV_URL;this.fetcher=fetcher;const u=new URL(this.base);need(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^(p\d+-)?caldav\.icloud\.com$/.test(u.hostname),'iCloud endpoint only');this.base=this.base.replace(/\/?$/,'/');this.headers={Authorization:'Basic '+Buffer.from(env.APPLE_CALDAV_USER+':'+env.APPLE_CALDAV_PASSWORD).toString('base64')};}
 url(href){const u=new URL(href,this.base),base=new URL(this.base),r=decodeURIComponent(u.pathname.slice(base.pathname.length));need(u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&r&&!r.includes('/')&&!['.','..'].includes(r)&&!u.search&&!u.hash,'Outside dedicated collection');return u.href}
 async request(url,method='GET',body,headers={}){const r=await this.fetcher(url,{method,body,headers:{...this.headers,...headers},redirect:'error',signal:AbortSignal.timeout(12000)});return r}
 async verify(){const r=await this.request(this.base,'PROPFIND','<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:resourcetype/></d:prop></d:propfind>',{Depth:'0','Content-Type':'application/xml'});need(r.status===207,'CalDAV verification failed');const xml=await r.text();need(!/<!DOCTYPE|<!ENTITY/i.test(xml)&&XMLValidator.validate(xml)===true,'Invalid DAV XML');const tree=new XMLParser({removeNSPrefix:true,ignoreAttributes:false}).parse(xml);const responses=list(tree.multistatus?.response);const props=responses.flatMap(x=>list(x.propstat)).filter(p=>String(p.status).includes(' 200 '));need(props.length===1&&props[0].prop?.displayname===NAME&&Object.hasOwn(props[0].prop?.resourcetype||{},'calendar'),'Wrong dedicated calendar');}
 async inventory(){const r=await this.request(this.base,'PROPFIND','<d:propfind xmlns:d="DAV:"><d:prop><d:getetag/></d:prop></d:propfind>',{Depth:'1','Content-Type':'application/xml'});need(r.status===207,'Collection inventory failed');const xml=await r.text();need(!/<!DOCTYPE|<!ENTITY/i.test(xml)&&XMLValidator.validate(xml)===true,'Invalid DAV XML');const tree=new XMLParser({removeNSPrefix:true,ignoreAttributes:false}).parse(xml);return list(tree.multistatus?.response).filter(x=>new URL(x.href,this.base).pathname!==new URL(this.base).pathname).map(x=>this.url(x.href));}
 async read(href){const r=await this.request(this.url(href));if(r.status===404)return null;need(r.status===200,'CalDAV read failed; not a deletion');const etag=r.headers.get('etag');need(etag&&!etag.startsWith('W/'),'Strong ETag required');return {etag,ics:await r.text()}}
 async put(href,ics,etag){const r=await this.request(this.url(href),'PUT',ics,{'Content-Type':'text/calendar; charset=utf-8',...(etag?{'If-Match':etag}:{'If-None-Match':'*'})});need([200,201,204].includes(r.status),'Conditional Apple write refused')}
 async delete(href,etag){const r=await this.request(this.url(href),'DELETE',undefined,{'If-Match':etag});need([200,204].includes(r.status),'Conditional Apple delete refused')}
}
function service({env=process.env,db=auth.db,store,cal=new CalDAV(env),now=Date.now}={}){
 let renderContext;
 const config=()=>{need(env.SITE_NAME==='neacea-caldav-gianluca'&&env.SITE_ID===env.APPLE_CALDAV_SITE_ID,'Isolated production site required');need(env.APPLE_CALDAV_ACTOR_ID==='staff_1'&&env.APPLE_CALDAV_USER==='ventofresco55@gmail.com','Gianluca only');need(env.APPLE_CALDAV_SYNC_ENABLED==='true','Sync disabled');need(Number.isFinite(Date.parse(env.APPLE_CALDAV_START_AT)),'Activation boundary required')};
 async function actor(){const rows=await db('operator_effective_roles',{query:'?select=*&operator_id=eq.staff_1&active=eq.true'});const op=rows[0];need(op&&[...(op.system_roles||[]),...(op.legacy_roles||[])].some(r=>['owner','admin','direzione','titolare'].includes(String(r).toLowerCase())),'Verified Direction required');return op}
 async function find(id){const rows=await db('appointments',{query:'?select=*&id=eq.'+encodeURIComponent(id)});need(Array.isArray(rows)&&rows.length<=1,'Invalid appointment lookup');return rows[0]||null}
 async function read(id){const row=await find(id);need(row,'Mapped appointment missing');return row}
 async function write(old,patch){need(['prenotato','annullato'].includes(old.status),'Fatto/no-show locked');need(Object.keys(patch).every(k=>['date','start_time','duration_min','status'].includes(k))&&(!patch.status||patch.status==='annullato'),'Protected fields');const r=await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:'staff_1',p_actor_role:'owner',p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'save',p_payload:{appointment:{...old,...patch},expected:old}}});return r.appointment}
 const key=id=>'mapping/'+crypto.createHash('sha256').update(id).digest('hex');
 const baseline=(n,a)=>({slot:slot(n),guard:guard(n),apple:a?parse(a.ics).slot:null});
 async function save(k,data,etag){const r=await store.setJSON(k,data,etag?{onlyIfMatch:etag}:{onlyIfNew:true});need(r.modified,'Mapping changed concurrently');return r.etag}
 async function locked(fn){config();await actor();const owner=crypto.randomUUID(),lease=await store.getWithMetadata('lease',{type:'json'}),start=now();need(!lease||lease.data.until<start,'Sync already running');const writeLease=await store.setJSON('lease',{owner,until:start+120000},lease?{onlyIfMatch:lease.etag}:{onlyIfNew:true});need(writeLease.modified,'Concurrent sync');const check=()=>need(now()<start+23000,'Batch deadline reached');try{renderContext=null;await cal.verify();return await fn(check)}finally{await store.setJSON('lease',{owner,until:0},{onlyIfMatch:writeLease.etag})}}
 function futureEligible(n){
  try{return ['prenotato','fatto','noshow'].includes(n.status)&&instant(n.date.replace(/-/g,'')+'T'+n.start_time.slice(0,5).replace(':','')+'00')>now()}catch{return false}
 }
 const manualEligible=n=>['pt11','pt12','circuit'].includes(n.service_id)&&futureEligible(n);
 async function linkStatus(id){config();await actor();need(typeof id==='string'&&id.length>0&&id.length<=160,'Appointment ID required');const n=await read(id),entry=await store.getWithMetadata(key(id),{type:'json'});return {eligible:manualEligible(n),linked:entry?.data.stage==='linked'&&entry.data.calendar===env.APPLE_CALDAV_URL};}
 async function render(n,record){
  // One fresh shared DB snapshot/formatter pass per batch, including client counters
  // and every appointment contributing to package progress and future planning.
  renderContext??=Promise.all([db('clients',{query:'?select=id,nome,cognome,active,sessions_total,sessions_remaining,package_start,data_inizio,data_conferma,notes'}),db('operators',{query:'?select=id,nome,cognome,active'}),allAppointments()]).then(([clients,operators,rows])=>{
   const full=buildCalendar(rows,clients,operators).body;
   return {clients,operators,rows,full,events:new Map((full.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[]).map(e=>[e.match(/^UID:(.*)\r?$/m)?.[1].trim(),e]))};
  });
  const ctx=await renderContext;
  let full=ctx.full,selected=ctx.events.get(n.id+'@calendar.neacea.it');
  if(!eq(ctx.rows.find(row=>row.id===n.id),n)){
   // An accepted inbound slot edit must be represented using the saved row.
   full=buildCalendar(ctx.rows.map(row=>row.id===n.id?n:row),ctx.clients,ctx.operators).body;
   selected=(full.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[]).find(e=>e.includes('UID:'+n.id+'@calendar.neacea.it\r\n'));
  }
  need(selected,'No active participant');
  let ics=full.slice(0,full.indexOf('BEGIN:VEVENT'))+selected+'\r\nEND:VCALENDAR\r\n';
  ics=ics.replace(/^METHOD:.*\r?\n/gm,'').replace(/^UID:.*$/m,()=> 'UID:'+record.uid).replace('END:VEVENT','X-NEACEA-LINK-ID:'+record.marker+'\r\nEND:VEVENT');
  return rewrite(ics,slot(n));
 }
 async function provision(id,check,manual=false){
  const k=key(id);let entry=await store.getWithMetadata(k,{type:'json'});if(entry?.data.stage==='linked')return;
  let n=await read(id);if(manual==='bootstrap'||manual===true){need((manual==='bootstrap'?futureEligible:manualEligible)(n),'Only future PT appointments can be linked')}else{need(Date.parse(n.created_at)>=Date.parse(env.APPLE_CALDAV_START_AT)&&n.date>=env.APPLE_CALDAV_START_AT.slice(0,10),'Historical backfill forbidden');need(manual==='automatic'?futureEligible(n):n.status==='prenotato','Only future booked appointments can be linked');}
  if(!entry){const record={id,href:'neacea-'+crypto.createHash('sha256').update(id).digest('hex')+'.ics',uid:id+'@calendar.neacea.it',marker:crypto.randomUUID(),calendar:env.APPLE_CALDAV_URL,origin:manual==='bootstrap'?'bootstrap':manual===true?'manual':'automatic',stage:'pending',baseline:{slot:slot(n),guard:guard(n),apple:slot(n)}};entry={data:record,etag:await save(k,record)}}
  const record=entry.data;need(record.calendar===env.APPLE_CALDAV_URL,'Collection changed');let a=await cal.read(record.href);
  if(!a){check();const ics=await render(n,record);check();await cal.put(record.href,ics);a=await cal.read(record.href)}
  need(a&&parse(a.ics).uid===record.uid&&parse(a.ics).marker===record.marker,'Unknown event at mapped path');need(eq(parse(a.ics).slot,record.baseline.apple)&&eq(guard(n),record.baseline.guard)&&eq(slot(n),record.baseline.slot),'Pending link changed');await save(k,{...record,stage:'linked',etag:a.etag},entry.etag);
 }
 async function one(entry,check){const record=entry.data;need(record.calendar===env.APPLE_CALDAV_URL,'Collection changed');
  let n=await find(record.id);
  if(record.stage==='retired'){need(!n,'Retired appointment restored; explicit relink required');return 'retired'}
  if(!n){
   // A replanned package can remove a booked row entirely. Confirm absence on
   // separate runs before retiring ONLY its exact machine-owned Apple event.
   need(['prenotato','annullato'].includes(record.baseline.guard.status),'Missing completed appointment requires review');
   if(!record.sourceMissingSince){await save(key(record.id),{...record,sourceMissingSince:now()},entry.etag);return 'missing_source_pending'}
   if(now()-record.sourceMissingSince<60000)return 'missing_source_pending';
   let remote=await cal.read(record.href);
   if(remote){const ap=parse(remote.ics);need(ap.uid===record.uid&&ap.marker===record.marker,'Mapped UID/marker changed');need(eq(ap.slot,record.baseline.apple),'Deleted source has concurrent Apple edit');}
   check();need(!await find(record.id),'Appointment reappeared during retirement');
   if(remote){await cal.delete(record.href,remote.etag);need(!await cal.read(record.href),'Apple retirement persistence check failed');}
   await save(key(record.id),{...record,stage:'retired',retiredAt:new Date(now()).toISOString(),baseline:{...record.baseline,apple:null},etag:null,lastResult:'neacea_deleted_to_apple'},entry.etag);
   return 'neacea_deleted_to_apple';
  }
  if(record.stage==='pending'){await provision(record.id,check,record.origin==='bootstrap'?'bootstrap':record.origin==='manual'?true:'automatic');return 'linked'}
  let a=await cal.read(record.href);need(['prenotato','fatto','noshow','annullato'].includes(n.status),'Unknown NEACEA status');const old=record.baseline;
  const sameParticipants=(x,y)=>['client_ids','service_id'].every(k=>eq(x[k],y[k]));
  const corrected=!sameParticipants(guard(n),old.guard);
  if(corrected){
   // Only explicit, audited owner corrections may change a linked PT service or pair.
   const logs=await db('calendar_audit_log',{query:'?select=before_data,after_data&entity_type=eq.appointments&entity_id=eq.'+encodeURIComponent(n.id)+'&action=eq.pt_sessions_corrected&actor_role=eq.owner&source=eq.calendar&order=created_at.asc&limit=1000'});
   let approved=old.guard;
   for(const log of logs)if(log.before_data&&log.after_data&&sameParticipants(log.before_data,approved))approved=log.after_data;
   need(sameParticipants(approved,guard(n)),'Protected NEACEA fields changed');
  }
  const ap=a?parse(a.ics):null;need(!ap||(ap.uid===record.uid&&ap.marker===record.marker),'Mapped UID/marker changed');
  const ns=slot(n),aps=ap?.slot||null,ptChanged=!eq(n.operator_id,old.guard.operator_id),statusChanged=n.status!==old.guard.status,nc=!eq(ns,old.slot)||statusChanged||ptChanged||corrected,ac=!eq(aps,old.apple);need(!(nc&&ac)||((n.status==='annullato'&&!a)||(n.status!=='annullato'&&eq(ns,aps))),'Conflicting edits');let result='unchanged';
  if(nc&&(!ac||((ptChanged||statusChanged||corrected)&&n.status!=='annullato'&&eq(ns,aps)))){check();if(n.status==='annullato'){if(a)await cal.delete(record.href,a.etag);a=null}else{need(a||(old.guard.status==='annullato'&&old.apple===null),'Cannot recreate deleted event');const ics=ptChanged||statusChanged||corrected?await render(n,record):rewrite(a.ics,ns);check();await cal.put(record.href,ics,a?.etag);a=await cal.read(record.href);need(a&&eq(parse(a.ics).slot,ns)&&parse(a.ics).uid===record.uid&&parse(a.ics).marker===record.marker,'Apple persistence check failed')}result='neacea_to_apple'}
  else if(ac&&!nc){check();need(n.status==='prenotato','Apple cannot restore cancelled booking');n=await write(n,a?aps:{status:'annullato'});result='apple_to_neacea'}
  // Package/client changes affect sibling events even if their own slot, PT and
  // state are unchanged. Repair stale display content without any DB write.
  if(a&&n.status!=='annullato'){
   const expected=await render(n,record);
   if(display(a.ics)!==display(expected)){
    check();await cal.put(record.href,expected,a.etag);a=await cal.read(record.href);
    need(a&&eq(parse(a.ics).slot,slot(n))&&parse(a.ics).uid===record.uid&&parse(a.ics).marker===record.marker&&display(a.ics)===display(expected),'Apple display persistence check failed');
    if(result==='unchanged')result='neacea_display_to_apple';
   }
  }
  await save(key(record.id),{...record,sourceMissingSince:null,baseline:baseline(n,a),etag:a?.etag||null,lastResult:result},entry.etag);return result;
 }
 async function allAppointments(){let result=[];for(let offset=0;;){const rows=await db('appointments',{query:'?select=*&order=id.asc&limit=1000&offset='+offset});if(!rows.length)return result;result.push(...rows);offset+=rows.length}}
 async function run(){return locked(async check=>{
  const failures=[];const result={processed:0,errors:0,created:0,retired:0,missingSourcePending:0,newPending:0};const {blobs}=await store.list({prefix:'mapping/'});const control=await store.get('cursor',{type:'json'})||{index:0};const ordered=blobs.slice(control.index).concat(blobs.slice(0,control.index));let processed=0;
  const fail=(key,e)=>{result.errors++;failures.push({key,error:/^[A-Za-z0-9 /:;.,_()-]{1,160}$/.test(e.message)?e.message:'Sync operation failed',status:e.status||null})};
  // Reserve a bounded lane for new bookings BEFORE reading every linked event.
  // Compare against the complete key inventory in memory, not one remote lookup
  // per already-linked row. A rotating cursor prevents a bad new row starving others.
  const known=new Set(blobs.map(b=>b.key));
  const fresh=(await allAppointments()).filter(n=>Date.parse(n.created_at)>=Date.parse(env.APPLE_CALDAV_START_AT)&&n.date>=env.APPLE_CALDAV_START_AT.slice(0,10)&&futureEligible(n)&&!known.has(key(n.id))).sort((a,b)=>a.id.localeCompare(b.id));
  result.newPending=fresh.length;
  const creation=await store.get('creation-cursor',{type:'json'}),pivot=fresh.findIndex(n=>n.id>(creation?.after||''));
  const pending=pivot<0?fresh:fresh.slice(pivot).concat(fresh.slice(0,pivot));
  const batch=pending.slice(0,4);
  if(batch.length){check();await Promise.all(batch.map(async n=>{try{await provision(n.id,check,'automatic');result.created++;result.newPending--}catch(e){fail(key(n.id),e)}}));await store.setJSON('creation-cursor',{after:batch.at(-1).id});}
  for(let i=0;i<ordered.length;i+=4){try{check()}catch{break}await Promise.all(ordered.slice(i,i+4).map(async b=>{try{const entry=await store.getWithMetadata(b.key,{type:'json'});const outcome=await one(entry,check);result.processed++;if(outcome==='neacea_deleted_to_apple')result.retired++;if(outcome==='missing_source_pending')result.missingSourcePending++}catch(e){fail(b.key,e)}finally{processed++}}))}
  if(blobs.length)await store.setJSON('cursor',{index:(control.index+processed)%blobs.length});
  await store.setJSON('last-run',{...result,failures,at:new Date(now()).toISOString()});return result;
 })}
 async function bootstrapPreview(){config();await actor();const rows=(await allAppointments()).filter(futureEligible);let linked=0;for(const n of rows){const m=await store.get(key(n.id),{type:'json'});if(m?.stage==='linked'&&m.calendar===env.APPLE_CALDAV_URL)linked++}return {found:rows.length,linked,toCreate:rows.length-linked};}
 async function bootstrapStart(){return locked(async()=>{
  const previous=await store.get('bootstrap-v1',{type:'json'});if(previous)return previous;
  const rows=(await allAppointments()).filter(futureEligible),job={ids:rows.map(n=>n.id).sort(),index:0,created:0,skipped:0,errors:[],startedAt:new Date(now()).toISOString(),complete:false};
  await store.setJSON('bootstrap-v1',job,{onlyIfNew:true});return job;
 })}
 async function bootstrapRun(){return locked(async check=>{
  const job=await store.get('bootstrap-v1',{type:'json'});need(job,'Bootstrap not started');if(job.complete)return job;
  job.errors=[];
  // One persistent cursor; failed appointments are retried on the next explicit call.
  for(;job.index<job.ids.length;){try{check()}catch{break}const id=job.ids[job.index];
   try{const n=await read(id),m=await store.get(key(id),{type:'json'});
    if(!futureEligible(n)||m?.stage==='linked'){job.skipped++}else{await provision(id,check,'bootstrap');job.created++}
    job.index++;await store.setJSON('bootstrap-v1',job);
   }catch(e){job.errors=[{id,error:String(e.message).slice(0,160)}];break}
  }
  job.complete=job.index===job.ids.length;await store.setJSON('bootstrap-v1',job);return job;
 })}
 async function reconcile(){return locked(async check=>{
  const rows=(await allAppointments()).filter(futureEligible),report={found:rows.length,linked:0,verified:0,managedEvents:0,duplicates:0,missing:[],mismatch:[]},expected=new Map,seen=new Set,counts=new Map;
  for(const n of rows){const m=await store.get(key(n.id),{type:'json'});if(!m||m.stage!=='linked'){report.missing.push(n.id);continue}report.linked++;expected.set(n.id+'@calendar.neacea.it',{n,m});if(m.calendar!==env.APPLE_CALDAV_URL||seen.has(m.href))report.mismatch.push(n.id);seen.add(m.href)}
  const hrefs=await cal.inventory();
  for(let i=0;i<hrefs.length;i+=8){check();await Promise.all(hrefs.slice(i,i+8).map(async href=>{
   const a=await cal.read(href);if(!a)return;let ap;try{ap=parse(a.ics)}catch{return}const pair=expected.get(ap.uid);if(!pair)return;
   report.managedEvents++;counts.set(ap.uid,(counts.get(ap.uid)||0)+1);const {n,m}=pair;
   if(cal.url?cal.url(m.href)!==cal.url(href):m.href!==href)return;
   if(ap.marker!==m.marker||!eq(ap.slot,slot(n)))report.mismatch.push(n.id);else report.verified++;
  }))}
  report.duplicates=[...counts.values()].reduce((s,n)=>s+Math.max(0,n-1),0);for(const [uid,{n}] of expected)if(!counts.get(uid))report.missing.push(n.id);return report;
 })}
 return {run,bootstrapPreview,bootstrapStart,bootstrapRun,bootstrapStatus:async()=>{config();await actor();return store.get('bootstrap-v1',{type:'json'})},reconcile,linkStatus,link:id=>locked(async check=>{need(typeof id==='string'&&id.length>0&&id.length<=160,'Appointment ID required');need(manualEligible(await read(id)),'Only future PT appointments can be linked');await provision(id,check,true);return {linked:true,eligible:true}}),provision:id=>locked(check=>provision(id,check)),status:async()=>({enabled:env.APPLE_CALDAV_SYNC_ENABLED==='true',lastRun:await store.get('last-run',{type:'json'})}),removeMapping:id=>locked(async()=>{const e=await store.getWithMetadata(key(id),{type:'json'});need(id.startsWith('TEST_'),'Only controlled TEST mapping cleanup');if(e){need(!await cal.read(e.data.href),'Apple fixture still present');await store.delete(key(id))}})};
}
module.exports={NAME,HOST,parse,rewrite,instant,slot,CalDAV,service};
