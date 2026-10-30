const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(require.resolve('@electric-sql/pglite',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]}));
test('database locale: conferma, riapertura, permessi, concorrenza, storico e rollback audit',async()=>{
 const db=new PGlite();try{
  const helper=fs.readFileSync(__dirname+'/helpers/calendar-postgres.cjs','utf8');await db.exec(helper.match(/await client.query\(`([\s\S]*?)`\);/)[1]);
  await db.exec(`alter table clients add importo numeric(12,2),add stato_pagamento text,add email text default 'test@example.invalid';
   insert into clients(id,nome,notes,importo,stato_pagamento,sessions_remaining,email) values('c','TEST','Originale',300,'Da pagare',8,'test@example.invalid'),('flow','FLOW','Originale flow',300,'Da pagare',6,'flow@example.invalid');
   insert into operators(id,email,roles) values('owner','owner@example.invalid',array['owner']),('pt','pt@example.invalid',array['PT']);
   create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;grant select on operator_effective_roles to service_role;`);
  for(const file of ['20260912151523_calendar_prerelease_atomic.sql','20260912212042_calendar_activity_audit.sql','20261030183151_calendar_shared_client_finance.sql'])await db.exec(fs.readFileSync(__dirname+'/../supabase/migrations/'+file,'utf8'));
  const expected={notes:'Originale',importo:300,stato_pagamento:'Da pagare',email:'test@example.invalid'},values={notes:'Originale\nQuote sintetiche',importo:300,stato_pagamento:'Parziale'};
  const call=async(e,v=values,actor='owner',role='service_role')=>{await db.exec('set role '+role);try{return(await db.query('select calendar_save_client_finance($1,$2,$3,$4) r',[actor,'c',JSON.stringify(e),JSON.stringify(v)])).rows[0].r}finally{await db.exec('reset role')}};
  for(const role of ['anon','authenticated'])await assert.rejects(call(expected,values,'owner',role),/permission denied/);
  await assert.rejects(call(expected,values,'pt'),/Direction only/);
  await assert.rejects(call(expected,{...values,sessions_remaining:0}),/non validi/);
  const saved=await call(expected);assert.equal(saved.notes,values.notes);assert.equal(Number(saved.importo),300);assert.equal(saved.sessions_remaining,8);
  const reopened=(await db.query("select * from clients where id='c'")).rows[0];assert.equal(reopened.notes,values.notes);assert.equal(reopened.stato_pagamento,'Parziale');
  await assert.rejects(call(expected),/cambiati/);
  // Exercise the real HTTP handler -> service -> transactional SQL -> reload.
  // Only the external Nutrition transport is simulated here.
  const database=async(table,options)=>{
   if(table==='clients'){
    const q=new URLSearchParams(options.query.slice(1)),id=q.get('id')?.slice(3),email=q.get('email')?.slice(6);
    const rows=id?(await db.query('select * from clients where id=$1',[id])).rows:(await db.query('select id from clients where lower(email)=lower($1)',[email])).rows;
    return rows.map(row=>Object.hasOwn(row,'importo')?{...row,importo:Number(row.importo)}:row);
   }
   assert.equal(table,'rpc/calendar_save_client_finance');const b=options.body;
   await db.exec('set role service_role');try{return(await db.query('select calendar_save_client_finance($1,$2,$3,$4) r',[b.p_actor_id,b.p_client_id,JSON.stringify(b.p_expected),JSON.stringify(b.p_values)])).rows[0].r}finally{await db.exec('reset role')}
  };
  const payments=[],provider=async(action,p)=>{
   if(action==='getCliente')return {cliente:{email:'flow@example.invalid',active:true}};
   if(action==='getPagamenti')return {pagamenti:payments};if(action==='getFatture')return {fatture:[]};
   assert.equal(action,'addPagamentoCondiviso');payments.push(p);return {success:true};
  };
  const handler=require('../netlify/functions/calendar-client-finance').createHandler({auth:async()=>({id:'owner',role:'owner'}),database,provider});
  const api=async p=>{const r=await handler({httpMethod:'POST',body:JSON.stringify({calendarRevision:'20261030-shared-finance-v1',clientId:'flow',...p})});assert.equal(r.statusCode,200,r.body);return JSON.parse(r.body)};
  const split=await api({action:'split',expectedNotes:'Originale flow',total:300,pt:200,nutrition:100});
  const cycle=require('../app/calendario-studio/js/package-ledger').currentCycle(split.client);
  await api({action:'register',cycleId:cycle.id,requestId:crypto.randomUUID(),date:'2026-10-01',amount:100});
  const reread=await api({action:'list'});assert.equal(reread.finance.paid,100);assert.equal(reread.finance.balance,200);
  const persisted=(await db.query("select * from clients where id='flow'")).rows[0];assert.equal(persisted.stato_pagamento,'Parziale');assert.equal(persisted.sessions_remaining,6);assert.match(persisted.notes,/"nutrition":100/);
  const fresh={...values,email:'test@example.invalid'};await db.exec("create function reject_finance_audit() returns trigger language plpgsql as $$begin raise exception 'AUDIT_FAILURE';end$$;create trigger reject_finance_audit before insert on calendar_audit_log for each row execute function reject_finance_audit()");
  await assert.rejects(call(fresh,{...values,stato_pagamento:'Pagato'}),/AUDIT_FAILURE/);
  assert.equal((await db.query("select stato_pagamento from clients where id='c'")).rows[0].stato_pagamento,'Parziale');
 }finally{await db.close()}
});
