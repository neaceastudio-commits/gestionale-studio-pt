// Real Calendar audit client, synthetic network only. No production data writes.
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const revision='20261030-shared-finance-v1',source=fs.readFileSync(__dirname+'/../app/calendario-studio/js/calendar-audit.js','utf8');
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const scenario of ['focus','visibility','timer','server-rejection','mixed-assets','offline']){
  const page=await browser.newPage({viewport:{width:390,height:844}});let serverRevision=revision,writeCount=0,sessionCount=0,offline=false;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(scenario==='timer')await page.clock.install();
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/.netlify/functions/calendar-activity'){
    if(offline)return route.abort();const input=route.request().postDataJSON();
    if(input.operation==='session'){sessionCount++;return route.fulfill({json:{actor:{id:'owner',role:'owner'},calendarRevision:serverRevision}})}
    writeCount++;assert.equal(input.calendarRevision,revision);
    return route.fulfill({status:409,json:{error:'Il Calendario è stato aggiornato. Ricarica prima di salvare.',code:'CALENDAR_RELOAD_REQUIRED',calendarRevision:'next'}});
   }
   if(u.pathname==='/audit.js')return route.fulfill({contentType:'text/javascript',body:source});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"></head><body><div class="topbar-right"></div><input id="draft" aria-label="Bozza"><script>const SupabaseSync={clientWriteRevision:'${scenario==='mixed-assets'?'old':revision}',pullAll:async()=>{window.pulls=(window.pulls||0)+1}}; const Calendar={render:()=>{window.renders=(window.renders||0)+1}}; const UI={showToast:()=>{}};</script><script src="/audit.js"></script></body></html>`});
  });
  await page.goto('https://calendar-update.test/?access=SIM');await page.waitForFunction(()=>!!document.getElementById('calendar-audit-button'));
  await page.getByLabel('Bozza').fill('Appunti non ancora salvati');
  if(['focus','visibility','timer'].includes(scenario)){
   serverRevision='next';
   if(scenario==='timer')await page.clock.runFor(60001);
   else if(scenario==='visibility')await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   else await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.locator('#calendar-update-notice').waitFor();
   const result=await page.evaluate(()=>CalendarAudit.write('clients',{method:'PATCH',body:{id:'synthetic',pt_assegnato:'new'}}));assert.equal(result.code,'CALENDAR_RELOAD_REQUIRED');assert.ok(sessionCount>=2);assert.equal(writeCount,0);
  }else if(scenario==='offline'){
   offline=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   const result=await page.evaluate(()=>CalendarAudit.call('client',{rows:[{id:'synthetic'}]}));assert.match(result.error,/Connessione/);assert.equal(await page.locator('#calendar-update-notice').count(),0);
  }else{
   const first=await page.evaluate(()=>CalendarAudit.write('clients',{method:'PATCH',body:{id:'synthetic'}}));assert.equal(first.code,'CALENDAR_RELOAD_REQUIRED');
   const second=await page.evaluate(()=>CalendarAudit.call('assignment',{clientId:'synthetic',trainerId:'new'}));assert.equal(second.code,'CALENDAR_RELOAD_REQUIRED');assert.equal(writeCount,scenario==='mixed-assets'?0:1);
  }
  assert.equal(await page.getByLabel('Bozza').inputValue(),'Appunti non ancora salvati');
  assert.equal(await page.evaluate(()=>window.renders||0),0);assert.equal(await page.evaluate(()=>window.pulls||0),0);
  assert.equal(new URL(page.url()).pathname,'/');assert.deepEqual(errors,[]);
  if(scenario==='focus'){assert.match(await page.locator('#calendar-update-notice').innerText(),/copia le modifiche/);await page.screenshot({path:'/tmp/neacea-calendar-update-notice.png'});}
  await page.close();console.log('PASS update guard: '+scenario+'; draft retained, no automatic reload, no false success');
 }
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
