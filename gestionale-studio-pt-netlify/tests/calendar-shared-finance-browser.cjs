const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]}));
const {createHandler}=require('../netlify/functions/calendar-client-finance');
const L=require('../app/calendario-studio/js/package-ledger');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const clients=[{id:'c',nome:'Cliente',cognome:'Test',email:'test@example.invalid',active:true,package_types:['PT 1:1','Nutrizione'],sessions_total:8,sessions_remaining:8,importo:300,stato_pagamento:'Da pagare',notes:'[CICLO-PACCHETTO 2026-10-01]',package_start:'2026-10-01'}];let payments=[],providerDown=false,providerWrites=0;
 const db=async(table,opts)=>{if(table==='clients')return opts.query.includes('email=')?[{id:'c'}]:JSON.parse(JSON.stringify(clients));const b=opts.body;assert.equal(b.p_expected.notes,clients[0].notes);Object.assign(clients[0],b.p_values);return JSON.parse(JSON.stringify(clients[0]));};
 const upstream=async(action,p)=>{if(providerDown)throw Error('SCADENZE_OFFLINE');if(action==='getCliente')return {cliente:{email:clients[0].email,active:true}};if(action==='getPagamenti')return {pagamenti:payments};if(action==='getFatture')return {fatture:[{id:'f',email:clients[0].email,numero_label:'42/2026',data_fattura:'2026-10-01',totale:300,stato:'emessa',prestazione:'PT e nutrizione'}]};assert.equal(action,'addPagamentoCondiviso');providerWrites++;payments.push(p);return {success:true}};
 const handler=createHandler({auth:async()=>({id:'owner',role:'owner'}),database:db,provider:upstream});
 const page=await browser.newPage({viewport:{width:1440,height:960},timezoneId:'Europe/Rome'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-client-finance')){const response=await handler({httpMethod:req.method(),body:req.postData()});return route.fulfill({status:response.statusCode,headers:response.headers,body:response.body});}
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const body=req.postDataJSON();return route.fulfill({json:body.operation==='session'?{actor:{id:'staff_1',role:'owner'}}:{proposals:[]}});}
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').at(-1);return route.fulfill({json:table==='clients'?clients:table==='operators'?[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?view=clients&access=SIM');await page.waitForFunction(()=>State.getClients().length===1);
 await page.evaluate(()=>App._openPackageFinance('c'));await page.getByText('42/2026',{exact:true}).waitFor();
 assert.match(await page.locator('#shared-finance').innerText(),/Quote precedenti da definire/);
 await page.locator('#shared-pt').fill('200');await page.locator('#shared-nutrition').fill('100');await page.locator('#shared-save').click();
 await page.waitForFunction(()=>document.getElementById('shared-pt')?.value==='200.00');await page.getByText('42/2026',{exact:true}).waitFor();
 await page.locator('#shared-amount').fill('120,50');await page.locator('#shared-date').fill('2026-10-01');await page.locator('#shared-register').click();
 await page.waitForFunction(()=>document.querySelector('#shared-finance')?.textContent.includes('Associato a questo ciclo'));assert.equal(providerWrites,1);assert.equal(clients[0].stato_pagamento,'Parziale');assert.equal(L.cycleFinancial(L.currentCycle(clients[0])).paid,120.5);
 await page.reload();await page.waitForFunction(()=>State.getClients().length===1);await page.evaluate(()=>App._openPackageFinance('c'));await page.getByText('Associato a questo ciclo',{exact:true}).waitFor();assert.equal(await page.locator('#shared-pt').inputValue(),'200.00');assert.equal(await page.locator('#pkg-payment-submit').isDisabled(),true);
 await page.setViewportSize({width:390,height:844});await page.locator('#shared-pt').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/neacea-shared-finance-mobile.png'});
 assert.equal(await page.locator('#shared-save').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 providerDown=true;await page.locator('#shared-refresh').click();await page.getByText('SCADENZE_OFFLINE',{exact:true}).waitFor();assert.equal(await page.locator('#shared-pt').inputValue(),'200.00');assert.equal(providerWrites,1);
 assert.deepEqual(errors,[]);console.log('PASS shared finance browser: split, shared registration, reopened state, legacy local write disabled, mobile and offline error. Provider and REST are simulated.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
