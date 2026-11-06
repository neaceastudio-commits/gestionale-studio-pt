const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {setup}=require('./helpers/calendar-recovery-db.cjs');
test('two independent PostgreSQL connections cancel the same source once and return the same recovery',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[require('node:path').resolve(__dirname,'../tools/coaching-editor')]});
 const cluster=await require('./helpers/calendar-postgres.cjs').start();let second;
 try{
  await setup({exec:sql=>cluster.client.query(sql),query:(sql,args)=>cluster.client.query(sql,args)},false,true);
  await cluster.client.query('set role service_role');
  const saved=(await cluster.client.query('select calendar_audit_write($1,$2,$3,$4,$5,$6) r',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:{id:'source',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-02',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'}})])).rows[0].r.appointment;
  second=await cluster.connection();await second.query('set role service_role');
  const recover=client=>client.query('select calendar_cancel_and_recover($1,$2,$3,$4) r',['owner','owner',crypto.randomUUID(),JSON.stringify(saved)]);
  const results=await Promise.all([recover(cluster.client),recover(second)]);
  assert.equal(results[0].rows[0].r.recovery.id,results[1].rows[0].r.recovery.id);
  assert.equal((await second.query("select count(*)::int n from appointments where id like 'recovery_%'")).rows[0].n,1);
  assert.equal((await second.query("select status from appointments where id='source'")).rows[0].status,'annullato');
  assert.equal((await second.query("select sessions_remaining from clients where id='a'")).rows[0].sessions_remaining,12);
 }finally{await second?.end();await cluster.close()}
});
