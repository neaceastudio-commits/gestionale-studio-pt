/* Durable technical outbox, isolated by authenticated PT. It never contains the
 * program/session payload. A monitoring outage must never prevent a real save. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PTSaveMonitor=api;})(typeof window==='object'?window:globalThis,function(){
  function create({storage,context,send,uuid,notify=()=>{}}) {
    const prefix='neacea_pt_save_monitor_v1:',memory=new Map(),acknowledged=new Set();
    let running=null,device;
    function deviceId(){if(device)return device;try{device=storage.getItem(prefix+'device')||uuid();storage.setItem(prefix+'device',device);}catch(_){device ||= uuid();}return device;}
    const entryKey=(actor,id)=>prefix+actor+':'+id;
    function read(actor,includeRejected=false){
      const events=new Map();
      try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(prefix+actor+':')){const event=JSON.parse(storage.getItem(key));if(event?.id)events.set(event.id,event);}}}catch(_){}
      for(const [key,event] of memory)if(key.startsWith(prefix+actor+':'))events.set(event.id,event);
      return [...events.values()].filter(e=>!acknowledged.has(entryKey(actor,e.id))&&(includeRejected||!e.rejected));
    }
    function remove(actor,id){const key=entryKey(actor,id);acknowledged.add(key);memory.delete(key);try{storage.removeItem(key);}catch(_){} }
    function write(actor,event){const key=entryKey(actor,event.id);memory.set(key,event);try{storage.setItem(key,JSON.stringify(event));return true;}catch(_){notify('Le segnalazioni tecniche non sono protette sul dispositivo. Mantieni aperta l’app finché torna la connessione.');return false;}}
    const delivered=actor=>notify(read(actor,true).some(e=>e.rejected)?'Alcune segnalazioni tecniche non sono state accettate per un cambio di accesso o assegnazione. Sono conservate su questo dispositivo: avvisa la Direzione.':'');
    function record(event){
      const actor=event.actorId||context()?.actor;if(!actor || !event.clientId || !event.programId || !event.requestKey)return;
      const events=read(actor);
      // Coalesce only repeated states of the same request. Preserve the last
      // failure until a verified readback, including across reloads/offline.
      const base={device_id:deviceId(),client_id:event.clientId,program_id:event.programId,appointment_id:event.appointmentId||'',kind:event.kind,request_key:event.requestKey};
      const same=e=>e.kind===base.kind && e.request_key===base.request_key && e.client_id===base.client_id && e.program_id===base.program_id && e.appointment_id===base.appointment_id;
      if(events.some(e=>same(e)&&e.status==='verified'))return;
      if(event.status==='pending' && events.some(e=>same(e)))return;
      const next={...base,id:uuid(),status:event.status,stage:event.stage,error_code:event.errorCode||''};
      // Write the replacement first, so a full disk never deletes the only
      // surviving signal. One storage key per event prevents tab overwrite races.
      if(write(actor,next))for(const e of events.filter(e=>same(e)&&e.status===event.status))remove(actor,e.id);
      void flush();
    }
    async function flush(){
      if(running)return running;
      const current=context();if(!current?.actor || !current.token)return;
      const actor=current.actor,token=current.token;
      if(!read(actor).length){delivered(actor);return;}
      running=(async()=>{
        try {
          while(context()?.actor===actor && context()?.token===token){
            const events=read(actor);if(!events.length){delivered(actor);break;}
            const batch=events.slice(0,50),response=await send(token,batch);
            if(!Array.isArray(response.acknowledged) || batch.some(e=>!response.acknowledged.includes(e.id)&&!response.rejected?.includes(e.id)))throw Error('Monitoraggio non confermato');
            // New edits may have queued while this batch was in flight.
            for(const id of response.acknowledged)remove(actor,id);
            for(const e of batch.filter(e=>response.rejected?.includes(e.id)))write(actor,{...e,rejected:true});
          }
        }catch(_){notify('Monitoraggio tecnico in attesa di connessione. Le segnalazioni saranno inviate automaticamente; controlla anche lo stato di salvataggio della scheda.');}
        finally{running=null;}
      })();return running;
    }
    return {record,flush,pending:actor=>read(actor).length};
  }
  let instance;
  if(typeof window==='object') {
    const warning=message=>{let el=document.getElementById('ptMonitorSyncWarning');if(!el){el=document.createElement('p');el.id='ptMonitorSyncWarning';el.setAttribute('role','status');el.className='pt-monitor-sync-warning';document.getElementById('appShell')?.prepend(el);}el.textContent=message;el.hidden=!message;};
    const storage={get length(){return localStorage.length;},key:index=>localStorage.key(index),getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
    instance=create({storage,context:()=>{const a=window.PTSessionContext?.getApp();return {actor:a?.currentPt?.id,token:a?.accessToken};},uuid:()=>crypto.randomUUID(),notify:warning,
      send:async(token,events)=>{const r=await fetch('/.netlify/functions/pt-monitor',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'events',events}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok&&!(r.status===403&&Array.isArray(data.rejected)))throw Error('Monitoraggio non disponibile');return data;}});
    window.addEventListener('online',()=>instance.flush());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')instance.flush();});
    setInterval(()=>{if(document.visibilityState==='visible')instance.flush();},30000);
  }
  return {create,record:event=>instance?.record(event),flush:()=>instance?.flush()};
});
