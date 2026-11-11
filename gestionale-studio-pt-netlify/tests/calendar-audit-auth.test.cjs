const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.PT_ACCESS_SECRET='SIM_SESSION';process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_SERVICE';
const {handler}=require('../netlify/functions/calendar-activity');
const {verify}=require('../netlify/functions/lib/calendar-audit-auth');
const token=(id='pt',level='pt')=>{const p=Buffer.from(JSON.stringify({operatorId:id,email:id+'@example.test',accessLevel:level,exp:Date.now()+60000})).toString('base64url');return p+'.'+crypto.createHmac('sha256',process.env.PT_ACCESS_SECRET).update(p).digest('base64url')};
const event=body=>({httpMethod:'POST',body:JSON.stringify({calendarRevision:'20261111-package-suspension-v1',...body})});
function mock(actor='pt') {const calls=[];const saved=global.fetch;global.fetch=async(url,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push({url,body,method:options.method});const value=url.includes('operator_effective_roles')?[{operator_id:actor,email:actor+'@example.test',active:true,legacy_roles:[actor==='owner'?'owner':'PT'],system_roles:[]}]:url.includes('/operators?')?[{id:actor,portal_access_enabled:true,portal_access_version:0}]:[];return {ok:true,status:200,text:async()=>JSON.stringify(value)}};return {calls,restore:()=>global.fetch=saved}}
test('signed session is required; modified payload and expiry rejected',()=>{assert.ok(verify(token()));assert.equal(verify(token()+'x'),null);assert.equal(verify(''),null);const p=Buffer.from(JSON.stringify({operatorId:'pt',email:'pt@example.test',exp:1})).toString('base64url');assert.equal(verify(p+'.'+crypto.createHmac('sha256','SIM_SESSION').update(p).digest('base64url')),null)});
test('browser cannot supply actor name/email/role/source/correlation ID',async()=>{const m=mock();try{const result=await handler(event({accessToken:token(),operation:'save',actor_name:'FORGED',actor_email:'FORGED',actor_role:'owner',source:'system',request_id:'FORGED',payload:{appointment:{id:'a'}}}));assert.equal(result.statusCode,200);const call=m.calls.find(c=>c.url.includes('calendar_audit_write'));assert.equal(call.body.p_actor_id,'pt');assert.equal(call.body.p_actor_role,'pt');assert.equal(call.body.p_source,'calendar');assert.ok(!JSON.stringify(call.body).includes('FORGED'))}finally{m.restore()}});
test('PT cannot read logs; owner can read; no delete/update log operation',async()=>{let m=mock();try{assert.equal((await handler(event({accessToken:token(),operation:'list'}))).statusCode,403);assert.equal((await handler(event({accessToken:token(),operation:'delete_log'}))).statusCode,400)}finally{m.restore()}m=mock('owner');try{assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'list',filters:{source:'calendar'}}))).statusCode,200);assert.ok(m.calls.some(c=>c.url.includes('calendar_audit_read')))}finally{m.restore()}});
test('current role and identity rechecked, despite valid signature',async()=>{const m=mock('other');try{assert.equal((await handler(event({accessToken:token(),operation:'save'}))).statusCode,401)}finally{m.restore()}});

test('studio gateway rejects PT and nutrition roles, accepts only verified owner and ignores forged actor',async()=>{const studio=require('../netlify/functions/studio-calendar-activity').handler;let m=mock();try{assert.equal((await studio(event({accessToken:token(),operation:'client',actor_role:'owner',payload:{rows:[{id:'test'}]}}))).statusCode,403)}finally{m.restore()}m=mock('owner');try{assert.equal((await studio(event({accessToken:token('owner','owner'),operation:'assignment',payload:{clientId:'test',trainerId:'pt',actor_name:'FORGED'}}))).statusCode,200);const call=m.calls.find(c=>c.url.includes('calendar_audit_write'));assert.equal(call.body.p_actor_id,'owner');assert.equal(call.body.p_actor_role,'owner')}finally{m.restore()}const original=global.fetch;global.fetch=async()=>({ok:true,text:async()=>JSON.stringify([{operator_id:'pt',email:'pt@example.test',active:true,legacy_roles:['Nutrizionista','Valutazioni'],system_roles:[]}])});try{assert.equal((await studio(event({accessToken:token(),operation:'session'}))).statusCode,401)}finally{global.fetch=original}});

