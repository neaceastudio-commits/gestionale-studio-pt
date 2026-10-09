const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/calendario-studio/js/app.js'),'utf8');
function setup(rows){
 const ctx={App:{_packageServiceId:()=> 'pt11',_packageAppointments:()=>rows,_weekdayName:d=>new Date(d+'T12:00:00').getDay()},Services:{appointmentInCurrentPackageCycle:a=>a.current!==false}};
 vm.createContext(ctx);vm.runInContext('Object.assign(App,{'+source.slice(source.indexOf('  _packageSlotForDate('),source.indexOf('  _suggestPackageDates('))+'});',ctx);return ctx.App;
}
const row=(date,time,pt,extra={})=>({date,startTime:time,operatorId:pt,serviceId:'pt11',status:'prenotato',durationMin:60,bufferMin:10,...extra});
test('replacement keeps latest time and PT separately for each weekday',()=>{
 const app=setup([row('2026-10-05','09:00','a'),row('2026-10-12','10:00','b'),row('2026-10-09','13:00','c')]);
 assert.equal(app._packageSlotForDate({},'2026-10-19').startTime,'10:00');
 assert.equal(app._packageSlotForDate({},'2026-10-19').operatorId,'b');
 assert.equal(app._packageSlotForDate({},'2026-10-16').startTime,'13:00');
 assert.equal(app._packageSlotForDate({},'2026-10-16').operatorId,'c');
});
test('cancelled, other cycle and other service do not override active pattern',()=>{
 const app=setup([row('2026-10-05','10:00','a'),row('2026-10-12','11:00','b',{current:false}),row('2026-10-19','12:00','c',{status:'annullato'}),row('2026-10-26','15:00','d',{serviceId:'check'})]);
 assert.equal(app._packageSlotForDate({},'2026-11-02').startTime,'10:00');
});
test('unknown weekday uses uniform pattern only; never invents 09:00',()=>{
 assert.equal(setup([])._packageSlotForDate({},'2026-10-20'),null);
 assert.equal(setup([row('2026-10-05','10:00','a'),row('2026-10-09','13:00','b')])._packageSlotForDate({},'2026-10-20'),null);
 const slot=setup([row('2026-10-05','10:00','a',{durationMin:45,bufferMin:0})])._packageSlotForDate({},'2026-10-20');
 assert.equal(slot.startTime,'10:00');assert.equal(slot.durationMin,45);assert.equal(slot.bufferMin,0);
});
