const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { PGlite } = require(require.resolve('@electric-sql/pglite', { paths: [path.resolve(__dirname, '../tools/coaching-editor')] }));
const { createHandler } = require('../netlify/functions/lib/studio-private-endpoint.cjs');
const { readCalendarPackage } = require('../netlify/functions/lib/calendar-package-read.cjs');

const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261119182429_calendar_package_summaries.sql'), 'utf8');
const schema = `
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create table public.clients(
    id text primary key, nome text, cognome text, active boolean, pt_assegnato text,
    notes text, data_conferma date, data_inizio date, package_start date,
    sessions_total integer, sessions_remaining integer
  );
  create table public.appointments(
    id text primary key, client_ids jsonb, service_id text, operator_id text, date date,
    start_time time, status text, notes text, duration_min integer default 60
  );
  create table public.trainer_client_assignments(trainer_id text, client_id text, active boolean);
  alter table public.clients enable row level security;
  alter table public.appointments enable row level security;
  alter table public.trainer_client_assignments enable row level security;
  grant select on all tables in schema public to service_role;
`;
const appRoot = process.env.CALENDAR_WEB_ROOT || path.join(__dirname, '../app/calendario-studio/js');
const readJS = file => fs.readFileSync(path.join(appRoot, file + '.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const date = '2026-11-19';

function reference() {
  const fixture = vm.createContext({});
  vm.runInContext(`Date = class extends Date { constructor(...args) { super(...args.length ? args : ['2026-11-19T12:00:00Z']); } };`, fixture);
  for (const file of ['config', 'package-ledger', 'pt-session-model', 'services', 'clients']) vm.runInContext(readJS(file), fixture);
  return vm.runInContext(`(c, app) => {
    const client = {id:c.id, notes:c.notes, packageCycleStart:c.notes.match(/\\[CICLO-PACCHETTO\\s+(\\d{4}-\\d{2}-\\d{2})\\]/i)?.[1] || c.data_conferma,
      sessionsTotal:c.sessions_total, sessionsRemaining:c.sessions_remaining, packageStart:c.package_start, acquisitionStart:c.data_inizio};
    const appointments = app.map(a => ({id:a.id, clientIds:a.client_ids, date:a.date, startTime:a.start_time, serviceId:a.service_id, status:a.status, notes:a.notes}));
    const metrics=Services.getClientSessionMetrics(client,null,appointments);
    const context=Services.getPackageCycleContext(client,appointments);
    const all=Services.getClientPackageAppointments(client,{includeCancelled:true},appointments).sort((a,b)=>a.date.localeCompare(b.date));
    const cycle=all.filter(a=>a.status!=='annullato'&&Services.appointmentInCurrentPackageCycle(a,client,context));
    return {metrics,dates:{
      next:cycle.find(a=>a.date>='2026-11-19'&&a.status==='prenotato')?.date ?? null,
      lastDone:cycle.findLast(a=>a.status==='fatto')?.date ?? null,
      lastDoneLifetime:all.findLast(a=>a.status==='fatto')?.date ?? null,
      lastPlanned:cycle.at(-1)?.date ?? null,
    }};
  }`,fixture);
}

test('SQL matches browser package counts and dates for history over 500 rows, renewals, pairs and adjustments', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(schema);
    await pg.exec(migration);
    const tag = (name, data) => '['+name+']'+JSON.stringify(data)+'[/'+name+']';
    const ledger = tag('NEACEA-PACKAGE-LEDGER-V1',{cycles:[
      {id:'old',startDate:'2026-09-01',closedAt:'2026-11-01'},
      {id:'current',startDate:'2026-11-01',legacy:false,sessionAdjustments:[{sessions:1},{sessions:0},{sessions:'2'},{sessions:-1}]},
    ]});
    const pair = tag('NEACEA-PT-SESSION-V1',{version:1,participants:{
      pair:{status:'noshow',cycleId:'current',start:'2026-11-01'},
      'legacy.id!':{status:'fatto',cycleId:'',start:'2026-11-04'},
    }});
    const rows = [
      ['pair', 'pt-a', ledger, '2026-11-02', null, 8, 3],
      ['legacy.id!', 'pt-a', '', null, '2026-10-01', 12, 1],
      ['large', 'pt-b', '[CICLO-PACCHETTO 2026-09-01]', null, null, 800, 80],
      ['historical', 'pt-b', '', null, '2026-09-01', 4, 1],
      ['shared', 'pt-b', '', null, '2026-09-01', 4, 1],
      ['private', 'pt-b', '', null, '2026-09-01', 4, 1],
    ];
    for (const row of rows) await pg.query(`insert into public.clients
      (id,pt_assegnato,notes,data_conferma,data_inizio,sessions_total,sessions_remaining)
      values($1,$2,$3,$4,$5,$6,$7)`, row);
    await pg.exec("insert into public.trainer_client_assignments values ('pt-a','shared',true),('pt-a','private',false)");
    const lesson = (id,clientIds,operatorId,day,status,notes,service='pt11') =>
      pg.query(`insert into public.appointments
        (id,client_ids,operator_id,date,status,notes,service_id,start_time)
        values($1,$2,$3,$4,$5,$6,$7,'10:00')`,
      [id,JSON.stringify(clientIds),operatorId,day,status,notes,service]);
    await lesson('mixed',['pair','legacy.id!'],'pt-a','2026-11-04','fatto',pair,'pt12');
    await lesson('early',['pair'],'pt-a','2026-10-29','fatto','[CICLO-PACCHETTO-ID current]');
    await lesson('previous',['pair','legacy.id!'],'pt-a','2026-10-06','fatto','[CICLO-PACCHETTO 2026-10-01]');
    await lesson('charged',['pair'],'pt-b','2026-11-14','noshow','[CICLO-PACCHETTO-ID current] [ASSENZA-SCALATA]');
    await lesson('old-no-show',['legacy.id!'],'pt-a','2026-11-10','noshow','[CICLO-PACCHETTO 2026-11-04]');
    await lesson('cancelled',['legacy.id!'],'pt-a','2026-11-12','annullato','[CICLO-PACCHETTO 2026-11-04]');
    await lesson('current-future',['legacy.id!'],'pt-a','2026-11-23','prenotato','Rinnovo pacchetto da 2026-05-01. Rinnovo pacchetto da 2026-11-04');
    await lesson('renewal',['legacy.id!'],'pt-a','2026-11-21','prenotato','[RINNOVO-PREVISTO 1] [CICLO-PACCHETTO 2026-12-01]');
    await lesson('legacy-import',['historical'],'pt-a','2026-09-01','fatto','','visbody');
    await pg.exec(`insert into public.appointments(id,client_ids,service_id,operator_id,date,start_time,status,notes)
      select 'many-' || lpad(n::text,4,'0'),'["large","large"]','pt11','pt-b','2026-10-01','10:00','fatto',''
      from generate_series(1,740) n`);
    const all = (await pg.query('select to_jsonb(a) as row from public.appointments a')).rows.map(x=>x.row);
    const compare = reference();
    await pg.exec('set role service_role');
    const summary = async (actor,role) => (await pg.query(
      'select public.calendar_package_summaries($1,$2,$3,500,0) as result', [actor,role,date])).rows.map(x=>x.result);
    const owner = await summary('staff_1','owner');
    assert.equal(owner.length,6);
    assert.equal(owner.find(x=>x.client.id==='large').metrics.lifetimeCompleted,740);
    for (const {client,metrics,dates} of owner) assert.deepEqual({metrics,dates},plain(compare(client,all)),client.id);
    const pt = await summary('pt-a','pt');
    assert.deepEqual(pt.map(x=>x.client.id).sort(),['historical','legacy.id!','pair','shared']);
    for (const {client,metrics,dates} of pt) assert.deepEqual({metrics,dates},plain(compare(client,all.filter(a=>a.operator_id==='pt-a'))),client.id);
    assert.equal(pt.find(x=>x.client.id==='pair').metrics.chargedAbsences,1);
    const detail = async (actor,role,id,limit=500,offset=0) => (await pg.query(
      'select id,operator_id from public.calendar_client_history($1,$2,$3,$4,$5)',[actor,role,id,limit,offset])).rows;
    assert.deepEqual(await detail('pt-a','pt','private'),[]);
    assert.ok((await detail('pt-a','pt','pair')).every(a=>a.operator_id==='pt-a'));
    assert.equal((await detail('staff_1','owner','large',500,500)).length,240);
    assert.deepEqual((await detail('pt-a','pt','legacy.id!',2)).map(x=>x.id),['current-future','renewal']);
    assert.deepEqual(await summary('staff_1','unknown'),[]);
    await pg.exec('reset role; set role anon');
    await assert.rejects(summary('staff_1','owner'),{code:'42501'});
    await assert.rejects(detail('staff_1','owner','pair'),{code:'42501'});
    await pg.exec('reset role; set role authenticated');
    await assert.rejects(summary('staff_1','owner'),{code:'42501'});
  } finally { await pg.close(); }
});

