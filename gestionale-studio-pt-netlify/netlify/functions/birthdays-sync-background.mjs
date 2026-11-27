import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import auth from './lib/calendar-audit-auth.js';
import birthdays from './lib/calendar-birthdays.cjs';
import transport from './lib/birthday-caldav.cjs';
import worker from './lib/birthday-sync.cjs';

export default async (request, context) => {
  if (context?.deploy?.context !== 'production' || context?.deploy?.published !== true) return;
  if (process.env.APPLE_BIRTHDAYS_ENABLED !== 'true') return;
  const supplied = request.headers.get('authorization') || '';
  const expected = 'Bearer ' + (process.env.BIRTHDAYS_WORKER_SECRET || '');
  if (!process.env.BIRTHDAYS_WORKER_SECRET || !crypto.timingSafeEqual(crypto.createHash('sha256').update(supplied).digest(), crypto.createHash('sha256').update(expected).digest())) return;
  const env = process.env;
  const cal = new transport.CalDAV({ APPLE_CALDAV_URL: env.APPLE_BIRTHDAYS_URL, APPLE_CALDAV_USER: env.APPLE_BIRTHDAYS_USER, APPLE_CALDAV_PASSWORD: env.APPLE_BIRTHDAYS_PASSWORD });
  const result = await worker.syncBirthdays({ env, cal, store: getStore({ name: 'calendar-birthdays-v1', consistency: 'strong' }), load: () => birthdays.loadBirthdays(auth.db) });
  console.info('birthday-sync-result', JSON.stringify(result));
  if (result.errors) throw Error('Birthday sync incomplete; consult private last-run counts');
};
export const config = { background: true };
