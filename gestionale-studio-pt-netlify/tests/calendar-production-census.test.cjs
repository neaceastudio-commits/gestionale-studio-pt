const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('direction calendar link always includes verified session before role branches',()=>{const s=read('app/portale-personal-trainer/index.html'),a=s.indexOf('const calendarUrl = new URL('),z=s.indexOf('window.open(calendarUrl',a),part=s.slice(a,z);assert.ok(part.indexOf('if (!appState.accessToken)')>=0);assert.ok(part.indexOf('calendarUrl.searchParams.set("access", appState.accessToken)')<part.indexOf('if (isAdministrator'))});
test('cruscotto retains authenticated transport and excludes compensation development',()=>{for(const root of ['cruscotto-pt']){const s=read('app/'+root+'/index.html'),fn=s.slice(s.indexOf('async function supabaseWrite'),s.indexOf('function escapeAttr'));assert.match(fn,/StudioAudit.write/);assert.doesNotMatch(fn,/fetch|apikey/);assert.match(s,/studio-audit-access.js/);assert.equal(fs.existsSync(path.join(__dirname,'../app',root,'compensation-engine.js')),false);assert.doesNotMatch(s,/compensation|honorarium|serviceRates|NeaceaCompensation/i);assert.doesNotMatch(s,/saveAppointmentAdmin|localStorage\.setItem/)}});
test('legacy local import and bulk sync cannot perform writes, including direct function calls',async()=>{const s=read('app/calendario-studio/js/app.js');assert.doesNotMatch(s,/onclick="App.syncLocalToSupabase|onchange="App._importFile/);let writes=0;const ctx={UI:{showToast(){}},window:{},fetch:()=>{writes++},URLSearchParams};const c=vm.createContext(ctx);vm.runInContext(read('app/calendario-studio/js/supabase.js')+'\nglobalThis.sync=SupabaseSync.pushLocalSnapshot',c);assert.equal((await c.sync({clients:[{id:'SIM'}]})).success,false);assert.equal(writes,0);assert.match(s,/async _importFile\(\) \{ UI.showToast\('Importazione locale disabilitata'/);assert.match(read('app/calendario-studio/js/config.js'),/SHEETS:\s*\{ enabled: false \}/)});

test('restored Centrale routes protected writes through authenticated Studio service',()=>{
 const html=read('app/portale-pt-fase1/index.html'), js=read('app/portale-pt-fase1/js/portal.js');
 assert.match(html,/studio-audit-access.js/);assert.match(html,/js\/portal.js/);
 assert.match(js,/return window.StudioAudit.write/);
 assert.doesNotMatch(js,/sb\('trainer_client_assignments'/);
 assert.match(js,/Disabilitazione non disponibile/);
});
