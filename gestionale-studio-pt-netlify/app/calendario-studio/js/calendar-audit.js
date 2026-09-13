/* Verified server identity and read-only activity viewer. No free actor fields. */
window.CalendarAudit = (() => {
  const endpoint='/.netlify/functions/calendar-activity';
  const key='neacea-calendar-audit-session';let actor=null;
  let accessToken=new URLSearchParams(location.search).get('access') || sessionStorage.getItem(key) || '';
  const token=()=>accessToken;
  async function call(operation,payload={},filters={}) {
    try { const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token(),operation,payload,filters})});const data=await r.json();return r.ok?data:{error:data.error||'Operazione rifiutata',status:r.status}; } catch {return {error:'Connessione non disponibile: salvataggio non confermato'}}
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
    if(!token()){login();return {error:'Accedi con il codice del Portale PT prima di salvare'};}
    const result=await dispatchWrite(table,options);
    if(result?.status===401){actor=null;accessToken='';sessionStorage.removeItem(key);login();}
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
    CalendarAuditView.open({call,labels,state:State,ui:UI});
  }
  function login(){
    UI.openModal('<div class="modal-header"><h3>Accedi al Calendario</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><form id="calendar-audit-login" class="modal-body"><p>Usa email e codice del Portale PT. La sessione viene verificata prima di abilitare i salvataggi.</p><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Codice Portale PT <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label><button type="submit" class="btn-primary">Accedi</button><p role="status" id="calendar-audit-login-status"></p></form>');
    const form=document.getElementById('calendar-audit-login');
    form.onsubmit=async e=>{
      e.preventDefault();const status=document.getElementById('calendar-audit-login-status'),button=form.querySelector('button[type="submit"]');button.disabled=true;status.textContent='Verifica in corso…';
      try{
        const r=await fetch('https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',email:form.elements.email.value.trim(),code:form.elements.code.value.trim()})});
        const data=await r.json();if(!r.ok||!data.success||!data.token)throw Error(data.error||'Codice non valido');
        accessToken=data.token;const verified=await call('session');if(verified.error)throw Error(verified.error);
        actor=verified.actor;sessionStorage.setItem(key,accessToken);
        const url=new URL(location.href);url.searchParams.set('access',accessToken);
        for(const name of ['pt','mode','op','operator','operator_id','email','ptEmail'])url.searchParams.delete(name);
        if(actor.role==='pt'){url.searchParams.set('pt','1');url.searchParams.set('mode','pt');url.searchParams.set('op',actor.id);}else url.searchParams.set('mode','admin');
        location.assign(url.toString());
      }catch(error){accessToken='';actor=null;sessionStorage.removeItem(key);status.textContent=error.message||'Accesso non disponibile';button.disabled=false;}
    };
  }
  async function init(){
    const result=await call('session');if(result.error){
      const button=element('button','Accedi al Calendario');button.className='topbar-btn';button.id='calendar-audit-login-button';button.onclick=login;(document.querySelector('.topbar-right')||document.body).append(button);return;
    }actor=result.actor;sessionStorage.setItem(key,token());
    if(actor.role==='owner'){const b=element('button','Registro attività');b.className='btn';b.id='calendar-audit-button';b.onclick=open;(document.querySelector('.topbar-right')||document.body).append(b)}
  }
  document.addEventListener('DOMContentLoaded',init);
  async function appleLink(operation,id){
    if(actor?.role!=='owner'||actor.id!=='staff_1')throw Error('Collegamento riservato alla Direzione');
    const r=await fetch('/.netlify/functions/apple-caldav-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token(),operation,id})});
    const data=await r.json();if(!r.ok)throw Error(data.error||'Collegamento non confermato');return data;
  }
  return {write,open,call,appleLink,canLinkApple:()=>actor?.role==='owner'&&actor.id==='staff_1'};
})();
