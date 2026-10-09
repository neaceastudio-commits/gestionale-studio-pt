const assert = require('node:assert/strict');
const { test } = require('node:test');
const auth = require('../netlify/functions/lib/pt-auth');
const rows = new Map();
let operator = {id:'pt-one',nome:'PT',cognome:'Uno',accessLevel:'pt'};
let offsetPages = false;
auth.authenticatedOperator = async token => token === 'test-token' ? operator : null;
auth.supabaseRequest = async (table, query, options = {}) => {
  const params = new URLSearchParams(query), key = params.get('id')?.slice(3);
  if (table === 'schede_allenamento') return key === 'missing' ? [] : [{id:key, cliente_id:key === 'foreign' ? 'other-client' : 'own-client'}];
  if (table === 'clients') return [{id:key, pt_assegnato:key === 'own-client' ? 'pt-one' : 'pt-two'}];
  if (table === 'pt_program_folders') return [];
  assert.equal(table, 'pt_program_templates');
  if (options.method === 'POST') { if (rows.has(options.body.id)) return []; const row = structuredClone(options.body); rows.set(row.id,row); return [row]; }
  if (options.method === 'PATCH') { Object.assign(rows.get(key),options.body); return null; }
  if (key) return rows.has(key) ? [rows.get(key)] : [];
  if (offsetPages) return Array.from({length:params.get('offset')==='0'?100:1},()=>({id:'page-item'}));
  return [...rows.values()].filter(row=>!row.archived_at);
};
const { templateSnapshot, listTemplates } = require('../netlify/functions/lib/pt-templates');
const { handler, _test } = require('../netlify/functions/pt-data');
const fixture = () => ({format:'neacea-program-editor-v1',patient:'PRIVATE_CANARY',program:{sourceId:'PRIVATE_CANARY',weeks:[1,2],days:[{
  key:'PRIVATE_CANARY',letter:'A',name:'Forza',notes:['Indicazioni generali'],generalWarmup:['Cyclette'],
  preparation:[{key:'private',name:'Mobilità',setsReps:'2 x 8',cue:'Controllo'}],rampUp:[{key:'private',exercise:'Squat',steps:['20 kg × 8']}],
  exercisesByWeek:Object.fromEntries([1,2].map(w=>[w,[{key:'one',name:'Squat',sets:'3',reps:String(7+w),rir:'2',rest:'90 sec',note:'Tecnica',sessionNote:'PRIVATE_CANARY',load:'PRIVATE_CANARY',techniqueId:'tempo',techniqueNote:'Lento',structuredPrescription:{setGroups:[{kind:'working',sets:3,reps:'8',intensity:'RIR 2',secret:'PRIVATE_CANARY'}],adjustableDimensions:['working_sets']}},{key:'two',name:'Rematore',sets:'2',reps:'10'}]])),
  groupsByWeek:{1:[{key:'private',type:'superset',exerciseKeys:['one','two','one'],rounds:'3',restBetweenRounds:'90 sec',note:'Alternare'}],2:[]},
}]}});
const call = async (action, extra={}, token='test-token') => { const result=await handler({httpMethod:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({action,...extra})}); return {status:result.statusCode,body:JSON.parse(result.body)}; };
test('shared templates: sanitization, authorization, idempotence, withdrawal and pagination', async () => {
  const source=fixture(), clean=templateSnapshot(source,'Forza base');
  source.program.settings={goal:'Forza',level:'Avanzato',frequency:'3 sedute',warmup:'7 minuti cyclette',clientId:'PRIVATE_CANARY',generalNotes:'PRIVATE_CANARY'};
  const settings=templateSnapshot(source,'Forza base').program.settings;
  assert.deepEqual(settings,{goal:'Forza',level:'Avanzato',frequency:'3 sedute',warmup:'7 minuti cyclette'});
  assert.equal(JSON.stringify(clean).includes('PRIVATE_CANARY'),false);
  assert.equal(source.program.days[0].key,'PRIVATE_CANARY');
  assert.equal(clean.program.days[0].exercisesByWeek[2][0].reps,'9');
  assert.equal(clean.program.days[0].exercisesByWeek[1][0].structuredPrescription.setGroups[0].intensity,'RIR 2');
  assert.deepEqual(clean.program.days[0].groupsByWeek[1][0].exerciseKeys,['day-1-exercise-1','day-1-exercise-2']);
  for(const value of [{}, {program:{weeks:[0],days:[]}}, {program:{weeks:[1],days:[null]}}])assert.throws(()=>templateSnapshot(value,'Name'),e=>e.statusCode===400);
  assert.equal((await call('list_templates',{},'invalid')).status,401);
  const payload={templateId:'template-test-0001',programId:'own',title:'Forza base',snapshot:source};
  assert.equal((await call('save_template',{...payload,programId:'foreign'})).status,403);
  assert.equal((await call('save_template',{...payload,programId:'missing'})).status,404);
  assert.equal((await call('save_template',payload)).status,200);
  assert.equal((await call('save_template',payload)).status,200);assert.equal(rows.size,1);
  assert.equal((await call('save_template',{...payload,title:'  '})).status,400);
  operator={id:'pt-two',accessLevel:'pt'};
  assert.equal((await call('list_templates')).body.templates.length,1);
  assert.equal((await call('archive_template',{templateId:payload.templateId})).status,403);
  operator={id:'owner',accessLevel:'owner'};
  assert.equal((await call('archive_template',{templateId:payload.templateId})).status,200);
  assert.equal((await call('list_templates')).body.templates.length,0);assert.ok(rows.get(payload.templateId).archived_at);
  offsetPages=true;assert.equal((await listTemplates()).length,101);offsetPages=false;
});
test('prescribed RIR in a new template does not create fake session history',()=>{
  const s={sessions:['Week 1'],sheetOrder:['A'],sheets:{A:[{id:'one',weekSets:[[{id:'s',reps:'8',rir:'2'}]]}]},workoutDates:{A:['']},coachingEditorSnapshot:templateSnapshot(fixture(),'Test')};
  s.coachingEditorSnapshot.program.days[0].exercisesByWeek[1][0].key='one';
  const history=()=>_test.buildLoadRows('new','client',{pt_studio_state:s},'2026-09-17T10:00:00Z','pt-one');
  assert.equal(history().length,0);
  s.workoutDates.A[0]='2026-09-17';assert.equal(history().length,1);
  s.workoutDates.A[0]='';s.sheets.A[0].weekSets[0][0].load='20';assert.equal(history().length,1);
});
