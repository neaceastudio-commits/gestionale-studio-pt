/* Explicit correction of existing sessions; package selection alone never rewrites history. */
(function (root) {
  const snapshot = a => ({id:a.id,service_id:a.serviceId,client_ids:a.clientIds,operator_id:a.operatorId,date:a.date,start_time:a.startTime,duration_min:a.durationMin,buffer_min:a.bufferMin || 0,status:a.status,notes:a.notes || ''});
  const sameSlot = (a,b) => a.date===b.date && String(a.startTime).slice(0,5)===String(b.startTime).slice(0,5) && Number(a.durationMin)===Number(b.durationMin) && a.operatorId===b.operatorId && a.status===b.status;
  function plan(appointments, {clientId,partnerId,serviceId,from,to}) {
    if (!['pt11','pt12'].includes(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from>to) throw Error('Controlla il periodo e il tipo PT.');
    if ([from,to].some(date=>{const parsed=new Date(date+'T12:00:00');return !Number.isFinite(parsed.getTime())||parsed.getFullYear()!==Number(date.slice(0,4))||parsed.getMonth()+1!==Number(date.slice(5,7))||parsed.getDate()!==Number(date.slice(8,10));})) throw Error('Controlla le date del periodo.');
    if (partnerId===clientId) throw Error('Scegli un secondo cliente diverso.');
    const eligible = a => ['pt11','pt12'].includes(a.serviceId) && ['prenotato','fatto','noshow'].includes(a.status) && a.operatorId;
    return appointments.filter(a=>eligible(a) && a.clientIds?.includes(clientId) && a.date>=from && a.date<=to).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime)).map(a=>{
      let partner, reason='';
      if (serviceId==='pt11' && a.clientIds.length!==1) reason='Seduta condivisa: non è possibile rimuovere un partecipante da qui.';
      else if (serviceId==='pt12' && a.clientIds.length===1) {
        if (!partnerId) reason='Scegli il secondo cliente.';
        else {
          const matches=appointments.filter(b=>b.id!==a.id && eligible(b) && b.clientIds?.length===1 && b.clientIds[0]===partnerId && sameSlot(a,b));
          if(matches.length!==1) reason=matches.length?'Più sedute del secondo cliente: verifica il calendario.':'Nessuna seduta corrispondente del secondo cliente (stesso PT, orario, durata e stato).';
          else partner=matches[0];
        }
      } else if(a.serviceId===serviceId) reason='Tipo già corretto.';
      if(a.clientIds.length>2) reason='Più di due partecipanti: verifica il calendario.';
      return {appointment:a,partner,reason,change:reason?null:{before:snapshot(a),...(partner?{partner:snapshot(partner)}:{}),serviceId}};
    });
  }
  let rows=[], busy=false;
  const esc = s => App._escapeHtml(String(s??''));
  function open(clientId) {
    if(busy || !App.guardStudioManagement()) return;
    const client=Services.getClient(clientId); if(!client)return;
    const today=App._dateStr(new Date());
    UI.openModal(`<div class="modal-header"><h3>Correggi sedute PT — ${esc(Services.clientFullName(clientId))}</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div>
      <div class="modal-body"><p>Correggi anche sedute passate scegliendo il periodo. Le sedute in coppia contano una sola volta nelle ore del trainer; ogni cliente conserva le proprie sessioni residue.</p>
      <div id="pt-correction-settings" data-client="${esc(clientId)}" class="form-row">
      <div class="form-group"><label>Dal<input class="form-input" type="date" id="pt-correction-from" value="${today}" onchange="PTSessionCorrection.invalidate()"></label></div>
      <div class="form-group"><label>Al<input class="form-input" type="date" id="pt-correction-to" value="${today.slice(0,7)}-${new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate()}" onchange="PTSessionCorrection.invalidate()"></label></div>
      <div class="form-group"><label>Tipo corretto<select class="form-input" id="pt-correction-service" onchange="PTSessionCorrection.invalidate()"><option value="pt12">PT 1:2</option><option value="pt11">PT 1:1</option></select></label></div></div>
      <div class="form-group"><label>Secondo cliente (per unire due sedute)<select class="form-input" id="pt-correction-partner" onchange="PTSessionCorrection.invalidate()"><option value="">Seleziona…</option>${State.getClients().filter(c=>c.id!==clientId).map(c=>`<option value="${esc(c.id)}">${esc(Services.clientFullName(c.id))}</option>`).join('')}</select></label></div>
      <p>Si uniscono solo sedute con stesso PT, data, orario, durata e stato. La seconda viene annullata e resta nel registro. Eventuali schede allenamento compilate sulla seconda seduta impediscono l’unione.</p>
      <button id="pt-correction-preview-button" class="btn-ghost" onclick="PTSessionCorrection.preview()">Mostra anteprima</button>
      <div id="pt-correction-preview"></div><p id="pt-correction-result" role="status" aria-live="polite"></p></div>
      <div class="modal-footer"><button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button><button id="pt-correction-save" class="btn-primary" disabled onclick="PTSessionCorrection.save()">Conferma correzione e aggiorna ore</button></div>`);
    rows=[];
  }
  function invalidate(){if(busy)return;rows=[];document.getElementById('pt-correction-save').disabled=true;document.getElementById('pt-correction-preview').innerHTML='';document.getElementById('pt-correction-result').textContent='Aggiorna l’anteprima dopo la modifica dei filtri.';}
  function preview(){
    if(busy)return;
    const result=document.getElementById('pt-correction-result');
    try{
      rows=plan(State.getAppointments(),{clientId:document.getElementById('pt-correction-settings').dataset.client,partnerId:document.getElementById('pt-correction-partner').value,serviceId:document.getElementById('pt-correction-service').value,from:document.getElementById('pt-correction-from').value,to:document.getElementById('pt-correction-to').value});
      document.getElementById('pt-correction-preview').innerHTML=rows.map((r,i)=>`<div class="form-group"><label><input type="checkbox" name="pt-correction-row" value="${i}" ${r.change?'checked':'disabled'} onchange="PTSessionCorrection.summarize()"> ${esc(r.appointment.date)} · ${esc(r.appointment.startTime)} · ${esc(Services.operatorFullName(r.appointment.operatorId))} · ${esc(r.appointment.status)}</label><div>${r.reason?esc(r.reason):`${r.partner?'2 appuntamenti → 1 seduta PT 1:2':esc(Services.getService(r.appointment.serviceId)?.label)+' → '+esc(Services.getService(r.change.serviceId)?.label)} · ${Number(r.appointment.durationMin)*(r.partner?2:1)} → ${Number(r.appointment.durationMin)} minuti`}</div></div>`).join('')||'<p>Nessuna seduta PT nel periodo.</p>';
      summarize();
    }catch(e){rows=[];result.textContent=e.message;document.getElementById('pt-correction-save').disabled=true;}
  }
  const selected=()=>[...document.querySelectorAll('input[name="pt-correction-row"]:checked')].map(el=>rows[Number(el.value)]).filter(r=>r?.change);
  function summarize(){
    const chosen=selected(), totals=new Map();
    for(const r of chosen){const id=r.appointment.operatorId,t=totals.get(id)||{before:0,after:0};t.before+=Number(r.appointment.durationMin)*(r.partner?2:1);t.after+=Number(r.appointment.durationMin);totals.set(id,t);}
    document.getElementById('pt-correction-result').textContent=`${chosen.length} ${chosen.length===1?'correzione selezionata':'correzioni selezionate'}. ${chosen.length>100?'Seleziona al massimo 100 sedute per volta. ':''}`+[...totals].map(([id,t])=>`${Services.operatorFullName(id)}: ${(t.before/60).toLocaleString('it-IT')} → ${(t.after/60).toLocaleString('it-IT')} ore sulle sedute selezionate.`).join(' ');
    document.getElementById('pt-correction-save').disabled=!chosen.length||chosen.length>100;
  }
  async function save(){
    if(busy||!App.guardStudioManagement())return;
    const chosen=selected();if(!chosen.length||chosen.length>100)return;
    busy=true;
    const result=document.getElementById('pt-correction-result'), previewElement=document.getElementById('pt-correction-preview'), saveButton=document.getElementById('pt-correction-save');
    const controls=[...document.querySelectorAll('#modal-overlay input, #modal-overlay select, #modal-overlay button')];controls.forEach(el=>el.disabled=true);
    result.textContent='Salvataggio delle correzioni…';
    try{
      const response=await SupabaseSync.correctPtSessions(chosen.map(r=>r.change));
      if(response?.error)throw Error(response.error);
      rows=[];previewElement.innerHTML='';
      result.textContent='Correzioni salvate. Riepilogo ore aggiornato; sessioni residue invariate.';
      Calendar.render();
    }catch(e){result.textContent='Correzione non confermata: '+e.message+' Ricarica i dati e verifica il calendario prima di riprovare.';rows=[];previewElement.innerHTML='';}
    finally{busy=false;controls.forEach(el=>el.disabled=false);saveButton.disabled=true;}
  }
  root.PTSessionCorrection={open,preview,invalidate,summarize,save,plan};
  if(typeof module!=='undefined')module.exports={plan};
})(typeof window!=='undefined'?window:globalThis);
