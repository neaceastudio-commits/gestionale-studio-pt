const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
const {templateSnapshot}=require('../netlify/functions/lib/pt-templates');
(async()=>{
 const port='8843',url='http://127.0.0.1:'+port;
 const server=spawn(process.execPath,[path.join(__dirname,'../tools/coaching-editor/visibility-fixture.cjs')],{env:{...process.env,PT_FIXTURE_PORT:port}});
 let browser;
 try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',()=>resolve());server.on('error',reject);server.on('exit',code=>reject(Error('fixture '+code)));});
 browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#loginEmail').fill('pt-a@example.test');await page.locator('#loginCode').fill('111111');await page.locator('#loginButton').click();
 await page.locator('[data-client-id="a-inactive"]').click();
 assert.equal(await page.getByText(/Versioni precedenti ripristinabili/).count(),0);
 await page.getByRole('button',{name:'Salva in archivio',exact:true}).click();
 await page.locator('#templateDialog').waitFor({state:'visible'});
 await page.locator('#templateTitle').fill('Copia generale');await page.locator('#templatePrivacy').check();
 assert.equal(await page.locator('#templateFolder').inputValue(),'');
 const expected=await page.evaluate(()=>NeaceaPTEditor.toSnapshot(state));
 const before=await (await fetch(url+'/__fixture/state')).json();
 await page.locator('#confirmTemplateBtn').click();await page.locator('#templateDialog').waitFor({state:'hidden'});
 const rootSaved=await (await fetch(url+'/__fixture/state')).json();
 const copy=rootSaved.templates.find(t=>t.title==='Copia generale');assert.ok(copy);assert.equal(copy.folder_id,null);
 assert.deepEqual(copy.snapshot,templateSnapshot(expected,'Copia generale'));
 assert.deepEqual(rootSaved.programs,before.programs,'copy does not change source program');assert.deepEqual(rootSaved.currentPrograms,before.currentPrograms);
 await page.locator('#newTemplateFolderBtn').click();await page.locator('#templateFolderName').fill('Programmi studio');await page.locator('#saveTemplateFolderBtn').click();await page.locator('#templateFolderDialog').waitFor({state:'hidden'});
 const withFolder=await (await fetch(url+'/__fixture/state')).json();const folder=withFolder.folders[0];assert.ok(folder);
 await page.locator('.sidebar [data-view="clientsView"]').click();await page.locator('[data-client-id="a-inactive"]').click();
 await page.getByRole('button',{name:'Salva in archivio',exact:true}).click();await page.locator('#templateTitle').fill('Copia cartella');await page.locator('#templateFolder').selectOption(folder.id);await page.locator('#templatePrivacy').check();
 await page.locator('#confirmTemplateBtn').click();await page.locator('#templateDialog').waitFor({state:'hidden'});
 const folderSaved=await (await fetch(url+'/__fixture/state')).json();assert.equal(folderSaved.templates.find(t=>t.title==='Copia cartella').folder_id,folder.id);
 assert.deepEqual(folderSaved.programs,before.programs);assert.equal(folderSaved.revisions.length,0);
 assert.deepEqual(errors,[]);console.log('PASS archive UI: current card, editable name, root/folder, exact prescription snapshot, source/current unchanged, no revision menu');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
