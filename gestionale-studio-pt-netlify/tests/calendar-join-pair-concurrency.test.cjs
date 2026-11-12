const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {setup}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
test('attendance on an independent PostgreSQL connection wins over a stale conversion preview',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[path.join(root,'tools/coaching-editor')]});
 const cluster=await require(path.join(root,'tests/helpers/calendar-postgres.cjs')).start();let second;
 try{
  await setup({exec:s=>cluster.client.query(s),query:(s,a)=>cluster.client.query(s,a)},true,true);
  await cluster.client.query(fs.readFileSync(path.join(root,'supabase/migrations/20261112112856_calendar_join_pair_sessions.sql'),'utf8'));
  await cluster.client.query('set role service_role');
  const first=(await cluster.client.query("select to_jsonb(c) c from clients c where id='a'")).rows[0].c;
  await cluster.client.query('select calendar_save_pair_client($1,$2,$3)',['owner',crypto.randomUUID(),JSON.stringify({client:{...first,pt_partner_id:'b'},expectedUpdatedAt:first.updated_at})]);
  const write=(connection,a,b)=>connection.query('select calendar_audit_write($1,$2,$3,$4,$5,$6) r',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a,...(b?{expected:b}:{})})]);
  const source=(await write(cluster.client,{id:'solo-one',service_id:'pt11',client_ids:['b'],operator_id:'pt',date:'2099-11-12',start_time:'19:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-b] [CICLO-PACCHETTO 2099-10-01]'})).rows[0].r.appointment;
  const clients=(await cluster.client.query('select to_jsonb(c) c from clients c order by id')).rows.map(r=>r.c),payload={clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at})),expectedAppointments:[source]};
  await cluster.client.query('select calendar_join_pair_sessions($1,$2,$3,true)',['owner',crypto.randomUUID(),JSON.stringify(payload)]);
  second=await cluster.connection();await second.query('set role service_role');await second.query('begin');await write(second,{...source,status:'fatto'},source);
  const pending=cluster.client.query('select calendar_join_pair_sessions($1,$2,$3,false)',['owner',crypto.randomUUID(),JSON.stringify(payload)]),rejected=assert.rejects(pending,/seduta è cambiata|Pacchetto cambiato/);
  await second.query('commit');await rejected;
  const saved=(await cluster.client.query("select to_jsonb(a) a from appointments a where id='solo-one'")).rows[0].a;assert.equal(saved.status,'fatto');assert.equal(saved.service_id,'pt11');assert.deepEqual(saved.client_ids,['b']);
  assert.equal((await cluster.client.query('select count(*)::int n from calendar_pt_pair_receipts')).rows[0].n,0);
  const after=(await cluster.client.query('select id,sessions_remaining from clients order by id')).rows;assert.equal(after[0].sessions_remaining,clients[0].sessions_remaining);assert.equal(after[1].sessions_remaining,clients[1].sessions_remaining-1);
 }finally{await second?.end();await cluster.close()}
});
