const assert = require('node:assert/strict');
const { test } = require('node:test');
const crypto = require('node:crypto');
const { handler, _test } = require('../netlify/functions/schedule-client-package');
function token(secret) {
  const payload = Buffer.from(JSON.stringify({ email: 'owner@example.test', operatorId: 'owner', accessLevel: 'owner', exp: Date.now() + 3600000 })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
test('nessuna sessione accettata senza segreto server configurato', () => {
  const previous = [process.env.PT_ACCESS_SECRET, process.env.RESEND_API_KEY];
  delete process.env.PT_ACCESS_SECRET; delete process.env.RESEND_API_KEY;
  try { assert.equal(_test.verifyAccessToken(token('local-test')), null); }
  finally { for (const [i, key] of ['PT_ACCESS_SECRET', 'RESEND_API_KEY'].entries()) { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; } }
});
test('conteggia le prenotazioni oltre la prima pagina e precedenti alla data scelta', async () => {
  const originalFetch = global.fetch, previousSecret = process.env.PT_ACCESS_SECRET;
  process.env.PT_ACCESS_SECRET = 'local-test';
  const calls = [];
  const unrelated = Array.from({ length: 500 }, (_, i) => ({ id: `other-${i}`, date: '2026-09-01', status: 'prenotato', client_ids: ['other'], service_id: 'pt11' }));
  global.fetch = async (url, options) => {
    assert.equal(options.method, 'GET', 'pacchetto già completo: nessuna scrittura');
    const u = new URL(url); calls.push(u);
    let data;
    if (u.pathname.endsWith('/operator_effective_roles')) data = [{ operator_id: 'owner', system_roles: ['owner'] }];
    else if (u.pathname.endsWith('/clients')) data = [{ id: 'test', active: true, package_types: ['PT 1:1'], sessions_total: 8, sessions_remaining: 8, pt_assegnato: 'pt' }];
    else if (u.pathname.endsWith('/appointments')) {
      assert.equal(u.searchParams.has('date'), false);
      data = u.searchParams.get('offset') === '0' ? unrelated : Array.from({ length: 8 }, (_, i) => ({ id: `test-${i}`, date: '2026-09-15', status: 'prenotato', client_ids: ['test'], service_id: 'pt11' }));
    } else throw Error('Unexpected URL');
    return { ok: true, text: async () => JSON.stringify(data) };
  };
  try {
    const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ accessToken: token('local-test'), clientId: 'test', serviceId: 'pt11', startDate: '2026-10-20', schedule: [{ weekday: 'Martedì', time: '17:00' }] }) });
    assert.equal(result.statusCode, 200);
    assert.equal(JSON.parse(result.body).plan.created, 0);
    assert.equal(calls.filter(u => u.pathname.endsWith('/appointments')).length, 2);
  } finally { global.fetch = originalFetch; if (previousSecret === undefined) delete process.env.PT_ACCESS_SECRET; else process.env.PT_ACCESS_SECRET = previousSecret; }
});
