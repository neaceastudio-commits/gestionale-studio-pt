const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),M=require('../app/calendario-studio/js/pt-session-model');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1440,height:960},timezoneId:'Europe/Rome'}),errors=[],writes=[];await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const clients=[{id:'a',nome:'Cliente',cognome:'Esaurito',active:true,package_types:['PT 1:1'],pt_assegnato:'pt',sessions_total:8,sessions_remaining:0,notes:'[CICLO-PACCHETTO 2026-09-15]'}];
 const appt=(id,date,status='fatto')=>({id,date,status,service_id:'pt11',client_ids:['a'],operator_id:'pt',start_time:'09:00',duration_min:60,notes:'[CICLO-PACCHETTO 2026-09-15]'});
 const appointments=[...Array.from({length:8},(_,i)=>appt('done'+i,'2026-09-'+String(16+i).padStart(2,'0'))),appt('old','2026-05-05','prenotato')];
 const p={id:'11111111-1111-4111-8111-111111111111',version:2,state:'confirmed',client_ids:['a'],names:['Cliente Esaurito'],booked:0,performed:0,plan:{serviceId:'pt11',startDate:'2026-10-15',issue:'',slots:[{day:2,time:'09:00',operatorId:'pt',duration:60}],clients:[{id:'a',sessions:8,amount:200}]}};
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const body=req.postDataJSON();if(body.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});if(body.operation==='expected_renewals'){if(body.payload.action==='list')return route.fulfill({json:{proposals:p.state==='activated'?[]:[p]}});writes.push(body);assert.equal(body.payload.action,'confirm');p.state='activated';return route.fulfill({json:p});}writes.push(body);
   if(body.operation==='save'){const a=body.payload.appointment;assert.equal(a.id,'old');assert.equal(body.payload.expected.status,appointments.find(x=>x.id==='old').status);appointments[appointments.findIndex(x=>x.id===a.id)]=a;return route.fulfill({json:{appointment:a,clients}});}
   if(body.operation==='client'){const c=body.payload.rows[0];assert.deepEqual(Object.keys(c).sort(),['active','id','stato_abbonamento']);const full=clients.find(x=>x.id===c.id);Object.assign(full,c);return route.fulfill({json:[full]});}
   return route.fulfill({json:[]});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').at(-1);return route.fulfill({json:table==='clients'?clients:table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'Esempio',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?view=operators&access=SIM');await page.waitForFunction(()=>State.getAppointments().length===9);
 await page.evaluate(()=>ExpectedRenewals.open(false,'a'));await page.locator('[data-action="confirm"]').waitFor({state:'visible'});assert.match(await page.locator('#expected-renewals-body').innerText(),/2026-05-05.*Prenotato/);assert.match(await page.locator('#expected-renewals-body').innerText(),/prenotazioni.*assenti/);
 await page.evaluate(()=>App.openPackageOverview('a'));await page.locator('#pkg-date-old').fill('2026-10-15');await page.locator('#pkg-time-old').fill('15:00');await page.evaluate(()=>App._updatePackageAppointmentRow('old'));
 assert.equal(appointments.at(-1).date,'2026-10-15');assert.equal(appointments.at(-1).start_time,'15:00');assert.equal(appointments.at(-1).status,'prenotato');assert.equal(clients[0].sessions_remaining,0);
 await page.locator('#pkg-status-old').selectOption('annullato');await page.evaluate(()=>App._updatePackageAppointmentRow('old'));assert.equal(appointments.at(-1).status,'annullato');assert.equal(clients[0].sessions_remaining,0);
 await page.evaluate(()=>ExpectedRenewals.open(false,'a'));await page.getByRole('button',{name:'Riprova attivazione',exact:true}).click();await page.waitForFunction(()=>document.getElementById('expected-renewals-body').textContent.includes('Nessun rinnovo in attesa'));
 assert.deepEqual(writes.map(w=>w.operation),['save','save','expected_renewals']);assert.deepEqual(errors,[]);console.log('PASS exhausted edit browser: existing reservation moved and cancelled at zero balance, confirmed proposal shows past blocker and missing reservations, retry activation available');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
