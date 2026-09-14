const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {createHandler}=require('../netlify/functions/whatsapp-agenda');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 for(const role of ['owner','pt']){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),calls=[],errors=[];let fail=true;page.on('pageerror',e=>errors.push(e.message));
  const settings={migrationReady:true,operators:[{id:'pt',name:'PT SIMULATO',active:true,whatsapp_phone:'',whatsapp_agenda_enabled:false}]};
  const h=createHandler({authenticate:async()=>({id:'verified',role}),service:{settings:async()=>settings,configure:async(actor,input)=>{assert.equal(actor.id,'verified');if(fail){fail=false;throw Error('invalid_phone')}settings.operators[0].whatsapp_phone=input.whatsapp_phone;return{success:true}},run:async({dryRun})=>{assert.equal(dryRun,true);return{day:'2026-09-14',sendingEnabled:false,providerReady:false,agendas:[{operatorName:'PT SIMULATO',enabled:false,count:1,text:'NEACEA · Agenda di oggi\n\n17:00 · CLIENTE TEST · PT 1:1 · 0/8\n\nTotale: 1 sedute',issues:[]}]}}}});
  await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.pathname.endsWith('whatsapp-agenda')){calls.push(r.postDataJSON());const result=await h({httpMethod:r.method(),body:r.postData()});return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body});}
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<div id="view-operators"><div class="view-header"></div></div><div id="modal"></div><script>const UI={openModal:html=>document.querySelector("#modal").innerHTML=html,closeModal:()=>document.querySelector("#modal").innerHTML=""};</script><script src="/whatsapp-agenda.js"></script>'});
   assert.equal(u.pathname,'/whatsapp-agenda.js');return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js/whatsapp-agenda.js'),'utf8')});});
  await page.goto('https://test.local/?access=SIM');await page.waitForLoadState('networkidle');
  if(role==='owner'){
   await page.locator('#whatsapp-agenda-open').click();await page.getByLabel('WhatsApp PT SIMULATO').fill('+393331234567');await page.getByLabel('Abilita agenda PT SIMULATO').check();await page.getByRole('button',{name:'Salva impostazioni'}).click();await page.getByText(/Inserisci un numero WhatsApp/).waitFor();assert.ok(await page.getByRole('button',{name:'Salva impostazioni'}).isEnabled());await page.getByRole('button',{name:'Salva impostazioni'}).click();await page.getByText('Impostazioni salvate').waitFor();await page.locator('#whatsapp-agenda-preview').click();await page.getByText(/nessun messaggio inviato/).waitFor();assert.match(await page.locator('#whatsapp-agenda-results pre').innerText(),/0\/8/);assert.ok(calls.every(c=>c.dryRun===true));assert.equal(calls.filter(c=>c.action==='configure').length,2);
  }else{assert.equal(await page.locator('#whatsapp-agenda-open').count(),0);await page.evaluate(()=>WhatsAppAgenda.open());assert.equal(await page.locator('#whatsapp-agenda-panel').count(),0);assert.equal(calls.length,1);}
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS browser: owner-only Staff entry, E.164 fields, failed save stays visible/retry, preview 0/8, no send request, PT denied');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
