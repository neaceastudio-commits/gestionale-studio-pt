import {getStore} from '@netlify/blobs';
import monitor from './lib/monitor.cjs';
export const config={schedule:'* * * * *'};
export default async(_request,context)=>{
 const keys=['CALDAV_MONITOR_ENABLED','APPLE_CALDAV_URL','APPLE_CALDAV_USER','APPLE_CALDAV_PASSWORD','RESEND_API_KEY','EMAIL_AGENDA_FROM','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'];
 const env=Object.fromEntries(keys.map(k=>[k,Netlify.env.get(k)]));env.SITE_ID=context.site.id;env.CONTEXT=context.deploy.context;
 if(env.CALDAV_MONITOR_ENABLED!=='true'||env.SITE_ID!==monitor.SITE||env.CONTEXT!=='production')return new Response(null,{status:204});
 const db=async(table,{query=''})=>{const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;const r=await fetch((env.SUPABASE_URL||'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/'+table+query,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Database unavailable');return r.json();};
 try{const result=await monitor.service({env,db,store:getStore({name:'caldav-monitor-v1',consistency:'strong'}),syncStore:getStore({name:'caldav-gianluca-v1',consistency:'strong'})}).run(context.deploy.id);console.log(JSON.stringify({monitor:result}));return new Response(null,{status:204});}catch{console.error('CalDAV monitor incomplete');return new Response(null,{status:503});}
};
