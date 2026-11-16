import { getStore } from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';

// This single claim spans preview rebuilds and is independent of the daily staff job.
const agendaKey = 'agenda-personal-test-v1';
const openStore = () => getStore({ name: 'calendar-whatsapp-preview-tests', consistency: 'strong' });
const reply = (status, code = 200) => Response.json({ status }, {
  status: code, headers: { 'Cache-Control': 'no-store' }
});

const targetApp = '1556937375911567';
const targetWaba = '4508719189457199';
const present = 'NEACEA Agenda PT presente.';
const absent = 'NEACEA Agenda PT assente nell’elenco restituito da Meta.';

function subscriptionResult(status, detail) {
  return Response.json({ status, detail }, { headers: { 'Cache-Control': 'no-store' } });
}

function graphReason(response, data) {
  const error = data?.error || {};
  const parts = ['HTTP ' + response.status];
  if (Number.isInteger(error.code)) parts.push('codice Meta ' + error.code);
  if (Number.isInteger(error.error_subcode)) parts.push('sottocodice ' + error.error_subcode);
  if (typeof error.fbtrace_id === 'string' && /^[\w-]{1,80}$/.test(error.fbtrace_id)) parts.push('Trace ID ' + error.fbtrace_id);
  return parts.join(', ');
}

async function subscribeStudioApp(env) {
  // The Graph subscription targets the caller app. Verify it before writing.
  const root = 'https://graph.facebook.com/' + env.WHATSAPP_API_VERSION + '/';
  const options = () => ({ headers: { Authorization: 'Bearer ' + env.WHATSAPP_ACCESS_TOKEN },
    redirect: 'error', signal: AbortSignal.timeout(6000) });
  try {
    const app = await fetch(root + 'app?fields=id', options());
    const data = await app.json();
    if (!app.ok) return subscriptionResult('waba_wrong_app', graphReason(app, data));
    if (data.id !== targetApp) return subscriptionResult('waba_wrong_app', 'ID app diverso da quello previsto.');
  } catch { return subscriptionResult('waba_wrong_app', 'Verifica app: risposta non disponibile.'); }
  let actionResult = 'Nessuna risposta alla richiesta di iscrizione.';
  try {
    const result = await fetch(root + targetWaba + '/subscribed_apps', { ...options(), method: 'POST' });
    const data = await result.json();
    actionResult = result.ok && data.success === true ? 'Meta ha accettato la richiesta.' : 'Richiesta: ' + graphReason(result, data) + '.';
  } catch { /* A lost response does not establish whether the subscription succeeded. */ }
  const after = await checkWabaSubscription(env);
  if (after === present) return reply('waba_present');
  return subscriptionResult('waba_unconfirmed', actionResult + ' Verifica successiva: ' + after);
}

async function checkWabaSubscription(env) {
  const url = new URL('https://graph.facebook.com/' + env.WHATSAPP_API_VERSION + '/' + targetWaba + '/subscribed_apps');
  url.searchParams.set('limit', '100');
  try {
    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + env.WHATSAPP_ACCESS_TOKEN },
      redirect: 'error', signal: AbortSignal.timeout(6000)
    });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.data)) {
      return 'Lettura elenco: ' + graphReason(response, result) + '.';
    }
    const ids = result.data.map(row => row?.whatsapp_business_api_data?.id);
    if (ids.includes(targetApp)) return present;
    if (result.paging?.next || ids.some(id => typeof id !== 'string')) return 'Elenco incompleto.';
    return absent;
  } catch {
    return 'Controllo non disponibile.';
  }
}

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
      const portfolioReady = rows.some(e => e.entity_type === 'BUSINESS' && e.can_send_message === 'AVAILABLE');
      const retryReady = portfolioReady && ['AVAILABLE', 'LIMITED'].includes(health.can_send_message) &&
        rows.every(e => e.can_send_message === 'AVAILABLE' || (e.can_send_message === 'LIMITED' &&
          e.errors?.length > 0 && e.errors.every(issue => [138024, 138025].includes(Number(issue.error_code)))));
      return { retryReady, status: 'bia_health', detail: ['Stato di invio Meta: ' + (states[health.can_send_message] || 'sconosciuto'), ...detail].join('\n') };
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
    if (!input || !['status', 'send', 'bia-status', 'bia-send', 'bia-subscribe', 'text-status', 'text-send'].includes(input.action) ||
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
      const plainText = input.action.startsWith('text-');
      if ((isBia || plainText) && env.WHATSAPP_AGENDA_TEST_TO !== '+393387731722') return reply('not_configured');
      if (input.action === 'bia-subscribe') return await subscribeStudioApp(env);
      let key = isBia ? 'bia-personal-document-v1' : agendaKey;
      if (plainText) key = 'personal-text-post-subscription-v1';
      const claims = store();
      let prior = await claims.get(key);
      // Keep the original outcome. Allow one explicit text retry with the partner credential.
      if (plainText && /^text_rejected_10(?: · |$)/.test(prior || '')) {
        key += '-partner-token';
        prior = await claims.get(key);
      }
      // The old handler kept no provider code. Permit one explicit diagnostic retry only after a definite rejection.
      if (isBia && prior === 'rejected') {
        key += '-diagnostic';
        prior = await claims.get(key);
      }
      if (isBia && prior === 'bia_rejected_10') {
        key += '-verified-business';
        prior = await claims.get(key);
        if (prior === 'bia_rejected_10') {
          key += '-error-details';
          prior = await claims.get(key);
        }
        if (!prior) {
          const check = await checkMessagingPermission(env);
          if (typeof check !== 'object') return reply(check);
          if (!check.retryReady) return Response.json(check, { headers: { 'Cache-Control': 'no-store' } });
        }
      }
      if (isBia && prior?.startsWith('bia_rejected_10 · ')) {
        const textOutcome = await claims.get('personal-text-post-subscription-v1-partner-token');
        if (textOutcome === 'accepted') {
          key += '-partner-token';
          prior = await claims.get(key);
        } else if (input.action === 'bia-status') {
          const subscription = await checkWabaSubscription(env);
          return reply(prior + ' · Iscrizione webhook WABA: ' + subscription);
        }
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
      if (input.action === 'bia-status' || input.action === 'text-status') return reply('ready');
      const claim = await claims.set(key, 'pending', { onlyIfNew: true });
      if (!claim.modified) return reply(await claims.get(key) || 'pending');
      let outcome;
      try {
        const result = isBia ? await provider.sendBiaDocument() : await provider.sendTestText(plainText ? 'Ciao Gianluca' : undefined);
        outcome = result.messages?.[0]?.id?.startsWith('wamid.') ? 'accepted' : 'uncertain';
      } catch (error) {
        outcome = error.message === 'provider_rejected' ? 'rejected' : 'uncertain';
        if ((isBia || plainText) && outcome === 'rejected') {
          const code = Number.isInteger(error.providerCode) ? error.providerCode : 0;
          outcome = (plainText ? 'text_rejected_' : 'bia_rejected_') + code;
          if (error.providerDetail) outcome += ' · ' + error.providerDetail;
          console.warn('WhatsApp personal test: provider rejection, code=' + code);
        }
      }
      await claims.set(key, outcome);
      return reply(outcome);
    } catch { return reply('service_unavailable', 503); }
  };
}

export default createHandler();
