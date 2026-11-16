// Real Calendar UI and SQL; every production-data request is intercepted.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{open}=require('./helpers/calendar-recovery-db.cjs');
const {chromium}=require(require.resolve('playwright',{paths:[path.join(root,'tools/coaching-editor')]}));
const origin=process.env.CALENDAR_RELEASE_ORIGIN||'';
if(origin&&!/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(origin))throw Error('Unexpected asset origin');
(async()=>{const f=await open(true);let browser;try{
 const source=await f.seed(true);await f.write({...source,status:'annullato'},source);
 const migration=fs.readdirSync(path.join(root,'supabase/migrations')).find(n=>n.endsWith('_calendar_restore_empty_renewal.sql'));
 await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8'));
 const renewal=require('../netlify/functions/lib/expected-renewals');
 let p={id:crypto.randomUUID(),plan:{serviceId:'pt12',startDate:'2099-12-01',slots:[{day:1,time:'17:00',operatorId:'pt',duration:60}],clients:(await f.all('clients')).map(c=>({id:c.id,source:{cycleId:'cycle-'+c.id,start:'2099-10-01'},cycleId:'next-'+c.id,sessions:4,amount:100})),issue:''}};
 p=await f.rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...p,appointments:renewal.appointmentsFor(p),clients:(await f.all('clients')).map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
 for(const a of (await f.all('appointments')).filter(a=>a.notes.includes('[RINNOVO-PREVISTO ')))await f.write({...a,status:'annullato'},a);
 const history=await f.all('appointments'),balances=await f.all('clients');
 const authPath=require.resolve('../netlify/functions/lib/calendar-audit-auth');
 require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async t=>t==='OWNER'?{id:'owner',role:'owner'}:null,db:async(table,options={})=>{
  const b=options.body;
  if(table==='rpc/calendar_restore_empty_renewal')return f.rpc('calendar_restore_empty_renewal',[b.p_actor_id,JSON.stringify(b.p_payload)]);
  if(table==='rpc/calendar_expected_renewal')return f.rpc('calendar_expected_renewal',[b.p_actor_id,b.p_action,JSON.stringify(b.p_payload)]);
  if(table==='rpc/calendar_cancel_and_recover')return f.rpc('calendar_cancel_and_recover',[b.p_actor_id,b.p_actor_role,b.p_request_id,JSON.stringify(b.p_expected)]);
  if(table==='rpc/calendar_audit_write')return f.rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
  if(['clients','appointments','calendar_expected_renewals'].includes(table))return f.all(table);
  throw Error('Unexpected SQL route '+table);
 }}};
 const handler=require('../netlify/functions/lib/calendar-audit-endpoint').createHandler('calendar');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1100,height:850},timezoneId:'Europe/Rome'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());let fail=true,lost=true;
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda')||u.pathname.endsWith('calendar-client-finance'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){
   const input=req.postDataJSON();if(input.operation==='cancel_and_recover'&&fail){fail=false;return route.fulfill({status:409,json:{error:'TEST scrittura rifiutata'}});}
   const r=await handler({httpMethod:'POST',body:req.postData()});
   if(input.operation==='cancel_and_recover'&&r.statusCode===200&&lost){lost=false;return route.fulfill({status:503,json:{error:'TEST risposta persa'}});}
   return route.fulfill({status:r.statusCode,contentType:'application/json',body:r.body});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();return route.fulfill({json:['clients','operators','appointments'].includes(table)?await f.all(table):[]});}
  assert.equal(u.hostname,'calendar.test');const asset=u.pathname==='/'?'/index.html':u.pathname;
  let body=fs.readFileSync(path.join(root,'app/calendario-studio',asset));
  if(origin){const r=await fetch(origin+asset+u.search);assert.equal(r.status,200);body=Buffer.from(await r.arrayBuffer());}
  return route.fulfill({contentType:asset.endsWith('.js')?'application/javascript':asset.endsWith('.css')?'text/css':'text/html',body});
 });
 await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getClients().length===2);
 await page.evaluate(()=>App.openDetail('source'));
 const save=()=>page.getByRole('button',{name:'Genera recupero',exact:true}).click();
 await save();await page.waitForFunction(()=>document.body.textContent.includes('TEST scrittura rifiutata'));assert.deepEqual(await f.all('appointments'),history);
 await save();await page.waitForFunction(()=>document.body.textContent.includes('TEST risposta persa'));
 await save();await page.locator('#calendar-recovery-notice').waitFor({state:'visible'});
 assert.equal((await f.all('appointments')).filter(a=>a.id.startsWith('recovery_')).length,1);
 await page.locator('#calendar-recovery-notice').getByRole('button',{name:'Chiudi',exact:true}).click();
 await page.evaluate(()=>UI.closeModal());await page.getByRole('button',{name:'Rinnovi previsti',exact:true}).click();
 await page.getByText(/4 prenotate/).waitFor();
 for(const row of history)assert.deepEqual((await f.all('appointments')).find(a=>a.id===row.id),row);
 assert.deepEqual(await f.all('clients'),balances);
 const after=await f.all('appointments');assert.equal(after.length,history.length+5);
 const lesson=after.find(a=>!history.some(h=>h.id===a.id)&&a.notes.includes('[RINNOVO-PREVISTO '));
 await page.evaluate(day=>{UI.closeModal();Calendar.switchView('week',day)},lesson.date);
 assert.ok(await page.getByRole('button',{name:'Modifica seduta del rinnovo',exact:true}).count(),'renewal badge offers editing beside its date');
 await page.getByRole('button',{name:'Modifica seduta del rinnovo',exact:true}).first().click();
 const editedId=await page.locator('#appt-id').inputValue();
 const beforeEdit=after.find(a=>a.id===editedId);
 await page.locator('#appt-time').fill('18:00');await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();
 await page.waitForFunction(id=>State.getAppointments().find(a=>a.id===id)?.startTime==='18:00',editedId);
 const edited=(await f.all('appointments')).find(a=>a.id===editedId);assert.equal(edited.start_time,'18:00:00');assert.equal(edited.status,'prenotato');assert.match(edited.notes,/RINNOVO-PREVISTO/);
 assert.deepEqual(require('../app/calendario-studio/js/pt-session-model').read(edited),require('../app/calendario-studio/js/pt-session-model').read(beforeEdit));
 assert.deepEqual(await f.all('clients'),balances);
 const finalRows=await f.all('appointments');
 await page.reload();await page.waitForFunction(n=>State.getAppointments().length===n,after.length);
 assert.deepEqual(await f.all('appointments'),finalRows);assert.deepEqual(errors,[]);
 console.log('PASS empty renewal and already cancelled UI: rejected write, lost response, retry, dates restored, history/balances unchanged, reload. Assets: '+(origin||'candidate'));
}finally{await browser?.close();await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
