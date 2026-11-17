import auth from './calendar-audit-auth.js';
import agenda from './whatsapp-agenda.js';
import {sendSelected} from './whatsapp-compose.mjs';
import {agendaRules} from './whatsapp-agenda-rules-store.mjs';
import {listTemplates} from './whatsapp-templates.mjs';
import {receiveEvents,deliveryStatuses,deliverySetup,json} from './whatsapp-delivery.mjs';
const siteId='28855faa-de52-4e4c-b1c2-e2db4965670f';
const allowed=new Set(['composer-status','composer-setup','composer-templates','composer-send','agenda-rules','agenda-save-rule']);
export function createHandler({authenticate=auth.authenticate,db=auth.db,env=process.env,store,provider=agenda.createService({db,env}),send=sendSelected,templates=listTemplates}={}){
 return async(request,context)=>{
  if(context.site?.id!==siteId||env.WHATSAPP_AGENDA_SITE_ID!==siteId||!['production','deploy-preview'].includes(context.deploy?.context))return json({status:'unavailable'},404);
  if(new URL(request.url).pathname.includes('/whatsapp-messages/events/'))return receiveEvents(request,{env,store:store()});
  if(request.method!=='POST')return json({status:'method_not_allowed'},405);
  let input;try{input=await request.json()}catch{return json({status:'invalid_request'},400)}
  if(!allowed.has(input?.action))return json({status:'invalid_request'},400);
  try{
   const actor=await authenticate(input.accessToken);
   if(actor?.role!=='owner')return json({status:'Accesso Direzione richiesto.'},403);
   if(input.action==='composer-send')return await send(input,{db,env,provider,store});
   if(input.action==='composer-templates')return json(await templates(env));
   if(input.action==='composer-status')return await deliveryStatuses(input,{store:store(),env});
   if(input.action==='composer-setup')return await deliverySetup({store:store(),env});
   return await agendaRules(input,store());
  }catch{return json({status:input.action==='composer-send'?'Esito da verificare':'Servizio non disponibile.'},503)}
 };
}
