const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
 try {
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://requests.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="view-availability" class="active"></div>'}));
  await page.goto('https://requests.test/');
  await page.evaluate(()=>{
   window.Calendar={getCurrentDateStr:()=> '2026-09-28',render(){},switchView(){}};
   window.CONFIG={SERVICES:{pt11:{id:'pt11',label:'Personal',roles:['PT'],durationMin:60}}};
   window.Services={getService:id=>CONFIG.SERVICES[id]};
   window.State={getOperators:()=>[{id:'a',nome:'PT Alfa',roles:['PT']},{id:'b',nome:'PT Beta',roles:['PT']}],getClients:()=>[{id:'c',nome:'Cliente',cognome:'Prova',active:true}],getAppointments:()=>[]};
   window.App={canManageStudioData:()=>true,openNewAppointment(...args){window.prepared=args;document.body.insertAdjacentHTML('beforeend','<input id="appt-duration"><select id="appt-operator"><option value="a">A</option><option value="b">B</option></select>')},_onSlotChange(){}};
   localStorage.setItem('neacea_pt_declared_availability_v4',JSON.stringify({a:{mon:{slots:['09:00-10:00','10:00-11:00']}},b:{tue:{slots:['10:00-11:00']}}}));
  });
  const root=path.join(__dirname,'../app/calendario-studio');
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'css/pt-availability-overview.css'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'js/pt-availability-overview.js'),'utf8')});
  await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
  await page.locator('#pt-exact-client').selectOption('c');
  await page.locator('[data-field=time]').fill('09:30');
  await page.locator('[data-field=time]').dispatchEvent('change');
  assert.equal(await page.locator('[data-request-operator=a]').count(),1);
  assert.equal(await page.locator('[data-request-operator=b]').count(),0);
  await page.getByText('+ Aggiungi giorno e orario',{exact:true}).click();
  const second=page.locator('[data-exact-row]').nth(1);
  await second.locator('[data-field=time]').fill('10:00');await second.locator('[data-field=time]').dispatchEvent('change');
  assert.equal(await second.locator('[data-field=date]').inputValue(),'2026-09-29');
  assert.equal(await page.locator('[data-request-index="1"][data-request-operator=b]').count(),1);
  await page.locator('[data-request-index="1"][data-request-operator=b]').click();
  assert.deepEqual(await page.evaluate(()=>window.prepared),['2026-09-29','c','10:00','pt11']);
  assert.equal(await page.locator('#appt-operator').inputValue(),'b');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.pt-search-panel').first().evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.getByRole('button',{name:'Rimuovi richiesta 1',exact:true}).click();
  assert.equal(await page.locator('[data-exact-row]').count(),1);
  assert.equal(await page.locator('[data-field=time]').inputValue(),'10:00');
  assert.deepEqual(errors,[]);
  console.log('PASS exact request UI: client, arbitrary time, multiple dates, different PT, prepare, remove, mobile');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
