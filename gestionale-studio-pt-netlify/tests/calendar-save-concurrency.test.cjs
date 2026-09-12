const assert = require('node:assert/strict');
const {start, seed, rpc} = require('./helpers/calendar-postgres.cjs');
const row = (id, clients, operator, patch={}) => ({id, service_id:'pt11', client_ids:clients,
  operator_id:operator, date:'2026-09-15', start_time:'17:00:00', duration_min:60,
  buffer_min:10, status:'fatto', notes:'[CICLO-PACCHETTO 2026-09-15]', ...patch});
const save = (c, appointment, expected=null) => rpc(c,'calendar_save_appointment',{p_appointment:appointment,p_expected:expected});
(async()=>{
  const db=await start(), b=await db.connection();
  const pid=(await b.query('select pg_backend_pid() pid')).rows[0].pid;
  const snapshot=async()=> (await db.client.query(`select jsonb_build_object(
    'appointments',(select jsonb_agg(to_jsonb(a) order by id) from appointments a),
    'clients',(select jsonb_agg(to_jsonb(c) order by id) from clients c)) data`)).rows[0].data;
  async function reset(){
    await seed(db.client);
    await db.client.query(`insert into clients(id,active,sessions_total,sessions_remaining,data_conferma)
      select 'c'||n,true,8,8,'2026-09-15' from generate_series(1,8) n`);
  }
  async function race(first,second,error,expected=null){
    // Both sessions start before the first save. Wait for actual PostgreSQL
    // lock contention, not just a timer or a simulated parallel promise.
    await db.client.query('begin isolation level read committed');
    await b.query('begin isolation level read committed');
    await save(db.client,first);
    const afterFirst=await snapshot();
    let settled=false;
    const pending=save(b,second,expected).then(value=>({value}),error=>({error})).finally(()=>{settled=true;});
    let waiting=false;
    for(let n=0;n<100;n++){
      const locks=await db.client.query('select 1 from pg_locks where pid=$1 and not granted',[pid]);
      if(locks.rowCount){waiting=true;break;}
      if(settled) break;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(waiting,true,'second connection must wait on the first transaction lock');
    await db.client.query('commit');
    const result=await pending;
    assert.equal(result.error?.code,'23P01');
    assert.match(result.error.message,error);
    await b.query('rollback');
    assert.deepEqual(await snapshot(),afterFirst,'loser must leave appointments, counters and timestamps unchanged');
  }
  try{
    for(const edit of [false,true]){
      for(const kind of ['operator','client','room']){
        await reset();
        const first=row('first',['test'],'pt');
        let second=row('second',[kind==='client'?'test':'other'],kind==='operator'?'pt':'pt2');
        if(kind==='room'){
          Object.assign(first,{service_id:'circuit',client_ids:['c1','c2','c3','c4']});
          Object.assign(second,{service_id:'circuit',client_ids:['c5','c6','c7']});
        }
        const previous=edit?(await save(db.client,{...second,start_time:'19:00:00',status:'prenotato'})).appointment:null;
        await race(first,second,new RegExp(kind==='room'?'room capacity':kind+' occupied'),previous);
        console.log(`PASS concurrent ${edit?'update':'insert'}: ${kind} conflict rejected, no partial appointment/balance changes`);
      }
    }
    await reset();
    await save(db.client,row('a',['test'],'pt'));
    await save(b,row('b',['other'],'pt',{start_time:'18:00:00'}));
    console.log('PASS adjacent sessions do not conflict despite buffer');
    await reset();
    await save(db.client,row('left',['c1','c2','c3','c4'],'p1',{service_id:'circuit',duration_min:30}));
    await save(db.client,row('right',['c1','c2','c3','c4'],'p1',{service_id:'circuit',start_time:'17:30:00',duration_min:30}));
    await save(b,row('spanning',['c5','c6'],'p2',{service_id:'pt12'}));
    console.log('PASS peak room occupancy allows exactly six across disjoint intervals');
    await reset();
    await save(db.client,row('cancelled',['test'],'pt',{status:'annullato'}));
    await save(b,row('active',['other'],'pt'));
    await assert.rejects(save(db.client,row('cancelled',['test'],'pt'),(await rpc(db.client,'calendar_planning_snapshot')).appointments.find(a=>a.id==='cancelled')),/operator occupied/);
    await reset();
    await save(db.client,row('block',[],'pt',{service_id:'blocco',status:'prenotato'}));
    await assert.rejects(save(b,row('blocked',['test'],'pt')),/operator occupied/);
    console.log('PASS cancellation releases slot, reactivation and operator blocks revalidate conflicts');
    await reset();
    await db.client.query("alter table appointments enable row level security; create policy hide_other on appointments for select to anon using (operator_id='pt2')");
    await b.query('set role anon');
    await assert.rejects(save(b,row('hidden-scope',['other'],'pt2')),/complete calendar visibility/);
    await b.query('reset role');
    assert.equal((await db.client.query('select count(*)::int n from appointments')).rows[0].n,0);
    console.log('PASS restricted RLS visibility fails closed instead of overlooking conflicts');
    await db.client.query("create policy full_read on appointments for select to anon using (true); create policy allow_insert on appointments for insert to anon with check (true)");
    await b.query('set role anon');
    await save(b,row('full-scope',['other'],'pt2'));
    await b.query('reset role');
    await db.client.query("create policy narrow_scope on appointments as restrictive for select to anon using (operator_id='pt2')");
    await b.query('set role anon');
    await assert.rejects(save(b,row('restricted',['test'],'pt')),/complete calendar visibility/);
    await b.query('reset role');
    console.log('PASS unrestricted SELECT policy permits validation; restrictive policy fails closed');
    await db.client.query('alter table appointments disable row level security');
    await b.query('begin isolation level repeatable read');
    await assert.rejects(save(b,row('old-snapshot',['test'],'pt')),/READ COMMITTED/);
    await b.query('rollback');
  }finally{await b.query('rollback');await db.client.query('rollback');await b.end();await db.close();}
})().catch(e=>{console.error(e);process.exit(1);});
