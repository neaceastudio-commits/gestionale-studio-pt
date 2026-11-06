const {test}=require('node:test'),assert=require('node:assert/strict');
const {open}=require('./helpers/calendar-recovery-db.cjs');
for(const pair of [false,true])test(`automatic ${pair?'pair':'individual'} recovery: purchased pattern, overlap alert, same cycle, retry and reopen`,async()=>{
 const f=await open(pair);try{
  const source=await f.seed(pair);
  await f.write({id:'occupied',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-05',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'});
  const clientsBefore=await f.all('clients'),result=await f.recover(source);
  assert.equal(result.appointment.status,'annullato');assert.equal(result.recovery.date,pair?'2099-11-05':'2099-11-09','append after the package tail, using purchased weekdays');
  assert.equal(result.recovery.start_time,'17:00:00');assert.equal(result.recovery.operator_id,'pt');
  assert.deepEqual(result.recovery.client_ids,pair?['a','b']:['a']);
  assert.deepEqual(await f.all('clients'),clientsBefore,'booking does not consume, renew or change money');
  assert.match(result.recovery.notes,/RECUPERO-DA source/);assert.match(result.recovery.notes,/cycle-a/);
  assert.deepEqual((await f.recover(source)).recovery,result.recovery,'same source always returns the original recovery');
  assert.equal((await f.all('appointments')).filter(a=>a.id.startsWith('recovery_')).length,1);
  assert.deepEqual((await f.all('appointments')).find(a=>a.id===result.recovery.id),result.recovery,'separate database read confirms persistence');
  assert.ok((await f.db.query('select id from calendar_audit_log')).rows.length>=5);
 }finally{await f.close()}
});
test('overlapping appointments are allowed with warnings, including pairs with Flex disabled',async()=>{
 const f=await open(true);try{
  const source=await f.seed(true);
  const conflict={id:'occupied',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-05',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'};
  await f.write({...conflict,client_ids:[],service_id:'blocco'});
  const result=await f.recover(source);
  assert.equal(result.recovery.date,'2099-11-05','an occupied PT slot does not shift the purchased pattern');
  assert.ok(result.planning_warnings.includes('operator_overlap'));
  const direct=await f.write({...result.recovery,id:'manual',notes:result.recovery.notes.replace(/\[RECUPERO-DA [^\]]+\]/g,'')});
  assert.ok(direct.warnings.includes('client_overlap'));assert.equal(direct.appointment.id,'manual');
 }finally{await f.close()}
});
test('failed creation rolls cancellation and balance back; retry refunds a charged session once',async()=>{
 const f=await open();try{
  let source=await f.seed();source=(await f.write({...source,status:'fatto'},source)).appointment;
  const beforeRows=await f.all('appointments'),beforeClients=await f.all('clients');
  await f.db.exec(`create function fail_recovery() returns trigger language plpgsql as $$begin if new.id like 'recovery_%' then raise exception 'TEST creation failed';end if;return new;end$$;create trigger fail_recovery before insert on appointments for each row execute function fail_recovery()`);
  await assert.rejects(f.recover(source),/TEST creation failed/);
  assert.deepEqual(await f.all('appointments'),beforeRows);assert.deepEqual(await f.all('clients'),beforeClients);
  await f.db.exec('drop trigger fail_recovery on appointments');
  const result=await f.recover(source);assert.equal(result.clients[0].sessions_remaining,3);
  await f.recover(source);assert.equal((await f.all('clients'))[0].sessions_remaining,3);
 }finally{await f.close()}
});
test('authorization, stale snapshots, archived clients and old cycles cannot alter another package',async()=>{
 const f=await open();try{
  const source=await f.seed(),before=await f.all('appointments');
  await assert.rejects(f.recover(source,'other','pt'),/belongs|assegnat|autorizzat/i);
  await assert.rejects(f.recover(source,'pt','owner'),/role|Direzione/i);
  const changed=(await f.write({...source,start_time:'18:00:00'},source)).appointment;
  await assert.rejects(f.recover(source),/changed|cambiat/i);
  await f.patch({id:'a',active:false});
  await assert.rejects(f.recover(changed),/attiv/i);
  await f.patch({id:'a',active:true,notes:'[CICLO-PACCHETTO 2100-01-01]',data_conferma:'2100-01-01'});
  await assert.rejects(f.recover(changed),/ciclo|pacchetto/i);
  assert.equal((await f.all('appointments')).length,before.length);
  await f.db.exec('set role anon');await assert.rejects(f.db.query("select calendar_cancel_and_recover('owner','owner',gen_random_uuid(),'{}')"),/permission denied/);await f.db.exec('reset role');
 }finally{await f.close()}
});
test('a pending pair renewal keeps its own plan, links and independent current balances',async()=>{
 const f=await open(true);try{
  await f.seed(true);
  const crypto=require('node:crypto'),renewals=require('../netlify/functions/lib/expected-renewals');
  const proposal={id:crypto.randomUUID(),plan:{serviceId:'pt12',startDate:'2099-12-02',slots:[{day:3,time:'09:00',operatorId:'pt',duration:60}],clients:['a','b'].map(id=>({id,source:{cycleId:'cycle-'+id,start:'2099-10-01'},cycleId:'next-'+id,sessions:2,amount:100})),issue:''}};
  const clients=await f.all('clients');
  await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...proposal,appointments:renewals.appointmentsFor(proposal),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
  const before=await f.all('calendar_expected_renewals'),source=(await f.all('appointments')).find(a=>a.id.startsWith('expected_'));
  const result=await f.recover(source);
  assert.match(result.recovery.notes,/RINNOVO-PREVISTO/);assert.match(result.recovery.notes,/next-a/);
  assert.equal(result.recovery.start_time,'09:00:00');
  assert.deepEqual(await f.all('clients'),clients);assert.deepEqual(await f.all('calendar_expected_renewals'),before);
  const active=(await f.q('select count(*)::int n from appointments a join calendar_expected_renewal_appointments m on m.appointment_id=a.id where a.status<>\'annullato\'')).rows[0].n;
  assert.equal(active,2,'one cancelled reservation is replaced in the same proposal');
 }finally{await f.close()}
});
test('legacy packages without ledger or configured days reuse the actual lesson pattern and assigned PT',async()=>{
 const f=await open();try{
  const source=await f.seed();
  await f.patch({id:'a',notes:'[CICLO-PACCHETTO 2099-10-01]',giorni_settimana:null,orario_preferito:null});
  const result=await f.recover(source,'pt','pt');
  assert.equal(result.recovery.date,'2099-11-09');assert.equal(result.recovery.start_time,'17:00:00');assert.equal(result.recovery.operator_id,'pt');
  assert.equal(result.clients[0].sessions_remaining,3);
 }finally{await f.close()}
});
