const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(){
 const date='2099-07-23';
 const operators=[{id:'pt-a',nome:'Trainer',cognome:'Origine',email:'a@example.test'},{id:'pt-b',nome:'Trainer',cognome:'Destinazione',email:'b@example.test'}];
 const clients=[{id:'client-a',nome:'Cliente',cognome:'Trasferito',ptAssegnato:'pt-a',active:true},{id:'client-b',nome:'Cliente',cognome:'Collega',ptAssegnato:'pt-b',active:true}];
 const appointments=[{id:'moved',serviceId:'pt11',operatorId:'pt-b',clientIds:['client-a'],date,startTime:'10:00',durationMin:60,status:'prenotato'},
 {id:'next-session',serviceId:'pt11',operatorId:'pt-a',clientIds:['client-a'],date,startTime:'12:00',durationMin:60,status:'prenotato'},
 {id:'pair',serviceId:'pt12',operatorId:'pt-b',clientIds:['client-a','client-b'],date,startTime:'14:00',durationMin:60,status:'prenotato'}];
 const State={getClients:()=>clients,getOperators:()=>operators,getAppointments:()=>appointments};
 const c=vm.createContext({State,document:{addEventListener(){},querySelectorAll:()=>[]},window:{location:{search:''}},URLSearchParams,console});
 for(const name of ['config','services','app'])vm.runInContext(fs.readFileSync(path.join(__dirname,`../app/calendario-studio/js/${name}.js`),'utf8')+`\nglobalThis.test${name}=${name==='config'?'CONFIG':name==='services'?'Services':'App'};`,c);
 const app=c.testapp,services=c.testservices;
 const as=id=>{app.portalPt={enabled:id!=='direction',authorized:true,operator:operators.find(o=>o.id===id)||null};};
 const visible=()=>Array.from(services.getAppointmentsForDate(date),a=>a.id);
 return{app,services,as,visible,date,appointments,clients};
}
test('reassigned session is visible only to its current PT; later sessions keep their original assignment',()=>{
 const f=fixture();f.as('pt-a');assert.deepEqual(f.visible(),['next-session']);assert.equal(f.app.canEditClient('client-a'),true);
 assert.equal(f.app.canViewAppointment(f.appointments[0]),false);assert.equal(f.app.canEditAppointment(f.appointments[0]),false);
 f.as('pt-b');assert.deepEqual(f.visible(),['moved','pair']);assert.equal(f.app.canEditAppointment(f.appointments[0]),true,'substitute may work their assigned session without owning the client');assert.equal(f.app.canEditClient('client-a'),false);
 f.as('direction');assert.deepEqual(f.visible(),['moved','next-session','pair']);
 assert.equal(f.clients[0].ptAssegnato,'pt-a');assert.equal(f.appointments[1].operatorId,'pt-a');
});
test('fresh reassignment changes the agenda and its counters without removing the appointment from shared state',()=>{
 const f=fixture();f.appointments[0].operatorId='pt-a';f.as('pt-a');assert.deepEqual(f.visible(),['moved','next-session']);assert.equal(f.services.getKPIForDate(f.date).totalAppts,2);
 f.appointments[0].operatorId='pt-b';assert.deepEqual(f.visible(),['next-session']);assert.equal(f.services.getKPIForDate(f.date).totalAppts,1);
 assert.equal(f.appointments.length,3);assert.equal(f.services.getRoomLoadAt(f.date,'10:00',60,'pt'),1,'room occupancy still includes the other PT’s session');
 f.as('pt-b');assert.equal(f.services.getKPIForDate(f.date).totalAppts,2);
 f.appointments[0].operatorId='pt-a';assert.deepEqual(f.visible(),['pair'],'moving back removes the session from its former substitute');
});
test('ownership of one participant cannot expose a colleague’s pair, unassigned session or revoked access',()=>{
 const f=fixture();f.as('pt-a');assert.equal(f.app.canViewAppointment(f.appointments[2]),false);
 assert.equal(f.app.canViewAppointment({...f.appointments[0],operatorId:null}),false);
 f.app.portalPt.authorized=false;assert.deepEqual(f.visible(),[]);assert.equal(f.app.canViewAppointment(null),false);
});
test('legacy operator aliases still identify the assigned PT without using client ownership',()=>{
 const f=fixture();f.as('pt-b');for(const alias of ['pt-b',' B@EXAMPLE.TEST ','Trainer Destinazione'])assert.equal(f.app.canViewAppointment({...f.appointments[0],operatorId:alias}),true);
 f.as('pt-a');assert.equal(f.app.canViewAppointment({...f.appointments[0],operatorId:'b@example.test'}),false);
});
