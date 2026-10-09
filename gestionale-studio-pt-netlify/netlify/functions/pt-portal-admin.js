'use strict';
const crypto = require('node:crypto');
const { authenticate, db } = require('./lib/calendar-audit-auth');
const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply = (statusCode, body) => ({statusCode,headers,body:JSON.stringify(body)});
const roles = row => [...(row.roles || []), ...(row.legacy_roles || []), ...(row.system_roles || [])].map(r=>String(r).toLowerCase());
const isOwner = row => roles(row).some(r=>['owner','admin','administrator','amministratore','titolare','super_admin','direzione'].includes(r));
const isPt = row => roles(row).some(r=>['pt','personal_trainer','personal trainer'].includes(r));
exports.handler = async event => {
  if(event.httpMethod === 'OPTIONS') return reply(204,{});
  if(event.httpMethod !== 'POST') return reply(405,{error:'Metodo non consentito'});
  try {
    const input = JSON.parse(event.body || '{}');
    const actor = await authenticate(input.accessToken);
    if(!actor || actor.role !== 'owner') return reply(403,{error:'Accesso riservato alla Direzione'});
    if(!['list','set','send'].includes(input.action)) return reply(400,{error:'Azione non valida'});
    const [directory, settings] = await Promise.all([
      db('operator_effective_roles',{query:'?select=*'}),
      db('operators',{query:'?select=id,email,active,portal_access_enabled,portal_access_version'})
    ]);
    const operators = directory.filter(isPt).map(row=>({...row,...settings.find(s=>s.id===row.operator_id),id:row.operator_id}));
    if(input.action === 'list') return reply(200,{operators:operators.map(op=>({id:op.id,nome:op.nome,cognome:op.cognome,email:op.email,active:op.active,enabled:op.portal_access_enabled===true,protected:isOwner(op)||op.id===actor.id}))});
    const operator = operators.find(op=>op.id===input.operatorId);
    if(!operator) return reply(404,{error:'Personal trainer non trovato'});
    if(operator.id===actor.id || isOwner(operator)) return reply(403,{error:'Gli accessi Direzione non si modificano da questo pannello'});
    if(input.action==='send') {
      if(!operator.portal_access_enabled || operator.active===false) return reply(409,{error:'Attiva e salva l’accesso prima di inviare la mail'});
      return require('./pt-access-email').handler({...event,body:JSON.stringify({operatorId:operator.id,email:operator.email,name:[operator.nome,operator.cognome].filter(Boolean).join(' ')})});
    }
    if(typeof input.enabled !== 'boolean') return reply(400,{error:'Stato accesso non valido'});
    const email = input.email===undefined ? String(operator.email||'') : String(input.email).trim().toLowerCase();
    if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400,{error:'Inserisci un indirizzo email valido'});
    if(input.enabled && (operator.active===false || !email)) return reply(409,{error:'Per attivare il portale servono email e professionista attivo nello Staff'});
    if(email && settings.some(op=>op.id!==operator.id && String(op.email||'').trim().toLowerCase()===email.toLowerCase())) return reply(409,{error:'Questa email è già utilizzata da un altro professionista'});
    const row={id:operator.id,portal_access_enabled:input.enabled};
    if(input.email!==undefined)row.email=email;
    await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:actor.id,p_actor_role:'owner',p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'operator',p_payload:{method:'PATCH',rows:[row]}}});
    return reply(200,{success:true,operatorId:operator.id,enabled:input.enabled});
  } catch(error) {
    return reply(409,{error: /portal_access_/.test(error.message) ? 'Gestione accessi non ancora installata sul database. Nessuna modifica eseguita.' : error.message});
  }
};
