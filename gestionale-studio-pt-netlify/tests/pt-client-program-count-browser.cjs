const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
(async()=>{
 const port='8844',url='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,[path.join(__dirname,'../tools/coaching-editor/visibility-fixture.cjs')],{env:{...process.env,PT_FIXTURE_PORT:port,PT_SESSION_LOG_ENABLED:'true'}});
 let browser;
 try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',()=>resolve());server.on('error',reject);server.on('exit',code=>reject(Error('fixture '+code)));});
 browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#loginEmail').fill('pt-a@example.test');await page.locator('#loginCode').fill('111111');await page.locator('#loginButton').click();
 const card=page.locator('[data-client-id="a-inactive"]');await card.waitFor();
 assert.match(await card.innerText(),/1 programma salvato/);
 await card.click();
 await page.locator('[data-delete-program="program-a-inactive"]').click();
 await page.locator('#actionConfirmDialog [value="confirm"]').click();
 await page.waitForFunction(()=>appState.programs.find(p=>p.id==='program-a-inactive')?.archived===true);
 await page.locator('.sidebar [data-view="clientsView"]').click();
 assert.match(await card.innerText(),/Nessun programma salvato/);
 assert.equal(await page.locator('#clientsView').getByLabel('Seduta da registrare').count(),0);
 await page.reload();await page.locator('#loginEmail').fill('pt-a@example.test');await page.locator('#loginCode').fill('111111');await page.locator('#loginButton').click();await page.locator('.sidebar [data-view="clientsView"]').click();await card.waitFor();assert.match(await card.innerText(),/Nessun programma salvato/,'deleted programs stay excluded after bootstrap');
 await card.click();
 await page.evaluate(()=>{void restoreProgram('program-a-inactive')});
 await page.locator('#actionConfirmDialog [value="confirm"]').click();
 await page.waitForFunction(()=>appState.programs.find(p=>p.id==='program-a-inactive')?.archived===false);
 await page.locator('.sidebar [data-view="clientsView"]').click();assert.match(await card.innerText(),/1 programma salvato/);
 assert.match(await page.locator('[data-client-id="a-active"]').innerText(),/Nessun programma salvato/);
 assert.deepEqual(errors,[]);console.log('PASS client counts: delete, reload, restore, empty client; client grid has no session form');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
