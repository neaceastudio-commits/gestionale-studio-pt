/* Operational records are scoped to appointment + client + author, never to the whole program. */
window.PTSessionLog = (() => {
  const drafts = new Map();
  const storagePrefix='neacea_pt_session_draft_v1:';
  const inFlight=new Map(), retryTimers=new Map();
  let notifyCurrent=null, captureCurrent=null, selectCurrentWorkout=null;
  const capture=()=>captureCurrent?.();
  const hasPending=()=>[...drafts.entries()].some(([key,draft])=>key.endsWith("|"+ctx()?.getApp()?.currentPt?.id)&&(draft.dirty||draft.pending));
  const canonical=data=>JSON.stringify({rows:(data?.rows||[]).map(row=>Object.fromEntries(['exercise','load','reps','rir','notes'].map(k=>[k,String(row[k]||'').trim()]))),notes:String(data?.notes||'').trim(),status:data?.status||'completed',...(data?.workout?{workout:{sheet:data.workout.sheet,week:data.workout.week}}:{})});
  function persist(key,draft){
    draft.savedLocallyAt=Date.now();
    try{localStorage.setItem(storagePrefix+key,JSON.stringify(draft));draft.storageFailed=false;try{sessionStorage.removeItem(storagePrefix+key);}catch(_){}return true;}
    catch(_){}
    try{sessionStorage.setItem(storagePrefix+key,JSON.stringify(draft));draft.storageFailed=false;return true;}
    catch(_){draft.storageFailed=true;return false;}
  }
  function restore(key){
    const copies=[];
    for(const storage of [()=>sessionStorage,()=>localStorage])try{const draft=JSON.parse(storage().getItem(storagePrefix+key));if(draft&&Array.isArray(draft.data?.rows)&&typeof draft.data.notes==='string'&&draft.requestId)copies.push(draft);}catch(_){}
    return copies.sort((a,b)=>(b.savedLocallyAt||0)-(a.savedLocallyAt||0))[0]||null;
  }
  function discard(key){for(const storage of [()=>localStorage,()=>sessionStorage])try{storage().removeItem(storagePrefix+key);}catch(_){}}
  window.addEventListener('beforeunload',event=>{
    capture();
    if([...drafts.entries()].some(([key,draft])=>key.endsWith('|'+ctx()?.getApp()?.currentPt?.id)&&(draft.dirty||draft.pending))){event.preventDefault();event.returnValue='';}
  });
  function report(key,draft,message){draft.message=message;notifyCurrent?.(key,message);}
  function schedule(key){
    clearTimeout(retryTimers.get(key));
    retryTimers.set(key,setTimeout(()=>flush(key),600));
  }
  async function flush(key){
    if(inFlight.has(key))return inFlight.get(key);
    const api=ctx(),app=api?.getApp(),draft=drafts.get(key);
    const [clientId,appointmentId,actorId]=key.split('|');
    if(!draft||(!draft.dirty&&!draft.pending)||draft.conflict||!draft.programId||app?.currentPt?.id!==actorId)return;
    clearTimeout(retryTimers.get(key));
    const run=(async()=>{
      let failed=false;
      try{
        while((draft.dirty||draft.pending)&&ctx()?.getApp()?.currentPt?.id===actorId){
          draft.pending ||= {appointmentId,clientId,programId:draft.programId,data:structuredClone(draft.data),version:draft.version,requestId:draft.requestId};
          const sent=structuredClone(draft.pending);delete sent.receipt;persist(key,draft);report(key,draft,'Sincronizzazione sul server…');
          const result=await window.PTSaveTransaction.commit({
            key:`session|${key}`,pending:draft.pending,request:sent,
            actorId,
            persist:()=>persist(key,draft),
            send:request=>api.ptData('save_session_record',request),
            read:request=>api.ptData('session_record_snapshot',{appointmentId:request.appointmentId,clientId:request.clientId}),
            validate:(response,request,phase)=>window.PTSaveTransaction.session(response,request,phase,actorId)
          });
          const record=result.record;
          if(ctx()?.getApp()?.currentPt?.id===actorId)app.sessionRecords=[...(app.sessionRecords||[]).filter(r=>r.id!==record.id),record];
          draft.version=record.version;delete draft.pending;
          if(draft.programId===sent.programId&&canonical(draft.data)===canonical(sent.data)){
            draft.dirty=false;discard(key);
            report(key,draft,record.data.status==='draft'?'Salvato · seduta in compilazione.':'Seduta completata e salvata.');
          }else{draft.requestId=crypto.randomUUID();persist(key,draft);}
          if(ctx()?.getApp()?.currentPt?.id===actorId){api.onSessionSaved?.();window.PTSessionLog?.renderHandoff();}
        }
      }catch(e){if(e.code==='SESSION_CONFLICT')draft.conflict=e.current;failed=!e.status||e.status>=500;if(e.status===400){delete draft.pending;draft.requestId=crypto.randomUUID();}report(key,draft,(e.message||'Rete non disponibile.')+(draft.storageFailed?' Non chiudere: la bozza non è protetta sul dispositivo.':' Modifiche conservate sul dispositivo, non ancora confermate sul server. '+(failed?'Riprovo automaticamente.':'Correggi i dati o riaccedi per riprendere la sincronizzazione.')));}
      finally{
        if(draft.dirty||draft.pending)persist(key,draft);
        inFlight.delete(key);
        if(failed)retryTimers.set(key,setTimeout(()=>flush(key),5000));
        if(draft.conflict&&currentKey===key)render();
      }
    })();inFlight.set(key,run);return run;
  }
  function recoverForActor(app){
    const actor=app.currentPt?.id;if(!actor)return;
    for(const getStorage of [()=>localStorage,()=>sessionStorage])try{const storage=getStorage();for(let i=0;i<storage.length;i++){
      const storageKey=storage.key(i);if(!storageKey?.startsWith(storagePrefix)||!storageKey.endsWith('|'+actor))continue;
      const key=storageKey.slice(storagePrefix.length),[clientId,appointmentId]=key.split('|');
      if(!(app.assignedSessions||[]).some(a=>a.id===appointmentId&&a.operator_id===actor&&a.client_ids?.includes(clientId)))continue;
      if(!drafts.has(key)){const draft=restore(key);if(draft){drafts.set(key,draft);schedule(key);}}
    }}catch(_){}
  }
  window.addEventListener('online',()=>{for(const key of drafts.keys())schedule(key);});
  document.addEventListener('visibilitychange',()=>{capture();for(const key of drafts.keys())schedule(key);});
  window.addEventListener('pagehide',()=>{capture();for(const [key,draft] of drafts)if(draft.dirty||draft.pending)persist(key,draft);});
  let host, handoffHost, currentKey='', selectionContext='', workoutViewContext='';
  const ctx=()=>window.PTSessionContext;
  const empty=()=>({rows:[],notes:'',status:'draft'});
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;if(tag==='button')el.className='btn';return el;};
  function rowsForWorkout(studio,sheet,week){
    const prescription=studio.coachingEditorSnapshot?.program?.days?.find(d=>d.letter===sheet)?.exercisesByWeek?.[week+1];
    const exercises=(studio.sheets?.[sheet]||[]).filter(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1));
    const entries=prescription ? prescription.map(planned=>({planned,exercise:exercises.find(e=>e.id===planned.key)||{}})) : exercises.map(exercise=>({exercise}));
    return entries.flatMap(({planned,exercise})=>{
      const sets=exercise.weekSets?.[week]||[];
      const groups=planned?.structuredPrescription?.setGroups;
      const structuredReps=groups?.length ? groups.flatMap(group=>Array.from({length:Math.min(100,Math.max(0,parseInt(group.sets,10)||0))},()=>String(group.reps||''))) : null;
      const prescribedCount=parseInt(planned?.sets,10);
      const count=structuredReps ? structuredReps.length : Number.isFinite(prescribedCount) ? Math.min(100,Math.max(0,prescribedCount)) : sets.length;
      const plannedReps=String(planned?.reps||'').split(/\s*\/\s*/);
      return Array.from({length:count},(_,index)=>({exercise:planned?.name||exercise.name,load:'',reps:structuredReps ? structuredReps[index] : plannedReps.length===count ? plannedReps[index] : (planned?.reps||sets[index]?.reps||''),rir:'',notes:''}));
    });
  }

  function handoffFor(api,app,programId){
    const source=(app.programs||[]).find(p=>(p.rowId||p.id)===programId);
    const studio=api.programState?.(source)||source?.data?.pt_studio_state||source?.data?.studio_state||{};
    const client=api.selectedClient(),clientId=client?.id;
    const owner=(app.operators||[]).find(o=>o.id===(client?.trainer_id||client?.pt_assegnato));
    const ownerName=[owner?.nome,owner?.cognome].filter(Boolean).join(' ');
    const local=window.PTWorkoutHandoff?.build(studio,(app.sessionRecords||[]).filter(r=>r.cliente_id===clientId),programId,ownerName,(app.programs||[]).filter(p=>p.client_id===clientId||p.cliente_id===clientId).map(p=>({...p,data:{...p.data,pt_studio_state:api.programState?.(p)||p.data?.pt_studio_state||p.data?.studio_state||{}}})));
    return window.PTWorkoutHandoff?.merge(app.sessionHandoffs?.[programId],local);
  }
  const workoutLabel=w=>w?.sheet!=null?`Allenamento ${w.sheet} · Settimana ${w.week+1}`:'Allenamento/settimana non registrati';
  const referenceDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):(value||'Data non registrata');
  function appendReference(target,handoff,exercise,workout){
    const ref=window.PTWorkoutHandoff.reference(handoff,exercise,workout);
    const box=document.createElement('section');
    box.className='pt-load-reference';target.append(box);
    box.setAttribute('aria-label',`Carichi precedenti · ${exercise}`);
    box.append(text('strong','Carichi precedenti'));
    if(!ref){box.append(text('p','Nessun carico precedente registrato per questo esercizio.'));return;}
    const meta=text('p',[`Ultima registrazione · ${referenceDate(ref.date)}`,ref.sheet!=null?workoutLabel(ref):'',ref.operator,ref.complete===false?'In compilazione':'',ref.otherProgram?'Programma precedente':''].filter(Boolean).join(' · '));
    meta.className='pt-load-reference-meta';box.append(meta);
    const list=document.createElement('ol');list.className='pt-load-reference-series';
    ref.rows.forEach((row,index)=>{
      const item=document.createElement('li');item.append(text('strong',`Serie ${index+1}`));
      const values=document.createElement('dl');
      for(const [label,value] of [['Ripetizioni',row.reps],['Carico',row.load],['RIR / RPE',row.rir]]){
        const field=document.createElement('div');field.append(text('dt',label),text('dd',value||'—'));values.append(field);
      }
      item.append(values);
      if(row.notes){const note=text('p',`Note: ${row.notes}`);note.className='pt-load-reference-note';item.append(note);}
      list.append(item);
    });
    box.append(list);
  }
  function renderHandoff(api,app,client){
    if(!handoffHost){handoffHost=document.createElement('section');handoffHost.className='card pt-workout-handoff';}
    const destination=document.getElementById('workoutHandoff')||document.getElementById('sheetView');if(destination&&handoffHost.parentElement!==destination)destination.append(handoffHost);
    const references=document.querySelectorAll('#sheetPreviewStack [data-load-reference]');
    references.forEach(target=>target.replaceChildren());
    handoffHost.hidden=!client||app.activeView!=='sheetView';if(handoffHost.hidden)return;
    handoffHost.replaceChildren(text('h3','Passaggio di consegne'));
    const handoff=handoffFor(api,app,app.selectedProgramId);const last=handoff?.lastRecorded||handoff?.last,next=handoff?.next;
    const latest=text('p',last?`Ultima seduta registrata: ${workoutLabel(last)} · ${last.date}${last.operator?' · '+last.operator:''}`:'Nessuna seduta registrata per questa scheda.');latest.className='pt-last-workout';handoffHost.append(latest);
    if(last?.notes)handoffHost.append(text('p','Note dell’ultima seduta: '+last.notes));
    if(last?.rows?.length){
      const details=document.createElement('details');details.append(text('summary','Vedi tutti i risultati dell’ultima seduta salvata'));
      last.rows.forEach((row,index)=>details.append(text('p',`${index+1}. ${row.exercise} — carico ${row.load||'—'}, ripetizioni ${row.reps||'—'}, RIR / RPE ${row.rir||'—'}${row.notes?' · Note: '+row.notes:''}`)));
      handoffHost.append(details);
    }
    for(const progress of handoff?.inProgress||[]){
      const details=document.createElement('details');details.append(text('summary',`Seduta in compilazione · ${referenceDate(progress.date)} · ${workoutLabel(progress)} · ${progress.operator||''}`));
      for(const row of progress.rows||[])details.append(text('p',`${row.exercise||'Esercizio da indicare'} — carico ${row.load||'—'}, ripetizioni ${row.reps||'—'}, RIR / RPE ${row.rir||'—'}${row.notes?' · Note: '+row.notes:''}`));
      if(progress.notes)details.append(text('p',progress.notes));handoffHost.append(details);
    }
    if(next){const button=text('button','Da fare · '+workoutLabel(next));button.type='button';button.className='pt-next-workout';button.onclick=()=>api.selectWorkout?.(next.sheet,next.week);handoffHost.append(button,text('p','Suggerimento basato sulle sedute completate. Se manca una registrazione, scegli liberamente allenamento e settimana da svolgere.'));
    }else if(last?.sheet==null&&last)handoffHost.append(text('p','L’ultima registrazione non indica allenamento e settimana: scegli la seduta dopo aver verificato con il PT titolare.'));
    else if(last)handoffHost.append(text('p','Non risultano altri allenamenti successivi da completare in questo programma.'));
    references.forEach(target=>appendReference(target,handoff,target.dataset.loadReference,{programId:app.selectedProgramId,sheet:api.getState()?.currentSheet,week:Number(api.getState()?.activeWeekIndex)||0,date:api.getState()?.workoutDates?.[api.getState()?.currentSheet]?.[Number(api.getState()?.activeWeekIndex)||0]||new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}));
  }
  function render(){
    capture();captureCurrent=null;selectCurrentWorkout=null;
    const api=ctx();if(!api)return;
    const viewChoice=document.getElementById('previewSessionChoice');
    if(viewChoice){viewChoice.replaceChildren();viewChoice.hidden=true;}
    const app=api.getApp(),client=api.selectedClient();recoverForActor(app);
    renderHandoff(api,app,client);
    if(!host){host=document.createElement('section');host.className='card pt-session-log';}
    const sharedUse=api.canCompileSharedSession?.() && app.activeView==='sheetView';
    const showHistory=app.sessionHistoryVisible && api.canMonitorActivity?.();
    const destination=document.getElementById(sharedUse?'sheetView':'programsView');
    if(destination && host.parentElement!==destination)destination.insertBefore(host,sharedUse?destination.querySelector('.sheet-presentation'):null);
    host.hidden=!app.sessionLogEnabled || !client || !(sharedUse || (showHistory && app.activeView==='programsView'));
    notifyCurrent=null;
    if(host.hidden)return;
    host.replaceChildren(text('h3',showHistory ? 'Registro sedute — carichi e ripetizioni' : 'Compila la tua seduta'));
    host.append(text('p','Carichi, ripetizioni e note si salvano automaticamente mentre compili. Premi Completa seduta solo al termine: fino ad allora la seduta resta in compilazione.'));
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const sessions=(app.assignedSessions||[]).filter(s=>s.client_ids?.includes(client.id) && s.operator_id===app.currentPt.id).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time));
    const todays=sessions.filter(s=>s.date===today).sort((a,b)=>a.start_time.localeCompare(b.start_time));
    const recordFor=s=>(app.sessionRecords||[]).find(r=>r.cliente_id===client.id&&r.appointment_id===s.id&&r.operator_id===app.currentPt.id);
    const completionLabel=s=>recordFor(s)?.data.status==='draft'?'In compilazione':recordFor(s)?'Già compilata':s.date>today?'In programma': 'Da compilare';
    const context=`${app.currentPt.id}|${client.id}|${today}`;
    const previous=currentKey.split('|');
    const selectedId=selectionContext===context && sessions.some(s=>s.id===previous[1]) ? previous[1] : (todays.length===1?todays[0].id:'');
    selectionContext=context;
    currentKey=selectedId?`${client.id}|${selectedId}|${app.currentPt.id}`:'';
    const picker=document.createElement('select');picker.setAttribute('aria-label','Data della seduta assegnata');picker.append(new Option('Scegli una seduta',''));
    for(const s of sessions)picker.append(new Option(`${referenceDate(s.date)} · ${String(s.start_time).slice(0,5)} · ${completionLabel(s)}`,s.id));
    picker.value=selectedId;
    const choices=document.createElement('div');choices.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';
    if(todays.length>1){
      host.append(text('p','Hai più sedute assegnate oggi per questo cliente. Scegli quella da compilare.'));
      for(const s of todays){const button=text('button',`Oggi · ore ${String(s.start_time).slice(0,5)} · ${completionLabel(s)}`);button.type='button';button.className='btn';button.dataset.sessionId=s.id;button.onclick=()=>{picker.value=s.id;refresh();};choices.append(button);}
      host.append(choices);
    }else if(!todays.length){host.append(text('p','Oggi non hai sedute assegnate per questo cliente. Puoi scegliere una data precedente da completare.'));}
    const dates=document.createElement('details');dates.append(text('summary','Scegli un’altra data'));
    dates.append(picker);dates.open=!!selectedId&&!todays.some(s=>s.id===selectedId);host.append(dates);
    if (!sessions.length) host.append(text('p','Non hai sedute assegnate per questo cliente. L’assegnazione va fatta dal Calendario.'));
    const editor=document.createElement('div');host.append(editor);
    const refresh=()=>{
      capture();captureCurrent=null;selectCurrentWorkout=null;
      editor.replaceChildren();const appointment=sessions.find(s=>s.id===picker.value);
      choices.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sessionId===picker.value)));
      if(!appointment){currentKey='';return;}
      const summary=document.createElement('section');summary.className='pt-selected-session';
      summary.append(text('h4',`${appointment.date===today?'Seduta di oggi':'Seduta del '+referenceDate(appointment.date)} · ${[client.nome,client.cognome].filter(Boolean).join(' ')} · ore ${String(appointment.start_time).slice(0,5)}`));
      summary.append(text('p',`PT: ${[app.currentPt.nome,app.currentPt.cognome].filter(Boolean).join(' ')} · ${completionLabel(appointment)}`));editor.append(summary);
      const key=`${client.id}|${appointment.id}|${app.currentPt.id}`;currentKey=key;
      const record=(app.sessionRecords||[]).find(r=>r.cliente_id===client.id&&r.appointment_id===appointment.id&&r.operator_id===app.currentPt.id);
      if(!drafts.has(key))drafts.set(key,restore(key)||{data:structuredClone(record?.data||empty()),programId:record?.program_id||(sharedUse ? app.selectedProgramId : '')||app.currentPrograms?.[client.id]||'',version:record?.version||0,requestId:crypto.randomUUID()});
      let draft=drafts.get(key);
      if(!draft.dirty&&!draft.pending&&record&&record.version>draft.version){draft={data:structuredClone(record.data),programId:record.program_id,version:record.version,requestId:crypto.randomUUID()};drafts.set(key,draft);}
      if(draft.dirty&&!draft.message)draft.message='Bozza recuperata: sincronizzazione automatica in corso.';
      if(draft.data.workout){draft.sheet ??= draft.data.workout.sheet;draft.week ??= draft.data.workout.week;}
      if(appointment.date>today){editor.append(text('p','Potrai registrare i risultati dal giorno della seduta.'));return;}
      const programs=(app.programs||[]).filter(p=>p.cliente_id===client.id||p.client_id===client.id||p.data?.cliente_id===client.id||p.data?.client_id===client.id);
      const program=document.createElement('select');program.setAttribute('aria-label','Programma della seduta');program.append(new Option('Scegli il programma',''));
      for(const p of programs)program.append(new Option(p.data?.name||p.data?.nome||p.name||p.id,p.rowId||p.id));program.value=draft.programId;
      const changed=()=>{draft.dirty=true;draft.requestId=crypto.randomUUID();draft.message='Sincronizzazione sul server…';persist(key,draft);status.textContent=draft.storageFailed?'Bozza locale non disponibile. Sincronizzazione sul server…':draft.message;schedule(key);};
      const captureFields=[];
      captureCurrent=()=>captureFields.forEach(read=>read());
      program.onchange=()=>{capture();if(draft.data.rows.length&&!confirm('Cambiare programma e svuotare la bozza corrente?')){program.value=draft.programId;return;}draft.programId=program.value;draft.data=empty();draft.sheet=undefined;draft.week=undefined;draft.initialized=false;captureCurrent=null;changed();refresh();};
      const programLabel=text('label','Programma della seduta');programLabel.className='pt-session-program';programLabel.append(program);editor.append(programLabel);
      const source=programs.find(p=>(p.rowId||p.id)===draft.programId);const studio=source?.data?.pt_studio_state||source?.data?.studio_state||{};
      if(draft.programVersion !== undefined && draft.programVersion !== source?.updated_at){
        if(draft.dirty || record)editor.append(text('p','Il referente ha aggiornato la scheda. La tua registrazione è conservata: confrontala con il programma prima di salvare. Carica esercizi e serie sostituisce le righe dopo la tua conferma.'));
        else {draft.data=empty();draft.initialized=false;}
      }
      draft.programVersion=source?.updated_at;
      const effectiveStudio = sharedUse && draft.programId === app.selectedProgramId && api.getState ? api.getState() : (api.programState?.(source) || studio);
      const sheetPicker=document.createElement('select');sheetPicker.setAttribute('aria-label','Allenamento da compilare');
      for(const key of effectiveStudio.sheetOrder || Object.keys(effectiveStudio.sheets||{})) sheetPicker.append(new Option(`Allenamento ${key}`,key));
      const handoff=handoffFor(api,app,draft.programId);
      sheetPicker.value=draft.sheet || handoff?.next?.sheet || effectiveStudio.currentSheet || sheetPicker.options[0]?.value || '';
      const weekPicker=document.createElement('select');weekPicker.setAttribute('aria-label','Settimana da compilare');
      (effectiveStudio.sessions||[]).forEach((label,i)=>weekPicker.append(new Option(label,String(i))));
      weekPicker.value=String(draft.week ?? handoff?.next?.week ?? effectiveStudio.activeWeekIndex ?? 0);
      const chooseWorkout=(sheet,week,reload=false)=>{
        capture();
        if(!Array.from(sheetPicker.options).some(option=>option.value===sheet) || !Number.isInteger(week) || week<0 || week>=effectiveStudio.sessions?.length)return false;
        if(!reload && draft.data.workout?.sheet===sheet && draft.data.workout?.week===week){
          draft.selectionPending=false;sheetPicker.value=sheet;weekPicker.value=String(week);
          if(draft.programId===app.selectedProgramId)api.onWorkoutSelected?.(sheet,week);return true;
        }
        if(draft.data.rows.length && (record || draft.version>0 || draft.dirty || draft.pending || draft.data.notes || draft.data.rows.some(row=>row.load || row.rir || row.notes)) && !confirm(`Questa seduta contiene già una registrazione. Sostituire le sue serie con Allenamento ${sheet} · Settimana ${week+1}?`))return false;
        draft.sheet=sheet;draft.week=week;draft.selectionPending=false;
        draft.data.workout={sheet:draft.sheet,week:draft.week};
        draft.data.status='draft';
        draft.data.rows=rowsForWorkout(effectiveStudio,draft.sheet,draft.week);
        captureCurrent=null;changed();
        if(api.onWorkoutSelected && draft.programId===app.selectedProgramId)api.onWorkoutSelected(sheet,week);else refresh();
        return true;
      };
      selectCurrentWorkout=(sheet,week)=>draft.programId===app.selectedProgramId ? chooseWorkout(sheet,week) : undefined;
      const prepare=()=>chooseWorkout(sheetPicker.value,Number(weekPicker.value),true);
      const fill=text('button','Carica esercizi e serie');fill.type='button';fill.onclick=prepare;
      const workoutFields=document.createElement('div');workoutFields.className='pt-session-workout-fields';
      const sheetLabel=text('label','Allenamento'),weekLabel=text('label','Settimana');sheetLabel.append(sheetPicker);weekLabel.append(weekPicker);workoutFields.append(sheetLabel,weekLabel,fill);editor.append(workoutFields);
      const selectionPending=()=>{draft.selectionPending=true;workoutSummary.textContent='Cambio allenamento da confermare: premi Carica esercizi e serie.';status.textContent='Premi Carica esercizi e serie per confermare il nuovo allenamento prima di salvare.';};
      sheetPicker.onchange=selectionPending;weekPicker.onchange=selectionPending;
      if(!record && !draft.initialized && !draft.data.rows.length){
        draft.sheet=sheetPicker.value;draft.week=Number(weekPicker.value);draft.selectionPending=false;
        draft.data.workout={sheet:draft.sheet,week:draft.week};
        draft.data.rows=rowsForWorkout(effectiveStudio,draft.sheet,draft.week);draft.initialized=true;
      }
      // Open a session on its saved workout once. Subsequent consultation is free:
      // rendering/autosave must not drag A/B/C back to the recorded workout.
      const selectedWorkout=draft.data.workout,view=api.getState?.();
      const viewContext=JSON.stringify([key,draft.programId]);
      const openingWorkout=sharedUse && workoutViewContext!==viewContext;
      if(sharedUse)workoutViewContext=viewContext;
      if(api.onWorkoutSelected && openingWorkout && draft.programId===app.selectedProgramId && selectedWorkout &&
        (effectiveStudio.sheetOrder||[]).includes(selectedWorkout.sheet) && selectedWorkout.week>=0 && selectedWorkout.week<effectiveStudio.sessions?.length &&
        (view?.currentSheet!==selectedWorkout.sheet || Number(view?.activeWeekIndex||0)!==selectedWorkout.week)){
        api.onWorkoutSelected(selectedWorkout.sheet,selectedWorkout.week);return;
      }
      if(viewChoice && sharedUse && draft.programId===app.selectedProgramId && selectedWorkout &&
        (view?.currentSheet!==selectedWorkout.sheet || Number(view?.activeWeekIndex||0)!==selectedWorkout.week)){
        const viewed={sheet:view.currentSheet,week:Number(view.activeWeekIndex)||0};
        viewChoice.hidden=false;
        viewChoice.append(text('p',`Stai consultando: ${workoutLabel(viewed)}. La registrazione resta su ${workoutLabel(selectedWorkout)}; i risultati sono conservati.`));
        const use=text('button',`Compila ${workoutLabel(viewed)}`);use.type='button';use.className='btn';
        use.onclick=()=>chooseWorkout(viewed.sheet,viewed.week);viewChoice.append(use);
      }
      const workoutSummary=text('p',draft.data.workout ? `Stai compilando: ${workoutLabel(draft.data.workout)}` : 'Seleziona allenamento e settimana da compilare.');workoutSummary.className='pt-selected-workout';summary.append(workoutSummary);
      if(!draft.data.workout && record)editor.append(text('p','Questa vecchia registrazione non specifica allenamento e settimana. Il riferimento verrà salvato solo dopo aver caricato e confermato l’allenamento corretto.'));
      const names=[...new Set(Object.values(effectiveStudio.sheets||{}).flat().map(e=>e.name).filter(Boolean))];
      const list=document.createElement('datalist');list.id='pt-session-exercises';names.forEach(name=>list.append(new Option(name,name)));editor.append(list);
      const exerciseStarts=draft.data.rows.map((row,index)=>({row,index})).filter(({row,index})=>index===0||draft.data.rows[index-1].exercise!==row.exercise);
      const overview=document.createElement('nav');overview.setAttribute('aria-label','Esercizi della seduta');overview.className='pt-session-exercise-nav';
      overview.append(text('strong',`${exerciseStarts.length} esercizi · ${draft.data.rows.length} serie`),text('p','La seduta completa è qui sotto. Tocca un esercizio per raggiungere i suoi carichi.'));
      const exerciseLinks=document.createElement('div');overview.append(exerciseLinks);editor.append(overview);
      let exerciseSeries=0;
      draft.data.rows.forEach((row,index)=>{
        const ordinal=exerciseStarts.findIndex(item=>item.index===index);
        exerciseSeries=ordinal>=0?1:exerciseSeries+1;
        if(ordinal>=0){
          const heading=text('h4',`${ordinal+1}. ${row.exercise||'Nuovo esercizio'}`);heading.tabIndex=-1;heading.className='pt-session-exercise-title';editor.append(heading);
          const jump=text('button',`${ordinal+1}. ${row.exercise||'Nuovo esercizio'}`);jump.type='button';jump.className='btn';jump.style.cssText='white-space:normal;text-align:left;max-width:100%';jump.onclick=()=>{heading.scrollIntoView({block:'start'});heading.focus({preventScroll:true});};exerciseLinks.append(jump);
          if(window.PTExerciseTimer?.prescriptionFor){
            const workout=draft.data.workout;
            const prescription=window.PTExerciseTimer.prescriptionFor(effectiveStudio,workout?.sheet,workout?.week,row.exercise);
            const timer=document.createElement('div');
            timer.innerHTML=window.PTExerciseTimer.markup([
              client.id,draft.programId,workout?.sheet,workout?.week,
              prescription.exerciseId ?? JSON.stringify(['session',appointment.id,ordinal,row.exercise])
            ],prescription.recovery,prescription.roundRecovery);
            editor.append(timer);
          }
        }
        const wrap=document.createElement('fieldset');wrap.className='pt-session-series';wrap.append(text('legend',`Serie ${exerciseSeries}`));
        for(const [field,label,max] of [['exercise','Esercizio',160],['load','Carico',40],['reps','Ripetizioni',40],['rir','RIR',20],['notes','Note della serie',1000]]){
          const labelEl=text('label',label);const input=document.createElement('input');input.value=row[field];if(field==='exercise' && names.includes(row.exercise))input.readOnly=true;input.maxLength=max;if(field==='exercise')input.setAttribute('list',list.id);
          const capture=event=>{if(row[field]!==input.value){row[field]=input.value;changed();}};captureFields.push(capture);input.oninput=capture;input.onchange=capture;input.onblur=capture;labelEl.append(input);wrap.append(labelEl);
        }
        if(index===0||draft.data.rows[index-1].exercise!==row.exercise)appendReference(wrap,handoff,row.exercise,{programId:draft.programId,...draft.data.workout,appointmentId:appointment.id,date:appointment.date});
        const remove=text('button','Rimuovi serie');remove.type='button';remove.className='btn danger';remove.onclick=()=>{capture();draft.data.rows.splice(index,1);captureCurrent=null;changed();refresh();};wrap.append(remove);editor.append(wrap);
      });
      const add=text('button','Aggiungi serie');add.type='button';add.className='btn pt-session-add';add.onclick=()=>{capture();draft.data.rows.push({exercise:'',load:'',reps:'',rir:'',notes:''});changed();refresh();};editor.append(add);
      const noteLabel=text('label','Note della seduta e variazioni rispetto al programma');noteLabel.className='pt-session-note';const notes=document.createElement('textarea');notes.value=draft.data.notes;notes.maxLength=4000;const captureNotes=()=>{if(draft.data.notes!==notes.value){draft.data.notes=notes.value;changed();}};captureFields.push(captureNotes);notes.oninput=captureNotes;notes.onchange=captureNotes;notes.onblur=captureNotes;noteLabel.append(notes);editor.append(noteLabel);
      const status=text('p',draft.message||'Ogni modifica viene salvata automaticamente sul server. La seduta si chiude solo con Completa seduta.');status.setAttribute('role','status');status.className='pt-session-status';
      notifyCurrent=(draftKey,message)=>{if(draftKey===key){status.textContent=message;summary.querySelector('p').textContent=`PT: ${[app.currentPt.nome,app.currentPt.cognome].filter(Boolean).join(' ')} · ${completionLabel(appointment)}`;}};
      const save=text('button','Completa seduta');save.type='button';save.className='btn primary pt-session-save';save.onclick=async()=>{
        capture();
        if(draft.selectionPending){status.textContent='Conferma il nuovo allenamento con Carica esercizi e serie.';return;}if(!draft.programId){status.textContent='Scegli un programma.';return;}
        if(draft.conflict){status.textContent='Risolvi il conflitto con la versione salvata prima di completare la seduta.';return;}
        if(draft.data.rows.some(row=>!row.exercise.trim()) || (!draft.data.rows.length&&!draft.data.notes.trim())){status.textContent='Indica gli esercizi delle serie o aggiungi una nota prima di completare.';return;}
        save.disabled=true;
        try{draft.data.status='completed';changed();await flush(key);}finally{save.disabled=false;}
      };editor.append(save);editor.prepend(status);
      if(draft.dirty||draft.pending)schedule(key);
      if(draft.conflict){const reload=text('button','Carica la versione salvata');reload.type='button';reload.onclick=()=>{
        if(!confirm('Sostituire questa bozza con la registrazione già salvata?'))return;
        const saved=draft.conflict;app.sessionRecords=[...(app.sessionRecords||[]).filter(r=>r.id!==saved.id),saved];drafts.delete(key);discard(key);render();
      };editor.append(reload);}
    };picker.onchange=refresh;refresh();
    if(!showHistory)return;
    const history=document.createElement('details');history.className='pt-session-history';history.append(text('summary','Storico delle sedute · Direzione'));
    for(const record of (app.sessionRecords||[]).filter(r=>r.cliente_id===client.id)){
      const op=(app.sessionOperators||app.operators||[]).find(o=>o.id===record.operator_id);history.append(text('h4',`${record.appointment_date || record.updated_at} ${record.appointment_time || ""} · ${record.operator_name || (op?`${op.nome||''} ${op.cognome||''}`:record.operator_id)}`));
      for(const row of record.data.rows)history.append(text('p',`${row.exercise} — carico ${row.load||'—'}, ripetizioni ${row.reps||'—'}, RIR ${row.rir||'—'}${row.notes?' · '+row.notes:''}`));
      if(record.data.notes)history.append(text('p',record.data.notes));
    }host.append(history);
  }
  return {render,capture,hasPending,selectWorkout:(sheet,week)=>selectCurrentWorkout?.(sheet,week),reference:(exercise,workout)=>{const api=ctx();return api&&window.PTWorkoutHandoff.reference(handoffFor(api,api.getApp(),api.getApp().selectedProgramId),exercise,workout);},renderHandoff:()=>{const api=ctx();if(api)renderHandoff(api,api.getApp(),api.selectedClient());},rowsForWorkout};
})();
window.PTSessionLog.render();
