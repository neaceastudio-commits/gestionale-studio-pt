// Browser regression with synthetic clients and an in-memory API. No live patient writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { templateSnapshot } = require('../../netlify/functions/lib/pt-templates');
const root = path.resolve(__dirname, '../../app/portale-personal-trainer');
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
 await open();
 await action('add-exercise').click();
 await field('name').fill('Lat machine presa neutra');await editor.locator('[data-exercise-library-id]').filter({hasText:'Lat machine presa neutra'}).first().click();await field('sets').fill('3');await field('reps').fill('9');
 await field('rir').fill('2');await field('rest').fill('90 sec');await field('note').fill('Movimento controllato, tecnica pulita.');
 await waitSave();assert.ok(writes>0);assert.equal(saved[0].data.pt_studio_state.sheets.A[0].weekSets[0].length,3);step('campi e autosalvataggio');
 const metrics=await field('sets').evaluate(e=>{const fields=[...e.closest('.exercise-editor-card__fields').querySelectorAll('input[data-field]')].filter(e=>['sets','reps','rir','rest'].includes(e.dataset.field));return fields.map(e=>({w:e.getBoundingClientRect().width,y:e.getBoundingClientRect().y}));});
 assert.deepEqual(metrics.map(m=>Math.round(m.w)),[84,104,104,120]);assert.equal(new Set(metrics.map(m=>m.y)).size,1);step('quattro parametri compatti sulla stessa riga desktop');
 await page.screenshot({path:path.join(out,'pt-editor-desktop.png'),fullPage:true});
 await action('duplicate-exercise').click();assert.equal((await get()).sheets.A.length,2);
 await action('move-exercise-down').click();assert.match((await get()).sheets.A[0].name,/copia/);
 await editor.locator('[data-editor-action="move-exercise-up"]').nth(1).click();assert.equal((await get()).sheets.A[0].name,'Lat machine presa neutra');
 await confirmClick(editor.locator('[data-editor-action="remove-exercise"]').nth(1));assert.equal((await get()).sheets.A.length,1);step('duplica, sposta e rimuovi esercizio');
 await confirmClick(action('apply-future'));
 await editor.getByRole('button',{name:'Settimana 2',exact:true}).click();assert.equal(await field('reps').inputValue(),'9');
 await editor.getByRole('button',{name:'Settimana 4',exact:true}).click();assert.ok(await action('apply-future').isDisabled());
 for(let i=0;i<3;i++)await page.locator('#addSessionBtn').click();
 await editor.getByRole('button',{name:'Settimana 6',exact:true}).click();assert.ok(await action('apply-future').isEnabled());
 await field('reps').fill('11');await confirmClick(action('apply-future'));
 await editor.getByRole('button',{name:'Settimana 7',exact:true}).click();assert.equal(await field('reps').inputValue(),'11');assert.ok(await action('apply-future').isDisabled());
 for(let i=0;i<3;i++)await confirmClick(page.locator('#removeSessionBtn'));
 await editor.getByRole('button',{name:'Settimana 1',exact:true}).click();step('aggiungi/rimuovi settimana e applicazione oltre settimana 6');
 await action('open-progression').click();await action('close-progression').click();
 await action('open-progression').click();await editor.locator('[data-progression-show-all]').check();
 await editor.locator('[data-progression-library-id]').first().click();await action('apply-progression').click();
 assert.ok((await get()).coachingEditorSnapshot.program.days[0].exercisesByWeek[4][0].progressionId);step('selezione e applicazione progressione');
 await action('open-technique').click();await action('close-technique').click();
 await action('open-technique').click();await editor.locator('[data-technique-id]').first().click();await editor.locator('[data-technique-note]').fill('Nota tecnica prova');await action('apply-technique').click();
 assert.ok((await get()).coachingEditorSnapshot.program.days[0].exercisesByWeek[1][0].techniqueId);
 await action('remove-technique').click();assert.equal((await get()).coachingEditorSnapshot.program.days[0].exercisesByWeek[1][0].techniqueId,'');step('tecnica: apri, chiudi, applica, rimuovi');
 await action('open-grouping').click();await action('close-grouping').click();
 await action('open-grouping').click();await action('create-group').click();assert.equal((await get()).coachingEditorSnapshot.program.days[0].groupsByWeek[1].length,1);
 await action('break-group').click();assert.equal((await get()).coachingEditorSnapshot.program.days[0].groupsByWeek[1].length,0);
 await action('open-grouping').click();await editor.locator('[data-editor-action="create-group"][data-group-type="circuit"]').click();
 await action('add-group-exercise').click();step('crea/sciogli gruppo e aggiungi esercizio al gruppo');
 const openDetails=async actionName=>{const detail=action(actionName).locator('xpath=ancestor::details');if(await detail.getAttribute('open')===null)await detail.locator('summary').click();};
 await openDetails('add-preparation');await action('add-preparation').click();await action('remove-preparation').click();await action('add-preparation').click();
 await openDetails('add-ramp');await action('add-ramp').click();await action('add-ramp-step').click();await action('remove-ramp-step').click();await action('remove-ramp').click();await action('add-ramp').click();await action('add-ramp-step').click();
 await editor.locator('[data-editor-field="ramp-step"]').fill('20 kg × 8');step('preparazione e serie di avvicinamento');
 await page.locator('#duplicateSheetBtn').click();await page.locator('#duplicateDayName').fill('Gambe copia');await page.locator('#duplicateDayForm [type="submit"]').click();let s=await get();assert.deepEqual(s.sheetOrder,['A','B']);assert.equal(s.currentSheet,'B');
 assert.equal(s.coachingEditorSnapshot.program.days[1].name,'Gambe copia');
 assert.equal(s.coachingEditorSnapshot.program.days[1].rampUp[0].steps[0],'20 kg × 8');
 assert.ok(s.coachingEditorSnapshot.program.days[1].groupsByWeek[1].length);
 await editor.getByRole('button',{name:'Allenamento A',exact:true}).click();assert.equal((await get()).currentSheet,'A');
 await editor.getByRole('button',{name:'Allenamento B',exact:true}).click();assert.equal((await get()).currentSheet,'B');step('duplica allenamento completo e cambio allenamento');
 await action('add-day').click();assert.equal((await get()).sheetOrder.length,3);await confirmClick(action('remove-day'));assert.equal((await get()).sheetOrder.length,2);step('aggiungi/elimina seduta');
 await waitSave();const originalId=await page.evaluate(()=>appState.selectedProgramId);
 await page.locator('#duplicateProgramBtn').click();await page.locator('#newProgramName').fill('Forza ciclo 2');await page.locator('#createNewProgramBtn').click();await waitSave();const copyId=await page.evaluate(()=>appState.selectedProgramId);
 assert.equal((await get()).meta.name,'Forza ciclo 2');
 assert.notEqual(copyId,originalId);assert.ok(saved.some(p=>p.id===originalId));assert.ok(saved.find(p=>p.id===copyId).data.pt_studio_state.coachingEditorSnapshot.program.days[1].groupsByWeek[1].length);step('duplica programma come record indipendente');
 await page.evaluate(()=>localStorage.clear());await open();assert.equal((await get()).sheetOrder.length,2);step('riapertura da server senza cache locale');
 await action('toggle-edit').click();assert.equal(await action('add-exercise').count(),0);await action('toggle-edit').click();assert.ok(await action('add-exercise').isVisible());step('termina/riprendi modifica');
 for(const width of [768,390,320]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.locator('#duplicateProgramBtn').isVisible());assert.ok(await page.locator('#duplicateSheetBtn').isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,`overflow ${width}`);
  const rect=await field('sets').boundingBox();assert.ok(rect.width<=120);
  await page.screenshot({path:path.join(out,`pt-editor-${width}.png`),fullPage:true});step(`layout ${width}px`);
 }
 await page.setViewportSize({width:1440,height:1000});
 // Save a shared model, including retry after a response lost AFTER the server persisted it.
 await page.evaluate(()=>{state.meta.generalNotes='PRIVATE_CLIENT_CANARY';updateExerciseSet(0,0,0,'load','57');updateExerciseSet(0,0,0,'sessionNote','PRIVATE_SESSION_CANARY');});await waitSave();
 const sourceBefore=JSON.stringify(saved.find(p=>p.id===copyId));
 await page.locator('#saveTemplateBtn').click();await page.locator('#cancelTemplateBtn').click();assert.equal(templates.length,0);
 await page.locator('#saveTemplateBtn').click();await page.locator('#templateTitle').fill('Forza condivisa');await page.locator('#templateDescription').fill('Programma base per lo studio');await page.locator('#templatePrivacy').check();
 await page.locator('#confirmTemplateBtn').click();await page.getByText('Errore di rete simulato: riprova',{exact:true}).waitFor();assert.equal(templates.length,1);
 await page.locator('#confirmTemplateBtn').click();await page.locator('#templatesView.active').waitFor();await page.locator('.template-card').waitFor();assert.equal(templates.length,1);
 assert.equal(JSON.stringify(templates).includes('PRIVATE_'),false);step('archivio generale: annulla, salva, riprova senza duplicati, dati cliente esclusi');
 await page.locator('#templateSearch').fill('inesistente');assert.equal(await page.locator('.template-card').count(),0);
 await page.locator('#templateSearch').fill('forza');assert.equal(await page.locator('.template-card').count(),1);
 await page.locator('.template-card summary').click();assert.ok(await page.locator('.template-card li').count()>0);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:950});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:path.join(out,`pt-archive-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#templatesView [data-go-view="clientsView"]').click();await page.locator('[data-client-id="client-second"]').click();
 await page.locator('.side-nav [data-view="templatesView"]').click();await page.locator('[data-use-template]').waitFor();
 await page.locator('[data-use-template]').click();await page.locator('#cancelNewProgramBtn').click();assert.equal(saved.filter(p=>p.cliente_id==='client-second').length,0);
 await page.locator('[data-use-template]').click();await page.locator('#newProgramSourceId option').waitFor();await page.locator('#newProgramName').fill('Forza secondo cliente');await page.locator('#createNewProgramBtn').click();await page.locator('#builderView.active').waitFor();await waitSave();
 const imported=saved.find(p=>p.cliente_id==='client-second');assert.ok(imported);assert.notEqual(imported.id,copyId);
 assert.equal(imported.data.pt_studio_state.meta.name,'Forza secondo cliente');
 assert.equal(JSON.stringify(imported).includes('PRIVATE_'),false);
 assert.ok(Object.values(imported.data.pt_studio_state.workoutDates).flat().every(x=>!x));
 assert.ok(Object.values(imported.data.pt_studio_state.sheets).flat().flatMap(e=>e.weekSets.flat()).every(s=>!s.load&&!s.sessionNote&&!s.previousLoad));
 assert.ok(imported.data.pt_studio_state.coachingEditorSnapshot.program.days[1].groupsByWeek[1].length);
 assert.equal(JSON.stringify(saved.find(p=>p.id===copyId)),sourceBefore);step('modello riutilizzato su altro cliente, storico vuoto e originale intatto');
 await page.locator('.side-nav [data-view="templatesView"]').click();await page.locator('[data-retire-template]').waitFor();
 await confirmClick(page.locator('[data-retire-template]'),false);assert.equal(templates.length,1);
 await confirmClick(page.locator('[data-retire-template]'));await page.waitForFunction(()=>!document.querySelector('.template-card'));assert.equal(templates.length,0);assert.ok(saved.find(p=>p.id===imported.id));
 await page.locator('.side-nav [data-view="builderView"]').click();step('ritiro modello non elimina le schede dei clienti');
 await confirmClick(action('clear-program'),false);assert.equal((await get()).sheetOrder.length,2);
 await confirmClick(action('clear-program'));assert.equal((await get()).sheetOrder.length,0);await action('add-day').click();assert.equal((await get()).sheetOrder.length,1);step('annulla/conferma svuota e ricrea seduta');
 await page.evaluate(()=>{appState.currentPt={id:'owner-test',roles:['admin'],accessLevel:'owner'};renderAll();});
 assert.ok(await page.locator('#duplicateProgramBtn').isDisabled());assert.ok(await page.locator('#duplicateSheetBtn').isDisabled());step('sola lettura mantiene duplicazione disabilitata');
 assert.deepEqual(errors,[]);step('nessun errore JavaScript');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
