const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {start}=require('./helpers/calendar-postgres.cjs');
(async()=>{const db=await start(),c=db.client;try{
  await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260916140424_pt_shared_program_templates.sql'),'utf8'));
  for(const role of ['anon','authenticated']) {
    await c.query('set role '+role);
    await assert.rejects(c.query('select * from pt_program_templates'),{code:'42501'});
    await assert.rejects(c.query("insert into pt_program_templates(id,title,snapshot,created_by) values('test-template-1','Test','{}','pt')"),{code:'42501'});
    await c.query('reset role');
  }
  await c.query('set role service_role');
  await assert.rejects(c.query("insert into pt_program_templates(id,title,snapshot,created_by) values('test-template-1','Test','{}','pt')"),{code:'23514'});
  await c.query("insert into pt_program_templates(id,title,snapshot,created_by) values('test-template-1','Test',$1,'pt')",[JSON.stringify({format:'neacea-program-editor-v1',program:{days:[]}})]);
  assert.equal((await c.query('select * from pt_program_templates')).rowCount,1);
  await c.query("update pt_program_templates set archived_at=now() where id='test-template-1'");
  assert.equal((await c.query('select * from pt_program_templates where archived_at is null')).rowCount,0);
  await assert.rejects(c.query('delete from pt_program_templates'),{code:'42501'});
  console.log('PASS template schema: constraints, server-only access, withdrawal, no DELETE grant.');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
