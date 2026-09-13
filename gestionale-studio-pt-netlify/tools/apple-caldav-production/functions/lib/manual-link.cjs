'use strict';
const auth=require('../../../../netlify/functions/lib/calendar-audit-auth');
exports.handle=async(request,{env=process.env,db=auth.db,service}={})=>{
 const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply(405,{error:'Metodo non consentito'});
 try{
  const b=await request.json(),signed=auth.verify(b.accessToken,env.APPLE_CALDAV_CALENDAR_SECRET);
  if(!env.APPLE_CALDAV_CALENDAR_SECRET||signed?.operatorId!=='staff_1'||signed.accessLevel!=='owner')return reply(403,{error:'Sessione Direzione richiesta'});
  const rows=await db('operator_effective_roles',{query:'?select=*&operator_id=eq.staff_1&active=eq.true'}),op=rows[0];
  if(!op||String(op.email).toLowerCase()!==String(signed.email).toLowerCase()||![...(op.system_roles||[]),...(op.legacy_roles||[])].some(r=>['owner','admin','direzione','titolare'].includes(String(r).toLowerCase())))return reply(403,{error:'Sessione Direzione richiesta'});
  if(!['link','status'].includes(b.operation)||typeof b.id!=='string'||!b.id||b.id.length>160)return reply(400,{error:'Appuntamento non valido'});
  return reply(200,await service()[b.operation==='link'?'link':'linkStatus'](b.id));
 }catch{return reply(409,{error:'Collegamento non disponibile o sincronizzazione in corso. Riprova: non verranno creati duplicati.'})}
};
