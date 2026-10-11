/* Read-only indicators from recorded attendance and package history. */
(function(root){
  'use strict';
  const DAY = 86400000;
  function date(value) {
    const raw = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
    const d = new Date(raw + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === raw ? raw : '';
  }
  const daysBetween = (a,b) => Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY);
  function monthsBetween(a,b) {
    if (!a) return 0;
    const x=a.split('-').map(Number), y=b.split('-').map(Number);
    return Math.max(0,(y[0]-x[0])*12+y[1]-x[1]-(y[2]<x[2]?1:0));
  }
  function summarize(client, appointments, options={}) {
    const today=date(options.today), pauseDays=Math.max(1,Number(options.pauseDays)||30);
    if (!today) throw Error('Data di riferimento non valida');
    const session=options.session || root.PTSessionModel;
    const ledger=options.ledger || {cycles:[],parseError:''};
    const cycles=ledger.cycles.filter(c=>!c.voidedAt);
    const issues=[];
    if(ledger.parseError) issues.push('Storico rinnovi non leggibile');
    const rows=[];
    for(const a of appointments) {
      if(!(a.clientIds||[]).includes(client.id) || (options.scope!=='all' && !['pt11','pt12'].includes(a.serviceId)) || a.serviceId==='blocco') continue;
      if(session?.provisional(a)) continue;
      const at=date(a.date);
      if(!at){issues.push('Appuntamento con data non valida');continue;}
      let status;
      try {status=session ? session.status(a,client.id) : a.status;}
      catch {issues.push('Presenza PT 1:2 da verificare');continue;}
      if(at>today && ['fatto','noshow'].includes(status)){issues.push('Presenza registrata nel futuro');continue;}
      rows.push({...a,date:at,status});
    }
    rows.sort((a,b)=>(a.date+' '+a.startTime).localeCompare(b.date+' '+b.startTime));
    const past=rows.filter(a=>a.date<=today), done=past.filter(a=>a.status==='fatto'), missed=past.filter(a=>a.status==='noshow');
    const attendance=done.length+missed.length ? done.length/(done.length+missed.length)*100 : null;
    const firstDone=done[0]?.date||'', lastDone=done.at(-1)?.date||'';
    const startCandidates=[date(client.acquisitionStart),date(client.packageStart),...cycles.map(c=>date(c.startDate)),firstDone].filter(d=>d&&d<=today).sort();
    const start=startCandidates[0]||'', months=monthsBetween(start,today);
    const recordedStart=[date(client.acquisitionStart),date(client.packageStart),...cycles.map(c=>date(c.startDate))].includes(start)&&!!start;
    const pauseList=[];
    const presenceDates=[...new Set(done.map(a=>a.date))];
    for(let i=1;i<presenceDates.length;i++) {
      const gap=daysBetween(presenceDates[i-1],presenceDates[i]);
      if(gap>=pauseDays) pauseList.push({from:presenceDates[i-1],to:presenceDates[i],days:gap,ongoing:false});
    }
    const sinceLast=lastDone?daysBetween(lastDone,today):null;
    const frozen=/ibern|sospes/i.test(client.statoAbbonamento||'');
    const ongoing=client.active!==false&&sinceLast!==null&&sinceLast>=pauseDays;
    if(ongoing) pauseList.push({from:lastDone,to:today,days:sinceLast,ongoing:true});
    const since90=new Date(today+'T12:00:00Z');since90.setUTCDate(since90.getUTCDate()-89);
    const start90=since90.toISOString().slice(0,10), done90=done.filter(a=>a.date>=start90);
    const exposure=firstDone?Math.min(90,daysBetween(firstDone,today)+1):0;
    const frequency=exposure?done90.length*7/exposure:0;
    const monthly=[];
    const ref=new Date(today.slice(0,7)+'-01T12:00:00Z');
    for(let i=11;i>=0;i--) {const d=new Date(ref);d.setUTCMonth(d.getUTCMonth()-i);const month=d.toISOString().slice(0,7);monthly.push({month,done:done.filter(a=>a.date.startsWith(month)).length});}
    const renewals=ledger.parseError?null:cycles.filter(c=>c.source==='renewal'&&date(c.startDate)&&date(c.startDate)<=today).length;
    const unresolved=past.filter(a=>a.status==='prenotato'&&a.date<today).length;
    if(unresolved) issues.push(`${unresolved} appuntamenti passati senza esito`);
    const scoring=options.scoring||root.ClientJourneyScoring;
    const timing=scoring?scoring.calculate(scoring.build(client,rows,ledger,session,today),today):null;
    const regularity=timing?.regularity??null;
    const top=regularity!==null&&months>=(options.minMonths??6)&&regularity>=(options.minRegularity??90)&&client.active!==false&&!frozen&&!!lastDone&&!issues.length&&done.length>=(options.minSessions??30)&&attendance!==null&&attendance>=(options.minAttendance??0);
    return {client,timing,regularity,start,recordedStart,months,firstDone,lastDone,sinceLast,done:done.length,missed:missed.length,cancelled:past.filter(a=>a.status==='annullato').length,attendance,frequency,done90:done90.length,renewals,pauseList,ongoing,frozen,top,monthly,activeMonths:monthly.filter(m=>m.done>0).length,next:rows.find(a=>a.date>=today&&a.status==='prenotato'&&!session?.renewal(a))||null,issues:[...new Set(issues)]};
  }
  const api={date,daysBetween,monthsBetween,summarize};
  root.ClientJourneyModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
