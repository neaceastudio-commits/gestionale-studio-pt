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
