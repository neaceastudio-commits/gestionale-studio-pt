import {getStore} from '@netlify/blobs';
import {tick} from './lib/whatsapp-matrix-engine.mjs';
export const config={schedule:'* * * * *'};
export default async(request,context)=>{
 try{return Response.json(await tick({context,env:process.env,store:getStore({name:'calendar-whatsapp-preview-tests',consistency:'strong'})}))}
 catch{return Response.json({status:'matrix_scheduler_unavailable'},{status:503})}
};
