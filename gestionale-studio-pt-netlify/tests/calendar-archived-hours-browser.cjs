const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),M=require('../app/calendario-studio/js/pt-session-model');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:process.env.CALENDAR_MOBILE==='1'?{width:390,height:844}:{width:1440,height:960},timezoneId:'Europe/Rome'}),errors=[],writes=[];await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const clients=[{id:'a',updated_at:'2026-10-12T12:00:00Z',nome:'Cliente',cognome:'Storico',active:true,pt_partner_id:'b',package_types:['PT 1:1','PT 1:2'],pt_assegnato:'pt',sessions_total:8,sessions_remaining:4},{id:'b',nome:'Partner',active:true,pt_partner_id:'a',package_types:['PT 1:2'],pt_assegnato:'pt',sessions_total:8,sessions_remaining:7}];
 const appt=(id,date,status='fatto',extra={})=>({id,date,status,service_id:'pt11',client_ids:['a'],operator_id:'pt',start_time:'09:00',duration_min:60,notes:'',...extra});
 const pair=M.write(appt('pair','2026-10-10','fatto',{service_id:'pt12',client_ids:['a','b']}),{version:1,participants:{a:{status:'fatto'},b:{status:'noshow'}}});
 const appointments=[appt('one','2026-10-01'),appt('two','2026-10-05'),appt('three','2026-10-09'),pair,appt('future','2026-10-16','prenotato'),M.withStatus(appt('charged','2026-10-19','prenotato'),'noshow_charged')];
 const closed=JSON.parse(JSON.stringify(appointments.filter(a=>a.status!=='prenotato')));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
  if(u.pathname.endsWith('calendar-activity')){const body=req.postDataJSON();if(body.operation==='session')return route.fulfill({json:{actor:{id:'staff_1',role:'owner'}}});writes.push(body);
   if(body.operation==='client_lifecycle'){
    const {clientId,action,status,expectedAppointments}=body.payload;assert.equal(clientId,'a');
    const changed=[];if(action==='archive'){assert.deepEqual(expectedAppointments.map(a=>a.id),['future']);for(const a of expectedAppointments){const full=appointments.find(x=>x.id===a.id);full.status='annullato';changed.push(full);}}
    const full=clients.find(x=>x.id===clientId);Object.assign(full,{active:action==='reactivate',stato_abbonamento:action==='reactivate'?'Attivo':status});
    return route.fulfill({json:{client:full,appointments:changed}});
   }
   return route.fulfill({json:[]});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').at(-1);return route.fulfill({json:table==='clients'?clients.filter(c=>!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+c.id):table==='appointments'?appointments:table==='operators'?[{id:'pt',nome:'Trainer',cognome:'Esempio',active:true,roles:['PT']}]:[]});}
  if(process.env.CALENDAR_ASSET_ORIGIN){const response=await fetch(process.env.CALENDAR_ASSET_ORIGIN+u.pathname+u.search);assert.equal(response.status,200);return route.fulfill({contentType:response.headers.get('content-type'),body:Buffer.from(await response.arrayBuffer())});}
  const f=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));return route.fulfill({contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(f)});
 });
 const open=async()=>{await page.evaluate(()=>Calendar.switchView('operators'));await page.getByRole('button',{name:'Riepilogo ore',exact:true}).click();await page.locator('.pt-hours-card').waitFor({state:'visible'});};
 const stats=()=>page.evaluate(()=>PTSessionModel.summary(State.getAppointments(),'2026-10').totals.find(t=>t.operator==='pt'));
 await page.goto('https://calendar.test/?view=operators&access=SIM');await page.waitForFunction(()=>State.getAppointments().length===6);await open();const before=await stats();assert.equal(before.earnedMin,300);assert.equal(before.cents,5500);
 await page.evaluate(()=>{PTAvailabilityOverview.closeHoursSummary();App.openPackageOverview('a')});await page.getByRole('button',{name:'Sospendi pacchetto',exact:true}).click();assert.equal(clients[0].active,false);assert.equal(clients[0].stato_abbonamento,'Ibernato');for(const original of closed)assert.deepEqual(appointments.find(a=>a.id===original.id),original);assert.equal(appointments.find(a=>a.id==='future').status,'annullato');
 await page.reload();await page.waitForFunction(()=>State.getClients()[0].active===false);await open();const after=await stats();assert.equal(after.earnedMin,before.earnedMin);assert.equal(after.workedMin,before.workedMin);assert.equal(after.cents,before.cents);assert.equal(after.plannedMin,0);assert.match(await page.locator('.pt-hours-card').innerText(),/incluse 4 h.*clienti archiviati o sospesi/);
 await page.screenshot({path:'/tmp/neacea-archived-hours-proof.png',fullPage:false});
 await page.evaluate(()=>PTAvailabilityOverview.closeHoursSummary());await page.evaluate(()=>Calendar.switchView('day','2026-10-09'));assert.match(await page.locator('#view-day').innerText(),/Cliente Storico/);
 await page.evaluate(()=>App.openDetail('pair'));assert.match(await page.locator('.modal-body').innerText(),/Cliente Storico/);assert.match(await page.locator('.modal-body').innerText(),/Partner/);
 await page.evaluate(()=>Clients.reactivate('a'));assert.equal(clients[0].active,true);assert.equal(clients[0].sessions_total,8);assert.equal(clients[0].sessions_remaining,4);assert.equal(appointments.find(a=>a.id==='future').status,'annullato');assert.equal((await stats()).earnedMin,before.earnedMin);await page.getByRole('button',{name:'Sospendi pacchetto',exact:true}).waitFor({state:'visible'});assert.deepEqual(errors,[]);assert.equal(writes.filter(x=>x.operation==='client_lifecycle').length,2);assert.ok(!writes.some(x=>['save','cancel_and_recover','client'].includes(x.operation)));console.log('PASS archive browser: closed work and absences preserved, hours/fees stable after reload, history visible, full pair identity, only future booking cancelled. Assets: '+(process.env.CALENDAR_ASSET_ORIGIN||'local candidate'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
