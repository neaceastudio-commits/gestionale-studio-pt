const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadOperationalContext() {
  const storage = new Map();
  const context = vm.createContext({
    console,
    Date,
    Math,
    JSON,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
  });
  const root = path.join(__dirname, '..', 'app');
  [
    'calendario-studio/js/config.js',
    'calendario-studio/js/state.js',
    'shared/pt-domain.js',
    'calendario-studio/js/services.js',
  ].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
  return {
    State: vm.runInContext('State', context),
    Services: vm.runInContext('Services', context),
    Domain: vm.runInContext('NeaceaPtDomain', context),
  };
}

test('Agenda e scheda cliente leggono e aggiornano lo stesso appuntamento senza duplicarlo', () => {
  const { State, Services, Domain } = loadOperationalContext();
  State.saveOperators([
    { id: 'pt-a', nome: 'PT', cognome: 'A', roles: ['PT'], active: true },
    { id: 'pt-b', nome: 'PT', cognome: 'B', roles: ['PT'], active: true },
  ]);
  State.saveClients([{
    id: 'client-1', nome: 'Cliente', cognome: 'Uno', ptAssegnato: 'pt-a',
    sessionsTotal: 10, sessionsRemaining: 10, packageStart: '2026-07-01', active: true,
  }]);
  State.saveAppointments([]);

  const created = Services.addAppointment({
    serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-a',
    date: '2026-07-22', startTime: '09:00', durationMin: 60, status: 'prenotato',
  });
  const update = Domain.normalizePerformanceTransition(created, {
    ...created, operatorId: 'pt-b', performedByOperatorId: 'pt-b', status: 'fatto',
  }, State.getOperators());
  Services.updateAppointment(created.id, update);

  const agendaRecord = Services.getAppointmentsForDate('2026-07-22')[0];
  const clientRecord = State.getAppointments().find(appointment => appointment.clientIds.includes('client-1'));
  assert.equal(State.getAppointments().length, 1);
  assert.equal(agendaRecord.id, clientRecord.id);
  assert.equal(clientRecord.operatorId, 'pt-b');
  assert.equal(clientRecord.performedByOperatorId, 'pt-b');
  assert.equal(State.getClients()[0].ptAssegnato, 'pt-a');

  const first = Services.recalculateClientSessions(['client-1']);
  const second = Services.recalculateClientSessions(['client-1']);
  assert.equal(first[0].sessionsRemaining, 9);
  assert.equal(second.length, 0);
  assert.equal(State.getClients()[0].sessionsRemaining, 9);
});
