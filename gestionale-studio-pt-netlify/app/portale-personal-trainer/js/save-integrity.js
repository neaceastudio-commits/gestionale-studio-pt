/* The same content comparison is used before accepting a retry and its acknowledgement. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PTSaveIntegrity=api;})(typeof window==='object'?window:globalThis,function(){
  function canonical(value){
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  function programContent(data){
    // Match the server's documented defaults, including retries of legacy payloads.
    // Performance fields and archived=true still require an exact match.
    return {...Object.fromEntries(['name','period','goal','level','frequency','warmup','status','pt_studio_state','sessions','matrix'].filter(k=>data?.[k]!==undefined).map(k=>[k,data[k]])),
      archived:data?.archived===true,schema_version:Math.max(8,Number(data?.schema_version)||0)};
  }
  const sameProgram=(a,b)=>canonical(programContent(a))===canonical(programContent(b));
  function templateContent(snapshot){
    const str=value=>String(value??'').trim().slice(0,2000),p=snapshot?.program||{};
    return {settings:Object.fromEntries(['goal','level','frequency','warmup','studioNotes'].map(k=>[k,str(p.settings?.[k])])),weeks:p.weeks,
      days:(p.days||[]).map(day=>{
        const identities=new Map();Object.values(day.exercisesByWeek||{}).flat().forEach(e=>{if(!identities.has(e.key))identities.set(e.key,identities.size);});
        return {name:str(day.name),generalWarmup:(day.generalWarmup||[]).map(str),notes:(day.notes||[]).map(str),
          preparation:(day.preparation||[]).map(e=>[str(e.name),str(e.setsReps),str(e.cue)]),rampUp:(day.rampUp||[]).map(e=>[str(e.exercise),(e.steps||[]).map(str)]),
          exercisesByWeek:Object.fromEntries((p.weeks||[]).map(w=>[w,(day.exercisesByWeek?.[w]||[]).map(e=>({identity:identities.get(e.key),...Object.fromEntries(['name','sets','reps','rir','rest','note','progressionBase','techniqueId','techniqueName','techniqueNote','canonicalExerciseId','role','progressionId','progressionName'].map(k=>[k,str(e[k])])),structuredPrescription:e.structuredPrescription,realSetCount:e.realSetCount}) )])),
          groupsByWeek:Object.fromEntries((p.weeks||[]).map(w=>[w,(day.groupsByWeek?.[w]||[]).map(g=>({type:g.type,exerciseKeys:g.exerciseKeys.map(k=>identities.get(k)),restBetweenRounds:str(g.restBetweenRounds),rounds:str(g.rounds),note:str(g.note)}))]))};
      })};
  }
  const sameTemplate=(a,b)=>canonical(templateContent(a))===canonical(templateContent(b));
  const stores=[()=>localStorage,()=>sessionStorage];
  function readDraft(key){const copies=[];for(const store of [...stores].reverse())try{const row=JSON.parse(store().getItem(key));if(row)copies.push(row);}catch(_){}return copies.sort((a,b)=>(b.storedAt||0)-(a.storedAt||0))[0]?.value||null;}
  function writeDraft(key,value){const raw=JSON.stringify({storedAt:Date.now(),value});for(let i=0;i<stores.length;i++)try{stores[i]().setItem(key,raw);if(i===0)try{sessionStorage.removeItem(key);}catch(_){}return true;}catch(_){}return false;}
  function removeDraft(key){for(const store of stores)try{store().removeItem(key);}catch(_){}}
  return {canonical,sameProgram,sameTemplate,readDraft,writeDraft,removeDraft};
});
