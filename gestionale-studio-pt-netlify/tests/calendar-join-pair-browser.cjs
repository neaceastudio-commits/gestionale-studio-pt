const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {fixture}=require(path.join(root,'tests/helpers/calendar-join-pair-db.cjs'));
const {chromium}=require(require.resolve('playwright',{paths:[path.join(root,'tools/coaching-editor')]}));
(async()=>{const f=await fixture();let browser;try{
 const clients=await f.all('clients'),before=await f.all('appointments');
 const authPath=path.join(root,'netlify/functions/lib/calendar-audit-auth.js'),endpoint=path.join(root,'netlify/functions/lib/calendar-audit-endpoint.js');
 require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:token==='PT'?{id:'pt',role:'pt'}:null,db:async(table,options={})=>{
  const b=options.body;if(table==='rpc/calendar_join_pair_sessions')return f.rpc('calendar_join_pair_sessions',[b.p_actor_id,b.p_request_id,JSON.stringify(b.p_payload),b.p_preview]);
  if(['clients','appointments','calendar_expected_renewals'].includes(table))return f.all(table);throw Error('Unexpected route '+table);
 }}};
 delete require.cache[endpoint];const handler=require(endpoint).createHandler('calendar');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome',locale:'it-IT'}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 let fail=true,lost=true;
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('whatsapp-agenda')||u.pathname.endsWith('calendar-client-finance'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('calendar-activity')){const input=req.postDataJSON(),save=input.operation==='join_pair_sessions'&&!input.payload.preview;if(save){requests.push(input);if(fail){fail=false;return route.fulfill({status:409,json:{error:'TEST scrittura rifiutata'}});}}
   const r=await handler({httpMethod:'POST',body:req.postData()});if(save&&lost&&r.statusCode===200){lost=false;return route.fulfill({status:503,json:{error:'TEST risposta persa'}});}return route.fulfill({status:r.statusCode,contentType:'application/json',body:r.body});}
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();let rows=['clients','operators','appointments'].includes(table)?await f.all(table):[];if(u.searchParams.has('id'))rows=rows.filter(r=>'eq.'+r.id===u.searchParams.get('id'));return route.fulfill({json:rows});}
  assert.equal(u.hostname,'calendar.test');const file=path.join(root,'app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));let body=fs.readFileSync(file);if(process.env.CALENDAR_ASSET_ORIGIN){const r=await fetch(process.env.CALENDAR_ASSET_ORIGIN+u.pathname+u.search,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);body=Buffer.from(await r.arrayBuffer());}return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body});
 });
 await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getClients().length===2&&window.PTPairSessions);
 await page.evaluate(()=>PTPairSessions.open('a',false));await page.getByRole('button',{name:'Continua',exact:true}).click();
 await page.getByRole('heading',{name:'Completa la coppia dalle sedute già prenotate',exact:true}).waitFor();assert.equal(await page.locator('.pair-join-selection:checked').count(),2);assert.deepEqual(await f.all('appointments'),before);
 // Errors stay inside the open dialog; the user can correct the selection.
 for(const box of await page.locator('.pair-join-selection').all())await box.uncheck();await page.locator('#pair-join-review').click();await page.locator('#pair-plan-error').filter({hasText:'Seleziona almeno una'}).waitFor({state:'visible'});for(const box of await page.locator('.pair-join-selection').all())await box.check();
 await page.locator('#pair-join-review').click();await page.locator('#pair-join-confirm').waitFor();assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await f.all('clients'),clients);
 await page.screenshot({path:'/private/tmp/neacea-join-pair-preview-mobile.png',fullPage:true});await page.setViewportSize({width:1100,height:950});await page.screenshot({path:'/private/tmp/neacea-join-pair-preview-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
 await page.locator('#pair-join-confirm').click();await page.locator('#pair-plan-error').filter({hasText:'scrittura rifiutata'}).waitFor({state:'visible'});assert.deepEqual(await f.all('appointments'),before);
 await page.locator('#pair-join-confirm').click();await page.locator('#pair-plan-error').filter({hasText:'risposta persa'}).waitFor({state:'visible'});await page.locator('#pair-join-confirm').click();await page.waitForFunction(()=>!document.getElementById('pair-join-confirm'));
 assert.equal(requests.length,3);assert.equal(requests[1].payload.requestId,requests[2].payload.requestId);assert.deepEqual(requests[1].payload,requests[2].payload);assert.deepEqual(await f.all('clients'),clients);
 const after=await f.all('appointments');assert.equal(after.length,before.length);for(const row of after.filter(a=>a.id.startsWith('solo-'))){assert.equal(row.service_id,'pt12');assert.deepEqual(row.client_ids,['b','a']);}
 await page.reload();await page.waitForFunction(()=>State.getAppointments().filter(a=>a.id.startsWith('solo-')&&a.serviceId==='pt12'&&a.clientIds.length===2).length===2);
 assert.deepEqual(errors,[]);
 const bad={operation:'join_pair_sessions',accessToken:'PT',calendarRevision:'20261111-package-suspension-v1',payload:requests[1].payload};assert.equal((await handler({httpMethod:'POST',body:JSON.stringify(bad)})).statusCode,403);
 assert.equal((await handler({httpMethod:'POST',body:JSON.stringify({...bad,accessToken:'OWNER',calendarRevision:'old'})})).statusCode,409);
 console.log('PASS pair Continue: existing bookings offered, inline error, read-only preview, rollback, lost-response retry, independent readback, reload, same IDs and balances; real local SQL. Assets: '+(process.env.CALENDAR_ASSET_ORIGIN||'local candidate'));
}finally{await browser?.close();await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
