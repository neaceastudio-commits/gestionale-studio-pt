const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const {open}=require(path.join(root,'tests/helpers/calendar-recovery-db.cjs'));
const staged=process.env.SCHEDULE_MIGRATION||path.join(root,'supabase/migrations/20261112103135_calendar_package_schedule.sql');
async function fixture(pair=false){const f=await open(pair);await f.db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20260912225335_calendar_audit_assignment_partial_unique.sql'),'utf8'));await f.seed(pair);if(process.env.REPRODUCE_BEFORE_FIX!=='1')await f.db.exec(fs.readFileSync(staged,'utf8'));return f;}
async function plan(f){const rows=(await f.all('appointments')).filter(a=>a.status==='prenotato');return {clientId:'a',fromDate:'2099-11-01',slots:[{day:2,time:'09:00'},{day:4,time:'18:00'}],clients:(await f.all('clients')).map(c=>({id:c.id,expectedUpdatedAt:c.updated_at})),expectedAppointments:rows};}
const call=(f,p,id=crypto.randomUUID(),preview=false,actor='owner')=>f.rpc('calendar_package_schedule',[actor,id,JSON.stringify(p),preview]);
for(const pair of [false,true])test('weekly plan: read-only preview, atomic persistence, same IDs/money and retry '+(pair?'pair':'single'),async()=>{
 const f=await fixture(pair);try{
  const p=await plan(f),id=crypto.randomUUID(),before=await f.all('appointments'),clients=await f.all('clients');
  const preview=await call(f,p,id,true);assert.equal(preview.preview,true);assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await f.all('clients'),clients);
  assert.deepEqual(preview.appointments.map(a=>a.id),p.expectedAppointments.sort((a,b)=>(a.date+a.start_time).localeCompare(b.date+b.start_time)).map(a=>a.id));
  const result=await call(f,p,id);assert.equal(result.appointments.length,2);
  for(const a of result.appointments){const day=new Date(a.date+'T12:00:00Z').getUTCDay();assert.equal(a.start_time.slice(0,5),p.slots.find(s=>s.day===day).time);const old=before.find(b=>b.id===a.id);for(const k of ['notes','client_ids','operator_id','duration_min','status'])assert.deepEqual(a[k],old[k]);}
  for(const old of clients){const c=(await f.all('clients')).find(c=>c.id===old.id);for(const key of Object.keys(old).filter(k=>!['updated_at','notes'].includes(k)))assert.deepEqual(c[key],old[key],key);assert.ok(c.notes.startsWith(old.notes));}
  for(const a of before.filter(a=>a.status==='fatto'))assert.deepEqual((await f.all('appointments')).find(b=>b.id===a.id),a);
  const after=await f.all('appointments'),audit=(await f.db.query('select count(*) n from calendar_audit_log')).rows[0].n;assert.deepEqual(await call(f,p,id),result);assert.deepEqual(await f.all('appointments'),after);assert.equal((await f.db.query('select count(*) n from calendar_audit_log')).rows[0].n,audit);
  const recovered=await f.recover(result.appointments[0]);const d=new Date(recovered.recovery.date+'T12:00:00Z').getUTCDay();assert.equal(recovered.recovery.start_time.slice(0,5),p.slots.find(s=>s.day===d).time,'recovery follows new day-specific hour');
 }finally{await f.close()}
});
test('stale preview, failed last write, unauthorized actors and invalid slots cannot partially move lessons',async()=>{
 const f=await fixture();try{
  let p=await plan(f);const before=await f.all('appointments'),clients=await f.all('clients');
  await assert.rejects(call(f,p,undefined,false,'pt'),/Direzione/);
  await assert.rejects(call(f,{...p,slots:[p.slots[0],p.slots[0]]}),/duplicati/);
  await f.db.exec(`create function reject_schedule() returns trigger language plpgsql as $$begin if new.notes like '%NEACEA-SCHEDULE%' then raise exception 'TEST schedule failed';end if;return new;end$$;create trigger reject_schedule before update on clients for each row execute function reject_schedule()`);
  await assert.rejects(call(f,p),/TEST schedule failed/);assert.deepEqual(await f.all('appointments'),before);assert.deepEqual(await f.all('clients'),clients);await f.db.exec('drop trigger reject_schedule on clients');
  const source=p.expectedAppointments[0];await f.write({...source,status:'fatto'},source);const changed=await f.all('appointments');await assert.rejects(call(f,p),/Lezioni cambiate|Pacchetto cambiato/);assert.deepEqual(await f.all('appointments'),changed);
  for(const role of ['anon','authenticated']){await f.db.exec('set role '+role);await assert.rejects(f.db.query("select calendar_package_schedule('owner',gen_random_uuid(),'{}',true)"),/permission/);await f.db.exec('reset role');}
 }finally{await f.close()}
});

