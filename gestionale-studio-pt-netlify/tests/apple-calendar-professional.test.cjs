const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pkg = require('../netlify/functions/lib/apple-calendar-package');
const { buildCalendar, operationalNote } = require('../netlify/functions/apple-calendar')._test;
const now = new Date('2026-09-14T12:00:00Z');
const client = { id:'sim-veronica',nome:'Veronica',cognome:'Corona',active:true,sessions_total:8,sessions_remaining:6,data_conferma:'2026-09-01',telefono:'PRIVATE_PHONE',email:'PRIVATE_EMAIL',indirizzo:'PRIVATE_ADDRESS',notes:'PRIVATE_MEDICAL' };
const operator = {id:'sim-pt',nome:'Alessandro',cognome:'Pirisi'};
const dates = ['2026-09-01','2026-09-03','2026-09-15','2026-09-17','2026-09-22','2026-09-24','2026-09-29','2026-10-01'];
const rows = dates.map((date,i)=>({id:`sim-${i}`,date,start_time:i%2?'18:00':'17:00',duration_min:60,client_ids:[client.id],operator_id:operator.id,service_id:'pt11',status:i<2?'fatto':'prenotato',notes:'PRIVATE_NOTES\n[NOTA-OPERATIVA] Portare un asciugamano',updated_at:'2026-09-12T12:00:00Z'}));
const unfold = s => s.replace(/\r\n /g,'');
const render = (r=rows,c=[client],options={}) => unfold(buildCalendar(r,c,[operator],{now,...options}).body);
const event = (ics,id) => ics.split('BEGIN:VEVENT').find(s=>s.includes(`UID:${id}@`));

test('current package: positions, stored remaining, future, distinct times, end date',()=>{
 const info=pkg.packageInfo(client,rows,'2026-09-14');
 assert.deepEqual(info.position(rows[2]),{n:3,total:8});
 assert.equal(info.remaining,6);assert.equal(info.scheduled,6);assert.equal(info.toSchedule,0);
 assert.deepEqual(info.schedule,['Martedì 17:00','Giovedì 18:00']);assert.equal(info.endDate,'2026-10-01');
 const ics=render();assert.match(event(ics,'sim-2'),/SUMMARY:PT 1:1 · Veronica Corona · 3\/8/);
 for(const text of ['Seduta: 3 di 8','Sedute residue: 6','Future già programmate: 6','Ancora da programmare: 0','Fine ciclo prevista: 01/10/2026','LOCATION:NEACEA Studio'])assert.ok(event(ics,'sim-2').includes(text));
 assert.equal(pkg.packageInfo({...client,sessions_remaining:8},rows,'2026-09-14').remaining,8);
 const incomplete=pkg.packageInfo({...client,sessions_remaining:8},rows,'2026-09-14');assert.equal(incomplete.toSchedule,2);assert.equal(incomplete.endDate,null);
});

test('statuses, cancellation, stable UID after move/status change and no recurrence',()=>{
 const original=JSON.stringify(rows);const r=[...rows,{...rows[2],id:'cancel',status:'annullato'},{...rows[2],id:'no',date:'2026-09-14',status:'noshow'}];
 const ics=render(r);assert.match(event(ics,'sim-0'),/SUMMARY:✓ PT 1:1 · Veronica Corona · 1\/8/);assert.match(event(ics,'no'),/SUMMARY:⚠ NO-SHOW · Veronica Corona · 3\/8/);assert.ok(!ics.includes('UID:cancel@'));assert.ok(!ics.includes('RRULE'));
 assert.equal(pkg.packageInfo(client,r,'2026-09-14').remaining,6);assert.equal(pkg.packageInfo(client,r,'2026-09-14').scheduled,6);
 const moved=render([{...rows[2],date:'2026-09-30',status:'fatto'}]);assert.ok(moved.includes('UID:sim-2@calendar.neacea.it'));assert.equal(JSON.stringify(rows),original);
});

