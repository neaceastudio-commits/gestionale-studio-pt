const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.PT_ACCESS_SECRET='archive-browser-fixture';process.env.SUPABASE_SECRET_KEY='archive-browser-fixture';process.env.PT_SESSION_LOG_ENABLED='true';
const auth=require('../netlify/functions/lib/pt-auth'),{handler}=require('../netlify/functions/pt-data');
const root=path.resolve(__dirname,'../app/portale-personal-trainer');
const operator={id:'pt-a',operator_id:'pt-a',nome:'PT',cognome:'Test',email:'pt-a@example.test',active:true,legacy_roles:['PT'],portal_access_enabled:true,portal_access_version:0};
const client={id:'client',nome:'Cliente',cognome:'Prova',pt_assegnato:'pt-a',active:true,obiettivo:'PRIVATE_CLIENT_GOAL',note_operative:'PRIVATE_CLINICAL_NOTES'};
const program={id:'client-program',cliente_id:'client',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',data:{name:'Programma personale',goal:'PRIVATE_PROGRAM_GOAL',notes:'PRIVATE_INTERNAL_NOTES',settimane:2,giorni:[{id:'A',nome:'Allenamento A',esercizi:[{id:'squat',nome:'Squat',serie:3,ripetizioni:8,recupero:'90 sec'}]}]}};
const snapshot={format:'neacea-program-editor-v1',program:{weeks:[1],settings:{goal:'Obiettivo modello'},days:[{key:'day',letter:'A',name:'Forza',generalWarmup:[],preparation:[{key:'prep',name:'Storico',setsReps:'2',cue:'Conservare'}],rampUp:[{key:'ramp',exercise:'Squat',steps:['20kg']}],notes:[],exercisesByWeek:{1:[{key:'e',name:'Squat',sets:'3',reps:'8',rest:'90',rir:'2'}]},groupsByWeek:{1:[]}}]}};
const folders=[{id:'folder-alpha',name:'Alpha',parent_id:null},{id:'folder-nested',name:'Sotto',parent_id:'folder-alpha'},{id:'folder-beta',name:'Beta',parent_id:null}].map(f=>({...f,created_by:'pt-a',updated_at:'v1'}));
const templates=[{id:'template-one',title:'Uno',folder_id:null},{id:'template-two',title:'Due',folder_id:'folder-alpha'}].map(t=>({...t,description:'Descrizione originale',created_by:'pt-a',created_by_name:'PT Test',archived_at:null,updated_at:'v1',snapshot:structuredClone(snapshot)}));
let clock=1,failTemplate='',includeClient=true;const requests=[];
function query(rows,u){return rows.filter(row=>['id','operator_id','cliente_id','updated_at'].every(key=>{const v=u.searchParams.get(key);return !v||(v.startsWith('eq.')?String(row[key])===v.slice(3):v.startsWith('in.(')?v.slice(4,-1).split(',').includes(row[key]):true);})).slice(Number(u.searchParams.get('offset')||0),Number(u.searchParams.get('offset')||0)+Number(u.searchParams.get('limit')||1000));}
const originalFetch=global.fetch;
global.fetch=async(url,options={})=>{
 const u=new URL(url),table=u.pathname.split('/').at(-1);let rows=[];
 if(table==='operators'||table==='operator_effective_roles')rows=[operator];
 else if(table==='clients')rows=query(includeClient?[client]:[],u);
 else if(table==='schede_allenamento')rows=query([program],u);
 else if(table==='pt_client_current_programs')rows=[{cliente_id:client.id,program_id:program.id}];
 else if(table==='pt_program_folders')rows=query(folders,u);
 else if(table==='pt_program_templates'){
  if(options.method==='POST') {const row=JSON.parse(options.body);row.updated_at='v'+ ++clock;templates.push(row);rows=[row];}
  else {rows=query(templates,u);if(options.method==='PATCH'){const patch=JSON.parse(options.body);rows.forEach(row=>Object.assign(row,patch,{updated_at:'v'+ ++clock}));}}
 }else if(!['appointments','pt_session_records','pt_client_shares','acquisizioni','pt_exercise_archive','carichi_allenamento','pt_hand_grip_measurements'].includes(table))throw Error('Unexpected database call '+table);
 return new Response(JSON.stringify(rows),{status:200});
};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='archive.test')return route.abort();
  if(u.pathname.endsWith('/pt-access-email'))return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,operator,token:auth.signAccessToken(operator.email,operator.id)})});
  if(u.pathname.endsWith('/pt-data')){
   const body=route.request().postDataJSON();requests.push(structuredClone(body));
   if(body.action==='move_template'&&body.templateId===failTemplate){failTemplate='';return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Rete non disponibile'})});}
   const result=await handler({httpMethod:'POST',headers:route.request().headers(),body:JSON.stringify(body)});
   return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body});
  }
  const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body:fs.readFileSync(file)});
 });
 const login=async()=>{await page.goto('https://archive.test/');await page.locator('#loginEmail').fill(operator.email);await page.locator('#loginCode').fill('111111');await page.locator('#loginButton').click();await page.locator('#appShell').waitFor({state:'visible'});};
 await login();await page.locator('.nav-btn[data-view="templatesView"]:visible').click();await page.locator('[data-move-template="template-one"]').waitFor();
 const original=JSON.stringify(templates.map(t=>({id:t.id,title:t.title,description:t.description,snapshot:t.snapshot})));
 await page.locator('[data-move-template="template-one"]').click();await page.locator('#moveTemplateFolder').selectOption('folder-nested');await page.locator('#confirmMoveTemplateBtn').click();await page.locator('#moveTemplateDialog').waitFor({state:'hidden'});
 assert.equal(templates[0].folder_id,'folder-nested');
 await page.locator('[data-unfile-template="template-one"]').click();assert.equal(await page.locator('#moveTemplateFolder').inputValue(),'');await page.locator('#confirmMoveTemplateBtn').click();await page.locator('#moveTemplateDialog').waitFor({state:'hidden'});assert.equal(templates[0].folder_id,null);
 await page.locator('#templateAllFolders').check();await page.locator('#selectVisibleTemplatesBtn').click();assert.match(await page.locator('#moveSelectedTemplatesBtn').innerText(),/\(2\)/);
 failTemplate='template-two';await page.locator('#moveSelectedTemplatesBtn').click();await page.locator('#moveTemplateFolder').selectOption('folder-beta');await page.locator('#confirmMoveTemplateBtn').click();await page.locator('#moveTemplateError').filter({hasText:'Rete non disponibile'}).waitFor();assert.equal(templates[0].folder_id,'folder-beta');assert.equal(templates[1].folder_id,'folder-alpha');
 await page.locator('#confirmMoveTemplateBtn').click();await page.locator('#moveTemplateDialog').waitFor({state:'hidden'});assert.ok(templates.every(t=>t.folder_id==='folder-beta'));
 assert.equal(JSON.stringify(templates.map(t=>({id:t.id,title:t.title,description:t.description,snapshot:t.snapshot}))),original);
 const retries=requests.filter(r=>r.action==='move_template'&&r.templateId==='template-two');assert.equal(retries[0].requestId,retries[1].requestId);
 await page.locator('.nav-btn[data-view="builderView"]:visible').click();await page.locator('#newProgramModal').waitFor({state:'visible'});
 assert.equal(await page.locator('#newProgramGoal').inputValue(),'');assert.equal(await page.locator('#newProgramNotes').inputValue(),'');
 await page.locator('#newProgramSource').selectOption('program');await page.waitForFunction(()=>document.querySelector('#newProgramSourceId').options.length>0);
 assert.equal(await page.locator('#newProgramGoal').inputValue(),'');assert.equal(await page.locator('#newProgramNotes').inputValue(),'');
 await page.locator('#newProgramName').fill('Nuovo modello pulito');await page.locator('#newProgramGoal').fill('Obiettivo scritto a mano');await page.locator('#newProgramNotes').fill('Note generali scritte a mano');
 await page.locator('#createNewProgramBtn').click();await page.locator('#libraryEditorDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#libraryGoal').inputValue(),'Obiettivo scritto a mano');assert.equal(await page.locator('#libraryStudioNotes').inputValue(),'Note generali scritte a mano');
 const editor=page.locator('#libraryProgramEditor');assert.equal(await editor.locator('[data-editor-disclosure^="preparation-"], [data-editor-disclosure^="ramp-"]').count(),0);
 assert.ok(!(await page.locator('#libraryEditorDialog').innerText()).includes('PRIVATE_'));
 await page.locator('#saveLibraryProgramBtn').click();await page.locator('#libraryEditorDialog').waitFor({state:'hidden'});
 const created=templates.find(t=>t.title==='Nuovo modello pulito');assert.ok(created);assert.equal(created.snapshot.program.settings.goal,'Obiettivo scritto a mano');assert.equal(created.snapshot.program.settings.studioNotes,'Note generali scritte a mano');assert.ok(!JSON.stringify(created).includes('PRIVATE_'));
 await login();await page.locator('.nav-btn[data-view="templatesView"]:visible').click();await page.locator('#templateAllFolders').check();await page.locator('[data-edit-template="'+created.id+'"]').click();assert.equal(await page.locator('#libraryStudioNotes').inputValue(),'Note generali scritte a mano');await page.locator('#closeLibraryEditorBtn').click();
 await page.locator('#newLibraryProgramBtn').click();assert.equal(await page.locator('#libraryGoal').inputValue(),'');assert.equal(await page.locator('#libraryStudioNotes').inputValue(),'');assert.equal(await editor.locator('[data-editor-disclosure^="preparation-"], [data-editor-disclosure^="ramp-"]').count(),0);await page.locator('#closeLibraryEditorBtn').click();
 assert.equal(templates.length,3);
 includeClient=false;await login();await page.locator('.nav-btn[data-view="builderView"]:visible').click();
 await page.locator('#newProgramName').fill('Bozza senza cliente');await page.locator('#createNewProgramBtn').click();await page.locator('#libraryEditorDialog').waitFor({state:'visible'});
 assert.equal(await page.locator('#libraryGoal').inputValue(),'');assert.equal(await page.locator('#libraryStudioNotes').inputValue(),'');await page.locator('#closeLibraryEditorBtn').click();
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/neacea-archive-moves-mobile.png',fullPage:true});
 console.log('PASS mobile archive: nested/root moves, bulk move with partial error/retry, immutable program contents, fresh creation and explicit notes saved/reopened, no personal data, simplified editor');
 }finally{await browser.close();global.fetch=originalFetch;}
})().catch(e=>{console.error(e);process.exitCode=1});
