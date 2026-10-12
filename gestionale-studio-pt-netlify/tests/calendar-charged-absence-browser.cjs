const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),M=require('../app/calendario-studio/js/pt-session-model');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome'}),errors=[];let fail=false,writes=0;
 await page.clock.install({time:new Date('2026-10-12T08:00:00Z')});page.on('pageerror',e=>errors.push(e.message));
 const clients=[{id:'a',nome:'Cliente',cognome:'Esempio',active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,pt_assegnato:'pt',package_start:'2026-10-12',data_conferma:'2026-10-12',giorni_settimana:['Lunedì','Giovedì'],package_frequency:'2x settimana'}];
 const appointments=Array.from({length:8},(_,i)=>({id:'row'+i,service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2026-10-'+(12+i),start_time:'09:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO 2026-10-12]'}));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const b=req.postDataJSON();if(b.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});
   if(b.operation==='expected_renewals')return route.fulfill({json:{proposals:[]}});
   if(b.operation==='save'){writes++;if(fail)return route.fulfill({status:409,json:{error:'TEST: salvataggio non confermato'}});const next=b.payload.appointment;assert.equal(next.status==='noshow_charged',false);appointments[appointments.findIndex(a=>a.id===next.id)]=next;clients[0].sessions_remaining=8-appointments.filter(a=>a.status==='fatto'||M.chargedAbsence(a,'a')).length;return route.fulfill({json:{appointment:next,clients}});}
   return route.fulfill({json:[]});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const t=u.pathname.split('/').at(-1),cursor=u.searchParams.get('id')?.slice(3);let data=t==='clients'?clients:t==='appointments'?appointments:t==='operators'?[{id:'pt',nome:'Trainer',active:true,roles:['PT']}]:[];if(cursor)data=data.filter(r=>r.id>cursor);return route.fulfill({json:data});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html'});
 });
 await page.goto('https://calendar.test/?view=day&date=2026-10-12&access=SIM');await page.waitForFunction(()=>State.getAppointments().length===8);
 await page.evaluate(()=>App.openDetail('row0'));await page.getByRole('button',{name:'Non svolta · seduta scalata',exact:true}).waitFor({state:'visible'});assert.equal(await page.getByRole('button',{name:'No-show',exact:true}).count(),0);await page.getByRole('button',{name:'Annullata · da recuperare',exact:true}).waitFor({state:'visible'});
 await page.screenshot({path:'/tmp/neacea-charged-absence-preview.png',fullPage:true});
 await page.getByRole('button',{name:'Non svolta · seduta scalata',exact:true}).click();await page.waitForFunction(()=>State.getClients()[0].sessionsRemaining===7);
 const metrics=()=>page.evaluate(()=>{const m=Services.getClientSessionMetrics(State.getClients()[0]);return {remaining:m.remaining,completed:m.completed,charged:m.chargedAbsences,toSchedule:m.toSchedule}});
 assert.deepEqual(await metrics(),{remaining:7,completed:0,charged:1,toSchedule:0});assert.equal(appointments[0].status,'noshow');
 await page.evaluate(()=>App.openDetail('row0'));await page.getByRole('button',{name:'Non svolta · seduta scalata',exact:true}).click();assert.deepEqual(await metrics(),{remaining:7,completed:0,charged:1,toSchedule:0});
 await page.reload();await page.waitForFunction(()=>State.getClients()[0].sessionsRemaining===7);await page.evaluate(()=>App.openPackageOverview('a'));await page.selectOption('#pkg-status-row0','annullato');await page.locator('tr').filter({has:page.locator('#pkg-status-row0')}).getByRole('button',{name:'Salva seduta',exact:true}).click();await page.waitForFunction(()=>State.getClients()[0].sessionsRemaining===8);assert.deepEqual(await metrics(),{remaining:8,completed:0,charged:0,toSchedule:1});
 await page.evaluate(()=>{UI.closeModal();App._renderAppointmentModal('row0')});await page.selectOption('#appt-status','noshow_charged');fail=true;await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('TEST: salvataggio non confermato'));assert.equal(appointments[0].status,'annullato');assert.deepEqual(await metrics(),{remaining:8,completed:0,charged:0,toSchedule:1});
 fail=false;await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();await page.waitForFunction(()=>State.getClients()[0].sessionsRemaining===7);assert.deepEqual(await metrics(),{remaining:7,completed:0,charged:1,toSchedule:0});
 await page.evaluate(()=>App._renderAppointmentModal('row0'));assert.equal(await page.inputValue('#appt-status'),'noshow_charged');assert.equal((await page.inputValue('#appt-notes')).includes('[ASSENZA-SCALATA]'),false);await page.getByRole('button',{name:'Salva modifiche',exact:true}).click();await page.locator('#modal-overlay').waitFor({state:'hidden'});assert.deepEqual(await metrics(),{remaining:7,completed:0,charged:1,toSchedule:0});
 assert.deepEqual(errors,[]);assert.ok(writes>=5);console.log('PASS browser: due voci chiare, assenza scalata, nessun recupero o presenza fittizia, doppio salvataggio, ricarica, annullamento, errore/retry e modifica con flag preservato');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
