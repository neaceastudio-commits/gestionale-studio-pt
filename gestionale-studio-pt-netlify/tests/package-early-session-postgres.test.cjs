const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {start,seed}=require('./helpers/calendar-postgres.cjs');
(async()=>{
 const pg=await start();
 try {
  const c=pg.client;await seed(c);
  const acl=(await c.query("select proacl::text as acl from pg_proc where oid='public.calendar_uses_current_session(jsonb,jsonb)'::regprocedure")).rows[0].acl;
  await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260921101845_calendar_early_package_session.sql'),'utf8'));
  assert.equal((await c.query("select proacl::text as acl from pg_proc where oid='public.calendar_uses_current_session(jsonb,jsonb)'::regprocedure")).rows[0].acl,acl);
  await c.query("update clients set package_start='2026-09-25',data_inizio='2026-09-25',data_conferma='2026-09-25',notes='[CICLO-PACCHETTO 2026-09-25]' where id='test'");
  let appointment={id:'early',client_ids:['test'],operator_id:'pt',service_id:'pt11',date:'2026-09-23',start_time:'11:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO 2026-09-25]'};
  const save=async(next,before)=>{const r=(await c.query('select calendar_save_appointment($1::jsonb,$2::jsonb) as result',[JSON.stringify(next),before?JSON.stringify(before):null])).rows[0].result;return r.appointment;};
  const remaining=async()=>Number((await c.query("select sessions_remaining from clients where id='test'")).rows[0].sessions_remaining);
  appointment=await save(appointment,null);assert.equal(await remaining(),8);
  appointment=await save({...appointment,status:'fatto'},appointment);assert.equal(await remaining(),7);
  appointment=await save({...appointment,status:'annullato'},appointment);assert.equal(await remaining(),8);
  appointment=await save({...appointment,status:'prenotato'},appointment);assert.equal(await remaining(),8);
  const historical={...appointment,status:'fatto',notes:'',date:'2026-09-01'};
  assert.equal((await c.query("select calendar_uses_current_session($1::jsonb,to_jsonb(c)) as included from clients c where id='test'",[JSON.stringify(historical)])).rows[0].included,false);
  console.log('PASS PostgreSQL: seduta anticipata, residuo 8→7→8, storico escluso e privilegi invariati');
 } finally {await pg.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
