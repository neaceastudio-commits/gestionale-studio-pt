const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = path.join(__dirname, '..', 'app');

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function loadContext(fetchImpl, storage = new Map(), { services = false } = {}) {
  const context = vm.createContext({
    console,
    Date,
    Math,
    JSON,
    fetch: fetchImpl,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
  });
  const files = [
    'calendario-studio/js/config.js',
    'calendario-studio/js/state.js',
  ];
  if (services) files.push('shared/pt-domain.js', 'calendario-studio/js/services.js');
  files.push('calendario-studio/js/supabase.js');
  files.forEach(file => vm.runInContext(
    fs.readFileSync(path.join(appRoot, file), 'utf8'),
    context,
    { filename: file }
  ));
  return {
    State: vm.runInContext('State', context),
    Services: services ? vm.runInContext('Services', context) : null,
    Domain: services ? vm.runInContext('NeaceaPtDomain', context) : null,
    SupabaseSync: vm.runInContext('SupabaseSync', context),
  };
}

function tableName(url) {
  return new URL(url).pathname.split('/').pop();
}

test('pt_assegnato completa il round-trip UI, payload Supabase, rilettura e refresh', async () => {
  const database = {
    clients: [],
    operators: [
      { id: 'pt-a', nome: 'PT', cognome: 'A', roles: ['PT'], active: true },
    ],
    appointments: [],
  };
  const writtenClients = [];
  const fetchImpl = async (url, options = {}) => {
    const table = tableName(url);
    if (table === 'clients' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      writtenClients.push(body);
      database.clients = [body];
      return response(204);
    }
    return response(200, database[table] || []);
  };

  const first = loadContext(fetchImpl);
  await first.SupabaseSync.pushClient({
    id: 'client-1',
    nome: 'Cliente',
    cognome: 'Uno',
    ptAssegnato: 'pt-a',
    active: true,
  });
  assert.equal(writtenClients[0].pt_assegnato, 'pt-a');

  await first.SupabaseSync.pullAll();
  assert.equal(first.State.getClients()[0].ptAssegnato, 'pt-a');

  const refreshed = loadContext(fetchImpl, new Map());
  await refreshed.SupabaseSync.pullAll();
  assert.equal(refreshed.State.getClients()[0].ptAssegnato, 'pt-a');

  await refreshed.SupabaseSync.pushClient({
    ...refreshed.State.getClients()[0],
    ptAssegnato: '',
    pt_assegnato: 'pt-a',
  });
  assert.equal(writtenClients.at(-1).pt_assegnato, null, 'la rimozione esplicita non ripristina il valore snake_case obsoleto');
});

test('lo schema pre-migrazione degrada solo sedute non svolte e senza esecutore', async () => {
  const payloads = [];
  const fetchImpl = async (_url, options = {}) => {
    payloads.push(JSON.parse(options.body));
    if (payloads.length === 1) {
      return response(400, {
        code: 'PGRST204',
        message: "Could not find the 'performed_by_operator_id' column in the schema cache",
      });
    }
    return response(204);
  };
  const { SupabaseSync } = loadContext(fetchImpl);
  const result = await SupabaseSync.pushAppointment({
    id: 'appt-1', serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-a',
    date: '2026-07-22', startTime: '09:00', status: 'prenotato',
  });

  assert.equal(result, null);
  assert.equal(payloads.length, 2);
  assert.ok(Object.hasOwn(payloads[0], 'performed_by_operator_id'));
  assert.ok(!Object.hasOwn(payloads[1], 'performed_by_operator_id'));
});

test('una seduta fatta senza esecutore viene bloccata prima della rete', async () => {
  let calls = 0;
  const { SupabaseSync } = loadContext(async () => { calls += 1; return response(204); });
  const result = await SupabaseSync.pushAppointment({
    id: 'appt-1', serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-a',
    date: '2026-07-22', startTime: '09:00', status: 'fatto',
  });
  assert.match(result.error, /NEACEA_PERFORMER_REQUIRED/);
  assert.equal(calls, 0);
});

for (const failure of [
  { label: 'FK', code: '23503', message: 'performed_by_operator_id violates foreign key constraint' },
  { label: 'RLS', code: '42501', message: 'row-level security denied performed_by_operator_id update' },
]) {
  test(`un errore ${failure.label} sull esecutore non effettua downgrade`, async () => {
    let calls = 0;
    const { SupabaseSync } = loadContext(async () => {
      calls += 1;
      return response(400, failure);
    });
    const result = await SupabaseSync.pushAppointment({
      id: 'appt-1', serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-a',
      performedByOperatorId: 'pt-b', date: '2026-07-22', startTime: '09:00', status: 'fatto',
    });
    assert.equal(calls, 1);
    assert.match(result.error, new RegExp(failure.code));
  });
}

test('Agenda e scheda cliente sincronizzano lo stesso record API senza duplicarlo', async () => {
  const database = {
    clients: [{
      id: 'client-1', nome: 'Cliente', cognome: 'Uno', pt_assegnato: 'pt-a',
      sessions_total: 10, sessions_remaining: 10, package_start: '2026-07-01', active: true,
    }],
    operators: [
      { id: 'pt-a', nome: 'PT', cognome: 'A', roles: ['PT'], active: true },
      { id: 'pt-b', nome: 'PT', cognome: 'B', roles: ['PT'], active: true },
    ],
    appointments: [{
      id: 'appt-1', service_id: 'pt11', client_ids: ['client-1'], operator_id: 'pt-b',
      performed_by_operator_id: null, date: '2026-07-22', start_time: '09:00',
      duration_min: 60, status: 'prenotato',
    }],
  };
  const fetchImpl = async (url, options = {}) => {
    const table = tableName(url);
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      const index = database[table].findIndex(row => row.id === body.id);
      if (index >= 0) database[table][index] = { ...database[table][index], ...body };
      else database[table].push(body);
      return response(204);
    }
    return response(200, database[table] || []);
  };
  const { State, Services, Domain, SupabaseSync } = loadContext(fetchImpl, new Map(), { services: true });
  await SupabaseSync.pullAll();

  const previous = State.getAppointments()[0];
  const updated = Domain.normalizePerformanceTransition(previous, {
    ...previous,
    date: '2026-07-23',
  }, State.getOperators(), 'pt-a');
  const saved = Services.updateAppointment(previous.id, updated);
  await SupabaseSync.pushAppointment(saved);
  await SupabaseSync.pullAll();

  const agendaRecord = Services.getAppointmentsForDate('2026-07-23')[0];
  const clientRecord = State.getAppointments().find(appt => appt.clientIds.includes('client-1'));
  assert.equal(database.appointments.length, 1);
  assert.equal(agendaRecord.id, clientRecord.id);
  assert.equal(clientRecord.operatorId, 'pt-b', 'il sostituto programmato resta invariato');
  assert.equal(State.getClients()[0].ptAssegnato, 'pt-a');
});
