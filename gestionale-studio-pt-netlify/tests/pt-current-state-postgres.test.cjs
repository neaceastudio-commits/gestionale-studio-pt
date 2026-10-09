const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const sql=name=>fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8');
test('autosave keeps one program without revisions; replacement creates real history; conflicts and load rollback remain atomic',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table clients(id text primary key);
 create table schede_allenamento(id text primary key,cliente_id text,data jsonb,created_at timestamptz default clock_timestamp(),updated_at timestamptz default clock_timestamp());
 create table carichi_allenamento(id text primary key,cliente_id text,data jsonb,updated_at timestamptz default clock_timestamp());
 grant all on clients,schede_allenamento,carichi_allenamento to service_role;
 insert into clients values('client-a'),('client-b');`);
 for(const f of ['20260901094141_secure_pt_program_persistence.sql','20260916140424_pt_shared_program_templates.sql','20260918182400_pt_program_library_and_current.sql','20260928130758_pt_current_state_without_revisions.sql'])await db.exec(sql(f));
 for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(db.query("select pt_save_program_with_current('p','client-a','{}')"));await db.exec('reset role');}
 await db.exec('set role service_role');
 const save=async(id,data={},version=null,loads=[])=>(await db.query('select pt_save_program_with_current($1,$2,$3,$4,$5,false,$6) r',[id,'client-a',JSON.stringify(data),version,'pt-a',JSON.stringify(loads)])).rows[0].r;
 let first=await save('first',{period:'2026-08',name:'First'});
 for(let n=1;n<=12;n++)first=await save('first',{period:'2026-08',name:'First',value:n},first.row.updated_at);
 assert.equal((await db.query('select count(*)::int n from schede_allenamento')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from pt_program_revisions')).rows[0].n,0);
 assert.equal(first.row.data.value,12);assert.equal(first.revision,null);assert.equal(first.currentProgramId,'first');
 const next=await save('second',{period:'2026-09',name:'Second'});assert.equal(next.currentProgramId,'second');
 const editedHistory=await save('first',{period:'2026-08',name:'Edited history'},first.row.updated_at);assert.equal(editedHistory.currentProgramId,'second');
 assert.equal((await db.query('select count(*)::int n from schede_allenamento')).rows[0].n,2);
 const conflict=await save('second',{name:'wrong'},'2020-01-01');assert.equal(conflict.code,'PROGRAM_CONFLICT');
 const load={id:'load',data:{program_id:'second',sync_token:'s1',load:'40',reps:'8'}};
 const recorded=await save('second',{name:'Second',save_meta:{sync_token:'s1'}},next.row.updated_at,[load]);
 assert.equal((await db.query('select data from carichi_allenamento')).rows[0].data.load,'40');
 await assert.rejects(save('second',{name:'Must roll back'},recorded.row.updated_at,[load,load]));
 assert.equal((await db.query("select data->>'name' name from schede_allenamento where id='second'")).rows[0].name,'Second');
 assert.equal((await db.query('select count(*)::int n from pt_program_revisions')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from pt_program_templates')).rows[0].n,0);
 await save('second',{name:'Second',save_meta:{sync_token:'s2'}},recorded.row.updated_at,[]);
 assert.equal((await db.query('select count(*)::int n from carichi_allenamento')).rows[0].n,0);
 }finally{await db.close()}
});
