import {getStore} from '@netlify/blobs';
import reminder from '../../../netlify/functions/lib/email-package-reminder.js';
export const config={schedule:'*/5 6-8 * * *'};
export default async(_request,context)=>{
 const keys=['EMAIL_PACKAGE_REMINDER_ENABLED','GMAIL_REMINDER_WEBAPP_URL','GMAIL_REMINDER_SECRET','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'];
 const env=Object.fromEntries(keys.map(k=>[k,Netlify.env.get(k)]));env.SITE_ID=context.site.id;env.CONTEXT=context.deploy.context;
 if(env.EMAIL_PACKAGE_REMINDER_ENABLED!=='true'||env.SITE_ID!==reminder.SITE||env.CONTEXT!=='production')return new Response(null,{status:204});
 const db=async(table,query)=>{const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;const r=await fetch((env.SUPABASE_URL||'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/'+table+query,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('database_unavailable');return r.json();};
 try{const result=await reminder.createService({db,env,store:getStore({name:'email-package-reminder-v1',consistency:'strong'})}).run(context.deploy.id);console.log(JSON.stringify({packageReminder:result}));return new Response(null,{status:204});}catch{console.error('package_reminder_incomplete');return new Response(null,{status:503});}
};
