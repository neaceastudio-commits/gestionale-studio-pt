// Real UI, gateway and SQL; only authentication and the HTTP/DB transport are local adapters.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(require.resolve('playwright',{paths:[path.join(__dirname,'../tools/coaching-editor')]}));
const {PGlite}=require(require.resolve('@electric-sql/pglite',{paths:[path.join(__dirname,'../tools/coaching-editor')]}));
const model=require('../app/calendario-studio/js/pt-session-model');
const renewal=require('../netlify/functions/lib/expected-renewals');
const releaseOrigin=process.env.CALENDAR_RELEASE_ORIGIN||'';
if(releaseOrigin&&!/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(releaseOrigin))throw Error('Unexpected release origin');
(async()=>{
 const db=new PGlite();let browser;
 try{
  const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');
  await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
  await db.exec(`alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
   alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);
   alter table clients alter column package_types type jsonb using to_jsonb(package_types);
   insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']),('sub-a','Sostituto A','sub-a@example.test',array['PT']),('sub-b','Sostituto B','sub-b@example.test',array['PT']);
   create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;
   grant select on operator_effective_roles to service_role;
   insert into clients(id,nome,cognome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,data_conferma) values
    ('a','TEST','Prima','["PT 1:2"]',8,1,'pt','2026-10-01','2026-10-01'),('b','TEST','Seconda','["PT 1:2"]',8,1,'pt','2026-10-01','2026-10-01');`);
  const links=Object.fromEntries(['a','b'].map(id=>[id,{cycleId:'old-'+id,start:'2026-10-01',status:'fatto'}]));
  for(const id of ['a','b']){
   const ledger={version:1,cycles:[{id:'old-'+id,startDate:'2026-10-01',legacy:false,sessionsTotal:8,amount:160,payments:[]}]};
   await db.query('update clients set notes=$2 where id=$1',[id,'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify(ledger)+'[/NEACEA-PACKAGE-LEDGER-V1]']);
  }
  for(let i=0;i<7;i++)await db.query('insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,buffer_min,status,notes) values($1,$2,$3,$4,$5,$6,60,10,$7,$8)',
   ['old'+i,'pt12',JSON.stringify(['a','b']),i===0?'sub-a':i===5?'sub-b':'pt','2026-10-'+String(i+1).padStart(2,'0'),'17:00','fatto',model.write({notes:''},{version:1,participants:links}).notes]);
  for(const f of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql','20261009091426_calendar_pair_payments_review.sql','20261009095441_calendar_expected_renewals.sql','20261012063548_calendar_charged_absence.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',f),'utf8'));
  await db.exec('update calendar_runtime_flags set enabled=true');
  // Serialize role switching because the browser may issue parallel reads.
  let queue=Promise.resolve();
  const q=(sql,args=[])=>{const task=queue.then(async()=>{await db.exec('set role service_role');try{return await db.query(sql,args)}finally{await db.exec('reset role')}});queue=task.catch(()=>{});return task;};
  const all=async table=>(await q(`select to_jsonb(t) r from ${table} t order by ${table==='operator_availability'?'operator_id,day_key':'id'}`)).rows.map(r=>r.r);
  const rpc=async(name,args)=>(await q(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const first=(await all('clients'))[0];
  await rpc('calendar_save_pair_client',['owner',crypto.randomUUID(),JSON.stringify({client:{...first,pt_partner_id:'b'},expectedUpdatedAt:first.updated_at})]);
  const recoveryDate=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const nextDate=new Date(Date.now()+21*86400000).toISOString().slice(0,10),day=new Date(nextDate+'T12:00:00Z').getUTCDay();
  const cancelled=(await rpc('calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:{id:'cancelled',service_id:'pt12',client_ids:['a','b'],operator_id:'pt',date:recoveryDate,start_time:'17:00',duration_min:60,buffer_min:10,status:'annullato',notes:'Seduta annullata da recuperare'}})])).appointment;
  const proposal={id:crypto.randomUUID(),plan:{serviceId:'pt12',startDate:nextDate,slots:[{day,time:'17:00',operatorId:'sub-a',duration:60}],clients:['a','b'].map(id=>({id,source:{cycleId:'old-'+id,start:'2026-10-01'},cycleId:'next-'+id,sessions:8,amount:160})),issue:''}};
  await rpc('calendar_expected_renewal',['owner','create',JSON.stringify({...proposal,appointments:renewal.appointmentsFor(proposal),clients:(await all('clients')).map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))})]);
  const initialClients=await all('clients'),initialProposal=await all('calendar_expected_renewals');
  const future=async()=>(await all('appointments')).filter(a=>a.notes.includes('[RINNOVO-PREVISTO '));
  const initialFuture=await future();assert.equal(initialFuture.length,8);
  const authPath=require.resolve('../netlify/functions/lib/calendar-audit-auth');
  require.cache[authPath]={id:authPath,filename:authPath,loaded:true,exports:{authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:token==='PT'?{id:'pt',role:'pt'}:null,
   db:async(table,options={})=>{
    const b=options.body;
    if(table==='rpc/calendar_renew_pt_pair')return rpc('calendar_renew_pt_pair',[b.p_actor_id,b.p_request_id,JSON.stringify(b.p_payload)]);
    if(table==='rpc/calendar_expected_renewal')return rpc('calendar_expected_renewal',[b.p_actor_id,b.p_action,JSON.stringify(b.p_payload)]);
    if(table==='rpc/calendar_audit_write')return rpc('calendar_audit_write',[b.p_actor_id,b.p_actor_role,b.p_source,b.p_request_id,b.p_operation,JSON.stringify(b.p_payload)]);
    assert.ok(['clients','appointments','calendar_expected_renewals'].includes(table));return all(table);
   }}};
  const handler=require('../netlify/functions/lib/calendar-audit-endpoint').createHandler('calendar');
  const requests=[];let loseResponse=false;
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Europe/Rome'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.hostname.startsWith('fonts.'))return route.fulfill({body:''});
   if(u.pathname.endsWith('whatsapp-agenda'))return route.fulfill({status:403,json:{error:'disabled'}});
   if(u.pathname.endsWith('calendar-runtime'))return route.fulfill({json:{CALENDAR_FLEX_MODE:true}});
   if(u.pathname.endsWith('apple-caldav-link'))return route.fulfill({json:{eligible:false}});
   if(u.pathname.endsWith('calendar-activity')){
    const input=req.postDataJSON();if(input.operation==='renew_pt_pair')requests.push(input);
    const result=await handler({httpMethod:'POST',body:req.postData()});
    if(loseResponse&&input.operation==='renew_pt_pair'&&result.statusCode===200){loseResponse=false;return route.fulfill({status:503,json:{error:'TEST: risposta persa dopo il commit'}});}
    return route.fulfill({status:result.statusCode,contentType:'application/json',body:result.body});
   }
   if(u.pathname.includes('/rest/v1/')){
    assert.equal(req.method(),'GET');const table=u.pathname.split('/').pop();
    return route.fulfill({json:['clients','appointments','operators','operator_availability'].includes(table)?await all(table):[]});
   }
   assert.equal(u.hostname,'calendar.test','no unexpected network access');
   const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));
   let body=fs.readFileSync(file);
   if(releaseOrigin){const r=await fetch(releaseOrigin+(u.pathname==='/'?'/index.html':u.pathname)+u.search,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);body=Buffer.from(await r.arrayBuffer());}
   return route.fulfill({contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8',body});
  });
  await page.goto('https://calendar.test/?access=OWNER');
  await page.waitForFunction(()=>State.getClients().length===2&&State.getAppointments().length===16);
  await page.evaluate(()=>App.openPackageOverview('a'));
  assert.deepEqual(await page.locator('#pkg-plan-operator option').allTextContents(),['Trainer']);
  assert.equal(await page.locator('#pkg-plan-operator').isDisabled(),true);
  assert.match(await page.locator('#pkg-operator-old0').innerText(),/Sostituto A/,'individual lessons retain their PT choices');
  await page.evaluate(()=>ExpectedRenewals.forClient('a'));
  await page.waitForSelector('[data-action=edit]');
  assert.match(await page.locator('#expected-renewals-body').innerText(),/PT assegnato: Trainer/);
  assert.doesNotMatch(await page.locator('#expected-renewals-body').innerText(),/Sostituto/);
  await page.click('[data-action=edit]');
  assert.equal(await page.locator('#expected-edit select[name=operatorId]').count(),0);
  assert.equal(await page.inputValue(`[data-day="${day}"] [name=operatorId]`),'sub-a','existing lesson substitutions are retained, not silently reassigned');
  assert.doesNotMatch(await page.locator('#expected-renewals-body').innerText(),/Sostituto/);
  await page.evaluate(()=>App.openPackageOverview('a'));
  await page.getByRole('button',{name:'Genera mancanti',exact:true}).click();
  await page.getByRole('button',{name:'Continua',exact:true}).click();
  assert.equal(await page.inputValue('#pair-sessions'),'1');
  assert.equal(await page.locator('[id^=pair-renew-],[id^=pair-amount-]').count(),0);
  assert.deepEqual(await page.locator('#pair-operator option').allTextContents(),['Trainer']);
  assert.equal(await page.locator('#pair-operator').isDisabled(),true);
  await page.screenshot({path:'/tmp/neacea-pair-recovery-form.png',fullPage:true});
  await page.fill('#pair-start',recoveryDate);await page.check(`.pair-day[value="${day}"]`);
  await page.getByRole('button',{name:'Verifica e mostra anteprima',exact:true}).click();
  await page.waitForSelector('#pair-confirm');
  assert.match(await page.locator('.modal-body').innerText(),/pacchetto corrente, nessun rinnovo/);
  await page.getByRole('button',{name:'Modifica piano',exact:true}).click();
  await page.getByRole('button',{name:'Continua',exact:true}).click();
  assert.equal(await page.inputValue('#pair-sessions'),'1','back retains recovery mode');
  await page.fill('#pair-start',recoveryDate);await page.check(`.pair-day[value="${day}"]`);
  await page.getByRole('button',{name:'Verifica e mostra anteprima',exact:true}).click();
  await db.exec("create function fail_recovery() returns trigger language plpgsql as $$begin if new.id like 'pair_%' then raise exception 'TEST: errore database';end if;return new;end$$;create trigger fail_recovery before insert on appointments for each row execute function fail_recovery()");
  await page.click('#pair-confirm');await page.waitForFunction(()=>!document.getElementById('pair-confirm').disabled);
  assert.equal((await all('appointments')).length,16);assert.deepEqual(await all('clients'),initialClients);
  await db.exec('drop trigger fail_recovery on appointments');loseResponse=true;
  await page.click('#pair-confirm');await page.waitForFunction(()=>!document.getElementById('pair-confirm').disabled);
  assert.equal((await all('appointments')).length,17,'commit succeeded although response was lost');
  await page.click('#pair-confirm');await page.waitForFunction(()=>State.getAppointments().length===17);
  assert.equal(new Set(requests.map(r=>r.payload.requestId)).size,1);
  assert.ok(requests.every(r=>r.payload.clients.every(c=>c.renewal===null)));
  assert.deepEqual(await future(),initialFuture);assert.deepEqual(await all('calendar_expected_renewals'),initialProposal);
  assert.deepEqual(await all('clients'),initialClients,'no finance or package write on planning');
  assert.deepEqual((await all('appointments')).find(a=>a.id==='cancelled'),cancelled);
  const recovery=(await all('appointments')).find(a=>a.id.startsWith('pair_'));
  for(const id of ['a','b'])assert.equal(model.cycle(recovery,id).cycleId,'old-'+id);
  const extra={...requests[0],payload:{...requests[0].payload,requestId:crypto.randomUUID(),appointments:[{...requests[0].payload.appointments[0],id:'pair-extra'}]}};
  const exhausted=await handler({httpMethod:'POST',body:JSON.stringify(extra)});
  assert.equal(exhausted.statusCode,409);assert.match(JSON.parse(exhausted.body).error,/residuo disponibile/);
  assert.equal((await all('appointments')).length,17,'a second plan cannot overbook the old package');
  const forbidden=await handler({httpMethod:'POST',body:JSON.stringify({...requests[0],accessToken:'PT'})});assert.equal(forbidden.statusCode,403);
  await page.reload();await page.waitForFunction(()=>State.getAppointments().length===17);
  await page.evaluate(()=>App.openPackageOverview('a'));
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>Services.getClientSessionMetrics(c).toSchedule)),[0,0]);
  await page.screenshot({path:'/tmp/neacea-pair-recovery-current.png',fullPage:true});
  // Closing and cancelling the recovery changes only the old balances, not the successor.
  const save=async(a,before)=>{
   const r=await handler({httpMethod:'POST',body:JSON.stringify({accessToken:'OWNER',calendarRevision:'20261026-client-save-v2',operation:'save',payload:{appointment:a,expected:before}})});
   assert.equal(r.statusCode,200,r.body);return JSON.parse(r.body).appointment;
  };
  const done=await save(model.attendance(recovery,{a:'fatto',b:'fatto'}),recovery);
  assert.deepEqual((await all('clients')).map(c=>c.sessions_remaining),[0,0]);
  await save({...done,status:'annullato'},done);assert.deepEqual((await all('clients')).map(c=>c.sessions_remaining),[1,1]);
  assert.deepEqual(await future(),initialFuture);assert.deepEqual(await all('calendar_expected_renewals'),initialProposal);
  await page.reload();await page.waitForFunction(()=>State.getAppointments().length===17);
  assert.deepEqual(await page.evaluate(()=>State.getClients().map(c=>Services.getClientSessionMetrics(c).toSchedule)),[1,1]);
  await page.evaluate(()=>ExpectedRenewals.forClient('a'));await page.waitForSelector('[data-action=edit]');await page.click('[data-action=edit]');
  await page.fill(`[data-day="${day}"] [name=time]`,'18:00');
  await page.getByRole('button',{name:'Salva proposta',exact:true}).click();await page.waitForSelector('[data-action=edit]');
  const editedProposal=(await all('calendar_expected_renewals'))[0];
  assert.equal(editedProposal.plan.slots[0].operatorId,'sub-a','changing times preserves the actual lesson PT');
  assert.equal(editedProposal.plan.slots[0].time,'18:00');
  assert.deepEqual((await future()).map(a=>a.date),initialFuture.map(a=>a.date));
  assert.ok((await future()).every(a=>a.operator_id==='sub-a'));
  assert.deepEqual((await all('clients')).map(c=>c.pt_assegnato),['pt','pt']);
  await page.evaluate(()=>{
   const single={...State.getClients()[0],id:'single',ptPartnerId:null,packageTypes:['PT 1:1']};
   State.saveClients([...State.getClients(),single]);
   State.saveAppointments([...State.getAppointments(),{...State.getAppointments().find(a=>a.id==='old0'),id:'single-future',clientIds:['single'],serviceId:'pt11',status:'prenotato',date:'2099-10-29',operatorId:'sub-b'}]);
   App.openPackageOverview('single');
  });
  await page.waitForFunction(()=>document.getElementById('pkg-manual-renewal')&&!document.getElementById('pkg-manual-renewal').hidden);
  assert.deepEqual(await page.locator('#pkg-renew-operator option').allTextContents(),['Trainer']);
  assert.equal(await page.inputValue('#pkg-renew-operator'),'pt','a future lesson with a substitute never changes the renewal referent');
  assert.deepEqual(await page.locator('#pkg-plan-operator option').allTextContents(),['Trainer']);
  assert.match(await page.locator('#pkg-operator-single-future').innerText(),/Sostituto B/);
  assert.deepEqual(errors,[]);
  console.log('PASS recovery: UI → real gateway → local PostgreSQL → failed transaction → lost response → idempotent retry → reload; original cycles and 8 successor dates preserved, attendance/cancellation isolated, PT denied.');
 }finally{if(browser)await browser.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
