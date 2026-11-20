const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require(require.resolve('playwright', { paths: [path.join(__dirname, '../tools/coaching-editor')] }));
const Ledger = require('../app/calendario-studio/js/package-ledger');
const PTSession = require('../app/calendario-studio/js/pt-session-model');

test('lesson management separates current, next, and closed packages without hiding pending work', async t => {
  const app = path.join(__dirname, '../app/calendario-studio');
  const clientId = 'synthetic-client';
  const oldCycle = { id: 'old-one', startDate: '2099-01-01', closedAt: '2099-02-01', sessionsTotal: 8 };
  const secondCycle = { id: 'old-two', startDate: '2099-02-01', closedAt: '2099-03-01', sessionsTotal: 8 };
  const current = { id: 'current', startDate: '2099-03-01', closedAt: '', sessionsTotal: 8 };
  const client = {
    id: clientId, nome: 'Cliente', cognome: 'Sintetico', active: true, pt_assegnato: 'pt',
    sessions_total: 8, sessions_remaining: 7, package_types: ['PT 1:1'], data_conferma: current.startDate,
    notes: Ledger.serialize('Nota di prova', { cycles: [oldCycle, secondCycle, current] }),
  };
  const appointment = (id, date, status, notes = '', service_id = 'pt11') => ({
    id, date, status, notes, service_id, client_ids: [clientId], operator_id: 'pt',
    start_time: '17:00', duration_min: 60, buffer_min: 10,
  });
  const appointments = [
    appointment('current-booked', '2099-03-16', 'prenotato', '[CICLO-PACCHETTO-ID current]'),
    appointment('current-done', '2099-03-08', 'fatto', '[CICLO-PACCHETTO-ID current]'),
    appointment('next-booked', '2099-04-03', 'prenotato', '[RINNOVO-PREVISTO plan-a] [RINNOVO-CONFERMATO plan-a]'),
    appointment('history-one', '2099-01-18', 'fatto', '[CICLO-PACCHETTO-ID old-one]'),
    PTSession.write({ ...appointment('history-pair', '2099-02-18', 'fatto', '[CICLO-PACCHETTO-ID current]', 'pt12'), client_ids: [clientId, 'partner'] }, {
      version: 1, rateCents: 1500,
      participants: {
        [clientId]: { cycleId: 'old-two', start: secondCycle.startDate, status: 'fatto' },
        partner: { cycleId: 'current', start: current.startDate, status: 'fatto' },
      },
    }),
    appointment('history-date-only', '2099-02-20', 'fatto', '[CICLO-PACCHETTO 2099-02-01]'),
    appointment('history-unassigned', '2021-12-10', 'fatto'),
    appointment('past-unresolved', '2021-12-08', 'prenotato'),
    appointment('outside-booked', '2099-04-15', 'prenotato'),
    appointment('nutrition', '2099-04-17', 'prenotato', '', 'nutrizione'),
  ];
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: 'it-IT', timezoneId: 'Europe/Rome' });
  const errors = [];
  const writes = [];
  page.on('pageerror', error => errors.push(error.message));
  const actor = { id: 'owner', role: 'owner' };
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname.startsWith('fonts.')) return route.fulfill({ body: '' });
    if (url.pathname.endsWith('/calendar-private-data')) {
      const input = request.postDataJSON();
      assert.equal(input.accessToken, 'OWNER');
      if (input.operation === 'session') return route.fulfill({ json: { success: true, actor } });
      const fixtures = {
        clients: [client], appointments,
        operators: [{ id: 'pt', nome: 'PT', cognome: 'Test', active: true, roles: ['PT'] }],
      };
      return route.fulfill({ json: fixtures[input.table] ?? [] });
    }
    if (url.pathname.endsWith('/calendar-activity')) {
      const input = request.postDataJSON();
      if (input.operation === 'session') return route.fulfill({ json: { actor } });
      if (input.operation === 'expected_renewals' && input.payload?.action === 'list') {
        return route.fulfill({ json: { proposals: [], unresolved: [] } });
      }
      writes.push(input.operation);
      return route.fulfill({ status: 403, json: { error: 'Scritture escluse dalla prova' } });
    }
    if (url.pathname.endsWith('/calendar-runtime')) return route.fulfill({ json: { CALENDAR_FLEX_MODE: true } });
    if (url.pathname.startsWith('/.netlify/')) return route.fulfill({ status: 403, json: { error: 'Funzione esclusa dalla prova' } });
    assert.equal(url.hostname, 'calendar.test');
    return route.fulfill({ path: path.join(app, url.pathname === '/' ? 'index.html' : url.pathname.slice(1)) });
  });

  await page.goto('https://calendar.test/?view=clients&access=OWNER');
  await page.locator('button[title="Quadro pacchetto"]').click();
  const modal = page.locator('.package-overview');
  const currentRows = modal.getByRole('table', { name: 'Ciclo corrente', exact: true });
  const renewalRows = modal.getByRole('table', { name: 'Prossimo rinnovo', exact: true });
  const outsideRows = modal.getByRole('table', { name: 'Sedute da verificare fuori ciclo', exact: true });
  await renewalRows.locator('#pkg-date-next-booked').waitFor();
  assert.equal(await currentRows.locator('tbody tr').count(), 2);
  assert.equal(await renewalRows.locator('tbody tr').count(), 1);
  assert.equal(await outsideRows.locator('tbody tr').count(), 2);
  assert.ok(await currentRows.evaluate(table => {
    const right = table.parentElement.getBoundingClientRect().right;
    return [...table.querySelectorAll('.package-row-actions button')].every(button => button.getBoundingClientRect().right <= right);
  }), 'desktop actions fit in the visible table');
  assert.ok(await renewalRows.getByText('Rinnovo confermato', { exact: true }).isVisible());
  assert.ok(await outsideRows.getByText(/Esito da verificare/).isVisible());
  assert.ok(await outsideRows.getByRole('button', { name: 'Includi nel ciclo' }).isVisible());
  assert.deepEqual(await modal.locator('[name=pkg-batch-session]').evaluateAll(boxes => boxes.map(box => box.value)), ['current-booked']);
  const groupColors = await modal.locator('.package-lesson-title').evaluateAll(titles =>
    titles.slice(0, 2).map(title => getComputedStyle(title).backgroundColor));
  assert.equal(new Set(groupColors).size, 2);

  const history = modal.getByRole('combobox', { name: 'Pacchetti conclusi' });
  const historyHost = modal.locator('#pkg-lesson-history-tables');
  const options = await history.locator('option').allTextContents();
  assert.equal(options.length, 4);
  assert.match(options[1], /01\/02\/2099 · 2 sedute/);
  assert.match(options[2], /01\/01\/2099 · 1 seduta/);
  assert.match(options[3], /Sedute senza decorrenza/);
  assert.equal(await historyHost.locator('table').count(), 0, 'historical forms are mounted on demand');
  await history.selectOption('0');
  const pairTime = historyHost.locator('#pkg-time-history-pair');
  assert.ok(await pairTime.isVisible());
  assert.ok(await historyHost.locator('#pkg-time-history-date-only').isVisible());
  assert.equal(await historyHost.locator('#pkg-time-history-one').count(), 0);
  await pairTime.fill('18:15');
  await history.selectOption('1');
  assert.ok(await historyHost.locator('#pkg-time-history-one').isVisible());
  assert.equal(await pairTime.isVisible(), false);
  await history.selectOption('0');
  assert.equal(await pairTime.inputValue(), '18:15', 'changing the filter retains the pending edit');
  await history.selectOption('2');
  assert.ok(await historyHost.locator('#pkg-time-history-unassigned').isVisible());
  await history.selectOption('');
  assert.equal(await historyHost.getByRole('table').count(), 0);
  assert.equal(await modal.locator('#pkg-time-nutrition').isVisible(), false);
  await modal.getByText('Altri servizi · 1 seduta', { exact: true }).click();
  assert.ok(await modal.locator('#pkg-time-nutrition').isVisible());

  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await history.isVisible());
  assert.ok(await currentRows.locator('..').evaluate(scroll => scroll.scrollWidth > scroll.clientWidth));
  await modal.getByRole('button', { name: /Pagamenti.*saldo/ }).click();
  assert.equal(await history.isVisible(), false);
  await modal.getByRole('button', { name: /Lezioni.*Calendario/ }).click();
  assert.ok(await history.isVisible());
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
});
