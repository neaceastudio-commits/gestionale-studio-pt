const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('../app/calendario-studio/js/pt-session-model');

function fixture({ service = 'pt11', clients = ['client'], status = 'prenotato' } = {}) {
  const session = { version: 1, rateCents: 1000, participants: {
    client: { cycleId: 'renewal-cycle', start: '2026-10-12', status: 'prenotato' },
  } };
  const before = M.write({ id: 'lesson', serviceId: 'pt11', clientIds: ['client'],
    operatorId: 'old-pt', date: '2026-10-21', startTime: '19:00', durationMin: 60,
    bufferMin: 0, status: 'prenotato', notes: '[RINNOVO-PREVISTO proposal]\nNota precedente' }, session);
  const fields = Object.fromEntries(Object.entries({ 'appt-service': service,
    'appt-date': '2026-10-23', 'appt-time': '19:00', 'appt-duration': '60',
    'appt-operator': 'new-pt', 'appt-status': status,
    'appt-notes': '[RINNOVO-PREVISTO proposal]\nNota modificata',
  }).map(([id, value]) => [id, { value }]));
  fields['appt-clients'] = { selectedOptions: clients.map(value => ({ value })) };
  fields['appointment-save-error'] = { hidden: true, textContent: '' };
  fields['appointment-save-button'] = { disabled: false, textContent: 'Salva modifiche', isConnected: true };
  const writes = [], messages = [];
  let closed = false;
  const context = { console, URLSearchParams, PTSessionModel: M,
    window: { location: { search: '' }, addEventListener() {} }, location: { search: '' },
    document: { addEventListener() {}, getElementById: id => fields[id] || null },
    State: { getAppointments: () => [before], getClients: () => [] },
    Services: { getService: () => ({ bufferMin: 0 }),
      canBookAppointment: () => ({ ok: true, errors: [] }),
      serviceUsesPackageSessions: () => false, hasForcedPt11Overlap: () => false },
    SupabaseSync: { saveAppointmentAtomic: async (draft, expected) => {
      writes.push({ draft, expected }); return { appointment: draft };
    } },
    UI: { showToast: message => messages.push(message), closeModal: () => { closed = true; } },
    Calendar: { render() {} }, CONFIG: { SHEETS: { enabled: false } },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/../app/calendario-studio/js/app.js', 'utf8') + '\nglobalThis.app = App; globalThis.testUI = UI;', context);
  Object.assign(context.testUI, context.UI);
  context.app.guardPortalEdit = () => true;
  return { app: context.app, before, session, writes, messages, context, fields, closed: () => closed };
}

test('changing PT and date of a renewal lesson retains its participant cycle in the server request', async () => {
  const f = fixture();
  await f.app._saveAppointment('lesson');
  assert.equal(f.writes.length, 1);
  const { draft, expected } = f.writes[0];
  assert.deepEqual(M.read(draft), f.session);
  assert.equal(draft.operatorId, 'new-pt');
  assert.equal(draft.date, '2026-10-23');
  assert.match(draft.notes, /Nota modificata/);
  assert.doesNotMatch(draft.notes, /Nota precedente/);
  assert.equal(expected, f.before);
  assert.equal(f.closed(), true);
});

test('changing participants or service does not copy the previous participant cycle', async () => {
  for (const options of [{ clients: ['other'] }, { service: 'nutrizione' }]) {
    const f = fixture(options);
    await f.app._saveAppointment('lesson');
    assert.equal(M.read(f.writes[0].draft), null);
  }
});

test('a charged absence preserves the renewal link and the selected attendance', async () => {
  const f = fixture({ status: 'noshow_charged' });
  await f.app._saveAppointment('lesson');
  const draft = f.writes[0].draft;
  assert.deepEqual(M.read(draft), f.session);
  assert.equal(M.chargedAbsence(draft, 'client'), true);
});

test('a double click during verification sends one write and exposes the busy state', async () => {
  const f = fixture();
  let release;
  f.context.window.CalendarFlex = { refresh: () => new Promise(resolve => { release = resolve; }) };
  const first = f.app._saveAppointment('lesson');
  assert.equal(f.fields['appointment-save-button'].disabled, true);
  await f.app._saveAppointment('lesson');
  assert.equal(f.writes.length, 0);
  release(); await first;
  assert.equal(f.writes.length, 1);
  assert.equal(f.fields['appointment-save-button'].disabled, false);
});

test('availability checks receive the same renewal cycle as the save request', () => {
  const f = fixture();
  f.fields['appt-id'] = { value: 'lesson' };
  assert.deepEqual(M.read({ notes: f.app._appointmentNotes() }), f.session);
});

test('replacing the form while verification is pending never writes the replacement values', async () => {
  const f = fixture();
  let release;
  f.context.window.CalendarFlex = { refresh: () => new Promise(resolve => { release = resolve; }) };
  const pending = f.app._saveAppointment('lesson');
  f.fields['appt-service'] = { value: 'nutrizione' };
  release(); await pending;
  assert.equal(f.writes.length, 0);
  assert.equal(f.closed(), false);
});

test('cancelling the dialog during verification prevents the pending save', async () => {
  const f = fixture();
  let release, open = true;
  f.fields['modal-overlay'] = { classList: { contains: () => open } };
  f.context.window.CalendarFlex = { refresh: () => new Promise(resolve => { release = resolve; }) };
  const pending = f.app._saveAppointment('lesson');
  open = false;
  release(); await pending;
  assert.equal(f.writes.length, 0);
});

test('a late save response never closes a replacement dialog', async () => {
  const f = fixture();
  let release;
  f.context.SupabaseSync.saveAppointmentAtomic = draft => new Promise(resolve => { release = () => resolve({ appointment: draft }); });
  const pending = f.app._saveAppointment('lesson');
  await Promise.resolve();
  f.fields['appt-service'] = { value: 'nutrizione' };
  release(); await pending;
  assert.equal(f.closed(), false);
});

test('a server rejection keeps the form open, retains the error and permits retry', async () => {
  const f = fixture();
  const save = f.context.SupabaseSync.saveAppointmentAtomic;
  f.context.SupabaseSync.saveAppointmentAtomic = async () => ({ error: 'Versione della seduta cambiata' });
  await f.app._saveAppointment('lesson');
  assert.equal(f.closed(), false);
  assert.equal(f.fields['appointment-save-error'].hidden, false);
  assert.match(f.fields['appointment-save-error'].textContent, /Versione della seduta cambiata/);
  assert.equal(f.fields['appointment-save-button'].disabled, false);
  f.context.SupabaseSync.saveAppointmentAtomic = save;
  await f.app._saveAppointment('lesson');
  assert.equal(f.closed(), true);
  assert.equal(f.fields['appointment-save-error'].hidden, true);
});
