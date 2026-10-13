const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),M=require('../app/calendario-studio/js/pt-session-model');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1440,height:960},timezoneId:'Europe/Rome'}),errors=[],writes=[];await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const clients=[{id:'a',nome:'Cliente',cognome:'Saldo',active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,importo:200,stato_pagamento:'Da pagare',notes:'[CICLO-PACCHETTO 2026-10-01]'}, {id:'paid',nome:'Cliente',cognome:'Pagato',active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,importo:200,stato_pagamento:'Pagato',notes:'[CICLO-PACCHETTO 2026-10-01]'}, {id:'zero',nome:'Cliente',cognome:'Zero',active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,importo:0,stato_pagamento:'Da pagare',notes:'[CICLO-PACCHETTO 2026-10-01]'}];
 const appointments=[];let fail=false;
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const body=req.postDataJSON();if(body.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});if(body.operation==='expected_renewals')return route.fulfill({json:{proposals:[]}});writes.push(body);
   assert.equal(body.operation,'client');const row=body.payload.rows[0];assert.equal(row.id,'a');assert.ok(!Object.hasOwn(row,'sessions_remaining'));assert.ok(!Object.hasOwn(row,'sessions_total'));
   if(fail)return route.fulfill({status:409,json:{error:'SIM_INVOICE_CONFLICT'}});Object.assign(clients[0],row);return route.fulfill({json:[clients[0]]});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').at(-1);return route.fulfill({json:table==='clients'?clients:table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'Esempio',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?view=clients&access=SIM');await page.waitForFunction(()=>State.getClients().length===3);
 await page.evaluate(()=>App._openPackageFinance('a'));await page.locator('#pkg-payment-amount').fill('50,00');await page.locator('#pkg-payment-submit').click();await page.waitForFunction(()=>document.getElementById('pkg-payment-amount').value==='150.00');assert.equal(clients[0].stato_pagamento,'Parziale');assert.match(clients[0].notes,/"amount":50/);
 fail=true;await page.locator('#pkg-payment-amount').fill('10');await page.locator('#pkg-payment-submit').click();await page.waitForFunction(()=>document.body.textContent.includes('SIM_INVOICE_CONFLICT'));assert.equal(await page.locator('#pkg-payment-submit').isEnabled(),true);assert.equal((clients[0].notes.match(/"kind":"incasso"/g)||[]).length,1);
 await page.evaluate(()=>App._openPackageFinance('zero'));assert.equal(await page.locator('#pkg-payment-submit').isDisabled(),true);assert.match(await page.locator('.modal-body').innerText(),/imposta l’importo concordato/);
 await page.evaluate(()=>App._openPackageFinance('paid'));assert.equal(await page.locator('#pkg-payment-submit').isDisabled(),true);assert.match(await page.locator('.modal-body').innerText(),/già saldato/);
 assert.equal(clients[0].sessions_remaining,8);assert.equal(writes.length,2);assert.deepEqual(errors,[]);console.log('PASS Calendar invoice browser: partial income, decimal comma, audit transport, server error shown, retry unlocked, paid/zero causes visible, no session counter changes');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
