const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[],payments=[];
 const clients=['a','b'].map(id=>({id,nome:'TEST',cognome:id,active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,updated_at:'2026-10-01T00:00:00Z'}));
 const appointments=['a','b'].map(id=>({id:'appointment-'+id,client_ids:[id],service_id:'pt11',operator_id:'pt',date:'2026-10-01',start_time:'10:00',duration_min:60,status:'fatto'}));
 let fail=false;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('calendar-activity')){const data=req.postDataJSON();if(data.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});writes.push(data);
   if(fail)return route.fulfill({status:409,json:{error:'TEST: dati cambiati'}});
   if(data.operation==='save_pair_client'){const c=data.payload.client;Object.assign(clients[0],c);Object.assign(clients[1],{pt_partner_id:'a',package_types:['PT 1:2']});return route.fulfill({json:clients});}
   if(data.operation==='pt_payments'){const p=data.payload;if(p.action==='register'){if(!payments.some(x=>x.id===p.id))payments.push({...p});}if(p.action==='void')Object.assign(payments.find(x=>x.id===p.id),{voided_at:'2026-10-09',void_reason:p.reason});return route.fulfill({json:{payments}});}
   throw Error('Unexpected write '+data.operation);
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const t=u.pathname.split('/').pop();return route.fulfill({json:t==='clients'?clients:t==='appointments'?appointments:t==='operators'?[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===2&&window.PTTrainerPayments);await page.waitForTimeout(700);
 await page.evaluate(()=>App._renderClientModal('a',true));await page.uncheck('input[name="pkg"][value="PT 1:1"]');await page.check('input[name="pkg"][value="PT 1:2"]');await page.click('#client-save-button');await page.waitForFunction(()=>document.getElementById('client-save-error').textContent.includes('secondo cliente'));assert.equal(writes.length,0);
 await page.selectOption('#cl-pt-partner','b');fail=true;await page.click('#client-save-button');await page.waitForFunction(()=>document.getElementById('client-save-error').textContent.includes('dati cambiati'));assert.equal(clients[0].pt_partner_id,undefined);
 fail=false;await page.click('#client-save-button');await page.waitForFunction(()=>!document.querySelector('#modal-overlay.open'));assert.equal(clients[1].pt_partner_id,'a');
 await page.evaluate(()=>PTTrainerPayments.open('2026-10'));await page.waitForSelector('#pt-payment-form');assert.match(await page.locator('#pt-payments-body').innerText(),/20,00/);
 await page.selectOption('[name="operator_id"]','pt');await page.fill('[name="amount"]','10');await page.fill('[name="note"]','Prova pagamento');await page.locator('#pt-payment-form button').click();await page.waitForSelector('[data-void]');assert.equal(payments.length,1);assert.equal(payments[0].amount_cents,1000);assert.match(await page.locator('tbody').innerText(),/10,00/);
 await page.click('[data-void]');await page.fill('[name="reason"]','Rettifica di prova');await page.getByRole('button',{name:'Conferma rettifica',exact:true}).click();await page.waitForFunction(()=>document.getElementById('pt-payments-body').textContent.includes('Rettificato:'));assert.equal(payments.length,1);assert.ok(payments[0].voided_at);
 await page.screenshot({path:'/tmp/neacea-review-payments-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS mobile: partner required, failed save retained, reciprocal association, simultaneous PT 1:1 20 EUR, payment register and traced void');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
