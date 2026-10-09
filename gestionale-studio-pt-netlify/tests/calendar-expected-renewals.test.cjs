const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const renewal=require('../netlify/functions/lib/expected-renewals');
const model=require('../app/calendario-studio/js/pt-session-model');
const sql=n=>fs.readFileSync(__dirname+'/../supabase/migrations/'+n,'utf8');
test('expected renewal: isolated balances, actual work, confirmation, activation, idempotence and access',async()=>{
 const db=new PGlite();try{
 const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
 alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);alter table clients alter column package_types type jsonb using to_jsonb(package_types);
 insert into clients(id,nome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,notes) values('a','A','["PT 1:1"]',8,7,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]'),('b','B','["PT 1:1"]',8,8,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]');
 insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;
 insert into operator_availability values('pt','mon','["08:00-20:00"]',now());
 insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,status,notes) values('old-a','pt11','["a"]','pt','2026-10-05','09:00',60,'fatto','[CICLO-PACCHETTO 2026-10-01]'),('old-b','pt11','["b"]','pt','2026-10-05','09:00',60,'noshow','[CICLO-PACCHETTO 2026-10-01]');`);
 for(const n of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql','20261009091426_calendar_pair_payments_review.sql','20261009095441_calendar_expected_renewals.sql'])await db.exec(sql(n));
 const q=async(text,values=[])=>{await db.exec('set role service_role');try{return await db.query(text,values)}finally{await db.exec('reset role')}};
 const get=async(table,id)=>(await db.query(`select to_jsonb(t) r from ${table} t where id=$1`,[id])).rows[0].r;

 await db.exec("update calendar_runtime_flags set enabled=true");
 const call=async(action,payload,actor='owner')=>(await q('select calendar_expected_renewal($1,$2,$3) r',[actor,action,JSON.stringify(payload)])).rows[0].r;
 const a=await get('clients','a');
 const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 let p={id:crypto.randomUUID(),plan:{serviceId:'pt11',startDate:date,slots:[{day,time:'09:00',operatorId:'pt',duration:60}],clients:[{id:'a',source:{cycleId:'',start:'2026-10-01'},cycleId:'expected_a',sessions:8,amount:160}],issue:''}};
 const apps=renewal.appointmentsFor(p);
 const payload={...p,appointments:apps,clients:[{id:a.id,expectedUpdatedAt:a.updated_at}]};
 await assert.rejects(call('create',payload,'pt'),/Direction/);
 p=await call('create',payload);assert.equal(p.state,'pending');assert.equal((await get('clients','a')).sessions_remaining,7);
 await assert.rejects(call('create',{...payload,id:crypto.randomUUID()}),/proposta aperta/);
 await assert.rejects(call('confirm',{id:p.id,version:999}),/cambiata/);
 // Actual attendance before commercial confirmation earns compensation without using old sessions.
 let appt=await get('appointments',apps[0].id);
 const done=model.write({...appt,status:'fatto'},{version:1,participants:{a:{cycleId:'expected_a',start:date,status:'fatto'}}});
 await q('select calendar_audit_write($1,$2,$3,$4,$5,$6)',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:done,expected:appt})]);
 assert.equal((await get('clients','a')).sessions_remaining,7);assert.equal(model.summary([done],date.slice(0,7)).totals[0].cents,1000);
 const existing=(await db.query('select to_jsonb(a) r from appointments a where id like $1',['expected_%'])).rows.map(r=>r.r);
 const edited={...p.plan,clients:p.plan.clients.map(c=>({...c,sessions:9,amount:180}))};
 p=await call('edit',{id:p.id,version:p.version,plan:edited,appointments:renewal.appointmentsFor({...p,plan:edited},existing)});
 assert.equal((await get('appointments',apps[0].id)).status,'fatto');
 p=await call('confirm',{id:p.id,version:p.version});assert.equal(p.state,'confirmed');
 assert.equal((await call('confirm',{id:p.id,version:1})).state,'confirmed');
 assert.equal((await get('clients','a')).sessions_remaining,7);
 await assert.rejects(call('activate',{id:p.id,version:p.version,clients:[]}),/Chiudi prima/);
 // The ordinary package completes; activation carries the already performed new lesson.
 await db.exec("alter table clients disable trigger all;update clients set sessions_remaining=0 where id='a';alter table clients enable trigger all");
 const current=await get('clients','a');const rows=(await db.query('select to_jsonb(a) r from appointments a join calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=$1',[p.id])).rows.map(r=>r.r);
 const service=renewal.createService({db:async(table,options={})=>{
  if(table==='rpc/calendar_expected_renewal')return call(options.body.p_action,options.body.p_payload,options.body.p_actor_id);
  if(options.query?.startsWith('?id=eq.'))return [await get(table,decodeURIComponent(options.query.slice(7)))];
  return (await db.query(`select to_jsonb(t) r from ${table} t order by id`)).rows.map(r=>r.r);
 }});
 p=await service.handle('owner',{action:'confirm',id:p.id,version:p.version});assert.equal(p.state,'activated');assert.equal(p.activationError,null);
 const activated=await get('clients','a');assert.equal(activated.sessions_remaining,8);assert.equal(activated.sessions_total,9);assert.equal(activated.stato_pagamento,'Da pagare');
 assert.ok(!JSON.parse(activated.notes.match(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/)[1]).cycles.at(-1).payments.length);
 assert.equal((await get('appointments',apps[0].id)).status,'fatto');assert.ok(!(await get('appointments',apps[0].id)).notes.includes('[RINNOVO-PREVISTO '));
 await db.exec('set role anon');await assert.rejects(db.query('select * from calendar_expected_renewals'),/permission/);await db.exec('reset role');
 }finally{await db.close()}
});

test('pair proposals preserve two cycles, one fee, edited dates, mixed attendance and declined history',async()=>{
 const db=new PGlite();try{
 const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
 alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);alter table clients alter column package_types type jsonb using to_jsonb(package_types);
 insert into clients(id,nome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,notes) values('a','A','["PT 1:1"]',8,7,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]'),('b','B','["PT 1:1"]',8,8,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]');
 insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;
 insert into operator_availability values('pt','mon','["08:00-20:00"]',now());
 insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,status,notes) values('old-a','pt11','["a"]','pt','2026-10-05','09:00',60,'fatto','[CICLO-PACCHETTO 2026-10-01]'),('old-b','pt11','["b"]','pt','2026-10-05','09:00',60,'noshow','[CICLO-PACCHETTO 2026-10-01]');`);
 for(const n of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql','20261009091426_calendar_pair_payments_review.sql','20261009095441_calendar_expected_renewals.sql'])await db.exec(sql(n));
 const q=async(text,values=[])=>{await db.exec('set role service_role');try{return await db.query(text,values)}finally{await db.exec('reset role')}};
 const get=async(table,id)=>(await db.query(`select to_jsonb(t) r from ${table} t where id=$1`,[id])).rows[0].r;


 await db.exec("update calendar_runtime_flags set enabled=true");
 const call=async(action,payload)=>(await q('select calendar_expected_renewal($1,$2,$3) r',['owner',action,JSON.stringify(payload)])).rows[0].r;
 let a=await get('clients','a');
 await q('select calendar_save_pair_client($1,$2,$3)',['owner',crypto.randomUUID(),JSON.stringify({client:{...a,pt_partner_id:'b',package_types:['PT 1:2']},expectedUpdatedAt:a.updated_at})]);
 const clients=await Promise.all(['a','b'].map(id=>get('clients',id)));
 const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10),day=new Date(date+'T12:00:00Z').getUTCDay();
 let p={id:crypto.randomUUID(),plan:{serviceId:'pt12',startDate:date,slots:[{day,time:'11:00',operatorId:'pt',duration:60}],clients:clients.map(c=>({id:c.id,source:{cycleId:'',start:'2026-10-01'},cycleId:'expected_'+c.id,sessions:8,amount:160})),issue:''}};
 const apps=renewal.appointmentsFor(p);
 p=await call('create',{...p,appointments:apps,clients:clients.map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))});
 assert.equal((await db.query('select count(*) n from calendar_expected_renewal_appointments')).rows[0].n,8);
 const rows=async()=>(await db.query('select to_jsonb(a) r from appointments a join calendar_expected_renewal_appointments m on m.appointment_id=a.id where m.proposal_id=$1 order by date',[p.id])).rows.map(r=>r.r);
 const nextDate=new Date(Date.parse(date+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 let edited={...p.plan,startDate:nextDate};
 p=await call('edit',{id:p.id,version:p.version,plan:edited,appointments:renewal.appointmentsFor({...p,plan:edited},await rows())});
 assert.equal((await rows())[0].id,apps[0].id);assert.equal((await rows())[0].date,nextDate);
 const before=(await rows())[0],done=model.attendance(before,{a:'fatto',b:'noshow'});
 await q('select calendar_audit_write($1,$2,$3,$4,$5,$6)',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:done,expected:before})]);
 assert.equal((await get('clients','a')).sessions_remaining,7);assert.equal((await get('clients','b')).sessions_remaining,8);
 assert.equal(model.summary([done],nextDate.slice(0,7)).totals[0].cents,1500);
 const beforeDeclineIds=(await rows()).map(a=>a.id);
 p=await call('decline',{id:p.id,version:p.version});assert.equal(p.state,'declined');
 assert.deepEqual((await rows()).map(a=>a.id),beforeDeclineIds);assert.equal((await rows()).filter(a=>a.status==='annullato').length,7);assert.equal((await rows())[0].status,'fatto');
 }finally{await db.close()}
});

