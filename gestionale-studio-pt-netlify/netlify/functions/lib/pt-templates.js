const { supabaseRequest } = require('./pt-auth');
const text = (v, max = 2000) => typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '';
function invalid(message) { const error = new Error(message); error.statusCode = 400; throw error; }
function list(v, max = 100) {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max) invalid('Struttura del modello non valida o troppo grande.');
  return v;
}
const strings = v => list(v).map(x => text(x));
function record(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) invalid('Struttura del modello non valida.');
  return v;
}

// Explicit allowlist: never persist a client's identity, execution history or arbitrary extra fields.
function templateSnapshot(input, title) {
  if (JSON.stringify(input || {}).length > 500000) invalid('Il modello è troppo grande.');
  const weeks = list(input?.program?.weeks, 12);
  if (!weeks.length || weeks.some((w, i) => w !== i + 1)) invalid('Settimane del modello non valide.');
  let exerciseCount = 0;
  const days = list(input?.program?.days, 26).map((source, index) => {
    record(source);
    const key = `day-${index + 1}`;
    const ids = new Map();
    const exercisesByWeek = Object.fromEntries(weeks.map(week => [week,
      list(source.exercisesByWeek?.[week]).map(exercise => {
        record(exercise);
        if (!text(exercise.key)) invalid('Identificativo esercizio mancante.');
        if (!ids.has(exercise.key)) ids.set(exercise.key, `${key}-exercise-${ids.size + 1}`);
        const result = { key: ids.get(exercise.key) };
        for (const field of ['name','sets','reps','rir','rest','note','progressionBase','techniqueId','techniqueName','techniqueNote','canonicalExerciseId','role','progressionId','progressionName']) result[field] = text(exercise[field]);
        result.prescriptionMode = exercise.structuredPrescription ? 'structured' : 'manual';
        if (Number.isFinite(exercise.realSetCount)) result.realSetCount = Math.min(100, Math.max(0, exercise.realSetCount));
        if (exercise.structuredPrescription) result.structuredPrescription = {
          setGroups: list(exercise.structuredPrescription.setGroups).map(record).map(group => ({
            kind: ['working','top_set','back_off','accessory'].includes(group.kind) ? group.kind : 'working',
            sets: Math.min(100, Math.max(0, Number(group.sets) || 0)), reps: text(group.reps), intensity: text(group.intensity),
          })),
          adjustableDimensions: list(exercise.structuredPrescription.adjustableDimensions).filter(x=>['working_sets','accessory_sets','recovery'].includes(x)),
        };
        if (result.name) exerciseCount++;
        return result;
      })
    ]));
    const groupsByWeek = Object.fromEntries(weeks.map(week => [week,
      list(source.groupsByWeek?.[week]).map(record).map((group, i) => ({
        key: `${key}-group-${week}-${i + 1}`,
        type: ['superset','triple_set','giant_set','circuit'].includes(group.type) ? group.type : 'superset',
        exerciseKeys: [...new Set(list(group.exerciseKeys).map(k=>ids.get(k)).filter(k=>exercisesByWeek[week].some(e=>e.key===k)))],
        restBetweenRounds: text(group.restBetweenRounds), rounds: text(group.rounds), note: text(group.note),
      })).filter(g=>g.exerciseKeys.length>1)
    ]));
    return {
      key, letter: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index], name: text(source.name, 120),
      generalWarmup: strings(source.generalWarmup), notes: strings(source.notes),
      preparation: list(source.preparation).map(record).map((p,i)=>({key:`${key}-prep-${i}`,name:text(p.name),setsReps:text(p.setsReps),cue:text(p.cue)})),
      rampUp: list(source.rampUp).map(record).map((p,i)=>({key:`${key}-ramp-${i}`,exercise:text(p.exercise),steps:strings(p.steps)})),
      exercisesByWeek, groupsByWeek,
    };
  });
  if (!days.length || !exerciseCount) invalid('Aggiungi almeno un esercizio prima di salvare il modello.');
  const settings = Object.fromEntries(['goal','level','frequency','warmup'].map(key => [key, text(input.program.settings?.[key])]));
  return {format:'neacea-program-editor-v1',program:{sourceId:'shared-template',title, settings,weeks,days}};
}

