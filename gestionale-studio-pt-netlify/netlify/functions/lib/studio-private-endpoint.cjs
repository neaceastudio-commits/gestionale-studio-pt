'use strict';
const {read}=require('./studio-private-read.cjs');
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'},body:JSON.stringify(body)});
exports.createHandler=({authenticate,db})=>async event=>{
 if(event.httpMethod==='OPTIONS')return reply(204,{});
 if(event.httpMethod!=='POST')return reply(405,{error:'Metodo non consentito'});
 if(Buffer.byteLength(event.body||'')>180000)return reply(413,{error:'Richiesta troppo grande'});
 try{
  const input=JSON.parse(event.body||'{}'),actor=await authenticate(input.accessToken);
  if(!actor)return reply(401,{error:'Accedi con una sessione Portale PT verificata'});
  if(input.operation==='session')return reply(200,{success:true,actor});
  if(!input.method||input.method==='GET')return reply(200,await read(actor,input,db));
  if(input.table!=='acquisizioni'||!['POST','PATCH','DELETE'].includes(input.method))return reply(403,{error:'Usa il servizio autorizzato per questa modifica'});
  const params=new URLSearchParams(input.query||''),id=input.method==='POST'?input.body?.id:params.get('id')?.replace(/^eq\./,'');
  if(typeof id!=='string'||! /^[a-zA-Z0-9_:-]{1,150}$/.test(id)||Array.isArray(input.body))return reply(400,{error:'Identità acquisizione non valida'});
  for(const key of params.keys())if(!['id','updated_at','on_conflict'].includes(key))return reply(400,{error:'Filtro non consentito'});
  const expected=params.get('updated_at');if(expected&&!expected.startsWith('eq.'))return reply(400,{error:'Versione non valida'});
  const rows=await db('rpc/studio_write_acquisition',{method:'POST',body:{p_actor_id:actor.id,p_actor_role:actor.role,p_method:input.method,p_id:id,p_payload:input.body||{},p_expected_updated_at:expected?expected.slice(3):null}});
  return reply(200,rows);
 }catch(e){const status=e.status||(/invalid|syntax|json/i.test(e.message)?400:500);return reply(status,{error:status===500?'Servizio dati non disponibile':e.message});}
};
