const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {fixture}=require(path.join(root,'tests/helpers/calendar-join-pair-db.cjs'));
test('joining the active partner reuses existing bookings: preview, atomic confirmation, reopen, retry, balances and attendance',async()=>{
 const f=await fixture(process.env.REPRODUCE_BEFORE_FIX!=='1');try{
  const before=await f.all('appointments'),clients=await f.all('clients'),p=await f.plan();
  const preview=await f.call(p,true);assert.equal(preview.preview,true);assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await f.all('clients'),clients);
  const out=await f.call(p);assert.equal(out.appointments.length,2);assert.deepEqual(await f.all('clients'),clients);assert.deepEqual(await f.call(p),out);
  const reopened=await f.all('appointments');assert.equal(reopened.length,before.length);
  for(const old of before){const a=reopened.find(a=>a.id===old.id);if(!old.id.startsWith('solo-')){assert.deepEqual(a,old);continue;}for(const key of Object.keys(old).filter(k=>!['service_id','client_ids','notes','updated_at'].includes(k)))assert.deepEqual(a[key],old[key],key);assert.equal(a.service_id,'pt12');assert.deepEqual(a.client_ids,['b','a']);assert.match(a.notes,/cycle-a/);assert.match(a.notes,/cycle-b/);}
  const first=out.appointments[0],M=require(path.join(root,'app/calendario-studio/js/pt-session-model'));
  const meta=M.read(first);for(const participant of Object.values(meta.participants))participant.status='fatto';await f.write(M.write({...first,status:'fatto'},meta),first);
  assert.deepEqual((await f.all('clients')).map(c=>c.sessions_remaining),[1,1]);assert.equal(M.summary(await f.all('appointments'),'2099-11').totals[0].cents,1500);
 }finally{await f.close()}
});
test('joining rejects changed appointments, insufficient residual, wrong pair, other cycle, unauthorized roles and partial writes',async()=>{
 const f=await fixture();try{
  const p=await f.plan(),before=await f.all('appointments'),clients=await f.all('clients');
  await assert.rejects(f.call(p,false,'pt'),/Direzione/);await assert.rejects(f.call({...p,clients:[p.clients[0],{id:'missing',expectedUpdatedAt:p.clients[1].expectedUpdatedAt}]}),/due pacchetti/);await assert.rejects(f.call({...p,clients:[p.clients[0],{...p.clients[1],expectedUpdatedAt:'2020-01-01'}]}),/cambiato/);
  await assert.rejects(f.call({...p,expectedAppointments:[p.expectedAppointments[0],p.expectedAppointments[0]]}),/distinte/);
  const a=p.expectedAppointments[0];await f.write({...a,start_time:'20:00'},a);await assert.rejects(f.call(p),/seduta è cambiata/);await f.write(a,(await f.all('appointments')).find(x=>x.id===a.id));
  await f.patch({id:'a',sessions_remaining:1});await assert.rejects(f.call(await f.plan()),/residuo/);await f.patch({id:'a',sessions_remaining:2});
  const old=(await f.all('appointments')).find(x=>x.id===a.id);await f.write({...old,notes:'[CICLO-PACCHETTO-ID previous] [CICLO-PACCHETTO 2098-10-01]'},old);await assert.rejects(f.call(await f.plan()),/altro ciclo/);await f.write(a,(await f.all('appointments')).find(x=>x.id===a.id));
  const stable=await f.all('appointments'),plan=await f.plan();await f.db.exec("create function fail_join() returns trigger language plpgsql as $$begin if new.id='solo-two' and new.service_id='pt12' then raise exception 'TEST join failed';end if;return new;end$$;create trigger fail_join before update on appointments for each row execute function fail_join()");
  const auditBefore=(await f.db.query('select count(*)::int n from calendar_audit_log')).rows[0].n;await assert.rejects(f.call(plan),/TEST join failed/);assert.equal((await f.db.query('select count(*)::int n from calendar_audit_log')).rows[0].n,auditBefore,'failed batch rolls the audit back too');assert.deepEqual(await f.all('appointments'),stable);assert.deepEqual((await f.all('clients')).map(c=>c.sessions_remaining),clients.map(c=>c.sessions_remaining));
  for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(f.db.query("select calendar_join_pair_sessions('owner',gen_random_uuid(),'{}',false)"),/permission/);await f.db.exec('reset role');}
 }finally{await f.close()}
});
