const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

// Every URL is intercepted. No production data or credentials are used.
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage({ timezoneId: 'Europe/Rome' });
    const errors = [], writes = [];
    let fail = false, release, pending;
    const clients = [
      { id: 'test-a', nome: 'TEST', cognome: 'UNO', active: true, package_types: ['PT 1:1'], tipo_servizio: 'PT 1:1', sessions_total: 12, sessions_remaining: 8, giorni_settimana: ['Lunedì'] },
      { id: 'test-b', nome: 'TEST', cognome: 'DUE', active: true, package_types: ['PT 1:2'], tipo_servizio: 'PT 1:2', sessions_total: 8, sessions_remaining: 5 }
    ];
    const appointments = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const r = route.request(), u = new URL(r.url());
      if (u.hostname.startsWith('fonts.')) return route.fulfill({ body: '' });
      if(u.pathname.endsWith('whatsapp-agenda')) return route.fulfill({status:403,json:{error:'direction_only'}});
      if (u.pathname.endsWith('calendar-runtime')) return route.fulfill({ json: { CALENDAR_FLEX_MODE: true } });
      if (u.pathname.endsWith('apple-caldav-link')) return route.fulfill({ json: { eligible: false, linked: false } });
      if (u.pathname.endsWith('calendar-activity')) {
        const body = r.postDataJSON();
        if (body.operation === 'session') return route.fulfill({ json: { actor: { id: 'staff_1', role: 'owner' } } });
        writes.push(body);
        if (pending) await pending;
        if (fail) return route.fulfill({ status: 409, json: { error: 'TEST: salvataggio rifiutato' } });
        if (body.operation === 'client') {
          assert.equal(body.payload.method, 'PATCH');
          const patch = body.payload.rows[0], index = clients.findIndex(c => c.id === patch.id);
          clients[index] = { ...clients[index], ...patch };
          return route.fulfill({ json: [clients[index]] });
        }
        assert.equal(body.operation, 'save');
        appointments.push(body.payload.appointment);
        return route.fulfill({ json: { appointment: body.payload.appointment, clients } });
      }
      if (u.pathname.includes('/rest/v1/')) {
        assert.equal(r.method(), 'GET', 'No browser public writes');
        const table = u.pathname.split('/').pop();
        return route.fulfill({ json: table === 'clients' ? clients.filter(c => !u.searchParams.has('id') || u.searchParams.get('id') === 'eq.' + c.id) : table === 'appointments' ? appointments : table === 'operators' ? [{ id: 'pt', nome: 'PT', cognome: 'TEST', roles: ['PT'], active: true }] : [] });
      }
      const file = path.join(__dirname, '../app/calendario-studio', u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
      return route.fulfill({ contentType: file.endsWith('.js') ? 'application/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8', body: fs.readFileSync(file) });
    });
    const load = async () => { await page.goto('https://calendar.test/?access=SIM'); await page.waitForFunction(() => State.getClients().length === 2 && window.PTAvailabilityOverview); };
    await load();
    await page.evaluate(() => App._renderClientModal('test-a', true));
    await page.locator('input[name="pkg"][value="PT 1:1"]').uncheck();
    await page.locator('input[name="pkg"][value="PT 1:2"]').check();
    pending = new Promise(resolve => { release = resolve; });
    await page.locator('#client-save-button').click();
    await page.waitForFunction(() => document.querySelector('#client-save-button').disabled);
    assert.equal(await page.locator('#modal-overlay').evaluate(e => e.classList.contains('open')), true);
    assert.deepEqual(await page.evaluate(() => State.getClients()[0].packageTypes), ['PT 1:1']);
    // A concurrent completed session must not be overwritten by the package form.
    clients[0].sessions_remaining = 7;
    release(); pending = null;
    await page.waitForFunction(() => !document.querySelector('#modal-overlay.open'));
    const patch = writes[0].payload.rows[0];
    assert.deepEqual(patch.package_types, ['PT 1:2']);
    assert.equal(patch.tipo_servizio, 'PT 1:2');
    assert.equal('sessions_total' in patch, false);
    assert.equal('sessions_remaining' in patch, false);
    assert.equal('data_conferma' in patch, false);
    assert.equal(await page.evaluate(() => State.getClients()[0].sessionsRemaining), 7);
    await page.reload(); await page.waitForFunction(() => State.getClients().length === 2);
    assert.deepEqual(await page.evaluate(() => { const c = State.getClients()[0]; return [c.packageTypes, c.tipoServizio, c.sessionsTotal, c.sessionsRemaining]; }), [['PT 1:2'], 'PT 1:2', 12, 7]);

    await page.evaluate(() => App._renderClientModal('test-a', true));
    await page.locator('input[name="pkg"][value="PT 1:2"]').uncheck();
    await page.locator('input[name="pkg"][value="PT 1:1"]').check();
    fail = true;
    await page.locator('#client-save-button').click();
    await page.waitForFunction(() => document.querySelector('#client-save-error')?.textContent.includes('rifiutato'));
    assert.equal(await page.locator('#client-save-button').isEnabled(), true);
    assert.equal(await page.locator('#modal-overlay').evaluate(e => e.classList.contains('open')), true);
    assert.deepEqual(await page.evaluate(() => State.getClients()[0].packageTypes), ['PT 1:2']);
    assert.deepEqual(clients[0].package_types, ['PT 1:2']);
    fail = false;
    await page.locator('input[name="pkg"][value="PT 1:1"]').uncheck();
    await page.locator('input[name="pkg"][value="PT 1:2"]').check();
    const beforeNoop = writes.length;
    await page.locator('#client-save-button').click();
    await page.waitForFunction(() => !document.querySelector('#modal-overlay.open'));
    assert.equal(writes.length, beforeNoop, 'Unchanged package does not issue writes');

    await page.evaluate(() => App.openNewAppointment('2026-09-21', 'test-a', '17:00', 'pt12'));
    assert.equal(await page.locator('#appt-pair-0').inputValue(), 'test-a');
    await page.locator('#appt-pair-1').selectOption('test-a');
    assert.equal(await page.locator('#appt-pair-1').inputValue(), '', 'Duplicate participant rejected');
    await page.locator('#appt-pair-1').selectOption('test-b');
    await page.locator('#appt-duration').selectOption('60');
    await page.locator('#appt-operator').selectOption('pt');
    assert.deepEqual(await page.locator('#appt-clients').evaluate(e => [...e.selectedOptions].map(o => o.value).sort()), ['test-a', 'test-b']);
    await page.getByRole('button', { name: 'Crea appuntamento', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#modal-overlay.open'));
    assert.equal(appointments.length, 1);
    assert.equal(appointments[0].service_id, 'pt12');
    assert.deepEqual(appointments[0].client_ids.sort(), ['test-a', 'test-b']);
    assert.deepEqual(clients.map(c => c.sessions_remaining), [7, 5]);
    assert.ok(await page.evaluate(() => { const a = State.getAppointments()[0]; const html = App._appointmentMiniCard(a); return html.includes('TEST UNO') && html.includes('TEST DUE'); }));
    assert.deepEqual(errors, []);
    console.log('PASS: package PATCH + persisted service, awaited save, persistent errors, concurrent balance preserved, no-op GET, two visible participants, one audited PT 1:2 appointment, independent balances');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
