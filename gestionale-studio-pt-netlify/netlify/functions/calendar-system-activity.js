// Reserved for trusted automation. Never accept a browser actor or a free source.
const crypto=require('node:crypto');
const {db}=require('./lib/calendar-audit-auth');
exports.handler=async event=>{
 const key=process.env.CALENDAR_SYSTEM_AUDIT_SECRET;
 const provided=String(event.headers?.authorization||event.headers?.Authorization||'').replace(/^Bearer /,'');
 const valid=key&&provided.length===key.length&&crypto.timingSafeEqual(Buffer.from(provided),Buffer.from(key));
 if(event.httpMethod!=='POST'||!valid)return {statusCode:403,body:'Forbidden'};
 try{const input=JSON.parse(event.body||'{}');if(!['availability','save','delete'].includes(input.operation))throw Error('Invalid operation');const result=await db('rpc/calendar_audit_write',{method:'POST',body:{p_actor_id:null,p_actor_role:'system',p_source:'system',p_request_id:crypto.randomUUID(),p_operation:input.operation,p_payload:input.payload||{}}});return {statusCode:200,body:JSON.stringify(result)}}catch{return {statusCode:409,body:'System operation rejected'}}
};
