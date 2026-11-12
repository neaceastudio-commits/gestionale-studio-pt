/* Reactivation and conversion are one reviewed, atomic pair operation. */
(function(){
 'use strict';
 const name=c=>[c.nome,c.cognome].filter(Boolean).join(' ');
 const esc=v=>App._escapeHtml(String(v??''));
 let busy=false,plan=null;
 function candidates(client){return State.getClients().filter(c=>c.id!==client.id&&c.active!==false&&!/ibern/i.test(c.statoAbbonamento||'')&&c.ptAssegnato===client.ptAssegnato&&(!c.ptPartnerId||c.ptPartnerId===client.id)&&(c.packageTypes||[]).some(p=>p==='PT 1:1'||p==='PT 1:2')).sort((a,b)=>name(a).localeCompare(name(b),'it'));}
 function open(id){
  if(!App.guardStudioManagement())return;
  const client=Services.getClient(id);if(!client||client.active!==false)return;
  plan=null;busy=false;
  UI.openModal(`<div class="modal-header"><h3>Riattiva cliente in coppia</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body client-reactivation-body"><p><strong>${esc(name(client))}</strong> · PT 1:2 · ${Number(client.sessionsRemaining)} lezioni residue</p><label>Con chi vuoi riattivare il PT 1:2?<select id="reactivate-partner" class="form-input"><option value="">Scegli il secondo cliente</option>${candidates(client).map(c=>`<option value="${esc(c.id)}" ${c.id===client.ptPartnerId?'selected':''}>${esc(name(c))} · ${(c.packageTypes||[]).includes('PT 1:2')?'PT 1:2':'PT 1:1'} · ${Number(c.sessionsRemaining)} residue</option>`).join('')}</select></label><p>Puoi scegliere un cliente attivo dello stesso PT. Un pacchetto PT 1:1 viene convertito in PT 1:2 alla conferma.</p><p>Le lezioni residue e i pagamenti di ogni persona restano separati. Gli appuntamenti già registrati conservano servizio, data, ora e PT; le nuove sedute condivise si programmano dopo.</p><p id="reactivate-pair-error" role="alert" class="form-warning"></p><div id="reactivate-pair-preview"></div></div><div class="modal-footer"><button class="btn" onclick="UI.closeModal()">Annulla</button><button id="reactivate-pair-review" class="btn-primary">Mostra riepilogo</button></div>`);
  document.getElementById('reactivate-partner').onchange=()=>{plan=null;document.getElementById('reactivate-pair-preview').replaceChildren();};
  document.getElementById('reactivate-pair-review').onclick=()=>review(id);
 }
 function review(id){
  const client=Services.getClient(id),partner=Services.getClient(document.getElementById('reactivate-partner').value),error=document.getElementById('reactivate-pair-error');error.textContent='';
  if(!partner||!candidates(client).some(c=>c.id===partner.id)){error.textContent='Scegli un secondo cliente attivo dello stesso PT.';return;}
  plan={requestId:crypto.randomUUID(),clientId:id,partnerId:partner.id,expectedUpdatedAt:client.serverUpdatedAt,partnerExpectedUpdatedAt:partner.serverUpdatedAt};
  document.getElementById('reactivate-pair-preview').innerHTML=`<h4>Conferma la coppia</h4><p>${esc(name(client))}: Ibernato → Attivo · PT 1:2 · ${Number(client.sessionsRemaining)} lezioni residue.</p><p>${esc(name(partner))}: ${(partner.packageTypes||[]).includes('PT 1:2')?'PT 1:2 confermato':'PT 1:1 → PT 1:2'} · ${Number(partner.sessionsRemaining)} lezioni residue.</p><p>Importi, incassi, scadenza e data d’inizio dei due pacchetti restano invariati.</p><button id="reactivate-pair-confirm" class="btn-primary">Riattiva e conferma PT 1:2</button>`;
  document.getElementById('reactivate-pair-confirm').onclick=save;
 }
 async function save(){
  if(busy||!plan||!App.guardStudioManagement())return;busy=true;
  const button=document.getElementById('reactivate-pair-confirm'),error=document.getElementById('reactivate-pair-error');button.disabled=true;
  try{
   const result=await SupabaseSync.reactivatePair(plan);if(result?.error)throw Error(result.error);
   await SupabaseSync.pullAll();UI.closeModal();Clients.render();App.openPackageOverview(plan.clientId);UI.showToast('Cliente riattivato e coppia PT 1:2 confermata','success');
  }catch(e){error.textContent=e.message||'Riattivazione non confermata: riprova con la stessa coppia.';}
  finally{busy=false;if(button.isConnected)button.disabled=false;}
 }
 window.ClientReactivation={open,candidates};
})();
