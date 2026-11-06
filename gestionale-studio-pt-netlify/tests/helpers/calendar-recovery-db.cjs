const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
exports.migrations=[
 '20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql',
 '20260913211931_calendar_flex_mode.sql','20260921101845_calendar_early_package_session.sql',
 '20261004152442_calendar_pt_session_correction.sql','20261009070726_calendar_pt_pair_rules.sql',
 '20261009091426_calendar_pair_payments_review.sql','20261009095441_calendar_expected_renewals.sql',
 '20261012063548_calendar_charged_absence.sql','20261029180107_calendar_reprogram_empty_confirmed_renewal.sql',
 '20261106114015_calendar_automatic_recovery.sql'];
exports.setup=async (db,pair=false,baseReady=false)=>{
 const helper=fs.readFileSync(path.join(__dirname,'calendar-postgres.cjs'),'utf8');
 if(!baseReady)await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
 await db.exec(`alter table appointments alter column client_ids type jsonb using to_jsonb(client_ids);
 alter table clients alter column package_types type jsonb using to_jsonb(package_types);
 alter table clients add column package_frequency text,add column giorni_settimana jsonb,add column orario_preferito time,add column importo numeric,add column stato_pagamento text,add column tipo_servizio text,add column stato_abbonamento text;
 insert into operators(id,nome,email,roles) values('owner','Owner','owner@example.test',array['owner']),('pt','Trainer','pt@example.test',array['PT']),('other','Other','other@example.test',array['PT']);
 create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;
 grant select on operator_effective_roles to service_role;`);
  for(const id of pair?['a','b']:['a']){
   const ledger={version:1,cycles:[{id:'cycle-'+id,startDate:'2099-10-01',legacy:false,sessionsTotal:12,amount:240,payments:[],days:['Lunedì','Mercoledì','Giovedì'],time:'17:00',operatorId:'pt'}]};
   await db.query(`insert into clients(id,nome,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,data_conferma,giorni_settimana,notes) values($1,$1,$2,12,12,'pt','2099-10-01','2099-10-01','["Lunedì","Mercoledì","Giovedì"]',$3)`,[id,JSON.stringify([pair?'PT 1:2':'PT 1:1']),'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify(ledger)+'[/NEACEA-PACKAGE-LEDGER-V1]']);
  }
 for(const file of exports.migrations.filter((_,i)=>!baseReady||i!==0))await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
};
exports.open=async(pair=false)=>{
 const {PGlite}=require(require.resolve('@electric-sql/pglite',{paths:[path.join(root,'tools/coaching-editor')]}));
 const db=new PGlite();await exports.setup(db,pair);
 let queue=Promise.resolve();
 const q=(sql,args=[])=>{const task=queue.then(async()=>{await db.exec('set role service_role');try{return await db.query(sql,args)}finally{await db.exec('reset role')}});queue=task.catch(()=>{});return task;};
 const rpc=async(name,args)=>(await q(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
 const write=async(a,b=null)=>rpc('calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'save',JSON.stringify({appointment:a,...(b?{expected:b}:{})})]);
 const recover=async(a,actor='owner',role='owner')=>rpc('calendar_cancel_and_recover',[actor,role,crypto.randomUUID(),JSON.stringify(a)]);
 const patch=async row=>rpc('calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'client',JSON.stringify({method:'PATCH',rows:[row]})]);
 const all=async table=>(await q(`select to_jsonb(t) r from ${table} t order by id`)).rows.map(r=>r.r);
 const seed=async(pair=false)=>{
  if(pair){const first=(await all('clients'))[0];await rpc('calendar_save_pair_client',['owner',crypto.randomUUID(),JSON.stringify({client:{...first,pt_partner_id:'b'},expectedUpdatedAt:first.updated_at})]);}
   const row=(id,date)=>({id,service_id:pair?'pt12':'pt11',client_ids:pair?['a','b']:['a'],operator_id:'pt',date,start_time:'17:00:00',duration_min:60,buffer_min:10,status:'prenotato',notes:'[CICLO-PACCHETTO-ID cycle-a] [CICLO-PACCHETTO 2099-10-01]'});
  const source=(await write(row('source','2099-11-02'))).appointment;
  await write(row('tail','2099-11-04'));
  for(let i=1;i<=9;i++)await write({...row('done-'+i,'2099-10-'+String(i).padStart(2,'0')),status:'fatto'});
  return source;
 };
 return {db,q,rpc,write,recover,patch,all,seed,close:()=>db.close()};
};
