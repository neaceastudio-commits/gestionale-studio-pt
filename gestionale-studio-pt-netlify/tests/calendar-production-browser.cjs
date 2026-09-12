const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
process.env.PT_ACCESS_SECRET='SIM_SIGNING';process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_SERVER';
const {handler}=require('../netlify/functions/studio-calendar-activity');
const token=role=>{const p=Buffer.from(JSON.stringify({operatorId:role,email:role+'@example.test',accessLevel:role==='owner'?'owner':'pt',exp:Date.now()+600000})).toString('base64url');return p+'.'+crypto.createHmac('sha256','SIM_SIGNING').update(p).digest('base64url')};
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})}),originalFetch=global.fetch;try{
 for(const dir of ['cruscotto-pt','portale-pt-fase1'])for(const role of ['owner','pt','none']){
  const ctx=await browser.newContext(),page=await ctx.newPage(),writes=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  global.fetch=async(url,options)=>{if(url.includes('operator_effective_roles'))return{ok:true,text:async()=>JSON.stringify([{operator_id:role,email:role+'@example.test',active:true,legacy_roles:[role==='owner'?'Direzione':'PT'],system_roles:[]}])};const body=JSON.parse(options.body);assert.equal(body.p_actor_id,role);assert.equal(body.p_source,'calendar');writes.push(body);return{ok:true,text:async()=>JSON.stringify(body.p_payload.rows||[])};};
  await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url()); if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)) return route.fulfill({contentType:'text/css',body:''});
   if(u.pathname.endsWith('/studio-calendar-activity')){const result=await handler({httpMethod:r.method(),body:r.postData()});return route.fulfill({status:result.statusCode,contentType:'application/json',body:result.body})}
   if(u.pathname.includes('/rest/v1/')){assert.equal(r.method(),'GET','no public REST mutations');return route.fulfill({json:[]})}
   assert.equal(r.method(),'GET');const file=path.join(__dirname,'../app',dir,u.pathname==='/'?'index.html':u.pathname.slice(1));assert.ok(fs.existsSync(file),file);return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':'text/html',body:fs.readFileSync(file,'utf8')});
  });
  await page.goto('https://studio-simulation.test/'+(role==='none'?'':'?access='+encodeURIComponent(token(role))));
  await page.waitForFunction(()=>document.querySelector('#studio-audit-status')?.textContent);
  if(role==='owner'){
   await page.getByText('Direzione verificata · salvataggi abilitati').waitFor();
   await page.evaluate(async()=>{document.querySelector('#modalContent').innerHTML='<input id="edit-pay-status" value="Pagato"><input id="edit-pay-amount" value="90"><input id="edit-client-pt" value="pt"><input id="edit-sub-status" value="Attivo"><input id="pay-status" value="Pagato"><input id="pay-amount" value="90">';await saveClientAdmin('SIM');document.querySelector('#modalContent').innerHTML='<input id="pay-status" value="Pagato"><input id="pay-amount" value="90">';await savePayment('SIM');document.querySelector('#modalContent').innerHTML='<input id="pay-amount" value="90">';await quickPay('SIM','Pagato')});
   assert.equal(writes.length,3);for(const w of writes){assert.equal(w.p_operation,'client');assert.equal(w.p_actor_role,'owner');assert.equal(w.p_payload.rows[0].id,'SIM')}
  }else{
   const result=await page.evaluate(async()=>{try{await supabaseWrite('clients','?id=eq.SIM',{active:false});return 'BAD'}catch(e){return e.message}});assert.notEqual(result,'BAD');assert.equal(writes.length,0);
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
 console.log('PASS Studio browser: both production roots; admin/payment/quickPay through actual authenticated handler; PT/unsigned writes denied; no public REST writes');
}finally{global.fetch=originalFetch;await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
