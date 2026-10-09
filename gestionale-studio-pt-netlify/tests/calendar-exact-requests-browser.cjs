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
   localStorage.setItem('neacea_pt_declared_availability_v4',JSON.stringify(Object.fromEntries(['a','b'].map(id=>[id,Object.fromEntries((id==='a'?['mon','thu','fri']:['tue','wed','sat']).map(day=>[day,{slots:['09:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','13:00-14:00']}]))]))));
  });
  const root=path.join(__dirname,'../app/calendario-studio');
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'css/pt-availability-overview.css'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'js/pt-availability-overview.js'),'utf8')});
  await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
  await page.locator('.pt-weekly-options summary').click();
  await page.locator('#pt-weekly-from').fill('2026-09-28');
  await page.locator('#pt-weekly-from').dispatchEvent('change');
  for(const day of ['mon','thu','fri'])await page.locator(`[data-weekly-day=${day}] input[type=checkbox]`).check();
  assert.equal(await page.locator('.pt-request-result').count(),3);
  assert.match(await page.locator('.pt-weekly-summary').innerText(),/PT Alfa/);
  assert.equal(await page.locator('.pt-request-result h4').first().innerText(),'Lunedi alle 10:00');
  for(const day of ['mon','thu','fri'])await page.locator(`[data-weekly-day=${day}] input[type=checkbox]`).uncheck();
  await page.locator('#pt-weekly-time').fill('13:00');
  for(const day of ['tue','wed','sat'])await page.locator(`[data-weekly-day=${day}] input[type=checkbox]`).check();
  assert.match(await page.locator('.pt-weekly-summary').innerText(),/PT Beta/);
  for(const title of await page.locator('.pt-request-result h4').allTextContents())assert.match(title,/13:00/);
  await page.locator('[data-weekly-day=wed] input[type=time]').fill('12:30');
  assert.match(await page.locator('.pt-request-result h4').nth(1).innerText(),/12:30/);
  assert.match(await page.locator('.pt-request-result h4').nth(0).innerText(),/13:00/);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator('.pt-search-panel').first().evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.evaluate(()=>Calendar.render());
  await page.waitForTimeout(300);
  assert.equal(await page.locator('[data-weekly-day=wed] input[type=time]').inputValue(),'12:30');
  assert.deepEqual(errors,[]);
  console.log('PASS weekly interview UI: Mon/Thu/Fri 10, Tue/Wed/Sat 13, individual time, live results, state retention, mobile');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
