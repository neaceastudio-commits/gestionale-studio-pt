const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app/calendario-studio/js/app.js'), 'utf8');
const start = source.indexOf('  async _updatePackageAppointmentRow(apptId)');
const end = source.indexOf('  async _deletePackageAppointment', start);
async function run({ conflict = false, failure = false } = {}) {
  const first = { id: 'a', clientIds: ['client'], date: '2026-09-14', startTime: '09:00', operatorId: 'pt', status: 'prenotato', notes: '[CICLO-PACCHETTO 2026-09-11]' };
  const second = { ...first, id: 'b', date: '2026-09-16' };
  const appointments = [first, second];
  let writes = 0;
  const values = { 'pkg-date-a': '2026-09-15', 'pkg-time-a': '16:30', 'pkg-operator-a': 'pt', 'pkg-status-a': 'prenotato' };
  const ctx = vm.createContext({ State: { getAppointments: () => appointments }, document: { getElementById: id => ({ value: values[id] }) }, CONFIG: { SHEETS: { enabled: false } }, UI: { showToast() {} }, Calendar: { render() {} },
    Services: { canBookAppointment: (draft, options) => {
      assert.equal(options.strictPackageDays, false);
      assert.equal(draft.id, 'a');
      return { ok: !conflict, errors: conflict ? ['PT occupato'] : [] };
    }, updateAppointment: (id, value) => { const i = appointments.findIndex(a => a.id === id); appointments[i] = { ...appointments[i], ...value }; return appointments[i]; } },
    SupabaseSync: { pushAppointment: async value => { writes++; assert.equal(appointments[0].startTime, '09:00'); assert.equal(value.id, 'a'); return failure ? { error: 'offline' } : null; } } });
  vm.runInContext('const App = {' + source.slice(start, end) + '}; globalThis.App = App;', ctx);
  Object.assign(ctx.App, { guardPortalEdit: () => true, isPortalPtMode: () => false, _withPtAudit: n => n, _openConflictOverview() {}, openPackageOverview() {} });
  await ctx.App._updatePackageAppointmentRow('a');
  assert.deepEqual(appointments[1], second);
  assert.equal(writes, conflict ? 0 : 1);
  assert.equal(appointments[0].startTime, conflict || failure ? '09:00' : '16:30');
  assert.equal(appointments[0].date, conflict || failure ? '2026-09-14' : '2026-09-15');
  assert.equal(appointments[0].notes, first.notes);
}
(async () => { await run(); await run({ conflict: true }); await run({ failure: true }); console.log('PASS modifica singola seduta, conflitti e salvataggio fallito'); })().catch(e => { console.error(e); process.exitCode = 1; });
