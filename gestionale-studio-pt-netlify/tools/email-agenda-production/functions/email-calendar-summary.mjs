import {getStore} from '@netlify/blobs';
import summary from '../../../netlify/functions/lib/email-calendar-summary.js';
async function db(table,{query=''}){
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw Error('database_not_configured');
 const r=await fetch((process.env.SUPABASE_URL||'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/'+table+query,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('database_unavailable');return r.json();
}
export const config={schedule:'*/5 18-20 * * 0'};
export default async()=>{
 if(process.env.EMAIL_CALENDAR_SUMMARY_ENABLED!=='true')return new Response(null,{status:204});
 try{
  const result=await summary.createService({db,store:getStore({name:'email-calendar-summary-v1',consistency:'strong'})}).run();
  console.log(JSON.stringify({calendarSummary:result}));
  return Response.json(result,{status:result.status==='failed'?503:200});
 }catch{console.error('calendar_summary_unavailable');return Response.json({error:'calendar_summary_unavailable'},{status:503});}
};
