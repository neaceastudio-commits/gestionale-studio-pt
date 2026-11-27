window.PTMonitorView=(()=>{
  let report=null,generation=0,controller,loadedMode='',inFlight=false,lastReadAt=0,loadedPeriod='',snapshot='';
  const $=id=>document.getElementById(id),ctx=()=>window.PTSessionContext;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>{if(!value)return 'Non disponibile';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value.split('-').reverse().join('/');const d=new Date(value);return Number.isNaN(+d)?'Non disponibile':d.toLocaleString('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'});};
  const labels={saved:'Salvata',missing:'Da compilare',draft:'In compilazione',attendance:'Presenza da confermare',review:'Seduta da verificare',app_problem:'Salvataggio da verificare',pending:'In attesa',unconfirmed:'Conferma mancante',problem:'Salvataggio non riuscito',verified:'Risolto'};
  const errors={network:'Connessione interrotta',server:'Salvataggio non riuscito',conflict:'Modifiche da confrontare con il PT',validation:'Verificare dati o accesso',unconfirmed:'Conferma del salvataggio mancante',local_storage:'Bozza da verificare con il PT'};
  const badge=(state,label)=>`<span class="pt-monitor-badge ${esc(state)}">${esc(label||labels[state]||state)}</span>`;
  const client=row=>`<button class="pt-monitor-client" type="button" data-monitor-client="${esc(row.clientId||row.client_id)}">${esc(row.client)}</button>`;
  const calendarDay=value=>{
    if(!value||!Number.isFinite(Date.parse(value)))return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(value))return new Date(value).toISOString().slice(0,10)===value?value:'';
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  };
  function planUsage(p,today){
    const basis=p.assignmentRecorded?'assignment':'creation',from=calendarDay(basis==='assignment'?p.assignedAt:p.createdAt),to=calendarDay(today);
    const elapsed=from&&to?(Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000:null;
    const days=elapsed!==null&&elapsed>=0?Math.round(elapsed):null;
    return {basis,days,review:days!==null&&days>=28};
  }
  const planDate=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString('it-IT',{timeZone:'Europe/Rome',dateStyle:'short'}):'—';
  function sessionCard(s,withoutPlan){
    const author=s.savedById&&s.savedById!==s.operatorId?`<small class="pt-monitor-author">Compilata da ${esc(s.savedBy)}</small>`:'';
    const note=s.state==='review'?'Risultati presenti: verificare a quale seduta si riferiscono.':s.state==='missing'&&withoutPlan?'Piano da assegnare.':s.state==='app_problem'&&s.previousSaved?'Esiste un salvataggio precedente. Verificare l’ultima modifica.':'';
    return `<article class="pt-monitor-session ${esc(s.state)}" data-monitor-session="${esc(s.appointmentId)}">
      <div class="pt-monitor-session-time"><strong>${esc(String(s.time||'').slice(0,5))}</strong><small>${esc(date(s.date))}</small></div>
      <div class="pt-monitor-session-person">${client(s)}<small>PT: ${esc(s.operator)}</small>${author}</div>
      <div class="pt-monitor-session-result">${badge(s.state)}${note?`<small>${esc(note)}</small>`:''}${s.attendancePending&&s.state!=='attendance'?'<small>Presenza da confermare</small>':''}</div>
      <div class="pt-monitor-session-save"><small>Ultimo salvataggio</small><strong>${s.savedAt?esc(date(s.savedAt)):'—'}</strong></div></article>`;
  }
  const views={saved:'Sedute salvate',attention:'Sedute da controllare',sessions:'Tutte le sedute',issues:'Problemi di salvataggio',oldest:'Piani più vecchi',without:'Clienti senza piano','program-saves':'Ultimi salvataggi dei piani',recovered:'Problemi risolti'};
  const needsPeriod=mode=>['saved','attention','sessions','recovered'].includes(mode);
  const selection=()=>{const mode=$('monitorMode').value;return {mode,period:needsPeriod(mode)?$('monitorPeriod').value:'today'};};
  function clearReport(){
    generation++;controller?.abort();report=null;inFlight=false;lastReadAt=0;loadedMode='';loadedPeriod='';snapshot='';
    $('monitorResults').replaceChildren();$('monitorResults').hidden=true;$('monitorRefresh').disabled=false;
    $('monitorStatus').dataset.error='false';
  }
  function controls(){
    const {mode,period}=selection(),chosen=!!views[mode];
    $('monitorPeriodField').hidden=!chosen||!needsPeriod(mode);
    $('monitorPeriodLabel').textContent=mode==='recovered'?'Periodo':'Periodo delle sedute';
    $('monitorTrainerField').hidden=$('monitorSearchField').hidden=!chosen;
    $('monitorRefresh').hidden=!chosen||!period;
    $('monitorStatus').textContent=!chosen?'':!period?'Seleziona il periodo.':'';
  }
  function enter(){
    clearReport();$('monitorMode').value='';$('monitorPeriod').value='';$('monitorSearch').value='';
    $('monitorTrainer').innerHTML='<option value="">Tutti i PT</option>';controls();
  }
  function programCard(p,mode){
    const age=p.usage,oldest=mode==='oldest',usage=age.days===null?'Data da verificare':age.basis==='assignment'?`In uso da ${age.days} giorni`:`Creato da ${age.days} giorni`;
    const differentAssignment=p.assignmentRecorded&&calendarDay(p.assignedAt)!==calendarDay(p.createdAt);
    return `<article class="pt-monitor-program ${oldest&&age.review?'aged':''}">
      <div>${client(p)}<small>PT: ${esc(p.operator)}</small></div>
      <div>${p.programId?`<strong>${esc(p.name||'Piano di allenamento')}</strong>${oldest&&age.review?badge('review',age.basis==='assignment'?'Da rivedere':'Verificare utilizzo'):''}`:badge('missing','Piano mancante')}</div>
      ${p.programId?(oldest?`<div><strong class="pt-monitor-usage">${esc(usage)}</strong><small>Creato il ${esc(planDate(p.createdAt))}</small>${differentAssignment?`<small>Assegnato il ${esc(planDate(p.assignedAt))}</small>`:''}</div>`:
      `<div><small>Ultimo salvataggio</small><strong>${p.updatedAt?esc(date(p.updatedAt)):'—'}</strong><small>Creato il ${esc(planDate(p.createdAt))}</small></div>`):'<p class="pt-monitor-help">Da creare o assegnare</p>'}</article>`;
  }
  function issueCard(i,resolved=false){
    return `<article class="pt-monitor-issue"><div>${client(i)}<small>PT: ${esc(i.operator)}</small><small>${i.kind==='program'?'Piano':'Seduta'}</small></div><div>${badge(resolved?'verified':i.state)}${!resolved&&i.error_code&&errors[i.error_code]!==labels[i.state]?`<small>${esc(errors[i.error_code]||'Da verificare')}</small>`:''}</div><div><small>${resolved?'Risolto il':'Ultimo tentativo'}</small><strong>${esc(date(resolved?i.verified_at:i.updated_at))}</strong></div></article>`;
  }
  function render(){
    const {mode,period:selectedPeriod}=selection();
    if(!report||!ctx()?.canMonitorActivity()||mode!==loadedMode||selectedPeriod!==loadedPeriod){$('monitorResults').hidden=true;return;}
    const trainer=$('monitorTrainer').value,term=$('monitorSearch').value.trim().toLocaleLowerCase('it');
    const match=row=>(!trainer||(row.operatorId||row.actor_id)===trainer||row.savedById===trainer)&&(!term||String(row.client||'').toLocaleLowerCase('it').includes(term));
    let rows,content,help='';
    if(['saved','attention','sessions'].includes(mode)){
      rows=report.sessions.filter(match).filter(s=>mode==='saved'?s.state==='saved':mode==='attention'?s.state!=='saved':true);
      if(mode==='saved')rows.sort((a,b)=>(Date.parse(b.savedAt)||0)-(Date.parse(a.savedAt)||0)||a.client.localeCompare(b.client,'it'));
      const missingPrograms=new Set(report.programs.filter(p=>!p.programId).map(p=>p.clientId));
      content=rows.map(s=>sessionCard(s,missingPrograms.has(s.clientId))).join('');
      help=mode==='saved'?'Sedute del periodo selezionato, dal salvataggio più recente.':'';
    }else if(['issues','recovered'].includes(mode)){
      rows=(mode==='issues'?report.incidents:report.recovered||[]).filter(match).sort((a,b)=>(Date.parse(b.verified_at||b.updated_at)||0)-(Date.parse(a.verified_at||a.updated_at)||0));
      content=rows.map(i=>issueCard(i,mode==='recovered')).join('');
      help=mode==='issues'?'Segnalazioni ancora aperte.':'';
    }else{
      rows=report.programs.filter(match).filter(p=>mode==='without'?!p.programId:!!p.programId).map(p=>({...p,usage:planUsage(p,report.range.today)}));
      rows.sort(mode==='oldest'?(a,b)=>(b.usage.days??-1)-(a.usage.days??-1)||a.client.localeCompare(b.client,'it'):mode==='program-saves'?(a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||a.client.localeCompare(b.client,'it'):(a,b)=>a.client.localeCompare(b.client,'it'));
      content=rows.map(p=>programCard(p,mode)).join('');
      help=mode==='oldest'?'Dal più vecchio · evidenziati da 4 settimane':mode==='program-saves'?'Piani attuali, dal salvataggio più recente.':'';
    }
    const period=report.range.from===report.range.to?date(report.range.from):date(report.range.from)+' – '+date(report.range.to);
    $('monitorResults').innerHTML=`<section class="panel" data-monitor-view="${esc(mode)}"><div class="pt-monitor-section-head"><div>${needsPeriod(mode)?`<p class="pt-monitor-eyebrow">${esc(period)}</p>`:''}<h2>${esc(views[mode])} <span class="pt-monitor-count">${rows.length}</span></h2>${help?`<p class="pt-monitor-help">${esc(help)}</p>`:''}</div></div><div class="pt-monitor-session-list">${content||'<p class="pt-monitor-empty">Nessun risultato per i filtri selezionati.</p>'}</div></section>`;
    $('monitorResults').hidden=false;
    $('monitorResults').querySelectorAll('[data-monitor-client]').forEach(button=>button.onclick=()=>ctx().openClient(button.dataset.monitorClient));
  }
  async function show({background=false}={}){
    if(!ctx()?.canMonitorActivity()){$('monitorResults').hidden=true;report=null;return;}
    const {mode,period}=selection();if(!views[mode]||!period)return;
    if(background&&(inFlight||Date.now()-lastReadAt<60000))return;
    const keepVisible=!!report&&loadedPeriod===period&&loadedMode===mode;
    controller?.abort();controller=new AbortController();const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(30000)]);
    const actor=ctx().getApp().currentPt.id,token=ctx().getApp().accessToken,version=++generation;
    inFlight=true;$('monitorRefresh').disabled=true;
    if(!keepVisible)$('monitorResults').hidden=true;
    $('monitorStatus').textContent=keepVisible?'Aggiornamento in corso · ultimo controllo '+date(report.checkedAt):'Aggiornamento in corso…';$('monitorStatus').dataset.error='false';
    try {
      const r=await fetch('/.netlify/functions/pt-monitor',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'overview',period}),signal});
      const result=await r.json();if(!r.ok)throw Error(result.error||'Lettura non disponibile');
      if(version!==generation || ctx().getApp().currentPt?.id!==actor || ctx().getApp().accessToken!==token || !ctx().canMonitorActivity())return;
      const nextSnapshot=JSON.stringify({...result,checkedAt:''}),unchanged=keepVisible&&nextSnapshot===snapshot;
      report=result;loadedMode=mode;loadedPeriod=period;snapshot=nextSnapshot;lastReadAt=Date.now();
      $('monitorStatus').textContent='Ultimo controllo: '+date(result.checkedAt);
      if(unchanged)return;
      const selected=$('monitorTrainer').value,trainers=new Map([...result.programs.map(p=>[p.operatorId,p.operator]),...result.sessions.map(s=>[s.operatorId,s.operator]),...result.sessions.filter(s=>s.savedById).map(s=>[s.savedById,s.savedBy]),...result.incidents.map(i=>[i.actor_id,i.operator]),...(result.recovered||[]).map(i=>[i.actor_id,i.operator])]);
      $('monitorTrainer').innerHTML='<option value="">Tutti i PT</option>'+[...trainers].filter(([id])=>id).sort((a,b)=>a[1].localeCompare(b[1],'it')).map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
      $('monitorTrainer').value=trainers.has(selected)?selected:'';
      $('monitorStatus').textContent='Ultimo controllo: '+date(result.checkedAt);render();
    }catch(error){if(version!==generation)return;report=null;$('monitorResults').hidden=true;$('monitorStatus').dataset.error='true';$('monitorStatus').textContent=error.message+' Premi “Aggiorna” per riprovare.';}
    finally{if(version===generation){inFlight=false;$('monitorRefresh').disabled=false;}}
  }
  $('monitorMode').onchange=()=>{clearReport();$('monitorSearch').value='';$('monitorTrainer').value='';controls();show();};
  $('monitorRefresh').onclick=()=>show();$('monitorPeriod').onchange=()=>{clearReport();controls();show();};$('monitorTrainer').onchange=render;$('monitorSearch').oninput=render;
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&ctx()?.getApp().activeView==='monitorView')show({background:true});});
  setInterval(()=>{if(document.visibilityState==='visible'&&ctx()?.getApp().activeView==='monitorView')show({background:true});},60000);
  return {show,enter,reset:enter};
})();
