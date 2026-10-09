const {test}=require('node:test'),assert=require('node:assert/strict');
process.env.PT_ACCESS_SECRET='SIM_ACCESS';process.env.SUPABASE_SECRET_KEY='SIM_SERVICE';
const auth=require('../netlify/functions/lib/pt-auth');
const {handler}=require('../netlify/functions/pt-portal-admin');
const emailHandler=require('../netlify/functions/pt-access-email').handler;
const calendar=require('../netlify/functions/lib/calendar-audit-auth');
const facts=require('../app/cruscotto-pt/pt-essentials');
const post=body=>({httpMethod:'POST',body:JSON.stringify(body)});
test('owner control, immediate session revocation and fresh login after reactivation',async()=>{
 const saved=global.fetch,writes=[];let enabled=true,version=0;
 const directory=[{operator_id:'owner',email:'owner@example.test',nome:'Owner',active:true,legacy_roles:['Direzione','PT']},{operator_id:'pt',email:'pt@example.test',nome:'Trainer',active:true,legacy_roles:['PT']}];
 global.fetch=async(url,options={})=>{
  const u=new URL(url);let value=[];
  if(u.pathname.endsWith('operator_effective_roles')) value=directory.filter(x=>!u.searchParams.has('operator_id')||x.operator_id===u.searchParams.get('operator_id').slice(3));
  else if(u.pathname.endsWith('/operators')) value=directory.map(x=>({id:x.operator_id,email:x.email,active:true,portal_access_enabled:x.operator_id==='pt'?enabled:true,portal_access_version:x.operator_id==='pt'?version:0})).filter(x=>!u.searchParams.has('id')||x.id===u.searchParams.get('id').slice(3));
  else if(u.pathname.endsWith('calendar_audit_write')) {const b=JSON.parse(options.body);writes.push(b);const next=b.p_payload.rows[0].portal_access_enabled;if(next!==enabled)version++;enabled=next;value=[];}
  else throw Error('Unexpected request: '+u.pathname);
  return {ok:true,status:200,text:async()=>JSON.stringify(value)};
 };
 try {
  const ptToken=auth.signAccessToken('pt@example.test','pt','pt');const ownerToken=auth.signAccessToken('owner@example.test','owner','owner');
  assert.ok(await auth.authenticatedOperator(ptToken));
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:false,accessToken:ptToken}))).statusCode,403);
  assert.equal(writes.length,0);
  assert.equal((await handler(post({action:'send',operatorId:'pt',accessToken:ptToken}))).statusCode,403);
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:true,email:'bad',accessToken:ownerToken}))).statusCode,400);
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:true,email:'owner@example.test',accessToken:ownerToken}))).statusCode,409);
  assert.equal(writes.length,0);

  assert.equal((await handler(post({action:'set',operatorId:'owner',enabled:false,accessToken:ownerToken}))).statusCode,403);
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:false,accessToken:ownerToken}))).statusCode,200);
  assert.deepEqual(writes[0].p_payload.rows,[{id:'pt',portal_access_enabled:false}]);
  assert.equal((await handler(post({action:'send',operatorId:'pt',accessToken:ownerToken}))).statusCode,409);
  assert.equal(await auth.authenticatedOperator(ptToken),null);
  assert.equal(await calendar.authenticate(ptToken),null);
  assert.equal((await emailHandler(post({action:'verify_token',token:ptToken}))).statusCode,401);
  assert.equal((await emailHandler(post({action:'resolve',email:'pt@example.test'}))).statusCode,404);
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:true,accessToken:ownerToken}))).statusCode,200);
  assert.equal(await auth.authenticatedOperator(ptToken),null,'old session must stay revoked');
  const login=await emailHandler(post({action:'verify',email:'pt@example.test',operatorId:'pt',code:auth.accessCode('pt@example.test','pt')}));
  assert.equal(login.statusCode,200);assert.ok(await auth.authenticatedOperator(JSON.parse(login.body).token));
  assert.ok(await calendar.authenticate(JSON.parse(login.body).token));
  assert.equal((await handler(post({action:'set',operatorId:'pt',enabled:true,email:' NEW@example.test ',accessToken:ownerToken}))).statusCode,200);
  assert.deepEqual(writes.at(-1).p_payload.rows,[{id:'pt',email:'new@example.test',portal_access_enabled:true}]);
  const sender=require('../netlify/functions/pt-access-email'),originalSender=sender.handler;let sent;
  sender.handler=async event=>{sent=JSON.parse(event.body);return {statusCode:200,body:JSON.stringify({success:true})}};
  try{
    assert.equal((await handler(post({action:'send',operatorId:'pt',email:'untrusted@example.test',accessToken:ownerToken}))).statusCode,200);
    assert.equal(sent.email,'pt@example.test','send uses stored email, not caller-provided recipient');
    assert.equal(sent.operatorId,'pt');
  }finally{sender.handler=originalSender;}


 }finally{global.fetch=saved;}
});
test('essential notes preserve recorded clinical facts and hide administrative noise by default',()=>{
 const client={notes:'Codice fiscale: SECRET\nIndirizzo: PRIVATE\nPatologie: Non riferisce ipertensione\nFarmaci: terapia prescritta\nInfortuni: dolore al ginocchio\nLimitazioni: non eseguire salti',obiettivo:'Forza'};
 const rows=facts.facts(client);assert.match(JSON.stringify(rows),/Non riferisce ipertensione/);assert.match(JSON.stringify(rows),/non eseguire salti/);assert.doesNotMatch(JSON.stringify(rows),/SECRET|PRIVATE/);
 assert.match(facts.render(client),/<details class="pt-original">/);assert.equal(client.notes.includes('SECRET'),true);
 assert.doesNotMatch(facts.render({notes:'Patologie: <img src=x onerror=alert(1)>'}),/<img/);
 assert.equal(facts.facts({notes:'Solo testo libero senza struttura'}).length,0);
 assert.match(JSON.stringify(facts.facts({notes:'Infortuni: trauma\nNon fare salti finché rivalutato\nIndirizzo: PRIVATE'})),/Non fare salti finché rivalutato/);
 assert.doesNotMatch(JSON.stringify(facts.facts({notes:'Infortuni: trauma\nNon fare salti finché rivalutato\nIndirizzo: PRIVATE'})),/PRIVATE/);
});
