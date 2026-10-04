const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan}=require('../app/calendario-studio/js/pt-session-correction.js');
const a={id:'a',serviceId:'pt11',clientIds:['one'],operatorId:'pt',date:'2026-10-02',startTime:'10:00',durationMin:60,bufferMin:10,status:'fatto',notes:'retained'};
const b={...a,id:'b',clientIds:['two']};
const options={clientId:'one',partnerId:'two',serviceId:'pt12',from:'2026-10-01',to:'2026-10-31'};
test('explicit pair correction includes past completed sessions and keeps original snapshots',()=>{
 const rows=[a,b],before=JSON.stringify(rows);const result=plan(rows,options);
 assert.equal(result.length,1);assert.equal(result[0].change.partner.id,'b');assert.equal(result[0].change.before.status,'fatto');assert.equal(result[0].change.before.notes,'retained');assert.equal(JSON.stringify(rows),before);
 assert.equal(plan(rows,{...options,from:'2026-10-04'}).length,0);
});
test('mismatching PT, time, duration, date, status, third participants and cancelled sessions never merge',()=>{
 for(const patch of [{operatorId:'other'},{startTime:'11:00'},{durationMin:45},{date:'2026-10-03'},{status:'prenotato'},{status:'annullato'},{clientIds:['two','three']}])assert.equal(plan([a,{...b,...patch}],options)[0].change,null);
 assert.equal(plan([a,b,{...b,id:'duplicate'}],options)[0].change,null);
 assert.equal(plan([{...a,status:'annullato'},b],options).length,0);
});
test('type-only corrections keep participants; shared sessions cannot become individual',()=>{
 assert.equal(plan([{...a,clientIds:['one','two']}],options)[0].change.serviceId,'pt12');
 assert.equal(plan([{...a,serviceId:'pt12'}],{...options,serviceId:'pt11'})[0].change.serviceId,'pt11');
 assert.equal(plan([{...a,serviceId:'pt12',clientIds:['one','two']}],{...options,serviceId:'pt11'})[0].change,null);
 assert.equal(plan([a],{...options,serviceId:'pt11'})[0].change,null);
 assert.throws(()=>plan([a],{...options,partnerId:'one'}));assert.throws(()=>plan([a],{...options,to:'2020-01-01'}));
});
