import handler from '../../../netlify/functions/email-agenda-scheduled.mjs';
export const config = { schedule: '*/5 4-6 * * *' };
export default handler;
