'use strict';
const crypto=require('node:crypto');
const {authenticate,db}=require('./calendar-audit-auth');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.createHandler=(source,{ownerOnly=false}={})=>async event=>{
 if(event.httpMethod==='OPTIONS')return reply(204,{});
 if(event.httpMethod!=='POST')return reply(405,{error:'Metodo non consentito'});
 try{
  const input=JSON.parse(event.body||'{}');const actor=await authenticate(input.accessToken);
  if(!actor)return reply(401,{error:'Rientra dal Portale con una sessione verificata'});
  if(ownerOnly && actor.role!=='owner')return reply(403,{error:'Operazione riservata alla Direzione'});
  if(input.operation==='session')return reply(200,{success:true,actor});
  if(['client_shares','set_client_share'].includes(input.operation)){
   if(source!=='calendar'||actor.role!=='owner'||actor.id!=='staff_1')return reply(403,{error:'Condivisione riservata al proprietario dal Calendario'});
   const payload=input.payload||{};const clientId=String(payload.clientId||'').trim();
   if(!clientId)return reply(400,{error:'Seleziona un cliente'});
   if(input.operation==='client_shares'){
    const [shares,operators,clients]=await Promise.all([
     db('pt_client_shares',{query:'?select=operator_id,active&cliente_id=eq.'+encodeURIComponent(clientId)}),
     db('operator_effective_roles',{query:'?select=operator_id,nome,cognome,system_roles,legacy_roles&active=eq.true'}),
     db('clients',{query:'?select=id,pt_assegnato&id=eq.'+encodeURIComponent(clientId)})]);
    if(!clients.length)return reply(404,{error:'Cliente non trovato'});
    return reply(200,{shares,referent:clients[0].pt_assegnato,operators:operators.filter(o=>[...(o.system_roles||[]),...(o.legacy_roles||[])].some(r=>['pt','personal_trainer','personal trainer'].includes(String(r).toLowerCase()))).map(o=>({id:o.operator_id,name:[o.nome,o.cognome].filter(Boolean).join(' ')}))});
   }
   if(typeof payload.active!=='boolean'||!payload.operatorId)return reply(400,{error:'Seleziona il PT e la condivisione'});
   return reply(200,await db('rpc/pt_set_client_share',{method:'POST',body:{p_actor_id:actor.id,p_cliente_id:clientId,p_operator_id:payload.operatorId,p_active:payload.active,p_request_id:crypto.randomUUID()}}));
  }
  if(input.operation==='list'){
   if(actor.role!=='owner')return reply(403,{error:'Registro riservato alla Direzione'});
   return reply(200,await db('rpc/calendar_audit_read',{method:'POST',body:{p_actor_id:actor.id,p_filters:input.filters||{}}}));
  }
  if(!['save','delete','availability','client','operator','assignment'].includes(input.operation))return reply(400,{error:'Operazione non valida'});
  const payload={...(input.payload||{})};
  // JSON null is not SQL NULL: omit the absent optimistic-lock snapshot on create.
  if(input.operation==='save' && payload.expected===null)delete payload.expected;
  const result=await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:actor.id,p_actor_role:actor.role,p_source:source,p_request_id:crypto.randomUUID(),p_operation:input.operation,p_payload:payload}});
  return reply(200,result);
 }catch(error){return reply(error.status===403?403:409,{error:error.message||'Salvataggio non eseguito'})}
};
