const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {open}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
async function fixture(){const f=await open(true);await f.seed(true);await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261111091927_calendar_package_suspension.sql'),'utf8'));
 const a=(await f.all('clients')).find(c=>c.id==='a');await f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify({clientId:'a',action:'archive',status:'Ibernato',expectedUpdatedAt:a.updated_at,expectedAppointments:(await f.all('appointments')).filter(a=>a.status==='prenotato')})]);
 await f.patch({id:'b',pt_partner_id:null,package_types:['PT 1:1']});
 return f;}
async function request(f){const cs=await f.all('clients');return {clientId:'a',partnerId:'b',expectedUpdatedAt:cs.find(c=>c.id==='a').updated_at,partnerExpectedUpdatedAt:cs.find(c=>c.id==='b').updated_at};}
const call=(f,p,id=crypto.randomUUID(),actor='owner')=>f.rpc('calendar_reactivate_pair',[actor,id,JSON.stringify(p)]);
test('reactivation repairs the reviewed pair and converts the partner while keeping each package and all appointments',async()=>{
 const f=await fixture();try{
  const p=await request(f),before=await f.all('clients'),appointments=await f.all('appointments');
  await assert.rejects(f.rpc('calendar_client_lifecycle',['owner',crypto.randomUUID(),JSON.stringify({...p,action:'reactivate'})]),/associazione reciproca/,'original Silvia condition is reproduced');
  if(process.env.REPRODUCE_BEFORE_FIX!=='1')await f.db.exec(fs.readFileSync(process.env.REACTIVATION_MIGRATION||path.join(root,'supabase/migrations/20261112104008_calendar_reactivate_historical_pair.sql'),'utf8'));
  const id=crypto.randomUUID(),out=await call(f,p,id);assert.equal(out.mode,'reactivate_pair');
  for(const old of before){const c=(await f.all('clients')).find(c=>c.id===old.id);assert.equal(c.active,true);assert.equal(c.pt_partner_id,old.id==='a'?'b':'a');assert.deepEqual(c.package_types,['PT 1:2']);for(const k of Object.keys(old).filter(k=>!['active','stato_abbonamento','pt_partner_id','package_types','tipo_servizio','updated_at'].includes(k)))assert.deepEqual(c[k],old[k],k);}
  assert.deepEqual(await f.all('appointments'),appointments);const audit=(await f.db.query('select count(*) n from calendar_audit_log')).rows[0].n;assert.deepEqual(await call(f,p,id),out);assert.equal((await f.db.query('select count(*) n from calendar_audit_log')).rows[0].n,audit);
 }finally{await f.close()}
});
test('pair reactivation rolls both people back on failure, rejects a stale partner and keeps permissions',async()=>{
 const f=await fixture();try{
  await f.db.exec(fs.readFileSync(process.env.REACTIVATION_MIGRATION||path.join(root,'supabase/migrations/20261112104008_calendar_reactivate_historical_pair.sql'),'utf8'));
  const p=await request(f),before=await f.all('clients');await assert.rejects(call(f,p,undefined,'pt'),/Direzione/);
  await assert.rejects(call(f,{...p,partnerExpectedUpdatedAt:'2020-01-01T00:00:00Z'}),/cambiato/);
  await f.db.exec(`create function fail_pair_reactivation() returns trigger language plpgsql as $$begin if new.id='b' and new.pt_partner_id='a' then raise exception 'TEST pair failed';end if;return new;end$$;create trigger fail_pair_reactivation before update on clients for each row execute function fail_pair_reactivation()`);
  await assert.rejects(call(f,p),/TEST pair failed/);assert.deepEqual(await f.all('clients'),before);
  for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(f.db.query("select calendar_reactivate_pair('owner',gen_random_uuid(),'{}')"),/permission/);await f.db.exec('reset role');}
 }finally{await f.close()}
});
