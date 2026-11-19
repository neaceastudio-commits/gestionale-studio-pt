const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { read } = require('../netlify/functions/lib/studio-private-read.cjs');

const root = process.env.CALENDAR_TEST_ROOT || path.resolve(__dirname, '..');
function load(context, ...scripts) {
  for (const name of scripts) {
    const file = path.join(root, 'app/calendario-studio/js', name + '.js');
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
}

test('Clienti shares a single history read between summary and rows, including a legacy cycle and a pair', () => {
  const clients = [
    { id: 'a', nome: 'Alice', cognome: 'Demo', active: true, sessionsTotal: 4, packageType: 'PT 1:1' },
    { id: 'b', nome: 'Bruno', cognome: 'Demo', active: true, sessionsTotal: 4, packageType: 'PT 1:2' },
    { id: 'h', nome: 'Ada', cognome: 'Storico', active: false, sessionsTotal: 4, packageType: 'PT 1:1' },
  ];
  const appointment = (id, clientIds, date, notes = '', status = 'fatto') =>
    ({ id, clientIds, date, startTime: '09:00', serviceId: 'pt', status, notes });
  const appointments = [
    appointment('old', ['a'], '2026-10-01'),
    appointment('pair', ['a', 'b', 'a'], '2026-10-20', '[CICLO-PACCHETTO 2026-10-20]'),
    appointment('archive', ['h'], '2026-10-20'),
    appointment('cancel', ['a'], '2026-10-21', '[CICLO-PACCHETTO 2026-10-20]', 'annullato'),
  ];
  const panel = { innerHTML: '' };
  let appointmentReads = 0;
  const context = vm.createContext({
    CONFIG: { SERVICES: { pt: { color: '#000' } }, PACKAGE_SERVICE_MAP: { 'PT 1:1': ['pt'], 'PT 1:2': ['pt'] } },
    State: { getClients: () => clients, getAppointments: () => { appointmentReads++; return appointments; } },
    document: { getElementById: id => id === 'view-clients' ? panel : null },
  });
  load(context, 'package-ledger', 'pt-session-model', 'services', 'clients');
  vm.runInContext('Clients.render()', context);
  assert.match(panel.innerHTML, /Alice Demo/);
  assert.match(panel.innerHTML, /Bruno Demo/);
  assert.doesNotMatch(panel.innerHTML, /Ada Storico/);
  assert.match(panel.innerHTML, /1 fatte nel ciclo · 2 complessive/);
  assert.match(panel.innerHTML, /1 fatte nel ciclo · 1 complessive/);
  assert.equal(appointmentReads, 1);

  context.App = { isPortalPtMode: () => true, visibleClients: list => list.filter(client => client.id !== 'b') };
  appointmentReads = 0;
  vm.runInContext('Clients.render()', context);
  assert.match(panel.innerHTML, /Alice Demo/);
  assert.doesNotMatch(panel.innerHTML, /Bruno Demo|Guadagni e pagamenti/);
  assert.equal(appointmentReads, 1);
  vm.runInContext("Clients.setView('history')", context);
  assert.match(panel.innerHTML, /Ada Storico/);
  assert.match(panel.innerHTML, /1 lezioni complessive/);
});

function startup() {
  const date = '2026-11-19';
  const history = Array.from({ length: 501 }, (_, i) => ({ id: 'appointment-' + i, date: i === 500 ? date : '2026-11-01' }));
  const data = { clients: [{ id: 'old-client' }], operators: [{ id: 'old-operator' }], appointments: [{ id: 'old-appointment' }] };
  const writes = [];
  const calls = [];
  const state = {};
  for (const [table, suffix] of [['clients', 'Clients'], ['operators', 'Operators'], ['appointments', 'Appointments']]) {
    state['get' + suffix] = () => data[table];
    state['save' + suffix] = value => { writes.push(table); data[table] = value; };
  }
  let finishHistory;
  const block = new Promise(resolve => { finishHistory = resolve; });
  const context = vm.createContext({
    console, State: state, localStorage: { setItem() {} },
    window: { NeaceaPrivateData: {
      supports: () => true,
      async read(table, query) {
        const params = new URLSearchParams(query);
        const offset = Number(params.get('offset'));
        calls.push({ table, date: params.get('date'), order: params.get('order'), offset });
        if (table !== 'appointments') return [{ id: table+'-new' }];
        if (params.get('date') === 'eq.' + date) return [history.at(-1)];
        if (!offset) return history.slice(0, 500);
        if (await block) return history.slice(500);
        throw Error('lettura privata negata');
      },
    } },
    fetch() { throw Error('Unexpected public data request'); },
  });
  load(context, 'supabase');
  return { date, data, calls, writes, finishHistory, pull: vm.runInContext('SupabaseSync.pullAll', context) };
}

test('the authenticated daily view can appear before the last historical page; only complete rows reach storage', async () => {
  const e = startup();
  const previews = [];
  const pending = e.pull({ dashboardDate: e.date, onDashboard: data => previews.push(data), requireComplete: true });
  await new Promise(setImmediate);
  assert.equal(previews.length, 1);
  assert.equal(previews[0].appointments.length, 1);
  assert.equal(previews[0].appointments[0].date, e.date);
  assert.equal(previews[0].clients[0].id, 'clients-new');
  assert.equal(previews[0].operators[0].id, 'operators-new');
  assert.deepEqual(e.writes, []);
  assert.equal(e.data.appointments[0].id, 'old-appointment');
  assert.ok(e.calls.every(call => call.order.endsWith('id.asc')));
  assert.equal(e.calls.filter(call => call.table === 'clients').length, 1);
  assert.equal(e.calls.filter(call => call.date === 'eq.' + e.date).length, 1);
  e.finishHistory(true);
  assert.equal((await pending).changed, true);
  assert.equal(e.data.appointments.length, 501);
});

test('a denied last page at startup preserves all cached data and rejects readiness', async () => {
  const e = startup();
  const pending = e.pull({ requireComplete: true });
  const rejected = assert.rejects(pending, /lettura privata negata/);
  e.finishHistory(false);
  await rejected;
  assert.deepEqual(e.writes, []);
  assert.equal(e.data.appointments[0].id, 'old-appointment');
});

test('the dashboard date filter composes with the existing authenticated PT scope', async () => {
  const date = '2026-11-19';
  const rows = [{ id: 'a', date, operator_id: 'pt' }, { id: 'b', date, operator_id: 'other' },
    { id: 'c', date: '2026-11-18', operator_id: 'pt' }];
  const input = { table: 'appointments', query: '?date=eq.' + date + '&order=date.asc,start_time.asc,id.asc&limit=500&offset=0' };
  const args = [];
  const db = async (table, { query }) => {
    assert.equal(table, 'appointments');
    const p = new URLSearchParams(query);
    args.push(p);
    return rows.filter(row => p.get('date') === 'eq.' + row.date && p.get('operator_id') === 'eq.' + row.operator_id);
  };
  await assert.rejects(read(null, input, db), { status: 401 });
  assert.equal(args.length, 0);
  assert.deepEqual(await read({ id: 'pt', role: 'pt' }, input, db), [rows[0]]);
  assert.equal(args[0].get('limit'), '500');
});
