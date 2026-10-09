const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const sql=n=>fs.readFileSync(__dirname+'/../supabase/migrations/'+n,'utf8');
test('paired client association, independent historical absence, provisional confirmation and payment ledger',async()=>{
 const db=new PGlite();try{
 const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
 alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);alter table clients alter column package_types type jsonb using to_jsonb(package_types);
 insert into clients(id,nome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,notes) values('a','A','["PT 1:1"]',8,7,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]'),('b','B','["PT 1:1"]',8,8,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]');
 insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;
 insert into operator_availability values('pt','mon','["08:00-20:00"]',now());
 insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,status,notes) values('old-a','pt11','["a"]','pt','2026-10-05','09:00',60,'fatto','[CICLO-PACCHETTO 2026-10-01]'),('old-b','pt11','["b"]','pt','2026-10-05','09:00',60,'noshow','[CICLO-PACCHETTO 2026-10-01]');`);
 for(const n of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql','20261009091426_calendar_pair_payments_review.sql'])await db.exec(sql(n));
 const q=async(text,values=[])=>{await db.exec('set role service_role');try{return await db.query(text,values)}finally{await db.exec('reset role')}};
 const get=async(table,id)=>(await db.query(`select to_jsonb(t) r from ${table} t where id=$1`,[id])).rows[0].r;
 const a=await get('clients','a');
 await assert.rejects(q('select calendar_save_pair_client($1,$2,$3)',['pt',crypto.randomUUID(),JSON.stringify({client:{...a,pt_partner_id:'b',package_types:['PT 1:2']},expectedUpdatedAt:a.updated_at})]),/Direction/);
 await q('select calendar_save_pair_client($1,$2,$3)',['owner',crypto.randomUUID(),JSON.stringify({client:{...a,pt_partner_id:'b',package_types:['PT 1:2']},expectedUpdatedAt:a.updated_at})]);
 assert.equal((await get('clients','b')).pt_partner_id,'a');
 const before=await get('appointments','old-a'),partner=await get('appointments','old-b');
 await q('select calendar_correct_pt_sessions($1,$2,$3)',['owner',crypto.randomUUID(),JSON.stringify([{before,partner,serviceId:'pt12'}])]);
 assert.deepEqual((await get('appointments','old-a')).client_ids,['a','b']);assert.equal((await get('appointments','old-b')).status,'annullato');
 assert.equal((await get('clients','a')).sessions_remaining,7);assert.equal((await get('clients','b')).sessions_remaining,7);
 const write=async(appointment,expected)=>q('select calendar_audit_write($1,$2,$3,$4,$5,$6)',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment,...(expected?{expected}:{})})]);
 await db.exec("update calendar_runtime_flags set enabled=true");
 const provisional={id:'provisional',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2026-10-12',start_time:'10:00',duration_min:60,buffer_min:0,status:'prenotato',notes:'[ORARIO-PROVVISORIO]'};
 await write(provisional);
 await write({...provisional,id:'pair',service_id:'pt12',client_ids:['a','b'],notes:''});
 const current=await get('appointments','provisional');
 await assert.rejects(write({...current,status:'fatto'},current),/Conferma prima/);
 await assert.rejects(write({...current,notes:''},current),/Orario ancora occupato/);
 await write({...current,start_time:'12:00',notes:''},current);
 const payment={id:crypto.randomUUID(),operator_id:'pt',period:'2026-10-01',paid_on:'2026-10-01',amount_cents:1500,method:'bonifico',note:'Riferimento test'};
 const pay=async(op,p=payment,actor='owner')=>(await q('select calendar_pt_payments($1,$2,$3) r',[actor,op,JSON.stringify(p)])).rows[0].r;
 await assert.rejects(pay('register',payment,'pt'),/Direction/);
 assert.equal((await pay('register')).payments.length,1);assert.equal((await pay('register')).payments.length,1);
 await assert.rejects(pay('register',{...payment,amount_cents:2000}),/già usata/);
 await assert.rejects(q('update pt_trainer_payments set amount_cents=1 where id=$1',[payment.id]),/immutabile/);
 await assert.rejects(pay('void',{...payment,reason:''}),/motivo/);
 assert.ok((await pay('void',{...payment,reason:'Importo errato'})).payments[0].voided_at);
 await db.exec('set role anon');await assert.rejects(db.query('select * from pt_trainer_payments'),/permission/);await db.exec('reset role');
 }finally{await db.close()}
});

test('simultaneous individual sessions each earn 10 EUR but occupy one clock hour',()=>{
 const model=require('../app/calendario-studio/js/pt-session-model');
 const a={id:'a',serviceId:'pt11',clientIds:['a'],operatorId:'pt',date:'2026-10-01',startTime:'10:00',durationMin:60,status:'fatto'};
 const r=model.summary([a,{...a,id:'b',clientIds:['b']}],'2026-10');
 assert.equal(r.issues.length,0);assert.equal(r.totals[0].cents,2000);assert.equal(r.totals[0].earnedMin,120);assert.equal(r.totals[0].workedMin,60);
 assert.equal(model.summary([a,{...a,id:'b'}],'2026-10').issues.length,2);
});
