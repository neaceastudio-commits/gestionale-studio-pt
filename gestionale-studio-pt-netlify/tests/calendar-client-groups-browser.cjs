// Real Calendar assets; all API calls intercepted with synthetic records.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const releaseOrigin=process.env.CALENDAR_RELEASE_ORIGIN||'';
 if(releaseOrigin&&!/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(releaseOrigin))throw Error('Unexpected release origin');
 const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],writes=[];
 const clients=[['one',null,true],['two','regular',true],['three','occasional',true],['old','regular',false]].map(([id,client_group,active])=>({id,nome:'TEST',cognome:id,client_group,active,pt_assegnato:'pt-old',notes:'Originale',package_types:[],sessions_total:0,sessions_remaining:0}));
 const operators=['old','new'].map(id=>({id:'pt-'+id,nome:'PT',cognome:id,active:true,roles:['PT']}));
 let reject=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.pathname.includes('/.netlify/functions/')){
   const b=request.postDataJSON() || {};
   if(b.operation==='session')return route.fulfill({json:{actor:{id:'owner',role:'owner'}}});
   if(b.operation==='client_group'){
    const c=clients.find(c=>c.id===b.payload.clientId);
    if(reject||c.client_group!==b.payload.expectedGroup)return route.fulfill({status:409,json:{error:'Conflitto: riprova'}});
    writes.push(b);c.client_group=b.payload.group;return route.fulfill({json:c});
   }
   if(b.operation==='client'){
    writes.push(b);const patch=b.payload.rows[0];assert.deepEqual(Object.keys(patch).sort(),['id','notes','pt_assegnato']);
    const c=clients.find(c=>c.id===patch.id);Object.assign(c,patch);return route.fulfill({json:[c]});
   }
   return route.fulfill({json:[]});
  }
  if(u.pathname.includes('/rest/v1/')){
   assert.equal(request.method(),'GET','No public data writes');const table=u.pathname.split('/').pop();
   return route.fulfill({json:table==='clients'?clients.filter(c=>!u.searchParams.has('id')||u.searchParams.get('id')==='eq.'+c.id):table==='operators'?operators:[]});
  }
  if(u.hostname!=='calendar.test')return route.abort();
  const file=path.join(__dirname,'../app/calendario-studio',u.pathname==='/'?'index.html':u.pathname.slice(1));
  if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  let body=fs.readFileSync(file);
  if(releaseOrigin){const remote=await fetch(releaseOrigin+(u.pathname==='/'?'/index.html':u.pathname),{signal:AbortSignal.timeout(30000)});assert.equal(remote.status,200);body=Buffer.from(await remote.arrayBuffer());}
  return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body});
 });
 const open=async()=>{await page.goto('https://calendar.test/?access=SIM');await page.waitForFunction(()=>State.getClients().length===4);await page.evaluate(()=>{Calendar.switchView('clients');Clients.render()});};
 await open();
 assert.equal(await page.locator('#view-clients tbody tr').count(),3);
 assert.equal(await page.locator('#view-clients select').count(),0);
 assert.equal(await page.getByRole('group',{name:'Gruppo clienti'}).count(),0);
 assert.ok(!(await page.locator('#view-clients').innerText()).includes('Da classificare'));
 assert.deepEqual(clients.map(c=>c.client_group),[null,'regular','occasional','regular']);
 await page.reload();await page.waitForFunction(()=>State.getClients().length===4);await page.evaluate(()=>Calendar.switchView('clients'));
 assert.equal(await page.locator('#view-clients tbody tr').count(),3);
 await page.evaluate(()=>App.openTransferClient('one'));await page.locator('#transfer-new-operator').selectOption('pt-new');await page.locator('#transfer-client-confirm').click();
 await page.waitForFunction(()=>State.getClients().find(c=>c.id==='one').ptAssegnato==='pt-new');
 await page.reload();await page.waitForFunction(()=>State.getClients().length===4);
 assert.equal(await page.evaluate(()=>State.getClients().find(c=>c.id==='one').ptAssegnato),'pt-new');assert.equal(clients[0].client_group,null);
 await page.evaluate(()=>{Calendar.switchView('clients');Clients.setView('history')});assert.equal(await page.locator('#view-clients tbody tr').count(),1);assert.match(await page.locator('#view-clients tbody').innerText(),/TEST old/);
 assert.equal(clients.find(c=>c.id==='old').active,false);assert.deepEqual(errors,[]);
 await page.evaluate(()=>{Clients.setView('active')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile page must not overflow');
 await page.screenshot({path:'/tmp/neacea-client-simple-list-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});assert.equal(await page.locator('#view-clients tbody tr').count(),3);
 assert.ok(!writes.some(w=>w.operation==='client_group'));
 console.log('PASS mobile/desktop: simple active/history lists, no classification controls, reload and trainer transfer preserving stored data');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