async function listTemplates() {
  const rows=[];
  for(let offset=0;;offset+=100){
    const page=await supabaseRequest('pt_program_templates',`?select=*&archived_at=is.null&order=created_at.desc,id.asc&limit=100&offset=${offset}`);
    rows.push(...page);if(page.length<100)return rows;
  }
}
async function listArchivedTemplates() {
  const rows=[];
  for(let offset=0;;offset+=100){
    const page=await supabaseRequest('pt_program_templates',`?select=*&archived_at=not.is.null&order=archived_at.desc,id.asc&limit=100&offset=${offset}`);
    rows.push(...page);if(page.length<100)return rows;
  }
}
async function saveTemplate(operator, input) {
  const title=text(input.title,120), description=text(input.description,1000);
  if(!title)invalid('Inserisci un nome per il modello.');
  if(!/^[a-zA-Z0-9_-]{10,120}$/.test(input.templateId||''))invalid('Identificativo modello non valido.');
  const snapshot=templateSnapshot(input.snapshot,title);
  const folder_id=await validFolder(input.folderId);
  const row={id:input.templateId,title,description,snapshot,folder_id,created_by:operator.id,created_by_name:[operator.nome,operator.cognome].filter(Boolean).join(' ')};
  const result=await supabaseRequest('pt_program_templates','?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:row});
  if(result?.[0])return result[0];
  const existing=await supabaseRequest('pt_program_templates',`?select=*&id=eq.${encodeURIComponent(row.id)}&limit=1`);
  const saved=existing?.[0];
  if(saved?.created_by===operator.id && !saved.archived_at && saved.title===title && saved.description===description &&
    (saved.folder_id || null)===folder_id && JSON.stringify(templateSnapshot(saved.snapshot,title))===JSON.stringify(snapshot))return saved;
  const error=new Error('Questo identificativo è già in uso. Riapri il salvataggio del modello.');error.statusCode=409;throw error;
}
function fail(message,statusCode=400) { throw Object.assign(new Error(message),{statusCode}); }
function assertOwn(operator,row) {
  if(!row)fail('Elemento non trovato.',404);
  if(row.created_by!==operator.id && operator.accessLevel!=='owner')fail('Puoi modificare soltanto elementi creati da te. La Direzione può gestire tutto l’archivio.',403);
}
async function getRow(table,id) {
  return (await supabaseRequest(table,`?select=*&id=eq.${encodeURIComponent(text(id,120))}&limit=1`))?.[0];
}
async function validFolder(id) {
  if(!id)return null;
  const row=await getRow('pt_program_folders',id);
  if(!row)fail('La cartella non esiste più. Aggiorna l’archivio e scegli una cartella.',409);
  return row.id;
}
async function listFolders() {
  const rows=[];
  for(let offset=0;;offset+=100){
    const page=await supabaseRequest('pt_program_folders',`?select=*&order=name.asc,id.asc&limit=100&offset=${offset}`);
    rows.push(...page);if(page.length<100)return rows;
  }
}
async function saveFolder(operator,input) {
  const name=text(input.name,120), id=text(input.folderId,120);
  if(!name || !/^[a-zA-Z0-9_-]{10,120}$/.test(id))invalid('Inserisci un nome valido per la cartella.');
  if(input.expectedUpdatedAt) {
    const existing=await getRow('pt_program_folders',id);assertOwn(operator,existing);
    const result=await supabaseRequest('pt_program_folders',`?id=eq.${encodeURIComponent(id)}&updated_at=eq.${encodeURIComponent(input.expectedUpdatedAt)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{name}});
    if(!result?.[0])fail('La cartella è cambiata. Aggiorna e riprova.',409);
    return result[0];
  }
  const parent_id=await validFolder(input.parentId);
  const row={id,name,parent_id,created_by:operator.id};
  const result=await supabaseRequest('pt_program_folders','?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:row});
  if(result?.[0])return result[0];
  const existing=await getRow('pt_program_folders',id);assertOwn(operator,existing);
  return existing;
}
async function deleteFolder(operator,input) {
  const row=await getRow('pt_program_folders',input.folderId);
  if(!row)return input.folderId; // Retry after a lost successful response.
  assertOwn(operator,row);
  if(!input.expectedUpdatedAt)invalid('Aggiorna la cartella prima di eliminarla.');
  const result=await supabaseRequest('pt_program_folders',`?id=eq.${encodeURIComponent(row.id)}&updated_at=eq.${encodeURIComponent(input.expectedUpdatedAt)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
  if(!result?.[0])fail('La cartella è cambiata. Aggiorna e riprova.',409);
  return row.id;
}
async function updateTemplate(operator,input) {
  const row=await getRow('pt_program_templates',input.templateId);assertOwn(operator,row);
  if(row.archived_at)fail('Programma eliminato dall’archivio. Salva una nuova copia.',409);
  const requestId=text(input.requestId,120);
  if(!requestId || !input.expectedUpdatedAt)invalid('Versione del programma mancante. Riapri l’archivio.');
  if(row.last_request_id===requestId)return row;
  const title=text(input.title,120);if(!title)invalid('Inserisci un nome per il programma.');
  const snapshot=templateSnapshot(input.snapshot || row.snapshot,title);
  const folder_id=await validFolder(input.folderId);
  const result=await supabaseRequest('pt_program_templates',`?id=eq.${encodeURIComponent(row.id)}&archived_at=is.null&updated_at=eq.${encodeURIComponent(input.expectedUpdatedAt)}`,{
    method:'PATCH',headers:{Prefer:'return=representation'},body:{title,description:text(input.description ?? row.description,1000),snapshot,folder_id,last_request_id:requestId}
  });
  if(!result?.[0])fail('Questo programma è cambiato in un’altra finestra. Le modifiche non sono state sovrascritte: chiudi e riapri il programma aggiornato, oppure salva la tua bozza come nuova copia.',409);
  return result[0];
}
async function archiveTemplate(operator,input) {
  const templateId=text(input.templateId,120);
  const rows=await supabaseRequest('pt_program_templates',`?select=*&id=eq.${encodeURIComponent(templateId)}&limit=1`);
  const row=rows?.[0];
  if(!row){const error=new Error('Modello non trovato.');error.statusCode=404;throw error;}
  if(row.created_by!==operator.id && operator.accessLevel!=='owner'){const error=new Error('Puoi ritirare soltanto i modelli creati da te.');error.statusCode=403;throw error;}
  if (input.restore === true) {
    if (!row.archived_at) return templateId;
    const result = await supabaseRequest('pt_program_templates',`?id=eq.${encodeURIComponent(templateId)}${input.expectedUpdatedAt ? `&updated_at=eq.${encodeURIComponent(input.expectedUpdatedAt)}` : ''}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{archived_at:null}});
    if (input.expectedUpdatedAt && !result?.[0]) fail('Programma cambiato: aggiorna il cestino prima di ripristinarlo.',409);
    return templateId;
  }
  if(row.archived_at)return templateId;
  const version=input.expectedUpdatedAt?`&updated_at=eq.${encodeURIComponent(input.expectedUpdatedAt)}`:'';
  const result=await supabaseRequest('pt_program_templates',`?id=eq.${encodeURIComponent(templateId)}${version}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{archived_at:new Date().toISOString()}});
  if(version && !result?.[0])fail('Programma cambiato: aggiorna l’archivio prima di eliminarlo.',409);
  return templateId;
}
async function purgeArchivedTemplates(operator) {
  const rows = await listArchivedTemplates();
  const allowed = rows.filter(row => row.created_by === operator.id || operator.accessLevel === 'owner');
  for (const row of allowed) {
    await supabaseRequest('pt_program_templates', `?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }
  return allowed.length;
}
module.exports={templateSnapshot,listTemplates,listArchivedTemplates,saveTemplate,archiveTemplate,purgeArchivedTemplates,listFolders,saveFolder,deleteFolder,updateTemplate};
