const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.PT_ACCESS_SECRET='test-only';process.env.SUPABASE_SECRET_KEY='test-only';process.env.PT_SESSION_LOG_ENABLED='true';
const auth=require('../netlify/functions/lib/pt-auth');const {handler}=require('../netlify/functions/pt-data');
const {payload}=require('../netlify/functions/lib/pt-session-log');
test('operational payload excludes program changes and rejects invalid series',()=>{
 assert.deepEqual(payload({rows:[{exercise:' Squat ',load:'40',reps:'8',rir:'2',notes:''}],notes:'ok',trainer_id:'forged'}),{rows:[{exercise:'Squat',load:'40',reps:'8',rir:'2',notes:''}],notes:'ok'});
 assert.throws(()=>payload({rows:[{exercise:''}],notes:''}));
});
test('shared client is visible only through owner grants; saving uses authenticated identity, program changes stay forbidden',async()=>{
const before=global.fetch;let rpc=null,granted=true,historyQuery=null;
const operator={operator_id:'pt-b',id:'pt-b',email:'b@test.example',active:true,legacy_roles:['PT'],nome:'Beta'};
global.fetch=async(url,options={})=>{const u=new URL(url);let rows=[];
 if(u.pathname.endsWith('/operator_effective_roles'))rows=[operator];
 else if(u.pathname.endsWith('/operators'))rows=[{id:'pt-b',active:true,portal_access_enabled:true,portal_access_version:0}];
 else if(u.pathname.endsWith('/pt_client_shares'))rows=granted?[{cliente_id:'client',operator_id:'pt-b'}]:[];
 else if(u.pathname.endsWith('/appointments'))rows=[{id:'appt',operator_id:'pt-b',client_ids:['client'],service_id:'pt11',status:'fatto'}];
 else if(u.pathname.endsWith('/clients'))rows=u.searchParams.has('pt_assegnato')?[]:[{id:'client',pt_assegnato:'pt-a',active:true}];
 else if(u.pathname.endsWith('/schede_allenamento'))rows=[{id:'program',cliente_id:'client',data:{name:'Program'}}];
 else if(u.pathname.endsWith('/pt_session_records')){historyQuery=u.searchParams.get('operator_id');rows=[];}
 else if(u.pathname.endsWith('/rpc/pt_save_session_record')){rpc=JSON.parse(options.body);rows={record:{id:'saved',version:1}};}
 return new Response(JSON.stringify(rows),{status:200});};
const call=body=>handler({httpMethod:'POST',headers:{authorization:'Bearer '+auth.signAccessToken('b@test.example','pt-b','pt')},body:JSON.stringify(body)});
try{
 const boot=await call({action:'bootstrap'});assert.equal(boot.statusCode,200);const data=JSON.parse(boot.body);assert.equal(data.clients.length,1);assert.equal(data.clients[0].session_access,true);assert.equal(data.sessionHistoryVisible,false);assert.equal(historyQuery,'eq.pt-b','only own records returned to regular PT');
 const save=await call({action:'save_session_record',appointmentId:'appt',clientId:'client',programId:'program',operatorId:'forged',version:0,requestId:'00000000-0000-4000-8000-000000000001',data:{rows:[],notes:'ok'}});assert.equal(save.statusCode,200);assert.equal(rpc.p_actor_id,'pt-b');
 granted=false;const revoked=await call({action:'bootstrap'});assert.equal(JSON.parse(revoked.body).clients.length,0,'old appointments do not grant access');assert.deepEqual(JSON.parse(revoked.body).assignedSessions,[]);
 const denied=await call({action:'save_session_record',clientId:'client'});assert.equal(denied.statusCode,403,'revocation takes effect without logging out');
 const edit=await call({action:'upsert_program',programId:'program',clientId:'client',data:{}});assert.equal(edit.statusCode,403);
}finally{global.fetch=before}
});

test('session log accepts authenticated PT roles and rejects non-PT identities',async()=>{
 const log=require('../netlify/functions/lib/pt-session-log');
 assert.equal(log.enabled({id:'pt-b',roles:['PT']}),true);
 assert.equal(log.enabled({id:'staff_1',roles:['PT','Direzione']}),true);
 for(const operator of [{id:'other',roles:['owner']},{id:'secretary',roles:['Segreteria']},{}]){
 assert.equal(log.enabled(operator),false);assert.deepEqual(await log.assignments(operator),[]);
 await assert.rejects(log.save(operator,{}),error=>error.statusCode===403);
 }
});

test('global session history is owner-only, independent of PT role',()=>{
 const {historyAllowed}=require('../netlify/functions/lib/pt-session-log');
 const owner={id:'staff_1',roles:['PT','Direzione'],email:'nutrizione.gianlucapirisi@gmail.com',accessLevel:'owner'};
 assert.equal(historyAllowed(owner),true);
 assert.equal(historyAllowed({...owner,accessLevel:'pt'}),false);
 assert.equal(historyAllowed({...owner,email:'other@test'}),false);
});
