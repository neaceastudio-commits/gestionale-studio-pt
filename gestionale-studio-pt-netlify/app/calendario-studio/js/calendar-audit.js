/* Verified server identity and read-only activity viewer. No free actor fields. */
window.CalendarAudit = (() => {
  const endpoint='/.netlify/functions/calendar-activity';
  const key='neacea-calendar-audit-session';let actor=null;
  const token=()=>new URLSearchParams(location.search).get('access') || sessionStorage.getItem(key) || '';
  async function call(operation,payload={},filters={}) {
    try { const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token(),operation,payload,filters})});const data=await r.json();return r.ok?data:{error:data.error||'Operazione rifiutata'}; } catch {return {error:'Connessione non disponibile: salvataggio non confermato'}}
  }
  async function dispatchWrite(table,{method,query,body}) {
    const id=new URLSearchParams(query).get('id')?.replace(/^eq\./,'');
    if(table==='rpc/calendar_save_appointment')return call('save',{appointment:body.p_appointment,expected:body.p_expected});
    if(table==='appointments') {
      if(method==='DELETE')return call('delete',{id});
      // Each existing caller sends a single appointment; never silently split a batch.
      if(Array.isArray(body))return {error:'Usa la pianificazione pacchetto per i salvataggi multipli'};
      return call('save',{appointment:body});
    }
    if(table==='operator_availability')return call('availability',{rows:body});
    if(['clients','operators'].includes(table))return call(table==='clients'?'client':'operator',{rows:(Array.isArray(body)?body:[body]).map(r=>({...r,id:r?.id||id})),method});
    return {error:'Scrittura non supportata dal registro'};
  }
  async function write(table,options) {
    const result=await dispatchWrite(table,options);
    if(result?.error){
      try { await SupabaseSync.pullAll(); Calendar.render(); } catch (_) { /* Never claim a failed write succeeded. */ }
      UI.showToast(result.error, 'error');
    }
    return result;
  }
  const labels={appointment_created:'Creata seduta',package_appointment_created:'Creata seduta da pacchetto',appointment_moved:'Spostata seduta',operator_changed:'Cambiato PT',service_changed:'Cambiato servizio',marked_done:'Segnata Fatto',done_reverted:'Ripristinata seduta Fatto',appointment_cancelled:'Annullata seduta',marked_noshow:'No-show',appointment_deleted:'Eliminata seduta',appointment_updated:'Aggiornata seduta',status_changed:'Cambiato stato',appointment_noop:'Nessuna modifica',availability_changed:'Disponibilità PT',availability_noop:'Disponibilità invariata',client_details_changed:'Aggiornati dati cliente',trainer_assignment_changed:'Assegnazione PT',client_package_changed:'Aggiornato pacchetto cliente',operator_profile_changed:'Aggiornato operatore'};
  function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
  function dateInput(value){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function open(){
    if(actor?.role!=='owner')return;
    UI.openModal('<div class="modal-header"><h3>Registro attività</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body" id="calendar-audit-view"></div>');
    const host=document.getElementById('calendar-audit-view'),form=element('form');host.append(form);
    const inputs={};
    for(const [name,label,type] of [['from','Dal','date'],['to','Al','date']]){const wrap=element('label',label+' '),input=element('input');input.type=type;wrap.append(input);form.append(wrap);inputs[name]=input}
    for(const [name,label,values] of [['actor','Utente',State.getOperators().map(o=>[o.id,`${o.nome} ${o.cognome}`])],['client','Cliente',State.getClients().map(c=>[c.id,`${c.nome} ${c.cognome}`])],['action','Azione',Object.entries(labels)],['source','Origine',['calendar','acquisition','system','apple'].map(s=>[s,s])]]){
      const wrap=element('label',label+' '),select=element('select');select.append(new Option('Tutti',''));for(const [v,t] of values)select.append(new Option(t,v));wrap.append(select);form.append(wrap);inputs[name]=select;
    }
    const output=element('div');const more=element('button','Carica altre');more.type='button';let cursor='';
    async function load(append=false){
      if(!append){cursor='';output.replaceChildren()}
      const filters=Object.fromEntries(Object.entries(inputs).map(([k,e])=>[k,e.value]));
      if(filters.from)filters.from=new Date(filters.from+'T00:00:00').toISOString();
      if(filters.to){const d=new Date(filters.to+'T00:00:00');d.setDate(d.getDate()+1);filters.to=d.toISOString()}
      filters.beforeId=cursor;const rows=await call('list',{},filters);
      if(rows.error){output.append(element('p',rows.error));return}
      if(!rows.length&&!append)output.append(element('p','Nessuna attività nel periodo.'));
      for(const row of rows){const names=(row.client_ids||[]).map(id=>{const c=State.getClients().find(c=>c.id===id);return c?`${c.nome} ${c.cognome}`:id}).join(', ');
        const b=row.before_data||{},a=row.after_data||{};const changes=Array.from(new Set([...Object.keys(b),...Object.keys(a)])).filter(k=>JSON.stringify(b[k])!==JSON.stringify(a[k])).map(k=>`${k}: ${JSON.stringify(b[k]??'—')} → ${JSON.stringify(a[k]??'—')}`).join(' · ');
        const item=element('p',`${new Date(row.created_at).toLocaleString('it-IT')} · ${row.actor_name} · ${labels[row.action]||row.action} · ${names} · ${changes||(row.action==='client_details_changed'?'Dettagli non riportati nel registro':'Nessuna variazione')} · ${row.source}`);output.append(item);cursor=String(row.id);
      }more.hidden=rows.length<100;
    }
    for(const [label,days] of [['Oggi',0],['Ultimi 7 giorni',6]]){const b=element('button',label);b.type='button';b.onclick=()=>{const now=new Date();inputs.to.value=dateInput(now);now.setDate(now.getDate()-days);inputs.from.value=dateInput(now);load()};form.append(b)}
    const submit=element('button','Filtra');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();load()};more.onclick=()=>load(true);host.append(output,more);inputs.from.value=inputs.to.value=dateInput(new Date());load();
  }
  async function init(){
    const result=await call('session');if(result.error){
      const link=element('a','Accedi dal Portale per modificare il Calendario');link.href='https://neacea-portale-personal-trainer.netlify.app/';(document.querySelector('.topbar-right')||document.body).append(link);return;
    }actor=result.actor;sessionStorage.setItem(key,token());
    if(actor.role==='owner'){const b=element('button','Registro attività');b.className='btn';b.id='calendar-audit-button';b.onclick=open;(document.querySelector('.topbar-right')||document.body).append(b)}
  }
  document.addEventListener('DOMContentLoaded',init);
  return {write,open,call};
})();
