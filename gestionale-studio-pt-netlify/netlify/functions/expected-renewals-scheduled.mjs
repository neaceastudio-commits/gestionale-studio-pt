import auth from './lib/calendar-audit-auth.js';
import renewals from './lib/expected-renewals.js';
export const config = { schedule: '*/10 * * * *' };
export default async () => {
 const result = await renewals.createService({db:auth.db}).run();
 if(result.results.some(r=>r.error))throw Error('Rinnovi previsti: verificare gli errori di generazione');
 return Response.json(result);
};
