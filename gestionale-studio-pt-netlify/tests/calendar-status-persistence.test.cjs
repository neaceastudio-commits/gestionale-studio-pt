const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {start,seed,rpc} = require('./helpers/calendar-postgres.cjs');
const root = path.resolve(__dirname,'../app/calendario-studio/js');
function environment(client, transport = {}) {
  const storage = new Map(), toasts = [], inputs = {};
  let queue = Promise.resolve();
  const queued = work => { const next = queue.then(work); queue = next.catch(() => {}); return next; };
  const context = vm.createContext({console:{warn(){}},URLSearchParams,Date, setTimeout, clearTimeout,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{addEventListener(){},getElementById:id=>inputs[id]||null},
    window:{location:{search:''}},confirm:()=>true,
    UI:{showToast:(...v)=>toasts.push(v),closeModal(){}},Calendar:{render(){}},
    fetch:async(url,options={})=>{
      const name=new URL(url).pathname.split('/').pop();
      try {
        let result;
        if(name==='calendar_save_appointment') {
          if(transport.before) throw Error('offline');
          result=await queued(() => rpc(client,name,JSON.parse(options.body)));
          if(transport.after){transport.after=false;throw Error('response lost after commit');}
          if(transport.empty)return {ok:true,status:200,text:async()=>JSON.stringify({})};
        } else {
          assert.ok(['clients','appointments','operators'].includes(name), 'unexpected request '+name);
          assert.equal(options.method,'GET');
          result=(await queued(() => client.query(`select coalesce(jsonb_agg(to_jsonb(x)),'[]') data from ${name} x`))).rows[0].data;
        }
        return {ok:true,status:200,text:async()=>JSON.stringify(result)};
      }catch(e){ if(transport.before||e.message.includes('response lost'))throw e;return {ok:false,status:409,text:async()=>e.message}; }
    }});
  for(const [file,name] of [['config.js','CONFIG'],['state.js','State'],['package-ledger.js','PackageLedger'],['services.js','Services'],['supabase.js','SupabaseSync'],['app.js','App']]) {
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8')+`\nglobalThis.${name}=${name};window.${name}=${name};`,context);
  }
  context.recordToast = (...v) => toasts.push(v);
  vm.runInContext('UI.closeModal = () => {}; UI.showToast = (...v) => globalThis.recordToast(...v);',context);
  vm.runInContext(fs.readFileSync(path.join(root,'session-fixes.js'),'utf8'),context);
  context.App.guardPortalEdit=()=>true;
  context.App.openPackageOverview=()=>{};
  return { ...context, toasts, inputs };
}
(async()=>{
  const db=await start();
  try {
    const reset=async()=>{
      await seed(db.client);
      await db.client.query("insert into appointments(id,service_id,client_ids,operator_id,date,start_time,duration_min,buffer_min,status,notes) values('a','pt11',array['test'],'pt','2026-09-15','17:00',60,10,'prenotato','[CICLO-PACCHETTO 2026-09-15]')");
    };
    const reloaded=async(expectedStatus,remaining)=>{
      const fresh=environment(db.client); await fresh.SupabaseSync.pullAll();
      assert.equal(fresh.State.getAppointments()[0].status,expectedStatus);
      assert.equal(fresh.State.getClients().find(c=>c.id==='test').sessionsRemaining,remaining);
      return fresh;
    };
    await reset();
    let env=await reloaded('prenotato',8);
    await Promise.all([env.App._markDone('a'),env.App._markDone('a')]);
    env=await reloaded('fatto',7);
    await env.App._markNoShow('a');env=await reloaded('noshow',8);
    await env.App._markDone('a');env=await reloaded('fatto',7);
    await env.App._markCancelled('a');await reloaded('annullato',8);
    console.log('PASS UI → REST adapter → PostgreSQL → fresh reload: Fatto twice, no-show, Fatto, cancel; balance 8→7→8→7→8');
    for(const mode of ['before','after','empty']) {
      await reset();const transport={[mode]:true};env=environment(db.client,transport);await env.SupabaseSync.pullAll();
      await env.App._markDone('a');
      assert.equal(env.State.getAppointments()[0].status,'prenotato');
      assert.equal(env.State.getClients().find(c=>c.id==='test').sessionsRemaining,8);
      assert.equal(env.toasts.at(-1)[1],'error');
      if(mode==='before'){await reloaded('prenotato',8);transport.before=false;}
      else await reloaded('fatto',7);
      transport.empty=false;
      await env.App._markDone('a');await reloaded('fatto',7);
    }
    console.log('PASS connection failure, response lost after commit, malformed acknowledgment: no false success, retry never consumes twice');
    await reset();env=await reloaded('prenotato',8);
    Object.assign(env.inputs,{'appt-service':{value:'pt11'},'appt-date':{value:'2026-09-15'},'appt-time':{value:'17:00'},'appt-duration':{value:'60'},'appt-operator':{value:'pt'},'appt-status':{value:'fatto'},'appt-notes':{value:'[CICLO-PACCHETTO 2026-09-15]'},'appt-clients':{selectedOptions:[{value:'test'}]}});
    await env.App._saveAppointment('a');await reloaded('fatto',7);
    env=await reloaded('fatto',7);
    Object.assign(env.inputs,{'pkg-date-a':{value:'2026-09-16'},'pkg-time-a':{value:'17:00'},'pkg-operator-a':{value:'pt'},'pkg-status-a':{value:'annullato'}});
    await env.App._updatePackageAppointmentRow('a');await reloaded('annullato',8);
    console.log('PASS modal save and package-row save use the same atomic persistence path');
    await reset();await db.client.query('delete from appointments');
    const lost={after:true};env=environment(db.client,lost);await env.SupabaseSync.pullAll();
    Object.assign(env.inputs,{'appt-service':{value:'pt11',dataset:{}},'appt-date':{value:'2026-09-15'},'appt-time':{value:'17:00'},'appt-duration':{value:'60'},'appt-operator':{value:'pt'},'appt-status':{value:'fatto'},'appt-notes':{value:'[CICLO-PACCHETTO 2026-09-15]'},'appt-clients':{selectedOptions:[{value:'test'}]}});
    await env.App._saveAppointment('');assert.equal(env.State.getAppointments().length,0);
    await env.App._saveAppointment('');
    assert.equal((await db.client.query('select count(*)::int n from appointments')).rows[0].n,1);
    await reloaded('fatto',7);
    console.log('PASS new appointment keeps the same ID after a lost response and does not consume twice');
    await reset();env=await reloaded('prenotato',8);
    await db.client.query("create function fail_appt() returns trigger language plpgsql as $$begin raise exception 'simulated appointment failure';end$$;create trigger fail_appt before update on appointments for each row execute function fail_appt()");
    await env.App._markDone('a');await reloaded('prenotato',8);assert.equal(env.toasts.at(-1)[1],'error');
    console.log('PASS appointment failure rolls back the already updated client balance');
  }finally{await db.close();}
})().catch(e=>{console.error(e);process.exit(1)});
