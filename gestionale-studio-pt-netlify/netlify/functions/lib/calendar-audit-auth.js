'use strict';
const crypto = require('node:crypto');
const OWNERS = new Set(['owner','admin','administrator','amministratore','titolare','super_admin','direzione']);
function verify(token, secret = process.env.PT_ACCESS_SECRET || process.env.RESEND_API_KEY) {
  if (!secret) return null;
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected))) return null;
  try { const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.operatorId && data.email && Number(data.exp)>Date.now() ? data : null; } catch { return null; }
}
async function db(table, {method='GET',body,query=''}={}) {
  const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw Error('Chiave server Supabase non configurata');
  const r=await fetch((process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/'+table+query,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data;try{data=text?JSON.parse(text):null}catch{data=null}
  if(!r.ok){const error=Error(data?.message || 'Operazione calendario rifiutata');error.status=r.status;throw error}return data;
}
async function authenticate(token) {
  const signed=verify(token);if(!signed)return null;
  // Recheck current database identity and roles; never accept actor fields from callers.
  const rows=await db('operator_effective_roles',{query:'?select=*&operator_id=eq.'+encodeURIComponent(signed.operatorId)+'&active=eq.true'});
  const op=rows.find(o=>String(o.email||'').toLowerCase()===String(signed.email).toLowerCase());if(!op)return null;
  const roles=[...(op.system_roles||[]),...(op.legacy_roles||[])].map(r=>String(r).toLowerCase());
  const role=roles.some(r=>OWNERS.has(r))&&signed.accessLevel==='owner'?'owner':roles.some(r=>['pt','personal_trainer','personal trainer'].includes(r))?'pt':roles.some(r=>['secretary','segreteria'].includes(r))?'secretary':null;
  return role?{id:op.operator_id,role}:null;
}
module.exports={authenticate,verify,db};
