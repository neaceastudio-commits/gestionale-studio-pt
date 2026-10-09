const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/index.html'),'utf8');
function extract(start,end){const a=html.indexOf('    '+start),b=html.indexOf('    '+end,a);assert.ok(a>=0&&b>a);return html.slice(a,b);}
function fixture(){
 const state={currentSheet:'A',activeWeekIndex:0,sessions:['Settimana 1','Settimana 2'],sheets:{A:[{weekSets:[[{reps:'8',load:'40'}],[]]}],B:[{weekSets:[[{reps:'8',load:''}],[]]}]}},button={disabled:false};
 const c=vm.createContext({state,appState:{selectedProgramId:'p',programs:[{id:'p',data:{pt_studio_state:{}}}]},Date,canEditClient:()=>true,document:{getElementById:()=>button},showToast(){},renderOperationalWeekNavigator(){},autosave(){state.localDirty=true;},async ensureCurrentProgramSaved(){c.appState.programs[0].data.pt_studio_state=structuredClone(state);state.localDirty=false;return true;}});
 vm.runInContext(extract('function workoutSession(','function operationalWeekModel('),c);
 vm.runInContext(extract('function operationalWeekModel(','function selectOperationalWeek('),c);
 return c;
}
test('saved A/week1 becomes complete independently of B/week1 and A/week2',async()=>{
 const c=fixture();
 assert.equal(c.operationalWeekModel().progress[0].completed,false,'filled loads alone do not confirm a saved session');
 c.workoutSession('A',0).notes='Interrotta ultima serie, da rivalutare';
 assert.equal(await c.saveOperationalWorkout(),true);
 assert.equal(c.operationalWeekModel().progress[0].completed,true);
 assert.equal(c.operationalWeekModel().progress[1].completed,false);
 c.state.currentSheet='B';assert.equal(c.operationalWeekModel().progress[0].completed,false);
 assert.equal(c.workoutSession('B',0).notes,'');
 assert.equal(c.appState.programs[0].data.pt_studio_state.workoutSessions.A[0].notes,'Interrotta ultima serie, da rivalutare');
});
test('failed save never marks a week complete and read-only PT cannot confirm completion',async()=>{
 const c=fixture();let calls=0;
 c.ensureCurrentProgramSaved=async()=>++calls===1;
 assert.equal(await c.saveOperationalWorkout(),false);
 assert.equal(c.isWorkoutSaved('A',0),false);
 c.canEditClient=()=>false;
 assert.equal(await c.saveOperationalWorkout(),false);
 assert.equal(calls,2);
});
test('notes and completion survive normalization; old programs start without false completions',()=>{
 const c=fixture();Object.assign(c,{clone:structuredClone,defaultState:{sessions:['S1'],sheets:{A:[]},meta:{}},presets:{reps:{}},normalizePeriodKey:()=> '2026-09',ensureExerciseWeekSets(){},syncExerciseWeekSummary(){},id:()=> 'e'});
 vm.runInContext(extract('function normalizeState(','function progressionPlan('),c);
 const input={sessions:['S1','S2'],sheetOrder:['A','B'],sheets:{A:[],B:[]},workoutSessions:{A:[{notes:'Nota A',completedAt:'confirmed'}],B:[{notes:'Nota B'}]}};
 const saved=c.normalizeState(JSON.parse(JSON.stringify(input)));
 assert.equal(saved.workoutSessions.A[0].completedAt,'confirmed');
 assert.equal(saved.workoutSessions.B[0].notes,'Nota B');
 assert.equal(saved.workoutSessions.B[0].completedAt,'');
 assert.equal(saved.workoutSessions.A[1].notes,'');
 assert.equal(c.normalizeState({sheets:{A:[]}}).workoutSessions.A[0].completedAt,'');
});
test('successful assignment opens client folder, failed assignment retains the editable draft',async()=>{
 const c=vm.createContext({appState:{selectedClientId:'c'},storageKeyFor:()=>'',normalizeState:s=>s,renderAll(){},autosave(){},showToast(){},showView:v=>c.view=v,saveProgramToSupabase:async()=>true});
 vm.runInContext(extract('async function createAndPersistProgram(','async function duplicateProgram('),c);
 assert.equal(await c.createAndPersistProgram({},'ok','programsView'),true);assert.equal(c.view,'programsView');
 c.saveProgramToSupabase=async()=>false;
 assert.equal(await c.createAndPersistProgram({},'ok','programsView'),false);assert.equal(c.view,'builderView');
 const workflow=fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/js/program-workflow.js'),'utf8');
 assert.match(workflow,/createAndPersistProgram\(next, `Scheda assegnata a \$\{fullName\(client\)\}`, "programsView"\)/);
});

test('visible note capture stays bound to its client, workout and entry after structural changes', () => {
 const entry={notes:'',completedAt:''},input={value:'Nota visibile'};
 const state={sheetOrder:['A','B'],sessions:['S1','S2'],workoutSessions:{A:[entry,{notes:'Seconda settimana'}],B:[{notes:'Altra seduta'}]}};
 let saves=0;
 const c=vm.createContext({state,appState:{selectedClientId:'a'},document:{getElementById:()=>input},canEditClient:()=>true,autosave(){saves++;}});
 input.ptNoteContext={state,clientId:'a',sheet:'A',week:0,entry};
 vm.runInContext(extract('function captureWorkoutSessionNote(','function renderWorkoutSessionNotes('),c);
 assert.equal(c.captureWorkoutSessionNote(),true);assert.equal(entry.notes,'Nota visibile');assert.equal(saves,1);
 assert.equal(c.captureWorkoutSessionNote(),false,'unchanged text does not schedule a save');
 state.workoutSessions.A.splice(0,1);input.value='Testo vecchio';
 assert.equal(c.captureWorkoutSessionNote(),false);assert.equal(state.workoutSessions.A[0].notes,'Seconda settimana');
 input.ptNoteContext.entry=state.workoutSessions.A[0];c.appState.selectedClientId='b';
 assert.equal(c.captureWorkoutSessionNote(),false,'old DOM never writes into another client');
});
