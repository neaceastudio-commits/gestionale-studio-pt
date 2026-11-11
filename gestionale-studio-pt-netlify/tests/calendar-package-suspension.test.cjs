const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {open}=require('./helpers/calendar-recovery-db.cjs');
const M=require('../app/calendario-studio/js/pt-session-model');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration=()=>fs.readdirSync(path.join(root,'supabase/migrations')).find(x=>x.endsWith('_calendar_package_suspension.sql'));
async function fixture(){
 const f=await open();await f.db.exec(read('supabase/migrations/20260912225335_calendar_audit_assignment_partial_unique.sql'));if(migration())await f.db.exec(read('supabase/migrations/'+migration()));
 const source=await f.seed();
 // Same blocking condition as the reported case: two more bookings than residual lessons.
 for(let i=0;i<3;i++)await f.write({...source,id:'extra-'+i,date:'2099-11-'+String(10+i).padStart(2,'0')});
 return f;
}
const lifecycle=(f,p)=>f.rpc('calendar_client_lifecycle',['owner',require('node:crypto').randomUUID(),JSON.stringify(p)]);
async function payload(f,status='Ibernato'){
 const client=(await f.all('clients'))[0];
 return {clientId:client.id,action:'archive',status,expectedUpdatedAt:client.updated_at,expectedAppointments:(await f.all('appointments')).filter(a=>a.status==='prenotato'&&a.date>='2026-11-11')};
}
async function frontend(f){
 let clients=await f.all('clients'),appointments=await f.all('appointments');const calls=[],toasts=[];
 const c={console,CONFIG:{SHEETS:{enabled:false}},localStorage:{setItem(){}},confirm:()=>true,App:{guardStudioManagement:()=>true,guardPortalEdit:()=>true,openPackageOverview(){},openEditPackage(){throw Error('Reactivation must not start a renewal')}},UI:{showToast:(...x)=>toasts.push(x),closeModal(){}},State:{getClients:()=>clients,getAppointments:()=>appointments,saveClients:x=>clients=x,saveAppointments:x=>appointments=x},fetch:async url=>({ok:true,status:200,text:async()=>JSON.stringify((await f.all('clients')).filter(r=>'eq.'+r.id===new URL(url).searchParams.get('id')))})};
 c.CalendarAudit={call:async(op,p)=>{calls.push(op);try{if(op==='client_lifecycle')return await lifecycle(f,p);if(op==='cancel_and_recover')return await f.recover(p.expected);throw Error('Unexpected '+op)}catch(e){return {error:e.message}}},write:async()=>{throw Error('No separate appointment/client writes allowed')}};c.window={CalendarAudit:c.CalendarAudit};
 vm.createContext(c);vm.runInContext(read('app/calendario-studio/js/supabase.js')+'\nglobalThis.sync=SupabaseSync;',c);
 clients=clients.map(r=>({id:r.id,nome:r.nome,active:r.active,serverUpdatedAt:r.updated_at,statoAbbonamento:r.stato_abbonamento}));
 appointments=appointments.map(r=>({id:r.id,serviceId:r.service_id,clientIds:r.client_ids,operatorId:r.operator_id,date:r.date,startTime:r.start_time.slice(0,5),durationMin:r.duration_min,bufferMin:r.buffer_min,status:r.status,notes:r.notes}));
 c.SupabaseSync=c.sync;
 const source=read('app/calendario-studio/js/clients.js'),begin=source.indexOf('  async function moveToHistory('),end=source.indexOf('  function alignResidual(');
 vm.runInContext("globalThis.actions=(()=>{let viewMode='active';const todayStr=()=> '2026-11-11',render=()=>{};"+source.slice(begin,end)+"return {confirmDelete,reactivate,markNotRenewing,...(typeof suspend==='function'?{suspend}:{})};})();",c);
 return {c,calls,toasts};
}
test('archive works with excess bookings without recovery; completed PT hours and package survive reopening',async()=>{
 const f=await fixture();try{
  const beforeClients=await f.all('clients'),before=await f.all('appointments'),hours=M.summary(before,'2099-10').totals;
  const ui=await frontend(f);await ui.c.actions.confirmDelete('a');
  const reopened=(await f.all('clients'))[0];assert.equal(reopened.active,false,JSON.stringify(ui.toasts));
  assert.ok(!ui.calls.includes('cancel_and_recover'));
  for(const key of ['notes','sessions_total','sessions_remaining','package_start','data_conferma','pt_assegnato'])assert.deepEqual(reopened[key],beforeClients[0][key],key);
  const after=await f.all('appointments');assert.ok(before.filter(a=>a.status==='prenotato').every(a=>after.find(x=>x.id===a.id).status==='annullato'));
  for(const closed of before.filter(a=>a.status!=='prenotato'))assert.deepEqual(after.find(a=>a.id===closed.id),closed);
  assert.deepEqual(M.summary(after,'2099-10').totals,hours);assert.equal(after.length,before.length);
 }finally{await f.close()}
});
test('suspend and reactivate reopen the same package, payments and residual; retry never schedules lessons',async()=>{
 const f=await fixture();try{
  const before=(await f.all('clients'))[0],count=(await f.all('appointments')).length;
  const ui=await frontend(f);await ui.c.actions.suspend('a');
  let archived=(await f.all('clients'))[0];assert.equal(archived.active,false);assert.equal(archived.stato_abbonamento,'Ibernato');
  const retry=await lifecycle(f,{...(await payload(f)),expectedUpdatedAt:before.updated_at,expectedAppointments:[]});assert.equal(retry.client.active,false);
  const reopenedUI=await frontend(f);await reopenedUI.c.actions.reactivate('a');
  const active=(await f.all('clients'))[0];for(const key of Object.keys(before).filter(k=>!['updated_at','stato_abbonamento'].includes(k)))assert.deepEqual(active[key],before[key],key);
  assert.equal(active.stato_abbonamento,'Attivo');assert.equal((await f.all('appointments')).length,count);assert.ok(!(await f.all('appointments')).some(a=>a.status==='prenotato'));
  const idempotent=await lifecycle(f,{clientId:'a',action:'reactivate',expectedUpdatedAt:archived.updated_at});assert.deepEqual(idempotent.client,active);
 }finally{await f.close()}
});
test('any failure rolls back all cancellations, including audit, before a safe retry',async()=>{
 const f=await fixture();try{
  const p=await payload(f),clients=await f.all('clients'),rows=await f.all('appointments'),audit=(await f.db.query('select * from calendar_audit_log order by id')).rows;
  await f.db.exec(`create function reject_suspend() returns trigger language plpgsql as $$begin if new.active=false then raise exception 'TEST suspend rejected';end if;return new;end$$;create trigger reject_suspend before update on clients for each row execute function reject_suspend()`);
  await assert.rejects(lifecycle(f,p),/TEST suspend rejected/);assert.deepEqual(await f.all('clients'),clients);assert.deepEqual(await f.all('appointments'),rows);assert.deepEqual((await f.db.query('select * from calendar_audit_log order by id')).rows,audit);
  await f.db.exec('drop trigger reject_suspend on clients');assert.equal((await lifecycle(f,p)).client.active,false);
 }finally{await f.close()}
});
test('concurrent attendance and new reservations invalidate the preview, preserving completed work',async()=>{
 const f=await fixture();try{
  const p=await payload(f),source=(await f.all('appointments')).find(a=>a.id==='source');
  const done=(await f.write({...source,status:'fatto'},source)).appointment;
  await assert.rejects(lifecycle(f,p),/cambiat/i);assert.equal((await f.all('clients'))[0].active,true);assert.deepEqual((await f.all('appointments')).find(a=>a.id===done.id),done);
  const p2=await payload(f);await f.write({...source,id:'concurrent-new'});
  await assert.rejects(lifecycle(f,p2),/cambiat/i);assert.equal((await f.all('clients'))[0].active,true);
  await lifecycle(f,await payload(f));assert.deepEqual((await f.all('appointments')).find(a=>a.id===done.id),done);
 }finally{await f.close()}
});
test('server requires the owner, rejects arbitrary status and isolates the selected client',async()=>{
 const f=await fixture();try{
  const p=await payload(f),before=await f.all('appointments');
  await assert.rejects(f.rpc('calendar_client_lifecycle',['pt',require('node:crypto').randomUUID(),JSON.stringify(p)]),/Owner/);
  await assert.rejects(lifecycle(f,{...p,status:'invented'}),/non valida/);
  await assert.rejects(lifecycle(f,{...p,clientId:'missing'}),/non trovato/);
  assert.deepEqual(await f.all('appointments'),before);
  await f.db.exec('set role anon');await assert.rejects(f.db.query("select calendar_client_lifecycle('owner',gen_random_uuid(),'{}')"),/permission denied/);await f.db.exec('reset role');
  await f.rpc('calendar_audit_write',['owner','owner','calendar',require('node:crypto').randomUUID(),'client',JSON.stringify({method:'POST',rows:[{id:'unrelated',nome:'Other',active:true}]})]);
  const other=(await f.all('clients')).find(c=>c.id==='unrelated');await lifecycle(f,p);assert.deepEqual((await f.all('clients')).find(c=>c.id==='unrelated'),other);
 }finally{await f.close()}
});
test('future pairs cancel as a pair without refunding closed presences or charged absences for either person',async()=>{
 const f=await open(true);try{
  await f.db.exec(read('supabase/migrations/'+migration()));const source=await f.seed(true);
  let data=M.read(source);for(const participant of Object.values(data.participants))participant.status='noshow';
  await f.write(M.write({...source,id:'charged',date:'2099-10-20',status:'noshow'},data));
  const clients=await f.all('clients'),before=await f.all('appointments'),hours=M.summary(before,'2099-10').totals;
  await lifecycle(f,await payload(f));const after=await f.all('appointments');
  assert.deepEqual(after.find(a=>a.id==='charged'),before.find(a=>a.id==='charged'));assert.deepEqual(M.summary(after,'2099-10').totals,hours);
  for(const c of clients){const saved=(await f.all('clients')).find(x=>x.id===c.id);assert.equal(saved.sessions_remaining,c.sessions_remaining);assert.equal(saved.notes,c.notes);if(c.id==='b')assert.deepEqual(saved,c);}
  assert.deepEqual(after.find(a=>a.id==='source').client_ids,['a','b']);assert.equal(after.find(a=>a.id==='source').status,'annullato');
 }finally{await f.close()}
});
test('legacy ledger-free package, cancelled dialog and network error preserve data without false success',async()=>{
 const f=await fixture();try{
  await f.patch({id:'a',notes:'[CICLO-PACCHETTO 2099-10-01]'});
  const ui=await frontend(f),before=await f.all('appointments');ui.c.confirm=()=>false;await ui.c.actions.suspend('a');assert.deepEqual(ui.calls,[]);assert.deepEqual(await f.all('appointments'),before);
  ui.c.confirm=()=>true;ui.c.CalendarAudit.call=async()=>({error:'Rete assente'});await ui.c.actions.suspend('a');assert.equal(ui.c.State.getClients()[0].active,true);assert.equal((await f.all('clients'))[0].active,true);
  await lifecycle(f,await payload(f));assert.equal((await f.all('clients'))[0].notes,'[CICLO-PACCHETTO 2099-10-01]');
 }finally{await f.close()}
});
test('lost server response and failed readback can be retried without false success or leftover local bookings',async()=>{
 const f=await fixture();try{
  const ui=await frontend(f),call=ui.c.CalendarAudit.call,fetch=ui.c.fetch;
  ui.c.CalendarAudit.call=async(...args)=>{await call(...args);return {error:'Risposta persa'}};
  await ui.c.actions.suspend('a');assert.equal((await f.all('clients'))[0].active,false);assert.equal(ui.c.State.getClients()[0].active,true);
  ui.c.CalendarAudit.call=call;ui.c.fetch=async()=>({ok:false,status:503,text:async()=>'Rilettura non disponibile'});
  await ui.c.actions.suspend('a');assert.equal(ui.c.State.getClients()[0].active,true);assert.ok(!ui.toasts.some(t=>t[1]==='success'));
  ui.c.fetch=fetch;await ui.c.actions.suspend('a');assert.equal(ui.c.State.getClients()[0].active,false);assert.ok(!ui.c.State.getAppointments().some(a=>a.status==='prenotato'));
  assert.equal((await f.all('clients'))[0].sessions_remaining,3);assert.ok(!(await f.all('appointments')).some(a=>a.id.startsWith('recovery_')));
 }finally{await f.close()}
});
test('a future group removes only the suspended person; other clients, bookings and balance remain',async()=>{
 const f=await fixture();try{
  await f.rpc('calendar_audit_write',['owner','owner','calendar',require('node:crypto').randomUUID(),'client',JSON.stringify({method:'POST',rows:[{id:'group-partner',nome:'Other',active:true,sessions_total:8,sessions_remaining:8,pt_assegnato:'pt'}]})]);
  await f.write({id:'group',service_id:'circuit',client_ids:['a','group-partner'],operator_id:'pt',date:'2099-12-20',start_time:'10:00',duration_min:60,buffer_min:0,status:'prenotato',notes:''});
  const before=(await f.all('clients')).find(c=>c.id==='group-partner');await lifecycle(f,await payload(f));
  const saved=(await f.all('appointments')).find(a=>a.id==='group');assert.deepEqual(saved.client_ids,['group-partner']);assert.equal(saved.status,'prenotato');assert.deepEqual((await f.all('clients')).find(c=>c.id==='group-partner'),before);
 }finally{await f.close()}
});
