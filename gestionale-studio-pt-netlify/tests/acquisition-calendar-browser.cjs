// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// Every browser request and backend fetch is intercepted; no live data is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
process.env.PT_ACCESS_SECRET = 'local-simulation-only';
const { handler } = require('../netlify/functions/schedule-client-package');
const acquisitionAudit = require('../netlify/functions/acquisition-calendar-activity').handler;
const payload = Buffer.from(JSON.stringify({ email: 'owner@example.test', operatorId: 'owner', accessLevel: 'owner', exp: Date.now() + 3600000 })).toString('base64url');
const token = payload + '.' + crypto.createHmac('sha256', process.env.PT_ACCESS_SECRET).update(payload).digest('base64url');
let lead = { id: 'test-lead', nome: 'Cliente', cognome: 'SIMULATO', email: 'client@example.test', servizi: 'PT', sessioni_pref: '2×', stato: 'Pronto a iniziare', impressioni: '', data_acquisizione: '2026-09-12' };
const operator = { id: 'test-pt', nome: 'PT', cognome: 'SIMULATO', active: true, roles: ['pt'] };
let clients = [], appointments = [], backendCalls = 0, failed = false;
const failure = process.env.CALENDAR_FAILURE || '';
const availability = [{operator_id:'test-pt',day_key:'tue',slots:['17:00-18:00']},{operator_id:'test-pt',day_key:'thu',slots:['18:00-19:00']}];
const json = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
function database(url, method = 'GET', body) {
  const u = new URL(url), table = u.pathname.split('/').pop();
  if (table === 'calendar_planning_snapshot') return { revision: 'simulated', clients, appointments, operators:[operator], availability };
  if (table === 'calendar_audit_write' && body.p_operation === 'client') {
    for(const row of body.p_payload.rows) { const existing=clients.find(c=>c.id===row.id); if(existing)Object.assign(existing,row);else clients.push(row); }
    return body.p_payload.rows;
  }
  if (table === 'calendar_audit_write' && body.p_operation === 'package') {
    body={p_rows:body.p_payload.rows};
    if (!failed && failure === 'beforeCommit') { failed=true; throw Error('simulated before commit'); }
    appointments.push(...body.p_rows);
    if (!failed && failure === 'afterCommit') { failed=true; throw Error('simulated lost response'); }
    return {success:true,appointmentIds:body.p_rows.map(a=>a.id)};
  }
  if (table === 'operator_effective_roles') return [{ operator_id: 'owner', email: 'owner@example.test', active: true, system_roles: ['owner'] }];
  if (table === 'operators') return [operator];
  if (table === 'acquisizioni') { if (method === 'PATCH') lead = { ...lead, ...body }; return [lead]; }
  if (table === 'clients') {
    if (method === 'POST') clients.push(body);
    return clients.filter(c => !u.searchParams.has('id') || c.id === u.searchParams.get('id').replace(/^eq\./, ''));
  }
  if (table === 'appointments') {
    if (method === 'POST') { appointments.push(...body); return body; }
    const offset = Number(u.searchParams.get('offset') || 0), limit = Number(u.searchParams.get('limit') || 10000);
    return appointments.filter(a => a.status !== 'annullato').slice(offset, offset + limit);
  }
  if (table === 'operator_availability') return [];
  throw Error('Unexpected simulated table: ' + table);
}
global.fetch = async (url, options = {}) => {
  backendCalls++;
  assert.ok(String(url).includes('/rest/v1/'));
  return json(database(url, options.method, options.body && JSON.parse(options.body)));
};
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.includes('acquisition-calendar-activity')) {
        const result=await acquisitionAudit({httpMethod:request.method(),body:request.postData()});
        return route.fulfill({status:result.statusCode,contentType:'application/json',body:result.body});
      }
      if (url.pathname.includes('schedule-client-package')) {
        const result = await handler({ httpMethod: request.method(), body: request.postData() });
        return route.fulfill({ status: result.statusCode, contentType: 'application/json', body: result.body });
      }
      if (url.pathname.includes('pt-access-email')) return route.fulfill({ json: { success: true, operatorId: 'owner', email: 'owner@example.test', accessLevel: 'owner', expiresAt: Date.now() + 3600000 } });
      if (url.pathname.includes('/rest/v1/')) return route.fulfill({ json: database(request.url(), request.method(), request.postData() && request.postDataJSON()) });
      if (url.origin === 'http://calendar-simulation.test' && ['/index-calendar-test.html', '/index.html', '/activation-calendar-integration.js'].includes(url.pathname)) {
        return route.fulfill({ contentType: url.pathname.endsWith('.js') ? 'application/javascript' : 'text/html', body: fs.readFileSync(path.join(root, 'app/acquisizione', url.pathname.slice(1)), 'utf8') });
      }
      return route.fulfill({ status: 204, body: '' });
    });
    await page.goto('http://calendar-simulation.test/index.html?mode=owner&access=' + encodeURIComponent(token));
    const frame = page;
    assert.equal(await page.locator('script[data-neacea-calendar-integration]').count(), 1);
    await frame.locator('.prospect-card .card-name').click();
    await frame.locator('#btn-conferma-scheda').click();
    await frame.locator('#conf-new-client-fields').waitFor({ state: 'visible' });
    await frame.locator('#conf-tipo').selectOption('Mensile');
    await frame.locator('#conf-pt').selectOption('test-pt');
    await frame.locator('#conf-sess-tot').fill('8');
    await frame.locator('#conf-data').fill('2026-09-15');
    await frame.locator('input[type=checkbox][value="Martedì"]').check();
    await frame.getByLabel('Orario Martedì').fill('17:00');
    await frame.locator('input[type=checkbox][value="Giovedì"]').check();
    await frame.getByLabel('Orario Giovedì').fill('18:00');
    assert.match(await frame.locator('#conf-schedule-summary').innerText(), /Martedì 17:00.*Giovedì 18:00/);
    await page.screenshot({ path: process.env.CALENDAR_QA_SCREENSHOT || '/tmp/neacea-calendar-simulation.png', fullPage: true });
    await frame.locator('#btn-conf').click();
    if (failure) {
      await frame.locator('#calendar-pending button').waitFor({state:'visible'});
      await page.waitForFunction(() => document.querySelector('#btn-conf').disabled === false);
      await page.reload();
      const resumed = page;
      await resumed.locator('#calendar-pending button').waitFor({state:'visible'});
      await resumed.locator('#calendar-pending button').click();
      await resumed.locator('#calendar-pending').waitFor({state:'hidden'});
      assert.equal(clients.length,1, 'resume must not activate a duplicate client');
    } else {
      await frame.locator('#mo-conferma').waitFor({ state: 'hidden' });
    }
    assert.equal(clients.length, 1);
    assert.equal(lead.stato, 'Convertito');
    assert.equal(appointments.length, 8);
    assert.equal(clients[0].sessions_remaining, 8);
    assert.equal(appointments[0].start_time, '17:00');
    assert.equal(appointments[1].start_time, '18:00');
    assert.ok(appointments.every(a => a.operator_id === 'test-pt'));
    const request = { httpMethod: 'POST', body: JSON.stringify({ accessToken: token, clientId: clients[0].id, serviceId: 'pt11', operatorId: 'test-pt', startDate: '2026-10-20', schedule: [{ weekday: 'Martedì', time: '17:00' }] }) };
    assert.equal(JSON.parse((await handler(request)).body).plan.created, 0);
    assert.equal(appointments.length, 8);
    // Read the real calendar metrics against the same in-memory appointments.
    const client = { id: clients[0].id, sessionsTotal: 8, sessionsRemaining: 8, packageCycleStart: '2026-09-15', packageTypes: ['PT 1:1'] };
    const calendarRows = () => appointments.map(a => ({ ...a, serviceId: a.service_id, clientIds: a.client_ids, startTime: a.start_time }));
    class TestDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-09-12T12:00:00Z'])); } static now() { return new Date('2026-09-12T12:00:00Z').getTime(); } }
    const context = vm.createContext({ console, Date: TestDate, State: { getAppointments: calendarRows, getClients: () => [client] }, CONFIG: { SERVICES: { pt11: { usesPackageSessions: true } } } });
    vm.runInContext(fs.readFileSync(path.join(root, 'app/calendario-studio/js/services.js'), 'utf8') + '\nglobalThis.metrics = Services.getClientSessionMetrics;', context);
    assert.equal(context.metrics(client).remaining, 8);
    appointments[0].status = 'fatto';
    assert.equal(context.metrics(client).remaining, 7);
    clients[0].sessions_remaining = 7;
    appointments[2].date = '2026-09-23';
    assert.equal(context.metrics(client).remaining, 7);
    appointments[3].status = 'annullato';
    assert.equal(context.metrics(client).remaining, 7);
    assert.equal(context.metrics(client).toSchedule, 1);
    assert.equal(JSON.parse((await handler(request)).body).plan.created, 1);
    assert.equal(JSON.parse((await handler(request)).body).plan.created, 0);
    assert.equal(clients[0].sessions_remaining, 7);
    assert.deepEqual(errors, []);
    assert.ok(backendCalls > 0);
    console.log('PASS browser ' + (failure || 'normal') + ' + pagina production + backend simulato: attivazione, 8 sedute, residuo 8→7 con Fatto, spostamento, annullamento e blocco oltre pacchetto. Nessuna richiesta reale.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