test('the Calendar gateway uses only the authenticated actor and exact client scope', async () => {
  const calls=[];
  const authenticate = async token=>token==='PT' ? {id:'pt-a',role:'pt'} : null;
  const db=async (route,options)=>{calls.push({route,options});return [];};
  const handle=createHandler({authenticate,db,readCalendarPackage});
  const read=async body=>handle({httpMethod:'POST',body:JSON.stringify(body)});
  const history={table:'calendar_client_history',method:'GET',query:'?client=legacy.id%21&limit=51&offset=50',
    body:{p_actor_id:'staff_1',p_actor_role:'owner'}};
  assert.equal((await read(history)).statusCode,401);
  assert.equal((await read({...history,accessToken:'PT',method:'PATCH'})).statusCode,403);
  assert.equal((await read({...history,accessToken:'PT',query:history.query+'&operator=staff_1'})).statusCode,400);
  assert.equal((await read({...history,accessToken:'PT',query:'?client=a&client=b'})).statusCode,400);
  assert.deepEqual(calls,[]);
  const response=await read({...history,accessToken:'PT'});
  assert.equal(response.statusCode,200);
  assert.deepEqual(JSON.parse(response.body),{version:1,rows:[]});
  assert.deepEqual(calls,[{route:'rpc/calendar_client_history',options:{method:'POST',
    body:{p_actor_id:'pt-a',p_actor_role:'pt',p_client_id:'legacy.id!',p_limit:51,p_offset:50}}}]);
  assert.equal((await read({table:'calendar_package_summaries',accessToken:'PT',query:'?day=2026-11-19&limit=600'})).statusCode,400);
  assert.equal((await read({table:'calendar_package_summaries',accessToken:'PT',query:'?day=2026-11-19'})).statusCode,200);
  assert.equal(calls[1].options.body.p_day,date);
});

