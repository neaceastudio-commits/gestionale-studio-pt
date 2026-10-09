'use strict';
const {supabaseRequest:db}=require('./pt-auth');
async function grants(operatorId) {
 try { return await db('pt_client_shares','?select=cliente_id,operator_id&active=eq.true&operator_id=eq.'+encodeURIComponent(operatorId)); }
 catch(error){
  // A not-yet-installed sharing migration grants nobody access. Other failures
  // must remain visible instead of silently returning an incomplete client list.
  if(error.body?.code==='42P01'||error.body?.code==='PGRST205')return [];
  throw error;
 }
}
async function canAccess(operatorId,clientId) {
 const rows=await db('clients','?select=id,pt_assegnato&id=eq.'+encodeURIComponent(clientId)+'&limit=1');
 return !!rows?.length && (String(rows[0].pt_assegnato)===String(operatorId) || (await grants(operatorId)).some(row=>row.cliente_id===clientId));
}
module.exports={grants,canAccess};
