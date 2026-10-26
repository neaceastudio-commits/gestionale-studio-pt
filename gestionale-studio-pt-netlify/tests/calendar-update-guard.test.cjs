const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.PT_ACCESS_SECRET='SIM_UPDATE';process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_SERVICE';
const {handler}=require('../netlify/functions/calendar-activity');
const revision='20261026-client-save-v2';
function access(){const p=Buffer.from(JSON.stringify({operatorId:'owner',email:'owner@example.test',accessLevel:'owner',exp:Date.now()+60000})).toString('base64url');return p+'.'+crypto.createHmac('sha256','SIM_UPDATE').update(p).digest('base64url')}
function mock(){const calls=[],original=global.fetch;global.fetch=async(url,options={})=>{calls.push({url,options});return {ok:true,status:200,text:async()=>JSON.stringify(url.includes('operator_effective_roles')?[{operator_id:'owner',email:'owner@example.test',active:true,system_roles:['owner'],legacy_roles:[]}]:url.includes('/operators?')?[{id:'owner',portal_access_enabled:true,portal_access_version:0}]:[])}};return {calls,restore:()=>global.fetch=original}}
const event=(operation,calendarRevision)=>({httpMethod:'POST',body:JSON.stringify({operation,calendarRevision,accessToken:access(),payload:{method:'PATCH',rows:[{id:'synthetic',notes:'Old fallback omitted trainer'}]}})});
test('the previously accepted open Calendar cannot save clients, appointments or assignments',async()=>{const m=mock();try{for(const operation of ['client','save','delete','assignment','availability','operator','client_group','set_client_share','renew_pt_pair','save_pair_client','correct_pt_sessions','expected_renewals','pt_payments']){const result=await handler(event(operation,'20261009s'));assert.equal(result.statusCode,409,operation);assert.equal(JSON.parse(result.body).code,'CALENDAR_RELOAD_REQUIRED',operation)}assert.equal(m.calls.filter(c=>c.url.includes('/rpc/')).length,0)}finally{m.restore()}});
test('session advertises required revision even to an old Calendar, without authorizing writes',async()=>{const m=mock();try{const result=await handler(event('session','20261009s'));assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).calendarRevision,revision);assert.equal(m.calls.filter(c=>c.url.includes('/rpc/')).length,0)}finally{m.restore()}});
test('current Calendar retains the authenticated, audited client save',async()=>{const m=mock();try{const result=await handler(event('client',revision));assert.equal(result.statusCode,200);const c=m.calls.find(c=>c.url.includes('/rpc/calendar_audit_write'));assert.ok(c);const body=JSON.parse(c.options.body);assert.equal(body.p_actor_id,'owner');assert.equal(body.p_actor_role,'owner');assert.equal(body.p_source,'calendar')}finally{m.restore()}});

test('the loaded assets agree on the write protocol and bypass old browser cache entries',()=>{
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 assert.ok(read('app/calendario-studio/js/calendar-audit.js').includes("const revision='"+revision+"'"));
 assert.ok(read('app/calendario-studio/js/supabase.js').includes("clientWriteRevision: '"+revision+"'"));
 const html=read('app/calendario-studio/index.html');
 for(const file of ['supabase','calendar-audit'])assert.ok(html.includes('js/'+file+'.js?v='+revision));
});