test('per-PT feed exports assigned PT services with active participants only; general feed remains usable',()=>{
 const inactive={...client,id:'inactive',nome:'PRIVATE_INACTIVE',active:false};const extra=[{...rows[0],id:'other',operator_id:'other'}, {...rows[0],id:'nutri',service_id:'nutrizione'}, {...rows[0],id:'inactive',client_ids:['inactive']}, {...rows[0],id:'block',service_id:'blocco',client_ids:[]}, {...rows[0],id:'mixed',client_ids:[client.id,'inactive']}];
 const ics=render([...rows,...extra],[client,inactive],{operatorId:operator.id});for(const id of ['other','nutri','inactive','block'])assert.ok(!ics.includes(`UID:${id}@`));assert.ok(ics.includes('UID:mixed@'));assert.ok(!ics.includes('PRIVATE_INACTIVE'));
 const general=render(extra,[client,inactive]);assert.ok(general.includes('UID:nutri@'));assert.ok(general.includes('UID:block@'));
});

test('different participant package positions never receive a common fraction',()=>{
 const second={...client,id:'second',nome:'Elena',cognome:'Test',sessions_total:12,sessions_remaining:12};const group={...rows[2],id:'group',service_id:'pt12',client_ids:[client.id,second.id]};
 const ics=render([...rows.filter(r=>r.id!==rows[2].id),group],[client,second]);const ev=event(ics,'group');assert.match(ev,/SUMMARY:PT 1:2 · Veronica Corona\\, Elena Test\r\n/);assert.ok(ev.includes('Seduta: 3 di 8'));assert.ok(ev.includes('Seduta: 1 di 12'));
 assert.ok(render([{...group,service_id:'circuit'}],[client,second]).includes('SUMMARY:Circuit ·'));
});

test('free text and sensitive fields never enter ICS, including unsafe marked notes',()=>{
 const sensitive='telefono PRIVATE_PHONE email PRIVATE_EMAIL indirizzo PRIVATE_ADDRESS patologie PRIVATE_MEDICAL farmaci PRIVATE_DRUG anamnesi PRIVATE_HISTORY importo PRIVATE_MONEY stato pagamento PRIVATE_PAYMENT';
 const r=rows.map(r=>({...r,notes:sensitive+'\n[NOTA-OPERATIVA] '+sensitive}));const ics=render(r);assert.ok(!ics.includes('PRIVATE_'));assert.ok(!ics.includes('Note operative:'));
 assert.equal(operationalNote('[NOTA-OPERATIVA] Portare scarpe pulite'),'Portare scarpe pulite');assert.equal(operationalNote('[NOTA-OPERATIVA] Portare scarpe pulite e PRIVATE_MEDICAL'),'—');
 const injection=render([{...rows[0],notes:'\r\nRRULE:FREQ=DAILY\r\nATTENDEE:PRIVATE_EMAIL'}]);assert.ok(!injection.includes('RRULE'));assert.ok(!injection.includes('PRIVATE_EMAIL'));
});

test('description omits missing/invalid notes and preserves allowed operational notes',()=>{
 for(const notes of [undefined, '', 'Testo libero', '[NOTA-OPERATIVA] Non ammessa']) {
  const ics=render([{...rows[2],notes}]);
  assert.ok(!ics.includes('Note operative:'));
  assert.ok(ics.includes('Gestione NEACEA\\nData e orario gestiti dal Calendario NEACEA.'));
  assert.ok(!ics.includes('Modificare data/orario'));
 }
 const ics=render([{...rows[2],notes:'[NOTA-OPERATIVA] Portare scarpe pulite'}]);
 assert.ok(ics.includes('Note operative: Portare scarpe pulite'));
 assert.ok(!ics.includes('Note operative: —'));
});

