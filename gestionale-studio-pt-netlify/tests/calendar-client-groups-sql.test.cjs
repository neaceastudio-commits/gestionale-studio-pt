const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('manual groups: old clients, permissions, conflict, idempotent retry and rollback on audit failure',async()=>{
 const db=new PGlite();try{
 const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`insert into clients(id,nome,active,notes,sessions_remaining,pt_assegnato) values('c','TEST',true,'Originale',7,'pt'),('archived','STORICO',false,'Storico',4,'pt');
 insert into operators(id,nome,email,roles) values('owner','Direzione','owner@example.invalid',array['owner']),('pt','PT','pt@example.invalid',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;`);
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20260912151523_calendar_prerelease_atomic.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20260912212042_calendar_activity_audit.sql','utf8'));
 await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/20261026141717_calendar_manual_client_groups.sql','utf8'));
 const call=async(group,expected=null,actor='owner',role='service_role',client='c')=>{await db.exec('set role '+role);try{return (await db.query('select calendar_set_client_group($1,$2,$3,$4,$5) r',[actor,client,group,expected,crypto.randomUUID()])).rows[0].r;}finally{await db.exec('reset role')}};
 const original=(await db.query("select * from clients where id='c'")).rows[0];assert.equal(original.client_group,null);
 await assert.rejects(call('regular',null,'pt'),/Direzione/);await assert.rejects(call('regular',null,'owner','anon'),/permission denied/);
 await assert.rejects(call('regular',null,'owner','authenticated'),/permission denied/);await assert.rejects(call('invalid'),/non valido/);
 await assert.rejects(call('regular',null,'owner','service_role','archived'),/attivo/);
 let saved=await call('occasional');assert.equal(saved.client_group,'occasional');assert.equal(saved.notes,'Originale');assert.equal(saved.sessions_remaining,7);assert.equal(saved.pt_assegnato,'pt');
 const auditCount=(await db.query('select count(*) n from calendar_audit_log')).rows[0].n;
 await call('occasional');assert.equal((await db.query('select count(*) n from calendar_audit_log')).rows[0].n,auditCount);
 await assert.rejects(call('regular'),/altro dispositivo/);
 saved=await call('regular','occasional');assert.equal(saved.client_group,'regular');
 await db.exec("create function reject_group_audit() returns trigger language plpgsql as $$begin raise exception 'AUDIT_TEST_FAILURE';end$$;create trigger reject_group_audit before insert on calendar_audit_log for each row execute function reject_group_audit()");
 await assert.rejects(call(null,'regular'),/AUDIT_TEST_FAILURE/);
 assert.equal((await db.query("select client_group from clients where id='c'")).rows[0].client_group,'regular');
 }finally{await db.close()}
});
