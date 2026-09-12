const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 for(const role of ['owner','pt']){
  const page=await browser.newPage({timezoneId:'Europe/Rome'});const calls=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const request=route.request();if(request.url().includes('/.netlify/functions/calendar-activity')){const b=request.postDataJSON();calls.push(b);assert.equal(request.method(),'POST');assert.equal(b.accessToken,'SIM_TOKEN');assert.ok(!b.actor_name);
    return route.fulfill({json:b.operation==='session'?{actor:{id:'op',role}}:[{id:1,created_at:'2026-09-12T16:42:00Z',actor_name:'PT SIMULATO',action:'appointment_moved',client_ids:['client'],before_data:{start_time:'17:00'},after_data:{start_time:'18:00'},source:'calendar'}]});
   }return route.fulfill({contentType:'text/html',body:'<div class="topbar-right"></div><div id="modal"></div>'});
  });
  await page.goto('https://audit-simulation.test/?access=SIM_TOKEN');
  await page.evaluate(()=>{window.State={getOperators:()=>[{id:'op',nome:'PT',cognome:'SIMULATO'}],getClients:()=>[{id:'client',nome:'CLIENTE',cognome:'SIMULATO'}]};window.UI={openModal:html=>document.querySelector('#modal').innerHTML=html,closeModal(){},showToast(){}}});
  await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js/calendar-audit.js'),'utf8')});await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
  if(role==='owner'){
   await page.getByRole('button',{name:'Registro attività',exact:true}).click();await page.getByText(/Spostata seduta/).last().waitFor();
   assert.ok((await page.locator('#calendar-audit-view').innerText()).includes('17:00'));assert.ok((await page.locator('#calendar-audit-view').innerText()).includes('18:00'));
   await page.getByRole('button',{name:'Ultimi 7 giorni'}).click();await page.getByLabel('Origine').selectOption('system');await page.getByRole('button',{name:'Filtra',exact:true}).click();await page.waitForFunction(()=>true);
   await page.waitForTimeout(50);assert.ok(calls.some(c=>c.operation==='list'&&c.filters.source==='system'&&c.filters.from&&c.filters.to));
   assert.equal(await page.getByRole('button',{name:/Elimina|Modifica/}).count(),0);
  }else{await page.waitForTimeout(50);assert.equal(await page.locator('#calendar-audit-button').count(),0)}
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS audit browser: verified owner-only UI, dates/actor/client/action/source filters, safe read-only rendering');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
