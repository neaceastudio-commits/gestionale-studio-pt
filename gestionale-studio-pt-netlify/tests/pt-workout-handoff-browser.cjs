const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://session.test/**',r=>r.fulfill({contentType:'text/html',body:'<section id="programsView"></section><section id="sheetView"><div class="sheet-presentation"><div id="operationalWeekNavigator"></div><div id="workoutHandoff"></div><div id="sheetPreviewStack"><article><div data-load-reference="Squat"></div></article><article><div data-load-reference="Rematore"></div></article></div></div></section>'}));await page.goto('https://session.test/');
 await page.evaluate(()=>{
  const studio={sheetOrder:['A','B'],sessions:['Settimana 1','Settimana 2'],currentSheet:'B',activeWeekIndex:0,sheets:{A:[{name:'Squat',weekSets:[[{reps:'8',load:'40'}],[{reps:'10',load:''}]]}],B:[{name:'Squat',weekSets:[[{reps:'10',load:''}],[{reps:'12',load:''}]]}]},workoutSessions:{A:[{completedAt:'2026-09-30T10:00:00Z',notes:'Controllare tecnica'}]},workoutDates:{A:['2026-09-30']}};
  window.fixture={currentPt:{id:'substitute'},activeView:'sheetView',selectedProgramId:'p',sessionLogEnabled:true,sessionHistoryVisible:false,assignedSessions:[{id:'a',client_ids:['c'],date:'2026-10-01',start_time:'10:00',status:'fatto'}],programs:[{id:'p',client_id:'c',data:{name:'Programma titolare',pt_studio_state:studio}}],sessionRecords:[],currentPrograms:{c:'p'},requests:[],fail:true};
  window.PTSessionContext={getApp:()=>fixture,getState:()=>studio,programState:p=>p?.data.pt_studio_state,selectedClient:()=>({id:'c'}),canCompileSharedSession:()=>true,canMonitorActivity:()=>false,selectWorkout:(sheet,week)=>{studio.currentSheet=sheet;studio.activeWeekIndex=week;PTSessionLog.render();},ptData:async(action,input)=>{fixture.requests.push(structuredClone(input));if(fixture.fail){fixture.fail=false;throw Error('Rete non disponibile');}return {record:{id:'r',cliente_id:'c',appointment_id:'a',operator_id:'substitute',operator_name:'PT sostituto',program_id:'p',appointment_date:'2026-10-01',updated_at:'2026-10-01T10:00:00Z',data:input.data,version:1}};}};
 });
 for(const file of ['workout-handoff.js','session-log.js'])await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/js',file),'utf8')});
 assert.match(await page.locator('.pt-last-workout').innerText(),/Allenamento A · Settimana 1/);
 await page.getByRole('button',{name:'Da fare · Allenamento B · Settimana 1',exact:true}).click();
 await page.getByLabel('Data della seduta assegnata').selectOption('a');
 assert.equal(await page.getByLabel('Allenamento da compilare').inputValue(),'B');
 assert.equal(await page.getByLabel('Carico',{exact:true}).inputValue(),'');
 assert.match(await page.locator('fieldset .pt-load-reference').innerText(),/Carico\s+40\s+Ripetizioni\s+8/);
 assert.match(await page.locator('[data-load-reference="Squat"]').innerText(),/30\/09\/2026/);
 assert.match(await page.locator('[data-load-reference="Rematore"]').innerText(),/Nessun carico precedente/);
 assert.equal(await page.locator('#workoutHandoff .pt-load-reference').count(),0);
 assert.equal(await page.locator('#workoutHandoff .pt-next-workout').count(),1);
 await page.getByLabel('Carico',{exact:true}).fill('45');await page.getByLabel('Note della seduta e variazioni rispetto al programma').fill('Variante effettuata');
 await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/Rete non disponibile/);assert.equal(await page.getByLabel('Carico',{exact:true}).inputValue(),'45');
 await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/salvata e tracciata/);
 assert.match(await page.locator('.pt-last-workout').innerText(),/Allenamento B · Settimana 1/);assert.equal(await page.getByRole('button',{name:'Da fare · Allenamento A · Settimana 2',exact:true}).count(),1);
 const result=await page.evaluate(()=>({requests:fixture.requests,owner:fixture.programs[0].data.pt_studio_state.sheets.A[0].weekSets[0][0].load}));assert.deepEqual(result.requests[1].data.workout,{sheet:'B',week:0});assert.equal(result.owner,'40');assert.equal(result.requests[0].requestId,result.requests[1].requestId);assert.equal(await page.getByText('Storico delle sedute · Direzione',{exact:true}).count(),0);
 await page.getByLabel('Allenamento da compilare').selectOption('A');await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();assert.match(await page.getByRole('status').innerText(),/Conferma il nuovo allenamento/);assert.equal(await page.evaluate(()=>fixture.requests.length),2);
 assert.deepEqual(errors,[]);console.log('PASS browser mobile: ultimo, prossimo, carichi storici, nuovi campi vuoti, errore rete, retry, salvataggio settimana/allenamento, programma protetto, cambio selezione non ambiguo');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
