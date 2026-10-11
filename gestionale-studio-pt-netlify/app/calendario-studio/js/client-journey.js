/* Client journey view: a separate complete snapshot, never a local fallback. */
const ClientJourney = (() => {
  'use strict';
  let snapshot=null, busy=false, error='', loadedAt=0;
  const settings={layout:'table',scope:'pt',status:'active',selection:'all',sort:'regularity',search:'',pauseDays:30,minMonths:6,minSessions:30,minAttendance:0,minRegularity:90};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const fmt=d=>d?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'—';
  const name=c=>[c.nome,c.cognome].filter(Boolean).join(' ')||'Cliente senza nome';
  const percent=r=>r.attendance===null?'—':r.attendance.toLocaleString('it-IT',{maximumFractionDigits:1})+'%';
  function rows(){
    if(!snapshot)return [];
    const allowed=App.visibleClients(snapshot.clients);
    return allowed.map(c=>ClientJourneyModel.summarize(c,snapshot.appointments,{...settings,today:today(),ledger:PackageLedger.parse(c),session:PTSessionModel}));
  }
  const pct=n=>n===null||n===undefined?'—':n.toLocaleString('it-IT',{maximumFractionDigits:0})+'%';
  const scoreNote=r=>r.regularity===null?'Tempi non disponibili':r.regularity>=99.5?'Nei tempi':'Pacchetti allungati';
  async function load(){
    if(busy)return;
    busy=true;error='';render();
    try {snapshot=await SupabaseSync.pullClientJourney();loadedAt=Date.now();}
    catch {error='Storico non aggiornato. Riprova: i conteggi parziali non vengono usati per selezionare i Top clients.';}
    finally {busy=false;render();}
  }
  function filtered(){
    return rows().filter(r=>(settings.status==='all'||(settings.status==='active'?r.client.active!==false:r.client.active===false))&&name(r.client).toLocaleLowerCase('it').includes(settings.search.toLocaleLowerCase('it'))&&(settings.selection==='all'||(settings.selection==='top'?r.top:settings.selection==='pause'?r.pauseList.length>0:!r.next&&r.client.active!==false)))
      .sort((a,b)=>(settings.sort==='regularity'?(b.regularity??-1)-(a.regularity??-1):settings.sort==='months'?b.months-a.months:settings.sort==='renewals'?(b.renewals??-1)-(a.renewals??-1):settings.sort==='attendance'?(b.attendance??-1)-(a.attendance??-1):b.done-a.done)||b.months-a.months||name(a.client).localeCompare(name(b.client),'it'));
  }
  function render(){
    const panel=document.getElementById('view-situation');if(!panel?.classList.contains('active'))return;
    if(!snapshot&&!busy&&!error){load();return;}
    // Auto-refresh of the calendar must not replace the focused filters.
    if(panel.querySelector('#journey-search')){drawResults();if(!busy&&!error&&Date.now()-loadedAt>=30000)load();return;}
    panel.innerHTML=`<div class="view-header"><div><div class="eyebrow">Neacea · Relazione con i clienti</div><h1 class="page-title">Situazione <em>clienti</em></h1><p class="page-sub">Inizio del percorso, presenze, rinnovi e tempi dei pacchetti per scegliere chi premiare.</p></div><button class="btn-primary" id="journey-refresh">Aggiorna storico</button></div>
      <div class="card journey-controls"><div class="journey-filters">
      <label>Cerca cliente<input class="form-input" id="journey-search" type="search" placeholder="Nome o cognome"></label>
      <label>Percorso<select class="form-input" data-setting="scope"><option value="pt">Sedute PT 1:1 e 1:2</option><option value="all">Tutti i servizi del Calendario</option></select></label>
      <label>Clienti<select class="form-input" data-setting="status"><option value="active">Attivi</option><option value="all">Attivi e archiviati</option><option value="archived">Archiviati</option></select></label>
      <label>Mostra<select class="form-input" data-setting="selection"><option value="all">Tutti</option><option value="top">Top clients</option><option value="pause">Con pause rilevate</option><option value="next">Senza prossima prenotazione</option></select></label>
      <label>Ordina per<select class="form-input" data-setting="sort"><option value="regularity">Tempi dei pacchetti</option><option value="months">Anzianità del percorso</option><option value="done">Sedute svolte</option><option value="renewals">Rinnovi registrati</option><option value="attendance">Percentuale presenze</option></select></label></div>
      <details><summary>Criteri Top clients</summary><p>Una selezione indicativa per anzianità, sedute svolte e rispetto dei tempi dei pacchetti.</p><div class="journey-filters">${[['minMonths','Mesi di percorso minimi',0,1200],['minSessions','Sedute svolte minime',1,10000],['minAttendance','Presenze minime %',0,100],['minRegularity','Tempi pacchetti minimi %',0,100]].map(([key,label,min,max])=>`<label>${label}<input class="form-input" data-setting="${key}" type="number" min="${min}" max="${max}" step="1" value="${settings[key]}"></label>`).join('')}</div><p>Le soglie valgono per questa consultazione; non assegnano premi automaticamente. Più rinnovi non danno punti aggiuntivi.</p></details></div>
      <div id="journey-status" role="status"></div><div id="journey-results"></div>
      <p class="journey-note">Tempi pacchetti: 100% se rispettano la durata prevista (lezioni ÷ frequenza settimanale); la percentuale scende se si allungano. È la media dei pacchetti PT valutabili. Stacchi e spostamenti non sottraggono punti; le pause concordate o dovute allo Studio già documentate sono escluse dalla durata. Presenze e rinnovi restano informazioni separate.</p>`;
    panel.querySelector('#journey-search').value=settings.search;
    panel.querySelector('#journey-search').oninput=e=>{settings.search=e.target.value;drawResults();};
    panel.querySelectorAll('[data-setting]').forEach(el=>{el.value=settings[el.dataset.setting];el.onchange=()=>{if(el.type==='number'&&!el.checkValidity())return;settings[el.dataset.setting]=el.type==='number'?Number(el.value):el.value;drawResults();};});
    panel.querySelector('#journey-refresh').onclick=load;drawResults();
  }
  function drawResults(){
    const panel=document.getElementById('view-situation'),target=panel?.querySelector('#journey-results');if(!target)return;
    panel.querySelector('#journey-refresh').disabled=busy;
    const status=panel.querySelector('#journey-status');status.textContent=busy?'Caricamento dello storico completo…':error||`Storico aggiornato alle ${new Date(loadedAt).toLocaleTimeString('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'})}.`;
    if(busy||error||!snapshot){target.replaceChildren();return;}
    const result=filtered();
    const table=()=>`<p class="journey-scroll-hint">Scorri la tabella verso destra per vedere tutte le statistiche.</p><div class="card journey-table-wrap" tabindex="0" role="region" aria-label="Statistiche clienti, tabella scorrevole"><table class="journey-table"><caption>Situazione clienti · ${settings.scope==='pt'?'Sedute PT 1:1 e 1:2':'Tutti i servizi del Calendario'}</caption><thead><tr><th scope="col">Cliente</th><th scope="col">Inizio percorso</th><th scope="col" class="journey-number">Sedute<br>svolte</th><th scope="col" class="journey-number">Tempi<br>pacchetti</th><th scope="col" class="journey-number">Presenze</th><th scope="col" class="journey-number">Rinnovi</th><th scope="col">Ultima presenza</th><th scope="col">Prossima<br>prenotazione</th><th scope="col">Percorso</th></tr></thead><tbody>${result.map(r=>`<tr class="journey-row ${r.top?'journey-top':''}"><th scope="row" class="journey-client"><strong>${esc(name(r.client))}</strong><span class="journey-badge">${r.top?'★ Top client':r.client.active===false?'Archiviato':r.frozen?'Percorso sospeso':'Attivo'}</span>${r.issues.length?`<span class="journey-alert" title="${esc(r.issues.join(' · '))}">Dati da verificare</span>`:''}</th><td class="journey-date">${fmt(r.start)}<small>${r.months} mesi · ${r.recordedStart?'inizio registrato':'prima presenza'}</small></td><td class="journey-number journey-value">${r.done}</td><td class="journey-number journey-value"><button class="journey-score" data-score-client="${esc(r.client.id)}" aria-label="Tempi pacchetti di ${esc(name(r.client))}">${pct(r.regularity)}</button><small>${scoreNote(r)}</small></td><td class="journey-number">${percent(r)}</td><td class="journey-number journey-value">${r.renewals??'Da verificare'}</td><td class="journey-date">${fmt(r.lastDone)}${r.sinceLast!==null?`<small>${r.sinceLast} giorni fa</small>`:''}</td><td class="journey-date">${fmt(r.next?.date)}${r.next?`<small>${esc(r.next.startTime||'')}</small>`:''}</td><td><button class="btn-ghost btn-sm" data-client="${esc(r.client.id)}" aria-label="Vedi percorso di ${esc(name(r.client))}">Vedi percorso</button></td></tr>`).join('')}</tbody></table></div>`;
    const cards=()=>`<div class="journey-grid">${result.map(r=>`<article class="card journey-card ${r.top?'journey-top':''}"><div class="journey-card-head"><h2>${esc(name(r.client))}</h2><span class="journey-badge">${r.top?'★ Top client':r.client.active===false?'Archiviato':r.frozen?'Percorso sospeso':'Attivo'}</span></div><p class="journey-start">${r.recordedStart?'Inizio registrato':'Prima presenza registrata'}: <strong>${fmt(r.start)}</strong> · ${r.months} mesi</p><dl class="journey-metrics"><div><dt>Sedute svolte</dt><dd>${r.done}</dd></div><div><dt>Tempi pacchetti</dt><dd><button class="journey-score" data-score-client="${esc(r.client.id)}" aria-label="Tempi pacchetti di ${esc(name(r.client))}">${pct(r.regularity)}</button></dd></div><div><dt>Rinnovi registrati</dt><dd>${r.renewals??'Da verificare'}</dd></div><div><dt>Mesi attivi / ultimi 12</dt><dd>${r.activeMonths}</dd></div></dl><p>${scoreNote(r)}</p><p>${r.done90} sedute negli ultimi 90 giorni · ${r.frequency.toLocaleString('it-IT',{maximumFractionDigits:1})}/settimana osservate</p><p>Ultima presenza: ${fmt(r.lastDone)}${r.sinceLast!==null?' · '+r.sinceLast+' giorni fa':''}</p><p>${r.pauseList.length} pause rilevate (≥ ${settings.pauseDays} giorni)</p><p>Prossima prenotazione: ${fmt(r.next?.date)} ${esc(r.next?.startTime||'')}</p>${r.issues.length?`<p class="journey-alert">${r.issues.map(esc).join(' · ')}</p>`:''}<button class="btn-ghost" data-client="${esc(r.client.id)}" aria-label="Vedi percorso di ${esc(name(r.client))}">Vedi percorso</button></article>`).join('')}</div>`;
    target.innerHTML=`<div class="journey-results-bar"><p class="journey-count">${result.length} clienti · ${result.filter(r=>r.top).length} Top clients nei risultati</p><div class="journey-layout" role="group" aria-label="Visualizzazione clienti"><button class="btn-ghost btn-sm" data-layout="table" aria-pressed="${settings.layout==='table'}">Tabella</button><button class="btn-ghost btn-sm" data-layout="cards" aria-pressed="${settings.layout==='cards'}">Schede</button></div></div>${result.length?(settings.layout==='table'?table():cards()):'<p class="empty-state">Nessun cliente corrisponde ai filtri e alle soglie selezionati.</p>'}`;
    target.querySelectorAll('[data-layout]').forEach(btn=>btn.onclick=()=>{settings.layout=btn.dataset.layout;drawResults();});
    target.querySelectorAll('[data-score-client]').forEach(btn=>btn.onclick=()=>detail(btn.dataset.scoreClient));
    target.querySelectorAll('[data-client]').forEach(btn=>btn.onclick=()=>detail(btn.dataset.client));
  }
  function detail(id){
    if(busy||error)return;
    const r=rows().find(r=>r.client.id===id);if(!r)return;
    UI.openModal(`<div class="modal-header"><h3>Percorso · ${esc(name(r.client))}</h3><button class="modal-close" aria-label="Chiudi" onclick="UI.closeModal()">×</button></div><div class="modal-body journey-detail"><p>${r.recordedStart?'Inizio registrato':'Prima presenza registrata'}: <strong>${fmt(r.start)}</strong> · ${r.months} mesi</p><p>${r.done} sedute svolte · ${percent(r)} presenze · ${r.renewals??'Da verificare'} rinnovi registrati</p>${timingDetail(r)}<p>Ultima presenza: ${fmt(r.lastDone)} · prossima prenotazione: ${fmt(r.next?.date)}</p><p>${r.pauseList.length} intervalli di almeno ${settings.pauseDays} giorni senza presenze registrate. È un’informazione indicativa e non incide sulla percentuale.</p>${r.issues.length?`<p class="journey-alert">${r.issues.map(esc).join(' · ')}</p>`:''}</div>`);
  }
  function timingDetail(r){
    const t=r.timing,c=t?.packages.at(-1);
    if(!c)return '<h4>Tempi pacchetti</h4><p>Durata prevista non disponibile. Per stimarla servono decorrenza, numero di lezioni e frequenza concordata.</p>';
    return `<h4>Tempi pacchetti · ${pct(r.regularity)}</h4><p>Media indicativa di ${t.packages.length} pacchetti valutabili: il valore scende soltanto quando la durata effettiva supera quella prevista.</p><p>Ultimo pacchetto valutabile, dal <strong>${fmt(c.start)}</strong>: ${c.sessions} lezioni a ${c.frequency} a settimana.<br>Previsti <strong>${c.durationDays} giorni</strong>; ${c.closed?'durata effettiva':'trascorsi finora'} <strong>${c.actualDays} giorni</strong>.<br>${c.delayDays?`Si è allungato di <strong>${c.delayDays} giorni</strong>: ${pct(c.pace)}.`:'Nei tempi: 100%.'}${c.excludedDays?` Esclusi ${c.excludedDays} giorni di pausa documentata.`:''}</p>${t.warnings.length?'<p>Alcuni pacchetti hanno dati incompleti e non entrano nella stima.</p>':''}`;
  }
  return {render,load};
})();
