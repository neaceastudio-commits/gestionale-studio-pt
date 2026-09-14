import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';
// Netlify cron is UTC; exactly one invocation matches 06:30 Europe/Rome (DST).
export const config = { schedule: '30 4,5 * * *' };
export default async () => {
  try {
    const result = await agenda.createService({ db: auth.db }).run({ dryRun: false, scheduled: true });
    return Response.json(result);
  } catch { return Response.json({ error: 'whatsapp_agenda_unavailable' }, { status: 503 }); }
};
