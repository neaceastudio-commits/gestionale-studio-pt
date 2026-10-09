/* Direction reviews planned renewals; confirmation never records a payment. */
(function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const days=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
 let proposals=[],busy=false,clientFilter=null;
 const api=async payload=>{const r=await CalendarAudit.call('expected_renewals',payload);if(r.error)throw Error(r.error);return r;};
 async function open(refresh=false,clientId=null){
  clientFilter=clientId;
  if(!App.guardStudioManagement())return;
  UI.openModal('<div class="modal-header"><h3>Rinnovi previsti</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body" id="expected-renewals-body">Caricamento…</div>');
  try{const r=await api({action:refresh?'refresh':'list'});proposals=r.proposals.filter(p=>!clientFilter||p.client_ids.includes(clientFilter));render();if(refresh){await SupabaseSync.pullAll();Calendar.render();}}
  catch(e){const b=document.getElementById('expected-renewals-body');if(b)b.textContent=e.message;}
 }
 function render(){
  const b=document.getElementById('expected-renewals-body');if(!b)return;
  b.innerHTML='<p>Le lezioni previste riservano il posto nel Calendario e in Apple. Confermare il rinnovo non registra un incasso. Il nuovo pacchetto diventa corrente dopo la chiusura delle lezioni precedenti.</p><button class="btn" id="expected-refresh">Aggiorna proposte</button>'+proposals.map(p=>`<section class="expected-card"><h4>${p.names.map(esc).join(' + ')} · ${p.plan.serviceId==='pt12'?'PT 1:2':'PT 1:1'}</h4><strong>${p.state==='confirmed'?'Confermato · attesa chiusura pacchetto precedente':'Rinnovo previsto — da confermare'}</strong><p>Decorrenza: ${esc(p.plan.startDate)} · ${p.booked} prenotate · ${p.performed} svolte/assenze registrate</p><p>${p.plan.slots.map(s=>`${days[s.day]||'Giorno da definire'} ${esc(s.time)} · ${esc(Services.operatorFullName(s.operatorId))}`).join('<br>')}</p>${p.plan.clients.map((c,i)=>`<p>${esc(p.names[i])}: ${c.sessions} lezioni · € ${Number(c.amount).toFixed(2)} · incasso da registrare separatamente</p>`).join('')}${p.plan.issue?`<p role="alert">${esc(p.plan.issue)}</p>`:''}${p.state==='pending'?`<div class="expected-actions"><button class="btn-primary" data-action="confirm" data-id="${p.id}" ${p.plan.issue?'disabled':''}>Conferma rinnovo</button><button class="btn" data-action="edit" data-id="${p.id}">Modifica proposta</button><button class="btn" data-action="decline" data-id="${p.id}">Non rinnova</button></div>`:''}</section>`).join('')+(proposals.length?'':'<p>Nessun rinnovo in attesa.</p>')+'<p id="expected-status" role="status"></p>';
  b.querySelector('#expected-refresh').onclick=()=>open(true,clientFilter);
  b.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>btn.dataset.action==='edit'?edit(btn.dataset.id):act(btn.dataset.action,btn.dataset.id));
 }
 async function act(action,id,extra={}){
  if(busy)return;const p=proposals.find(p=>p.id===id);if(!p)return;
  if(action==='decline'&&!confirm('Liberare le prenotazioni del rinnovo? Le lezioni già svolte e i compensi maturati vengono conservati.'))return;
  busy=true;const b=document.getElementById('expected-renewals-body');b.querySelectorAll('button').forEach(x=>x.disabled=true);
  try{const saved=await api({action,id,version:p.version,...extra});await SupabaseSync.pullAll();Calendar.render();if(typeof Clients!=='undefined')Clients.render();await open(false,clientFilter);UI.showToast(saved.activationError?'Rinnovo confermato, attivazione da verificare: '+saved.activationError:action==='confirm'?(saved.state==='activated'?'Nuovo pacchetto attivo; nessun incasso registrato':'Rinnovo confermato: attende la chiusura del pacchetto precedente'):action==='decline'?'Prenotazioni liberate':'Proposta aggiornata',saved.activationError?'error':'success');}
  catch(e){const status=document.getElementById('expected-status');if(status)status.textContent=e.message;b.querySelectorAll('button').forEach(x=>x.disabled=false);}
  finally{busy=false;}
 }
 function edit(id){
  const p=proposals.find(p=>p.id===id),b=document.getElementById('expected-renewals-body');
  b.innerHTML=`<h4>Modifica proposta · ${p.names.map(esc).join(' + ')}</h4><form id="expected-edit"><label>Decorrenza <input name="startDate" type="date" value="${p.plan.startDate}" required ${p.performed?'readonly':''}></label>${p.plan.clients.map((c,i)=>`<fieldset><legend>${esc(p.names[i])}</legend><label>Numero lezioni <input name="sessions${i}" type="number" min="${Math.max(1,p.performed)}" max="100" value="${c.sessions}" required></label><label>Importo pacchetto € <input name="amount${i}" type="number" min="0" step="0.01" value="${c.amount}" required></label></fieldset>`).join('')}<p>Seleziona i giorni abituali. Per passare da due a tre lezioni settimanali, aggiungi il terzo giorno.</p>${[1,2,3,4,5,6,0].map(d=>{const s=p.plan.slots.find(s=>s.day===d);return `<fieldset data-day="${d}"><label><input name="enabled" type="checkbox" ${s?'checked':''}> ${days[d]}</label><label>Ora <input name="time" type="time" value="${s?.time||'09:00'}"></label><label>PT <select name="operatorId">${State.getOperators().filter(o=>o.active!==false&&(o.roles||[]).some(r=>/^(pt|personal_trainer|personal trainer)$/i.test(r))).map(o=>`<option value="${esc(o.id)}" ${o.id===s?.operatorId?'selected':''}>${esc(Services.operatorFullName(o.id))}</option>`).join('')}</select></label><label>Minuti <input name="duration" type="number" min="15" max="240" step="15" value="${s?.duration||60}"></label></fieldset>`;}).join('')}<p>Le lezioni già svolte conservano data, PT e presenza. Gli appuntamenti futuri vengono aggiornati anche in Apple.</p><button class="btn-primary" type="submit">Salva proposta</button> <button class="btn" type="button" id="expected-back">Indietro</button><p id="expected-status" role="status"></p></form>`;
  b.querySelector('#expected-back').onclick=render;
  b.querySelector('form').onsubmit=e=>{e.preventDefault();const f=e.target;act('edit',id,{startDate:f.elements.startDate.value,clients:p.plan.clients.map((c,i)=>({id:c.id,sessions:Number(f.elements['sessions'+i].value),amount:Number(f.elements['amount'+i].value)})),slots:[...f.querySelectorAll('[data-day]')].filter(x=>x.querySelector('[name=enabled]').checked).map(x=>({day:Number(x.dataset.day),time:x.querySelector('[name=time]').value,operatorId:x.querySelector('[name=operatorId]').value,duration:Number(x.querySelector('[name=duration]').value)}))});};
 }
 async function forClient(id){try{const r=await api({action:'list'});if(r.proposals.some(p=>p.client_ids.includes(id))){await open(false,id);return true;}return false;}catch(e){UI.showToast('Rinnovo non avviato: '+e.message,'error');return true;}}
 window.ExpectedRenewals={open,forClient};
})();
