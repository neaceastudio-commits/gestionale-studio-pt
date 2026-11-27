const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'../app/portale-personal-trainer/js');
function fixture(storage={},backend={record:null},mode={}){
 const dom=new JSDOM('<div id="sheetView"><div class="sheet-presentation"></div></div><div id="programsView"></div><div id="workoutHandoff"></div><div id="sheetPreviewStack"></div>',{url:'https://pt.test',runScripts:'outside-only'}),w=dom.window;
 const timers=new Map();w.structuredClone=structuredClone;w.confirm=()=>true;w.setTimeout=(fn,ms)=>{const id=Symbol();timers.set(id,{fn,ms});return id};w.clearTimeout=id=>timers.delete(id);
 for(const [k,v]of Object.entries(storage))w.localStorage.setItem(k,v);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const studio={currentSheet:'A',activeWeekIndex:0,sheetOrder:['A','B'],sessions:['S1'],sheets:{A:[{name:'Squat',weekSets:[[{reps:'8',load:''}]]}],B:[{name:'Row',weekSets:[[{reps:'8',load:''}]]}]}};
 const client={id:'c',nome:'Synthetic',trainer_id:'other'},app={currentPt:{id:'pt',nome:'Test'},selectedClientId:'c',selectedProgramId:'p',activeView:'sheetView',sessionLogEnabled:true,assignedSessions:[{id:'a',operator_id:'pt',client_ids:['c'],date:today,start_time:'10:00'}],programs:[{id:'p',cliente_id:'c',data:{name:'Test',pt_studio_state:studio}}],currentPrograms:{c:'p'},sessionRecords:backend.record?[backend.record]:[]};
 let writes=0,reads=0,after=0;const sent=[];
 w.PTSessionContext={getApp:()=>app,getState:()=>studio,selectedClient:()=>client,canCompileSharedSession:()=>true,canMonitorActivity:()=>false,programState:p=>p?.data.pt_studio_state,onSessionSaved(){after++},async ptData(action,p){
  if(action==='session_record_snapshot'){reads++;if(mode.readFail)throw Error('Read offline');return {record:backend.record};}
  writes++;sent.push(structuredClone(p));if(mode.offline)throw Error('Offline');if(mode.conflict)throw Object.assign(Error('Conflict'),{status:409,code:'SESSION_CONFLICT',current:backend.record});
  if(mode.wait)await mode.wait();
  backend.record={id:'r',appointment_id:'a',cliente_id:'c',program_id:'p',operator_id:'pt',appointment_date:today,updated_at:new Date().toISOString(),version:(backend.record?.version||0)+1,request_id:p.requestId,data:structuredClone(p.data)};return {record:backend.record};
 }};
 for(const name of ['save-integrity','save-transaction','workout-handoff','session-log'])w.eval(fs.readFileSync(path.join(root,name+'.js'),'utf8'));
 w.PTSessionLog.render();
 const input=(label,value)=>{const el=[...w.document.querySelectorAll('label')].find(x=>x.firstChild?.textContent===label)?.querySelector('input,textarea');assert.ok(el,label);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const snapshot=()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return[k,w.localStorage.getItem(k)]}));
 return {w,dom,app,backend,mode,studio,input,snapshot,sent,timers,flush:()=>Promise.all([...timers.values()].map(t=>t.fn())),complete:()=>w.document.querySelector('.pt-session-save').onclick(),stats:()=>({writes,reads,after})};
}
test('autosave keeps a session draft through reload; explicit completion confirms it',async()=>{const f=fixture();f.input('Carico','40');f.input('Ripetizioni','6');assert.ok([...f.timers.values()].some(t=>t.ms===600));await f.flush();assert.equal(f.backend.record.data.status,'draft');assert.equal(f.backend.record.data.rows[0].load,'40');const g=fixture({},f.backend);assert.equal(g.w.document.querySelector('fieldset input:not([readonly])').value,'40');await g.complete();assert.equal(g.backend.record.data.status,'completed');assert.match(g.w.document.querySelector('.pt-session-status').textContent,/completata e salvata/);f.dom.window.close();g.dom.window.close();});
test('offline draft survives reload; readback retry does not duplicate a confirmed write',async()=>{const f=fixture({},undefined,{offline:true});f.input('Carico','45');await f.flush();assert.equal(f.backend.record,null);const g=fixture(f.snapshot(),f.backend,{readFail:true});await g.flush();assert.equal(g.stats().writes,1);assert.equal(g.app.sessionRecords.length,0);g.mode.readFail=false;await g.flush();assert.equal(g.stats().writes,1);assert.equal(g.app.sessionRecords[0].data.rows[0].load,'45');assert.equal(g.app.sessionRecords[0].data.status,'draft');f.dom.window.close();g.dom.window.close();});
test('completing during an in flight autosave serializes the final values',async()=>{let resume;const f=fixture({},undefined,{wait:()=>new Promise(r=>{resume=r})});f.input('Carico','40');const pending=f.flush();await new Promise(setImmediate);f.input('Carico','50');const completion=f.complete();f.mode.wait=null;resume();await Promise.all([pending,completion]);assert.equal(f.sent.length,2);assert.equal(f.sent[0].data.status,'draft');assert.equal(f.sent[1].data.status,'completed');assert.equal(f.backend.record.data.rows[0].load,'50');f.dom.window.close();});
test('completion is not locally confirmed when final read fails',async()=>{const f=fixture();f.input('Carico','40');await f.flush();f.mode.readFail=true;await f.complete();assert.equal(f.backend.record.data.status,'completed');assert.equal(f.app.sessionRecords[0].data.status,'draft');const n=f.stats().writes;f.mode.readFail=false;await f.flush();assert.equal(f.stats().writes,n);assert.equal(f.app.sessionRecords[0].data.status,'completed');f.dom.window.close();});
test('a pending session only blocks refresh of its own client, while its draft remains recoverable',async()=>{
 const f=fixture({},undefined,{offline:true});f.input('Carico','55');await f.flush();
 assert.equal(f.w.PTSessionLog.hasPending('c'),true);
 assert.equal(f.w.PTSessionLog.hasPending('other'),false);
 assert.equal(f.w.PTSessionLog.hasPending(),true);
 f.app.selectedClientId='other';assert.equal(f.w.PTSessionLog.hasPending(f.app.selectedClientId),false);
 const g=fixture(f.snapshot(),f.backend);assert.equal(g.w.PTSessionLog.hasPending('c'),true);await g.flush();
 assert.equal(g.backend.record.data.rows[0].load,'55');assert.equal(g.w.PTSessionLog.hasPending('c'),false);
 f.dom.window.close();g.dom.window.close();
});
