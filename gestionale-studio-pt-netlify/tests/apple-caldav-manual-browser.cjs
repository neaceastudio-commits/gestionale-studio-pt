const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const mode of ['owner','pt','past','cancelled','nutrition','linked','retry']){
 const page=await browser.newPage();page.on('pageerror',e=>console.log('UI error',mode,e.message));let links=0,statuses=0;
 await page.route('**/*',async route=>{
  const r=route.request();if(r.url().includes('/api')){const b=r.postDataJSON();assert.deepEqual(Object.keys(b).sort(),['id','operation']);assert.equal(b.id,'TEST_BROWSER');if(b.operation==='status'){statuses++;return route.fulfill({json:{eligible:mode!=='past',linked:mode==='linked'}})}links++;return route.fulfill({json:mode==='retry'&&links===1?{error:'Riprova'}:{linked:true}})}
  const code=fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js/apple-operativo.js'),'utf8');return route.fulfill({contentType:'text/html; charset=utf-8',body:`<div id="detail"></div><script>window.CalendarAudit={canLinkApple:()=>${mode!=='pt'},appleLink:async(operation,id)=>{const d=await (await fetch('/api',{method:'POST',body:JSON.stringify({operation,id})})).json();if(d.error)throw Error(d.error);return d;}};</script><script>${code}</script>`});
 });await page.goto('https://calendar.test/');await page.evaluate(({mode})=>AppleOperativo.mount({id:'TEST_BROWSER',serviceId:mode==='nutrition'?'nutrition':'pt11',status:mode==='cancelled'?'annullato':'prenotato'},document.querySelector('#detail')),{mode});
 if(['pt','past','cancelled','nutrition'].includes(mode)){assert.equal(await page.locator('#apple-operativo-link').count(),0);assert.equal(links,0);}else{
  const b=page.locator('#apple-operativo-link');if(mode!=='linked'){await b.click();if(mode==='retry'){await page.getByText('Riprova',{exact:true}).waitFor();await b.click();}}
  await page.waitForFunction(()=>document.querySelector('#apple-operativo-link')?.textContent==='✓ Collegato a NEACEA — Operativo').catch(async e=>{console.log(mode,await page.locator('#detail').innerText(),{links,statuses});throw e});assert.equal(await b.isDisabled(),true);assert.equal(links,mode==='linked'?0:mode==='retry'?2:1);
 }await page.close();
}console.log('PASS manual button: owner only, future PT, linked state, retry, no appointment payload or duplicate click');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
