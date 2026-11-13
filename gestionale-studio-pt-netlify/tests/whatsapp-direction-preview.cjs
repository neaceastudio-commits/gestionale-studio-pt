const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { buildAgendas } = require('../netlify/functions/lib/whatsapp-agenda');
const { createHandler } = require('../netlify/functions/whatsapp-agenda');

const root = path.join(__dirname, '../app/calendario-studio');
const day = '2026-11-12';
const operators = ['A', 'B', 'C'].map(id => ({ id, nome: 'Trainer', cognome: id, roles: ['pt'], active: true }));
const clients = [
  { id: '1', nome: 'Cliente', cognome: 'Uno', sessions_total: 8, sessions_remaining: 5 },
  { id: '2', nome: 'Cliente', cognome: 'Due', sessions_total: 12, sessions_remaining: 7 }
];
const appointments = [
  { id: '1', date: day, status: 'prenotato', operator_id: 'A', start_time: '09:00', service_id: 'pt11', client_ids: ['1'] },
  { id: '2', date: day, status: 'prenotato', operator_id: 'B', start_time: '11:00', service_id: 'pt12', client_ids: ['1', '2'] }
];

async function run(browser, role) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let failNext = false;
  let roster = operators;
  const calls = [];
  const testCalls = [];
  let testStatus = 'not_configured';
  const handler = createHandler({
    authenticate: async () => ({ id: 'demo', role }),
    service: { run: async ({ dryRun }) => {
      assert.equal(dryRun, true);
      if (failNext) { failNext = false; throw Error('simulated failure'); }
      return { day, agendas: buildAgendas({ operators: roster, appointments, clients }, day) };
    } }
  });

  // Exercise the calendar's own tab navigation with no database or provider.
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/<script src="[^"]+"><\/script>/g, tag =>
      /src="js\/(?:app|calendar|whatsapp-agenda)\.js\?/.test(tag) ? tag : '')
    .replace('</body>', `<script>
      const State = { init() {} }, CONFIG = { SHEETS: {} }, Operators = { render() {} };
      App.refreshFromSupabase = async () => {};
    </script></body>`);
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/.netlify/functions/whatsapp-agenda-test') {
      const body = request.postDataJSON();
      testCalls.push(body);
      if (body.action === 'send') testStatus = 'accepted';
      return route.fulfill({ json: { status: testStatus } });
    }
    if (url.pathname === '/.netlify/functions/whatsapp-agenda') {
      const body = request.postDataJSON();
      calls.push(body);
      const response = await handler({ httpMethod: 'POST', body: request.postData() });
      return route.fulfill({ status: response.statusCode, headers: response.headers, body: response.body });
    }
    if (url.origin !== 'https://calendar.test') return route.abort();
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    const file = path.join(root, url.pathname);
    if (fs.existsSync(file)) return route.fulfill({ path: file });
    return route.fulfill({ status: 404 });
  });
  try {
    await page.goto('https://calendar.test/?view=operators');
    await page.waitForLoadState('networkidle');
    const tab = page.getByRole('button', { name: 'Direzione', exact: true });
    if (role === 'owner') {
      await tab.click();
      await page.getByText('WhatsApp', { exact: true }).click();
      const picker = page.getByLabel('Personal trainer', { exact: true });
      const message = page.locator('#agenda-direction-content pre');
      await picker.waitFor();
      assert.match(await message.innerText(), /09:00 · Cliente Uno · PT 1:1 · 3\/8/);
      await picker.selectOption('B');
      assert.match(await message.innerText(), /11:00 · Cliente Uno \(3\/8\) \+ Cliente Due \(5\/12\) · PT 1:2/);
      assert.doesNotMatch(await message.innerText(), /09:00/);
      await picker.selectOption('C');
      assert.match(await message.innerText(), /Nessuna seduta/);
      const refresh = page.getByRole('button', { name: 'Aggiorna anteprima' });
      await refresh.click();
      await picker.waitFor();
      assert.equal(await picker.inputValue(), 'C');
      failNext = true;
      await refresh.click();
      await page.getByRole('status').filter({ hasText: /riprovare/ }).waitFor();
      assert.equal(await message.count(), 0);
      roster = [];
      await refresh.click();
      await page.getByText(/Nessun PT attivo/).waitFor();
      assert.equal(await picker.count(), 0);
      assert.ok(calls.every(c => c.dryRun === true && ['session', 'agenda'].includes(c.action)));
      const send = page.getByRole('button', { name: 'Invia prova al mio numero' });
      await page.getByText('Manca la configurazione WhatsApp dell’anteprima.').waitFor();
      assert.equal(await send.isDisabled(), true);
      assert.ok(testCalls.every(c => c.action === 'status'));
      const summary = page.getByText('WhatsApp', { exact: true });
      await summary.click();
      testStatus = 'ready';
      await summary.click();
      await send.click();
      await page.getByText('Meta ha accettato la prova. Controlla la chat con NEACEA.').waitFor();
      assert.equal(await send.isDisabled(), true);
      assert.deepEqual(testCalls.filter(c => c.action === 'send'), [{ action: 'send', accessToken: '' }]);
    } else {
      assert.equal(await tab.count(), 0);
      assert.equal(await page.locator('#direction-whatsapp').isVisible(), false);
      assert.deepEqual(calls.map(c => c.action), ['session']);
      assert.equal(testCalls.length, 0);
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  try {
    for (const role of ['owner', 'pt']) await run(browser, role);
    console.log('PASS Direzione: selezione PT, coppia, agenda vuota, aggiornamento, errore e accessi.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
