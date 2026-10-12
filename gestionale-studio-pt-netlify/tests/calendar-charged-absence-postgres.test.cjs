const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const M=require('../app/calendario-studio/js/pt-session-model');
const sql=n=>fs.readFileSync(__dirname+'/../supabase/migrations/'+n,'utf8');
for(const json of [true,false])test(`charged absence atomic balance, idempotence, reversals, cycles and old data (${json?'JSONB':'array'})`,async()=>{
 const db=new PGlite();try{
 const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
 insert into clients(id,nome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,notes) values('a','A',array['PT 1:1'],8,8,'pt','2026-10-01','[CICLO-PACCHETTO 2026-10-01]');
 insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;
 insert into operator_availability values('pt','mon','["08:00-20:00"]',now());`);
 if(json)await db.exec('alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);alter table clients alter column package_types type jsonb using to_jsonb(package_types)');
 for(const n of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql','20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql','20261009091426_calendar_pair_payments_review.sql','20261009095441_calendar_expected_renewals.sql'])await db.exec(sql(n));
 const fingerprint=async()=>(await db.query("select proname,oid,proacl,prosecdef,proconfig from pg_proc where proname in ('calendar_uses_current_session','calendar_audit_fields') order by proname")).rows;
 const before=await fingerprint();await db.exec(sql('20261012063548_calendar_charged_absence.sql'));assert.deepEqual(await fingerprint(),before);
 const q=async(text,values=[])=>{await db.exec('set role service_role');try{return await db.query(text,values)}finally{await db.exec('reset role')}};
 const write=async(a,b)=>(await q('select calendar_audit_write($1,$2,$3,$4,$5,$6) r',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a,...(b?{expected:b}:{})})])).rows[0].r.appointment;
 const balance=async()=>(await db.query("select sessions_remaining n from clients where id='a'")).rows[0].n;
 let a=await write({id:'one',service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2026-10-12',start_time:'09:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO 2026-10-01]'});
 a=await write({...a,status:'noshow'},a);assert.equal(await balance(),8,'old/unflagged absence unchanged');
 a=await write(M.withStatus(a,'noshow_charged'),a);assert.equal(await balance(),7);assert.equal(a.status,'noshow');
 a=await write(a,a);assert.equal(await balance(),7,'same save never double charges');
 const charged=a;
 a=await write({...a,status:'fatto'},a);assert.equal(await balance(),7,'absence to present never double charges');
 a=await write(M.withStatus(a,'annullato'),a);assert.equal(await balance(),8,'cancellation refunds exactly one');const stale=a;
 a=await write(M.withStatus(a,'noshow_charged'),a);assert.equal(await balance(),7);
 await assert.rejects(write({...a,notes:a.notes+' changed'},stale),/changed/);assert.equal(await balance(),7);
 const audit=(await db.query("select after_data from calendar_audit_log where entity_id='one'")).rows;assert.ok(audit.some(r=>r.after_data.charged_absence===true));
 await q('select calendar_audit_write($1,$2,$3,$4,$5,$6)',['owner','owner','calendar',crypto.randomUUID(),'client',JSON.stringify({rows:[{id:'a',data_conferma:'2026-11-01',notes:'[CICLO-PACCHETTO 2026-11-01]',sessions_remaining:8}]})]);
 a=await write(M.withStatus(a,'annullato'),a);assert.equal(await balance(),8,'old cycle cannot refund the new package');
 const future={...a,id:'reserved',date:'2026-11-02',status:'noshow',notes:'[CICLO-PACCHETTO 2026-11-01]\n[ASSENZA-SCALATA]'};
 const proposal=crypto.randomUUID();await db.query("insert into calendar_expected_renewals(id,client_ids,plan) values($1,'[\"a\"]','{}')",[proposal]);await db.query('insert into calendar_expected_renewal_appointments values($1,$2)',['reserved',proposal]);
 assert.equal((await q('select calendar_uses_current_session($1,(select to_jsonb(c) from clients c where id=\'a\')) used',[JSON.stringify(future)])).rows[0].used,false,'unactivated proposal stays separate');
 await db.exec('set role anon');await assert.rejects(db.query('select calendar_uses_current_session_pre_charged($1,$2)',['{}','{}']),/permission denied/);await db.exec('reset role');
 }finally{await db.close()}
});
