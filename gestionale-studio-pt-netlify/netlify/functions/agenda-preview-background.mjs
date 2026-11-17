import {getStore} from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import agenda from './lib/whatsapp-agenda.js';
import {previewAllowed,authorized,runTimedAgenda} from './lib/whatsapp-agenda-timed-preview.mjs';
export default async function(request,context){
 const env=process.env;
 if(request.method!=='POST'||!previewAllowed(context,env))return;
 const input=await request.json().catch(()=>null);
 if(!await authorized(input,request,env,auth.authenticate))return;
 await runTimedAgenda({store:getStore({name:'calendar-whatsapp-preview-tests',consistency:'strong'}),env,db:auth.db,provider:agenda.createService({db:auth.db,env})});
}
export const config={background:true};
