const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const model=require('../app/calendario-studio/js/pt-session-model');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({timezoneId:'Europe/Rome'}),errors=[],writes=[],appointments=[];
  const clients=['one','two'].map((id,i)=>({id,pt_partner_id:i===0?'two':'one',nome:'TEST',cognome:id,active:true,package_types:['PT 1:2','Nutrizione'],sessions_total:8,sessions_remaining:i+1,pt_assegnato:'pt',updated_at:'2026-10-01T00:00:00+00:00'}));
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
    if(body.operation==='expected_renewals'&&body.payload.action==='list')return route.fulfill({json:{proposals:[]}});
    writes.push(body);
    if(body.operation==='renew_pt_pair'){
     if(fail)return route.fulfill({status:409,json:{error:'TEST: salvataggio non confermato'}});
     for(const item of body.payload.clients)Object.assign(clients.find(c=>c.id===item.id),item.renewal||{});
     for(const a of body.payload.appointments){const participants=Object.fromEntries(clients.map(c=>[c.id,{cycleId:JSON.parse(c.notes.match(/\[NEACEA-PACKAGE-LEDGER-V1\]([\s\S]*?)\[\/NEACEA-PACKAGE-LEDGER-V1\]/)[1]).cycles.at(-1).id,start:'2026-11-02',status:'prenotato'}]));appointments.push(model.write(a,{version:1,rateCents:1500,participants}));}
     return route.fulfill({json:{requestId:body.payload.requestId,appointments,clients}});
    }
    assert.equal(body.operation,'save');const next=body.payload.appointment,index=appointments.findIndex(a=>a.id===next.id);appointments[index]=next;clients.forEach(c=>c.sessions_remaining--);
    return route.fulfill({json:{appointment:next,clients}});
   }
   if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();return route.fulfill({json:table==='clients'?clients:table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'TEST',roles:['PT'],active:true}]:[]});}
   const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));
   return route.fulfill({contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',body:fs.readFileSync(file)});
  });
  await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===2&&window.PTPairSessions);
  await page.evaluate(()=>PTPairSessions.open('one'));await page.selectOption('#pair-partner','two');await page.getByText('Continua',{exact:true}).click();
  assert.equal(await page.locator('#pair-renew-0').isChecked(),true);assert.equal(await page.locator('#pair-renew-1').isChecked(),false);
  await page.check('#pair-renew-1');for(const i of [0,1])await page.fill('#pair-amount-'+i,'200');
  await page.fill('#pair-start','2026-11-02');await page.check('.pair-day[value="1"]');await page.fill('#pair-sessions','2');
  await page.getByText('Verifica e mostra anteprima',{exact:true}).click();await page.waitForSelector('#pair-confirm');
  assert.match(await page.locator('.modal-body').innerText(),/2 appuntamenti condivisi/);assert.match(await page.locator('.modal-body').innerText(),/Vecchio residuo 1/);assert.match(await page.locator('.modal-body').innerText(),/Vecchio residuo 2/);
  await page.screenshot({path:'/tmp/neacea-pt-pair-renewal-preview.png',fullPage:true});
  await page.click('#pair-confirm');await page.waitForFunction(()=>!document.getElementById('pair-confirm').disabled);
  assert.equal(appointments.length,0);assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>c.sessionsRemaining)),[1,2]);
  fail=false;await page.click('#pair-confirm');await page.waitForFunction(()=>State.getAppointments().length===2);
  assert.equal(writes[0].payload.requestId,writes[1].payload.requestId,'retry uses the same request');
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>c.sessionsRemaining)),[8,8]);
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>PackageLedger.parse(c).cycles[0].sessionsRemainingAtClose)),[1,2]);
  await page.evaluate(()=>App.openPackageOverview('one'));
  assert.equal(await page.locator('.package-renewal-undo-button').isDisabled(),true);
  await page.evaluate(()=>UI.closeModal());
  await page.evaluate(()=>App._markDone(State.getAppointments()[0].id));await page.selectOption('#pair-attendance-1','noshow');await page.getByText('Salva entrambe le presenze',{exact:true}).click();
  await page.waitForFunction(()=>State.getClients()[0].sessionsRemaining===7);
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>Services.getClientSessionMetrics(c).noShow)),[0,1]);
  await page.reload();await page.waitForFunction(()=>State.getAppointments().length===2);
  await page.evaluate(()=>{Calendar.switchView('operators');PTAvailabilityOverview.changeHoursSummaryMonth('2026-11');PTAvailabilityOverview.openHoursSummary()});
  const report=await page.locator('.pt-hours-card').innerText();assert.match(report,/15,00/);assert.match(report,/Ore PT prenotate: 1 h/);assert.match(report,/PT 1:2 maturato: 1 h/);
  await page.screenshot({path:'/tmp/neacea-pt-pair-hours.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS browser: independent renewals → preview → failed save → stable retry → shared appointments → mixed attendance → reload → 15 EUR / one hour');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