test('weekly pattern is effective from its date, scoped to the current cycle and preserved when editing visible notes',async()=>{
 const f=await fixture();try{
  const p=await plan(f);p.fromDate='2099-11-03';p.expectedAppointments=p.expectedAppointments.filter(a=>a.date>=p.fromDate);
  await call(f,p);const client=(await f.all('clients'))[0],weekly=require(path.join(root,'app/calendario-studio/js/package-schedule.js'));
  assert.equal(weekly.at(client,'2099-11-02').find(s=>s.day===1).time,'17:00');assert.deepEqual(weekly.at(client,'2099-11-03'),p.slots);
  const visible=weekly.strip(client.notes);assert.ok(!visible.includes('NEACEA-SCHEDULE'));const edited={...client,notes:weekly.preserve(visible+'\nNota aggiornata',client.notes)};assert.deepEqual(weekly.at(edited,'2099-11-03'),p.slots);
  const ledger=client.notes.match(/\[NEACEA-PACKAGE-LEDGER-V1\]([\s\S]*?)\[\/NEACEA-PACKAGE-LEDGER-V1\]/)[1],next=JSON.parse(ledger);next.cycles[0].id='next';next.cycles[0].startDate='2100-01-01';const renewed={...client,notes:client.notes.replace(ledger,JSON.stringify(next))};
  assert.equal(weekly.at(renewed,'2100-01-02'),null);assert.equal((await f.q('select calendar_schedule_at($1,$2) s',[JSON.stringify(renewed),'2100-01-02'])).rows[0].s,null);
  assert.equal((await f.all('appointments')).find(a=>a.id==='source').date,'2099-11-02','lesson before the effective date stays put');
 }finally{await f.close()}
});

test('preview warns about room capacity against the resulting agenda without writing the plan',async()=>{
 const f=await fixture();try{
  const p=await plan(f),preview=await call(f,p,undefined,true),a=preview.appointments[0];
  for(let i=0;i<6;i++){
   const id='room-client-'+i;await f.rpc('calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'client',JSON.stringify({rows:[{id,nome:id,active:true,package_types:['PT 1:1'],sessions_total:8,sessions_remaining:8,pt_assegnato:'pt',package_start:'2099-10-01',notes:'[CICLO-PACCHETTO 2099-10-01]'}]})]);
   await f.write({...a,id:'room-booking-'+i,client_ids:[id],notes:'[CICLO-PACCHETTO 2099-10-01]'});
  }
  const result=await call(f,{...p,clients:(await f.all('clients')).filter(c=>c.id==='a').map(c=>({id:c.id,expectedUpdatedAt:c.updated_at}))},undefined,true);
  assert.ok(result.warnings.some(w=>w.id===a.id&&w.code==='room_capacity'));
  assert.equal((await f.all('appointments')).find(x=>x.id===a.id).date,p.expectedAppointments.find(x=>x.id===a.id).date);
 }finally{await f.close()}
});
