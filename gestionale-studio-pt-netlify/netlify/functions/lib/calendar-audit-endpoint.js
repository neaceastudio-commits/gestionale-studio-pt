'use strict';
const crypto=require('node:crypto');
const {authenticate,db}=require('./calendar-audit-auth');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.createHandler=source=>async event=>{
 if(event.httpMethod==='OPTIONS')return reply(204,{});
 if(event.httpMethod!=='POST')return reply(405,{error:'Metodo non consentito'});
 try{
  const input=JSON.parse(event.body||'{}');const actor=await authenticate(input.accessToken);
  if(!actor)return reply(401,{error:'Rientra dal Portale con una sessione verificata'});
  if(input.operation==='session')return reply(200,{success:true,actor});
  if(input.operation==='list'){
   if(actor.role!=='owner')return reply(403,{error:'Registro riservato alla Direzione'});
   return reply(200,await db('rpc/calendar_audit_read',{method:'POST',body:{p_actor_id:actor.id,p_filters:input.filters||{}}}));
  }
  if(!['save','delete','availability','client','operator'].includes(input.operation))return reply(400,{error:'Operazione non valida'});
  const result=await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:actor.id,p_actor_role:actor.role,p_source:source,p_request_id:crypto.randomUUID(),p_operation:input.operation,p_payload:input.payload||{}}});
  return reply(200,result);
 }catch(error){return reply(error.status===403?403:409,{error:error.message||'Salvataggio non eseguito'})}
};
