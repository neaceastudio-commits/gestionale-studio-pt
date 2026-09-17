import agenda from './lib/email-agenda.js';
async function db(table,{method='GET',body,query=''}={}) {
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw Error('database_not_configured');
  const response=await fetch((process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/'+table+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('database_unavailable');
  return response.json();
}
// UTC candidates cover 06:30–07:00 Europe/Rome in both summer and winter.
export const config = { schedule: '*/5 4-6 * * *' };
export default async () => {
  try {
    const result=await agenda.createService({db}).run({dryRun:false});
    console.log(JSON.stringify({emailAgenda:result}));
    return Response.json(result);
  } catch {
    console.error('email_agenda_unavailable');
    return Response.json({error:'email_agenda_unavailable'},{status:503});
  }
};
