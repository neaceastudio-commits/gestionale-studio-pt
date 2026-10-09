/* Owner pair planning; presence belongs to each client, compensation to the session. */
(function(){
 'use strict';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const name=c=>[c.nome,c.cognome].filter(Boolean).join(' ');
 const value=id=>document.getElementById(id)?.value||'';
 const localDateStr=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const money=cents=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
 const weekdays=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
 let firstId='',plan=null,busy=false,renewFirst=true;
 const eligible=c=>c.active!==false&&!/ibern/i.test(c.statoAbbonamento||'')&&(c.packageTypes||[]).includes('PT 1:2');
 function panel(title,body,footer){UI.openModal(`<div class="modal-header"><h2>${title}</h2><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body pt-pair-panel">${body}</div><div class="modal-footer">${footer}</div>`);}
 function fields(c,index){const m=Services.getClientSessionMetrics(c);return `<fieldset><legend>${escape(name(c))}</legend><p>Residuo registrato: ${escape(c.sessionsRemaining)} · Presenze: ${m.completed} · Assenze scalate: ${m.chargedAbsences||0}</p><label><input type="checkbox" id="pair-renew-${index}" ${index===0&&renewFirst?'checked':''}> Rinnova il pacchetto di questa persona</label><p>Se non selezionato, usa il pacchetto corrente. Il residuo del vecchio ciclo resta nello storico e non si somma al nuovo.</p><label>Nuove sedute <input id="pair-count-${index}" type="number" min="1" max="100" value="${escape(c.sessionsTotal||8)}"></label><label>Importo pacchetto € <input id="pair-amount-${index}" type="number" min="0" step="0.01" value=""></label><label>Incasso ricevuto € <input id="pair-paid-${index}" type="number" min="0" step="0.01" value="0"></label><label>Data incasso <input id="pair-payment-${index}" type="date"></label></fieldset>`;}
 function open(id,renew=true){
  if(!App.guardStudioManagement())return;
  firstId=id;plan=null;renewFirst=renew;
  const client=Services.getClient(id);if(!client||!eligible(client))return UI.showToast('Serve un cliente attivo con pacchetto PT 1:2','error');
  panel('Calendario e rinnovo PT 1:2',`<p>Una seduta condivisa per due persone. Pacchetti, incassi e presenze restano separati.</p><label>Partner <select id="pair-partner"><option value="">Seleziona la seconda persona</option>${State.getClients().filter(c=>c.id!==id&&eligible(c)).sort((a,b)=>name(a).localeCompare(name(b),'it')).map(c=>`<option value="${escape(c.id)}">${escape(name(c))}</option>`).join('')}</select></label>`,`<button class="btn-primary" onclick="PTPairSessions.configure()">Continua</button>`);
 }
 function configure(){
  const pair=[Services.getClient(firstId),Services.getClient(value('pair-partner'))];
  if(pair.some(c=>!c)||pair[0].id===pair[1].id)return UI.showToast('Scegli due persone distinte','error');
  const operators=State.getOperators().filter(o=>o.active!==false&&(o.roles||[]).some(r=>/^(PT|personal_trainer|personal trainer)$/i.test(r)));
  panel('Programma le sedute della coppia',`<div id="pair-form" data-partner="${escape(pair[1].id)}">${pair.map(fields).join('')}<fieldset><legend>Calendario condiviso</legend><label>Prima data utile <input id="pair-start" type="date"></label><label>Orario <input id="pair-time" type="time" value="17:00"></label><label>Personal Trainer <select id="pair-operator"><option value="">Seleziona</option>${operators.map(o=>`<option value="${escape(o.id)}" ${o.id===pair[0].ptAssegnato?'selected':''}>${escape(name(o))}</option>`).join('')}</select></label><div>${weekdays.map((d,i)=>`<label><input class="pair-day" type="checkbox" value="${i}"> ${d}</label>`).join('')}</div><label>Sedute condivise da generare <input id="pair-sessions" type="number" min="1" max="100" value="${Math.min(...pair.map(c=>Number(c.sessionsTotal)||8))}"></label></fieldset><p>Chiudi prima le vecchie sedute ancora prenotate delle persone che rinnovi. Non verranno spostate nel nuovo pacchetto.</p><p>Un’assenza scala la seduta a entrambi. Il PT matura ${money(1500)} per un’ora condivisa, anche con uno o entrambi assenti.</p></div>`,`<button class="btn-primary" onclick="PTPairSessions.preview()">Verifica e mostra anteprima</button>`);
 }
 function buildPlan(input,clients,appointments){
  const {start,time,operatorId,days,count,renewals}=input;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(time)||!operatorId||!days.length||!Number.isInteger(count)||count<1||count>100)throw Error('Completa data, orario, PT, giorni e numero sedute');
  if(start<localDateStr(new Date()))throw Error('Il rinnovo deve partire da oggi o da una data futura');
  const changed=clients.map((c,i)=>{
   if(!eligible(c)||!c.serverUpdatedAt)throw Error('Ricarica il calendario per verificare i pacchetti');
   const pending=appointments.filter(a=>a.status==='prenotato'&&a.clientIds?.includes(c.id)&&Services.serviceUsesPackageSessions(a.serviceId));
   if(renewals[i]){
    if(pending.length)throw Error(`${name(c)} ha ${pending.length} sedute ancora prenotate: chiudile o annullale prima del rinnovo`);
    const r=PackageLedger.renew(c,{...Services.getClientSessionMetrics(c),remaining:Number(c.sessionsRemaining)},{...renewals[i],startDate:start,frequency:days.length+' volte a settimana',days:days.map(d=>weekdays[d]),time,operatorId});
    const updated={...r.client,sessionsTotal:r.cycle.sessionsTotal,sessionsRemaining:r.cycle.sessionsTotal,packageStart:start,packageCycleStart:start,packageFrequency:r.cycle.frequency,giorniSettimana:r.cycle.days,tipoServizio:'PT 1:2'};
    if(count>updated.sessionsRemaining)throw Error(`Le sedute richieste superano il nuovo pacchetto di ${name(c)}`);
    return {id:c.id,expectedUpdatedAt:c.serverUpdatedAt,renewal:SupabaseSync.pairRenewalPatch(updated)};
   }
   const booked=pending.filter(a=>Services.appointmentInCurrentPackageCycle(a,c)).length;
   if(count>Number(c.sessionsRemaining)-booked)throw Error(`Residuo disponibile insufficiente per ${name(c)}: seleziona il rinnovo oppure riduci le sedute`);
   return {id:c.id,expectedUpdatedAt:c.serverUpdatedAt,renewal:null};
  });
  const rows=[],date=new Date(start+'T12:00:00');
  for(let n=0;rows.length<count&&n<730;n++,date.setDate(date.getDate()+1)){
   if(!days.includes(date.getDay()))continue;
   const day=localDateStr(date),minute=Number(time.slice(0,2))*60+Number(time.slice(3));
   if(appointments.some(a=>a.status!=='annullato'&&a.date===day&&(a.operatorId===operatorId||a.clientIds?.some(id=>clients.some(c=>c.id===id)))&&Services.timeToMin(a.startTime)<minute+60&&Services.timeToMin(a.startTime)+Number(a.durationMin)>minute))throw Error(`Sovrapposizione il ${day} alle ${time}: cambia il piano prima di confermare`);
   rows.push({id:'pair_'+crypto.randomUUID(),service_id:'pt12',client_ids:clients.map(c=>c.id),operator_id:operatorId,date:day,start_time:time,duration_min:60,buffer_min:10,status:'prenotato',notes:'Seduta condivisa PT 1:2'});
  }
  if(rows.length!==count)throw Error('Piano troppo lungo');
  return {requestId:crypto.randomUUID(),clients:changed,appointments:rows};
 }
 function preview(){try{
  const clients=[Services.getClient(firstId),Services.getClient(document.getElementById('pair-form').dataset.partner)];
  const renewals=clients.map((_,i)=>document.getElementById('pair-renew-'+i).checked?{sessions:Number(value('pair-count-'+i)),amount:value('pair-amount-'+i),paidNow:value('pair-paid-'+i),paymentDate:value('pair-payment-'+i)}:null);
  if(renewals.some(r=>r&&r.amount===''))throw Error('Indica l’importo di ogni pacchetto da rinnovare (anche 0 se gratuito)');
  plan=buildPlan({start:value('pair-start'),time:value('pair-time'),operatorId:value('pair-operator'),days:[...document.querySelectorAll('.pair-day:checked')].map(e=>Number(e.value)),count:Number(value('pair-sessions')),renewals},clients,State.getAppointments());
  panel('Conferma calendario della coppia',`<p>${plan.appointments.length} appuntamenti condivisi · ${plan.appointments.length} ore PT prenotate. Il compenso matura alla chiusura della seduta.</p>${clients.map((c,i)=>`<p><strong>${escape(name(c))}</strong>: ${renewals[i]?`nuovo pacchetto di ${renewals[i].sessions} sedute; importo ${money(Number(renewals[i].amount)*100)}, incasso registrato ${money(Number(renewals[i].paidNow)*100)}. Vecchio residuo ${c.sessionsRemaining} conservato nello storico.`:'pacchetto corrente, nessun rinnovo e nessun nuovo incasso.'}</p>`).join('')}<ul>${plan.appointments.map(a=>`<li>${escape(a.date)} · ${escape(a.start_time)} · 60 minuti</li>`).join('')}</ul><p>Il salvataggio comprende entrambi i pacchetti selezionati e tutte le sedute. Le sedute già esistenti restano nel loro ciclo.</p>`,`<button class="btn" onclick="PTPairSessions.open('${escape(firstId)}')">Modifica piano</button><button id="pair-confirm" class="btn-primary" onclick="PTPairSessions.save()">Conferma e salva coppia</button>`);
 }catch(e){UI.showToast(e.message,'error');}}
 async function save(){if(busy||!plan||!App.guardStudioManagement())return;busy=true;const btn=document.getElementById('pair-confirm');if(btn)btn.disabled=true;try{await SupabaseSync.renewPtPair(plan);plan=null;UI.closeModal();Calendar.render();UI.showToast('Coppia salvata: una sola seduta per ogni ora PT','success');}catch(e){UI.showToast(e.message,'error');}finally{busy=false;if(btn)btn.disabled=false;}}
 function detail(a){if(a.serviceId!=='pt12'||!PTSessionModel.read(a))return '';return `<div class="detail-section">${a.clientIds.map(id=>`<p>${escape(name(Services.getClient(id)||{}))}: ${escape({fatto:'Presente',noshow:'Assente · seduta scalata',prenotato:'Prenotato',annullato:'Annullato'}[a.status==='annullato'?'annullato':PTSessionModel.status(a,id)])}</p>`).join('')}</div>`;}
 function attendance(a){try{
  if(a.clientIds?.length!==2)throw Error('Questa vecchia seduta contiene una sola persona: correggi prima la coppia dalla Direzione');
  if(!PTSessionModel.read(a)&&a.status!=='prenotato')throw Error('Questa seduta storica richiede una correzione della Direzione');
  panel('Presenze PT 1:2',`<p>La seduta scala a entrambi anche in caso di assenza. Compenso PT per 60 minuti: ${money(1500)}.</p>${a.clientIds.map((id,i)=>`<label>${escape(name(Services.getClient(id)||{}))}<select id="pair-attendance-${i}"><option value="fatto">Presente</option><option value="noshow" ${PTSessionModel.status(a,id)==='noshow'?'selected':''}>Assente · scala la seduta</option></select></label>`).join('')}`,`<button class="btn-primary" onclick="PTPairSessions.saveAttendance('${escape(a.id)}')">Salva entrambe le presenze</button>`);
 }catch(e){UI.showToast(e.message,'error');}}
 async function saveAttendance(id){if(busy)return;const a=State.getAppointments().find(a=>a.id===id);if(!a||!App.guardPortalEdit('appointment',a))return;busy=true;try{const prepared=PTSessionModel.prepare(a,State.getClients(),Services.getPackageCycleContext,a);const next=PTSessionModel.attendance(prepared,Object.fromEntries(a.clientIds.map((id,i)=>[id,value('pair-attendance-'+i)])));const saved=await SupabaseSync.saveAppointmentAtomic(next,a);if(saved?.error)throw Error(saved.error);UI.closeModal();Calendar.render();UI.showToast('Presenze salvate, una seduta scalata a ciascuno','success');}catch(e){UI.showToast(e.message,'error');}finally{busy=false;}}
 window.PTPairSessions={open,configure,preview,save,buildPlan,attendance,saveAttendance,detail,escape};
})();
