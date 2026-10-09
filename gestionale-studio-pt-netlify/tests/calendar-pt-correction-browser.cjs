const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({timezoneId:'Europe/Rome'}),errors=[],writes=[];
  const clients=['one','two'].map(id=>({id,nome:'TEST',cognome:id,active:true,package_types:['PT 1:1','PT 1:2','Nutrizione'],sessions_total:12,sessions_remaining:7}));
  const appointments=clients.map(c=>({id:c.id,service_id:'pt11',client_ids:[c.id],operator_id:'pt',date:'2026-10-02',start_time:'10:00:00',duration_min:60,buffer_min:10,status:'fatto',notes:''}));
  let fail=true;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
   if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'direction_only'}});
   if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
   if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false,linked:false}});
   if(u.pathname.endsWith('calendar-activity')){
    const body=req.postDataJSON();if(body.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});
    writes.push(body);
    if(body.operation==='client'){const patch=body.payload.rows[0];Object.assign(clients.find(c=>c.id===patch.id),patch);return route.fulfill({json:[clients.find(c=>c.id===patch.id)]});}
    assert.equal(body.operation,'correct_pt_sessions');
    if(fail)return route.fulfill({status:409,json:{error:'Una seduta è cambiata: aggiorna l’anteprima'}});
    const change=body.payload.changes[0];assert.equal(body.payload.changes.length,1);assert.equal(change.before.id,'one');assert.equal(change.partner.id,'two');
    appointments[0].service_id='pt12';appointments[0].client_ids=['one','two'];appointments[1].status='annullato';
    return route.fulfill({json:{appointments}});
   }
   if(u.pathname.includes('/rest/v1/')){
    assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();
    return route.fulfill({json:table==='clients'?clients.filter(c=>!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+c.id):table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'TEST',roles:['PT'],active:true}]:[]});
   }
   const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));
   return route.fulfill({contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',body:fs.readFileSync(file)});
  });
  await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===2&&State.getAppointments().length===2);
  await page.evaluate(()=>App.openEditClient('one'));
  await page.locator('input[name="pkg"][value="PT 1:1"]').uncheck();
  await page.locator('#cl-correct-sessions').check();await page.locator('#client-save-button').click();
  await page.waitForSelector('#pt-correction-from');
  await page.locator('#pt-correction-from').fill('2026-10-01');await page.locator('#pt-correction-to').fill('2026-10-31');
  await page.locator('#pt-correction-partner').selectOption('two');await page.locator('#pt-correction-preview-button').click();
  assert.match(await page.locator('#pt-correction-result').innerText(),/2 → 1 ore/);
  const checkbox=page.locator('input[name="pt-correction-row"]');await checkbox.uncheck();assert.equal(await page.locator('#pt-correction-save').isDisabled(),true);await checkbox.check();
  await page.screenshot({path:'/tmp/neacea-calendar-pt-correction-preview.png',fullPage:true});
  await page.locator('#pt-correction-save').click();await page.waitForFunction(()=>document.querySelector('#pt-correction-result').textContent.includes('non confermata'));
  assert.equal(await page.evaluate(()=>State.getAppointments()[0].serviceId),'pt11');assert.equal(await page.locator('#pt-correction-save').isDisabled(),true);
  fail=false;await page.locator('#pt-correction-preview-button').click();await page.locator('#pt-correction-save').click();await page.waitForFunction(()=>document.querySelector('#pt-correction-result').textContent.includes('Correzioni salvate'));
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>c.sessionsRemaining)),[7,7]);
  assert.equal(await page.evaluate(()=>State.getAppointments().filter(a=>a.status!=='annullato').length),1);
  await page.evaluate(()=>UI.closeModal());await page.reload();await page.waitForFunction(()=>State.getAppointments().some(a=>a.serviceId==='pt12'));
  await page.evaluate(()=>{Calendar.switchView('operators');PTAvailabilityOverview.changeHoursSummaryMonth('2026-10');PTAvailabilityOverview.openHoursSummary()});
  await page.waitForSelector('.pt-hours-card');assert.match(await page.locator('.pt-hours-card').innerText(),/1 h/);assert.match(await page.locator('.pt-hours-card').innerText(),/PT 1:2/);assert.match(await page.locator('.pt-hours-card').innerText(),/PT 1:1 maturato: 0 h/);
  assert.deepEqual(errors,[]);console.log('PASS browser: client form → preview → error/retry → atomic response → reload → 1 hour PT 1:2; unchanged balances');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
