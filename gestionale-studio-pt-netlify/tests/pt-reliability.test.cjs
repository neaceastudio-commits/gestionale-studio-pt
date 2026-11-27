const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'../app/portale-personal-trainer');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const reader=require(path.join(root,'js/data-reader'));
const tick=()=>new Promise(setImmediate);

test('concurrent identical reads share requests but not mutable results; fresh reads are not cached',async()=>{
 let resolve,calls=0;
 const send=()=>{calls++;return new Promise(r=>resolve=r)};
 const a=reader.read('client_snapshot',{clientId:'c'},send,'pt-token');
 const b=reader.read('client_snapshot',{clientId:'c'},send,'pt-token');
 assert.equal(calls,1);resolve({clients:[{id:'c'}]});
 const [first,second]=await Promise.all([a,b]);first.clients[0].id='changed';assert.equal(second.clients[0].id,'c');
 const c=reader.read('client_snapshot',{clientId:'c'},send,'pt-token');assert.equal(calls,2);resolve({clients:[]});await c;
});
test('reads are isolated by access token and client; writes are never deduplicated',async()=>{
 let calls=0;const send=async()=>{calls++;return {ok:true}};
 await Promise.all([reader.read('client_snapshot',{clientId:'c'},send,'a'),reader.read('client_snapshot',{clientId:'c'},send,'b'),reader.read('client_snapshot',{clientId:'other'},send,'a')]);assert.equal(calls,3);
 await Promise.all([reader.read('upsert_program',{},send,'a'),reader.read('upsert_program',{},send,'a')]);assert.equal(calls,5);
});
test('failed shared reads can retry and chunk integrity remains enforced',async()=>{
 let calls=0;const fail=async()=>{calls++;throw Error('offline')};
 const results=await Promise.allSettled([reader.read('bootstrap',{},fail),reader.read('bootstrap',{},fail)]);assert.equal(calls,1);assert.ok(results.every(r=>r.status==='rejected'));
 assert.deepEqual(await reader.read('bootstrap',{},async()=>({clients:[]})),{clients:[]});
 const encoded=JSON.stringify({clients:[{id:'c'}]}),mid=12;let reads=0;
 const result=await reader.read('bootstrap',{},async p=>{reads++;const offset=p.readCursor?.offset||0;return {responseChunk:{version:1,hash:'same',total:encoded.length,offset,chunk:offset?encoded.slice(mid):encoded.slice(0,mid),nextOffset:offset?null:mid}}});
 assert.equal(reads,2);assert.equal(result.clients[0].id,'c');
 await assert.rejects(reader.read('bootstrap',{},async()=>({responseChunk:{version:1,hash:'x',total:10,offset:2,chunk:'x',nextOffset:null}})),/incompleta/);
});
function appFixture(omit=[]){
 const dom=new JSDOM(html,{url:'https://pt.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window,context=dom.getInternalVMContext();
 w.structuredClone=structuredClone;w.ResizeObserver=class{observe(){}disconnect(){}};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.setInterval=()=>0;w.setTimeout=()=>0;w.clearTimeout=()=>{};
 w.fetch=()=>Promise.reject(Error('Unexpected network call in synthetic test'));
 for(const script of w.document.scripts){
   const src=script.getAttribute('src');
   if(src&&omit.includes(src.split('?')[0]))continue;
   vm.runInContext(src?fs.readFileSync(path.join(root,src.split('?')[0]),'utf8'):script.textContent,context,{filename:src||'portal-inline.js'});
 }
 return {dom,w,run:code=>vm.runInContext(code,context)};
}
test('complete frontend boots; a missing critical asset produces a recoverable message',async()=>{
 const f=appFixture();await tick();assert.equal(f.w.document.getElementById('loginButton').disabled,false);assert.equal(f.w.PTStartup.ready(),true);f.dom.window.close();
 const broken=appFixture(['js/save-transaction.js']);assert.equal(broken.w.PTStartup.ready(),false);assert.equal(broken.w.document.getElementById('startupError').classList.contains('hidden'),false);assert.equal(broken.w.document.getElementById('loginButton').disabled,true);broken.dom.window.close();
});
test('client navigation does not build hidden editor, workout, library or measurement screens',()=>{
 const f=appFixture();f.run('appState.activeView="clientsView";renderAll();');
 assert.equal(f.w.document.getElementById('coachingProgramEditor').shadowRoot,null);
 assert.equal(f.w.document.getElementById('sheetPreviewStack').children.length,0);
 assert.equal(f.w.document.getElementById('exerciseLibrary').children.length,0);
 assert.equal(f.w.document.getElementById('gripHistory').children.length,0);
 f.run('appState.activeView="builderView";renderAll();');
 assert.ok(f.w.document.getElementById('coachingProgramEditor').shadowRoot);
 const editor=f.w.document.getElementById('coachingProgramEditor').shadowRoot;
 const before=editor.innerHTML;
 f.run('appState.activeView="clientsView";renderAll();setEditorAvailability();');
 assert.equal(editor.innerHTML,before);
 f.dom.window.close();
});
test('opening each view renders its contents on demand without legacy editor fallback',async()=>{
 const f=appFixture();
 await f.run('showView("libraryView")');assert.ok(f.w.document.getElementById('exerciseLibrary').children.length);
 await f.run('showView("builderView")');assert.ok(f.w.document.getElementById('coachingProgramEditor').shadowRoot);
 await f.run('showView("gripView")');assert.ok(f.w.document.getElementById('gripHistory').textContent);
 assert.equal(f.w.document.getElementById('exerciseStack').children.length,0);
 f.dom.window.close();
});
test('access timeout is bounded, retryable and always clears its timer',async()=>{
 let expire,cleared=0;
 const c=vm.createContext({AbortController,accessFunctionBase:()=>'',setTimeout(fn,ms){assert.equal(ms,15000);expire=fn;return 1},clearTimeout(){cleared++},fetch:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort'))))});
 vm.runInContext(html.slice(html.indexOf('    async function requestPtAccess('),html.indexOf('    async function activatePtSession(')),c);
 const pending=c.verifyAccessToken('synthetic');expire();await assert.rejects(pending,/non ha risposto in tempo/);assert.equal(cleared,1);
 c.fetch=async()=>({ok:true,text:async()=>JSON.stringify({operator:{id:'pt'}})});assert.equal((await c.verifyAccess('test@example.test','123')).operator.id,'pt');assert.equal(cleared,2);
});
