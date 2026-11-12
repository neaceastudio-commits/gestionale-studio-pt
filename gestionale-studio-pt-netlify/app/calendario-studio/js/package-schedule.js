/* Weekly scheduling is separate from editing an individual appointment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PackageSchedule=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 'use strict';
 const days=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
 const marker=/\[NEACEA-SCHEDULE-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-SCHEDULE-V1\]/;
 const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 function patterns(client){const notes=String(client.notes||''),raw=notes.match(marker)?.[1];if(!raw)return [];try{
  const p=JSON.parse(raw),ledger=JSON.parse(notes.match(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/)?.[1]||'{"cycles":[]}');
  const cycle=[...(ledger.cycles||[])].reverse().find(c=>!c.closedAt)||ledger.cycles?.at(-1);
  const start=cycle?.startDate||notes.match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/)?.[1]||client.packageCycleStart||client.data_conferma||client.packageStart||client.package_start||'';
  if(p.cycle&&(p.cycle.cycleId!==(cycle?.id||'')||p.cycle.start!==start))return [];
  return p.version===1&&Array.isArray(p.patterns)?p.patterns:[];
 }catch{return [];}}
 function at(client,day){return patterns(client).filter(p=>p.from<=day).sort((a,b)=>b.from.localeCompare(a.from))[0]?.slots||null;}
 function strip(notes){return String(notes||'').replace(/\s*\[NEACEA-SCHEDULE-V1\][\s\S]*?\[\/NEACEA-SCHEDULE-V1\]/g,'').trim();}
 function preserve(notes,original){const stored=String(original||'').match(/\[NEACEA-SCHEDULE-V1\][\s\S]*?\[\/NEACEA-SCHEDULE-V1\]/)?.[0];return [strip(notes),stored].filter(Boolean).join('\n');}
 function validate(from,slots,today){
  if(!date(from)||from<today)throw Error('Scegli una data da oggi in poi.');
  if(!Array.isArray(slots)||slots.length<1||slots.length>7)throw Error('Scegli da uno a sette giorni.');
  if(new Set(slots.map(s=>s.day)).size!==slots.length)throw Error('Ogni giorno può comparire una sola volta.');
  if(slots.some(s=>!Number.isInteger(s.day)||s.day<0||s.day>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)))throw Error('Indica un giorno e un orario valido per ogni riga.');
 }
 function mount(clientId,host){
  if(!host)return;
  const client=Services.getClient(clientId);if(!client)return;
  if(App.isPortalPtMode()){host.innerHTML='<h4>Orari abituali</h4><p>Il cambio stabile di giorni e orari si gestisce dalla Direzione. Puoi modificare le singole sedute nell’elenco.</p>';return;}
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
  const esc=App._escapeHtml;
  let from=today(),slots=at(client,from),preview=null,busy=false,requestId=null;
  if(!slots){slots=(client.giorniSettimana||[]).map(d=>{const day=days.indexOf(d);const ref=App._packageAppointments(client,false).filter(a=>a.status!=='annullato'&&Services.appointmentInCurrentPackageCycle(a,client)&&App._weekdayName(a.date)===d).sort((a,b)=>b.date.localeCompare(a.date))[0];return {day,time:String(ref?.startTime||'').slice(0,5)};}).filter(s=>s.day>=0);}
  if(!slots.length)slots=[{day:1,time:''}];
  slots=slots.map(s=>({...s}));
  const currentSummary=slots.map(s=>days[s.day]+' '+(s.time||'orario da scegliere')).join(' · ');
  let expanded=false;
  function render(){
   host.innerHTML=`<div class="package-section-heading"><div><h4>Orari abituali</h4><p>${esc(currentSummary)}</p></div><button type="button" class="btn-primary" data-schedule="toggle" aria-expanded="${expanded}">${expanded?'Chiudi modifica':'Cambia giorni e orari'}</button></div>
   <div class="package-weekly-editor" ${expanded?'':'hidden'}><label>Applica alle lezioni dal<input class="form-input" type="date" data-schedule-from min="${today()}" value="${from}"></label><div class="package-weekly-slots">${slots.map((s,i)=>`<div class="package-weekly-slot"><label>Giorno<select class="form-input" data-schedule-day="${i}">${[1,2,3,4,5,6,0].map(d=>`<option value="${d}" ${s.day===d?'selected':''}>${days[d]}</option>`).join('')}</select></label><label>Orario<input class="form-input" type="time" data-schedule-time="${i}" value="${s.time}"></label><button type="button" class="btn" data-schedule-remove="${i}" aria-label="Rimuovi giorno ${i+1}">×</button></div>`).join('')}</div>
   <button type="button" class="btn-ghost" data-schedule="add" ${slots.length===7?'disabled':''}>+ Aggiungi un giorno</button>
   <p>Il nuovo piano sposta le lezioni prenotate del pacchetto corrente dalla data scelta. Ogni lezione conserva il suo PT. Lezioni svolte, importi e data d’inizio del pacchetto restano invariati.</p>
   <div class="package-reschedule-actions"><button type="button" class="btn-primary" data-schedule="preview">Mostra lezioni che cambiano</button><button type="button" class="btn" data-schedule="cancel">Annulla modifica</button></div>
   <p data-schedule-error role="alert" class="text-red"></p><div data-schedule-preview></div></div>`;
   host.querySelector('[data-schedule-from]').onchange=e=>{from=e.target.value;invalidate();};
   host.querySelectorAll('[data-schedule-day]').forEach(el=>el.onchange=()=>{slots[+el.dataset.scheduleDay].day=+el.value;invalidate();});
   host.querySelectorAll('[data-schedule-time]').forEach(el=>el.oninput=()=>{slots[+el.dataset.scheduleTime].time=el.value;invalidate();});
   host.querySelectorAll('[data-schedule-remove]').forEach(el=>el.onclick=()=>{slots.splice(+el.dataset.scheduleRemove,1);invalidate();render();});
   host.querySelectorAll('[data-schedule]').forEach(el=>el.onclick=()=>action(el.dataset.schedule));
  }
  function invalidate(){preview=null;requestId=null;host.querySelector('[data-schedule-preview]')?.replaceChildren();host.querySelector('[data-schedule-error]').textContent='';}
  function controls(disabled){host.querySelectorAll('button,input,select').forEach(el=>el.disabled=disabled);}
  function payload(){
   validate(from,slots,today());
   const sid=App._packageServiceId(client);
   const candidates=State.getAppointments().filter(a=>a.status==='prenotato'&&a.date>=from&&a.serviceId===sid&&a.clientIds?.includes(clientId)&&Services.appointmentInCurrentPackageCycle(a,client)&&!globalThis.PTSessionModel?.renewal(a));
   if(!candidates.length)throw Error('Non ci sono lezioni prenotate del pacchetto corrente dalla data scelta.');
   if(candidates.some(a=>a.clientIds.length>1&&sid!=='pt12'))throw Error('Le sedute di gruppo si spostano dal Calendario per verificare tutti i partecipanti.');
   const ids=[...new Set(candidates.flatMap(a=>a.clientIds))];
   const clients=ids.map(id=>Services.getClient(id));
   if(clients.some(c=>!c||c.active===false))throw Error('Verifica che tutti i partecipanti siano attivi.');
   if(sid==='pt12'&&(ids.length!==2||clients.some(c=>c.ptPartnerId!==ids.find(id=>id!==c.id))))throw Error('Verifica l’associazione della coppia prima di cambiare gli orari.');
   return {requestId:requestId||(requestId=crypto.randomUUID()),clientId,fromDate:from,slots:slots.map(s=>({...s})),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.serverUpdatedAt})),expectedAppointments:candidates};
  }
  async function action(name){
   if(busy)return;
   if(name==='toggle'){expanded=!expanded;render();return;}
   if(name==='cancel'){mount(clientId,host);return;}
   if(name==='add'){const day=[1,2,3,4,5,6,0].find(d=>!slots.some(s=>s.day===d));if(day!==undefined)slots.push({day,time:''});invalidate();render();return;}
   if(name!=='preview'&&name!=='save')return;
   busy=true;controls(true);
   const error=host.querySelector('[data-schedule-error]');error.textContent='';
   try{
    const plan=name==='save'?preview?.plan:payload();if(!plan)throw Error('Prepara prima l’anteprima.');
    const result=await SupabaseSync.savePackageSchedule(plan,name==='preview');
    if(result?.error)throw Error(result.error);
    if(name==='preview'){
     preview={plan,result};
     const before=new Map(plan.expectedAppointments.map(a=>[a.id,a]));
     const count=result.appointments.filter(a=>{const b=before.get(a.id);return b.date!==a.date||b.startTime!==a.startTime;}).length;
     const out=host.querySelector('[data-schedule-preview]');
     out.innerHTML=`<h4>Anteprima · ${count} lezioni da spostare</h4>${result.clients.length===2?'<p class="form-warning">PT 1:2: il cambio vale per entrambe le persone della coppia.</p>':''}<div class="package-weekly-preview-list">${result.appointments.map(a=>{const b=before.get(a.id);return `<div><span>${App._fmtLongDate(b.date)} · ${b.startTime}</span><span aria-hidden="true">→</span><strong>${result.warnings.some(w=>w.id===a.id)?'⚠ ':''}${App._fmtLongDate(a.date)} · ${a.startTime}</strong></div>`;}).join('')}</div>${result.warnings.length?'<p class="form-warning" role="alert">PT o cliente impegnato, oppure capacità sala superata: controlla le date contrassegnate prima di confermare. Gli avvisi non impediscono il salvataggio.</p>':''}<p>${result.appointments.length} lezioni nel piano · numero di lezioni residue e pagamenti invariati.</p><button type="button" class="btn-primary" data-schedule-save>Conferma gli spostamenti</button>`;
     out.querySelector('[data-schedule-save]').onclick=()=>action('save');
    }else{
     await SupabaseSync.pullAll();Calendar.render();App.openPackageOverview(clientId);
     UI.showToast('Giorni e orari salvati · '+result.appointments.length+' lezioni riprogrammate','success');
    }
   }catch(e){if(error.isConnected)error.textContent=e.message||'Salvataggio non confermato: riprova con la stessa anteprima.';}
   finally{busy=false;if(host.isConnected)controls(false);}
  }
  render();
 }
 return {at,patterns,validate,mount,days,strip,preserve};
});
