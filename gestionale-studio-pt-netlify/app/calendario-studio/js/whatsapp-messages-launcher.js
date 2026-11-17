/* Uses the existing Direction session. No login secret is copied into iframe URLs. */
(()=>{
 let owner=false,frame;
 const token=()=>new URLSearchParams(location.search).get('access')||sessionStorage.getItem('neacea-calendar-audit-session')||'';
 function open(){
  if(!owner)return;
  if(!frame){
   frame=document.createElement('iframe');frame.title='Messaggi WhatsApp NEACEA';
   frame.style.cssText='display:block;width:100%;height:calc(100vh - 115px);min-height:600px;border:0;background:#f5f7fa';
   frame.src='comunicazioni.html';document.getElementById('view-messaggi').replaceChildren(frame);
  }
  Calendar.switchView('messaggi');
 }
 document.addEventListener('DOMContentLoaded',async()=>{
  const button=document.getElementById('messages-tab');
  button.addEventListener('click',open);
  try{
   const response=await fetch('/.netlify/functions/whatsapp-agenda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'session',accessToken:token()})});
   if(!response.ok)return;
   owner=(await response.json()).role==='owner';button.hidden=!owner;
   if(owner&&new URLSearchParams(location.search).get('view')==='messaggi')open();
  }catch{document.getElementById('messages-access-state').textContent='Verifica dell’accesso non disponibile. Ricarica il calendario.'}
 });
})();
