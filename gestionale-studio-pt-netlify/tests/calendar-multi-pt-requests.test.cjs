const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const js = path.join(__dirname, '../app/calendario-studio/js');
function setup() {
  const clients = [{id:'c',ptAssegnato:'a',active:true}, {id:'other',ptAssegnato:'z',active:true}];
  const operators = ['a','b'].map(id=>({id,nome:id,roles:['PT'],active:true}));
  const appointments = [{id:'one',operatorId:'b',clientIds:['c'],date:'2026-09-28',startTime:'11:00',durationMin:60,status:'prenotato'}];
  const availability = Object.fromEntries(operators.map(op=>[op.id,{mon:{slots:['09:00-10:00','10:00-11:00','11:00-12:00']},tue:{slots:['10:00-11:00']}}]));
  let roomLoad=0;
  const context = vm.createContext({window:{location:{search:''},addEventListener(){}},location:{search:''},URLSearchParams,console,setTimeout(){},
    document:{addEventListener(){},getElementById(){return null},querySelectorAll(){return []}},localStorage:{getItem(){return JSON.stringify(availability)}},
    State:{getAppointments:()=>appointments,getClients:()=>clients,getOperators:()=>operators},CONFIG:{},
    Services:{getService:()=>({id:'pt11',roles:['PT'],durationMin:60,room:'r',roomLoad:1}), getRoomLoadAt:()=>roomLoad,getRoomMax:()=>2}
  });
  vm.runInContext(fs.readFileSync(path.join(js,'app.js'),'utf8')+';globalThis.app=App;',context);
  vm.runInContext(fs.readFileSync(path.join(js,'pt-availability-overview.js'),'utf8'),context);
  context.app.portalPt={enabled:true,authorized:true,operator:operators[1]};
  return {app:context.app,api:context.window.PTAvailabilityOverview,appointments,availability,setRoomLoad(n){roomLoad=n}};
}
test('session PT edits own session with another referent, without gaining client/program or package rights',()=>{
  const {app,appointments}=setup();
  assert.equal(app.canEditAppointment(appointments[0]),true);
  assert.equal(app.canEditClient('c'),false);
  assert.equal(app.canManagePackage('c'),false);
  assert.equal(app.canEditAppointment({...appointments[0],clientIds:['c','other']}),false);
  assert.equal(app.canEditAppointment({...appointments[0],id:null}),false);
  assert.equal(app.canEditAppointment({...appointments[0],id:'invented'}),false);
  app.portalPt.operator={id:'a'};
  assert.equal(app.canEditAppointment(appointments[0]),false);
  assert.equal(app.canEditAppointment({...appointments[0],operatorId:'a'}),false,'cannot take over by changing the draft');
  assert.equal(app.canEditAppointment({operatorId:'a',clientIds:['c']}),true,'referent can still create sessions for their own client');
  app.portalPt.authorized=false;
  assert.equal(app.canEditAppointment(appointments[0]),false);
});
test('exact times cross adjacent declared slots and return different PTs by individual request',()=>{
  const {api,appointments}=setup();
  let result=api.evaluateRequest({date:'2026-09-28',time:'09:30',duration:60},'c','pt11');
  assert.equal(result.operators.filter(o=>o.available).length,2);
  appointments.push({operatorId:'a',clientIds:['other'],date:'2026-09-28',startTime:'09:30',durationMin:60,status:'prenotato'});
  result=api.evaluateRequest({date:'2026-09-28',time:'09:30',duration:60},'c','pt11');
  assert.deepEqual(Array.from(result.operators.filter(o=>o.available),o=>o.op.id),['b']);
  assert.equal(api.evaluateRequest({date:'2026-09-29',time:'09:30',duration:60},'c','pt11').operators.some(o=>o.available),false);
});
test('client conflicts, occupied PTs, cancellation, invalid dates, gaps and full rooms',()=>{
  const {api,appointments,availability,setRoomLoad}=setup();
  const row={date:'2026-09-28',time:'11:00',duration:60};
  assert.match(api.evaluateRequest(row,'c','pt11').error,/già una seduta/);
  assert.equal(api.evaluateRequest(row,'','pt11').operators.find(o=>o.op.id==='b').available,false);
  appointments[0].status='annullato';
  assert.equal(api.evaluateRequest(row,'c','pt11').operators.filter(o=>o.available).length,2);
  setRoomLoad(2);
  assert.equal(api.evaluateRequest(row,'c','pt11').operators.every(o=>o.reason==='Sala piena'),true);
  assert.ok(api.evaluateRequest({...row,date:'2026-02-30'},'c','pt11').error);
  assert.ok(api.evaluateRequest({...row,time:'24:00'},'c','pt11').error);
  assert.ok(api.evaluateRequest({...row,duration:0},'c','pt11').error);
  setRoomLoad(0);
  assert.equal(api.evaluateRequest({...row,time:'12:00'},'c','pt11').operators.some(o=>o.available),false);
});
