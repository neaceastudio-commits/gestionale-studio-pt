// Actual browser + application gateway + local PostgreSQL. Network and login
// are adapters; no requests or writes reach a production service.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {open}=require('./helpers/calendar-recovery-db.cjs');
const {chromium}=require(require.resolve('playwright',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]}));
const releaseOrigin=process.env.CALENDAR_RELEASE_ORIGIN||'';
if(releaseOrigin&&!/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(releaseOrigin))throw Error('Unexpected release origin');
(async()=>{
 const f=await open(true);let browser;
 try{
  await f.seed(true);
  await f.write({id:'occupied',service_id:'blocco',client_ids:[],operator_id:'pt',date:'2099-11-05',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:''});
  const authPath=require.resolve('../netlify/functions/lib/calendar-audit-auth');
  require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:null,
   db:async(table,options={})=>{
    const b=options.body;
    if(table==='rpc/calendar_cancel_and_recover')return f.rpc('calendar_cancel_and_recover',[b.p_actor_id,b.p_actor_role,b.p_request_id,JSON.stringify(b.p_expected)]);
    if(table==='rpc/calendar_audit_write')return f.rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
    if(table==='rpc/calendar_expected_renewal')return [];
    if(table==='calendar_expected_renewals')return [];
    throw Error('Unexpected gateway table '+table);
   }}};
  const handler=require('../netlify/functions/lib/calendar-audit-endpoint').createHandler('calendar');
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  let fail=true,lost=false,calls=0;
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
   if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:false}});
   if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
   if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
   if(u.pathname.endsWith('calendar-activity')){
    const input=req.postDataJSON();
    if(input.operation==='cancel_and_recover'){
     calls++;if(fail)return route.fulfill({status:409,json:{error:'TEST: database non disponibile'}});
    }
    const result=await handler({httpMethod:'POST',body:req.postData()});
    if(lost&&input.operation==='cancel_and_recover'&&result.statusCode===200){lost=false;return route.fulfill({status:503,json:{error:'TEST: risposta persa'}});}
    return route.fulfill({status:result.statusCode,contentType:'application/json',body:result.body});
   }
   if(u.pathname.includes('/rest/v1/')){
    assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();
    return route.fulfill({json:['clients','appointments','operators'].includes(table)?await f.all(table):[]});
   }
   assert.equal(u.hostname,'calendar.test','external network is forbidden');
   const file=path.resolve(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));
   let body=fs.readFileSync(file);
   if(releaseOrigin){const response=await fetch(releaseOrigin+(u.pathname==='/'?'/index.html':u.pathname)+u.search,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);body=Buffer.from(await response.arrayBuffer());}
   return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body});
  });
  await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getAppointments().length===12);
  await page.evaluate(()=>App.openDetail('source'));
  await page.getByRole('button',{name:'Annullata · da recuperare',exact:true}).click();
  await page.waitForFunction(()=>document.body.textContent.includes('TEST: database non disponibile'));
  assert.equal((await f.all('appointments')).find(a=>a.id==='source').status,'prenotato');
  fail=false;lost=true;
  await page.getByRole('button',{name:'Annullata · da recuperare',exact:true}).click();
  await page.waitForFunction(()=>document.body.textContent.includes('TEST: risposta persa'));
  assert.equal((await f.all('appointments')).filter(a=>a.id.startsWith('recovery_')).length,1);
  await page.getByRole('button',{name:'Annullata · da recuperare',exact:true}).click();
  await page.locator('#calendar-recovery-notice').waitFor({state:'visible'});
  assert.match(await page.locator('#calendar-recovery-notice').innerText(),/Recupero programmato.*17:00/);
  assert.match(await page.locator('#calendar-recovery-notice').innerText(),/Sovrapposizione.*inserito comunque/);
  assert.equal(await page.locator('#calendar-recovery-notice').getAttribute('role'),'alert');
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>Services.getClientSessionMetrics(c).toSchedule)),[1,1]);
  await page.screenshot({path:'/tmp/neacea-automatic-recovery-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Apri recupero',exact:true}).click();
  const recovery=(await f.all('appointments')).find(a=>a.id.startsWith('recovery_'));
  assert.deepEqual(recovery.client_ids,['a','b']);
  assert.equal(await page.locator('#calendar-recovery-notice').count(),0);
  await page.reload();await page.waitForFunction(()=>State.getAppointments().length===13);
  assert.equal(await page.evaluate(()=>State.getAppointments().filter(a=>a.id.startsWith('recovery_')).length),1);
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>c.sessionsRemaining)),[3,3]);
  assert.deepEqual(errors,[]);assert.equal(calls,3);
  console.log('PASS automatic recovery browser: cancel → failure → lost response → retry → one shared recovery despite overlap → persistent alert → open → reload; no production writes. Assets: '+(releaseOrigin||'local candidate'));
 }finally{await browser?.close();await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
