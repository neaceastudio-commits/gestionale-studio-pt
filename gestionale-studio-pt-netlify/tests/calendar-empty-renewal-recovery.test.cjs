const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {open}=require('./helpers/calendar-recovery-db.cjs');
const renewals=require('../netlify/functions/lib/expected-renewals');
const root=path.resolve(__dirname,'..');
const migration=()=>fs.readdirSync(path.join(root,'supabase/migrations')).find(n=>n.endsWith('_calendar_restore_empty_renewal.sql'));
test('default dates use documented weekday times and flag a configured day with no known time',()=>{
 const c={id:'a',active:true,sessions_total:12,sessions_remaining:2,package_types:['PT 1:1'],giorni_settimana:['Martedì','Giovedì','Venerdì'],pt_assegnato:'pt',data_conferma:'2099-10-01'};
 const row=(id,date,time)=>({id,date,start_time:time,service_id:'pt11',client_ids:['a'],operator_id:'pt',duration_min:60,status:'prenotato',notes:'[CICLO-PACCHETTO 2099-10-01]'});
 const plan=renewals.infer([c],[row('tue','2099-11-17','16:00:00'),row('fri','2099-11-20','17:00:00')],'2099-11-16');
 assert.equal(plan.issue,'');assert.deepEqual(plan.slots.map(s=>[s.day,s.time]),[[2,'16:00'],[5,'17:00']]);assert.match(plan.notice,/Giovedì/);
 assert.equal(renewals.appointmentsFor({id:'next',plan},[],'2099-11-16').length,12);
 assert.deepEqual(c.giorni_settimana,['Martedì','Giovedì','Venerdì']);
});
test('default successor is reserved before the last two lessons, visible in Apple, and Non rinnova prevents recreation',async()=>{
 const f=await open();try{
  const source=await f.seed();await f.write({...source,id:'third-current',date:'2099-11-05'});
  const service=renewals.createService({db:async(table,options={})=>{
   if(table==='rpc/calendar_expected_renewal')return f.rpc('calendar_expected_renewal',[options.body.p_actor_id,options.body.p_action,JSON.stringify(options.body.p_payload)]);
   return f.all(table);
  }});
  const before=await f.all('clients');assert.equal(before[0].sessions_remaining,3);
  await service.run('owner');const proposals=await f.all('calendar_expected_renewals');assert.equal(proposals.length,1,'renewal must exist before the old two-lesson threshold');
  const p=proposals[0];assert.equal(p.state,'pending');
  const rows=(await f.all('appointments')).filter(a=>a.notes.includes('[RINNOVO-PREVISTO '));assert.equal(rows.length,12);
  const feed=require('../netlify/functions/apple-calendar')._test.buildCalendar(rows,before,await f.all('operators'),{operatorId:'pt'});assert.equal(feed.count,12);assert.match(feed.body,/STATUS:TENTATIVE/);
  assert.deepEqual(await f.all('clients'),before);
  await service.handle('owner',{action:'decline',id:p.id,version:p.version});await service.run('owner');
  assert.equal((await f.all('calendar_expected_renewals')).length,1);assert.equal((await f.all('calendar_expected_renewals'))[0].state,'declined');
  assert.ok((await f.all('appointments')).filter(a=>rows.some(r=>r.id===a.id)).every(a=>a.status==='annullato'));
  assert.deepEqual(await f.all('clients'),before);
 }finally{await f.close()}
});
async function fixture(pair,confirmed){
 const f=await open(pair);await f.seed(pair);
 await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261111091927_calendar_package_suspension.sql'),'utf8'));
 if(migration()&&!process.env.REPRODUCE_BEFORE_FIX)await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations',migration()),'utf8'));
 const clients=await f.all('clients');
 let p={id:crypto.randomUUID(),plan:{serviceId:pair?'pt12':'pt11',startDate:'2099-12-01',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60}],clients:clients.map(c=>({id:c.id,source:{cycleId:'cycle-'+c.id,start:'2099-10-01'},cycleId:'next-'+c.id,sessions:4,amount:100})),issue:''}};
 p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewals.appointmentsFor(p),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
 if(confirmed)p=await f.rpc('calendar_expected_renewal',['owner','confirm',JSON.stringify({id:p.id,version:p.version})]);
 const c=(await f.all('clients'))[0];
 await f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify({clientId:c.id,action:'archive',status:'Ibernato',expectedUpdatedAt:c.updated_at,expectedAppointments:(await f.all('appointments')).filter(a=>a.status==='prenotato'&&a.date>='2099-01-01'&&a.client_ids.includes(c.id))})]);
 const archived=(await f.all('clients'))[0];
 await f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify({clientId:c.id,action:'reactivate',expectedUpdatedAt:archived.updated_at})]);
 const db=async(table,options={})=>{
  if(table==='rpc/calendar_expected_renewal')return f.rpc('calendar_expected_renewal',[options.body.p_actor_id,options.body.p_action,JSON.stringify(options.body.p_payload)]);
  if(table==='rpc/calendar_restore_empty_renewal')return f.rpc('calendar_restore_empty_renewal',[options.body.p_actor_id,JSON.stringify(options.body.p_payload)]);
  return f.all(table);
 };
 return {...f,p,service:renewals.createService({db})};
}
for(const pair of [false,true])for(const confirmed of [false,true])test(`empty ${confirmed?'confirmed':'pending'} ${pair?'pair':'individual'} renewal restores dates after suspension without changing history or money`,async()=>{
 const f=await fixture(pair,confirmed);try{
  const before=await f.all('appointments'),clients=await f.all('clients');
  const result=await f.service.run('owner');
  const after=await f.all('appointments'),p=(await f.all('calendar_expected_renewals'))[0];
  assert.equal(after.filter(a=>!before.some(b=>b.id===a.id)).length,4,JSON.stringify(result));
  for(const old of before)assert.deepEqual(after.find(a=>a.id===old.id),old,'all historical rows, including cancelled rows, stay identical');
  assert.equal(p.state,f.p.state);assert.deepEqual(p.plan,f.p.plan);assert.equal(p.id,f.p.id);
  const newRows=after.filter(a=>!before.some(b=>b.id===a.id));
  const feed=require('../netlify/functions/apple-calendar')._test.buildCalendar(newRows,clients,await f.all('operators'),{operatorId:'pt'});
  assert.equal(feed.count,4,'all restored bookings are visible to the assigned PT in Apple before any payment');
  assert.equal((feed.body.match(new RegExp('STATUS:'+(confirmed?'CONFIRMED':'TENTATIVE'),'g'))||[]).length,4);
  assert.equal((feed.body.match(/TRANSP:OPAQUE/g)||[]).length,4,'pending renewal blocks the appointment slot');
  assert.deepEqual(await f.all('clients'),clients,'no sessions, ledger, payments or assignments changed');
  const reopened=await f.all('appointments');await f.service.run('owner');assert.deepEqual(await f.all('appointments'),reopened,'repeat cannot duplicate bookings');
  for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(f.db.query("select calendar_restore_empty_renewal('owner','{}')"),/permission/);await f.db.exec('reset role');}
 }finally{await f.close()}
});
test('restore rejects unauthorized actors, stale plans, changed slots, inactive clients and rolls back failed creation',async()=>{
 const f=await fixture(true,true);try{
  const payload={id:f.p.id,version:f.p.version,appointments:renewals.appointmentsFor(f.p)};
  const restore=(p,actor='owner')=>f.rpc('calendar_restore_empty_renewal',[actor,JSON.stringify(p)]);
  const logs=async()=>(await f.db.query('select to_jsonb(t) r from calendar_audit_log t order by id')).rows.map(r=>r.r);
  const before=await f.all('appointments'),audit=await logs();
  await assert.rejects(restore(payload,'pt'),/Direction|Direzione|owner|autorizzat/i);
  await assert.rejects(restore({...payload,version:payload.version-1}),/cambiata/);
  const bad=structuredClone(payload);bad.appointments[0].start_time='07:15';await assert.rejects(restore(bad),/piano/);
  const reuse=structuredClone(payload);reuse.appointments[0].id=before[0].id;await assert.rejects(restore(reuse),/storico/);
  await f.db.exec(`create function fail_restore() returns trigger language plpgsql as $$begin if new.id='${payload.appointments.at(-1).id}' then raise exception 'TEST restore failure';end if;return new;end$$;create trigger fail_restore before insert on appointments for each row execute function fail_restore()`);
  await assert.rejects(restore(payload),/TEST restore failure/);
  assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await logs(),audit);assert.deepEqual((await f.all('calendar_expected_renewals'))[0],f.p);
  await f.db.exec('drop trigger fail_restore on appointments');
  await f.patch({id:'b',active:false});await assert.rejects(restore(payload),/attivo/);await f.patch({id:'b',active:true});
  await Promise.all([f.service.run('owner'),f.service.run('owner')]);
  assert.equal((await f.all('appointments')).length,before.length+4,'concurrent schedulers append one set only');
  const committed=await f.all('appointments');await restore(payload);assert.deepEqual(await f.all('appointments'),committed,'lost-response retry returns existing reservations');
 }finally{await f.close()}
});
test('saving already cancelled as cancelled requests one durable recovery and preserves the original history',async()=>{
 const f=await open(true);try{
  const original=await f.seed(true),cancelled=(await f.write({...original,status:'annullato'},original)).appointment;
  let clients=await f.all('clients'),appointments=await f.all('appointments');
  const c={console,CONFIG:{SERVICES:{}},localStorage:{setItem(){}},State:{getClients:()=>clients,getAppointments:()=>appointments,saveClients:r=>clients=r,saveAppointments:r=>appointments=r},window:{},CalendarAudit:{call:async(op,p)=>{assert.equal(op,'cancel_and_recover');try{return await f.recover(p.expected)}catch(e){return {error:e.message}}},write:async()=>({error:'Recovery route was not used'})}};c.window.CalendarAudit=c.CalendarAudit;
  vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'app/calendario-studio/js/supabase.js'),'utf8')+'\nglobalThis.sync=SupabaseSync;',c);
  const appt={id:cancelled.id,serviceId:'pt12',clientIds:cancelled.client_ids,operatorId:'pt',date:cancelled.date,startTime:'17:00',durationMin:60,bufferMin:10,status:'annullato',notes:cancelled.notes};
  const before=await f.all('appointments'),beforeClients=await f.all('clients');
  const saved=await c.sync.saveAppointmentAtomic(appt,appt);assert.ok(saved.recovery,saved.error);
  assert.equal(saved.recovery.status,'prenotato');assert.equal((await f.all('appointments')).length,before.length+1);
  assert.deepEqual((await f.all('appointments')).find(a=>a.id===cancelled.id),cancelled);
  await c.sync.saveAppointmentAtomic(appt,appt);assert.equal((await f.all('appointments')).length,before.length+1);
  assert.deepEqual(await f.all('clients'),beforeClients);
 }finally{await f.close()}
});
