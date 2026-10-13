const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../app/calendario-studio/js/supabase.js','utf8');
function env(fail=false){
 let saved=[{id:'previous'}];const calls=[],appointments=Array.from({length:1234},(_,i)=>({id:'a'+i,date:'2026-10-01',start_time:'09:00',duration_min:60,status:'fatto',service_id:'pt11',client_ids:['c']}));
 const writes={clients:0,operators:0,appointments:0},cache={clients:[],operators:[]};
 const c={console,State:{getClients:()=>cache.clients,getOperators:()=>cache.operators,getAppointments:()=>saved,saveClients(a){cache.clients=a;writes.clients++},saveOperators(a){cache.operators=a;writes.operators++},saveAppointments:a=>{saved=a;writes.appointments++}},localStorage:{setItem(){}},CONFIG:{SERVICES:{}},fetch:async url=>{const u=new URL(url),table=u.pathname.split('/').at(-1),offset=Number(u.searchParams.get('offset'));calls.push({table,offset,limit:u.searchParams.get('limit'),order:u.searchParams.get('order')});if(fail&&table==='appointments'&&offset===500)return {ok:false,status:503,text:async()=> 'SIM_READ_FAIL'};return {ok:true,status:200,text:async()=>JSON.stringify(table==='appointments'?appointments.slice(offset,offset+500):[])};}};
 vm.createContext(c);vm.runInContext(source+'\nglobalThis.sync=SupabaseSync;',c);return {sync:c.sync,calls,writes,appointments,saved:()=>saved};
}
test('pullAll reads beyond the API row limit with stable ordering',async()=>{const e=env();await e.sync.pullAll();assert.equal(e.saved().length,1234);assert.deepEqual(e.calls.filter(x=>x.table==='appointments').map(x=>x.offset),[0,500,1000]);assert.ok(e.calls.every(x=>x.order.endsWith('id.asc')));});
test('a later-page failure never replaces existing appointments with a partial history',async()=>{const e=env(true);await e.sync.pullAll();assert.equal(e.saved()[0].id,'previous');assert.equal(e.saved().length,1);});

test('unchanged remote rows preserve local data; status updates and deletions still apply',async()=>{
 const e=env();assert.equal((await e.sync.pullAll()).changed,true);assert.equal(e.writes.appointments,1);
 assert.equal((await e.sync.pullAll()).changed,false);assert.equal(e.writes.appointments,1);
 e.appointments[0].status='prenotato';assert.equal((await e.sync.pullAll()).changed,true);assert.equal(e.saved()[0].status,'prenotato');assert.equal(e.writes.appointments,2);
 e.appointments.pop();assert.equal((await e.sync.pullAll()).changed,true);assert.equal(e.saved().length,1233);
});
