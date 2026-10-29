const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(){
 const clients=['a','b'].map(id=>({id,nome:id,ptPartnerId:id==='a'?'b':'a',active:true,packageTypes:['PT 1:2'],sessionsTotal:8,sessionsRemaining:1,serverUpdatedAt:'2026-10-01',ptAssegnato:'pt'}));
 const rows=Array.from({length:8},(_,i)=>({id:'expected'+i,clientIds:['a','b'],serviceId:'pt12',status:'prenotato',date:`2099-12-${10+i}`,startTime:'17:00',durationMin:60,notes:'[RINNOVO-PREVISTO pending]'}));
 const elements={'pair-partner':{value:'b'},'pair-form':{dataset:{partner:'b'}}};
 const panels=[],toasts=[];let renewalOpens=0;
 const context=vm.createContext({console,Intl,Date,crypto,window:{},document:{getElementById:id=>elements[id],querySelectorAll:()=>[{value:'1'}]},
  App:{guardStudioManagement:()=>true},UI:{openModal:html=>panels.push(html),showToast:message=>toasts.push(message)},
  State:{getClients:()=>clients,getAppointments:()=>rows,getOperators:()=>[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]},
  Services:{getClient:id=>clients.find(c=>c.id===id),getClientSessionMetrics:()=>({completed:7,chargedAbsences:0,toSchedule:1}),serviceUsesPackageSessions:()=>true,appointmentInCurrentPackageCycle:a=>!a.notes?.includes('[RINNOVO-PREVISTO '),timeToMin:t=>Number(t.slice(0,2))*60+Number(t.slice(3))},
  PTSessionModel:require('../app/calendario-studio/js/pt-session-model'),
  ExpectedRenewals:{forClient:async()=>{renewalOpens++;return true;}}});
 vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/pt-pair-sessions.js','utf8'),context);
 return {api:context.window.PTPairSessions,clients,rows,elements,panels,toasts,renewalOpens:()=>renewalOpens};
}
test('missing pair sessions open the current package even with an expected renewal',async()=>{
 const f=fixture();await f.api.open('a',false);
 assert.equal(f.renewalOpens(),0);assert.match(f.panels.at(-1),/pacchetto corrente/i);
 f.api.configure();const html=f.panels.at(-1);
 assert.match(html,/id="pair-sessions"[^>]*value="1"/);
 assert.doesNotMatch(html,/id="pair-(renew|amount|paid|count)-/);
 await f.api.open('a');assert.equal(f.renewalOpens(),1,'commercial renewal still opens the existing proposal');
});
test('current package preview never renews and its back action keeps that mode',async()=>{
 const f=fixture();await f.api.open('a',false);f.api.configure();
 Object.assign(f.elements,{'pair-start':{value:'2099-11-02'},'pair-time':{value:'17:00'},'pair-operator':{value:'pt'},'pair-sessions':{value:'1'}});
 f.api.preview();assert.deepEqual(f.toasts,[]);
 assert.match(f.panels.at(-1),/pacchetto corrente, nessun rinnovo/);
 assert.match(f.panels.at(-1),/PTPairSessions.open\('a',false\)/);
});
test('one recovery uses the available old balances and leaves all eight next-package dates alone',()=>{
 const f=fixture(),before=JSON.stringify(f.rows);
 const input={start:'2099-11-02',time:'17:00',operatorId:'pt',days:[1],count:1,renewals:[null,null]};
 const plan=f.api.buildPlan(input,f.clients,f.rows);
 assert.equal(plan.appointments.length,1);assert.ok(plan.clients.every(c=>c.renewal===null));
 assert.equal(JSON.stringify(f.rows),before);
 assert.throws(()=>f.api.buildPlan({...input,count:2},f.clients,f.rows),/Residuo disponibile insufficiente/);
 f.rows.push({id:'current',serviceId:'pt12',clientIds:['a','b'],status:'prenotato',notes:''});
 assert.throws(()=>f.api.buildPlan(input,f.clients,f.rows),/Residuo disponibile insufficiente/);
});
test('a participant without available sessions cannot be silently renewed to book a recovery',async()=>{
 const f=fixture();f.clients[1].sessionsRemaining=0;
 await f.api.open('a',false);f.api.configure();
 assert.match(f.toasts.at(-1),/verifica il residuo/);
 assert.doesNotMatch(f.panels.at(-1),/id="pair-sessions"/);
 assert.equal(f.renewalOpens(),0);
});
