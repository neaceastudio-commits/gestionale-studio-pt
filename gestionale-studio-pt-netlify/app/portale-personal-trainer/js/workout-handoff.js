/* Saved performance only. Never treat the prescription or an unsaved draft as a completed workout. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PTWorkoutHandoff=api;})(typeof window==='object'?window:globalThis,function(){
  const nameKey=value=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('it');
  const dateKey=value=>String(value||'').slice(0,10);
  function build(studio={},records=[],programId='',ownerName='',clientPrograms=[]){
    const order=studio.sheetOrder||Object.keys(studio.sheets||{}),weeks=studio.sessions?.length||0;
    const events=[];
    for(const sheet of order)for(let week=0;week<weeks;week++){
      const entry=studio.workoutSessions?.[sheet]?.[week]||{};
      const recordedDate=studio.workoutDates?.[sheet]?.[week]||'';
      const rows=(studio.sheets?.[sheet]||[]).filter(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1)).flatMap(e=>(e.weekSets?.[week]||[]).map(s=>({exercise:e.name,load:String(s.load??''),reps:String(s.reps||''),rir:String(s.rir??''),notes:String(s.sessionNote||'')})));
      // Legacy loads with an explicit date remain usable references, but do not imply completion.
      if(entry.completedAt || (recordedDate && (String(entry.notes||'').trim() || rows.some(r=>r.load.trim() || r.rir.trim() || r.notes.trim()) || (studio.sheets?.[sheet]||[]).some(e=>e.weekSets?.[week]?.some(s=>s.recorded)))))events.push({id:`program:${programId}:${sheet}:${week}`,programId,sheet,week,date:dateKey(recordedDate||entry.completedAt),savedAt:studio.lastSavedAt||entry.completedAt||'',complete:!!entry.completedAt,recorded:true,operator:ownerName,notes:entry.notes||'',rows});
    }
    for(const record of records.filter(r=>r.program_id===programId)){
      const w=record.data?.workout;
      const valid=w&&order.includes(w.sheet)&&Number.isInteger(w.week)&&w.week>=0&&w.week<weeks;
      events.push({id:record.id?`session:${record.id}`:`session:${record.appointment_id}:${record.operator_id}`,appointmentId:record.appointment_id,programId,sheet:valid?w.sheet:null,week:valid?w.week:null,date:dateKey(record.appointment_date||record.updated_at),savedAt:record.updated_at||'',complete:record.data?.status!=='draft',recorded:record.data?.status!=='draft'||Boolean(String(record.data?.notes||'').trim()||(record.data?.rows||[]).some(row=>['load','rir','notes'].some(key=>String(row[key]??'').trim()))),operator:record.operator_name||'',notes:record.data?.notes||'',rows:record.data?.rows||[]});
    }
    events.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.savedAt||'').localeCompare(a.savedAt||''));
    const last=events.find(e=>e.complete)||null,completed=[...new Set(events.filter(e=>e.complete&&e.sheet!=null).map(e=>`${e.sheet}:${e.week}`))];
    const slots=[];for(let week=0;week<weeks;week++)for(const sheet of order){if((studio.sheets?.[sheet]||[]).some(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1)))slots.push({sheet,week});}
    // Autosave protects partial results; only explicit completion advances a slot.
    const lastRecorded=events.find(event=>event.recorded)||last;
    const latest=lastRecorded;
    const next=lastRecorded&&lastRecorded.sheet==null?null:slots.find(s=>!completed.includes(`${s.sheet}:${s.week}`))||null;
    const loadHistory={};
    for(const event of events){
      const grouped={};
      for(const row of event.rows){const key=nameKey(row.exercise);if(key)(grouped[key]||=[]).push({...row});}
      // Preserve the series positions and empty values. Filtering empty loads used
      // to turn the third recorded series into "Serie 1" and hide missing series.
      for(const [key,rows] of Object.entries(grouped))if(rows.some(row=>String(row.load??'').trim()))
        (loadHistory[key]||=[]).push({id:event.id,appointmentId:event.appointmentId,programId,date:event.date,savedAt:event.savedAt,sheet:event.sheet,week:event.week,operator:event.operator,complete:event.complete,rows});
    }
    for(const previous of clientPrograms){
      const previousId=previous.rowId||previous.id;if(previousId===programId)continue;
      const previousStudio=previous.data?.pt_studio_state||previous.data?.studio_state||{};
      const history=build(previousStudio,records,previousId,ownerName).loadHistory;
      for(const [key,entries] of Object.entries(history)) (loadHistory[key]||=[]).push(...entries.map(entry=>({...entry,otherProgram:true})));
    }
    for(const entries of Object.values(loadHistory))entries.sort(compare);
    const loads=Object.fromEntries(Object.entries(loadHistory).map(([key,entries])=>[key,entries[0]]));
    return {slots,lastRecorded,latestActivity:latest?{date:latest.date,savedAt:latest.savedAt}:null,completedRecordIds:events.filter(e=>e.complete).map(e=>e.id),inProgress:events.filter(e=>!e.complete).map(e=>({...e,rows:e.rows.map(r=>({...r}))})),last:last?{...last,rows:last.rows.map(row=>({...row}))}:null,next,completed,loads,loadHistory};
  }
  const compare=(a,b)=>(b.date||'').localeCompare(a.date||'')||(b.savedAt||'').localeCompare(a.savedAt||'');
  function reference(handoff,exercise,exclude){
    const key=nameKey(exercise),entries=handoff?.loadHistory?.[key]||[handoff?.loads?.[key]].filter(Boolean);
    const eligible=entries.filter(entry=>{
      if(!exclude)return true;
      if(exclude.date && (!entry.date || entry.date>exclude.date))return false;
      if(exclude.appointmentId)return entry.appointmentId!==exclude.appointmentId && (!exclude.date || entry.date<=exclude.date);
      return entry.programId!==exclude.programId || (entry.week<=exclude.week && (entry.sheet!==exclude.sheet || entry.week!==exclude.week));
    });
    return eligible[0]||null;
  }
  function merge(base,local){
    if(!base)return local;if(!local)return base;
    const newer=(a,b)=>!b||a&&((a.date||'')>(b.date||'')||a.date===b.date&&(a.savedAt||'')>(b.savedAt||''));
    const loadHistory={};
    for(const source of [base,local])for(const [key,entries] of Object.entries(source.loadHistory||{})){
      const byId=new Map((loadHistory[key]||[]).map(entry=>[entry.id,entry]));
      for(const entry of entries)if(!byId.has(entry.id)||newer(entry,byId.get(entry.id)))byId.set(entry.id,entry);
      loadHistory[key]=[...byId.values()].sort(compare);
    }
    const loads={...base.loads};for(const[k,v]of Object.entries(local.loads||{}))if(!loads[k]||newer(v,loads[k]))loads[k]=v;
    const completedRecordIds=[...new Set([...(base.completedRecordIds||[]),...(local.completedRecordIds||[])])];
    const pending=new Map();
    for(const event of [...(base.inProgress||[]),...(local.inProgress||[])]){
      if(!completedRecordIds.includes(event.id)&&(!pending.has(event.id)||newer(event,pending.get(event.id))))pending.set(event.id,event);
    }
    const inProgress=[...pending.values()].sort((a,b)=>(b.savedAt||'').localeCompare(a.savedAt||''));
    const chosen=newer(local.latestActivity||local.last,base.latestActivity||base.last)?local:base;
    const completed=[...new Set([...(base.completed||[]),...(local.completed||[])])];
    const slots=local.slots||base.slots;
    const next=chosen.lastRecorded?.sheet===null?null:slots?slots.find(s=>!completed.includes(`${s.sheet}:${s.week}`))||null:chosen.next;
    return {...chosen,slots,next,inProgress,completedRecordIds,completed,loads,loadHistory};
  }
  return {build,merge,reference,nameKey};
});
