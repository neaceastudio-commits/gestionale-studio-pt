import { getStore } from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';

// This single claim spans preview rebuilds and is independent of the daily staff job.
const agendaKey = 'agenda-personal-test-v1';
const openStore = () => getStore({ name: 'calendar-whatsapp-preview-tests', consistency: 'strong' });
const reply = (status, code = 200) => Response.json({ status }, {
  status: code, headers: { 'Cache-Control': 'no-store' }
});

export function createHandler({
  authenticate = auth.authenticate, env = process.env, store = openStore,
  provider = agenda.createService({ env })
} = {}) {
  return async (request, context) => {
    if (context.deploy.context !== 'deploy-preview' || context.deploy.published ||
        !env.WHATSAPP_AGENDA_SITE_ID || context.site.id !== env.WHATSAPP_AGENDA_SITE_ID) {
      return reply('unavailable', 404);
    }
    if (request.method !== 'POST') return reply('method_not_allowed', 405);
    let input;
    try { input = await request.json(); } catch { return reply('invalid_request', 400); }
    if (!input || !['status', 'send', 'bia-status', 'bia-send'].includes(input.action) ||
        Object.keys(input).some(k => k !== 'action' && k !== 'accessToken')) return reply('invalid_request', 400);
    try {
      const actor = await authenticate(input.accessToken);
      if (actor?.role !== 'owner') return reply('direction_only', 403);
      const e164 = /^\+[1-9]\d{7,14}$/;
      if (!env.WHATSAPP_ACCESS_TOKEN || !/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID || '') ||
          !/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION || '') || !e164.test(env.WHATSAPP_SENDER_PHONE || '') ||
          !e164.test(env.WHATSAPP_AGENDA_TEST_TO || '') || env.WHATSAPP_AGENDA_TEST_TO === env.WHATSAPP_SENDER_PHONE) {
        return reply('not_configured');
      }
      const isBia = input.action.startsWith('bia-');
      if (isBia && env.WHATSAPP_AGENDA_TEST_TO !== '+393387731722') return reply('not_configured');
      const key = isBia ? 'bia-personal-document-v1' : agendaKey;
      const claims = store();
      const prior = await claims.get(key);
      if (prior) return reply(prior);
      if (input.action === 'status' || input.action === 'bia-status') return reply('ready');
      try { await provider.verifySender(); } catch { return reply('sender_unverified', 409); }
      const claim = await claims.set(key, 'pending', { onlyIfNew: true });
      if (!claim.modified) return reply(await claims.get(key) || 'pending');
      let outcome;
      try {
        const result = isBia ? await provider.sendBiaDocument() : await provider.sendTestText();
        outcome = result.messages?.[0]?.id?.startsWith('wamid.') ? 'accepted' : 'uncertain';
      } catch (error) {
        outcome = error.message === 'provider_rejected' ? 'rejected' : 'uncertain';
      }
      await claims.set(key, outcome);
      return reply(outcome);
    } catch { return reply('service_unavailable', 503); }
  };
}

export default createHandler();
