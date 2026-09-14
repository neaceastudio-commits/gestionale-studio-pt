const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
for(const enabled of [true,false]){
 const page=await browser.newPage({timezoneId:'Europe/Rome'}),saves=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{errors.push('Unexpected confirmation');d.dismiss()});
 const client={id:'test',nome:'TEST',cognome:'FLEX',active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,package_start:'2026-09-15',pt_assegnato:'pt'};
 const busy={id:'busy',client_ids:['test'],operator_id:'pt',service_id:'pt11',date:'2026-09-15',start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:''};
 await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('whatsapp-agenda')) return route.fulfill({status:403,json:{error:'direction_only'}});
      if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:enabled}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false,linked:false}});
  if(u.pathname.endsWith('calendar-activity')){const b=r.postDataJSON();if(b.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});assert.equal(b.operation,'save');saves.push(b);return route.fulfill({json:{appointment:b.payload.appointment,clients:[client]}})}
  if(u.pathname.includes('/rest/v1/')){assert.equal(r.method(),'GET');const table=u.pathname.split('/').pop();return route.fulfill({json:table==='clients'?[client]:table==='operators'?[{id:'pt',nome:'PT',cognome:'TEST',roles:['PT'],active:true}]:table==='appointments'?[busy]:table==='operator_availability'?[{operator_id:'pt',day_key:'tue',slots:['09:00-10:00']}]:[]})}
  const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',body:fs.readFileSync(file,'utf8')});
 });
 await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===1&&window.PTAvailabilityOverview);await page.evaluate(()=>App.openNewAppointment('2026-09-15','test','17:00','pt11'));await page.locator('#appt-operator').selectOption('pt');
 if(enabled){assert.equal(await page.locator('#appt-duration option').count(),16);await page.locator('#appt-duration').selectOption('30');await page.locator('#appt-operator').selectOption('pt');assert.ok((await page.locator('#slot-validation').innerText()).includes('salvataggio consentito'));assert.ok((await page.locator('#slot-validation').innerText()).includes('Fuori disponibilità'),await page.locator('#slot-validation').innerText());assert.equal(await page.locator('#operator-overlap-override').isVisible(),false);assert.ok(await page.getByRole('button',{name:'Crea appuntamento',exact:true}).isEnabled());await page.getByRole('button',{name:'Crea appuntamento',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal-overlay.open'));assert.equal(saves.length,1);assert.equal(saves[0].payload.appointment.duration_min,30);assert.ok(!saves[0].payload.appointment.notes.includes('FORZA-PT11'));}
 else{assert.equal(await page.locator('#appt-duration').getAttribute('readonly'),'');assert.ok((await page.locator('#slot-validation').innerText()).includes('occupato'));assert.equal(saves.length,0);}
 assert.deepEqual(errors,[]);await page.close();
}
console.log('PASS browser true/false, duration 15..240, overlap and availability warnings, enabled Save, actual audited save, no confirmation');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
