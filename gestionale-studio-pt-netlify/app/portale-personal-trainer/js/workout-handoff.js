/* Saved performance only. Never treat the prescription or an unsaved draft as a completed workout. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PTWorkoutHandoff=api;})(typeof window==='object'?window:globalThis,function(){
  const nameKey=value=>String(value||'').trim().toLocaleLowerCase('it');
  const dateKey=value=>String(value||'').slice(0,10);
  function build(studio={},records=[],programId='',ownerName=''){
    const order=studio.sheetOrder||Object.keys(studio.sheets||{}),weeks=studio.sessions?.length||0;
    const events=[];
    for(const sheet of order)for(let week=0;week<weeks;week++){
      const entry=studio.workoutSessions?.[sheet]?.[week]||{};
      const recordedDate=studio.workoutDates?.[sheet]?.[week]||'';
      const rows=(studio.sheets?.[sheet]||[]).filter(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1)).flatMap(e=>(e.weekSets?.[week]||[]).map(s=>({exercise:e.name,load:String(s.load||''),reps:String(s.reps||''),rir:String(s.rir||''),notes:String(s.sessionNote||'')})));
      // Legacy loads with an explicit date remain usable references, but do not imply completion.
      if(entry.completedAt || (recordedDate && rows.some(r=>r.load.trim())))events.push({sheet,week,date:dateKey(recordedDate||entry.completedAt),savedAt:entry.completedAt||'',complete:!!entry.completedAt,operator:ownerName,notes:entry.notes||'',rows});
    }
    for(const record of records.filter(r=>r.program_id===programId)){
      const w=record.data?.workout;
      const valid=w&&order.includes(w.sheet)&&Number.isInteger(w.week)&&w.week>=0&&w.week<weeks;
      events.push({sheet:valid?w.sheet:null,week:valid?w.week:null,date:dateKey(record.appointment_date||record.updated_at),savedAt:record.updated_at||'',complete:true,operator:record.operator_name||'',notes:record.data?.notes||'',rows:record.data?.rows||[]});
    }
    events.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.savedAt||'').localeCompare(a.savedAt||''));
    const last=events.find(e=>e.complete)||null,completed=[...new Set(events.filter(e=>e.complete&&e.sheet!=null).map(e=>`${e.sheet}:${e.week}`))];
    const slots=[];for(let week=0;week<weeks;week++)for(const sheet of order){if((studio.sheets?.[sheet]||[]).some(e=>!e.coachingActiveWeeks||e.coachingActiveWeeks.includes(week+1)))slots.push({sheet,week});}
    const lastIndex=last?.sheet!=null?slots.findIndex(s=>s.sheet===last.sheet&&s.week===last.week):-1;
    const next=last&&last.sheet==null?null:slots.slice(lastIndex+1).find(s=>!completed.includes(`${s.sheet}:${s.week}`))||null;
    const loads={};for(const event of events){const grouped={};for(const row of event.rows){if(!String(row.load||'').trim())continue;const key=nameKey(row.exercise);(grouped[key]||=[]).push({...row});}for(const [key,rows]of Object.entries(grouped))if(!loads[key])loads[key]={date:event.date,savedAt:event.savedAt,sheet:event.sheet,week:event.week,operator:event.operator,rows};}
    return {last:last?{...last,rows:undefined}:null,next,completed,loads};
  }
  function merge(base,local){
    if(!base)return local;if(!local)return base;
    const newer=(a,b)=>!b||a&&((a.date||'')>(b.date||'')||a.date===b.date&&(a.savedAt||'')>(b.savedAt||''));
    const loads={...base.loads};for(const[k,v]of Object.entries(local.loads||{}))if(!loads[k]||newer(v,loads[k]))loads[k]=v;
    return {...(newer(local.last,base.last)?local:base),completed:[...new Set([...(base.completed||[]),...(local.completed||[])])],loads};
  }
  return {build,merge,nameKey};
});
