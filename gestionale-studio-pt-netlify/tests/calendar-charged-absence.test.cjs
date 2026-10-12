const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../app/calendario-studio/js/pt-session-model');
const a={id:'a',serviceId:'pt11',clientIds:['c'],date:'2026-10-12',status:'prenotato',notes:'Motivo\n[CICLO-PACCHETTO 2026-10-01]'};
const statuses={prenotato:{label:'Prenotato'},fatto:{label:'Fatto'},noshow:{label:'No-show'},annullato:{label:'Annullato'}};
test('only charge/no recovery versus cancellation/recovery; old absences are preserved',()=>{
 const charged=M.withStatus(a,'noshow_charged');assert.equal(charged.status,'noshow');assert.equal(M.chargedAbsence(charged,'c'),true);assert.equal(M.statusValue(charged),'noshow_charged');
 assert.equal(M.withStatus(charged,'noshow_charged').notes,charged.notes);assert.equal(M.strip(charged.notes),a.notes);
 assert.equal(M.chargedAbsence(M.withStatus(charged,'annullato'),'c'),false);
 assert.equal(M.chargedAbsence(M.withStatus(charged,'fatto'),'c'),false);
 assert.equal(M.chargedAbsence({...a,status:'noshow'},'c'),false);
 const options=M.statusOptions(a,statuses);assert.equal(options.some(o=>o.value==='noshow'),false);assert.equal(options.find(o=>o.value==='noshow_charged').label,'Non svolta · seduta scalata');assert.equal(options.find(o=>o.value==='annullato').label,'Annullata · da recuperare');
 assert.throws(()=>M.withStatus({...a,serviceId:'nutrizione'},'noshow_charged'),/pacchetto/);
});
test('charged absence consumes one, never increases completed or to schedule; reversible',()=>{
 let appointments=[];
 const client={id:'c',sessionsTotal:8,sessionsRemaining:8,packageCycleStart:'2026-10-01'};
 const context={CONFIG:{SERVICES:{pt11:{id:'pt11'}}},State:{getAppointments:()=>appointments},PTSessionModel:M};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/services.js','utf8')+'\nglobalThis.s=Services',context);
 const planned=Array.from({length:8},(_,i)=>({...a,id:'row'+i,date:'2099-10-'+String(i+1).padStart(2,'0'),startTime:'09:00'}));appointments=planned;
 let m=context.s.getClientSessionMetrics(client);assert.equal(m.toSchedule,0);
 appointments=[M.withStatus(planned[0],'noshow_charged'),...planned.slice(1)];m=context.s.getClientSessionMetrics(client);assert.equal(m.remaining,7);assert.equal(m.toSchedule,0);assert.equal(m.completed,0);assert.equal(m.chargedAbsences,1);assert.equal(m.noShow,1);
 appointments=[M.withStatus(planned[0],'annullato'),...planned.slice(1)];m=context.s.getClientSessionMetrics(client);assert.equal(m.remaining,8);assert.equal(m.toSchedule,1);assert.equal(m.completed,0);
});

test('future late cancellation is an absence charge, not a false future presence',()=>{
 const Journey=require('../app/calendario-studio/js/client-journey-model');
 const row=M.withStatus({...a,date:'2026-10-13'},'noshow_charged');
 const result=Journey.summarize({id:'c'},[row],{today:'2026-10-12',session:M});assert.deepEqual(result.issues,[]);assert.equal(result.done,0);
});
