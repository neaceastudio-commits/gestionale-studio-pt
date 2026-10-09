const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const name of ['consenso-cliente','anamnesi-cliente']){const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(req.method()!=='GET')throw Error('Unexpected real write');if(url.hostname!=='form.test')return route.fulfill({body:url.pathname.includes('/rest/')?'[]':''});if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../app',name,'index.html'))});if(url.pathname.endsWith('.png'))return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/assets/neacea-logo.png'))});return route.fulfill({status:404,body:''});});
 await page.goto('https://form.test/');await page.waitForTimeout(100);
 if(name==='consenso-cliente'){await page.check('#clienteMinorenne');assert.equal(await page.locator('#firmaTutore').getAttribute('required'),'');assert.equal(await page.locator('#tutoreNome').getAttribute('required'),'');await page.uncheck('#clienteMinorenne');assert.equal(await page.locator('#firmaTutore').getAttribute('required'),null);}
 else assert.equal(await page.locator('#nutritionTools').isVisible(),false);
 assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }console.log('PASS standalone forms: minors/tutor validation, private Nutrition tools hidden, mobile layout, no JS errors or writes');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
