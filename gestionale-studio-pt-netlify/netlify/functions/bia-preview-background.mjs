import { getStore } from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';
import { runPlan } from './lib/bia-timed-preview.mjs';

export default async function (request, context) {
  const env = process.env;
  if (context.deploy.context !== 'deploy-preview' || context.deploy.published ||
      !env.WHATSAPP_AGENDA_SITE_ID || context.site.id !== env.WHATSAPP_AGENDA_SITE_ID ||
      env.WHATSAPP_AGENDA_TEST_TO !== '+393387731722' || env.WHATSAPP_SENDER_PHONE !== '+393520525230' ||
      !env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_PHONE_NUMBER_ID !== '1153168214557448' ||
      !/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION || '') || request.method !== 'POST') return;
  const input = await request.json().catch(() => null);
  if (!input || typeof input.accessToken !== 'string' || Object.keys(input).length !== 1) return;
  const actor = await auth.authenticate(input.accessToken);
  if (actor?.role !== 'owner') return;
  await runPlan({
    store: getStore({ name: 'calendar-whatsapp-preview-tests', consistency: 'strong' }),
    provider: agenda.createService({ env })
  });
}
