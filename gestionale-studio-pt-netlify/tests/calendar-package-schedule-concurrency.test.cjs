const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {setup}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
test('a separate PostgreSQL connection closing a lesson invalidates the whole weekly preview',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[path.join(root,'tools/coaching-editor')]});
 const cluster=await require(path.join(root,'tests/helpers/calendar-postgres.cjs')).start();let second;
 try{
  await setup({exec:s=>cluster.client.query(s),query:(s,a)=>cluster.client.query(s,a)},false,true);
  await cluster.client.query(fs.readFileSync(path.join(root,'supabase/migrations/20261112103135_calendar_package_schedule.sql'),'utf8'));
  await cluster.client.query('set role service_role');
  const write=(connection,a,b)=>connection.query('select calendar_audit_write($1,$2,$3,$4,$5,$6) r',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a,...(b?{expected:b}:{})})]);
  const source=(await write(cluster.client,{id:'source',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-02',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'})).rows[0].r.appointment;
  const client=(await cluster.client.query("select to_jsonb(c) c from clients c where id='a'")).rows[0].c;
  second=await cluster.connection();await second.query('set role service_role');await second.query('begin');await write(second,{...source,status:'fatto'},source);
  const p={clientId:'a',fromDate:'2099-11-01',slots:[{day:3,time:'12:00'}],clients:[{id:'a',expectedUpdatedAt:client.updated_at}],expectedAppointments:[source]};
  const pending=cluster.client.query('select calendar_package_schedule($1,$2,$3,false)',['owner',crypto.randomUUID(),JSON.stringify(p)]),rejected=assert.rejects(pending,/Lezioni cambiate|Nessuna lezione|Pacchetto cambiato/);
  await second.query('commit');await rejected;
  const saved=(await cluster.client.query("select to_jsonb(a) a from appointments a where id='source'")).rows[0].a;
  assert.equal(saved.status,'fatto');assert.equal(saved.date,source.date);assert.equal(saved.start_time,source.start_time);assert.equal((await cluster.client.query('select count(*)::int n from calendar_schedule_receipts')).rows[0].n,0);
 }finally{await second?.end();await cluster.close()}
});
