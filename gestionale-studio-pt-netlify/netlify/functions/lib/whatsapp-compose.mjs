import { prepareTemplate } from './whatsapp-templates.mjs';
import { prepareAgendaDocument } from './whatsapp-agenda-document.mjs';
import { createHash } from 'node:crypto';
import agenda from './whatsapp-agenda.js';

function normalize(value) {
  let phone = String(value || '').replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  else if (/^3\d{9}$/.test(phone)) phone = '+39' + phone;
  else if (/^393\d{9}$/.test(phone)) phone = '+' + phone;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : '';
}

async function lookup(db, group, id) {
  const where = '&id=eq.' + encodeURIComponent(id);
  if (group === 'cliente') {
    const [client] = await db('clients', {query:'?select=telefono,active' + where});
    return client && client.active !== false ? normalize(client.telefono) : '';
  }
  const [[op], [roles]] = await Promise.all([
    db('operators', {query:'?select=id,active,roles,whatsapp_phone' + where}),
    db('operator_effective_roles', {query:'?select=active,system_roles,legacy_roles&operator_id=eq.' + encodeURIComponent(id)})
  ]);
  return op && agenda.isPt({...op,...roles}) ? normalize(op.whatsapp_phone) : '';
}

export async function sendSelected(input, {db, env, provider, store, fetchImpl = fetch, scheduledAt, beforeDispatch, onClaimed}) {
  const reply = (status, code = 200, messageId = null) => Response.json({status, ...(messageId ? {messageId} : {})}, {status:code,headers:{'Cache-Control':'no-store'}});
  let agendaPart=null;
  if(input.agenda){
    try{input=await prepareAgendaDocument(input,provider,scheduledAt?new Date(scheduledAt):new Date());agendaPart=input.agendaPart}
    catch(e){const allowed=['Agenda o destinatario non valido.','Regola agenda non valida.','Nessuna agenda completa disponibile per questo PT.','Il calendario è cambiato: aggiorna l’anteprima prima di inviare.','Agenda troppo lunga: scegli un giorno. Nessuna seduta è stata tagliata.','Testo agenda non valido.','Formato agenda non valido. Riapri il pannello aggiornato.','Le parti dell’agenda sono cambiate. Aggiorna l’anteprima.','Una seduta supera il limite del modello WhatsApp. Nessuna riga è stata tagliata.','Agenda incompleta. Rileggi il calendario.'];return reply(allowed.includes(e.message)?e.message:'Agenda non disponibile. Aggiorna l’anteprima prima di inviare.',409)}
  }
  const contact = /^(cliente|pt):([a-zA-Z0-9_-]{1,128})$/.exec(input.contact);
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  const file = input.file;
  if (!contact || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(input.batch) ||
      (!input.template && (!body || body.length > (file ? 1024 : 4096)))) return reply('Messaggio o destinatario non valido.',400);
  const allowedFiles = ['application/pdf','image/jpeg','image/png'];
  if (file && (!allowedFiles.includes(file.type) || typeof file.name !== 'string' || !file.name.trim() ||
      typeof file.base64 !== 'string' || !file.base64.length || file.base64.length > 4194304 ||
      !/^[a-zA-Z0-9+/]+={0,2}$/.test(file.base64))) return reply('Allegato non valido.',400);
  if (env.WHATSAPP_SENDER_PHONE !== '+393520525230' || env.WHATSAPP_PHONE_NUMBER_ID !== '1153168214557448' ||
      !env.WHATSAPP_ACCESS_TOKEN || !/^v\d+\.\d+$/.test(env.WHATSAPP_API_VERSION || '')) return reply('Mittente studio non configurato.',409);
  const phone = await lookup(db,contact[1],contact[2]);
  if (!phone || phone === env.WHATSAPP_SENDER_PHONE) return reply('Numero destinatario non disponibile.',400);
  let template=null;
  if(input.template){
    try{template=await prepareTemplate(input.template,file,env,fetchImpl)}
    catch(error){return reply(error.message==='templates_unavailable'?'Elenco modelli Meta non disponibile.':error.message,400)}
  }
  // Scheduled retries retain the same claim even if a PT's phone is edited.
  // These options are server-only; request JSON cannot select this namespace.
  const key = (scheduledAt?'scheduled/':'manual/') + input.batch + '/' + createHash('sha256').update(scheduledAt?input.contact:phone).digest('hex')+(Number.isInteger(agendaPart)?'/agenda-part-'+agendaPart:'');
  const claims = store();
  const prior = await claims.getWithMetadata(key);
  if (prior) return reply(prior.data,200,prior.metadata?.messageId);
  await provider.verifySender();
  if(beforeDispatch&&!await beforeDispatch())return reply('Programmazione disattivata.',409);
  const pending = 'Esito da verificare';
  if (!(await claims.set(key,pending,{onlyIfNew:true})).modified) {
    const current=await claims.getWithMetadata(key);
    return reply(current?.data||pending,200,current?.metadata?.messageId);
  }
  onClaimed?.();
  const root = 'https://graph.facebook.com/' + env.WHATSAPP_API_VERSION + '/' + env.WHATSAPP_PHONE_NUMBER_ID;
  const headers = {Authorization:'Bearer ' + env.WHATSAPP_ACCESS_TOKEN};
  async function post(path, options) {
    const response = await fetchImpl(root + path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(9000),...options});
    const data = await response.json();
    if (!response.ok) {
      const error = new Error('meta');
      error.code = Number(data.error?.code) || response.status;
      throw error;
    }
    return data;
  }
  let result, messageId = null;
  try {
    if(beforeDispatch&&!await beforeDispatch()){
      await claims.set(key,'Programmazione disattivata.');
      return reply('Programmazione disattivata.',409);
    }
    const payload = {messaging_product:'whatsapp',recipient_type:'individual',to:phone.slice(1)};
    if (file) {
      const filename = file.name.replace(/[\\/\x00-\x1f]/g,'_').slice(-150);
      const form = new FormData();
      form.append('messaging_product','whatsapp');
      form.append('type',file.type);
      form.append('file',new Blob([Buffer.from(file.base64,'base64')],{type:file.type}),filename);
      const media = await post('/media',{headers,body:form});
      if (!media.id) throw Error('upload');
      if(template){
        const type=file.type==='application/pdf'?'document':'image';
        template.components.unshift({type:'header',parameters:[{type,[type]:{id:media.id,...(type==='document'?{filename}:{})}}]});
      }
      payload.type = file.type === 'application/pdf' ? 'document' : 'image';
      payload[payload.type] = {id:media.id,caption:body};
      if (payload.type === 'document') payload.document.filename = filename;
    } else {
      payload.type = 'text';
      payload.text = {body,preview_url:false};
    }
    if(template){payload.type='template';payload.template=template;delete payload.document;delete payload.image;delete payload.text}
    const data = await post('/messages',{headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    messageId = data.messages?.[0]?.id?.startsWith('wamid.') ? data.messages[0].id : null;
    result = messageId ? 'Accettato da Meta' : pending;
  } catch (error) {
    result = error.message === 'meta' ? 'Rifiutato da Meta · ' + error.code : pending;
  }
  await claims.set(key,result,{metadata:{messageId,contact:input.contact,createdAt:new Date().toISOString()}});
  return reply(result,200,messageId);
}

