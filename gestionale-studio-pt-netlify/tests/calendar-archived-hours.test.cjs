const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../app/calendario-studio/js/pt-session-model');
const serviceSource=fs.readFileSync(__dirname+'/../app/calendario-studio/js/services.js','utf8');
const clientsSource=fs.readFileSync(__dirname+'/../app/calendario-studio/js/clients.js','utf8');
const context=(clients,appointments)=>{
 const state={getClients:()=>clients,getAppointments:()=>appointments,getOperators:()=>[{id:'pt',nome:'Trainer',cognome:'Esempio',active:true}],saveClients:x=>clients=x,saveAppointments:x=>appointments=x};
 const c={console,State:state,CONFIG:{SERVICES:{pt11:{id:'pt11'},pt12:{id:'pt12'},nutrizione:{id:'nutrizione'},blocco:{id:'blocco',isBlock:true}}},PTSessionModel:M};vm.createContext(c);vm.runInContext(serviceSource+'\nglobalThis.services=Services;',c);return c;
};
const a=(id,serviceId='pt11',status='fatto',extra={})=>({id,serviceId,status,clientIds:['a'],operatorId:'pt',date:'2026-10-01',startTime:'09:00',durationMin:60,notes:'',...extra});
test('completed hours and full pair identity survive archive, suspension and missing client record',()=>{
 const pair=M.write(a('pair','pt12','fatto',{clientIds:['a','b'],startTime:'10:00'}),{version:1,participants:{a:{status:'fatto'},b:{status:'fatto'}}});
 const appts=[a('done'),pair,a('future','pt11','prenotato',{date:'2099-10-01'})];
 for(const clients of [[{id:'a',active:true},{id:'b',active:true}],[{id:'a',active:false},{id:'b',active:true}],[{id:'a',active:true,statoAbbonamento:'Ibernato'},{id:'b',active:true}],[{id:'b',active:true}],[]]){
  const c=context(clients,appts);const visible=appts.slice(0,2).map(c.services.getVisibleAppointment);assert.equal(visible.filter(Boolean).length,2);assert.deepEqual(visible[1].clientIds,['a','b']);
  const total=M.summary(visible,'2026-10').totals[0];assert.equal(total.workedMin,120);assert.equal(total.earnedMin,120);assert.equal(total.cents,2500);
 }
 assert.equal(context([],appts).services.isAppointmentVisible(appts[2]),false);
});
test('archiving cancels only future bookings; closed presences and charged absences are untouched',async()=>{
 const closed=a('done','pt11','fatto',{date:'2099-01-01'}),absence=M.withStatus(a('charged','pt11','prenotato',{date:'2099-01-02'}),'noshow_charged');
 const pair=M.write(a('pair-done','pt12','fatto',{date:'2099-01-03',clientIds:['a','b']}),{version:1,participants:{a:{status:'fatto'},b:{status:'noshow'}}});
 const futurePair=M.write(a('pair-future','pt12','prenotato',{date:'2099-01-04',clientIds:['a','b']}),{version:1,participants:{a:{status:'prenotato'},b:{status:'prenotato'}}});
 const future=a('future','pt11','prenotato',{date:'2099-01-05'});
 const c=context([{id:'a',nome:'Cliente',active:true},{id:'b',nome:'Partner',active:true}],[closed,absence,pair,futurePair,future]);const writes=[];
 Object.assign(c,{confirm:()=>true,App:{guardStudioManagement:()=>true,guardPortalEdit:()=>true},SupabaseSync:{saveAppointmentAtomic:async()=>{throw Error('Archive must not create recovery')},archiveClient:async (client,x)=>{assert.ok(x.expectedAppointments.every(a=>a.status==='prenotato'));const updates=x.expectedAppointments.map(a=>({...a,status:'annullato'}));writes.push(...updates);c.State.saveAppointments(c.State.getAppointments().map(a=>updates.find(x=>x.id===a.id)||a));return {...client,active:false,statoAbbonamento:x.statoAbbonamento}}},UI:{showToast(){},closeModal(){}}});
 const begin=clientsSource.indexOf('  async function moveToHistory('),end=clientsSource.indexOf('  function alignResidual(');
 vm.runInContext("const Clients=(()=>{let viewMode='active';const todayStr=()=> '2026-10-13';const render=()=>{};"+clientsSource.slice(begin,end)+"return {confirmDelete};})();globalThis.clientActions=Clients;",c);
 await c.clientActions.confirmDelete('a');
 assert.deepEqual(writes.map(x=>x.id).sort(),['future','pair-future']);assert.equal(writes.find(x=>x.id==='pair-future').status,'annullato');assert.deepEqual(writes.find(x=>x.id==='pair-future').clientIds,['a','b']);
 for(const original of [closed,absence,pair])assert.deepEqual(c.State.getAppointments().find(x=>x.id===original.id),original);
 assert.equal(c.State.getClients()[0].active,false);
});
test('a lesson closed by another PT during archiving is not cancelled or overwritten',async()=>{
 const future=a('race','pt11','prenotato',{date:'2026-10-13'}),c=context([{id:'a',nome:'Cliente',active:true}],[future]);let clientWrites=0;
 Object.assign(c,{confirm:()=>true,App:{guardStudioManagement:()=>true,guardPortalEdit:()=>true},SupabaseSync:{saveAppointmentAtomic:async()=>{throw Error('Archive must not create recovery')},archiveClient:async (_,p)=>{assert.equal(p.expectedAppointments[0].status,'prenotato');c.State.saveAppointments([{...future,status:'fatto'}]);return {error:'Appointment changed'}}},UI:{showToast(){},closeModal(){}}});
 const begin=clientsSource.indexOf('  async function moveToHistory('),end=clientsSource.indexOf('  function alignResidual(');
 vm.runInContext("const Clients=(()=>{let viewMode='active';const todayStr=()=> '2026-10-13';const render=()=>{};"+clientsSource.slice(begin,end)+"return {confirmDelete};})();globalThis.clientActions=Clients;",c);
 await c.clientActions.confirmDelete('a');assert.equal(clientWrites,0);assert.equal(c.State.getClients()[0].active,true);assert.equal(c.State.getAppointments()[0].status,'fatto');
});
