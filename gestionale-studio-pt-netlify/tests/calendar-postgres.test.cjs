const assert = require('node:assert/strict');
const { start, seed, rpc } = require('./helpers/calendar-postgres.cjs');
const planner = require('../netlify/functions/lib/package-calendar-planner');
const row = (id, client = 'test', op = 'pt') => ({ id, service_id:'pt11', client_ids:[client], operator_id:op, date:'2026-09-15', start_time:'17:00:00', duration_min:60, buffer_min:10, status:'prenotato', notes:'[CICLO-PACCHETTO 2026-09-15]' });
(async () => {
  const db = await start();
  const b = await db.connection();
  try {
    await seed(db.client);
    const snap = await rpc(db.client, 'calendar_planning_snapshot');
    const plan = planner.planPackageAppointments({ client: snap.clients[0], appointments: snap.appointments, operators:snap.operators, availability:snap.availability, clients:snap.clients, serviceId:'pt11', operatorId:'pt2', startDate:'2026-09-15', schedule:[{weekday:'Martedì',time:'17:00'}] });
    assert.equal(plan.created.length,8);
    const params = { p_revision: snap.revision, p_client_id:'test', p_rows:[row('a')] };
    await db.client.query('begin');
    const first = await rpc(db.client,'calendar_commit_package',params);
    let finished = false;
    const parallel = rpc(b,'calendar_commit_package',{ ...params, p_rows:[row('b')] }).then(r => { finished=true; return r; });
    // A separate connection is held at the lock until the first transaction commits.
    await new Promise(r=>setTimeout(r,100)); assert.equal(finished,false);
    await db.client.query('commit');
    assert.equal(first.success,true); assert.equal((await parallel).code,'calendar_changed');
    assert.equal((await db.client.query('select count(*)::int n from appointments')).rows[0].n,1);
    console.log('PASS PostgreSQL: concurrent connections cannot commit the same snapshot twice');
    // Stale availability and stale other-client/same-room bookings also invalidate.
    for (const mutate of ["update operator_availability set slots='[]' where operator_id='pt'", "insert into appointments(id,client_ids,date,status) values('external',array['other'],'2026-09-15','prenotato')"]) {
      const s = await rpc(db.client,'calendar_planning_snapshot'); await b.query(mutate);
      assert.equal((await rpc(db.client,'calendar_commit_package',{...params,p_revision:s.revision,p_rows:[row('blocked')]})).success,false);
    }
    console.log('PASS PostgreSQL: availability changes and external REST-equivalent writes invalidate the plan');
    await seed(db.client);
    const s = await rpc(db.client,'calendar_planning_snapshot');
    await assert.rejects(rpc(db.client,'calendar_commit_package',{...params,p_revision:s.revision,p_rows:[row('same'),row('same')]}));
    assert.equal((await db.client.query('select count(*)::int n from appointments')).rows[0].n,0);
    console.log('PASS PostgreSQL: partial batch failure rolls back every appointment');
    await rpc(db.client,'calendar_commit_package',{...params,p_revision:s.revision});
    const original = (await rpc(db.client,'calendar_planning_snapshot')).appointments[0];
    const done = {...original,status:'fatto'};
    let result = await rpc(db.client,'calendar_save_appointment',{p_appointment:done,p_expected:original});
    assert.equal(result.clients[0].sessions_remaining,7);
    result = await rpc(b,'calendar_save_appointment',{p_appointment:done,p_expected:original});
    assert.equal(result.clients[0].sessions_remaining,7);
    assert.equal((await b.query("select status from appointments where id='a'")).rows[0].status,'fatto');
    await assert.rejects(rpc(b,'calendar_save_appointment',{p_appointment:{...original,status:'annullato'},p_expected:original}), /changed/);
    const savedDone = result.appointment;
    result = await rpc(b,'calendar_save_appointment',{p_appointment:{...savedDone,date:'2026-09-16'},p_expected:savedDone});
    assert.equal(result.clients[0].sessions_remaining,7);
    result = await rpc(b,'calendar_save_appointment',{p_appointment:{...result.appointment,status:'annullato'},p_expected:result.appointment});
    assert.equal(result.clients[0].sessions_remaining,8);
    console.log('PASS PostgreSQL: Fatto, repeat after lost response, reload, move, stale edit and cancellation');
    await db.client.query("create function fail_balance() returns trigger language plpgsql as $$begin raise exception 'simulated balance failure'; end$$; create trigger fail_balance before update on clients for each row execute function fail_balance()");
    await assert.rejects(rpc(b,'calendar_save_appointment',{p_appointment:{...result.appointment,status:'fatto'},p_expected:result.appointment}), /simulated balance failure/);
    assert.equal((await b.query("select status from appointments where id='a'")).rows[0].status,'annullato');
    await db.client.query('drop trigger fail_balance on clients');
    console.log('PASS PostgreSQL: client counter failure rolls back Fatto');
    // Old cycles and non-package services never alter the current balance.
    const currentClient = (await rpc(db.client,'calendar_planning_snapshot')).clients.find(c=>c.id==='test');
    const ledger = {cycles:[{id:'new-cycle',startDate:'2026-09-15',legacy:false}]};
    const ledgerClient = {...currentClient,notes:'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify(ledger)+'[/NEACEA-PACKAGE-LEDGER-V1]'};
    for (const [appointment, expected] of [[{...done,service_id:'nutrizione'},false],[{...done,date:'2026-09-01',notes:'[CICLO-PACCHETTO-ID old-cycle]'},false],[{...done,notes:'[CICLO-PACCHETTO-ID new-cycle]'},true]]) {
      const check = await db.client.query('select public.calendar_uses_current_session($1,$2) as value',[JSON.stringify(appointment),JSON.stringify(ledgerClient)]);
      assert.equal(check.rows[0].value,expected);
    }
    console.log('PASS PostgreSQL: old cycles and nutrition excluded; explicit current cycle included');
    // Public roles cannot call planning/commit. Existing table RLS is preserved.
    await b.query('set role anon');
    await assert.rejects(rpc(b,'calendar_planning_snapshot'), /permission denied/);
    await assert.rejects(rpc(b,'calendar_commit_package',params), /permission denied/);
    await b.query('reset role');
    await db.client.query('alter table clients enable row level security; create policy read_clients on clients for select to anon using (true)');
    await b.query('set role anon');
    await assert.rejects(rpc(b,'calendar_save_appointment',{p_appointment:{...result.appointment,status:'fatto'},p_expected:result.appointment}), /Client balance not saved/);
    await b.query('reset role');
    assert.equal((await b.query("select status from appointments where id='a'")).rows[0].status,'annullato');
    console.log('PASS PostgreSQL: invoker privileges and denied RLS updates fail without partial writes');
    await db.client.query('alter table clients disable row level security');
    await seed(db.client);
    await db.client.query("insert into operators(id,nome,cognome,email,roles) values('owner','Direzione','SIM','owner@example.test',array['owner']); create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators; grant select on operator_effective_roles to service_role");
    await db.client.query(require('node:fs').readFileSync(require('node:path').join(__dirname,'../supabase/migrations/20260912212042_calendar_activity_audit.sql'),'utf8'));
    process.env.PT_ACCESS_SECRET='local-test'; process.env.SUPABASE_SERVICE_ROLE_KEY='local-test';
    const {handler}=require('../netlify/functions/schedule-client-package');
    const crypto=require('node:crypto');
    const payload=Buffer.from(JSON.stringify({email:'owner@example.test',operatorId:'owner',accessLevel:'owner',exp:Date.now()+60000})).toString('base64url');
    const accessToken=payload+'.'+crypto.createHmac('sha256','local-test').update(payload).digest('base64url');
    const originalFetch=global.fetch;
    global.fetch=async(url,options={})=>{
      const name=new URL(url).pathname.split('/').pop(); let data;
      if(name==='operator_effective_roles') data=[{operator_id:'owner',system_roles:['owner']}];
      else {
        const connection=await db.connection();
        try { await connection.query('set role service_role'); data=await rpc(connection,name,JSON.parse(options.body||'{}')); } finally {await connection.end();}
      }
      return {ok:true,status:200,text:async()=>JSON.stringify(data)};
    };
    try {
      const request={httpMethod:'POST',body:JSON.stringify({accessToken,clientId:'test',serviceId:'pt11',operatorId:'pt',startDate:'2026-09-15',schedule:[{weekday:'Martedì',time:'17:00'},{weekday:'Giovedì',time:'18:00'}]})};
      const responses=await Promise.all([handler(request),handler(request)]);
      assert.ok(responses.every(r=>[200,409].includes(r.statusCode)));
      assert.equal((await db.client.query('select count(*)::int n from appointments')).rows[0].n,8);
      assert.equal((await db.client.query("select sessions_remaining n from clients where id='test'")).rows[0].n,8);
      assert.equal(JSON.parse((await handler(request)).body).plan.created,0);
      assert.equal((await db.client.query("select count(*)::int n from calendar_audit_log where action='package_appointment_created'")).rows[0].n,8);
      console.log('PASS actual scheduler handler with concurrent PostgreSQL connections: exactly 8 rows, retry creates 0');
    } finally {global.fetch=originalFetch;}
  } finally { await b.end(); await db.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
