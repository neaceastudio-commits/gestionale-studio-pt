const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite');
const sql=f=>fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8');
test('prepared mesocycles preserve current program and history until valid explicit activation',async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table clients(id text primary key);create table schede_allenamento(id text primary key,cliente_id text,data jsonb,created_at timestamptz default clock_timestamp(),updated_at timestamptz default clock_timestamp());create table carichi_allenamento(id text primary key,cliente_id text,data jsonb,updated_at timestamptz default clock_timestamp());grant all on clients,schede_allenamento,carichi_allenamento to service_role;insert into clients values('a'),('b');`);
 for(const f of ['20260901094141_secure_pt_program_persistence.sql','20260916140424_pt_shared_program_templates.sql','20260918182400_pt_program_library_and_current.sql','20260928130758_pt_current_state_without_revisions.sql','20261127180000_pt_explicit_mesocycle_activation.sql'])await db.exec(sql(f));
 const save=async(id,data,version=null)=>(await db.query("select pt_save_program_with_current($1,'a',$2,$3,'pt',false,'[]') r",[id,JSON.stringify(data),version])).rows[0].r;
 const active=await save('old',{name:'Old',history:'unchanged'});assert.equal(active.currentProgramId,'old');
 const prep=date=>({name:'Next',lifecycle:'preparation',pt_studio_state:{meta:{lifecycle:'preparation',assignedAt:date}}});
 let draft=await save('prep',prep('2099-01-01'));assert.equal(draft.currentProgramId,'old');
 await assert.rejects(db.query("select pt_set_current_program('a','prep')"),/PROGRAM_ACTIVATION_DATE_INVALID/);
 await assert.rejects(db.query("select pt_set_current_program('b','prep')"),/PROGRAM_NOT_AVAILABLE/);
 draft=await save('prep',prep(''),draft.row.updated_at);await assert.rejects(db.query("select pt_set_current_program('a','prep')"),/PROGRAM_ACTIVATION_DATE_INVALID/);
 draft=await save('prep',prep('2020-01-01'),draft.row.updated_at);assert.equal(draft.currentProgramId,'old');
 const result=(await db.query("select pt_set_current_program('a','prep') r")).rows[0].r;assert.equal(result.currentProgramId,'prep');assert.equal(result.row.data.pt_studio_state.meta.lifecycle,'active');assert.notEqual(result.row.updated_at,draft.row.updated_at);
 assert.equal((await save('prep',prep('2020-01-01'),draft.row.updated_at)).code,'PROGRAM_CONFLICT');
 assert.deepEqual((await db.query("select data from schede_allenamento where id='old'")).rows[0].data,active.row.data);
 await save('another-prep',prep('2099-01-01'));
 const archived=await save('prep',{...result.row.data,archived:true},result.row.updated_at);assert.equal(archived.currentProgramId,'old');
 const first=(await db.query("select pt_save_program_with_current('first-prep','b',$1) r",[JSON.stringify(prep('2020-01-01'))])).rows[0].r;assert.equal(first.currentProgramId,null);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query("select pt_set_current_program('a','old')"));await db.exec('reset role');}
 }finally{await db.close();}});
test('next mesocycle resets date/week and actual results while keeping original history and references',async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/index.html'),'utf8');
 const state={meta:{period:'2026-11',name:'Old',assignedAt:'2026-11-03'},sheetOrder:['A','B'],currentSheet:'B',activeWeekIndex:3,sessions:['S1'],sheets:{A:[{name:'Squat',weekSets:[[{load:'40',reps:'7',rir:'0',recorded:true,sessionNote:'old'}]],feedback:['x'],plan:['3x8']}],B:[]},workoutSessions:{A:[{completedAt:'2026-11-03'}]},workoutDates:{A:['2026-11-03']}};const before=structuredClone(state);let created;
 const c=vm.createContext({state,appState:{selectedProgramId:'old'},window:{},selectedClient:()=>({}),fullName:()=>'',confirmAction:async()=>true,ensureCurrentProgramSaved:async()=>true,currentPeriodKey:()=>'',nextPeriodKey:()=> '2026-12',periodLabel:x=>x,normalizeState:structuredClone,clone:structuredClone,ensureExerciseWeekSets(){},normalizeSetEntry:x=>x,syncExerciseWeekSummary(){},createAndPersistProgram:async s=>{created=s;}});
 vm.runInContext(html.slice(html.indexOf('    async function newMonthFromCurrent('),html.indexOf('    function applyProgramMutation(')),c);await c.newMonthFromCurrent();assert.equal(created.meta.assignedAt,'2026-12-01');assert.equal(created.meta.name,'Mesociclo 2026-12');assert.equal(created.meta.lifecycle,'preparation');assert.equal(created.currentSheet,'A');assert.equal(created.activeWeekIndex,0);assert.equal(created.sheets.A[0].weekSets[0][0].previousLoad,'40');assert.equal(created.sheets.A[0].weekSets[0][0].load,'');assert.deepEqual(JSON.parse(JSON.stringify(created.workoutSessions)),{});assert.deepEqual(state,before);
});