test('new appointment null snapshot is omitted; non-null expected version is preserved',async()=>{const m=mock();try{for(const expected of [null,{id:'a',status:'prenotato'}]){const result=await handler(event({accessToken:token(),operation:'save',payload:{appointment:{id:'a'},expected}}));assert.equal(result.statusCode,200);const p=m.calls.filter(c=>c.url.includes('calendar_audit_write')).at(-1).body.p_payload;if(expected===null)assert.ok(!Object.hasOwn(p,'expected'));else assert.deepEqual(p.expected,expected)}}finally{m.restore()}});

test('PT corrections require verified owner and pass only server actor to dedicated RPC',async()=>{
 let m=mock();try{assert.equal((await handler(event({accessToken:token(),operation:'correct_pt_sessions',payload:{changes:[{}]}}))).statusCode,403);assert.ok(!m.calls.some(c=>c.url.includes('calendar_correct_pt_sessions')))}finally{m.restore()}
 m=mock('owner');try{
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'correct_pt_sessions',payload:{changes:[]}}))).statusCode,400);
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'correct_pt_sessions',actor_id:'FORGED',payload:{changes:[{before:{id:'one'},serviceId:'pt12'}]}}))).statusCode,200);
  const call=m.calls.find(c=>c.url.includes('calendar_correct_pt_sessions'));assert.equal(call.body.p_actor_id,'owner');assert.ok(!JSON.stringify(call.body).includes('FORGED'));
 }finally{m.restore()}
});

test('paired renewal is owner-only, preserves idempotency UUID and never trusts caller identity',async()=>{
 const payload={requestId:crypto.randomUUID(),clients:[{id:'a'},{id:'b'}],appointments:[{id:'one'}]};
 let m=mock();try{assert.equal((await handler(event({accessToken:token(),operation:'renew_pt_pair',payload}))).statusCode,403)}finally{m.restore()}
 m=mock('owner');try{
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'renew_pt_pair',payload:{...payload,requestId:'bad'}}))).statusCode,400);
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'renew_pt_pair',actor_id:'FORGED',payload}))).statusCode,200);
  const call=m.calls.find(c=>c.url.includes('calendar_renew_pt_pair'));assert.equal(call.body.p_actor_id,'owner');assert.equal(call.body.p_request_id,payload.requestId);assert.ok(!JSON.stringify(call.body).includes('FORGED'));
 }finally{m.restore()}
});

test('outdated calendar pages cannot overwrite balances or start a second renewal',async()=>{
 const m=mock('owner');try{
  for(const operation of ['save','delete','client','renew_pt_pair','save_pair_client','correct_pt_sessions']){
   const result=await handler(event({calendarRevision:undefined,accessToken:token('owner','owner'),operation,payload:{rows:[{id:'c',sessions_remaining:4}]}}));
   assert.equal(result.statusCode,409);assert.equal(JSON.parse(result.body).code,'CALENDAR_RELOAD_REQUIRED');
  }
  assert.ok(!m.calls.some(c=>c.url.includes('/rpc/')));
  assert.equal((await handler(event({calendarRevision:undefined,accessToken:token('owner','owner'),operation:'session'}))).statusCode,200);
 }finally{m.restore()}
});

