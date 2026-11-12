const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {open}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
const {chromium}=require(require.resolve('playwright',{paths:[path.join(root,'tools/coaching-editor')]}));
async function run(pair){
 const f=await open(pair);let browser;
 try{
  await f.seed(pair);
  for(const file of ['20261111091927_calendar_package_suspension.sql','20261112103135_calendar_package_schedule.sql','20261112104008_calendar_reactivate_historical_pair.sql'])await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
  if(pair){const a=(await f.all('clients')).find(c=>c.id==='a');await f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify({clientId:'a',action:'archive',status:'Ibernato',expectedUpdatedAt:a.updated_at,expectedAppointments:(await f.all('appointments')).filter(a=>a.status==='prenotato')})]);await f.patch({id:'b',pt_partner_id:null,package_types:['PT 1:1']});}
  const authPath=path.join(root,'netlify/functions/lib/calendar-audit-auth.js'),endpoint=path.join(root,'netlify/functions/lib/calendar-audit-endpoint.js');
  require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:null,db:async(table,options={})=>{
   const b=options.body;
   if(table==='rpc/calendar_package_schedule')return f.rpc('calendar_package_schedule',[b.p_actor_id,b.p_request_id,JSON.stringify(b.p_payload),b.p_preview]);
   if(table==='rpc/calendar_reactivate_pair')return f.rpc('calendar_reactivate_pair',[b.p_actor_id,b.p_request_id,JSON.stringify(b.p_payload)]);
   if(table==='rpc/calendar_audit_write')return f.rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
   if(['clients','appointments','calendar_expected_renewals'].includes(table))return f.all(table);
   throw Error('Unexpected gateway '+table);
  }}};
  delete require.cache[endpoint];const handler=require(endpoint).createHandler('calendar');
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome',locale:'it-IT'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  let fail=false,lost=false,saveCount=0;
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
   if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
   if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
   if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
   if(u.pathname.endsWith('calendar-activity')){
    const input=req.postDataJSON(),saving=input.operation==='reactivate_pair'||input.operation==='package_schedule'&&!input.payload.preview;
    if(saving){saveCount++;if(fail){fail=false;return route.fulfill({status:409,json:{error:'TEST database non disponibile'}});}}
    const r=await handler({httpMethod:'POST',body:req.postData()});
    if(saving&&lost&&r.statusCode===200){lost=false;return route.fulfill({status:503,json:{error:'TEST risposta persa'}});}
    return route.fulfill({status:r.statusCode,contentType:'application/json',body:r.body});
   }
   if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();let rows=['clients','operators','appointments'].includes(table)?await f.all(table):[];if(u.searchParams.has('id'))rows=rows.filter(r=>'eq.'+r.id===u.searchParams.get('id'));return route.fulfill({json:rows});}
   assert.equal(u.hostname,'calendar.test');const file=path.join(root,'app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file)});
  });
  await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getClients().length>0&&window.PackageSchedule&&window.ClientReactivation);
  const before=await f.all('appointments'),clients=await f.all('clients');
  if(pair){
   await page.evaluate(()=>Clients.reactivate('a'));await page.getByRole('heading',{name:'Riattiva cliente in coppia'}).waitFor();
   await page.selectOption('#reactivate-partner','b');await page.getByRole('button',{name:'Mostra riepilogo',exact:true}).click();assert.match(await page.locator('#reactivate-pair-preview').innerText(),/PT 1:1 → PT 1:2/);assert.equal((await f.all('clients')).find(c=>c.id==='b').package_types[0],'PT 1:1');
   lost=true;await page.locator('#reactivate-pair-confirm').click();await page.waitForFunction(()=>document.getElementById('reactivate-pair-error')?.textContent.includes('risposta persa'));await page.locator('#reactivate-pair-confirm').click();await page.waitForFunction(()=>!document.getElementById('reactivate-partner'));
   assert.equal(saveCount,2);assert.deepEqual(await f.all('appointments'),before);for(const c of await f.all('clients')){assert.equal(c.active,true);assert.ok(c.package_types.includes('PT 1:2'));assert.equal(c.sessions_remaining,clients.find(x=>x.id===c.id).sessions_remaining);}
  }else{
   await page.evaluate(()=>App.openPackageOverview('a'));await page.getByRole('button',{name:'Cambia giorni e orari',exact:true}).click();
   assert.equal(await page.getByRole('heading',{name:'Modifica singole sedute',exact:true}).count(),0);
   await page.locator('[data-schedule-remove="2"]').click();await page.locator('[data-schedule-day="0"]').selectOption('2');await page.locator('[data-schedule-day="1"]').selectOption('4');await page.locator('[data-schedule-time="0"]').fill('09:00');await page.locator('[data-schedule-time="1"]').fill('18:00');await page.locator('[data-schedule-from]').fill('2099-11-01');
   await page.getByRole('button',{name:'Mostra lezioni che cambiano',exact:true}).click();await page.locator('[data-schedule-save]').waitFor();assert.deepEqual(await f.all('appointments'),before,'preview is read-only');
   fail=true;await page.locator('[data-schedule-save]').click();await page.waitForFunction(()=>document.querySelector('[data-schedule-error]')?.textContent.includes('database non disponibile'));assert.deepEqual(await f.all('appointments'),before);
   lost=true;await page.locator('[data-schedule-save]').click();await page.waitForFunction(()=>document.querySelector('[data-schedule-error]')?.textContent.includes('risposta persa'));await page.locator('[data-schedule-save]').click();await page.waitForFunction(()=>!document.querySelector('[data-schedule-save]'));
   assert.equal(saveCount,3);assert.equal((await f.all('appointments')).length,before.length);await page.reload();await page.waitForFunction(()=>State.getAppointments().length>0);await page.evaluate(()=>App.openPackageOverview('a'));
   const saved=(await f.all('appointments')).find(a=>a.id==='source');assert.equal(saved.start_time.slice(0,5),'09:00');await page.locator('#pkg-time-source').fill('10:30');await page.locator('#pkg-time-source').locator('xpath=ancestor::tr').getByRole('button',{name:'Salva seduta',exact:true}).click();await page.waitForFunction(()=>State.getAppointments().find(a=>a.id==='source')?.startTime==='10:30');assert.equal(saveCount,3,'single lesson uses its original save flow');assert.equal((await f.all('clients'))[0].sessions_remaining,clients[0].sessions_remaining);
  }
  await page.screenshot({path:'/private/tmp/neacea-'+(pair?'pair-reactivation':'weekly-schedule')+'-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS browser '+(pair?'pair choice, conversion, lost response, retry, independent database reread':'weekly preview, no partial write on failure, lost response, safe retry, reload, unchanged single lesson save')+'; real local SQL, no production requests.');
 }finally{await browser?.close();await f.close()}
}
(async()=>{await run(false);await run(true)})().catch(e=>{console.error(e);process.exitCode=1});
