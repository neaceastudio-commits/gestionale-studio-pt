const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../app/calendario-studio/js');
const response = (status, data) => ({ ok: status < 300, status, text: async () => typeof data === 'string' ? data : JSON.stringify(data) });
const client = { id: 'cycle-test', packageCycleStart: '2026-09-11', sessionsTotal: 8, sessionsRemaining: 7, notes: 'Note da conservare' };
function setup(fetch) {
  let clients = [];
  const context = vm.createContext({ fetch, console: { warn() {} }, localStorage: { setItem() {} },
    State: { saveClients: value => { clients = value; }, saveOperators() {}, saveAppointments() {}, getAppointments: () => [
      { clientIds: ['cycle-test'], serviceId: 'pt11', notes: 'Rinnovo pacchetto da 2026-09-11', date: '2026-09-11', status: 'fatto' }
    ] }, CONFIG: { SERVICES: { pt11: {} } } });
  for (const [file, name] of [['supabase.js', 'SupabaseSync'], ['services.js', 'Services']]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8') + `\nglobalThis.${name} = ${name};`, context);
  }
  return { ...context, clients: () => clients };
}
(async () => {
  for (const missingColumn of [false, true]) {
    const calls = [];
    let stored;
    const env = setup(async (url, options) => {
      const body = options.body && JSON.parse(options.body);
      calls.push({ url, options, body });
      if (options.method === 'PATCH' || options.method === 'POST') {
        if (missingColumn && 'data_conferma' in body) return response(400, "Could not find the 'data_conferma' column of 'clients' in the schema cache");
        stored = { id: client.id, ...body };
        return response(200, [stored]);
      }
      return response(200, url.includes('/clients?') ? [stored] : []);
    });
    assert.equal(env.Services.getClientSessionMetrics({ ...client, packageCycleStart: '' }).needsCycleSetup, true);
    const saved = await env.SupabaseSync.confirmClientPackageCycle(client);
    assert.equal(saved.packageCycleStart, client.packageCycleStart);
    assert.ok(saved.notes.includes(client.notes));
    assert.equal(calls[0].options.method, 'PATCH');
    assert.equal(calls[0].options.headers.Prefer, 'return=representation');
    assert.equal(calls.length, missingColumn ? 2 : 1);
    await env.SupabaseSync.pullAll();
    const reloaded = env.clients()[0];
    assert.equal(reloaded.packageCycleStart, client.packageCycleStart);
    assert.equal(env.Services.getClientSessionMetrics(reloaded).needsCycleSetup, false);
    assert.equal(reloaded.sessionsRemaining, 7);
    await env.SupabaseSync.pushClient({ ...reloaded, packageCycleStart: '2026-10-01' });
    assert.ok(calls.at(-1).body.notes.includes('[CICLO-PACCHETTO 2026-10-01]'));
    assert.ok(!calls.at(-1).body.notes.includes('[CICLO-PACCHETTO 2026-09-11]'));
    await env.SupabaseSync.pushClient({ ...reloaded, packageCycleStart: '' });
    assert.ok(!calls.at(-1).body.notes.includes('[CICLO-PACCHETTO '));
  }
  for (const result of [[], [{ id: client.id }], [{ id: client.id, notes: '[CICLO-PACCHETTO 2026-09-11]', sessions_total: 16, sessions_remaining: 7 }]]) {
    const env = setup(async () => response(200, result));
    assert.ok((await env.SupabaseSync.confirmClientPackageCycle(client)).error);
  }
  const denied = setup(async () => response(403, 'Accesso negato'));
  assert.equal((await denied.SupabaseSync.confirmClientPackageCycle(client)).error, 'Accesso negato');
  console.log('PASS conferma ciclo: persistenza, ricaricamento, schema storico e risposte non valide');
})().catch(error => { console.error(error); process.exitCode = 1; });
