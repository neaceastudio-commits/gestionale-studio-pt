// Hourly, including when the app is closed. The background worker owns the lease.
export default async (_request, context) => {
  if (context?.deploy?.context !== 'production' || context?.deploy?.published !== true) return;
  if (process.env.APPLE_BIRTHDAYS_ENABLED !== 'true') return;
  if (process.env.SITE_ID !== '28855faa-de52-4e4c-b1c2-e2db4965670f' || !process.env.BIRTHDAYS_WORKER_SECRET) throw Error('Birthday schedule not configured');
  const response = await fetch('https://new-calendar-neacea.netlify.app/.netlify/functions/birthdays-sync-background', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.BIRTHDAYS_WORKER_SECRET }, signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 202) throw Error('Birthday worker not accepted');
};
export const config = { schedule: '17 * * * *' };
