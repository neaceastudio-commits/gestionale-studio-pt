/* Indicative package timing. Gaps and appointment changes do not subtract points. */
(function(root){
 'use strict';
 const DAY=86400000;
 const valid=v=>{const s=String(v||'').slice(0,10),d=new Date(s+'T12:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(+d)&&d.toISOString().slice(0,10)===s?s:'';};
 const stamp=d=>Date.parse(d+'T12:00:00Z');
 const add=(d,n)=>new Date(stamp(d)+n*DAY).toISOString().slice(0,10);
 const days=(a,b)=>Math.max(0,Math.round((stamp(b)-stamp(a))/DAY));
 function documentation(notes){
  const pauses=[];
  for(const line of String(notes||'').split('\n')){
   const p=line.match(/^Pausa (concordata|Studio) \| (\d{4}-\d{2}-\d{2}) \| (\d{4}-\d{2}-\d{2}) \| (.+)$/i);
   if(p&&valid(p[2])&&valid(p[3])&&p[2]<=p[3]&&p[4].trim())pauses.push({from:p[2],to:add(p[3],1),reason:p[4].trim(),cause:p[1]});

  }
  return {pauses};
 }
 function excludedDays(from,to,pauses){
  const intervals=pauses.map(p=>[Math.max(stamp(from),stamp(p.from)),Math.min(stamp(to),stamp(p.to))]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let end=-Infinity,n=0;for(const [a,b] of intervals){n+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return n/DAY;
 }
 function frequency(c){
  const n=String(c.frequency||'').match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:x|volte|lezioni|sedute)?(?:\s|$)/i);
  if(n&&Number(n[1].replace(',','.'))>0)return Number(n[1].replace(',','.'));
  const raw=String(c.frequency||'').trim().toLowerCase();
  if(raw==='bisettimanale')return 0.5;
  if(raw==='mensile')return 0.25;
  if(raw)return null;
  const known=(c.days||[]).filter(d=>Number.isInteger(d)&&d>=0&&d<=6||/^(lun|mar|mer|gio|ven|sab|dom)/i.test(String(d)));
  return new Set(known).size||null;
 }
 function build(client,rows,ledger,session,today){
  const warnings=[],doc=documentation(client.notes);
  const recorded=(ledger.cycles||[]).filter(c=>c&&!c.voidedAt&&valid(c.startDate)&&c.startDate<=today).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  if(!recorded.length&&valid(client.packageCycleStart||client.packageStart))recorded.push({id:'',legacy:true,startDate:client.packageCycleStart||client.packageStart,sessionsTotal:client.sessionsTotal,frequency:client.packageFrequency,days:client.giorniSettimana});
  const inputs=[];if(!recorded.length)warnings.push('Nessun pacchetto con decorrenza registrata');
  for(let i=0;i<recorded.length;i++){
   const c=recorded[i],next=recorded[i+1],last=i===recorded.length-1;
   const sessions=Number(c.sessionsTotal),freq=frequency(c)|| (last&&!String(c.frequency||'').trim()?frequency({frequency:client.packageFrequency,days:client.giorniSettimana}):null);
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
   inputs.push({id:c.id,start:c.startDate,sessions,frequency:freq,durationDays,attendance,closedEnd:valid(c.closedAt),nextStart:next?.startDate||''});
  }
  if(ledger.parseError)warnings.push('Registro pacchetti illeggibile');
  return {inputs,doc,warnings};
 }
 function calculate(data,today){
  const {inputs,doc}=data, warnings=[...data.warnings],packages=[];
  for(const c of inputs){
   const consumed=c.attendance.filter(a=>a.date<=today&&(a.status==='fatto'||a.status==='noshow'&&(a.serviceId==='pt12'||String(a.notes||'').includes('[ASSENZA-SCALATA]')))).sort((a,b)=>a.date.localeCompare(b.date));
   const completed=consumed.length>=c.sessions;
   // A finished package stops ageing. An old cycle with no reliable end is skipped.
   const closedEnd=c.closedEnd&&c.closedEnd<=today?c.closedEnd:'';
   if(!completed&&!closedEnd&&c.nextStart){warnings.push('Fine del ciclo del '+c.start+' non disponibile');continue;}
   const actualEnd=completed?add(consumed[c.sessions-1].date,1):closedEnd||add(today,1);
   if(actualEnd<c.start){warnings.push('Date del ciclo incoerenti');continue;}
   const excluded=excludedDays(c.start,actualEnd,doc.pauses);
   const actualDays=Math.max(0,days(c.start,actualEnd)-excluded);
   const pace=100*Math.min(1,c.durationDays/Math.max(1,actualDays));
   packages.push({...c,actualEnd,actualDays,excludedDays:excluded,completed,closed:completed||!!closedEnd,pace,delayDays:Math.max(0,actualDays-c.durationDays)});
  }
  // A simple average: renewals do not add a separate bonus.
  const regularity=packages.length?packages.reduce((n,c)=>n+c.pace,0)/packages.length:null;
  return {packages,regularity,warnings:[...new Set(warnings)],doc};
 }
 const api={documentation,excludedDays,frequency,build,calculate};root.ClientJourneyScoring=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
