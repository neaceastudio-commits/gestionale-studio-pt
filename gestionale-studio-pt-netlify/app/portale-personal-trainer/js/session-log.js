/* Operational records are scoped to appointment + client + author, never to the whole program. */
window.PTSessionLog = (() => {
  const drafts = new Map();
  let host, handoffHost, currentKey='', busy=false;
  const ctx=()=>window.PTSessionContext;
  const empty=()=>({rows:[],notes:''});
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  function rowsForWorkout(studio,sheet,week){
    const prescription=studio.coachingEditorSnapshot?.program?.days?.find(d=>d.letter===sheet)?.exercisesByWeek?.[week+1];
    const exercises=(studio.sheets?.[sheet]||[]).filter(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1));
    return exercises.flatMap(e=>{
      const planned=prescription?.find(p=>p.key===e.id);
      const sets=e.weekSets?.[week]||[];
      const plannedReps=String(planned?.reps||'').split(/\s*\/\s*/);
      return sets.map((set,index)=>({exercise:planned?.name||e.name,load:'',reps:plannedReps.length===sets.length ? plannedReps[index] : (planned?.reps||set.reps||''),rir:'',notes:''}));
    });
  }
  function handoffFor(api,app,programId){
    const source=(app.programs||[]).find(p=>(p.rowId||p.id)===programId);
    const studio=source?.data?.pt_studio_state||source?.data?.studio_state||{};
    const local=window.PTWorkoutHandoff?.build(studio,(app.sessionRecords||[]).filter(r=>r.cliente_id===api.selectedClient()?.id),programId);
    return window.PTWorkoutHandoff?.merge(app.sessionHandoffs?.[programId],local);
  }
  const workoutLabel=w=>w?.sheet!=null?`Allenamento ${w.sheet} · Settimana ${w.week+1}`:'Allenamento/settimana non registrati';
  const referenceDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):(value||'Data non registrata');
  function appendReference(target,handoff,exercise){
    const ref=handoff?.loads?.[window.PTWorkoutHandoff.nameKey(exercise)];
    const box=document.createElement('section');
    box.className='pt-load-reference';target.append(box);
    box.setAttribute('aria-label',`Carichi precedenti · ${exercise}`);
    box.append(text('strong','Carichi precedenti'));
    if(!ref){box.append(text('p','Nessun carico precedente registrato per questo esercizio.'));return;}
    const meta=text('p',[`Ultima registrazione · ${referenceDate(ref.date)}`,ref.sheet!=null?workoutLabel(ref):'',ref.operator].filter(Boolean).join(' · '));
    meta.className='pt-load-reference-meta';box.append(meta);
    const list=document.createElement('ol');list.className='pt-load-reference-series';
    ref.rows.forEach((row,index)=>{
      const item=document.createElement('li');item.append(text('strong',`Serie ${index+1}`));
      const values=document.createElement('dl');
      for(const [label,value] of [['Carico',row.load],['Ripetizioni',row.reps],['RIR / RPE',row.rir]]){
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
    const handoff=handoffFor(api,app,app.selectedProgramId);const last=handoff?.last,next=handoff?.next;
    const latest=text('p',last?`Ultimo completato: ${workoutLabel(last)} · ${last.date}${last.operator?' · '+last.operator:''}`:'Nessun allenamento completato e salvato per questa scheda.');latest.className='pt-last-workout';handoffHost.append(latest);
    if(last?.notes)handoffHost.append(text('p','Note dell’ultima seduta: '+last.notes));
    if(next){const button=text('button','Da fare · '+workoutLabel(next));button.type='button';button.className='pt-next-workout';button.onclick=()=>api.selectWorkout?.(next.sheet,next.week);handoffHost.append(button,text('p','Suggerito in base all’ultima seduta salvata e all’ordine degli allenamenti.'));
    }else if(last?.sheet==null&&last)handoffHost.append(text('p','L’ultima registrazione non indica allenamento e settimana: scegli la seduta dopo aver verificato con il PT titolare.'));
    else if(last)handoffHost.append(text('p','Non risultano altri allenamenti successivi da completare in questo programma.'));
    references.forEach(target=>appendReference(target,handoff,target.dataset.loadReference));
  }
  function render(){
    const api=ctx();if(!api)return;
    const app=api.getApp(),client=api.selectedClient();
    renderHandoff(api,app,client);
    if(!host){host=document.createElement('section');host.className='card';host.style.margin='16px 0';}
    const sharedUse=api.canCompileSharedSession?.() && app.activeView==='sheetView';
    const showHistory=app.sessionHistoryVisible && api.canMonitorActivity?.();
    const destination=document.getElementById(sharedUse?'sheetView':'programsView');
    if(destination && host.parentElement!==destination)destination.insertBefore(host,sharedUse?destination.querySelector('.sheet-presentation'):null);
    host.hidden=!app.sessionLogEnabled || !client || !(sharedUse || (showHistory && app.activeView==='programsView'));
    if(host.hidden || busy)return;
    host.replaceChildren(text('h3',showHistory ? 'Registro sedute — carichi e ripetizioni' : 'Compila la tua seduta'));
    host.append(text('p','Scegli la data della seduta assegnata e l’allenamento: trovi già gli esercizi e le serie. Compila i risultati e le eventuali variazioni nelle note; il programma del titolare resta invariato.'));
    const sessions=(app.assignedSessions||[]).filter(s=>s.client_ids?.includes(client.id)).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time));
    const picker=document.createElement('select');picker.setAttribute('aria-label','Data della seduta assegnata');picker.append(new Option('Scegli una seduta',''));
    for(const s of sessions)picker.append(new Option(`${s.date} · ${String(s.start_time).slice(0,5)} · ${s.status}`,s.id));
    const previous=currentKey.split('|');if(previous[0]===client.id)picker.value=previous[1]||'';
    host.append(text('label','Data della seduta assegnata'),picker);
    if (!sessions.length) host.append(text('p','Non hai sedute assegnate per questo cliente. L’assegnazione va fatta dal Calendario.'));
    const editor=document.createElement('div');host.append(editor);
    const refresh=()=>{
      editor.replaceChildren();const appointment=sessions.find(s=>s.id===picker.value);if(!appointment)return;
      const key=`${client.id}|${appointment.id}|${app.currentPt.id}`;currentKey=key;
      const record=(app.sessionRecords||[]).find(r=>r.cliente_id===client.id&&r.appointment_id===appointment.id&&r.operator_id===app.currentPt.id);
      if(!drafts.has(key))drafts.set(key,{data:structuredClone(record?.data||empty()),programId:record?.program_id||(sharedUse ? app.selectedProgramId : '')||app.currentPrograms?.[client.id]||'',version:record?.version||0,requestId:crypto.randomUUID()});
      const draft=drafts.get(key);
      if(draft.data.workout){draft.sheet ??= draft.data.workout.sheet;draft.week ??= draft.data.workout.week;}
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(appointment.date>today){editor.append(text('p','Potrai registrare i risultati dal giorno della seduta.'));return;}
      const programs=(app.programs||[]).filter(p=>p.cliente_id===client.id||p.client_id===client.id||p.data?.cliente_id===client.id||p.data?.client_id===client.id);
      const program=document.createElement('select');program.setAttribute('aria-label','Programma della seduta');program.append(new Option('Scegli il programma',''));
      for(const p of programs)program.append(new Option(p.data?.name||p.data?.nome||p.name||p.id,p.rowId||p.id));program.value=draft.programId;
      const changed=()=>{draft.requestId=crypto.randomUUID();draft.message='Modifiche da salvare.';status.textContent=draft.message;};
      program.onchange=()=>{if(draft.data.rows.length&&!confirm('Cambiare programma e svuotare la bozza corrente?')){program.value=draft.programId;return;}draft.programId=program.value;draft.data=empty();draft.sheet=undefined;draft.week=undefined;draft.initialized=false;changed();refresh();};editor.append(program);
      const source=programs.find(p=>(p.rowId||p.id)===draft.programId);const studio=source?.data?.pt_studio_state||source?.data?.studio_state||{};
      const effectiveStudio = sharedUse && draft.programId === app.selectedProgramId && api.getState ? api.getState() : (api.programState?.(source) || studio);
      const sheetPicker=document.createElement('select');sheetPicker.setAttribute('aria-label','Allenamento da compilare');
      for(const key of effectiveStudio.sheetOrder || Object.keys(effectiveStudio.sheets||{})) sheetPicker.append(new Option(`Allenamento ${key}`,key));
      const handoff=handoffFor(api,app,draft.programId);
      sheetPicker.value=draft.sheet || handoff?.next?.sheet || effectiveStudio.currentSheet || sheetPicker.options[0]?.value || '';
      const weekPicker=document.createElement('select');weekPicker.setAttribute('aria-label','Settimana da compilare');
      (effectiveStudio.sessions||[]).forEach((label,i)=>weekPicker.append(new Option(label,String(i))));
      weekPicker.value=String(draft.week ?? handoff?.next?.week ?? effectiveStudio.activeWeekIndex ?? 0);
      const prepare=()=>{
        if(draft.data.rows.length && !confirm('Sostituire le righe di questa bozza con gli esercizi dell’allenamento scelto?'))return;
        draft.sheet=sheetPicker.value;draft.week=Number(weekPicker.value);draft.selectionPending=false;
        draft.data.workout={sheet:draft.sheet,week:draft.week};
        draft.data.rows=rowsForWorkout(effectiveStudio,draft.sheet,draft.week);
        changed();refresh();
      };
      const fill=text('button','Carica esercizi e serie');fill.type='button';fill.onclick=prepare;
      editor.append(text('label','Allenamento'),sheetPicker,text('label','Settimana'),weekPicker,fill);
      const selectionPending=()=>{draft.selectionPending=true;status.textContent='Premi Carica esercizi e serie per confermare il nuovo allenamento prima di salvare.';};
      sheetPicker.onchange=selectionPending;weekPicker.onchange=selectionPending;
      if(!record && !draft.initialized && !draft.data.rows.length){
        draft.sheet=sheetPicker.value;draft.week=Number(weekPicker.value);draft.selectionPending=false;
        draft.data.workout={sheet:draft.sheet,week:draft.week};
        draft.data.rows=rowsForWorkout(effectiveStudio,draft.sheet,draft.week);draft.initialized=true;
      }
      if(!draft.data.workout && record)editor.append(text('p','Questa vecchia registrazione non specifica allenamento e settimana. Il riferimento verrà salvato solo dopo aver caricato e confermato l’allenamento corretto.'));
      const names=[...new Set(Object.values(effectiveStudio.sheets||{}).flat().map(e=>e.name).filter(Boolean))];
      const list=document.createElement('datalist');list.id='pt-session-exercises';names.forEach(name=>list.append(new Option(name,name)));editor.append(list);
      draft.data.rows.forEach((row,index)=>{
        const wrap=document.createElement('fieldset');wrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';wrap.append(text('legend',`Serie ${index+1}`));
        for(const [field,label,max] of [['exercise','Esercizio',160],['load','Carico',40],['reps','Ripetizioni',40],['rir','RIR',20],['notes','Note della serie',1000]]){
          const labelEl=text('label',label);const input=document.createElement('input');input.value=row[field];if(field==='exercise' && names.includes(row.exercise))input.readOnly=true;input.maxLength=max;input.style.width=field==='exercise'?'190px':'120px';if(field==='exercise')input.setAttribute('list',list.id);
          input.oninput=()=>{row[field]=input.value;changed();};labelEl.append(input);wrap.append(labelEl);
        }
        if(index===0||draft.data.rows[index-1].exercise!==row.exercise)appendReference(wrap,handoff,row.exercise);
        const remove=text('button','Rimuovi serie');remove.type='button';remove.onclick=()=>{draft.data.rows.splice(index,1);changed();refresh();};wrap.append(remove);editor.append(wrap);
      });
      const add=text('button','Aggiungi serie');add.type='button';add.onclick=()=>{draft.data.rows.push({exercise:'',load:'',reps:'',rir:'',notes:''});changed();refresh();};editor.append(add);
      const noteLabel=text('label','Note della seduta e variazioni rispetto al programma');const notes=document.createElement('textarea');notes.style.width='100%';notes.value=draft.data.notes;notes.maxLength=4000;notes.oninput=()=>{draft.data.notes=notes.value;changed();};noteLabel.append(notes);editor.append(noteLabel);
      const status=text('p',draft.message||'Le bozze restano in questa pagina finché premi Salva.');status.setAttribute('role','status');
      const save=text('button','Salva registrazione');save.type='button';save.onclick=async()=>{
        if(busy)return;if(draft.selectionPending){status.textContent='Conferma il nuovo allenamento con Carica esercizi e serie.';return;}if(!draft.programId){status.textContent='Scegli un programma.';return;}
        busy=true;host.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);status.textContent='Salvataggio…';
        try{
          const result=await api.ptData('save_session_record',{appointmentId:appointment.id,clientId:client.id,programId:draft.programId,data:draft.data,version:draft.version,requestId:draft.requestId});
          if(result.conflict){draft.conflict=result.current;status.textContent='La registrazione è stata modificata da un’altra finestra. La tua bozza resta qui. Riapri il Portale per confrontarla con la versione salvata.';return;}
          if(!result.record)throw Error('Conferma di salvataggio mancante.');
          app.sessionRecords=[...(app.sessionRecords||[]).filter(r=>r.id!==result.record.id),result.record];draft.version=result.record.version;
          status.textContent='Registrazione salvata e tracciata nel registro attività.';
        }catch(e){status.textContent=e.message||'Salvataggio non riuscito. Riprova: la bozza è conservata.';}
        finally{draft.message=status.textContent;busy=false;render();}
      };editor.append(save,status);
      if(draft.conflict){const reload=text('button','Carica la versione salvata');reload.type='button';reload.onclick=()=>{
        if(!confirm('Sostituire questa bozza con la registrazione già salvata?'))return;
        const saved=draft.conflict;app.sessionRecords=[...(app.sessionRecords||[]).filter(r=>r.id!==saved.id),saved];drafts.delete(key);render();
      };editor.append(reload);}
    };picker.onchange=refresh;refresh();
    if(!showHistory)return;
    const history=document.createElement('details');history.append(text('summary','Storico delle sedute · Direzione'));
    for(const record of (app.sessionRecords||[]).filter(r=>r.cliente_id===client.id)){
      const op=(app.sessionOperators||app.operators||[]).find(o=>o.id===record.operator_id);history.append(text('h4',`${record.appointment_date || record.updated_at} ${record.appointment_time || ""} · ${record.operator_name || (op?`${op.nome||''} ${op.cognome||''}`:record.operator_id)}`));
      for(const row of record.data.rows)history.append(text('p',`${row.exercise} — carico ${row.load||'—'}, ripetizioni ${row.reps||'—'}, RIR ${row.rir||'—'}${row.notes?' · '+row.notes:''}`));
      if(record.data.notes)history.append(text('p',record.data.notes));
    }host.append(history);
  }
  return {render,renderHandoff:()=>{const api=ctx();if(api)renderHandoff(api,api.getApp(),api.selectedClient());},rowsForWorkout};
})();
window.PTSessionLog.render();
