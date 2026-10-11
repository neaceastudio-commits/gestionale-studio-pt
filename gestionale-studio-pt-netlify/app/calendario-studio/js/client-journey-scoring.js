/* Transparent timing and continuity indicators. No inference of a pause's cause. */
(function(root){
 'use strict';
 const DAY=86400000;
 const valid=v=>{const s=String(v||'').slice(0,10),d=new Date(s+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?s:'';};
 const stamp=d=>Date.parse(d+'T12:00:00Z');
 const add=(d,n)=>new Date(stamp(d)+n*DAY).toISOString().slice(0,10);
 const days=(a,b)=>Math.max(0,Math.round((stamp(b)-stamp(a))/DAY));
 function documentation(notes){
  const pauses=[],moves=[];
  for(const line of String(notes||'').split('\n')){
   const p=line.match(/^Pausa (concordata|Studio) \| (\d{4}-\d{2}-\d{2}) \| (\d{4}-\d{2}-\d{2}) \| (.+)$/i);
   if(p&&valid(p[2])&&valid(p[3])&&p[2]<=p[3]&&p[4].trim())pauses.push({from:p[2],to:add(p[3],1),reason:p[4].trim(),cause:p[1]});
   const m=line.match(/^Spostamento (concordato|Studio) \| (\d+) \| (.+)$/i);
   if(m&&m[3].trim())moves.push({id:m[2],reason:m[3].trim(),cause:m[1]});
  }
  return {pauses,moves};
 }
 function excludedDays(from,to,pauses){
  const intervals=pauses.map(p=>[Math.max(stamp(from),stamp(p.from)),Math.min(stamp(to),stamp(p.to))]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let end=-Infinity,n=0;for(const [a,b] of intervals){n+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return n/DAY;
 }
 function frequency(c){
  const n=String(c.frequency||'').match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:x|volte|lezioni|sedute)?(?:\s|$)/i);
  if(n&&Number(n[1].replace(',','.'))>0)return Number(n[1].replace(',','.'));
  return Array.isArray(c.days)&&new Set(c.days).size?new Set(c.days).size:null;
 }
 function build(client,rows,ledger,session,today,audit){
  const warnings=[],doc=documentation(client.notes);
  const recorded=(ledger.cycles||[]).filter(c=>c&&!c.voidedAt&&valid(c.startDate)&&c.startDate<=today).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  if(!recorded.length&&valid(client.packageCycleStart||client.packageStart))recorded.push({id:'',legacy:true,startDate:client.packageCycleStart||client.packageStart,sessionsTotal:client.sessionsTotal,frequency:client.packageFrequency,days:client.giorniSettimana});
  const inputs=[];if(!recorded.length)warnings.push('Nessun pacchetto con decorrenza registrata');
  for(let i=0;i<recorded.length;i++){
   const c=recorded[i],next=recorded[i+1],last=i===recorded.length-1;
   const sessions=Number(c.sessionsTotal),freq=frequency(c)|| (last?frequency({frequency:client.packageFrequency,days:client.giorniSettimana}):null);
   const belongs=a=>{
    if(!['pt11','pt12'].includes(a.serviceId))return false;
    let p;try{p=session?.cycle(a,client.id);}catch{warnings.push('Collegamento al pacchetto da verificare');return false;}const id=p?.cycleId||String(a.notes||'').match(/\[CICLO-PACCHETTO-ID\s+([^\]]+)\]/)?.[1],start=p?.start||String(a.notes||'').match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/)?.[1];
    if(id)return id===c.id;
    if(start)return start===c.startDate;
    return c.legacy===true&&a.date>=c.startDate&&(!next||a.date<next.startDate);
   };
   const attendance=rows.filter(belongs);
   if(!Number.isInteger(sessions)||sessions<=0||!freq){warnings.push('Durata prevista mancante per il ciclo del '+c.startDate);continue;}
   if(!attendance.length&&c.closedAt){warnings.push('Presenze del ciclo del '+c.startDate+' non ricostruibili');continue;}
   const durationDays=Math.ceil(sessions/freq*7);
   if(durationDays<1){warnings.push('Frequenza non valida');continue;}
   const moves=[];const seen=new Set();
   if(Array.isArray(audit))for(const e of audit){
    if(e.action!=='appointment_moved'||!(e.client_ids||[]).includes(client.id)||e.metadata?.automatic||e.metadata?.test||e.metadata?.is_test)continue;
    const before=e.before_data||{},after=e.after_data||{},current=attendance.find(a=>a.id===e.entity_id);
    if(before.service_id==='blocco'||after.service_id==='blocco')continue;
    if(!current||e.created_at?.slice(0,10)>today||before.status!=='prenotato'||after.status==='annullato')continue;
    if(!valid(before.date)||!valid(after.date)|| (before.date===after.date&&String(before.start_time).slice(0,5)===String(after.start_time).slice(0,5)))continue;
    const key=e.request_id?e.entity_id+'|'+e.request_id:'audit|'+e.id;if(seen.has(key))continue;seen.add(key);
    const justification=doc.moves.find(m=>m.id===String(e.id));
    moves.push({id:String(e.id),from:before.date+' '+String(before.start_time||'').slice(0,5),to:after.date+' '+String(after.start_time||'').slice(0,5),excluded:!!justification,reason:justification?.reason||'Causa non documentata nel percorso'});
   }
   inputs.push({id:c.id,start:c.startDate,sessions,frequency:freq,durationDays,attendance,moves,closedEnd:valid(c.closedAt),nextStart:next?.startDate||''});
  }
  if(ledger.parseError)warnings.push('Registro pacchetti illeggibile');
  return {inputs,doc,warnings,auditAvailable:Array.isArray(audit)};
 }
 function calculate(data,today,active,options={}){
  const {inputs,doc,warnings,auditAvailable}=data;
  let elapsed=0,credit=0,gapDays=0,continuousStart='',previous=null,moveWeighted=0;
  const packages=[],gaps=[];
  const freeMoves=Math.max(0,Number(options.freeMoves??1)),points=Math.max(0,Number(options.movePoints??5));
  for(const c of inputs){
   const expectedEnd=add(c.start,c.durationDays);
   if(previous&&c.start<previous.actualEnd){warnings.push('Pacchetti sovrapposti: verifica lo storico');}
   const consumed=c.attendance.filter(a=>a.date<=today&&['fatto','noshow'].includes(a.status)).sort((a,b)=>a.date.localeCompare(b.date));
   const completed=consumed.length>=c.sessions;
   const actualEnd=completed?add(consumed[c.sessions-1].date,1):c.closedEnd&&c.closedEnd<=today?c.closedEnd:add(today,1);
   if(actualEnd<c.start){warnings.push('Date del ciclo incoerenti');continue;}
   const excluded=excludedDays(c.start,actualEnd,doc.pauses);
   const actualDays=Math.max(0,days(c.start,actualEnd)-excluded);
   const done=Math.min(c.sessions,consumed.filter(a=>a.status==='fatto').length);
   // No rate before the first agreed session could be due.
   const starting=!completed&&!c.closedEnd&&actualDays<7/c.frequency;
   if(previous){const raw=days(previous.coveredEnd,c.start),exc=excludedDays(previous.coveredEnd,c.start,doc.pauses),gap=Math.max(0,raw-exc);if(gap){gapDays+=gap;gaps.push({from:previous.coveredEnd,to:c.start,days:gap,excludedDays:exc});continuousStart=c.start;}}
   if(!continuousStart)continuousStart=c.start;
   const due=Math.floor(actualDays*c.frequency/7);
   const attendanceRate=consumed.length?done/Math.min(c.sessions,consumed.length):0;
   const rate=starting?null:completed||c.closedEnd?Math.min(1,c.durationDays/Math.max(1,actualDays))*done/c.sessions:Math.min(1,consumed.length/Math.max(1,due))*attendanceRate;
   const actualCredit=rate===null?0:rate*actualDays;
   const count=c.moves.filter(m=>!m.excluded).length,movePenalty=Math.min(100,Math.max(0,count-freeMoves)*points);
   const pace=actualDays&&!starting?100*actualCredit/actualDays:null;
   packages.push({...c,expectedEnd,actualEnd,actualDays,excludedDays:excluded,done,completed,starting,pace,delayDays:Math.max(0,actualDays-c.durationDays),movePenalty});
   if(!starting){elapsed+=actualDays;credit+=actualCredit;moveWeighted+=movePenalty*actualDays;}
   // Documented days extend the agreed end of the package.
   let coveredEnd=expectedEnd;for(let j=0;j<=doc.pauses.length;j++){const extra=excludedDays(c.start,coveredEnd,doc.pauses),updated=add(expectedEnd,extra);if(updated===coveredEnd)break;coveredEnd=updated;}
   previous={coveredEnd:actualEnd>coveredEnd?actualEnd:coveredEnd,actualEnd};
  }
  if(active&&previous&&previous.coveredEnd<today){const exc=excludedDays(previous.coveredEnd,today,doc.pauses),gap=Math.max(0,days(previous.coveredEnd,today)-exc);if(gap){gapDays+=gap;gaps.push({from:previous.coveredEnd,to:today,days:gap,excludedDays:exc,ongoing:true});continuousStart='';}}
  const pace=elapsed?100*credit/elapsed:null;
  const gapLoss=elapsed?pace-100*credit/(elapsed+gapDays):null;
  const moveLoss=elapsed&&auditAvailable?moveWeighted/elapsed:null;
  const regularity=pace!==null&&moveLoss!==null&&!warnings.length?Math.max(0,pace-gapLoss-moveLoss):null;
  return {packages,gaps,gapDays,continuousStart,pace,gapLoss,moveLoss,regularity,warnings:[...new Set(warnings)],auditAvailable,doc};
 }
 const api={documentation,excludedDays,frequency,build,calculate};root.ClientJourneyScoring=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
