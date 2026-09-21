const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const apple = require('../netlify/functions/lib/apple-calendar-package');
const root=path.join(__dirname,'../app/calendario-studio/js');
function setup({persisted=true}={}) {
  let rows=[];
  const client={id:'test',sessionsTotal:8,sessionsRemaining:8,packageStart:'2026-09-25',packageCycleStart:persisted?'2026-09-25':'',notes:''};
  class Clock extends Date {constructor(...args){super(...(args.length?args:['2026-09-21T10:00:00Z']));}}
  const ctx=vm.createContext({console,Date:Clock,document:{addEventListener(){}},CONFIG:{SERVICES:{pt11:{durationMin:60}},SHEETS:{enabled:false}},State:{getClients:()=>[client],getAppointments:()=>rows},UI:{showToast(){}},Calendar:{render(){}},confirm:()=>true});
  for(const name of ['services','app'])vm.runInContext(fs.readFileSync(path.join(root,name+'.js'),'utf8')+`\nthis.${name==='app'?'App':'Services'}=${name==='app'?'App':'Services'};`,ctx);
  vm.runInContext('UI.showToast=()=>{};',ctx);
  ctx.App.guardPackageManagement=()=>true;ctx.App.guardPortalEdit=()=>true;ctx.App._withPtAudit=n=>n;ctx.App.openPackageOverview=()=>{};
  const make=(id,date)=>({id,date,startTime:'11:00',durationMin:60,serviceId:'pt11',clientIds:['test'],status:'prenotato',notes:''});
  rows=['2026-09-25','2026-09-30','2026-10-02','2026-10-07','2026-10-09','2026-10-14','2026-10-16','2026-10-21'].map((d,i)=>make('a'+i,d));
  ctx.SupabaseSync={saveAppointmentAtomic:async appt=>{rows=rows.filter(a=>a.id!==appt.id).concat(appt);return{appointment:appt};}};
  return{ctx,client,make,get rows(){return rows;},set rows(v){rows=v;},metrics:()=>ctx.Services.getClientSessionMetrics(client)};
}
test('8 sedute: elimina ultima e aggiungi mercoledì prima del ciclo, nessuna mancante',async()=>{
  for(const persisted of [true,false]){
    const e=setup({persisted});assert.equal(e.metrics().toSchedule,0);
    e.rows=e.rows.slice(0,7);assert.equal(e.metrics().toSchedule,1);
    const added=await e.ctx.App._persistAppointment(e.make('early','2026-09-23'),null);
    assert.equal(e.metrics().scheduled,8);assert.equal(e.metrics().toSchedule,0);assert.equal(e.metrics().remaining,8);
    assert.ok(e.ctx.Services.appointmentInCurrentPackageCycle(added,e.client));
    assert.ok(apple.inCycle({date:added.date,notes:added.notes},{start:'2026-09-25',persisted,legacy:true,id:''}));
    await e.ctx.App._persistAppointment({...added,status:'fatto'},added);
    assert.equal(e.metrics().completed,1);assert.equal(e.metrics().remaining,7);assert.equal(e.metrics().toSchedule,0);
    e.rows=e.rows.filter(a=>a.id!=='early');assert.equal(e.metrics().toSchedule,1);
  }
});
test('spostare prima dell’inizio mantiene il ciclo senza alterare lo storico',async()=>{
  const e=setup();const before=e.rows[0];
  await e.ctx.App._persistAppointment({...before,date:'2026-09-23'},before);
  assert.equal(e.metrics().scheduled,8);assert.equal(e.metrics().toSchedule,0);
  const historic=e.make('old','2026-08-01');historic.status='fatto';
  assert.equal(e.ctx.App._preserveAppointmentPackage({...historic,startTime:'12:00'},historic).notes,'');
});
test('recupero della seduta già inserita aggiorna solo il collegamento, non crea duplicati',async()=>{
  const e=setup();e.rows=e.rows.slice(0,7).concat(e.make('early','2026-09-23'));
  assert.equal(e.metrics().toSchedule,1);
  await e.ctx.App._includeAppointmentInPackage('early','test');
  assert.equal(e.rows.length,8);assert.equal(e.rows.find(a=>a.id==='early').date,'2026-09-23');
  assert.equal(e.metrics().scheduled,8);assert.equal(e.metrics().toSchedule,0);
});
test('errore di salvataggio non cambia conteggi o seduta preesistente',async()=>{
  const e=setup();e.rows=e.rows.slice(0,7).concat(e.make('early','2026-09-23'));
  e.ctx.SupabaseSync.saveAppointmentAtomic=async()=>({error:'errore simulato'});
  await e.ctx.App._includeAppointmentInPackage('early','test');
  assert.equal(e.metrics().toSchedule,1);assert.equal(e.rows.find(a=>a.id==='early').notes,'');
});

test('rinnovi: le nuove sedute ricevono l’ID corrente e lo storico resta nel vecchio ciclo',async()=>{
  const e=setup();
  e.ctx.PackageLedger={parse:()=>({}),currentCycle:()=>({id:'current',startDate:'2026-09-25',legacy:false}),appointmentCycleId:notes=>String(notes||'').match(/\[CICLO-PACCHETTO-ID ([^\]]+)\]/)?.[1]||''};
  e.rows=e.rows.slice(0,7).map(a=>({...a,notes:'[CICLO-PACCHETTO-ID current]'}));
  const added=await e.ctx.App._persistAppointment(e.make('early','2026-09-23'),null);
  assert.match(added.notes,/CICLO-PACCHETTO-ID current/);assert.equal(e.metrics().toSchedule,0);
  const historical={...e.make('historical','2026-09-23'),notes:'[CICLO-PACCHETTO-ID previous]'};
  assert.equal(e.ctx.App._preserveAppointmentPackage({...historical,startTime:'12:00'},historical).notes,historical.notes);
  assert.equal(e.ctx.Services.appointmentInCurrentPackageCycle(historical,e.client),false);
});
