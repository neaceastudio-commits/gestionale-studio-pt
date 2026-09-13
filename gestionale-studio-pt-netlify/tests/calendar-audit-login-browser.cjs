const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const role of ['owner','pt']){
 const ctx=await browser.newContext(),page=await ctx.newPage(),writes=[];let expired=false;
 await page.route('**/*',async route=>{const r=route.request(),url=new URL(r.url());
 if(url.pathname.endsWith('pt-access-email')){const b=r.postDataJSON();assert.equal(b.action,'verify');return route.fulfill({status:b.code==='123456'?200:401,json:b.code==='123456'?{success:true,token:'SIGNED_SIM'}:{error:'Codice non valido'}})}
 if(url.pathname.endsWith('calendar-activity')){const b=r.postDataJSON();if(b.accessToken!=='SIGNED_SIM'||expired)return route.fulfill({status:401,json:{error:'Sessione non valida'}});if(b.operation==='session')return route.fulfill({json:{actor:{id:'verified-op',role}}});writes.push(b);return route.fulfill({json:{id:'TEST',start_time:'18:00'}})}
 const code=fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js/calendar-audit.js'),'utf8');return route.fulfill({contentType:'text/html',body:'<div class="topbar-right"></div><div id="modal"></div><script>window.UI={openModal:h=>document.querySelector("#modal").innerHTML=h,showToast(){}};window.State={getOperators:()=>[],getClients:()=>[]};window.SupabaseSync={pullAll:async()=>{}};window.Calendar={render(){}};</script><script>'+code+'</script>'});
 });
 await page.goto('https://calendar.test/');await page.locator('#calendar-audit-login-button').waitFor();
 const missing=await page.evaluate(()=>CalendarAudit.write('rpc/calendar_save_appointment',{body:{p_appointment:{id:'TEST'}}}));assert.ok(missing.error);assert.equal(writes.length,0);
 await page.locator('input[name=email]').fill('sim@example.test');await page.locator('input[name=code]').fill('000000');await page.locator('#calendar-audit-login button[type=submit]').click();await page.getByText('Codice non valido',{exact:true}).waitFor();assert.equal(writes.length,0);
 await page.locator('input[name=code]').fill('123456');await Promise.all([page.waitForURL(u=>u.searchParams.get('access')==='SIGNED_SIM'),page.locator('#calendar-audit-login button[type=submit]').click()]);
 assert.equal(new URL(page.url()).searchParams.get('mode'),role==='pt'?'pt':'admin');if(role==='pt')assert.equal(new URL(page.url()).searchParams.get('op'),'verified-op');
 await page.reload();await page.evaluate(()=>CalendarAudit.write('rpc/calendar_save_appointment',{body:{p_appointment:{id:'TEST',start_time:'18:00'},p_expected:null}}));assert.equal(writes.length,1);assert.equal(writes[0].operation,'save');assert.equal(writes[0].accessToken,'SIGNED_SIM');assert.ok(!writes[0].actor_name);
 expired=true;await page.evaluate(()=>CalendarAudit.write('rpc/calendar_save_appointment',{body:{p_appointment:{id:'TEST'}}}));await page.locator('#calendar-audit-login').waitFor();assert.equal(writes.length,1);await ctx.close();
}
console.log('PASS direct owner/PT login, invalid code rejected, verified session persists, saves audited, expiry requires reauthentication');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
