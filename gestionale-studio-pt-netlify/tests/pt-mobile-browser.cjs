// Browser regression with synthetic clients and an in-memory API. No live patient writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { templateSnapshot } = require('../netlify/functions/lib/pt-templates');
const root = process.env.PT_APP_ROOT || path.resolve(__dirname, '../app/portale-personal-trainer');
const out = process.env.PT_UI_OUTPUT || '/private/tmp';
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
 try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 page.setDefaultTimeout(8000);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const confirmClick=async(locator,accept=true)=>{await locator.click();const dialog=page.locator('#actionConfirmDialog');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:accept?'Conferma':'Annulla',exact:true}).click();await dialog.waitFor({state:'hidden'});};
 const operator={id:'pt-test',nome:'PT',cognome:'Test',email:'pt@example.test',roles:['pt'],accessLevel:'pt'};
 const client={id:'client-test',nome:'Cliente',cognome:'Prova',pt_assegnato:'pt-test',active:true,obiettivo:'Forza e movimento'};
 const secondClient={...client,id:'client-second',nome:'Secondo',cognome:'Cliente'};
 let templates=[], failTemplateSave=true;
 const saved=[]; let writes=0;
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='pt.test')return route.abort();
  if(url.pathname.includes('pt-access-email'))return route.fulfill({json:{success:true,operator,token:'test-token'}});
  if(url.pathname.includes('pt-data')){
   const input=route.request().postDataJSON();
   if(input.action==='bootstrap')return route.fulfill({json:{success:true,operator,operators:[operator],clients:[client,secondClient],programs:saved,acquisitions:[],revisions:[],exerciseArchive:[],loadHistory:[],physicalMeasurements:[]}});
   if(input.action==='list_templates')return route.fulfill({json:{success:true,templates}});
   if(input.action==='save_template'){
    if(!templates.some(t=>t.id===input.templateId))templates.push({id:input.templateId,title:input.title,description:input.description,snapshot:templateSnapshot(input.snapshot,input.title),created_by:operator.id,created_by_name:'PT Test'});
    if(failTemplateSave){failTemplateSave=false;return route.fulfill({status:500,json:{success:false,error:'Errore di rete simulato: riprova'}});}
    return route.fulfill({json:{success:true,template:templates.find(t=>t.id===input.templateId)}});
   }
   if(input.action==='archive_template'){templates=templates.filter(t=>t.id!==input.templateId);return route.fulfill({json:{success:true,templateId:input.templateId}});}
   if(input.action==='upsert_program'){
    const row={id:input.programId,cliente_id:input.clientId,data:structuredClone(input.data),updated_at:new Date().toISOString()};
    const i=saved.findIndex(p=>p.id===row.id);if(i<0)saved.push(row);else saved[i]=row;writes++;
    return route.fulfill({json:{success:true,row}});
   }
   throw Error('Unexpected action '+input.action);
  }
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  return route.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
 });
 const open=async()=>{await page.goto('https://pt.test/');await page.evaluate(async op=>{await activatePtSession(op,'test-token');showView('builderView');},operator);};
 const get=()=>page.evaluate(()=>JSON.parse(JSON.stringify(state)));
 const waitSave=()=>page.waitForFunction(()=>appState.selectedProgramId && !state.localDirty && !cloudSaveRunning);
 const editor=page.locator('#coachingProgramEditor');
 const action=(a)=>editor.locator(`[data-editor-action="${a}"]`).first();
 const field=(f)=>editor.locator(`[data-editor-field="exercise"][data-field="${f}"]`).first();
 const step=(s)=>console.log('PASS '+s);

 await open();await action('add-exercise').click();await field('name').fill('Squat test');await field('sets').fill('3');await field('reps').fill('8');await waitSave();
 await page.evaluate(()=>{
  appState.sessionHandoffs = {[appState.selectedProgramId]:{loads:{'squat test':{date:'2026-10-05',sheet:'A',week:0,operator:'PT Test',rows:[{load:'17,5',reps:'5',rir:'2',notes:'Movimento controllato'},{load:'20',reps:'5',rir:'1',notes:''}]}},next:{sheet:'A',week:0},completed:[]}};
  showView('sheetView');
 });
 assert.equal(await page.locator('#sheetPreviewStack .readonly-exercise .pt-load-reference').count(),1);
 assert.equal(await page.locator('.pt-load-reference-series li').count(),2);
 assert.match(await page.locator('.pt-load-reference').innerText(),/05\/10\/2026.*PT Test/);
 assert.match(await page.locator('.pt-load-reference').innerText(),/Note: Movimento controllato/);
 assert.equal(await page.locator('#workoutHandoff .pt-load-reference').count(),0);
 assert.equal(await page.locator('#operationalWeekNavigator + #workoutHandoff .pt-next-workout').count(),1);
 await page.locator('#operationalWeekNavigator [data-operational-week="1"]').click();
 assert.equal(await page.locator('#sheetPreviewStack .pt-load-reference-series li').count(),2,'references survive week rerender');
 await page.locator('#workoutHandoff .pt-next-workout').click();
 assert.equal(await page.locator('#sheetPreviewStack [data-week-index="0"]').count(),1,'suggestion still selects workout');
 for (const width of [320,360,390,430,768]) {
  await page.setViewportSize({width,height:844});
  const outside=await page.locator('#sheetView').evaluate(root=>[...root.querySelectorAll('input,button,label,.set-row,.set-editor,.pt-load-reference,.pt-load-reference-series li,.pt-next-workout')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth+1)}).map(e=>e.id||e.className));
  assert.deepEqual(outside,[],`operational controls at ${width}px`);
  const input=page.locator('#use-load-0-0-0');await input.scrollIntoViewIfNeeded();await input.click();await input.fill('52');await input.press('Tab');
  await page.waitForFunction(()=>state.sheets.A[0].weekSets[0][0].load==='52');
  const navOutside=await page.locator('.mobile-nav button').evaluateAll(es=>es.filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left<0)}).length);
  if(width<=760)assert.equal(navOutside,0);
  if(width===390)await page.screenshot({path:path.join(out,'pt-load-references-mobile.png'),fullPage:true});
  console.log(`PASS ${width}px: ripetizioni, carico, RIR e comandi raggiungibili`);
 }
 await page.locator('#saveSheetBottomBtn').click();await waitSave();
 assert.equal(saved[0].data.pt_studio_state.sheets.A[0].weekSets[0][0].load,'52');
 await open();await page.evaluate(()=>showView('sheetView'));assert.equal(await page.locator('#use-load-0-0-0').inputValue(),'52');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'pt-mobile-operational.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});assert.ok(await page.locator('#use-load-0-0-0').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS salvataggio e riapertura carico, desktop, nessun errore JavaScript');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
