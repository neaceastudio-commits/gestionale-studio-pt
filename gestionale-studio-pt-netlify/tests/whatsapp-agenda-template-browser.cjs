// Browser flow with synthetic calendar and endpoints; no real messages or services.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{chromium}=require(require.resolve('playwright',{paths:[path.join(root,'tools/coaching-editor')]}));
const model=require('../app/calendario-studio/js/whatsapp-agenda-text.js'),origin=process.env.WHATSAPP_ASSET_ORIGIN||'';
if(origin&&!/^https:\/\/(?:[a-f0-9]+--new-calendar-neacea\.netlify\.app|calendario\.neacea\.com)$/.test(origin))throw Error('Unexpected asset origin');
(async()=>{let browser;try{
 const report={start:'2026-11-23',end:'2026-11-29',plan:{nextDay:'2026-11-23',time:'08:00'},agendas:[['one','Trainer Alfa',13],['two','Trainer Beta',1]].map(([operatorId,name,count])=>{
  const entries=Array.from({length:count},(_,i)=>({day:'2026-11-23',text:'09:00 · CLIENTE_'+operatorId+'_'+i+' · PT 1:1 · 0/8'}));
  return {operatorId,name,count,entries,incomplete:false,revision:'synthetic-'+operatorId,text:'lunedì 23 novembre\n'+entries.map(e=>e.text).join('\n')+'\n\nTotale sedute: '+count};
 })};
 let status='PENDING',accept=false,failPart=false;const sent=[],dialogs=[],errors=[],rules=[];
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1180,height:900},timezoneId:'Europe/Rome'});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await (accept?d.accept():d.dismiss())});
 await page.addInitScript(()=>sessionStorage.setItem('neacea-calendar-audit-session','OWNER'));
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.fulfill({body:''});assert.equal(u.hostname,'calendar.test','Browser requests must stay mocked');
  if(u.pathname==='/.netlify/functions/whatsapp-agenda'){
   const data=req.postDataJSON();
   if(data.action==='directory'){assert.equal(data.dryRun,true);return route.fulfill({json:{operators:report.agendas.map(row=>({id:row.operatorId,name:row.name,active:true,whatsapp_phone:true})),clients:[{id:'client',name:'Cliente separato',active:true,hasPhone:true}]}})}
   assert.equal(data.action,'weekly-agenda');return route.fulfill({json:report});
  }
  if(u.pathname==='/.netlify/functions/whatsapp-messages'){
   const data=req.postDataJSON();assert.equal(data.accessToken,'OWNER');
   if(data.action==='composer-templates')return route.fulfill({json:{templates:[{name:model.name,language:model.language,status,supported:true,header:null,body:model.body,footer:model.footer,parameterCount:10}]}});
   if(data.action==='agenda-rules')return route.fulfill({json:{rules}});
   if(data.action==='composer-status')return route.fulfill({json:{results:[],configured:true,receivedAt:null}});
   assert.equal(data.action,'composer-send','No automatic matrix write may be called');sent.push(data);
   if(failPart&&data.agenda.part===1)return route.fulfill({status:409,json:{status:'Il calendario è cambiato: aggiorna l’anteprima prima di inviare.'}});
   return route.fulfill({json:{status:'Accettato da Meta',messageId:'wamid.local'+sent.length}});
  }
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<iframe src="/comunicazioni.html" style="width:100%;height:100vh;border:0"></iframe>'});
  assert.ok(!u.pathname.includes('..'));let body=fs.readFileSync(path.join(root,'app/calendario-studio',u.pathname));
  if(origin){const res=await fetch(origin+u.pathname+u.search);assert.equal(res.status,200);body=Buffer.from(await res.arrayBuffer());}
  return route.fulfill({contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':'text/html',body});
 });
 await page.goto('https://calendar.test/');const frame=page.frameLocator('iframe');
 await frame.locator('[data-audience="PT"]').click();await frame.locator('#prepareAgenda').click();
 await frame.locator('#agendaInfo').filter({hasText:'23/11/2026'}).waitFor();
 assert.equal(await frame.locator('#sendFormat').inputValue(),'template');assert.ok(await frame.locator('#bodyText').isHidden());assert.ok(await frame.locator('#attachmentBox').isHidden());
 assert.equal(await frame.locator('#recipients input:checked').count(),2);assert.ok(!(await frame.locator('#recipients').innerText()).includes('Cliente separato'));
 assert.ok(await frame.locator('#sendNow').isDisabled());assert.match(await frame.locator('#sendBlocker').innerText(),/PENDING/);
 const preview=await frame.locator('#preview').innerText();for(let i=0;i<13;i++)assert.ok(preview.includes('CLIENTE_one_'+i));assert.ok(!preview.includes('CLIENTE_two'));
 assert.match(await frame.locator('#sendNow').innerText(),/4 messaggi/);
 status='APPROVED';await frame.locator('#refreshAgendaTemplates').click();await frame.locator('#sendNow:not([disabled])').waitFor();assert.equal(sent.length,0);
 await frame.locator('#sendNow').click();assert.equal(sent.length,0);assert.match(dialogs[0],/4 messaggi WhatsApp a 2 destinatari/);assert.match(dialogs[0],/Trainer Alfa · 3 messaggi/);assert.match(dialogs[0],/Trainer Beta · 1 messaggi/);
 accept=true;await frame.locator('#sendNow').click();await frame.locator('#notice').filter({hasText:'Esito per messaggio'}).waitFor();assert.equal(sent.length,4);assert.ok(sent.every(s=>s.agenda.format==='template'&&s.file===null));
 assert.deepEqual(sent.map(s=>[s.contact,s.agenda.part,s.agenda.parts]),[['pt:one',0,3],['pt:one',1,3],['pt:one',2,3],['pt:two',0,1]]);
 for(const p of sent)assert.ok(!(p.body.includes('CLIENTE_one')&&p.body.includes('CLIENTE_two')));
 assert.equal(await frame.locator('#log tr').count(),4);
 await frame.locator('[data-view="editor"]').click();await frame.locator('#subject').fill('Seconda comunicazione sintetica');failPart=true;
 await frame.locator('#sendNow').click();await frame.locator('#notice').filter({hasText:'Invio agenda interrotto'}).waitFor();assert.equal(sent.length,6,'only two parts attempted in interrupted dispatch');
 await frame.locator('[data-view="automazioni"]').click();assert.match(await frame.locator('#automazioni').innerText(),/motore di invio ricorrente non è attivo/);
 await page.setViewportSize({width:390,height:844});await frame.locator('[data-view="editor"]').click();assert.ok(await frame.locator('#sendFormat').isVisible());
 await frame.locator('#sendFormat').selectOption('free');assert.ok(await frame.locator('#bodyText').isVisible());assert.match(await frame.locator('#agendaTemplateNotice').innerText(),/ultime 24 ore/);
 assert.deepEqual(errors,[]);console.log('PASS browser agenda: pending/approval gate, complete parts and exact confirmation, separate PT, cancel/no automatic send, mocked dispatch, independent log, interruption, free mode and mobile. Assets: '+(origin||'local candidate'));
}finally{await browser?.close()}})().catch(e=>{console.error(e);process.exitCode=1});
