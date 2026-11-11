const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const path=require('node:path'),M=require('../app/calendario-studio/js/pt-session-model'),{open}=require('./helpers/calendar-recovery-db.cjs');
function uiFixture(){
 const clients=[{id:'a',nome:'Cliente',active:true,packageTypes:['PT 1:2'],sessionsTotal:12,sessionsRemaining:2,ptPartnerId:'b',ptAssegnato:'pt',serverUpdatedAt:'2026-11-11'},
  {id:'b',nome:'Partner',active:false,statoAbbonamento:'Ibernato',packageTypes:['PT 1:2'],sessionsTotal:12,sessionsRemaining:2,ptPartnerId:'a',ptAssegnato:'pt',serverUpdatedAt:'2026-11-11'}];
 const panels=[],toasts=[],rows=[],elements={};
 const context=vm.createContext({console,Intl,Date,crypto,window:{},document:{getElementById:id=>elements[id],querySelectorAll:()=>[]},
  App:{guardStudioManagement:()=>true},UI:{openModal:html=>panels.push(html),showToast:message=>toasts.push(message)},
  State:{getClients:()=>clients,getAppointments:()=>rows,getOperators:()=>[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]},
  Services:{getClient:id=>clients.find(c=>c.id===id),getClientSessionMetrics:()=>({completed:10,toSchedule:2}),getPackageCycleContext:c=>({id:'cycle-'+c.id,start:'2026-10-01'}),serviceUsesPackageSessions:()=>true,appointmentInCurrentPackageCycle:()=>true,timeToMin:t=>Number(t.slice(0,2))*60+Number(t.slice(3))},
  PTSessionModel:require('../app/calendario-studio/js/pt-session-model')});
 vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/pt-pair-sessions.js','utf8'),context);
 return {api:context.window.PTPairSessions,clients,panels,toasts,rows,elements};
}
test('a suspended partner offers solo recovery instead of an unusable empty partner selector',async()=>{
 const f=uiFixture();await f.api.open('a',false);
 assert.match(f.panels.at(-1),/Recupera da solo/);
 assert.doesNotMatch(f.panels.at(-1),/id="pair-partner"/);
 assert.equal(f.clients[1].active,false);assert.equal(f.clients[1].sessionsRemaining,2);
});
test('solo planning keeps one active participant, the current package and individual service',()=>{
 const f=uiFixture();f.api.openSolo('a');assert.match(f.panels.at(-1),/Recuperi individuali/);assert.match(f.panels.at(-1),/value="2"/);
 const input={start:'2099-11-02',time:'17:00',operatorId:'pt',days:[1,3],count:2};
 const plan=f.api.buildSoloPlan(input,f.clients[0],f.clients[1],f.rows);
 assert.equal(plan.mode,'pair_solo');assert.equal(plan.suspendedPartnerId,'b');assert.equal(plan.clients.length,1);assert.equal(plan.clients[0].renewal,null);
 for(const a of plan.appointments){assert.equal(a.service_id,'pt11');assert.deepEqual(Array.from(a.client_ids),['a']);assert.match(a.notes,/cycle-a/);}
 assert.throws(()=>f.api.buildSoloPlan({...input,count:3},f.clients[0],f.clients[1],[]),/Residuo/);
 f.clients[1].active=true;f.clients[1].statoAbbonamento='Attivo';assert.throws(()=>f.api.buildSoloPlan(input,f.clients[0],f.clients[1],[]),/partner sospeso/);
});
async function sqlFixture(){
 const f=await open(true);await f.db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261111100621_calendar_pair_solo_recovery.sql'),'utf8'));
 const source=await f.seed(true),d=M.read(source);for(const p of Object.values(d.participants))p.status='fatto';
 await f.write(M.write({...source,id:'done-10',date:'2099-10-25',status:'fatto'},d));
 for(const a of (await f.all('appointments')).filter(a=>a.status==='prenotato'))await f.write({...a,status:'annullato'},a);
 await f.patch({id:'b',active:false,stato_abbonamento:'Ibernato'});
 const build=async(count=2)=>{
  const c=(await f.all('clients')).find(c=>c.id==='a');return {requestId:crypto.randomUUID(),mode:'pair_solo',suspendedPartnerId:'b',clients:[{id:'a',expectedUpdatedAt:c.updated_at,renewal:null}],appointments:Array.from({length:count},(_,i)=>({id:'solo-'+crypto.randomUUID(),service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-'+String(10+i).padStart(2,'0'),start_time:'17:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'FORGED cycle'}))};
 };
 // Keep request ID outside the canonical payload, as the authenticated gateway does.
 const commit=(plan,actor='owner')=>{const {requestId,...payload}=plan;return f.rpc('calendar_plan_pair_solo',[actor,requestId,JSON.stringify(payload)])};
 return {...f,build,commit};
}
test('two individual recoveries persist and reopen; only the active package is consumed, old PT hours and partner stay intact',async()=>{
 const f=await sqlFixture();try{
  const clients=await f.all('clients'),before=await f.all('appointments'),p=await f.build();assert.deepEqual(clients.map(c=>c.sessions_remaining),[2,2]);
  const r=await f.commit(p);assert.equal(r.appointments.length,2);assert.deepEqual(await f.all('clients'),clients,'planning never consumes or renews');
  const reopened=(await f.all('appointments')).filter(a=>p.appointments.some(x=>x.id===a.id));assert.equal(reopened.length,2);
  for(const a of reopened){assert.equal(a.service_id,'pt11');assert.deepEqual(a.client_ids,['a']);assert.match(a.notes,/CICLO-PACCHETTO-ID cycle-a/);assert.doesNotMatch(a.notes,/FORGED/);}
  assert.deepEqual((await f.commit(p)).appointments,r.appointments,'same request cannot duplicate bookings');
  const done=(await f.write({...reopened[0],status:'fatto'},reopened[0])).appointment;
  const retry=await f.commit(p);assert.equal(retry.clients[0].sessions_remaining,1);assert.equal(retry.appointments.find(a=>a.id===done.id).status,'fatto','retry returns current server data');
  await f.write({...reopened[1],status:'fatto'},reopened[1]);
  const after=await f.all('appointments'),savedClients=await f.all('clients');assert.equal(savedClients.find(c=>c.id==='a').sessions_remaining,0);assert.deepEqual(savedClients.find(c=>c.id==='b'),clients.find(c=>c.id==='b'));
  for(const old of before)assert.deepEqual(after.find(a=>a.id===old.id),old);
  const hours=M.summary(after,'2099-11').totals[0];assert.equal(hours.earnedMin,120);assert.equal(hours.cents,2000);
  for(const key of ['notes','package_types','sessions_total','package_start','data_conferma','pt_partner_id'])assert.deepEqual(savedClients[0][key],clients[0][key]);
 }finally{await f.close()}
});
test('server bounds capacity and trainer, requires the suspended linked partner, and rolls back a failed batch',async()=>{
 const f=await sqlFixture();try{
  const before=await f.all('appointments'),p=await f.build();
  await assert.rejects(f.commit(p,'pt'),/Direzione/);await assert.rejects(f.commit(await f.build(3)),/residuo/);
  await assert.rejects(f.commit({...p,appointments:p.appointments.map(a=>({...a,client_ids:['a','b']}))}),/non valida/);
  await assert.rejects(f.commit({...p,appointments:p.appointments.map(a=>({...a,operator_id:'other'}))}),/non valida/);
  await assert.rejects(f.commit({...p,suspendedPartnerId:'other'}),/partner sospeso/);
  await f.patch({id:'b',active:true,stato_abbonamento:'Attivo'});await assert.rejects(f.commit(p),/partner sospeso/);await f.patch({id:'b',active:false,stato_abbonamento:'Ibernato'});
  const failId=p.appointments[1].id;await f.db.exec(`create function fail_solo() returns trigger language plpgsql as $$begin if new.id='${failId}' then raise exception 'TEST solo write failed';end if;return new;end$$;create trigger fail_solo before insert on appointments for each row execute function fail_solo()`);
  await assert.rejects(f.commit(p),/TEST solo write failed/);assert.deepEqual(await f.all('appointments'),before);assert.equal((await f.all('clients'))[0].sessions_remaining,2);
  await f.db.exec('drop trigger fail_solo on appointments');await f.commit(p);
  await assert.rejects(f.commit({...p,appointments:p.appointments.slice(0,1)}),/Identificativo/);
  await f.db.exec('set role anon');await assert.rejects(f.db.query("select calendar_plan_pair_solo('owner',gen_random_uuid(),'{}')"),/permission denied/);await f.db.exec('reset role');
 }finally{await f.close()}
});
test('cancelling an individual recovery creates only an individual replacement and never touches the suspended partner',async()=>{
 const f=await sqlFixture();try{
  const r=await f.commit(await f.build(1)),before=(await f.all('clients')).find(c=>c.id==='b');
  const cancelled=await f.recover(r.appointments[0]);assert.equal(cancelled.recovery.service_id,'pt11');assert.deepEqual(cancelled.recovery.client_ids,['a']);assert.deepEqual((await f.all('clients')).find(c=>c.id==='b'),before);
  assert.equal((await f.all('clients')).find(c=>c.id==='a').sessions_remaining,2);
 }finally{await f.close()}
});
