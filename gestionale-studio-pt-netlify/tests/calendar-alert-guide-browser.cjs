// Real Calendar UI and metrics, synthetic records, intercepted external services.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright', { paths: [path.resolve(__dirname, '../tools/coaching-editor')] }));

(async () => {
  const releaseOrigin = process.env.CALENDAR_ALERT_RELEASE_ORIGIN || '';
  if (releaseOrigin && !/^https:\/\/(?:[a-f0-9]+--)?new-calendar-neacea\.netlify\.app$/.test(releaseOrigin)) throw Error('Unexpected Calendar release origin');
  const browser = await chromium.launch({ headless: true });
  try {
    const clients = ['missing', 'cycle', 'over', 'done', 'regular', 'extra-one', 'extra-two', 'archived'].map(id => ({
      id, nome: id === 'cycle' ? 'Cliente <em>Test</em>' : 'TEST', cognome: id,
      active: id !== 'archived', pt_assegnato: id === 'over' ? 'other-pt' : 'pt',
      package_types: ['PT 1:1'], sessions_total: id === 'missing' ? 0 : id === 'regular' ? 8 : 2,
      sessions_remaining: id === 'done' ? 0 : 2,
      package_start: '2026-10-01', notes: id === 'cycle' ? '' : '[CICLO-PACCHETTO 2026-10-01]',
      importo: 200, stato_pagamento: 'Da pagare', package_frequency: '1x settimana',
    }));
    const appointments = [
      ['cycle', 'fatto', '2026-10-02', 'Rinnovo pacchetto da 2026-10-01'],
      ['over', 'prenotato', '2099-11-06'], ['over', 'prenotato', '2099-11-07'], ['over', 'prenotato', '2099-11-08'],
      ['done', 'fatto', '2026-10-02'], ['done', 'fatto', '2026-10-03'],
    ].map(([id, status, date, notes = ''], i) => ({ id: `session-${i}`, client_ids: [id], service_id: 'pt11', operator_id: 'pt', date, start_time: '10:00', duration: 60, status, notes }));
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Rome' });
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.includes('/.netlify/functions/')) {
        const body = request.postData() ? request.postDataJSON() : {};
        if (url.pathname.endsWith('calendar-runtime')) return route.fulfill({ json: { CALENDAR_FLEX_MODE: true } });
        if (url.pathname.endsWith('apple-caldav-link')) return route.fulfill({ json: { eligible: false } });
        if (url.pathname.endsWith('calendar-client-finance')) return route.fulfill({ status: 503, json: { error: 'Riscontro sintetico non disponibile' } });
        if (url.pathname.endsWith('calendar-activity')) {
          if (body.operation === 'session') return route.fulfill({ json: { actor: { id: 'owner', role: 'owner' } } });
          if (body.operation === 'expected_renewals' && body.payload?.action === 'list') return route.fulfill({ json: { proposals: [] } });
          writes.push(body);
        }
        return route.fulfill({ json: [] });
      }
      if (url.pathname.includes('/rest/v1/')) {
        if (request.method() !== 'GET') writes.push(request.method());
        const table = url.pathname.split('/').at(-1);
        return route.fulfill({ json: table === 'clients' ? clients : table === 'appointments' ? appointments : table === 'operators' ? [{ id: 'pt', nome: 'Trainer', cognome: 'Test', active: true, roles: ['PT'] }] : [] });
      }
      if (url.hostname !== 'calendar.test') return route.fulfill({ body: '' });
      const file = path.join(__dirname, '../app/calendario-studio', url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      let contents = fs.readFileSync(file);
      if (releaseOrigin) {
        const response = await fetch(releaseOrigin + url.pathname + url.search, { signal: AbortSignal.timeout(30000) });
        assert.equal(response.status, 200, url.pathname);
        contents = Buffer.from(await response.arrayBuffer());
      }
      return route.fulfill({ contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', body: contents });
    });
    await page.goto('https://calendar.test/?access=SIM');
    await page.waitForFunction(() => State.getClients().length === 8 && State.getAppointments().length === 6);
    await page.evaluate(() => Calendar.switchView('clients'));
    const original = await page.evaluate(() => JSON.stringify([State.getClients(), State.getAppointments()]));
    await page.getByRole('button', { name: 'Alert gestione: 7 clienti, apri spiegazioni e soluzioni' }).click();
    assert.equal(await page.locator('.package-alert-guide section').count(), 7);
    assert.ok(!(await page.locator('.package-alert-guide').innerText()).includes('archived'));

    // All nine types come from real metrics, each opens meaningful guidance.
    const cases = [
      ['missing', 'Sessioni totali mancanti', 'Apri Modifica pacchetto', 'Modifica pacchetto e giorni'],
      ['cycle', 'Conferma il ciclo corrente', 'Verifica il ciclo', 'Quadro pacchetto'],
      ['cycle', 'Residuo da riallineare:', 'Controlla sedute e residuo', 'Quadro pacchetto'],
      ['cycle', 'Pacchetto quasi finito', 'Apri pagamenti e rinnovo', 'Quadro pacchetto'],
      ['regular', 'da programmare', 'Apri la programmazione', 'Quadro pacchetto'],
      ['over', 'oltre pacchetto', 'Verifica le singole sedute', 'Quadro pacchetto'],
      ['cycle', 'Nessun prossimo appuntamento', 'Controlla gli appuntamenti', 'Quadro pacchetto'],
      ['done', 'Pacchetto completato', 'Apri pagamenti e rinnovo', 'Quadro pacchetto'],
      ['cycle', 'Pagamento aperto:', 'Verifica i pagamenti', 'Quadro pacchetto'],
    ];
    for (const [id, label, action, heading] of cases) {
      await page.evaluate(() => { UI.closeModal(); Clients.openAlertSummary(); });
      const section = page.locator('.package-alert-guide section').filter({ has: page.locator('h4', { hasText: id }) }).first();
      await section.getByRole('button', { name: new RegExp(label) }).click();
      const guide = page.locator('.package-alert-guide');
      await guide.getByText('Cosa significa', { exact: true }).waitFor();
      await guide.getByText('Cosa puoi fare', { exact: true }).waitFor();
      assert.equal(await guide.locator('section').count(), 1);
      assert.equal(await page.locator('.modal-subtitle em').count(), 0, 'Client name must be escaped');
      await guide.getByRole('button', { name: action, exact: true }).click();
      await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      if (['Apri pagamenti e rinnovo', 'Verifica i pagamenti'].includes(action)) {
        assert.equal(await page.locator('#pkg-workspace-finance').getAttribute('aria-pressed'), 'true');
      }
    }

    // Dashboard covers alerts beyond its two visible tags. Keyboard access works.
    await page.evaluate(() => { UI.closeModal(); Calendar.switchView('dashboard'); });
    const dashboardGuide = page.locator('.package-alert-row').filter({ hasText: 'Cliente <em>Test</em>' }).getByRole('button', { name: /Spiegazioni e soluzioni/ });
    await dashboardGuide.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.package-alert-guide section').count(), 6);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.ok(await page.locator('.package-alert-guide').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: '/tmp/neacea-calendar-alert-guide-mobile.png' });
    await page.evaluate(() => { UI.closeModal(); Calendar.switchView('clients'); });
    // Clicking a badge inside the client row must not open the row's edit action.
    await page.locator('#view-clients .package-alert-button').filter({ hasText: 'Sessioni totali mancanti' }).click();
    await page.getByRole('heading', { name: 'Spiegazioni e soluzioni', exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/neacea-calendar-alert-missing-mobile.png' });

    // Existing PT permissions apply to guidance and its navigation as well.
    await page.evaluate(() => { UI.closeModal(); App.portalPt = { enabled: true, authorized: true, operator: { id: 'pt' } }; Clients.render(); Clients.openAlertSummary(); });
    assert.equal(await page.locator('.package-alert-guide section').count(), 6);
    assert.ok(!(await page.locator('.package-alert-guide').innerText()).includes('Pagamento aperto'));
    await page.evaluate(() => Clients.openAlerts('cycle', 'almost-finished'));
    await page.getByText('Per gestire rinnovi, pagamenti o archiviazione rivolgiti alla Direzione.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Apri pagamenti e rinnovo', exact: true }).count(), 0);
    await page.evaluate(() => Clients.openAlerts('missing', 'missing-total'));
    await page.getByRole('button', { name: 'Apri Modifica pacchetto', exact: true }).click();
    await page.getByRole('heading', { name: 'Modifica pacchetto e giorni', exact: true }).waitFor();
    await page.evaluate(() => { UI.closeModal(); Clients.openAlerts('over'); Clients.openAlertAction('over', 'over-planned'); Clients.openAlertAction('cycle', 'almost-finished'); });
    assert.equal(await page.locator('.package-alert-guide').count(), 0);
    assert.equal(await page.evaluate(() => JSON.stringify([State.getClients(), State.getAppointments()])), original);
    assert.deepEqual(writes, [], 'Guidance and navigation must never save or repair records');
    assert.deepEqual(errors, []);
    console.log('PASS alert guidance: all 9 types, summary, dashboard, row clicks, destinations, keyboard, mobile, escaped names, PT visibility and no writes. External services simulated. Assets: ' + (releaseOrigin || 'local candidate'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
