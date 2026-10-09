/* Owner ledger: records payments already made, with reversible audited voids. */
(function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const euro=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);
 let month='',payments=[],requestId='',busy=false;
 const today=()=>App._dateStr(new Date());
 async function open(value){
  if(!App.guardStudioManagement())return;
  month=value||today().slice(0,7);requestId=crypto.randomUUID();
  UI.openModal('<div class="modal-header"><h3>Pagamenti PT</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body" id="pt-payments-body">Caricamento…</div>');
  const r=await CalendarAudit.call('pt_payments',{action:'list',period:month+'-01'});
  const body=document.getElementById('pt-payments-body');if(!body)return;
  if(r.error){body.textContent=r.error;return;}payments=r.payments;render();
 }
 function render(){
  const body=document.getElementById('pt-payments-body');if(!body)return;
  const summary=PTSessionModel.summary(State.getAppointments(),month);
  const operators=State.getOperators().filter(o=>(o.roles||[]).some(r=>/^(pt|personal_trainer|personal trainer)$/i.test(r))||payments.some(p=>p.operator_id===o.id));
  const totals=operators.map(o=>{const earned=summary.totals.find(t=>t.operator===o.id)?.cents||0,paid=payments.filter(p=>p.operator_id===o.id&&!p.voided_at).reduce((a,p)=>a+p.amount_cents,0),issues=summary.issues.some(i=>i.appointments.some(a=>a.operatorId===o.id||!a.operatorId));return `<tr><td>${esc(Services.operatorFullName(o.id))}</td><td>${euro(earned)}${issues?' (parziale)':''}</td><td>${euro(paid)}</td><td>${euro(earned-paid)}${issues?' (da verificare)':''}</td></tr>`;}).join('');
  body.innerHTML=`<label>Mese di competenza <input type="month" value="${esc(month)}" onchange="PTTrainerPayments.open(this.value)"></label><p>Registra solo pagamenti già effettuati. Un residuo negativo indica un anticipo o un importo da verificare. Ogni PT 1:1 matura 10 €/h anche in contemporanea; PT 1:2 matura 15 €/h per coppia. Le sedute incomplete restano escluse dal maturato.</p><table><thead><tr><th>PT</th><th>Maturato</th><th>Pagato</th><th>Residuo</th></tr></thead><tbody>${totals}</tbody></table>
  ${summary.issues.length?`<p role="alert">${summary.issues.length} sedute da verificare: il maturato non è definitivo. Consulta il riepilogo ore per i dettagli.</p>`:''}
  <form id="pt-payment-form"><h4>Registra pagamento effettuato</h4><label>PT <select name="operator_id" required><option value="">Seleziona</option>${operators.map(o=>`<option value="${esc(o.id)}">${esc(Services.operatorFullName(o.id))}</option>`).join('')}</select></label><label>Importo € <input name="amount" type="number" min="0.01" step="0.01" required></label><label>Data pagamento <input name="paid_on" type="date" value="${today()}" max="${today()}" required></label><label>Metodo <select name="method"><option value="bonifico">Bonifico</option><option value="contanti">Contanti</option><option value="altro">Altro</option></select></label><label>Riferimento / note <input name="note" maxlength="1000"></label><button class="btn-primary" type="submit">Registra pagamento</button><p id="pt-payment-status" role="status"></p></form>
  <h4>Storico pagamenti del mese</h4>${payments.map(p=>`<div><strong>${esc(Services.operatorFullName(p.operator_id))} · ${euro(p.amount_cents)}</strong> · ${esc(p.paid_on)} · ${esc(p.method)}<p>${esc(p.note)}</p>${p.voided_at?`<p>Rettificato: ${esc(p.void_reason)}</p>`:`<button type="button" class="btn" data-void="${esc(p.id)}">Rettifica registrazione</button>`}</div>`).join('')||'<p>Nessun pagamento registrato.</p>'}`;
  body.querySelector('form').onsubmit=save;
  body.querySelectorAll('[data-void]').forEach(b=>b.onclick=()=>voidForm(b.dataset.void));
 }
 async function save(event){event.preventDefault();if(busy)return;const form=event.target;const value=Object.fromEntries(new FormData(form));const amount=Math.round(Number(value.amount)*100);if(!Number.isSafeInteger(amount)||amount<=0)return;busy=true;form.querySelector('button').disabled=true;
  try{const r=await CalendarAudit.call('pt_payments',{...value,amount_cents:amount,action:'register',id:requestId,period:month+'-01'});if(r.error)throw Error(r.error);payments=r.payments;requestId=crypto.randomUUID();render();}catch(e){document.getElementById('pt-payment-status').textContent=e.message;form.querySelector('button').disabled=false;}finally{busy=false;}
 }
 function voidForm(id){
  const body=document.getElementById('pt-payments-body');const box=document.createElement('form');box.innerHTML='<label>Motivo della rettifica <input name="reason" required maxlength="1000"></label><button type="submit">Conferma rettifica</button><p role="status"></p>';body.append(box);box.querySelector('input').focus();
  box.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;box.querySelector('button').disabled=true;try{const r=await CalendarAudit.call('pt_payments',{action:'void',period:month+'-01',id,reason:box.elements.reason.value});if(r.error)throw Error(r.error);payments=r.payments;render();}catch(e){box.querySelector('p').textContent=e.message;box.querySelector('button').disabled=false;}finally{busy=false;}};
 }
 window.PTTrainerPayments={open};
})();
