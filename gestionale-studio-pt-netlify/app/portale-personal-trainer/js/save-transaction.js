/* One confirmation protocol for program and appointment saves.
 * The caller owns the durable draft. A receipt survives reloads with that draft;
 * after an acknowledged write retries only read, never overwrite a newer save.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PTSaveTransaction=api;})(typeof window==='object'?window:globalThis,function(){
  const running=new Map();
  const clone=value=>JSON.parse(JSON.stringify(value));
  function commit(options){
    const {key,pending,request,persist,send,read,validate}=options;
    const fingerprint=JSON.stringify(request);
    const existing=running.get(key);
    if(existing){
      if(existing.fingerprint!==fingerprint)return Promise.reject(new Error('Un salvataggio precedente è ancora in corso.'));
      return existing.promise;
    }
    // Register before calling adapters (including synchronous/reentrant adapters).
    let resolve,reject;
    const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    running.set(key,{fingerprint,promise});
    let stage='write';
    const observe=(status,error)=>{
      const kind=request.appointmentId?'session':'program';
      const event={kind,actorId:options.actorId,clientId:request.clientId,programId:request.programId,appointmentId:request.appointmentId||'',requestKey:request.requestId||request.data?.save_meta?.request_id,status,stage,
        errorCode:!error?'':error.code==='LOCAL_STORAGE'?'local_storage':error.code?.includes('CONFLICT')||error.status===409?'conflict':error.status===400?'validation':error.status===401||error.status===403?'validation':error.status>=500?'server':stage==='read'?'unconfirmed':'network'};
      // Observers cannot modify the transaction or turn a successful save into
      // an error. The built-in observer persists only the selected metadata.
      try{(options.observe || globalThis.PTSaveMonitor?.record)?.(event);}catch(_){}
    };
    const protectDraft=()=>{if(persist()===false){const previous=stage;stage='local';observe('failed',{code:'LOCAL_STORAGE'});stage=previous;}};
    (async()=>{
      const sent=clone(request);
      observe('pending');
      protectDraft();
      if(!pending.receipt){
        const response=await send(clone(sent));
        validate(response,sent,'write');
        pending.receipt={metadata:options.metadata?.(response)||{}};
        protectDraft();
      }
      stage='read';
      const response=await read(clone(sent));
      validate(response,sent,'read');
      observe('verified');
      return {...pending.receipt.metadata,...response};
    })().then(value=>{running.delete(key);resolve(value);},error=>{observe('failed',error);running.delete(key);reject(error);});
    return promise;
  }
  function program(response,request,phase){
    const row=response?.row;
    if(phase==='read' && row?.id===request.programId && row.data?.save_meta?.request_id && row.data.save_meta.request_id!==request.data.save_meta.request_id){
      const error=new Error('La scheda è stata modificata da un altro dispositivo. La bozza è conservata.');
      error.code='PROGRAM_CONFLICT';error.status=409;error.current=row;throw error;
    }
    const integrity=typeof module==='object'&&module.exports?require('./save-integrity'):globalThis.PTSaveIntegrity;
    if(!row || row.id!==request.programId || !row.updated_at ||
      (row.cliente_id && row.cliente_id!==request.clientId) ||
      row.data?.save_meta?.request_id!==request.data.save_meta.request_id || !integrity.sameProgram(row.data,request.data))
      throw new Error('Il server non ha confermato tutti i dati della scheda. La bozza resta da sincronizzare.');
  }
  function sessionContent(data){
    return JSON.stringify({rows:(data?.rows||[]).map(row=>Object.fromEntries(['exercise','load','reps','rir','notes'].map(k=>[k,String(row[k]??'').trim()]))),notes:String(data?.notes??'').trim(),status:data?.status||'completed',...(data?.workout?{workout:{sheet:data.workout.sheet,week:data.workout.week}}:{})});
  }
  function session(response,request,phase,actorId){
    const record=response?.record;
    if(response?.conflict || (phase==='read' && record?.version>request.version+1)){
      const error=new Error('Un altro dispositivo ha modificato questa seduta. La bozza è conservata.');
      error.code='SESSION_CONFLICT';error.status=409;error.current=response.current||record;throw error;
    }
    if(!record?.id || record.appointment_id!==request.appointmentId || record.cliente_id!==request.clientId ||
      record.operator_id!==actorId || record.program_id!==request.programId || record.request_id!==request.requestId ||
      record.version!==request.version+1 || sessionContent(record.data)!==sessionContent(request.data))
      throw new Error('Il server non ha confermato tutti i dati della seduta. La bozza resta da sincronizzare.');
  }
  return {commit,program,session,sessionContent};
});
