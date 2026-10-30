'use strict';
const {authenticate,db}=require('./lib/calendar-audit-auth');
const {createService,upstream}=require('./lib/calendar-client-finance');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.createHandler=({auth=authenticate,database=db,provider=upstream}={})=>async event=>{
 if(event.httpMethod!=='POST')return reply(405,{error:'Metodo non consentito'});
 try{
  let input;try{input=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'Richiesta non valida'})}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply(400,{error:'Richiesta non valida'});
  const actor=await auth(input.accessToken);
  if(!actor)return reply(401,{error:'Accedi al Calendario'});
  if(actor.role!=='owner')return reply(403,{error:'Pagamenti riservati alla Direzione'});
  if(input.calendarRevision!=='20261030-shared-finance-v1')return reply(409,{error:'Il Calendario è stato aggiornato: ricarica prima di gestire gli incassi',code:'CALENDAR_RELOAD_REQUIRED'});
  return reply(200,await createService({db:database,upstream:provider}).handle(actor,input));
 }catch(error){return reply(error.status||409,{error:error.message||'Operazione non confermata'})}
};
exports.handler=exports.createHandler();
