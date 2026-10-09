const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { visibleClient, clientScope } = require('../netlify/functions/lib/pt-client-scope');

const client = (id = 'c') => ({ id, pt_assegnato: 'owner', active: true,
  notes: '[NEACEA-PACKAGE-LEDGER-V1]{"cycles":[{"id":"current","startDate":"2026-10-01"}]}[/NEACEA-PACKAGE-LEDGER-V1]' });
const appointment = (id, extra = {}) => ({ id, operator_id: 'temp', client_ids: ['c'],
  date: '2026-10-07', service_id: 'pt11', status: 'fatto', notes: '[CICLO-PACCHETTO-ID current]', ...extra });
const saved = (id, extra = {}) => ({ appointment_id: id, cliente_id: 'c', operator_id: 'temp', ...extra });
const pending = (rows, records = [], clients = [client()]) => clientScope(clients, rows, records);

test('last saved workout removes the temporary PT, while another pending session anywhere in the package keeps it', () => {
  const rows = [appointment('today'), appointment('later', { date: '2026-11-20', status: 'prenotato' })];
  assert.deepEqual(pending(rows).clients[0].pending_session_pt_ids, ['temp']);
  assert.deepEqual(pending(rows, [saved('today')]).clients[0].pending_session_pt_ids, ['temp']);
  assert.deepEqual(pending(rows, rows.map(a => saved(a.id))).clients[0].pending_session_pt_ids, []);
  assert.deepEqual(pending([rows[0]], [saved('today')]).clients[0].pending_session_pt_ids, []);
  assert.deepEqual(pending([rows[0]]).clients[0].pending_session_pt_ids, ['temp'], 'calendar attendance alone does not mean the workout was saved');
});

test('previous packages, cancelled sessions, different PTs and circuit attendance cannot keep a temporary client in the list', () => {
  const rows = [appointment('today'), appointment('old', { notes: '[CICLO-PACCHETTO-ID previous]' }),
    appointment('legacy', { notes: '' }), appointment('cancelled', { status: 'annullato' }),
    appointment('circuit', { service_id: 'circuit' }), appointment('other', { operator_id: 'other' })];
  const result = pending(rows, [saved('today')]);
  assert.deepEqual(result.clients[0].pending_session_pt_ids, ['other']);
  assert.deepEqual(result.assignments.map(a => a.id), ['today', 'other']);
  assert.deepEqual(pending([appointment('early', { date: '2026-09-30' })]).clients[0].pending_session_pt_ids, ['temp'], 'an explicitly linked early session belongs to the package');
});

test('PT 1:2 completion is per client and per author; reassignment does not inherit another PT record', () => {
  const row = appointment('pair', { service_id: 'pt12', client_ids: ['c', 'd'] });
  const result = pending([row], [saved('pair')], [client(), client('d')]);
  assert.deepEqual(result.clients.map(c => c.pending_session_pt_ids), [[], ['temp']]);
  assert.deepEqual(pending([row], [saved('pair', { operator_id: 'old-pt' })]).clients[0].pending_session_pt_ids, ['temp']);
});

test('legacy package boundaries and a renewal with no new temporary assignment exclude old sessions', () => {
  const legacy = { id: 'c', active: true, data_conferma: '2026-10-01' };
  assert.deepEqual(pending([appointment('old', { date: '2026-09-20', notes: '' })], [], [legacy]).clients[0].pending_session_pt_ids, []);
  assert.deepEqual(pending([appointment('current', { notes: '' })], [], [legacy]).clients[0].pending_session_pt_ids, ['temp']);
  const inferred = [appointment('old', { notes: '[CICLO-PACCHETTO 2026-09-01]' }),
    appointment('new', { operator_id: 'owner', notes: '[CICLO-PACCHETTO 2026-10-01]' })];
  assert.deepEqual(pending(inferred, [], [{ id: 'c' }]).clients[0].pending_session_pt_ids, ['owner']);
});

test('hibernated and inactive clients are hidden and reappear on reactivation without changing their records', () => {
  const c = client();
  for (const status of ['Ibernato', 'ibernata', 'IBERNATO']) assert.equal(visibleClient({ ...c, stato_abbonamento: status }), false);
  assert.equal(visibleClient({ ...c, active: false }), false);
  assert.equal(visibleClient({ ...c, stato_abbonamento: 'Attivo' }), true);
  assert.equal(visibleClient({ ...c, data_conferma: null }), true, 'missing legacy confirmation is not hibernation');
});

test('frontend lists and counts update only from confirmed records, keep the referent, and ignore stale sharing grants', () => {
  const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
  const c = { ...client(), client_id: 'c', trainer_id: 'owner', session_access: true, pending_session_pt_ids: ['temp'] };
  const context = vm.createContext({
    appState: { currentPt: { id: 'temp' }, trainerFilter: '', clients: [c,
      { id: 'grant-only', trainer_id: 'owner', session_access: true },
      { id: 'hidden', trainer_id: 'temp', active: false },
      { id: 'hidden-status', trainer_id: 'temp', stato_abbonamento: 'Ibernato' }],
      assignedSessions: [appointment('today')], sessionRecords: [] },
    clientTrainerId: c => c.trainer_id, isAdministrator: () => true,
    renderAccessScope: () => {}, renderClientList: () => {}, selectedClient: () => null,
  });
  vm.runInContext(html.slice(html.indexOf('    function isVisibleClient(client)'), html.indexOf('    function selectedClient()'))
    + ';globalThis.visible=clientsInScope;globalThis.refresh=refreshClientScopeAfterSessionSave;globalThis.forTrainer=clientsForTrainer;', context);
  assert.deepEqual(Array.from(context.visible(), c => c.id), ['c']);
  context.refresh();
  assert.deepEqual(Array.from(context.visible(), c => c.id), ['c'], 'failed save has no confirmed record');
  context.appState.sessionRecords.push(saved('today'));
  context.refresh();
  assert.deepEqual(Array.from(context.visible(), c => c.id), []);
  assert.deepEqual(Array.from(context.forTrainer('owner'), c => c.id), ['c', 'grant-only'], 'referent remains');
  context.appState.trainerFilter = 'temp';
  assert.deepEqual(Array.from(context.visible(), c => c.id), [], 'named PT menu uses the same membership');
  context.appState.trainerFilter = 'all';
  assert.deepEqual(Array.from(context.visible(), c => c.id), ['c', 'grant-only']);
});
