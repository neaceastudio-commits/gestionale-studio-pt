const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../app/calendario-studio/js/pt-session-model');
function fixture(){
 const client={id:'c',nome:'Cliente',active:true,packageTypes:['PT 1:1'],sessionsTotal:8,sessionsRemaining:0,packageCycleStart:'2026-09-15'};
 const a=(id,extra={})=>({id,serviceId:'pt11',clientIds:['c'],operatorId:null,date:'2026-09-15',startTime:'16:00',durationMin:60,bufferMin:0,status:'fatto',notes:'[CICLO-PACCHETTO 2026-09-15]',...extra});
 const old=a('old',{status:'prenotato',date:'2026-05-05'}),rows=[...Array.from({length:8},(_,i)=>a('other'+i,{clientIds:['other'],date:'2026-09-25'})),...Array.from({length:8},(_,i)=>a('done'+i,{date:'2026-09-'+String(16+i).padStart(2,'0')})),old];
 const context={console,State:{getClients:()=>[client,{...client,id:'other'}],getAppointments:()=>rows,getOperators:()=>[]},CONFIG:{SERVICES:{pt11:{id:'pt11',label:'PT',room:'pt',roomLoad:1},pt12:{id:'pt12',label:'Coppia'}},PACKAGE_SERVICE_MAP:{'PT 1:1':['pt11','pt12']},ROOMS:{pt:{id:'pt',max:1,label:'PT'}}},PTSessionModel:M};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/services.js','utf8')+'\nglobalThis.services=Services;',context);return {s:context.services,old,rows};
}
test('exhausted package allows correction of existing reservation and cancellation, including occupied slots',()=>{
 const {s,old,rows}=fixture();assert.equal(s.getClientSessionMetrics(s.getClient('c')).remaining,0);
 assert.equal(s.canBookAppointment({...old,date:'2026-10-15'}).ok,true);
 rows.push({...old,id:'occupant',date:'2026-10-15',clientIds:['other']});assert.equal(s.canBookAppointment({...old,date:'2026-10-15',status:'annullato'}).ok,true);
 assert.equal(s.canBookAppointment({...old,date:'2026-10-15'}).ok,false); // room checks still apply to moves
});
test('no bypass for new bookings, fabricated IDs, new participants, new cycle, reactivation or consumption',()=>{
 const {s,old,rows}=fixture();
 for(const draft of [{...old,id:undefined},{...old,id:'unknown'},{...old,clientIds:['other']},{...old,notes:'[CICLO-PACCHETTO 2026-10-15]'},{...old,status:'fatto'},M.withStatus(old,'noshow_charged')])assert.match(s.canBookAppointment(draft).errors.join(' '),/non ha sessioni rimanenti/);
 rows[rows.length-1]={...old,status:'annullato'};assert.match(s.canBookAppointment(old).errors.join(' '),/non ha sessioni rimanenti/);
});
