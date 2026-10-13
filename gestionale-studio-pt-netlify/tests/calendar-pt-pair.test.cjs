const {test}=require('node:test'),assert=require('node:assert/strict');
const m=require('../app/calendario-studio/js/pt-session-model');
const cycle=require('../netlify/functions/lib/apple-calendar-package');
const scope=require('../netlify/functions/lib/pt-client-scope');
const a={id:'one',serviceId:'pt12',clientIds:['a','b'],operatorId:'pt',date:'2026-10-12',startTime:'10:00',durationMin:60,status:'prenotato'};
const clients=['a','b'].map(id=>({id,active:true,notes:'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({cycles:[{id:'cycle-'+id,startDate:'2026-10-01',legacy:false}]})+'[/NEACEA-PACKAGE-LEDGER-V1]'}));
const prepared=m.prepare(a,clients,c=>({id:'cycle-'+c.id,start:'2026-10-01'}));
test('one hour has one fee regardless of either absence; PT 1:1 earns 10; planned/cancelled excluded',()=>{
 for(const states of [{a:'fatto',b:'fatto'},{a:'noshow',b:'fatto'},{a:'fatto',b:'noshow'},{a:'noshow',b:'noshow'}]){
 const row=m.attendance(prepared,states),total=m.summary([row],'2026-10').totals[0];assert.equal(total.cents,1500);assert.equal(total.earnedMin,60);assert.equal(total.workedMin,Object.values(states).includes('fatto')?60:0);assert.equal(m.status(row,'a'),states.a);}
 const single={...a,id:'single',clientIds:['a'],serviceId:'pt11',status:'fatto'};assert.equal(m.summary([single],'2026-10').totals[0].cents,1000);
 assert.equal(m.summary([a],'2026-10').totals[0].cents,0);assert.equal(m.summary([{...a,status:'annullato'}],'2026-10').totals.length,0);
});
test('overlapping rows and incomplete pairs do not falsify hours or payment totals',()=>{
 const row=m.attendance(prepared,{a:'fatto',b:'fatto'});
 for(const startTime of ['10:00:00','10:30']){const report=m.summary([row,{...row,id:'duplicate',startTime}],'2026-10');assert.equal(report.totals.length,0);assert.equal(report.issues.length,2);}
 assert.equal(m.summary([{...row,clientIds:['a']}],'2026-10').issues.length,1);
 assert.equal(m.summary([row,{...row,id:'next',startTime:'11:00'}],'2026-10').totals[0].cents,3000);
});
test('independent cycle identity and absence control temporary PT client visibility',()=>{
 const row=m.attendance(prepared,{a:'fatto',b:'noshow'});
 const dbRow={...row,service_id:'pt12',client_ids:['a','b'],operator_id:'pt'};
 for(const client of clients)assert.equal(cycle.inCycle(dbRow,cycle.context(client,[dbRow])),true);
 const report=scope.clientScope(clients,[dbRow],[]);
 assert.deepEqual(report.clients.find(c=>c.id==='a').pending_session_pt_ids,['pt']);assert.deepEqual(report.clients.find(c=>c.id==='b').pending_session_pt_ids,[]);
 assert.throws(()=>m.prepare({...a,clientIds:['a']},clients,()=>({})),/due clienti/);
 assert.throws(()=>m.attendance(prepared,{a:'prenotato',b:'fatto'}),/entrambe/);
});

require('node:test').test('new appointment has no existing row and defaults to booked without crashing',()=>{const M=require('../app/calendario-studio/js/pt-session-model');const assert=require('node:assert/strict');assert.equal(M.statusValue(null),'prenotato');assert.equal(M.statusValue(undefined),'prenotato');assert.deepEqual(M.ids(null),[]);assert.equal(M.service(null),undefined);});

require('node:test').test('charged absence earns the assigned PT, uncharged absence and cancellation earn zero; duration is prorated',()=>{
 const M=require('../app/calendario-studio/js/pt-session-model'),assert=require('node:assert/strict');
 const base={id:'absence',serviceId:'pt11',clientIds:['a'],operatorId:'assigned-pt',date:'2026-10-13',startTime:'09:00',durationMin:30,status:'prenotato',notes:''};
 const charged=M.withStatus(base,'noshow_charged');let total=M.summary([charged],'2026-10').totals[0];assert.equal(charged.status,'noshow');assert.equal(total.operator,'assigned-pt');assert.equal(total.earnedMin,30);assert.equal(total.absenceEarnedMin,30);assert.equal(total.workedMin,0);assert.equal(total.cents,500);assert.equal(M.summary([{...base,status:'noshow'}],'2026-10').totals[0].cents,0);assert.equal(M.summary([M.withStatus(charged,'annullato')],'2026-10').totals.length,0);
 const pair={...base,serviceId:'pt12',clientIds:['a','b'],status:'noshow'};assert.equal(M.summary([pair],'2026-10').totals[0].cents,0);
});


test('month-end forecast adds pending fees to earned, prorates each service and counts a pair once',()=>{
 const row=(id,date,status,extra={})=>({id,date,status,serviceId:'pt11',clientIds:[id],operatorId:'pt',startTime:'09:00',durationMin:60,notes:'',...extra});
 const pending=row('pending','2026-10-20','prenotato',{durationMin:30});
 const rows=[row('done','2026-10-01','fatto'),m.withStatus(row('charged','2026-10-02','prenotato'),'noshow_charged'),pending,row('pair-pending','2026-10-21','prenotato',{serviceId:'pt12',clientIds:['a','b'],durationMin:90}),row('cancelled','2026-10-22','annullato'),row('uncharged','2026-10-23','noshow'),row('provisional','2026-10-24','prenotato',{notes:'[ORARIO-PROVVISORIO]'}),row('next-month','2026-11-01','prenotato'),row('other','2026-10-25','prenotato',{operatorId:'other'})];
 const before=JSON.stringify(rows);let total=m.summary(rows,'2026-10').totals.find(t=>t.operator==='pt');
 assert.equal(total.cents,2000);assert.equal(total.plannedMin,120);assert.equal(total.plannedCents,2750);assert.equal(total.projectedCents,4750);assert.equal(JSON.stringify(rows),before);
 pending.status='fatto';total=m.summary(rows,'2026-10').totals.find(t=>t.operator==='pt');assert.equal(total.cents,2500);assert.equal(total.plannedCents,2250);assert.equal(total.projectedCents,4750);
 pending.status='annullato';total=m.summary(rows,'2026-10').totals.find(t=>t.operator==='pt');assert.equal(total.projectedCents,4250);
 const conflicts=[row('conflict','2026-10-26','prenotato',{clientIds:['a']}),row('duplicate','2026-10-26','prenotato',{clientIds:['a']})];
 assert.equal(m.summary(conflicts,'2026-10').issues.length,2);assert.equal(m.summary(conflicts,'2026-10').totals.length,0);
});
