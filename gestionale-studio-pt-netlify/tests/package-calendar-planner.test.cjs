const assert = require('node:assert/strict');
const { test } = require('node:test');
const planner = require('../netlify/functions/lib/package-calendar-planner');
const client = { id: 'test-client', active: true, sessionsTotal: 8, sessionsRemaining: 8 };
const options = { client, serviceId: 'pt11', operatorId: 'test-pt', startDate: '2026-09-15', schedule: [{ weekday: 'Martedì', time: '17:00' }, { weekday: 'Giovedì', time: '18:00' }] };

test('8 sedute: completamento, spostamento, annullamento e limite anche cambiando data iniziale', () => {
  const before = JSON.stringify(client);
  const first = planner.planPackageAppointments(options);
  assert.equal(first.ok, true);
  assert.equal(first.created.length, 8);
  assert.equal(JSON.stringify(client), before);
  assert.deepEqual(first.created.slice(0, 2).map(a => [a.date, a.startTime]), [['2026-09-15', '17:00'], ['2026-09-17', '18:00']]);
  let appointments = first.created.map((a, i) => ({ ...a, id: `test-${i}` }));
  const plan = (changes = {}) => planner.planPackageAppointments({ ...options, appointments, ...changes });
  assert.equal(plan().created.length, 0);
  assert.equal(plan({ startDate: '2026-10-20' }).created.length, 0, 'la data iniziale non libera sedute già prenotate');
  const completedClient = { ...client, sessionsRemaining: 7 };
  appointments[0].status = 'fatto';
  assert.equal(plan({ client: completedClient }).created.length, 0);
  appointments[2].date = '2026-09-23';
  assert.equal(plan({ client: completedClient }).created.length, 0);
  assert.equal(completedClient.sessionsRemaining, 7);
  appointments[3].status = 'annullato';
  const replacement = plan({ client: completedClient });
  assert.equal(replacement.created.length, 1);
  assert.equal(completedClient.sessionsRemaining, 7);
  appointments.push({ ...replacement.created[0], id: 'replacement' });
  assert.equal(plan({ client: completedClient, startDate: '2026-10-20' }).created.length, 0);
});

test('date impossibili e clienti inattivi non generano appuntamenti', () => {
  assert.equal(planner.planPackageAppointments({ ...options, startDate: '2026-02-31' }).code, 'invalid_start_date');
  assert.equal(planner.planPackageAppointments({ ...options, client: { ...client, active: false } }).code, 'inactive_client');
});

test('il PT occupato fa saltare lo slot senza consumare residuo', () => {
  const appointment = { id: 'other', date: '2026-09-15', start_time: '17:00', duration_min: 60, operator_id: 'test-pt', client_ids: ['other'], service_id: 'pt11', status: 'prenotato' };
  const result = planner.planPackageAppointments({ ...options, appointments: [appointment] });
  assert.equal(result.created.length, 8);
  assert.equal(result.skipped[0].conflicts[0].type, 'operator');
  assert.equal(result.created[0].date, '2026-09-17');
});

test('disponibilità dichiarata, ruolo e stato PT, orario intero e fasce adiacenti', () => {
  const candidate = {serviceId:'pt11',date:'2026-09-15',startTime:'17:30',durationMin:60};
  const op = {id:'pt',roles:['PT'],active:true};
  const rows = [{operator_id:'pt',day_key:'tue',slots:['17:00-18:00','18:00-19:00']}];
  assert.equal(planner.operatorCanWork(op,candidate,rows),true);
  assert.equal(planner.operatorCanWork({...op,active:false},candidate,rows),false);
  assert.equal(planner.operatorCanWork({...op,roles:['Nutrizionista']},candidate,rows),false);
  assert.equal(planner.operatorCanWork(op,candidate,[]),false);
  assert.equal(planner.operatorCanWork(op,candidate,[{...rows[0],slots:['17:00-18:00','18:30-19:00']}]),false);
  assert.equal(planner.operatorCanWork(op,{...candidate,startTime:'20:30'},[{...rows[0],slots:['07:00-23:00']}]),false);
});

test('capienza per partecipanti effettivi e picco simultaneo, blocchi PT, annullati e clienti inattivi', () => {
  const c = {serviceId:'pt11',clientIds:['test'],operatorId:'pt',date:'2026-09-15',startTime:'17:00',durationMin:60};
  const group = {serviceId:'circuit',clientIds:['a','b','c','d','e'],operatorId:'other',date:c.date,startTime:'17:00',durationMin:60};
  assert.equal(planner.slotConflicts(c,[group]).length,0);
  assert.equal(planner.slotConflicts(c,[{...group,clientIds:[...group.clientIds,'f']}])[0].type,'room_capacity');
  const later={...group,startTime:'17:30',durationMin:30};
  assert.equal(planner.slotConflicts(c,[{...group,durationMin:30},later]).length,0);
  const clients = [{id:'test',active:true},...group.clientIds.map(id=>({id,active:false}))];
  assert.equal(planner.slotConflicts(c,[group],{clients}).length,0);
  assert.equal(planner.slotConflicts(c,[{...group,status:'annullato'}]).length,0);
  assert.equal(planner.slotConflicts(c,[{...group,serviceId:'blocco',operatorId:'pt',clientIds:[]}],{clients})[0].type,'operator');
  assert.equal(planner.slotConflicts(c,[{...group,operatorId:'pt',startTime:'18:00'}]).length,0, 'buffer non blocca sedute adiacenti, come nel calendario');
});

test('il calcolo capienza del Calendario coincide con il pianificatore', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const group = {id:'g',serviceId:'circuit',clientIds:['a','b','c','d','e'],operatorId:'other',date:'2026-09-15',startTime:'17:00',durationMin:30};
  const appointments = [group,{...group,id:'g2',startTime:'17:30'}];
  const context = vm.createContext({State:{getAppointments:()=>appointments,getClients:()=>group.clientIds.map(id=>({id,active:true}))}});
  for (const file of ['config.js','services.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js',file),'utf8'),context);
  assert.equal(vm.runInContext("Services.getRoomLoadAt('2026-09-15','17:00',60,'pt')",context),5);
});