test('dashboard transmits today and totals; individual lessons are only fetched on request', async () => {
  const calls=[];
  let stateAppointments=[{id:'original-history'}];
  let today;
  const context=vm.createContext({
    URLSearchParams, localStorage:{setItem(){}},
    State:{
      getClients:()=>[],getOperators:()=>[],getAppointments:()=>stateAppointments,
      saveClients(){},saveOperators(){},saveAppointments(value){stateAppointments=value;},
      showAgenda(value){today=value;},
    },
    window:{NeaceaPrivateData:{
      supports:()=>true,
      async read(table,query) {
        const args = new URLSearchParams(query);
        calls.push({table,query});
        if(table==='calendar_package_summaries')return {version:1,rows:[{client:{id:'a'},metrics:{total:80,remaining:49},dates:{}}]};
        if(table==='appointments') {
          assert.equal(args.get('date'),'eq.'+date);
          return [{id:'today',date}];
        }
        if(table==='calendar_client_history') {
          assert.equal(args.get('client'),'a');
          return {version:1,rows:Array.from({length:51},(_,i)=>({id:'historic-'+i,date:'2026-10-12'}))};
        }
        assert.equal(table,'operators');
        return [];
      },
    }},
  });
  vm.runInContext(readJS('supabase'),context);
  const sync=vm.runInContext('SupabaseSync',context);
  assert.equal((await sync.pullDashboard(date)).changed,true);
  assert.equal(today[0].id,'today');
  assert.equal(sync.dashboardSnapshot().packages.a.metrics.remaining,49);
  assert.equal((await sync.pullDashboard(date)).changed,false);
  assert.deepEqual(stateAppointments,[{id:'original-history'}]);
  assert.equal(calls.filter(c=>c.table==='calendar_client_history').length,0);
  const detail=await sync.pullClientHistory('a');
  assert.equal(detail.appointments.length,50);
  assert.equal(detail.more,true);
  assert.deepEqual(stateAppointments,[{id:'original-history'}]);
});
