/* Operational records are scoped to appointment + client + author, never to the whole program. */
window.PTSessionLog = (() => {
  const drafts = new Map();
  let host, currentKey='', busy=false;
  const ctx=()=>window.PTSessionContext;
  const empty=()=>({rows:[],notes:''});
  const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
  function render(){
    const api=ctx();if(!api)return;
    const app=api.getApp(),client=api.selectedClient();
    if(!host){host=document.createElement('section');host.className='card';host.style.margin='16px 0';document.getElementById('clientsView').append(host);}
    host.hidden=!app.sessionLogEnabled || !client;
    if(host.hidden || busy)return;
    host.replaceChildren(text('h3',app.sessionHistoryVisible ? 'Registro sedute — carichi e ripetizioni' : 'Compila la tua seduta'));
    host.append(text('p','Scegli una tua seduta e registra una riga per ogni serie svolta. Il programma generale rimane invariato.'));
    const sessions=(app.assignedSessions||[]).filter(s=>s.client_ids?.includes(client.id)).sort((a,b)=>(b.date+b.start_time).localeCompare(a.date+a.start_time));
    const picker=document.createElement('select');picker.setAttribute('aria-label','Seduta da registrare');picker.append(new Option('Scegli una seduta',''));
    for(const s of sessions)picker.append(new Option(`${s.date} · ${String(s.start_time).slice(0,5)} · ${s.status}`,s.id));
    const previous=currentKey.split('|');if(previous[0]===client.id)picker.value=previous[1]||'';
    host.append(picker);const editor=document.createElement('div');host.append(editor);
    const refresh=()=>{
      editor.replaceChildren();const appointment=sessions.find(s=>s.id===picker.value);if(!appointment)return;
      const key=`${client.id}|${appointment.id}|${app.currentPt.id}`;currentKey=key;
      const record=(app.sessionRecords||[]).find(r=>r.cliente_id===client.id&&r.appointment_id===appointment.id&&r.operator_id===app.currentPt.id);
      if(!drafts.has(key))drafts.set(key,{data:structuredClone(record?.data||empty()),programId:record?.program_id||app.currentPrograms?.[client.id]||'',version:record?.version||0,requestId:crypto.randomUUID()});
      const draft=drafts.get(key);
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(appointment.date>today){editor.append(text('p','Potrai registrare i risultati dal giorno della seduta.'));return;}
      const programs=(app.programs||[]).filter(p=>p.cliente_id===client.id||p.client_id===client.id||p.data?.cliente_id===client.id||p.data?.client_id===client.id);
      const program=document.createElement('select');program.setAttribute('aria-label','Programma della seduta');program.append(new Option('Scegli il programma',''));
      for(const p of programs)program.append(new Option(p.data?.name||p.data?.nome||p.name||p.id,p.rowId||p.id));program.value=draft.programId;
      const changed=()=>{draft.requestId=crypto.randomUUID();draft.message='Modifiche da salvare.';status.textContent=draft.message;};
      program.onchange=()=>{draft.programId=program.value;changed();refresh();};editor.append(program);
      const source=programs.find(p=>(p.rowId||p.id)===draft.programId);const studio=source?.data?.pt_studio_state||source?.data?.studio_state||{};
      const names=[...new Set(Object.values(studio.sheets||{}).flat().map(e=>e.name).filter(Boolean))];
      const list=document.createElement('datalist');list.id='pt-session-exercises';names.forEach(name=>list.append(new Option(name,name)));editor.append(list);
      draft.data.rows.forEach((row,index)=>{
        const wrap=document.createElement('fieldset');wrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:12px 0';wrap.append(text('legend',`Serie ${index+1}`));
        for(const [field,label,max] of [['exercise','Esercizio',160],['load','Carico',40],['reps','Ripetizioni',40],['rir','RIR',20],['notes','Note della serie',1000]]){
          const labelEl=text('label',label);const input=document.createElement('input');input.value=row[field];input.maxLength=max;input.style.width=field==='exercise'?'190px':'120px';if(field==='exercise')input.setAttribute('list',list.id);
          input.oninput=()=>{row[field]=input.value;changed();};labelEl.append(input);wrap.append(labelEl);
        }
        const remove=text('button','Rimuovi serie');remove.type='button';remove.onclick=()=>{draft.data.rows.splice(index,1);changed();refresh();};wrap.append(remove);editor.append(wrap);
      });
      const add=text('button','Aggiungi serie');add.type='button';add.onclick=()=>{draft.data.rows.push({exercise:'',load:'',reps:'',rir:'',notes:''});changed();refresh();};editor.append(add);
      const noteLabel=text('label','Note della seduta');const notes=document.createElement('textarea');notes.style.width='100%';notes.value=draft.data.notes;notes.maxLength=4000;notes.oninput=()=>{draft.data.notes=notes.value;changed();};noteLabel.append(notes);editor.append(noteLabel);
      const status=text('p',draft.message||'Le bozze restano in questa pagina finché premi Salva.');status.setAttribute('role','status');
      const save=text('button','Salva registrazione');save.type='button';save.onclick=async()=>{
        if(busy)return;if(!draft.programId){status.textContent='Scegli un programma.';return;}
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
    if(!app.sessionHistoryVisible)return;
    const history=document.createElement('details');history.append(text('summary','Storico delle sedute · Direzione'));
    for(const record of (app.sessionRecords||[]).filter(r=>r.cliente_id===client.id)){
      const op=(app.sessionOperators||app.operators||[]).find(o=>o.id===record.operator_id);history.append(text('h4',`${record.appointment_date || record.updated_at} ${record.appointment_time || ""} · ${record.operator_name || (op?`${op.nome||''} ${op.cognome||''}`:record.operator_id)}`));
      for(const row of record.data.rows)history.append(text('p',`${row.exercise} — carico ${row.load||'—'}, ripetizioni ${row.reps||'—'}, RIR ${row.rir||'—'}${row.notes?' · '+row.notes:''}`));
      if(record.data.notes)history.append(text('p',record.data.notes));
    }host.append(history);
  }
  return {render};
})();
window.PTSessionLog.render();
