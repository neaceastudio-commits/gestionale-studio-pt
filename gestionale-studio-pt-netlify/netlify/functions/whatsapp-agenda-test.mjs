import { getStore } from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';

// This single claim spans preview rebuilds and is independent of the daily staff job.
const agendaKey = 'agenda-personal-test-v1';
const openStore = () => getStore({ name: 'calendar-whatsapp-preview-tests', consistency: 'strong' });
const reply = (status, code = 200) => Response.json({ status }, {
  status: code, headers: { 'Cache-Control': 'no-store' }
});

async function checkMessagingPermission(env) {
  try {
    const response = await fetch('https://graph.facebook.com/' + env.WHATSAPP_API_VERSION + '/me/permissions', {
      headers: { Authorization: 'Bearer ' + env.WHATSAPP_ACCESS_TOKEN },
      redirect: 'error', signal: AbortSignal.timeout(6000)
    });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.data)) return 'bia_permissions_unknown';
    const scope = result.data.find(entry => entry.permission === 'whatsapp_business_messaging');
    if (scope?.status === 'granted') {
      const phone = await fetch('https://graph.facebook.com/' + env.WHATSAPP_API_VERSION + '/' + env.WHATSAPP_PHONE_NUMBER_ID + '?fields=health_status', {
        headers: { Authorization: 'Bearer ' + env.WHATSAPP_ACCESS_TOKEN },
        redirect: 'error', signal: AbortSignal.timeout(6000)
      }).catch(() => null);
      const report = phone?.ok ? await phone.json().catch(() => null) : null;
      const health = report?.health_status;
      if (!health?.can_send_message) return 'bia_scope_granted';
      const labels = { APP: 'App', WABA: 'Account WhatsApp', BUSINESS: 'Portfolio', PHONE_NUMBER: 'Numero' };
      const states = { AVAILABLE: 'disponibile', BLOCKED: 'bloccato', LIMITED: 'limitato' };
      const rows = (Array.isArray(health.entities) ? health.entities : []).filter(e => Object.hasOwn(labels, e.entity_type));
      const detail = rows.map(e => {
        const reasons = (Array.isArray(e.errors) ? e.errors : []).slice(0, 3).map(x =>
          [x.error_code, x.error_description, x.possible_solution].filter(Boolean).join(' · ').slice(0, 500)
        );
        return [labels[e.entity_type], states[e.can_send_message] || 'stato sconosciuto', ...reasons].join(' · ');
      });
      return { status: 'bia_health', detail: ['Stato di invio Meta: ' + (states[health.can_send_message] || 'sconosciuto'), ...detail].join('\n') };
    }
    if (!scope && result.paging?.next) return 'bia_permissions_unknown';
    return 'bia_scope_missing';
  } catch { return 'bia_permissions_unknown'; }
}

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
      let key = isBia ? 'bia-personal-document-v1' : agendaKey;
      const claims = store();
      let prior = await claims.get(key);
      // The old handler kept no provider code. Permit one explicit diagnostic retry only after a definite rejection.
      if (isBia && prior === 'rejected') {
        key += '-diagnostic';
        prior = await claims.get(key);
      }
      if (prior === 'bia_rejected_10' && input.action === 'bia-status') {
        const check = await checkMessagingPermission(env);
        if (typeof check === 'object') return Response.json(check, { headers: { 'Cache-Control': 'no-store' } });
        return reply(check);
      }
      if (prior) return reply(prior);
      if (input.action === 'status') return reply('ready');
      try {
        await provider.verifySender();
      } catch (error) {
        const code = error.providerCode;
        const reason = code === 190 ? 'token_invalid' :
          [10, 200].includes(code) ? 'sender_permission' :
          code === 100 ? 'phone_id_unavailable' :
          error.message === 'sender_mismatch' ? 'sender_mismatch' : 'sender_unverified';
        return reply(reason, 409);
      }
      if (input.action === 'bia-status') return reply('ready');
      const claim = await claims.set(key, 'pending', { onlyIfNew: true });
      if (!claim.modified) return reply(await claims.get(key) || 'pending');
      let outcome;
      try {
        const result = isBia ? await provider.sendBiaDocument() : await provider.sendTestText();
        outcome = result.messages?.[0]?.id?.startsWith('wamid.') ? 'accepted' : 'uncertain';
      } catch (error) {
        outcome = error.message === 'provider_rejected' ? 'rejected' : 'uncertain';
        if (isBia && outcome === 'rejected') {
          const code = Number.isInteger(error.providerCode) ? error.providerCode : 0;
          outcome = 'bia_rejected_' + code;
          console.warn('WhatsApp BIA: provider rejection, code=' + code);
        }
      }
      await claims.set(key, outcome);
      return reply(outcome);
    } catch { return reply('service_unavailable', 503); }
  };
}

export default createHandler();
