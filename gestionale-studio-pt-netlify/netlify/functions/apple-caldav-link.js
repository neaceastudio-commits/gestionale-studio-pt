'use strict';
const auth=require('./lib/calendar-audit-auth');
const endpoint='https://neacea-caldav-gianluca.netlify.app/.netlify/functions/apple-caldav-link';
exports.handler=async event=>{
 const response=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
 if(event.httpMethod!=='POST')return response(405,{error:'Metodo non consentito'});
 try{
  const b=JSON.parse(event.body||'{}'),actor=await auth.authenticate(b.accessToken);
  if(actor?.id!=='staff_1'||actor.role!=='owner')return response(403,{error:'Collegamento riservato alla Direzione'});
  if(!['status','link'].includes(b.operation)||typeof b.id!=='string'||!b.id||b.id.length>160)return response(400,{error:'Appuntamento non valido'});
  const r=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:b.accessToken,operation:b.operation,id:b.id}),signal:AbortSignal.timeout(28000)});
  return response(r.status,await r.json());
 }catch{return response(503,{error:'Collegamento non confermato. Riprova: non verranno creati duplicati.'})}
};
