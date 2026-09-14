const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createService, buildAgendas, romeTime } = require('../netlify/functions/lib/whatsapp-agenda');
const { createHandler } = require('../netlify/functions/whatsapp-agenda');
const day = '2026-09-14', now = () => new Date('2026-09-14T04:30:00Z');
const operators = [{id:'p1',nome:'PT',cognome:'UNO',active:true,roles:['PT'],whatsapp_phone:'+393331234567',whatsapp_agenda_enabled:true},{id:'p2',nome:'PT',cognome:'DUE',active:true,roles:['PT'],whatsapp_phone:'+393331234568',whatsapp_agenda_enabled:true},{id:'off',active:false,roles:['PT']},{id:'nutrition',active:true,roles:['Nutrizione']}];
const clients = [{id:'a',nome:'Mario',cognome:'SIMULATO',sessions_total:8,sessions_remaining:8,notes:'CLINICAL_SECRET',email:'PRIVATE_EMAIL',telefono:'PRIVATE_PHONE',importo:'PRIVATE_PAYMENT'},{id:'b',nome:'Anna',cognome:'SIMULATA',sessions_total:12,sessions_remaining:9}];
const appt = (id,patch={}) => ({id,date:day,start_time:'08:00:00',service_id:'pt11',operator_id:'p1',client_ids:['a'],status:'prenotato',notes:'PRIVATE_NOTES',...patch});
const env = {WHATSAPP_AGENDA_ENABLED:'true',WHATSAPP_AGENDA_SITE_ID:'test',SITE_ID:'test',WHATSAPP_SENDER_PHONE:'+393520525230',WHATSAPP_PHONE_NUMBER_ID:'123456',WHATSAPP_ACCESS_TOKEN:'SIM_SECRET',WHATSAPP_API_VERSION:'v24.0',WHATSAPP_TEMPLATE_LANGUAGE:'it',WHATSAPP_AGENDA_TEMPLATES_JSON:JSON.stringify({'1':'agenda_1','2':'agenda_2','8':'agenda_8'})};
function fixture(extra={}) {
  const data={operators:structuredClone(operators),clients:structuredClone(clients),appointments:[appt('a')],...extra};const claims=new Map(),calls=[],provider=[];let outcome='ok',finishFail=false;
  const db=async(table,{query='',method='GET',body}={})=>{
    calls.push({table,method,body,query});
    if(method==='GET'){
      assert.ok(!query.includes('select=*'),'Only allowlisted fields');
      if(table==='operator_effective_roles')return [];
      return data[table] || [];
    }
    if(table==='rpc/whatsapp_agenda_claim') { const key=body.p_day+body.p_operator_id;if(claims.has(key))return false;claims.set(key,{status:'claimed'});return true; }
    if(table==='rpc/whatsapp_agenda_finish'){if(finishFail)throw Error('db down');claims.set(body.p_day+body.p_operator_id,body);return true;}
    if(table==='rpc/calendar_audit_write')return [body.p_payload.rows[0]];
    throw Error('Unexpected write');
  };
  const fetchImpl=async(url,options)=>{provider.push({url,options});assert.ok(options.headers.Authorization==='Bearer SIM_SECRET');if(options.method==='GET')return {ok:true,json:async()=>({display_phone_number:'+39 352 052 5230'})};if(outcome==='timeout')throw Error('PRIVATE_TOKEN');return {ok:outcome!=='rejected',json:async()=>outcome==='rejected'?{error:{code:131000,message:'PRIVATE_PHONE'}}:{messages:[{id:'wamid.simulated'}]}};};
  return { data,db,calls,claims,provider,setOutcome:v=>outcome=v,setFinishFail:()=>finishFail=true,service:createService({db,fetchImpl,env:{...env},now}) };
}
test('Only today, active PT, assigned booked PT services; sort and deduplicate by ID, never name',()=>{
  const rows=[appt('late',{start_time:'10:30:00',service_id:'pt12',client_ids:['a','b']}),appt('early',{start_time:'07:00:00'}),appt('early',{start_time:'07:00:00'}),appt('p2',{operator_id:'p2'}),appt('cancel',{status:'annullato'}),appt('done',{status:'fatto'}),appt('noshow',{status:'noshow'}),appt('block',{service_id:'blocco'}),appt('circuit',{service_id:'circuit'}),appt('nutr',{service_id:'nutrizione'}),appt('tomorrow',{date:'2026-09-15'}),appt('inactive',{operator_id:'off'})];
  const agendas=buildAgendas({operators,clients,appointments:rows},day);assert.equal(agendas.length,2);assert.equal(agendas[0].count,2);assert.equal(agendas[1].count,1);assert.match(agendas[0].lines[0],/^07:00/);assert.match(agendas[0].lines[1],/Mario SIMULATO \(0\/8\) \+ Anna SIMULATA \(3\/12\) · PT 1:2/);for(const sentinel of ['CLINICAL_SECRET','PRIVATE_EMAIL','PRIVATE_PHONE','PRIVATE_PAYMENT','PRIVATE_NOTES'])assert.ok(!JSON.stringify(agendas).includes(sentinel));
});
test('X/Y only uses saved counters: 8 future → 0/8; one Fatto → 1/8; no-show/cancel/move do not advance; reversal returns 0/8',()=>{
  let c=structuredClone(clients),rows=Array.from({length:8},(_,i)=>appt(String(i)));
  const text=()=>buildAgendas({operators,clients:c,appointments:rows},day)[0].text;
  assert.equal((text().match(/0\/8/g)||[]).length,8);
  c[0].sessions_remaining=7;rows[0].status='fatto';assert.equal((text().match(/1\/8/g)||[]).length,7);
  rows[1].status='noshow';rows[2].status='annullato';rows[3].start_time='18:00:00';assert.equal((text().match(/1\/8/g)||[]).length,5);
  c[0].sessions_remaining=8;rows[0].status='prenotato';assert.equal((text().match(/0\/8/g)||[]).length,6);
});
test('Rome date and 06:30 handle summer, winter, DST transition and UTC midnight',()=>{
  for(const instant of ['2026-01-14T05:30:00Z','2026-07-14T04:30:00Z','2026-03-29T04:30:00Z','2026-10-25T05:30:00Z'])assert.equal(romeTime(new Date(instant)).time,'06:30');
  assert.equal(romeTime(new Date('2026-09-13T23:30:00Z')).day,'2026-09-14');
});
test('Dry-run does zero writes and zero provider calls even when enabled; preserves exact data',async()=>{
  const f=fixture(),before=structuredClone(f.data);const r=await f.service.run({dryRun:true});assert.equal(r.agendas[0].count,1);assert.equal(f.calls.filter(c=>c.method!=='GET').length,0);assert.equal(f.provider.length,0);assert.deepEqual(f.data,before);
});
test('Disabled, missing config, wrong site, wrong local hour and no appointments cannot send or claim',async()=>{
  for(const patch of [{WHATSAPP_AGENDA_ENABLED:'false'},{WHATSAPP_ACCESS_TOKEN:''},{SITE_ID:'other'}]){const f=fixture();const s=createService({db:f.db,env:{...env,...patch},fetchImpl:()=>{throw Error('Must not call')},now});const r=await s.run({dryRun:false});assert.equal(r.sent,0);assert.equal(f.claims.size,0);}
  const f=fixture({appointments:[]});assert.equal((await f.service.run({dryRun:false})).sent,0);assert.equal(f.provider.length,0);
  const s=createService({db:f.db,env,now:()=>new Date('2026-09-14T05:30:00Z')});assert.equal((await s.run({dryRun:false,scheduled:true})).skipped,'outside_rome_0630');
});
test('Concurrent runs + repeated run produce one message per PT/day; empty PT receives none',async()=>{
  const f=fixture();await Promise.all([f.service.run({dryRun:false}),f.service.run({dryRun:false})]);await f.service.run({dryRun:false});const posts=f.provider.filter(p=>p.options.method==='POST');assert.equal(posts.length,1);const body=JSON.parse(posts[0].options.body);assert.equal(body.to,'393331234567');assert.equal(body.type,'template');assert.equal(body.template.name,'agenda_1');assert.equal(body.template.components[0].parameters[0].text,'08:00 · Mario SIMULATO · PT 1:1 · 0/8');assert.ok(!JSON.stringify([...f.claims.values()]).includes('Mario'));assert.equal([...f.claims.values()][0].p_status,'accepted');
});
test('Timeout, provider rejection and failed delivery log never retry or expose provider details',async()=>{
  for(const mode of ['timeout','rejected','finish']){const f=fixture();if(mode==='finish')f.setFinishFail();else f.setOutcome(mode);const r=await f.service.run({dryRun:false});await f.service.run({dryRun:false});assert.equal(f.provider.filter(p=>p.options.method==='POST').length,1);assert.ok(!JSON.stringify(r).includes('PRIVATE'));assert.equal(r.results[0].status,mode==='rejected'?'failed':'uncertain');}
});
test('Verified Direction only, no forged actor, configuration uses existing authenticated gateway',async()=>{
  const f=fixture();for(const role of [null,'pt','secretary']){const h=createHandler({authenticate:async()=>role?{id:'p1',role}:null,service:f.service});assert.equal((await h({httpMethod:'POST',body:JSON.stringify({action:'configure',actor:{role:'owner'},whatsapp_phone:'+393331234567'})})).statusCode,403);}
  const h=createHandler({authenticate:async()=>({id:'verified-owner',role:'owner'}),service:f.service});const r=await h({httpMethod:'POST',body:JSON.stringify({action:'configure',operatorId:'p1',whatsapp_phone:'+393331234567',whatsapp_agenda_enabled:true,actor:{id:'fake'}})});assert.equal(r.statusCode,200);const write=f.calls.find(c=>c.method==='POST');assert.equal(write.body.p_actor_id,'verified-owner');assert.deepEqual(Object.keys(write.body.p_payload.rows[0]).sort(),['id','whatsapp_agenda_enabled','whatsapp_phone']);
  assert.equal((await h({httpMethod:'GET'})).statusCode,405);assert.equal((await h({httpMethod:'POST',body:JSON.stringify({action:'configure',operatorId:'p1',whatsapp_phone:'123',whatsapp_agenda_enabled:true})})).statusCode,409);
});
test('Template missing and sender mismatch never send; opt-out suppresses delivery',async()=>{
  const f=fixture();f.data.operators[0].whatsapp_agenda_enabled=false;assert.equal((await f.service.run({dryRun:false})).sent,0);assert.equal(f.provider.length,0);
  const f2=fixture({appointments:[appt('1'),appt('2'),appt('3')]});const r=await f2.service.run({dryRun:false});assert.equal(r.results[0].error,'template_missing');assert.equal(f2.claims.size,0);
  const f3=fixture();const s=createService({db:f3.db,env,now,fetchImpl:async()=>({ok:true,json:async()=>({display_phone_number:'+390000000000'})})});await assert.rejects(s.run({dryRun:false}),/sender_mismatch/);assert.equal(f3.claims.size,0);
});
test('Preview before migration remains read-only with opt-in false; system PT roles supported',async()=>{
 const f=fixture();f.data.operators[0].roles=[];f.data.operators[0].system_roles=['personal_trainer'];
 const db=async(table,options)=>{if(options.query?.includes('whatsapp_phone')){const e=Error('column operators.whatsapp_phone does not exist');e.status=400;throw e;}return f.db(table,options)};
 // The pre-migration database has no WhatsApp fields, including no stored opt-in.
 for(const o of f.data.operators){delete o.whatsapp_phone;delete o.whatsapp_agenda_enabled;}
 const s=createService({db,env:{},now});const r=await s.run();assert.equal(r.migrationReady,false);assert.equal(r.agendas[0].enabled,false);assert.equal(r.agendas[0].count,1);assert.ok(f.calls.every(c=>c.method==='GET'));
});
