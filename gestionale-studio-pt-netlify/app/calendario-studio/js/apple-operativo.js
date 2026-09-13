/* Explicit one-appointment link. Never sends appointment fields or writes NEACEA data. */
window.AppleOperativo=(()=>{
 async function mount(appt,container){
  if(!container||!window.CalendarAudit?.canLinkApple()||!['pt11','pt12','circuit'].includes(appt.serviceId)||!['prenotato','fatto','noshow'].includes(appt.status))return;
  const area=document.createElement('div');area.className='detail-section detail-section-full';
  const button=document.createElement('button'),message=document.createElement('div');button.type='button';button.className='btn-primary';button.id='apple-operativo-link';message.setAttribute('role','status');message.className='form-hint';
  const render=data=>{button.disabled=data.linked;button.textContent=data.linked?'✓ Collegato a NEACEA — Operativo':' Porta su NEACEA — Operativo';};
  try{
   const data=await CalendarAudit.appleLink('status',appt.id);
   if(!data.eligible||!container.isConnected)return;
   render(data);area.append(button,message);container.append(area);
  }catch{return;}
  button.onclick=async()=>{
   if(button.disabled)return;button.disabled=true;button.textContent='Collegamento in corso…';message.textContent='';
   try{render(await CalendarAudit.appleLink('link',appt.id));}
   catch(error){render({linked:false});message.textContent=error.message;}
  };
 }
 return {mount};
})();
