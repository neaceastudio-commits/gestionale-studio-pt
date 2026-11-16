// Candidate or deployed assets, real local SQL, and no production data writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{open}=require('./helpers/calendar-recovery-db.cjs');
const {chromium}=require(require.resolve('playwright',{paths:[path.join(root,'tools/coaching-editor')]}));
const origin=process.env.CALENDAR_RELEASE_ORIGIN||'';
if(origin&&!/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(origin))throw Error('Unexpected origin');
(async()=>{const f=await open();let browser;try{
 const source=await f.seed();await f.write({...source,id:'third',date:'2099-11-05'});await f.write({...source,id:'unknown',date:'2020-01-01'});
 await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261116174042_calendar_cycle_recovery_sequence.sql'),'utf8'));
 const renewal=require('../netlify/functions/lib/expected-renewals');
 const clients=await f.all('clients');let p={id:crypto.randomUUID(),plan:{serviceId:'pt11',startDate:'2099-11-09',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60},{day:3,time:'17:00',operatorId:'pt',duration:60},{day:4,time:'17:00',operatorId:'pt',duration:60}],clients:[{id:'a',source:{cycleId:'cycle-a',start:'2099-10-01'},cycleId:'next-a',sessions:4,amount:100}],issue:''}};
 p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewal.appointmentsFor(p),clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
 const authPath=require.resolve('../netlify/functions/lib/calendar-audit-auth');
 require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async t=>t==='OWNER'?{id:'owner',role:'owner'}:null,db:async(table,options={})=>{
  const b=options.body;
  if(table==='rpc/calendar_maintain_package')return f.rpc('calendar_maintain_package',[b.p_actor_id,b.p_proposal_id]);
  if(table==='rpc/calendar_expected_renewal')return f.rpc('calendar_expected_renewal',[b.p_actor_id,b.p_action,JSON.stringify(b.p_payload)]);
  if(table==='rpc/calendar_cancel_and_recover')return f.rpc('calendar_cancel_and_recover',[b.p_actor_id,b.p_actor_role,b.p_request_id,JSON.stringify(b.p_expected)]);
  if(table==='rpc/calendar_audit_write')return f.rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
  if(['clients','appointments','calendar_expected_renewals'].includes(table))return f.all(table);
  throw Error('Unexpected SQL route '+table);
 }}};
 const handler=require('../netlify/functions/lib/calendar-audit-endpoint').createHandler('calendar');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1150,height:900},timezoneId:'Europe/Rome'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda')||u.pathname.endsWith('calendar-client-finance'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const r=await handler({httpMethod:'POST',body:req.postData()});return route.fulfill({status:r.statusCode,contentType:'application/json',body:r.body});}
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();return route.fulfill({json:['clients','operators','appointments'].includes(table)?await f.all(table):[]});}
  assert.equal(u.hostname,'calendar.test');const asset=u.pathname==='/'?'/index.html':u.pathname;
  let body=fs.readFileSync(path.join(root,'app/calendario-studio',asset));if(origin){const r=await fetch(origin+asset+u.search);assert.equal(r.status,200);body=Buffer.from(await r.arrayBuffer());}
  return route.fulfill({contentType:asset.endsWith('.js')?'application/javascript':asset.endsWith('.css')?'text/css':'text/html',body});
 });
 await page.goto('https://calendar.test/');
 await page.evaluate(async()=>{localStorage.setItem('neacea-studio-session',JSON.stringify({token:'OWNER',operatorId:'owner',role:'owner'}));const ops=await fetch('/rest/v1/operators').then(r=>r.json());State.saveOperators(ops);const clients=await fetch('/rest/v1/clients').then(r=>r.json());State.saveClients(clients);});
 // Use the real cache adapter with an injected authenticated gateway; the local
 // handler still enforces scope and the transaction runs in SQL.
 await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getClients().length===1);
 const result=await page.evaluate(async()=>{const rows=await fetch('/rest/v1/appointments').then(r=>r.json());const map=a=>({id:a.id,serviceId:a.service_id,clientIds:a.client_ids,operatorId:a.operator_id,date:a.date,startTime:a.start_time.slice(0,5),durationMin:a.duration_min,bufferMin:a.buffer_min,status:a.status,notes:a.notes});State.saveAppointments(rows.map(map));const before=State.getAppointments().find(a=>a.id==='source');return SupabaseSync.saveAppointmentAtomic({...before,status:'annullato'},before);});
 assert.ok(result.recovery,result.error);const rows=await f.all('appointments'),next=rows.filter(a=>a.notes.includes('[RINNOVO-PREVISTO '));assert.ok(next.every(a=>a.date>result.recovery.date));
 const cached=await page.evaluate(()=>State.getAppointments());for(const a of next)assert.equal(cached.find(c=>c.id===a.id).date,a.date,'UI cache immediately shows shifted dates');
 await page.evaluate(async()=>{App.guardStudioManagement=()=>true;await ExpectedRenewals.open();});
 await page.getByText('Esiti da verificare',{exact:true}).waitFor();assert.match(await page.locator('#expected-renewals-body').innerText(),/2020-01-01/);
 const unknown=(await f.all('appointments')).find(a=>a.id==='unknown');assert.equal(unknown.status,'prenotato');assert.equal(unknown.date,'2020-01-01');
 const reopened=await f.all('appointments');await page.reload();assert.deepEqual(await f.all('appointments'),reopened);assert.deepEqual(await f.all('clients'),clients);assert.deepEqual(errors,[]);
 console.log('PASS cycle sequence UI: immediate shifted cache, unresolved outcomes visible, SQL persistence, unchanged balances, reload. Assets: '+(origin||'candidate'));
 }finally{await browser?.close();await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
