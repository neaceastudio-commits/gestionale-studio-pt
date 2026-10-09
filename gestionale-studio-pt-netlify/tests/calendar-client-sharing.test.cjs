const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.PT_ACCESS_SECRET='test';process.env.SUPABASE_SECRET_KEY='test';
const auth=require('../netlify/functions/lib/pt-auth');const {createHandler}=require('../netlify/functions/lib/calendar-audit-endpoint');
test('calendar sharing endpoint requires verified owner, strips forged actor and uses audited RPC',async()=>{
 const before=global.fetch;const requests=[];
 global.fetch=async(url,options={})=>{
  const u=new URL(url);const id=u.searchParams.get('operator_id')?.slice(3);let data=[];
  if(u.pathname.endsWith('/operator_effective_roles'))data=[{operator_id:id||'b',email:id==='staff_1'?'owner@test':'b@test',active:true,legacy_roles:id==='staff_1'?['PT','Direzione']:['PT']}];
  else if(u.pathname.endsWith('/operators'))data=[{id:'b',portal_access_enabled:true,portal_access_version:0}];
  else if(u.pathname.endsWith('/clients'))data=[{id:'c',pt_assegnato:'a'}];
  else if(u.pathname.endsWith('/rpc/pt_set_client_share')){requests.push(JSON.parse(options.body));data={success:true};}
  return new Response(JSON.stringify(data));
 };
 try{
  const call=(id,source='calendar',extra={})=>createHandler(source)({httpMethod:'POST',body:JSON.stringify({accessToken:auth.signAccessToken(id==='staff_1'?'owner@test':'b@test',id,id==='staff_1'?'owner':'pt'),operation:'set_client_share',payload:{clientId:'c',operatorId:'b',active:true,actorId:'forged'},...extra})});
  assert.equal((await call('b')).statusCode,403);
  assert.equal((await call('staff_1','acquisition')).statusCode,403);
  assert.equal((await call('staff_1')).statusCode,200);
  assert.equal(requests.length,1);assert.equal(requests[0].p_actor_id,'staff_1');assert.equal(requests[0].p_operator_id,'b');
  assert.equal((await call('staff_1','calendar',{operation:'client_shares',payload:{clientId:'c'}})).statusCode,200);
 }finally{global.fetch=before}
});
