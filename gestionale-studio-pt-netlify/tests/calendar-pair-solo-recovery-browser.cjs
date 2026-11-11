const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright'),M=require('../app/calendario-studio/js/pt-session-model'),{open}=require('./helpers/calendar-recovery-db.cjs');
(async()=>{const f=await open(true);let browser;try{
 await f.db.exec(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261111100621_calendar_pair_solo_recovery.sql'),'utf8'));
 const source=await f.seed(true),d=M.read(source);for(const p of Object.values(d.participants))p.status='fatto';
 await f.write(M.write({...source,id:'done-10',date:'2099-10-25',status:'fatto'},d));
 for(const a of (await f.all('appointments')).filter(a=>a.status==='prenotato'))await f.write({...a,status:'annullato'},a);
 await f.patch({id:'b',active:false,stato_abbonamento:'Ibernato'});
 const beforeClients=await f.all('clients'),beforeRows=await f.all('appointments'),requests=[];let loseResponse=true;
 const authPath=require.resolve('../netlify/functions/lib/calendar-audit-auth');
 require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:null,db:async(table,options={})=>{
  const b=options.body;
  if(table==='rpc/calendar_plan_pair_solo')return f.rpc('calendar_plan_pair_solo',[b.p_actor_id,b.p_request_id,JSON.stringify(b.p_payload)]);
  if(table==='rpc/calendar_audit_write')return f.rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
  if(['clients','appointments','calendar_expected_renewals'].includes(table))return f.all(table);
  throw Error('Unexpected database route '+table);
 }}};
 const handler=require('../netlify/functions/lib/calendar-audit-endpoint').createHandler('calendar');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
  if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
  if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
  if(u.pathname.endsWith('whatsapp-agenda')||u.pathname.endsWith('calendar-client-finance'))return route.fulfill({status:403,json:{error:'Servizio esterno escluso dal collaudo'}});
  if(u.pathname.endsWith('calendar-activity')){
   const input=req.postDataJSON();if(input.operation==='plan_pair_solo')requests.push(input);
   const r=await handler({httpMethod:'POST',body:req.postData()});
   if(loseResponse&&input.operation==='plan_pair_solo'&&r.statusCode===200){loseResponse=false;return route.fulfill({status:503,json:{error:'TEST risposta persa dopo il salvataggio'}});}
   return route.fulfill({status:r.statusCode,contentType:'application/json',body:r.body});
  }
  if(u.pathname.includes('/rest/v1/')){assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();let rows=table==='operator_availability'?(await f.q('select to_jsonb(t) r from operator_availability t order by operator_id,day_key')).rows.map(x=>x.r):['clients','appointments','operators'].includes(table)?await f.all(table):[];const id=u.searchParams.get('id');if(id?.startsWith('eq.'))rows=rows.filter(r=>r.id===id.slice(3));return route.fulfill({json:rows});}
  assert.equal(u.hostname,'calendar.test');const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));let body=fs.readFileSync(file);
  if(process.env.CALENDAR_ASSET_ORIGIN){const r=await fetch(process.env.CALENDAR_ASSET_ORIGIN+u.pathname+u.search,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);body=Buffer.from(await r.arrayBuffer());}
  return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body});
 });
 await page.goto('https://calendar.test/?access=OWNER');await page.waitForFunction(()=>State.getClients().length===2&&State.getAppointments().length===12);
 await page.evaluate(()=>App.openPackageOverview('a'));await page.getByRole('button',{name:'Genera mancanti',exact:true}).click();
 await page.getByRole('button',{name:'Recupera da solo',exact:true}).click();assert.equal(await page.inputValue('#pair-sessions'),'2');assert.equal(await page.locator('#pair-partner').count(),0);
 assert.match(await page.locator('.modal-body').innerText(),/10,00/);
 await page.getByRole('button',{name:'Verifica e mostra anteprima',exact:true}).click();await page.locator('#pair-plan-error').filter({hasText:'Completa data'}).waitFor({state:'visible'});
 assert.equal((await f.all('appointments')).length,12);
 await page.fill('#pair-start','2099-11-10');await page.check(`.pair-day[value="${new Date('2099-11-10T12:00:00').getDay()}"]`);
 await page.getByRole('button',{name:'Verifica e mostra anteprima',exact:true}).click();await page.locator('#pair-confirm').waitFor();assert.match(await page.locator('.modal-body').innerText(),/pacchetto corrente PT 1:2/);
 await page.locator('#pair-confirm').click();await page.locator('#pair-plan-error').filter({hasText:'risposta persa'}).waitFor({state:'visible'});assert.equal((await f.all('appointments')).length,14);
 await page.locator('#pair-confirm').click();await page.waitForFunction(()=>!document.getElementById('modal-overlay').classList.contains('open'));
 assert.equal(requests.length,2);assert.equal(requests[0].payload.requestId,requests[1].payload.requestId);assert.deepEqual(await f.all('clients'),beforeClients);
 await page.reload();await page.waitForFunction(()=>State.getAppointments().length===14);
 const solo=(await f.all('appointments')).filter(a=>a.notes.startsWith('Recupero individuale'));assert.equal(solo.length,2);assert.ok(solo.every(a=>a.service_id==='pt11'&&JSON.stringify(a.client_ids)==='["a"]'));
 for(const a of solo)await page.evaluate(id=>App._markDone(id),a.id);
 const clients=await f.all('clients');assert.equal(clients.find(c=>c.id==='a').sessions_remaining,0);assert.deepEqual(clients.find(c=>c.id==='b'),beforeClients.find(c=>c.id==='b'));
 const after=await f.all('appointments');for(const old of beforeRows)assert.deepEqual(after.find(a=>a.id===old.id),old);
 const summary=await page.evaluate(()=>PTSessionModel.summary(State.getAppointments(),'2099-11').totals);assert.equal(summary[0].earnedMin,120);assert.equal(summary[0].cents,2000);
 await page.evaluate(()=>App.openPackageOverview('a'));await page.screenshot({path:'/tmp/neacea-pair-solo-recovery-proof.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS solo pair recovery browser: suspended partner excluded, two individual lessons in the same package, persistent error, lost response retry, database reopen, attendance and individual fees, prior hours unchanged. Assets: '+(process.env.CALENDAR_ASSET_ORIGIN||'local candidate'));
}finally{await browser?.close();await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
