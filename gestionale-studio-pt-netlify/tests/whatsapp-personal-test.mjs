import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandler } from '../netlify/functions/whatsapp-agenda-test.mjs';
import agenda from '../netlify/functions/lib/whatsapp-agenda.js';

function fixture({ role = 'owner', envOverrides, outcome = 'accepted' } = {}) {
  const env = { WHATSAPP_AGENDA_SITE_ID: 'calendar', WHATSAPP_PHONE_NUMBER_ID: '123',
    WHATSAPP_API_VERSION: 'v26.0', WHATSAPP_SENDER_PHONE: '+390000000010',
    WHATSAPP_AGENDA_TEST_TO: '+390000000020', WHATSAPP_ACCESS_TOKEN: 'simulated', ...envOverrides };
  const context = { site: { id: 'calendar' }, deploy: { context: 'deploy-preview', published: false } };
  const calls = [];
  let stored = null;
  const store = () => ({
    get: async () => stored,
    set: async (_, value, options) => {
      if (options?.onlyIfNew && stored !== null) return { modified: false };
      stored = value;
      return { modified: true };
    }
  });
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'GET') return Response.json({ display_phone_number: '+39 0000000010' });
    if (outcome === 'uncertain') throw Error('timeout');
    if (outcome === 'rejected') return Response.json({ error: { code: 131047 } }, { status: 400 });
    return Response.json({ messages: [{ id: 'wamid.example' }] });
  };
  const handler = createHandler({ authenticate: async () => ({ role }), env, store,
    provider: agenda.createService({ env, fetchImpl }) });
  async function request(action, extra = {}, ctx = context) {
    const req = new Request('https://calendar.test/', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
    const res = await handler(req, ctx);
    return { http: res.status, ...(await res.json()) };
  }
  return { calls, context, request };
}

test('Only the calendar preview and authenticated management can submit the test', async () => {
  for (const role of ['pt', 'secretary', null]) {
    const f = fixture({ role });
    assert.equal((await f.request('send')).http, 403);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  for (const deploy of [{ context: 'production' }, { context: 'branch-deploy' }, { context: 'deploy-preview', published: true }]) {
    assert.equal((await f.request('send', {}, { ...f.context, deploy })).http, 404);
  }
  assert.equal((await f.request('send', {}, { ...f.context, site: { id: 'different' } })).http, 404);
  assert.equal((await f.request('send', { to: '+390000000030' })).http, 400);
  assert.equal((await f.request('send', { text: 'override' })).http, 400);
  assert.equal(f.calls.length, 0);
});
test('Missing token and sender mismatch block the message before the claim', async () => {
  const missing = fixture({ envOverrides: { WHATSAPP_ACCESS_TOKEN: '' } });
  assert.equal((await missing.request('send')).status, 'not_configured');
  assert.equal(missing.calls.length, 0);
  const mismatch = fixture({ envOverrides: { WHATSAPP_SENDER_PHONE: '+390000000019' } });
  assert.equal((await mismatch.request('send')).status, 'sender_unverified');
  assert.equal(mismatch.calls.length, 1);
  assert.equal(mismatch.calls[0].options.method, 'GET');
});
test('One fixed synthetic message survives concurrent clicks and later attempts', async () => {
  const f = fixture();
  assert.equal((await f.request('status')).status, 'ready');
  assert.equal(f.calls.length, 0);
  await Promise.all([f.request('send'), f.request('send')]);
  assert.equal((await f.request('send')).status, 'accepted');
  assert.equal((await f.request('status')).status, 'accepted');
  const posts = f.calls.filter(c => c.options.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, 'https://graph.facebook.com/v26.0/123/messages');
  const body = JSON.parse(posts[0].options.body);
  assert.equal(body.to, '390000000020');
  assert.equal(body.type, 'text');
  assert.match(body.text.body, /09:00 · Cliente di prova · PT 1:1 · 3\/8/);
});
test('Unknown outcomes and explicit refusals do not cause another send', async () => {
  for (const outcome of ['uncertain', 'rejected']) {
    const f = fixture({ outcome });
    assert.equal((await f.request('send')).status, outcome);
    assert.equal((await f.request('send')).status, outcome);
    assert.equal(f.calls.filter(c => c.options.method === 'POST').length, 1);
  }
});
