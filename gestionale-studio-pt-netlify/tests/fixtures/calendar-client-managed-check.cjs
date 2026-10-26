// Executed only in an unpublished, capability-protected runtime check.
// Every mutation is pinned to these synthetic IDs; no token/secret is returned.
module.exports=async function check(handler,secret){
 const assert=require('node:assert/strict'),crypto=require('node:crypto');
 const prefix='ptqa-20261026-release-',clientId=prefix+'client';
 function token(actor){assert.ok(['owner','old'].includes(actor));const p=Buffer.from(JSON.stringify({operatorId:prefix+actor,email:'ptqa-release-'+actor+'@example.invalid',accessLevel:actor==='owner'?'owner':'pt',accessVersion:0,exp:Date.now()+60000})).toString('base64url');return p+'.'+crypto.createHmac('sha256',secret).update(p).digest('base64url')}
 async function call(actor,operation,payload,status=200){assert.equal(payload.clientId||payload.rows?.[0]?.id,clientId);const r=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({accessToken:token(actor),calendarRevision:'20261026-client-save-v2',operation,payload})});const j=JSON.parse(r.body);assert.equal(r.statusCode,status,operation+': '+(j.error||r.statusCode));return j}
 async function read(){const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;const r=await fetch((process.env.SUPABASE_URL||'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/clients?select=*&id=eq.'+clientId,{headers:{apikey:key,Authorization:'Bearer '+key}});assert.equal(r.status,200);const rows=await r.json();assert.equal(rows.length,1);return rows[0]}
 const before=await read();assert.equal(before.client_group,null);assert.equal(before.pt_assegnato,prefix+'old');
 await call('old','client_group',{clientId,group:'occasional',expectedGroup:null},403);
 await call('owner','client_group',{clientId,group:'occasional',expectedGroup:null});
 const first=await read();assert.equal(first.client_group,'occasional');assert.equal(first.notes,before.notes);assert.equal(first.sessions_remaining,7);
 await call('owner','client_group',{clientId,group:'occasional',expectedGroup:null});assert.equal((await read()).updated_at,first.updated_at);
 await call('owner','client_group',{clientId,group:'regular',expectedGroup:null},409);
 await call('owner','client_group',{clientId,group:'regular',expectedGroup:'occasional'});assert.equal((await read()).client_group,'regular');
 const notes='Originale - trasferimento sintetico';
 await call('owner','client',{method:'PATCH',rows:[{id:clientId,pt_assegnato:prefix+'new',notes}]});
 const reopened=await read();assert.equal(reopened.pt_assegnato,prefix+'new');assert.equal(reopened.notes,notes);assert.equal(reopened.client_group,'regular');assert.equal(reopened.sessions_remaining,7);assert.deepEqual(reopened.package_types,before.package_types);
 await call('owner','client_group',{clientId,group:null,expectedGroup:'regular'});assert.equal((await read()).client_group,null);
 return {groupWriteReadReopen:true,idempotentRetry:true,concurrentChoiceRejected:true,ptCannotClassify:true,trainerAssignmentReadback:true,packageBalanceNotesPreserved:true,explicitUnclassification:true};
};
