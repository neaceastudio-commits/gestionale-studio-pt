const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
process.env.PT_ACCESS_SECRET = 'scope-browser-fixture';
process.env.SUPABASE_SECRET_KEY = 'scope-browser-fixture';
process.env.PT_SESSION_LOG_ENABLED = 'true';
const auth = require('../netlify/functions/lib/pt-auth');
const { handler } = require('../netlify/functions/pt-data');
const root = path.resolve(__dirname, '../app/portale-personal-trainer');
const operators = ['temp', 'owner'].map(id => ({id,operator_id:id,nome:id,cognome:'Test',email:id+'@example.test',active:true,legacy_roles:['PT'],portal_access_enabled:true,portal_access_version:0}));
const clients = [
  {id:'own',nome:'Cliente',cognome:'Referente',pt_assegnato:'temp',active:true},
  {id:'last',nome:'Cliente',cognome:'Ultima seduta',pt_assegnato:'owner',active:true},
  {id:'multiple',nome:'Cliente',cognome:'Due sedute',pt_assegnato:'owner',active:true},
  {id:'hibernated',nome:'Cliente',cognome:'Ibernato',pt_assegnato:'owner',active:true,stato_abbonamento:'Ibernato'},
];
const appointments = [['last-one','last'],['multi-one','multiple'],['multi-two','multiple'],['hidden-one','hibernated']].map(([id,c])=>({id,operator_id:'temp',client_ids:[c],service_id:'pt11',date:'2026-01-01',start_time:'10:00:00',status:'fatto'}));
const programs = clients.map(c=>({id:'p-'+c.id,cliente_id:c.id,created_at:'2026-01-01T12:00:00Z',updated_at:'2026-01-01T12:00:00Z',data:{name:'Programma '+c.id,periodo:'2026-01',settimane:2,giorni:[{id:'A',nome:'Allenamento A',esercizi:[{id:'squat',nome:'Squat',serie:1,ripetizioni:8,recupero:'90 sec'}]}]}}));
const records = [], originalFetch = global.fetch;
let failNext = true;
function query(rows,u){
  return rows.filter(row=>['id','operator_id','cliente_id'].every(key=>{
    const value=u.searchParams.get(key);if(!value)return true;
    return value.startsWith('eq.')?String(row[key])===value.slice(3):value.startsWith('in.(')?value.slice(4,-1).split(',').includes(row[key]):true;
  })).slice(Number(u.searchParams.get('offset')||0),Number(u.searchParams.get('offset')||0)+Number(u.searchParams.get('limit')||1000));
}
global.fetch = async (url, options={})=>{
  const u=new URL(url),table=u.pathname.split('/').at(-1);let rows=[];
  if(table==='operator_effective_roles'||table==='operators')rows=query(operators,u);
  else if(table==='clients')rows=query(clients,u);
  else if(table==='appointments')rows=query(appointments,u);
  else if(table==='schede_allenamento')rows=query(programs,u);
  else if(table==='pt_session_records')rows=query(records,u);
  else if(table==='pt_client_current_programs')rows=query(clients.map(c=>({cliente_id:c.id,program_id:'p-'+c.id})),u);
  else if(table==='pt_save_session_record'){
    const b=JSON.parse(options.body),record={id:'record-'+b.p_appointment_id,appointment_id:b.p_appointment_id,cliente_id:b.p_cliente_id,operator_id:b.p_actor_id,program_id:b.p_program_id,data:b.p_data,version:1,updated_at:'2026-10-07T09:00:00Z'};
    records.push(record);rows={record};
  } else if(!['pt_client_shares','acquisizioni','pt_exercise_archive','carichi_allenamento','pt_hand_grip_measurements','pt_program_templates','pt_program_folders'].includes(table))throw Error('Unexpected database call '+table);
  return new Response(JSON.stringify(rows),{status:200});
};
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.hostname!=='scope.test')return route.abort();
      if(u.pathname.endsWith('/pt-access-email'))return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,operator:operators[0],token:auth.signAccessToken(operators[0].email,'temp')})});
      if(u.pathname.endsWith('/pt-data')){
        const body=route.request().postDataJSON();
        if(body.action==='save_session_record'&&failNext){failNext=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Rete non disponibile'})});}
        const response=await handler({httpMethod:'POST',headers:route.request().headers(),body:JSON.stringify(body)});
        return route.fulfill({status:response.statusCode,headers:response.headers,body:response.body});
      }
      const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
      return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream',body:fs.readFileSync(file)});
    });
    const login=async()=>{await page.goto('https://scope.test/');await page.locator('#loginEmail').fill('temp@example.test');await page.locator('#loginCode').fill('111111');await page.locator('#loginButton').click();await page.locator('#appShell').waitFor({state:'visible'});};
    const ids=()=>page.locator('#clientList [data-client-id]').evaluateAll(els=>els.map(el=>el.dataset.clientId).sort());
    const save=async(id,appt)=>{await page.locator(`[data-client-id="${id}"]`).click();await page.locator('[data-preview-program="p-'+id+'"]').first().click();await page.getByLabel('Data della seduta assegnata').selectOption(appt);await page.getByLabel('Carico',{exact:true}).fill('45');await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();};
    await login();assert.deepEqual(await ids(),['last','multiple','own']);
    assert.equal(await page.evaluate(()=>appState.clients.some(c=>c.id==='hibernated')),false);
    await page.locator('#trainerFilter').selectOption('temp');assert.deepEqual(await ids(),['last','multiple','own']);
    await page.locator('#trainerFilter').selectOption('owner');assert.deepEqual(await ids(),['last','multiple']);
    await page.locator('#trainerFilter').selectOption('');
    await save('last','last-one');await page.locator('#sheetView p[role="status"]').filter({hasText:'Rete non disponibile'}).waitFor();assert.match(await page.locator('#sheetView p[role="status"]').innerText(),/Rete non disponibile/);
    assert.deepEqual(await ids(),['last','multiple','own']);assert.equal(records.length,0);
    await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#clientList [data-client-id="last"]'));
    assert.equal(records.length,1);assert.match(await page.locator('#trainerFilter option[value="temp"]').innerText(),/Clienti: 2/);
    await login();assert.deepEqual(await ids(),['multiple','own'],'last saved session stays out after reload');
    await save('multiple','multi-one');await page.locator('#sheetView p[role="status"]').filter({hasText:'salvata e tracciata'}).waitFor();assert.match(await page.locator('#sheetView p[role="status"]').innerText(),/salvata e tracciata/);assert.deepEqual(await ids(),['multiple','own']);
    await page.getByLabel('Data della seduta assegnata').selectOption('multi-two');await page.getByRole('button',{name:'Salva registrazione',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#clientList [data-client-id="multiple"]'));
    assert.deepEqual(await ids(),['own']);
    clients.find(c=>c.id==='hibernated').stato_abbonamento='Attivo';
    await login();assert.deepEqual(await ids(),['hibernated','own'],'reactivation restores current temporary assignment');
    await page.locator('#trainerFilter').selectOption('owner');assert.deepEqual(await ids(),['hibernated','last','multiple'],'referent keeps completed clients');
    assert.deepEqual(errors,[]);
    console.log('PASS full mobile Portal: backend scope, own/named PT counts, hidden/rehabilitated clients, failed save, last/remaining sessions, immediate removal, reload, preserved referent');
  }finally{await browser.close();global.fetch=originalFetch;}
})().catch(e=>{console.error(e);process.exitCode=1});
