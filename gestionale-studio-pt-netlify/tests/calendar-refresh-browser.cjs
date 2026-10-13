const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),M=require('../app/calendario-studio/js/pt-session-model');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1440,height:960},timezoneId:'Europe/Rome'}),errors=[],writes=[];let reads=0;await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const clients=[{id:'a',nome:'Cliente',cognome:'Storico',active:true,pt_partner_id:'b',package_types:['PT 1:1','PT 1:2'],pt_assegnato:'pt',sessions_total:8,sessions_remaining:4},{id:'b',nome:'Partner',active:true,pt_partner_id:'a',package_types:['PT 1:2'],pt_assegnato:'pt',sessions_total:8,sessions_remaining:7}];
 const appt=(id,date,status='fatto',extra={})=>({id,date,status,service_id:'pt11',client_ids:['a'],operator_id:'pt',start_time:'09:00',duration_min:60,notes:'[PROGRAMMA-PACCHETTO] seduta 3/8',...extra});
 const pair=M.write(appt('pair','2026-10-10','fatto',{service_id:'pt12',client_ids:['a','b']}),{version:1,participants:{a:{status:'fatto'},b:{status:'noshow'}}});
 const appointments=[appt('one','2026-10-01'),appt('two','2026-10-05'),appt('three','2026-10-09'),pair,appt('future','2026-10-16','prenotato'),M.withStatus(appt('charged','2026-10-19','prenotato'),'noshow_charged')];
 const closed=JSON.parse(JSON.stringify(appointments.filter(a=>a.status!=='prenotato')));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const body=req.postDataJSON();if(body.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});writes.push(body);
   if(body.operation==='save'){const a=body.payload.appointment;assert.equal(a.id,'future');appointments[appointments.findIndex(x=>x.id===a.id)]=a;return route.fulfill({json:{appointment:a,clients}});}
   if(body.operation==='client'){const c=body.payload.rows[0];assert.deepEqual(Object.keys(c).sort(),['active','id','stato_abbonamento']);const full=clients.find(x=>x.id===c.id);Object.assign(full,c);return route.fulfill({json:[full]});}
   return route.fulfill({json:[]});
  }
  if(u.pathname.includes('/rest/v1/')){reads++;assert.equal(req.method(),'GET');const table=u.pathname.split('/').at(-1);return route.fulfill({json:table==='clients'?clients:table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'Esempio',active:true,roles:['PT']},{id:'other',nome:'Altro',cognome:'PT',active:true,roles:['PT']}]:[]});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 await page.goto('https://calendar.test/?view=operators&access=SIM');await page.waitForFunction(()=>State.getAppointments().length===6);

 await page.getByRole('button',{name:'Resoconto giornaliero',exact:true}).click();await page.getByLabel('Sedute del resoconto',{exact:true}).selectOption('all');
 assert.equal(await page.getByRole('table',{name:'Tariffe compensi PT'}).count(),1);assert.match(await page.getByRole('table',{name:'Tariffe compensi PT'}).innerText(),/individuale[\s\S]*10 €\/h[\s\S]*coppia[\s\S]*15 €\/h per coppia/);
 await page.evaluate(()=>{window.testRenderCount=0;const original=Calendar.render;Calendar.render=function(){window.testRenderCount++;return original.apply(this,arguments)};window.testPanel=document.querySelector('.pt-hours-drawer');window.testRow=document.querySelector('[data-report-appointment="one"]');window.testPanel.scrollTop=180;window.testScroll=window.testPanel.scrollTop});
 const priorReads=reads;await page.clock.runFor(60050);await page.waitForFunction(()=>!App._supabaseRefreshInFlight);assert.ok(reads>=priorReads+3,'polling must still fetch remote data');
 assert.equal(await page.evaluate(()=>testRenderCount),0);assert.equal(await page.evaluate(()=>testPanel===document.querySelector('.pt-hours-drawer')&&testRow.isConnected&&testPanel.scrollTop===testScroll),true);
 await page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));await App._supabaseRefreshInFlight});assert.equal(await page.evaluate(()=>testRenderCount),0);
 appointments[0].start_time='10:00';await page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));await App._supabaseRefreshInFlight});assert.equal(await page.evaluate(()=>testRenderCount),1);assert.match(await page.locator('[data-report-appointment="one"]').innerText(),/10:00–11:00/);assert.equal(await page.getByLabel('Sedute del resoconto',{exact:true}).inputValue(),'all');assert.match(await page.locator('.pt-report-totals').innerText(),/Compenso teorico a fine mese: 65,00/);
 await page.getByText('Altre regole di conteggio',{exact:true}).click();assert.ok(await page.getByText('Annullate e assenze non scalate non maturano compenso.',{exact:true}).isVisible());
 await page.getByRole('button',{name:'Chiudi',exact:true}).click();await page.evaluate(()=>Calendar.switchView('day'));await page.evaluate(()=>{testRenderCount=0;window.testDay=document.querySelector('#view-day').firstElementChild});await page.clock.runFor(30050);await page.waitForFunction(()=>!App._supabaseRefreshInFlight);assert.equal(await page.evaluate(()=>testRenderCount),0);assert.equal(await page.evaluate(()=>testDay.isConnected),true);
 await page.evaluate(()=>Calendar.switchView('operators'));await page.getByRole('button',{name:'Riepilogo ore',exact:true}).click();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.equal(writes.length,0);console.log('PASS stable refresh: timer/focus/visibility preserve DOM and scroll, remote change renders once, report filter preserved, ordered rules and mobile, zero data writes');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
