const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {open}=require('./helpers/calendar-recovery-db.cjs');
const renewals=require('../netlify/functions/lib/expected-renewals');
const migration=path.resolve(__dirname,'../supabase/migrations/20261116174042_calendar_cycle_recovery_sequence.sql');
async function fixture(pair=false,confirmed=false){
 const f=await open(pair);await f.seed(pair);
 await f.db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261111091927_calendar_package_suspension.sql'),'utf8'));
 if(!process.env.REPRODUCE_BEFORE_FIX)await f.db.exec(fs.readFileSync(migration,'utf8'));
 const clients=await f.all('clients');
 let p={id:crypto.randomUUID(),plan:{serviceId:pair?'pt12':'pt11',startDate:'2099-11-05',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60},{day:3,time:'17:00',operatorId:'pt',duration:60},{day:4,time:'17:00',operatorId:'pt',duration:60}],clients:clients.map(c=>({id:c.id,source:{cycleId:'cycle-'+c.id,start:'2099-10-01'},cycleId:'next-'+c.id,sessions:4,amount:100})),issue:''}};
 p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewals.appointmentsFor(p),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
 if(confirmed)p=await f.rpc('calendar_expected_renewal',['owner','confirm',JSON.stringify({id:p.id,version:p.version})]);
 return {...f,p,align:(actor='owner',role='owner')=>f.rpc('calendar_align_renewal',[actor,role,p.id]),maintain:()=>f.rpc('calendar_maintain_package',['owner',p.id])};
}
for(const pair of [false,true])for(const confirmed of [false,true])test(`current recovery shifts ${confirmed?'confirmed':'pending'} ${pair?'pair':'single'} successor atomically, keeping identities, slots and money`,async()=>{
 const f=await fixture(pair,confirmed);try{
  const before=await f.all('appointments'),clients=await f.all('clients'),source=before.find(a=>a.id==='source');
  const oldRenewal=before.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')).sort((a,b)=>a.date.localeCompare(b.date));
  const r=await f.recover(source);assert.equal(r.recovery.date,'2099-11-05');
  const after=await f.all('appointments'),next=after.filter(a=>oldRenewal.some(b=>b.id===a.id)).sort((a,b)=>a.date.localeCompare(b.date));
  assert.ok(next[0].date>r.recovery.date,'the recovery stays in the old cycle and the new cycle must move');
  assert.deepEqual(next.map(a=>a.id),oldRenewal.map(a=>a.id));assert.equal(next.length,4);
  assert.ok(next.every(a=>a.start_time==='17:00:00'&&a.operator_id==='pt'&&a.status==='prenotato'));
  assert.equal((await f.all('calendar_expected_renewals'))[0].state,f.p.state);
  for(const old of before.filter(a=>a.status==='fatto'))assert.deepEqual(after.find(a=>a.id===old.id),old);
  assert.deepEqual(await f.all('clients'),clients);
  await f.recover(source);assert.deepEqual(await f.all('appointments'),after,'lost-response retry does not shift twice');
  const feed=require('../netlify/functions/apple-calendar')._test.buildCalendar(next,clients,await f.all('operators'),{operatorId:'pt'});assert.equal(feed.count,4);
 }finally{await f.close()}
});
test('maintenance flags unknown past outcomes, fills only missing future credit and reopens identically',async()=>{
 const f=await fixture();try{
  const row=(await f.all('appointments')).find(a=>a.id==='source');
  await f.write({...row,id:'unknown-old',date:'2020-01-01'});
  const before=await f.all('appointments'),clients=await f.all('clients');
  await f.maintain();const after=await f.all('appointments');
  const unknown=after.find(a=>a.id==='unknown-old');assert.equal(unknown.status,'prenotato');assert.equal(unknown.date,'2020-01-01');assert.match(unknown.notes,/ESITO-DA-VERIFICARE/);
  const newRows=after.filter(a=>!before.some(b=>b.id===a.id));assert.equal(newRows.length,1,'past reservation is not treated as a future credit');
  assert.equal(newRows[0].status,'prenotato');assert.match(newRows[0].notes,/cycle-a/);
  const next=after.filter(a=>a.notes.includes('[RINNOVO-PREVISTO '));assert.ok(next.every(a=>a.date>newRows[0].date));
  assert.deepEqual(await f.all('clients'),clients);await f.maintain();assert.deepEqual(await f.all('appointments'),after);
  assert.ok((await f.db.query('select count(*)::int n from calendar_sequence_events')).rows[0].n>0);
 }finally{await f.close()}
});
test('failed successor shift rolls back cancellation, recovery, proposal and audit together',async()=>{
 const f=await fixture();try{
  const audit=async()=>(await f.db.query('select to_jsonb(t) r from calendar_audit_log t order by id')).rows.map(x=>x.r);
  const before=await f.all('appointments'),p=await f.all('calendar_expected_renewals'),logs=await audit();
  await f.db.exec(`create function fail_shift() returns trigger language plpgsql as $$begin if new.id like 'expected_%' and new.date<>old.date then raise exception 'TEST shift failure';end if;return new;end$$;create trigger fail_shift before update on appointments for each row execute function fail_shift()`);
  await assert.rejects(f.recover(before.find(a=>a.id==='source')),/TEST shift failure/);
  assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await f.all('calendar_expected_renewals'),p);assert.deepEqual(await audit(),logs);
 }finally{await f.close()}
});
test('service authorization, trainer scope and no historical reassignment during normal alignment',async()=>{
 const f=await fixture();try{
  for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(f.db.query("select calendar_align_renewal('owner','owner',$1)",[f.p.id]),/permission/);await f.db.exec('reset role');}
  await assert.rejects(f.align('other','pt'),/PT|autorizzat/);
  await assert.rejects(f.rpc('calendar_maintain_package',['pt',f.p.id]),/Direction|owner|autorizzat/i);
  const rows=await f.all('appointments'),next=rows.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')).sort((a,b)=>a.date.localeCompare(b.date))[0];
  await f.write({...next,status:'fatto'},next);
  await assert.rejects(f.recover(rows.find(a=>a.id==='source')),/rettifica|storico/i);
  assert.equal((await f.all('appointments')).find(a=>a.id==='source').status,'prenotato');
 }finally{await f.close()}
});
test('reviewed crossed-cycle correction preserves real attendance, cancelled history and finances with an idempotent before/after receipt',async()=>{
 const f=await fixture(false,true);try{
  let rows=await f.all('appointments');const source=rows.find(a=>a.id==='source'),tail=rows.find(a=>a.id==='tail');
  await f.write({...source,status:'annullato'},source);
  for(let i=0;i<2;i++)await f.write({...source,id:'earlier-real-'+i,date:'2020-01-0'+(i+2),status:'fatto'});
  rows=await f.all('appointments');const next=rows.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const performed=(await f.write({...next,date:'2020-01-04',status:'fatto'},next)).appointment;
  const c=(await f.all('clients'))[0],p=(await f.all('calendar_expected_renewals'))[0],before=await f.all('appointments');
  assert.equal(c.sessions_remaining,1);
  const request=crypto.randomUUID(),payload={performedId:performed.id,futureId:tail.id,proposalVersion:p.version,clientUpdatedAt:c.updated_at,performedUpdatedAt:performed.updated_at,futureUpdatedAt:tail.updated_at};
  const repair=(actor='owner',body=payload)=>f.rpc('calendar_repair_crossed_renewal',[actor,p.id,request,JSON.stringify(body)]);
  await assert.rejects(repair('pt'),/Direction|owner|autorizzat/i);
  await assert.rejects(repair('owner',{...payload,proposalVersion:0}),/cambiati/);
  await repair();const after=await f.all('appointments'),updated=(await f.all('clients'))[0];
  assert.equal(updated.sessions_remaining,0);
  assert.equal(updated.notes,c.notes);assert.equal(updated.importo,c.importo);assert.equal(updated.stato_pagamento,c.stato_pagamento);
  for(const b of before){const a=after.find(a=>a.id===b.id);for(const field of ['date','start_time','status','operator_id','client_ids','service_id','duration_min'])assert.deepEqual(a[field],b[field]);if(b.status==='annullato')assert.deepEqual(a,b);}
  const done=after.find(a=>a.id===performed.id);assert.match(done.notes,/RETTIFICA-CICLO/);assert.match(done.notes,/cycle-a/);assert.doesNotMatch(done.notes,/RINNOVO-PREVISTO/);
  assert.equal(after.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')&&a.status!=='annullato').length,4);
  await repair();assert.deepEqual(await f.all('appointments'),after);
  const receipt=(await f.db.query('select before_data,after_data from calendar_sequence_events where id=$1',[request])).rows[0];assert.equal(receipt.before_data.performed.id,performed.id);assert.equal(receipt.after_data.performedId,performed.id);
 }finally{await f.close()}
});
test('manual current-cycle scheduling shifts the successor immediately and excludes its tail from suggestions',async()=>{
 const f=await fixture();try{
  const source=(await f.all('appointments')).find(a=>a.id==='source');
  const saved=await f.write({...source,id:'manual-residual',date:'2099-11-05'});
  assert.ok(saved.renewal_appointments.length);assert.ok(saved.renewal_appointments.every(a=>a.date>'2099-11-05'));
  const vm=require('node:vm'),sandbox={console,App:null,Services:{appointmentInCurrentPackageCycle:a=>!a.next},State:{},document:{addEventListener(){}},window:{}};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../app/calendario-studio/js/app.js'),'utf8')+'\nglobalThis.loaded=App;',sandbox);
  const app=sandbox.loaded;app._packageAppointments=()=>[{date:'2099-11-04',serviceId:'pt11'},{date:'2099-12-01',serviceId:'pt11',next:true}];app._packageServiceId=()=>'pt11';
  const dates=app._suggestPackageDates({id:'a',giorniSettimana:['Giovedì'],packageStart:'2099-10-01'},1);
  assert.equal(dates[0],'2099-11-05');
 }finally{await f.close()}
});
test('Non rinnova cancels a confirmed successor while keeping current lessons, recoveries, balances and retry history',async()=>{
 const f=await fixture(false,true);try{
  const c=(await f.all('clients'))[0],before=await f.all('appointments');
  const payload={clientId:c.id,action:'archive',status:'Non rinnova',expectedUpdatedAt:c.updated_at,expectedAppointments:before.filter(a=>a.status==='prenotato'&&a.date>='2026-11-16')};
  const change=()=>f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify(payload)]);
  const r=await change();assert.equal(r.client.active,true);assert.equal(r.client.stato_abbonamento,'Non rinnova');assert.equal(r.client.sessions_remaining,c.sessions_remaining);assert.equal(r.client.notes,c.notes);
  const after=await f.all('appointments');for(const a of before.filter(a=>!a.notes.includes('[RINNOVO-PREVISTO ')))assert.deepEqual(after.find(b=>b.id===a.id),a);
  assert.ok(after.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')).every(a=>a.status==='annullato'));
  assert.equal((await f.all('calendar_expected_renewals'))[0].state,'declined');await change();assert.deepEqual(await f.all('appointments'),after);
 }finally{await f.close()}
});
test('exhausted source can activate with an unresolved past reservation, without marking it done or charging the new package',async()=>{
 const f=await fixture(false,true);try{
  const source=(await f.all('appointments')).find(a=>a.id==='source');
  await f.write({...source,id:'unresolved-past',date:'2020-01-01'});
  for(const a of (await f.all('appointments')).filter(a=>['source','tail'].includes(a.id)))await f.write({...a,status:'annullato'},a);
  await f.patch({id:'a',sessions_remaining:0});await f.maintain();
  const p=(await f.all('calendar_expected_renewals'))[0],cs=await f.all('clients'),rows=await f.all('appointments');
  await f.rpc('calendar_expected_renewal',['owner','activate',JSON.stringify({id:p.id,version:p.version,clients:renewals.activationClients(p,cs,rows.filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')))})]);
  assert.equal((await f.all('calendar_expected_renewals'))[0].state,'activated');
  const c=(await f.all('clients'))[0];assert.equal(c.sessions_remaining,4);assert.equal(c.stato_pagamento,'Da pagare');
  const old=(await f.all('appointments')).find(a=>a.id==='unresolved-past');assert.equal(old.status,'prenotato');assert.equal(old.date,'2020-01-01');assert.match(old.notes,/ESITO-DA-VERIFICARE/);
 }finally{await f.close()}
});

test('sequence migration supports the actual production guard and restores an empty confirmed successor without losing cancelled history',async()=>{
 const f=await open();try{
  await f.seed();
  const base=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261009095441_calendar_expected_renewals.sql'),'utf8');
  const definition=base.match(/create function public.calendar_expected_renewal\(p_actor_id[\s\S]*?end \$\$;/)[0].replace('create function','create or replace function');
  await f.db.exec(definition);await f.db.exec(fs.readFileSync(migration,'utf8'));
  const def=(await f.db.query("select pg_get_functiondef('calendar_expected_renewal(text,text,jsonb)'::regprocedure) d")).rows[0].d;
  assert.match(def,/not \(p_action='decline' and p.state='confirmed'\)/);
  assert.ok((await f.db.query("select to_regprocedure('calendar_align_renewal(text,text,uuid)')::text f")).rows[0].f);
  assert.match(def,/if p_action='edit' and p.state='confirmed' then/);
  assert.match(def,/state='pending' where id=p.id/);
  await f.db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261116164805_calendar_restore_empty_renewal.sql'),'utf8'));
  const clients=await f.all('clients');let p={id:crypto.randomUUID(),plan:{serviceId:'pt11',startDate:'2099-12-01',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60}],clients:[{id:'a',source:{cycleId:'cycle-a',start:'2099-10-01'},cycleId:'successor-a',sessions:4,amount:100}],issue:''}};
  p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewals.appointmentsFor(p),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
  p=await f.rpc('calendar_expected_renewal',['owner','confirm',JSON.stringify({id:p.id,version:p.version})]);
  for(const a of (await f.all('appointments')).filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')))await f.write({...a,status:'annullato'},a);
  const before=await f.all('appointments');
  await assert.rejects(f.rpc('calendar_expected_renewal',['owner','activate',JSON.stringify({id:p.id,version:p.version,clients:[]})]),/Riprogramma/);
  const result=await f.rpc('calendar_restore_empty_renewal',['owner',JSON.stringify({id:p.id,version:p.version,appointments:renewals.appointmentsFor(p)})]);
  assert.equal(result.state,'confirmed');const after=await f.all('appointments');assert.equal(after.length,before.length+4);
  for(const a of before)assert.deepEqual(after.find(x=>x.id===a.id),a);
  assert.deepEqual(await f.all('clients'),clients);
 }finally{await f.close()}
});
