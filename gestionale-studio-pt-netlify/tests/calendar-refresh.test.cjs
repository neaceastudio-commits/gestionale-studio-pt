const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function environment(pull){
 let renders=0,paused=false;const c={console,window:{PTAvailabilityOverview:{shouldPauseAutoRefresh:()=>paused}},document:{addEventListener(){}},SupabaseSync:{pullAll:pull},Calendar:{render(){renders++}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/app.js','utf8')+'\nglobalThis.app=App;',c);
 return {app:c.app,renders:()=>renders,pause:()=>paused=true};
}
test('automatic polling with identical data leaves DOM intact; changed data and explicit refresh render once',async()=>{
 let changed=false;const e=environment(async()=>({changed}));await e.app.refreshFromSupabase();assert.equal(e.renders(),0);changed=true;await e.app.refreshFromSupabase();assert.equal(e.renders(),1);changed=false;await e.app.refreshFromSupabase({force:true});assert.equal(e.renders(),2);
});
test('focus, visibility and timer share one in-flight read and one render',async()=>{
 let complete,reads=0;const e=environment(()=>{reads++;return new Promise(r=>complete=r)});const pending=[e.app.refreshFromSupabase(),e.app.refreshFromSupabase(),e.app.refreshFromSupabase()];assert.equal(reads,1);complete({changed:true});await Promise.all(pending);assert.equal(e.renders(),1);assert.equal(e.app._supabaseRefreshInFlight,null);
});
test('failed refresh unlocks retries and availability editing pauses automatic refresh',async()=>{
 let reads=0;const e=environment(async()=>{reads++;if(reads===1)throw Error('SIM_NETWORK');return{changed:true}});await e.app.refreshFromSupabase();assert.equal(e.renders(),0);assert.equal(e.app._supabaseRefreshInFlight,null);await e.app.refreshFromSupabase();assert.equal(e.renders(),1);e.pause();await e.app.refreshFromSupabase();assert.equal(reads,2);
});
