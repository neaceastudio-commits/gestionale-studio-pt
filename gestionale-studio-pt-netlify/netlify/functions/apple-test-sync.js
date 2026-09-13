/* Isolated TEST gateway. Never deploy this Function to production. */
const {authenticate,db}=require('./lib/calendar-audit-auth');
const crypto=require('node:crypto');
const fields=['id','service_id','client_ids','operator_id','date','start_time','duration_min','buffer_min','status','updated_at'];
const reply=(statusCode,body)=>({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(process.env.APPLE_TEST_SYNC_ENABLED!=='true')return reply(404,{error:'TEST sync disabled'});
 if(event.httpMethod!=='POST')return reply(405,{error:'POST required'});
 try{
  const input=JSON.parse(event.body||'{}'),actor=await authenticate(input.accessToken);
  if(actor?.role!=='owner')return reply(403,{error:'Verified Direction session required'});
  const allowed=(process.env.APPLE_TEST_APPOINTMENT_IDS||'').split(',').filter(Boolean);
  if(!String(input.id||'').startsWith('TEST_')||!allowed.includes(input.id))return reply(403,{error:'Explicit TEST appointment allowlist required'});
  const rows=await db('appointments',{query:'?select=*&id=eq.'+encodeURIComponent(input.id)}),old=rows[0];
  if(!old||old.client_ids?.some(id=>!id.startsWith('TEST_'))||(old.operator_id&&!old.operator_id.startsWith('TEST_')))return reply(403,{error:'Only isolated TEST data permitted'});
  if(input.operation==='read')return reply(200,Object.fromEntries(fields.map(k=>[k,old[k]])));
  if(input.operation!=='save')return reply(400,{error:'Unsupported operation'});
  if(!['prenotato','annullato'].includes(old.status))return reply(409,{error:'Fatto and No-show cannot be changed by Apple'});
  if(!input.expected||fields.some(k=>JSON.stringify(input.expected[k])!==JSON.stringify(old[k])))return reply(409,{error:'Concurrent NEACEA change'});
  const patch=input.patch||{};
  if(Object.keys(patch).some(k=>!['date','start_time','duration_min','status'].includes(k)))return reply(400,{error:'Protected field'});
  if(patch.status!==undefined&&patch.status!=='annullato')return reply(400,{error:'Apple may only cancel'});
  if(old.status==='annullato'&&patch.status!=='annullato')return reply(409,{error:'Cancelled appointments cannot be restored by Apple'});
  if(patch.duration_min!==undefined&&(!Number.isInteger(patch.duration_min)||patch.duration_min<=0||patch.duration_min>480))return reply(400,{error:'Invalid duration'});
  const result=await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:actor.id,p_actor_role:actor.role,p_source:'calendar',p_request_id:crypto.randomUUID(),p_operation:'save',p_payload:{appointment:{...old,...patch},expected:old}}});
  return reply(200,Object.fromEntries(fields.map(k=>[k,result.appointment[k]])));
 }catch(e){return reply(409,{error:e.message||'TEST sync refused'})}
};
