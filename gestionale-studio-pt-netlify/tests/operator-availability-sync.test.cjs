const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../app/calendario-studio/js');
const key='neacea_pt_declared_availability_v4';
const fixture=()=>Array.from({length:36},(_,i)=>({operator_id:'SIM_'+Math.floor(i/6),day_key:['mon','tue','wed','thu','fri','sat'][i%6],slots:['09:00-10:00'],updated_at:'2026-01-01T00:00:00Z'}));
const mapped=rows=>{const out={};for(const r of rows)(out[r.operator_id]??={})[r.day_key]={slots:r.slots,updatedAt:r.updated_at};return out};
async function setup(local={},rows=fixture()){
 let ready,editor=[];let failRead=false,failPost=false;
 const cache=new Map([[key,JSON.stringify(local)]]),calls=[];const remote=structuredClone(rows);const message={textContent:''};
 const c=vm.createContext({window:{},console:{warn(){}},setTimeout(){},document:{addEventListener:(n,f)=>{if(n==='DOMContentLoaded')ready=f},getElementById:id=>id==='pt-staff-save-result'?message:null,querySelectorAll:selector=>selector==='[data-pt-staff-day]'?editor:[]},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},fetch:async(url,options)=>{
  const u=new URL(url);assert.equal(u.pathname,'/rest/v1/operator_availability');const body=options.body?JSON.parse(options.body):null;calls.push({method:options.method,body});
  if((options.method==='GET'&&failRead)||(options.method==='POST'&&failPost))return {ok:false,status:503,text:async()=>'SIMULATED_FAILURE'};
  if(options.method==='POST'){assert.equal(u.searchParams.get('on_conflict'),'operator_id,day_key');for(const r of body){const old=remote.find(x=>x.operator_id===r.operator_id&&x.day_key===r.day_key);if(old)Object.assign(old,r);else remote.push(r)}return {ok:true,status:204}}
  assert.equal(options.method,'GET');return {ok:true,status:200,text:async()=>JSON.stringify(remote)};
 }});
 vm.runInContext(fs.readFileSync(path.join(root,'supabase.js'),'utf8')+'\nglobalThis.SupabaseSync=SupabaseSync;',c);
 vm.runInContext(fs.readFileSync(path.join(root,'pt-availability-overview.js'),'utf8'),c);
 const open=async()=>{ready();await new Promise(r=>setImmediate(r))};
 const edit=(op,day,slots)=>{editor=[{getAttribute:n=>n==='data-operator-key'?op:day,querySelectorAll:()=>slots.map(value=>({value}))}]};
 return {open,edit,calls,remote,cache,message,save:()=>c.window.PTAvailabilityOverview.saveStaffAvailability(),push:data=>c.SupabaseSync.pushOperatorAvailability(data),failRead:value=>failRead=value,failPost:value=>failPost=value};
}
for(const kind of ['empty','36 identical','different'])test('initial load with '+kind+' cache performs GET only',async()=>{
 const local=kind==='empty'?{}:mapped(fixture());if(kind==='different')local.SIM_0.mon.slots=['18:00-19:00'];
 const app=await setup(local);await app.open();assert.deepEqual(app.calls.map(c=>c.method),['GET']);assert.equal(app.remote.length,36);assert.equal(app.remote[0].updated_at,'2026-01-01T00:00:00Z');assert.deepEqual(JSON.parse(app.cache.get(key)).SIM_0.mon.slots,['09:00-10:00']);
});
test('manual edit and Save sends only changed row, including clearing slots',async()=>{
 const app=await setup(mapped(fixture()));await app.open();app.edit('SIM_0','mon',['10:00-11:00']);await app.save();const posts=app.calls.filter(c=>c.method==='POST');assert.equal(posts.length,1);assert.equal(posts[0].body.length,1);assert.deepEqual(posts[0].body[0].slots,['10:00-11:00']);assert.ok(app.remote[0].updated_at!=='2026-01-01T00:00:00Z');assert.ok(app.remote.slice(1).every(r=>r.updated_at==='2026-01-01T00:00:00Z'));
 app.edit('SIM_0','mon',[]);await app.save();assert.deepEqual(app.remote[0].slots,[]);
});
test('Save unchanged and normalized identical rows never POST',async()=>{
 const app=await setup(mapped(fixture()));await app.open();app.edit('SIM_0','mon',['09:00-10:00']);await app.save();assert.equal(app.calls.filter(c=>c.method==='POST').length,0);
 await app.push({SIM_0:{mon:{slots:[' 09:00-10:00 ','09:00-10:00']}}});assert.equal(app.calls.filter(c=>c.method==='POST').length,0);
});
test('comparison failure blocks write; failed explicit save can be retried',async()=>{
 const app=await setup();await app.open();app.edit('SIM_0','mon',['10:00-11:00']);app.failRead(true);await app.save();assert.equal(app.calls.filter(c=>c.method==='POST').length,0);app.failRead(false);await app.save();assert.deepEqual(app.remote[0].slots,['10:00-11:00']);
});
test('empty remote replaces stale local cache without uploading it',async()=>{
 const app=await setup(mapped(fixture()),[]);await app.open();assert.deepEqual(JSON.parse(app.cache.get(key)),{});assert.deepEqual(app.calls.map(c=>c.method),['GET']);
});
test('offline initial cache remains UI-only; Save without edits cannot upload it',async()=>{
 const local=mapped(fixture());local.SIM_0.mon.slots=['18:00-19:00'];const app=await setup(local);app.failRead(true);await app.open();app.failRead(false);app.edit('SIM_0','mon',['18:00-19:00']);await app.save();assert.equal(app.calls.filter(c=>c.method==='POST').length,0);
});
