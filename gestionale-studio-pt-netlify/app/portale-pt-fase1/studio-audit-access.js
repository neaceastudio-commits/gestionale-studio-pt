/* Shared source copied into each independently published Studio root. */
window.StudioAudit = (() => {
  const gateway='https://new-calendar-neacea.netlify.app/.netlify/functions/studio-calendar-activity';
  const access='https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email';
  const key='neacea-studio-audit-session';
  let token=new URLSearchParams(location.search).get('access') || sessionStorage.getItem(key) || '';
  let actor=null, ready;
  const message=text=>{const e=document.getElementById('studio-audit-status');if(e)e.textContent=text};
  async function request(operation,payload={}){
    const r=await fetch(gateway,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token,operation,payload})});
    const data=await r.json();if(!r.ok)throw Error(data.error||'Operazione rifiutata');return data;
  }
  async function verify(){
    actor=null;
    if(!token){message('Per salvare, accedi con il codice del Portale PT della Direzione.');return;}
    try{const r=await request('session');if(r.actor?.role!=='owner')throw Error('Accesso riservato alla Direzione');actor=r.actor;sessionStorage.setItem(key,token);message('Direzione verificata · salvataggi abilitati');}
    catch(e){token='';sessionStorage.removeItem(key);message(e.message);}
  }
  async function write(table,query,body,method='PATCH'){
    await ready;
    try{
      if(!actor||!token)throw Error('Accedi con una sessione Direzione verificata prima di salvare');
      if(table!=='clients'||method!=='PATCH')throw Error('Scrittura Studio non consentita');
      const id=new URLSearchParams(query).get('id')?.replace(/^eq\./,'');if(!id)throw Error('Cliente mancante');
      return await request('client',{method:'PATCH',rows:[{...body,id}]});
    }catch(e){message(e.message);throw e;}
  }
  function init(){
    const panel=document.createElement('section');panel.id='studio-audit-access';panel.className='panel';panel.style.padding='16px';
    panel.innerHTML='<form id="studio-audit-login"><label>Email Direzione <input name="email" type="email" autocomplete="username" required></label> <label>Codice Portale PT <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label> <button type="submit">Verifica accesso</button></form><p id="studio-audit-status" role="status"></p>';
    (document.querySelector('main')||document.body).prepend(panel);
    panel.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;actor=null;token='';sessionStorage.removeItem(key);message('Verifica in corso…');
      try{const r=await fetch(access,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',email:form.elements.email.value.trim(),code:form.elements.code.value.trim()})});const data=await r.json();if(!r.ok||!data.success||!data.token)throw Error(data.error||'Codice non valido');token=data.token;ready=verify();await ready;form.elements.code.value='';}catch(error){message(error.message);}
    };
    ready=verify();
  }
  document.addEventListener('DOMContentLoaded',init);
  return {write};
})();
