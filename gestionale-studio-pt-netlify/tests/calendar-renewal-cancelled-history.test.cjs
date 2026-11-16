const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {open}=require('./helpers/calendar-recovery-db.cjs'),renewal=require('../netlify/functions/lib/expected-renewals');
const migration=n=>fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',n),'utf8');
for(const pair of [false,true])test(`activation preserves cancelled ${pair?'paired':'individual'} renewal rows including their original notes and timestamps`,async()=>{
 const f=await open(pair);try{
  await f.seed(pair);await f.db.exec(migration('20261116174042_calendar_cycle_recovery_sequence.sql'));
  if(!process.env.REPRODUCE_BEFORE_FIX)await f.db.exec(migration('20261116181624_calendar_preserve_cancelled_renewal_history.sql'));
  const cs=await f.all('clients');let p={id:crypto.randomUUID(),plan:{serviceId:pair?'pt12':'pt11',startDate:'2099-12-01',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60}],clients:cs.map(c=>({id:c.id,source:{cycleId:'cycle-'+c.id,start:'2099-10-01'},cycleId:'next-'+c.id,sessions:4,amount:100})),issue:''}};
  p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewal.appointmentsFor(p),clients:cs.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
  p=await f.rpc('calendar_expected_renewal',['owner','confirm',JSON.stringify({id:p.id,version:p.version})]);
  const next=(await f.all('appointments')).filter(a=>a.notes.includes('[RINNOVO-PREVISTO '))[0];await f.recover(next);
  for(const a of (await f.all('appointments')).filter(a=>['source','tail'].includes(a.id)))await f.write({...a,status:'annullato'},a);
  for(const c of cs)await f.patch({id:c.id,sessions_remaining:0});
  const before=await f.all('appointments'),cancelled=before.filter(a=>a.status==='annullato'),clients=await f.all('clients');p=(await f.all('calendar_expected_renewals'))[0];
  await f.rpc('calendar_expected_renewal',['owner','activate',JSON.stringify({id:p.id,version:p.version,clients:renewal.activationClients(p,clients,before.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')))})]);
  const after=await f.all('appointments');for(const old of cancelled)assert.deepEqual(after.find(a=>a.id===old.id),old);
  assert.equal((await f.all('calendar_expected_renewals'))[0].state,'activated');assert.ok((await f.all('clients')).every(c=>c.sessions_remaining===4&&c.stato_pagamento==='Da pagare'));
 }finally{await f.close()}
});