test('proposal generation copies stable schedules and does not infer a pair from overlap',()=>{
 const c={id:'c',active:true,sessions_total:8,sessions_remaining:1,package_types:['PT 1:1'],giorni_settimana:['Lunedì'],importo:160,data_conferma:'2026-10-01'};
 const a={id:'old',client_ids:['c'],service_id:'pt11',status:'prenotato',date:'2026-10-12',start_time:'09:00',duration_min:60,operator_id:'pt',notes:''};
 const p=renewal.infer([c],[a,{...a,id:'other',client_ids:['other']}],'2026-10-09');
 assert.equal(p.serviceId,'pt11');assert.equal(p.startDate,'2026-10-13');assert.equal(p.slots[0].time,'09:00');assert.equal(p.issue,'');
 const apps=renewal.appointmentsFor({id:'p',plan:p},[],'2026-10-09');assert.equal(apps.length,8);assert.equal(apps[0].date,'2026-10-19');
 assert.match(renewal.infer([c],[{...a,notes:'[ORARIO-PROVVISORIO]'}],'2026-10-09').issue,/Orari variabili/);
 const {buildCalendar}=require('../netlify/functions/apple-calendar')._test;
 const ics=buildCalendar(apps,[{...c,nome:'Cliente'}],[{id:'pt',nome:'Trainer'}]).body.replace(/\r\n /g,'');
 assert.match(ics,/Rinnovo da confermare/);assert.match(ics,/STATUS:TENTATIVE/);assert.match(ics,/TRANSP:OPAQUE/);
 const scope=require('../netlify/functions/lib/pt-client-scope').clientScope([c],apps,[]);assert.deepEqual(scope.clients[0].pending_session_pt_ids,['pt']);
 assert.equal(require('../netlify/functions/lib/apple-calendar-package').packageInfo(c,[a,...apps],'2026-10-09').scheduled,1);
});
