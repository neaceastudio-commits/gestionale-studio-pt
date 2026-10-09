const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
test('only owner grants/revokes sharing; old appointments grant nothing; revocation blocks writes and audit is atomic',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table operators(id text primary key,nome text,cognome text,email text,active boolean,portal_access_enabled boolean);
 create table operator_effective_roles(operator_id text,active boolean,legacy_roles jsonb,system_roles jsonb);
 create table clients(id text primary key,pt_assegnato text);
 create table appointments(id text primary key,operator_id text,client_ids jsonb,service_id text,date date,start_time time,status text);
 create table schede_allenamento(id text primary key,cliente_id text,data jsonb);
 create table calendar_audit_log(actor_operator_id text,actor_name text,actor_email text,actor_role text,action text,entity_type text,entity_id text,client_ids jsonb,before_data jsonb,after_data jsonb,source text,request_id uuid,metadata jsonb);
 insert into operators values('staff_1','Owner','Test','nutrizione.gianlucapirisi@gmail.com',true,true),('a','Alfa','PT','a@test',true,true),('b','Beta','PT','b@test',true,true);
 insert into operator_effective_roles values('staff_1',true,'["PT","Direzione"]','[]'),('a',true,'["PT"]','[]'),('b',true,'["PT"]','[]');
 insert into clients values('c','a');
 insert into appointments values('appt','b','["c"]','pt11',current_date,'10:00','prenotato');
 insert into schede_allenamento values('program','c','{}');`);
 for(const file of ['20260928050451_pt_session_records_audit.sql','20260928105818_owner_controlled_pt_sharing.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
 const uuid='00000000-0000-4000-8000-000000000001';
 const share=(actor='staff_1',active=true)=>db.query('select pt_set_client_share($1,$2,$3,$4,$5) r',[actor,'c','b',active,uuid]);
 const save=(actor='b',version=0)=>db.query('select pt_save_session_record($1,$2,$3,$4,$5,$6,$7) r',['appt','c','program',actor,JSON.stringify({rows:[],notes:'test'}),version,'00000000-0000-4000-8000-000000000002']);
 await db.exec('set role anon');await assert.rejects(share());await db.exec('reset role;set role service_role');
 await assert.rejects(db.query("insert into pt_client_shares values('c','b',true,'staff_1',now())"));
 await assert.rejects(share('b'),/FORBIDDEN/);await assert.rejects(save(),/FORBIDDEN/);
 await share();await assert.rejects(save('a'),/FORBIDDEN/);await save();
 await share('staff_1',false);await assert.rejects(save('b',1),/FORBIDDEN/);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from pt_session_records')).rows[0].n,1,'revocation retains existing records');
 assert.equal((await db.query('select count(*)::int n from calendar_audit_log')).rows[0].n,3);
 await db.exec("create function reject_share_audit() returns trigger language plpgsql as $$begin raise exception 'AUDIT_FAILED';end$$;create trigger reject_audit before insert on calendar_audit_log for each row execute function reject_share_audit()");
 await assert.rejects(share(),/AUDIT_FAILED/);assert.equal((await db.query('select active from pt_client_shares')).rows[0].active,false);
 }finally{await db.close()}
});
