const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {setup}=require('./helpers/calendar-recovery-db.cjs');
test('independent PostgreSQL writers cannot erase a lesson closed while suspension is pending',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]});
 const cluster=await require('./helpers/calendar-postgres.cjs').start();let second;
 try{
  await setup({exec:sql=>cluster.client.query(sql),query:(sql,args)=>cluster.client.query(sql,args)},false,true);
  const migrations=path.resolve(__dirname,'../supabase/migrations'),name=fs.readdirSync(migrations).find(f=>f.endsWith('_calendar_package_suspension.sql'));
  await cluster.client.query(fs.readFileSync(path.join(migrations,name),'utf8'));await cluster.client.query('set role service_role');
  const write=(connection,a,b)=>connection.query('select calendar_audit_write($1,$2,$3,$4,$5,$6) r',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a,...(b?{expected:b}:{})})]);
  const source=(await write(cluster.client,{id:'source',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-02',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'})).rows[0].r.appointment;
  const before=(await cluster.client.query("select to_jsonb(c) r from clients c where id='a'")).rows[0].r;
  second=await cluster.connection();await second.query('set role service_role');
  // Hold a completed attendance uncommitted while the other connection waits for its lock.
  await second.query('begin');await write(second,{...source,status:'fatto'},source);
  const pending=cluster.client.query('select calendar_client_lifecycle($1,$2,$3) r',['owner',crypto.randomUUID(),JSON.stringify({clientId:'a',action:'archive',status:'Ibernato',expectedUpdatedAt:before.updated_at,expectedAppointments:[source]})]);
  const rejected=assert.rejects(pending,/cambiat/i);await second.query('commit');await rejected;
  const saved=(await cluster.client.query("select to_jsonb(a) r from appointments a where id='source'")).rows[0].r;
  assert.equal(saved.status,'fatto');assert.equal((await cluster.client.query("select active from clients where id='a'")).rows[0].active,true);
  const latest=(await cluster.client.query("select to_jsonb(c) r from clients c where id='a'")).rows[0].r;
  await cluster.client.query('select calendar_client_lifecycle($1,$2,$3)',['owner',crypto.randomUUID(),JSON.stringify({clientId:'a',action:'archive',status:'Ibernato',expectedUpdatedAt:latest.updated_at,expectedAppointments:[]})]);
  assert.deepEqual((await second.query("select to_jsonb(a) r from appointments a where id='source'")).rows[0].r,saved);
  assert.equal((await second.query("select sessions_remaining from clients where id='a'")).rows[0].sessions_remaining,11);
 }finally{await second?.end();await cluster.close()}
});
