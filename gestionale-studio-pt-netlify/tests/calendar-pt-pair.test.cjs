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
