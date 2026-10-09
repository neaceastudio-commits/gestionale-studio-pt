const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const crypto = require('node:crypto');
process.env.PT_ACCESS_SECRET='SIM_SIGNING'; process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_SERVER';
const {handler}=require(path.join(process.cwd(),'netlify/functions/studio-calendar-activity'));
const payload=Buffer.from(JSON.stringify({operatorId:'owner',email:'owner@example.test',accessLevel:'owner',exp:Date.now()+600000})).toString('base64url');
const token=payload+'.'+crypto.createHmac('sha256','SIM_SIGNING').update(payload).digest('base64url');
const root = path.join(process.cwd(), 'app/portale-pt-fase1');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage();
    const errors = [], mutations = [];
    page.on('pageerror', e => errors.push(e.message));
    const operators = [1,2].map(n => ({operator_id:'pt'+n,nome:'Trainer',cognome:String(n),email:'pt'+n+'@example.test',legacy_roles:['PT'],active:true,portal_access_enabled:true}));
    const clients = [1,2].map(n => ({id:'c'+n,nome:'Cliente',cognome:String(n),pt_assegnato:'pt'+n,active:true}));
    global.fetch=async (url, options) => {
      if(url.includes('operator_effective_roles')) return {ok:true,text:async()=>JSON.stringify([{operator_id:'owner',email:'owner@example.test',active:true,legacy_roles:['Direzione'],system_roles:[]}])};
      const body=JSON.parse(options.body);
      if(body.p_operation==='operator' && 'portal_access_enabled' in body.p_payload.rows[0]) return {ok:false,status:400,text:async()=>JSON.stringify({message:'column portal_access_enabled does not exist'})};
      mutations.push(body);
      return {ok:true,text:async()=>JSON.stringify(body.p_payload.rows)};
    };
    await page.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (u.hostname === 'centrale.test') {
        const file = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname);
        assert.ok(file.startsWith(root));
        const type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html';
        return route.fulfill({contentType:type,body:fs.readFileSync(file)});
      }
      if(u.pathname.endsWith('/studio-calendar-activity')) {
        const result=await handler({httpMethod:req.method(),body:req.postData()});
        return route.fulfill({status:result.statusCode,contentType:'application/json',body:result.body});
      }
      if(u.pathname.includes('/rest/v1/')) assert.equal(req.method(),'GET','No anonymous REST writes');
      if(req.method() !== 'GET') {
        mutations.push({url:u.href,method:req.method(),body:req.postDataJSON()});
        return route.fulfill({json:u.pathname.endsWith('pt-access-email')?{success:true}:[]});
      }
      const table = u.pathname.split('/').pop();
      return route.fulfill({json:table==='operator_effective_roles'?operators:table==='clients'?clients:[]});
    });
    await page.goto('https://centrale.test/?access='+encodeURIComponent(token));
    await page.getByText('Direzione verificata · salvataggi abilitati').waitFor();
    await page.waitForFunction(() => document.querySelector('#operatorSelect').options.length === 3);
    await page.selectOption('#operatorSelect','pt1');
    await page.waitForFunction(() => document.querySelector('#kpiClients').textContent === '1');
    await page.click('[data-view="clients"]');
    assert.match(await page.locator('#clientList').innerText(), /Cliente 1/);
    assert.doesNotMatch(await page.locator('#clientList').innerText(), /Cliente 2/);
    await page.click('[data-view="assignments"]');
    assert.equal(await page.locator('#ptAccessForm').count(),0);
    assert.equal(await page.getByRole('link',{name:'Gestisci accesso personale PT'}).getAttribute('href'),'https://cruscotto-pt.netlify.app/#access');
    assert.equal(mutations.length,0);
    assert.equal(await page.locator('#assignButton').count(),0);
    assert.equal(await page.getByRole('link',{name:'Apri assegnazioni nel Cruscotto PT'}).getAttribute('href'),'https://cruscotto-pt.netlify.app/#assignments');
    await page.evaluate(()=>sessionStorage.clear());
    await page.goto('https://centrale.test/');
    const denied=await page.evaluate(async()=>{try{await StudioAudit.write('operators','?id=eq.pt1',{email:'bad@example.test'});return false}catch{return true}});
    assert.equal(denied,true);
    assert.deepEqual(errors,[]);
    console.log('PASS Centrale: caricamento, filtro PT, assegnazioni e accesso trasferiti al Cruscotto, scritture anonime negate; nessuna richiesta a servizi reali.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
