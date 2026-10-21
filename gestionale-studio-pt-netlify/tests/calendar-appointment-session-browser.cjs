const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const M = require('../app/calendario-studio/js/pt-session-model');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [], writes = [];
    let rejectSave = false;
    const client = { id: 'client', nome: 'Cliente', cognome: 'Prova', active: true,
      package_types: ['PT 1:1'], sessions_total: 12, sessions_remaining: 9,
      pt_assegnato: 'old-pt', notes: '[CICLO-PACCHETTO 2099-10-12]' };
    const session = { version: 1, rateCents: 1000, participants: {
      client: { cycleId: 'renewal-cycle', start: '2099-10-12', status: 'prenotato' },
    } };
    let appointment = M.write({ id: 'lesson', service_id: 'pt11', client_ids: ['client'],
      operator_id: 'old-pt', date: '2099-10-21', start_time: '19:00', duration_min: 60,
      buffer_min: 0, status: 'prenotato', notes: '', updated_at: '2026-10-21T12:00:00Z' }, session);
    const operators = [
      { id: 'old-pt', nome: 'Trainer', cognome: 'Precedente', active: true, roles: ['PT'] },
      { id: 'new-pt', nome: 'Trainer', cognome: 'Nuovo', active: true, roles: ['PT'] },
    ];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (u.hostname.startsWith('fonts.')) return route.fulfill({ body: '' });
      if (u.pathname.endsWith('calendar-runtime')) return route.fulfill({ json: { CALENDAR_FLEX_MODE: true } });
      if (u.pathname.endsWith('whatsapp-agenda')) return route.fulfill({ status: 403, json: { error: 'disabled' } });
      if (u.pathname.endsWith('apple-caldav-link')) return route.fulfill({ json: { eligible: false } });
      if (u.pathname.endsWith('calendar-activity')) {
        const input = req.postDataJSON();
        if (input.operation === 'session') return route.fulfill({ json: { actor: { id: 'owner', role: 'owner' } } });
        assert.equal(input.operation, 'save');
        writes.push(input.payload);
        if (rejectSave) return route.fulfill({ status: 409, json: { error: 'Versione della seduta cambiata' } });
        assert.deepEqual(M.read(input.payload.appointment), session);
        assert.equal(input.payload.expected.id, appointment.id);
        appointment = { ...input.payload.appointment, updated_at: '2026-10-21T13:00:00Z' };
        return route.fulfill({ json: { appointment, clients: [client] } });
      }
      if (u.pathname.includes('/rest/v1/')) {
        assert.equal(req.method(), 'GET');
        const table = u.pathname.split('/').pop();
        return route.fulfill({ json: table === 'clients' ? [client] : table === 'operators' ? operators : table === 'appointments' ? [appointment] : [] });
      }
      const file = path.join(__dirname, '../app/calendario-studio', u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
      return route.fulfill({ contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', body: fs.readFileSync(file) });
    });
    await page.goto('https://calendar.test/?access=SIM');
    await page.waitForFunction(() => State.getAppointments().length === 1 && window.CalendarFlex);
    await page.evaluate(() => App._renderAppointmentModal('lesson'));
    assert.equal(await page.inputValue('#appt-notes'), '', 'hidden metadata must not appear in the empty notes editor');
    await page.selectOption('#appt-operator', 'new-pt');
    await page.fill('#appt-notes', 'Nota di prova');
    await page.getByRole('button', { name: 'Salva modifiche', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('modal-overlay').classList.contains('open'));
    assert.equal(writes.length, 1);
    assert.equal(appointment.operator_id, 'new-pt');
    assert.equal(client.sessions_remaining, 9);
    await page.reload();
    await page.waitForFunction(() => State.getAppointments()[0]?.operatorId === 'new-pt');
    await page.evaluate(() => App._renderAppointmentModal('lesson'));
    assert.equal(await page.inputValue('#appt-operator'), 'new-pt');
    assert.match(await page.inputValue('#appt-notes'), /^Nota di prova/);
    assert.ok(!(await page.inputValue('#appt-notes')).includes('NEACEA-PT-SESSION-V1'));
    rejectSave = true;
    await page.fill('#appt-time', '18:00');
    await page.getByRole('button', { name: 'Salva modifiche', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('appointment-save-error').hidden);
    assert.match(await page.locator('#appointment-save-error').innerText(), /Versione della seduta cambiata/);
    assert.equal(await page.locator('#appointment-save-button').isEnabled(), true);
    assert.equal(await page.inputValue('#appt-time'), '18:00');
    rejectSave = false;
    await page.getByRole('button', { name: 'Salva modifiche', exact: true }).click();
    await page.waitForFunction(() => !document.getElementById('modal-overlay').classList.contains('open'));
    assert.equal(writes.length, 3);
    assert.equal(appointment.start_time.slice(0, 5), '18:00');
    await page.evaluate(() => App._renderAppointmentModal('lesson'));
    await page.screenshot({ path: '/private/tmp/neacea-calendar-session-edit-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS mobile: cambio PT, metadati nascosti, riapertura da server, errore persistente e retry senza perdita della bozza o del ciclo');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
