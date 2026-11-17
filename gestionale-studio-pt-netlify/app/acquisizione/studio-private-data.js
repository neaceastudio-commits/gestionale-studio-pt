/* Explicit transport for the protected Studio table API. No public-key fallback. */
window.NeaceaPrivateData=(()=>{
 const tables=new Set(['clients','operators','appointments','acquisizioni','client_pt_alerts','trainer_client_assignments','operator_system_roles','operator_effective_roles','operator_availability','consensi_cliente']);
 const endpoint='https://new-calendar-neacea.netlify.app/.netlify/functions/calendar-private-data';
 function token(){const direct=new URLSearchParams(location.search).get('access');if(direct)return direct;for(const key of ['neacea-private-read-session','neacea-calendar-audit-session','neacea-studio-audit-session','neacea-acquisition-session-v1']){const v=sessionStorage.getItem(key);if(!v)continue;if(v.startsWith('{')){try{const x=JSON.parse(v);if(x.token)return x.token;}catch{}}else return v;}return '';}
 async function request(table,{method='GET',query='',body=null,headers={}}={}){
  const accessToken=token();if(!accessToken)throw Error('Accedi dal Portale PT per aprire i dati dello Studio.');
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken,table,method,query,body,prefer:new Headers(headers).get('Prefer')||''})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Accesso non disponibile. Rientra dal Portale PT.');return data;
 }
 async function requireLogin(){
  async function valid(){if(!token())return false;try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:token(),operation:'session'})});return r.ok;}catch{return false;}}
  if(await valid())return;
  const app=document.getElementById('app');
  const panel=document.createElement('section');panel.className='panel';
  panel.innerHTML='<h2>Accesso NEACEA</h2><p>Usa email e codice del Portale PT.</p><form><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Codice Portale PT <input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label><button type="submit">Accedi</button><p role="alert"></p></form>';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Accesso NEACEA');panel.style.cssText='position:fixed;inset:20% max(16px,calc((100vw - 480px)/2)) auto;z-index:20000;padding:24px;background:#fff;color:#182b40;box-shadow:0 0 0 100vmax #0008;border-radius:12px';
  document.body.append(panel);
  await new Promise(resolve=>{const form=panel.querySelector('form'),status=panel.querySelector('[role=alert]'),button=form.querySelector('button');form.onsubmit=async event=>{event.preventDefault();button.disabled=true;status.textContent='Verifica in corso…';try{const r=await fetch('https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',email:form.elements.email.value.trim(),code:form.elements.code.value.trim()})}),data=await r.json();if(!r.ok||!data.token)throw Error(data.error||'Codice non valido');sessionStorage.setItem('neacea-private-read-session',data.token);const url=new URL(location.href);url.searchParams.delete('access');history.replaceState(null,'',url);if(!await valid())throw Error('Accesso non autorizzato');form.elements.code.value='';panel.remove();resolve();}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};});
 }
 return {requireLogin,supports:t=>tables.has(t),read:(table,query='')=>request(table,{query}),request};
})();