test('cycle membership matches production Services for legacy, renewal IDs, persisted/inferred starts',()=>{
 const browser=vm.createContext({Date,CONFIG:{SERVICES:{pt11:{},pt12:{},circuit:{}}},State:{getAppointments:()=>[],getClients:()=>[]}});
 for(const [file,name] of [['package-ledger.js','PackageLedger'],['services.js','Services']])vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js',file),'utf8')+`\nglobalThis.${name}=${name};`,browser);
 const ledger='[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({cycles:[{id:'new-cycle',startDate:'2026-09-01',legacy:false}]})+'[/NEACEA-PACKAGE-LEDGER-V1]';
 const variants=[client,{...client,data_conferma:null,data_inizio:'2026-08-01'}, {...client,notes:ledger}, {...client,notes:'[CICLO-PACCHETTO 2026-09-10]'}, {...client,notes:'[NEACEA-PACKAGE-LEDGER-V1]invalid[/NEACEA-PACKAGE-LEDGER-V1]'}];
 const r=[...rows,{...rows[0],id:'old',date:'2026-08-01',notes:'[CICLO-PACCHETTO 2026-08-01]'}, {...rows[0],id:'new',notes:'[CICLO-PACCHETTO-ID new-cycle]'}, {...rows[0],id:'wrong',notes:'[CICLO-PACCHETTO-ID old-cycle]'}];
 browser.State.getAppointments=()=>r.map(a=>({...a,clientIds:a.client_ids,serviceId:a.service_id,startTime:a.start_time}));
 for(const c of variants){const bc={...c,sessionsTotal:c.sessions_total,sessionsRemaining:c.sessions_remaining,packageCycleStart:c.notes.match(/\[CICLO-PACCHETTO (\d{4}-\d{2}-\d{2})\]/)?.[1]||c.data_conferma||'',acquisitionStart:c.data_inizio,packageStart:c.package_start};const ctx=pkg.context(c,r);assert.equal(ctx.start,browser.Services.getPackageCycleContext(bc).start);for(const a of browser.State.getAppointments())assert.equal(pkg.inCycle(a,ctx),browser.Services.appointmentInCurrentPackageCycle(a,bc));}
 const info=pkg.packageInfo({...client,notes:ledger},r,'2026-09-14');assert.equal(info.completed,1);assert.equal(info.position(r.find(a=>a.id==='old')),null);assert.equal(info.position(r.find(a=>a.id==='wrong')),null);
});

test('handler: private server key only, GET pagination, token protection, no mutation methods',async()=>{
 const file=require.resolve('../netlify/functions/apple-calendar');const originalFetch=global.fetch;const env={...process.env};
 try{delete process.env.SUPABASE_SECRET_KEY;delete process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_KEY='PUBLIC';process.env.APPLE_CALENDAR_FEED_TOKEN='SIM_TOKEN';delete require.cache[file];let handler=require(file).handler;assert.equal((await handler({httpMethod:'GET',queryStringParameters:{token:'SIM_TOKEN'}})).statusCode,503);
 process.env.SUPABASE_SECRET_KEY='SIM_SERVER';delete require.cache[file];handler=require(file).handler;let reads=0;
 global.fetch=async(url,opt)=>{assert.equal(opt.method||'GET','GET');assert.equal(opt.headers.apikey,'SIM_SERVER');reads++;const u=new URL(url),table=u.pathname.split('/').at(-1),data={appointments:rows,clients:[client],operators:[operator]}[table];const offset=Number(u.searchParams.get('offset'));return {ok:true,json:async()=>data.slice(offset,offset+2)}};
 const out=await handler({httpMethod:'GET',queryStringParameters:{token:'SIM_TOKEN'}});assert.equal(out.statusCode,200);assert.equal(out.headers['X-NEACEA-Event-Count'],'8');assert.ok(reads>3);
 assert.equal((await handler({httpMethod:'POST'})).statusCode,405);assert.equal((await handler({httpMethod:'GET',queryStringParameters:{token:'wrong'}})).statusCode,401);
 }finally{global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);delete require.cache[file]}
});
if(process.env.WRITE_ICS_EXAMPLE)fs.writeFileSync(process.env.WRITE_ICS_EXAMPLE,buildCalendar(rows,[client],[operator],{now,operatorId:operator.id}).body);
