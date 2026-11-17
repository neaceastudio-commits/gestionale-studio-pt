import {getStore} from '@netlify/blobs';
import auth from './lib/calendar-audit-auth.js';
import {previewAllowed,authorized,readTimedAgenda} from './lib/whatsapp-agenda-timed-preview.mjs';
export default async function(request,context){
 const env=process.env;
 if(request.method!=='POST'||!previewAllowed(context,env))return new Response(null,{status:404});
 const input=await request.json().catch(()=>null);
 if(!await authorized(input,request,env,auth.authenticate))return new Response(null,{status:403});
 try{return Response.json(await readTimedAgenda({store:getStore({name:'calendar-whatsapp-preview-tests',consistency:'strong'}),env}),{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
