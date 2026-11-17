import { setTimeout as sleep } from 'node:timers/promises';

const planKey = 'bia-timed-preview-v1/appointment';
const claimKey = 'bia-timed-preview-v1/attempt';
const day = 24 * 60 * 60 * 1000;

export async function readPlan(store) {
  const appointment = await store.get(planKey, { type: 'json' });
  if (!appointment) return { status: 'ready' };
  const status = await store.get(claimKey);
  return { ...appointment, status: status || 'scheduled' };
}

export async function runPlan({ store, provider, now = Date.now, wait = sleep }) {
  const appointmentAt = now() + day + 120000;
  await store.setJSON(planKey, { appointmentAt, dueAt: appointmentAt - day }, { onlyIfNew: true });
  const plan = await readPlan(store);
  if (plan.status !== 'scheduled') return;
  await wait(Math.max(0, plan.dueAt - now()));
  const claim = await store.set(claimKey, 'pending', { onlyIfNew: true });
  if (!claim.modified) return;
  let status = 'uncertain';
  try {
    if (now() > plan.dueAt + 300000) {
      status = 'expired';
    } else {
      await provider.verifySender();
      const time = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(plan.appointmentAt);
      const result = await provider.sendBiaDocument('Promemoria di prova NEACEA: la tua BIA dimostrativa è domani alle ' + time + '. In allegato trovi le istruzioni.');
      if (result?.messages?.[0]?.id?.startsWith('wamid.')) status = 'accepted';
    }
  } catch (error) {
    if (error.message === 'provider_rejected') status = 'rejected_' + (error.providerCode || 0);
    else if (error.message === 'sender_mismatch') status = 'sender_mismatch';
  }
  await store.set(claimKey, status);
}
