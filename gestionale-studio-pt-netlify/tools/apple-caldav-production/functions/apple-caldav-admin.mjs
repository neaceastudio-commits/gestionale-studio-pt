import {getStore} from '@netlify/blobs';
import core from './lib/core.cjs';
import auth from '../../../netlify/functions/lib/calendar-audit-auth.js';
export default async request=>{
 if(request.method!=='POST')return new Response('',{status:405});
 try{
  const input=await request.json(),actor=await auth.authenticate(input.accessToken);
  if(actor?.id!=='staff_1'||actor.role!=='owner')return new Response('',{status:403});
  const s=core.service({store:getStore({name:'caldav-gianluca-v1',consistency:'strong'})});
  if(!['run','provision','status','removeMapping'].includes(input.operation))return new Response('',{status:400});
  const result=await s[input.operation](input.id);
  return Response.json(result||{ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e.message},{status:409,headers:{'Cache-Control':'no-store'}})}
};