test('manual groups require current owner and valid values; actor always comes from the session',async()=>{
 let m=mock();try{assert.equal((await handler(event({accessToken:token(),operation:'client_group',payload:{clientId:'c',group:'regular',expectedGroup:null}}))).statusCode,403);assert.equal((await handler(event({accessToken:token(),operation:'client',payload:{rows:[{id:'c',client_group:'regular'}]}}))).statusCode,403);assert.ok(!m.calls.some(c=>c.url.includes('/rpc/')))}finally{m.restore()}
 m=mock('owner');try{
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'client_group',payload:{clientId:'c',group:'bad',expectedGroup:null}}))).statusCode,400);
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'client_group',payload:{clientId:'c',group:'regular',expectedGroup:null,actorId:'FORGED'}}))).statusCode,200);
  const call=m.calls.find(c=>c.url.includes('calendar_set_client_group'));assert.equal(call.body.p_actor_id,'owner');assert.equal(call.body.p_expected_group,null);assert.ok(!JSON.stringify(call.body).includes('FORGED'));
 }finally{m.restore()}
});
test('automatic recovery uses the verified actor, original snapshot and protocol guard, including older cancellation callers',async()=>{
 const m=mock('owner');try{
  const expected={id:'source',service_id:'pt12',status:'prenotato',client_ids:['a','b']};
  for(const operation of ['cancel_and_recover','save']){
   const result=await handler(event({accessToken:token('owner','owner'),operation,actor_id:'FORGED',payload:{expected,appointment:{...expected,status:'annullato'},recovery:{date:'FORGED'}}}));
   assert.equal(result.statusCode,200);
   const call=m.calls.filter(c=>c.url.includes('calendar_cancel_and_recover')).at(-1);
   assert.equal(call.body.p_actor_id,'owner');assert.equal(call.body.p_actor_role,'owner');assert.deepEqual(call.body.p_expected,expected);
   assert.ok(!JSON.stringify(call.body).includes('FORGED'),'the browser cannot select a date, actor or replacement');
  }
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'cancel_and_recover',calendarRevision:undefined,payload:{expected}}))).statusCode,409);
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'cancel_and_recover',payload:{expected:{id:'x',service_id:'nutrizione'}}}))).statusCode,400);
  const calls=m.calls.filter(c=>c.url.includes('calendar_cancel_and_recover')).length;
  await handler(event({accessToken:token('owner','owner'),operation:'save',payload:{expected:{...expected,status:'annullato'},appointment:{...expected,status:'annullato',notes:'Modifica note dello storico'}}}));
  assert.equal(m.calls.filter(c=>c.url.includes('calendar_cancel_and_recover')).length,calls,'editing an already cancelled historical row does not schedule another recovery');
 }finally{m.restore()}
});
test('suspension and resumption require the current Calendar owner; arbitrary fields never reach SQL',async()=>{
 const payload={clientId:'a',action:'archive',status:'Ibernato',expectedUpdatedAt:'2026-11-11T10:00:00Z',expectedAppointments:[],actorId:'FORGED',sessions_remaining:99};
 let m=mock();try{assert.equal((await handler(event({accessToken:token(),operation:'client_lifecycle',payload}))).statusCode,403);assert.ok(!m.calls.some(c=>c.url.includes('/rpc/')))}finally{m.restore()}
 m=mock('owner');try{
  for(const action of ['archive','reactivate'])assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'client_lifecycle',payload:{...payload,action}}))).statusCode,200);
  const body=m.calls.filter(c=>c.url.includes('/rpc/calendar_client_lifecycle')).at(-1).body;assert.equal(body.p_actor_id,'owner');assert.ok(!JSON.stringify(body).includes('FORGED'));assert.ok(!Object.hasOwn(body.p_payload,'sessions_remaining'));
  assert.equal((await handler(event({calendarRevision:'20261030-shared-finance-v1',accessToken:token('owner','owner'),operation:'client_lifecycle',payload}))).statusCode,409);
  assert.equal((await handler(event({accessToken:token('owner','owner'),operation:'client_lifecycle',payload:{...payload,status:'bad'}}))).statusCode,400);
 }finally{m.restore()}
});
