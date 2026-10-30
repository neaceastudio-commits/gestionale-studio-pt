const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];
 let fail=false,failList=false,hasProposal=true;const p={id:'11111111-1111-4111-8111-111111111111',version:2,state:'pending',client_ids:['a'],names:['Cliente prova'],booked:8,performed:0,plan:{serviceId:'pt11',startDate:'2026-10-19',issue:'',slots:[{day:1,time:'09:00',operatorId:'pt',duration:60},{day:3,time:'09:00',operatorId:'pt',duration:60}],clients:[{id:'a',sessions:8,amount:160}]}};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-client-finance'))return route.fulfill({status:503,json:{error:'Scadenze non disponibile nella simulazione'}});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('calendar-activity')){const d=req.postDataJSON();if(d.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});assert.equal(d.operation,'expected_renewals');
   if(d.payload.action==='list')return route.fulfill(failList?{status:503,json:{error:'Lettura rinnovi indisponibile'}}:{json:{proposals:hasProposal?[p]:[]}});
   writes.push(d.payload);if(fail)return route.fulfill({status:409,json:{error:'Proposta cambiata: ricarica'}});
   if(d.payload.action==='edit')Object.assign(p.plan,{slots:d.payload.slots,clients:d.payload.clients,startDate:d.payload.startDate,issue:''});
   if(d.payload.action==='confirm')p.state='confirmed';
   return route.fulfill({json:p});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const t=u.pathname.split('/').pop();return route.fulfill({json:t==='clients'?[{id:'a',nome:'Cliente',cognome:'Prova',active:true,pt_assegnato:'pt',sessions_total:8,sessions_remaining:2,package_types:['PT 1:1']}]:t==='operators'?[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===1&&window.ExpectedRenewals);await page.waitForTimeout(700);
 await page.evaluate(()=>{
  const c=State.getClients()[0];c.packageCycleStart='2026-07-23';c.sessionsRemaining=0;State.saveClients([c]);
  State.saveAppointments([
   ...Array.from({length:8},(_,i)=>({id:'old'+i,clientIds:['a'],serviceId:'pt11',date:'2026-08-'+String(i+1).padStart(2,'0'),startTime:'09:00',durationMin:60,operatorId:'pt',status:'fatto',notes:'[CICLO-PACCHETTO 2026-07-23]'})),
   ...Array.from({length:8},(_,i)=>({id:'expected'+i,clientIds:['a'],serviceId:'pt11',date:'2099-10-'+String(i+10),startTime:'09:00',durationMin:60,operatorId:'pt',status:'prenotato',notes:'[RINNOVO-PREVISTO pending]'}))
  ]);App.openPackageOverview('a');
 });
 assert.equal(await page.locator('td').filter({hasText:/^Rinnovo da confermare$/}).count(),8);
 assert.equal(await page.locator('#pkg-renew-count').count(),0);
 await page.waitForFunction(()=>document.getElementById('pkg-expected-renewal').textContent.includes('8 lezioni'));assert.match(await page.locator('#pkg-expected-renewal').innerText(),/8 lezioni/);
 await page.locator('#pkg-expected-renewal button').click();await page.waitForSelector('[data-action=edit]');
 assert.match(await page.locator('#expected-renewals-body').innerText(),/non registra un incasso/);
 await page.click('[data-action=edit]');await page.check('[data-day="5"] [name=enabled]');assert.equal(await page.inputValue('[data-day="5"] [name=operatorId]'),'pt');await page.fill('[name=sessions0]','12');await page.fill('[name=amount0]','220');
 fail=true;await page.getByRole('button',{name:'Salva proposta',exact:true}).click();await page.waitForFunction(()=>document.getElementById('expected-status').textContent.includes('cambiata'));assert.equal(await page.inputValue('[name=sessions0]'),'12');
 fail=false;await page.getByRole('button',{name:'Salva proposta',exact:true}).click();await page.waitForSelector('[data-action=confirm]');assert.equal(p.plan.slots.length,3);assert.equal(p.plan.clients[0].sessions,12);
 await page.click('[data-action=confirm]');await page.waitForFunction(()=>document.getElementById('expected-renewals-body').textContent.includes('Confermato · attesa'));
 assert.deepEqual(writes.map(w=>w.action),['edit','edit','confirm']);assert.ok(!writes.some(w=>w.paidNow||w.payment));
 assert.equal(await page.locator('#expected-renewals-body').evaluate(e=>e.scrollWidth>e.clientWidth+2),false);
 // Reproduce the exhausted package with an incomplete proposal and zero bookings.
 p.state='pending';p.booked=0;p.plan.issue='Completa giorni, orari e PT della proposta.';p.plan.slots[0].time='';
 await page.evaluate(()=>{State.saveAppointments(State.getAppointments().filter(a=>!a.id.startsWith('expected')));App.openPackageOverview('a');});
 await page.waitForFunction(()=>document.getElementById('pkg-expected-renewal').textContent.includes('Rinnovo da completare'));
 assert.equal(await page.locator('#pkg-manual-renewal').isVisible(),false);
 assert.equal(writes.length,3,'reading the incomplete renewal must not create or confirm anything');
 await page.getByRole('button',{name:'Completa rinnovo',exact:true}).click();
 await page.waitForSelector('#expected-edit');
 assert.equal(await page.inputValue('[data-day="1"] [name=time]'),'','missing time must never default to 09:00');
 await page.getByRole('button',{name:'Salva proposta',exact:true}).click();
 assert.equal(writes.length,3,'the missing time requires an explicit choice');
 await page.fill('[data-day="1"] [name=time]','12:00');
 await page.getByRole('button',{name:'Salva proposta',exact:true}).click();
 await page.waitForSelector('[data-action=confirm]');
 assert.equal(writes.length,4);assert.equal(writes[3].id,p.id);assert.equal(writes[3].action,'edit');
 assert.equal(await page.locator('[data-action=confirm]').isEnabled(),true);
 await page.click('[data-action=confirm]');await page.waitForFunction(()=>document.getElementById('expected-renewals-body').textContent.includes('Confermato · attesa'));
 assert.equal(writes[4].id,p.id);assert.equal(writes[4].action,'confirm');
 // A failed lookup must not expose the duplicate-renewal form. Retry recovers it
 // only after the server confirms that there is no proposal.
 failList=true;
 await page.evaluate(()=>App.openPackageOverview('a'));
 await page.getByRole('button',{name:'Riprova verifica rinnovo',exact:true}).waitFor();
 await page.evaluate(()=>App._setPackageWorkspace('finance'));
 assert.equal(await page.locator('#pkg-manual-renewal').isVisible(),false);
 failList=false;hasProposal=false;
 await page.getByRole('button',{name:'Riprova verifica rinnovo',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('pkg-expected-renewal').hidden);
 assert.equal(await page.locator('#pkg-manual-renewal').isVisible(),true);
 assert.equal(writes.length,5,'lookups and retry remain read-only');
 await page.screenshot({path:'/tmp/neacea-expected-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS rinnovi mobile: modifica, errori recuperabili, proposta senza sedute, orari espliciti, conferma senza duplicati o incassi');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
