const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app/acquisizione/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/verifyAcquisitionAccess\(\)\.catch\(showAccessError\);\s*$/, '');
const operator = {id:'pt-test', active:true, roles:['PT']};
const dates = ['2026-09-25','2026-09-30','2026-10-02','2026-10-07','2026-10-09','2026-10-14'];
function compare(appointments) {
  const acquisition = vm.createContext({console, URL, setTimeout, clearTimeout});
  vm.runInContext(script, acquisition);
  acquisition.rows = appointments;
  vm.runInContext('confAppointments=rows', acquisition);
  const slots = acquisition.confMirrorSlotsForOperator(operator, dates, ['11:00'], {duration:60,buffer:10});
  const calendarRows = appointments.map(a => ({...a, operatorId:a.operator_id, startTime:a.start_time, durationMin:a.duration_min, bufferMin:a.buffer_min, serviceId:'pt11', clientIds:['active-client']}));
  const calendar = vm.createContext({CONFIG:{SERVICES:{pt11:{durationMin:60,bufferMin:10,requiredRoles:['PT']}}}, State:{getOperators:()=>[operator],getAppointments:()=>calendarRows,getClients:()=>[{id:'active-client',active:true}]}});
  vm.runInContext(fs.readFileSync(path.join(root, 'app/calendario-studio/js/services.js'), 'utf8')+'\nthis.calendarServices=Services;', calendar);
  slots.forEach(slot => assert.equal(slot.free, calendar.calendarServices.getAvailableOperatorsForSlot('pt11', slot.date, slot.time, 60, 10)[0].available));
  return slots;
}
function rows(start, duration=60, extra={}) {
  return dates.map(date=>({date,operator_id:operator.id,start_time:start,duration_min:duration,buffer_min:10,status:'prenotato',...extra}));
}
test('le sei date alle 11 sono libere con sedute adiacenti alle 10 e alle 12, come nel Calendario', () => {
  assert.ok(compare([...rows('10:00'), ...rows('12:00')]).every(s=>s.free));
});
test('sovrapposizioni reali restano occupate in entrambe le applicazioni', () => {
  for (const [start, duration] of [['10:30',60],['11:00',60],['11:45',60],['10:00',90]]) {
    assert.ok(compare(rows(start,duration)).every(s=>!s.free));
  }
});
test('appuntamenti annullati, altri PT e altre date non occupano lo slot', () => {
  assert.ok(compare([...rows('11:00',60,{status:'annullato'}),...rows('11:00',60,{operator_id:'other'}),...rows('11:00',60,{date:'2026-09-26'})]).every(s=>s.free));
});
