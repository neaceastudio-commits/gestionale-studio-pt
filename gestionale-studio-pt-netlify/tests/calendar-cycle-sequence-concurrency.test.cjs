const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {setup}=require('./helpers/calendar-recovery-db.cjs');
const renewal=require('../netlify/functions/lib/expected-renewals');
test('independent PostgreSQL sessions cancel, shift and retry one successor exactly once',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]});
 const cluster=await require('./helpers/calendar-postgres.cjs').start();let second;
 try{
  await setup({exec:sql=>cluster.client.query(sql),query:(sql,args)=>cluster.client.query(sql,args)},false,true);
  await cluster.client.query(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261116174042_calendar_cycle_recovery_sequence.sql'),'utf8'));
  await cluster.client.query('set role service_role');
  const call=async(db,name,args)=>(await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const a={id:'source',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-02',start_time:'17:00:00',duration_min:60,buffer_min:0,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'};
  const source=(await call(cluster.client,'calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a})])).appointment;
  const c=(await cluster.client.query('select to_jsonb(c) c from clients c')).rows[0].c;
  const p={id:crypto.randomUUID(),plan:{serviceId:'pt11',startDate:'2099-11-04',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60},{day:3,time:'17:00',operatorId:'pt',duration:60},{day:4,time:'17:00',operatorId:'pt',duration:60}],clients:[{id:'a',source:{cycleId:'cycle-a',start:'2099-10-01'},cycleId:'next-a',sessions:4,amount:100}],issue:''}};
  await call(cluster.client,'calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewal.appointmentsFor(p),clients:[{id:'a',expectedUpdatedAt:c.updated_at}]})]);
  second=await cluster.connection();await second.query('set role service_role');
  const cancel=db=>call(db,'calendar_cancel_and_recover',['owner','owner',crypto.randomUUID(),JSON.stringify(source)]);
  const r=await Promise.all([cancel(cluster.client),cancel(second)]);assert.equal(r[0].recovery.id,r[1].recovery.id);
  assert.equal((await second.query("select count(*)::int n from appointments where id like 'recovery_%'")).rows[0].n,1);
  const before=(await second.query('select to_jsonb(a) a from appointments a order by id')).rows;
  await cancel(second);assert.deepEqual((await second.query('select to_jsonb(a) a from appointments a order by id')).rows,before);
  assert.equal((await second.query('select count(*)::int n from calendar_sequence_events')).rows[0].n,1);
  assert.equal((await second.query('select sessions_remaining from clients where id=\'a\'')).rows[0].sessions_remaining,12);
  const next=before.map(x=>x.a).filter(a=>a.notes.includes('[RINNOVO-PREVISTO '));assert.equal(next.length,4);assert.ok(next.every(a=>a.date>r[0].recovery.date));
 }finally{await second?.end();await cluster.close()}
});
