const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const { chromium } = require('playwright');
const { accessCode, verifyAccessToken } = require('../netlify/functions/lib/pt-auth');
const { handler } = require('../netlify/functions/pt-launcher-session');

const root = path.resolve(__dirname, '..');
const launcherRoot = path.resolve(root, '../../neacea-launcher');
const studio = 'https://studio.neacea.com';
const calendar = 'https://calendario.neacea.com';
const direction = 'https://cruscotto-pt.neacea.com';
const calendarFunctions = 'https://new-calendar-neacea.netlify.app';
const operator = { id: 'staff_test', email: 'test@example.test', nome: 'Profilo', cognome: 'Prova' };
const serviceKey = 'synthetic-launcher-service-key-for-browser-tests';
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

test('a remembered Launcher login opens the real Calendar and Direction pages without a second code', async (t) => {
  const { default: studioSession } = await import(pathToFileURL(path.join(launcherRoot, 'netlify/functions/studio-session.mjs')));
  process.env.PT_ACCESS_SECRET = 'synthetic-key-for-browser-tests';
  process.env.SUPABASE_SECRET_KEY = 'synthetic-directory-for-browser-tests';
  process.env.PT_LAUNCHER_SERVICE_KEY = serviceKey;
  globalThis.Netlify = { env: { get: () => serviceKey } };
  t.after(() => { delete globalThis.Netlify; });
  let role = 'owner';
  let enabled = true;
  let loginCount = 0;
  const code = accessCode(operator.email, operator.id);
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/pt-launcher-session')) {
      const body = JSON.parse(options.body);
      if (body.action === 'login') loginCount++;
      const result = await handler({ httpMethod: options.method, headers: options.headers, body: options.body });
      return new Response(result.body, { status: result.statusCode, headers: result.headers });
    }
    if (url.pathname.endsWith('/operator_effective_roles')) {
      return Response.json([{ ...operator, operator_id: operator.id, legacy_roles: role === 'owner' ? ['PT', 'Direzione'] : ['PT'] }]);
    }
    assert.ok(url.pathname.endsWith('/operators'));
    return Response.json([{ id: operator.id, active: true, portal_access_enabled: enabled, portal_access_version: 1 }]);
  });

  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const roots = new Map([[studio, launcherRoot], [calendar, path.join(root, 'app/calendario-studio')], [direction, path.join(root, 'app/cruscotto-pt')]]);
  const errors = [];
  const bridgeRequests = [];
  async function context(options) {
    const ctx = await browser.newContext(options);
    ctx.setDefaultTimeout(10000);
    ctx.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    await ctx.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const name = url.pathname;
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (url.origin === studio && name.endsWith('/studio-session')) {
        const headers = await request.allHeaders();
        if (request.method() === 'GET') bridgeRequests.push({ app: url.searchParams.get('app'), dest: headers['sec-fetch-dest'], hasCookie: Boolean(headers.cookie) });
        const response = await studioSession(new Request(url, {
          method: request.method(), headers, body: request.postData() ?? undefined,
        }));
        return route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
      }
      if (name.endsWith('/calendar-runtime')) return route.fulfill({ json: { CALENDAR_FLEX_MODE: false } });
      if (['/calendar-activity', '/calendar-private-data', '/studio-calendar-activity', '/pt-access-email'].some(suffix => name.endsWith(suffix))) {
        const input = request.postDataJSON();
        const claims = verifyAccessToken(input?.accessToken || input?.token);
        if (!claims || !enabled) return route.fulfill({ status: 401, headers: cors, json: { error: 'Sessione non valida' } });
        const actor = { ...operator, role: claims.accessLevel };
        if (name.endsWith('/pt-access-email')) {
          assert.equal(input.action, 'verify_token');
          return route.fulfill({ headers: cors, json: { success: true, operatorId: actor.id, email: actor.email } });
        }
        if (input.operation === 'session') return route.fulfill({ headers: cors, json: { actor } });
        const rows = (input.table === 'operators' || input.table === 'operator_effective_roles') ? [{ ...operator, active: true, roles: ['PT'] }] : [];
        return route.fulfill({ headers: cors, json: rows });
      }
      if (name.startsWith('/.netlify/') || name.startsWith('/rest/') || url.origin === calendarFunctions) {
        return route.fulfill({ headers: cors, json: [] });
      }
      const site = roots.get(url.origin);
      if (!site) return route.fulfill({ body: '' });
      const file = path.join(site, name === '/' ? 'index.html' : name.slice(1));
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
      try {
        return await route.fulfill({ contentType: types[path.extname(file)], body: await readFile(file) });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return route.fulfill({ status: 404, body: '' });
      }
    });
    return ctx;
  }

  async function login(page, remember) {
    await page.goto(studio);
    await page.getByLabel('Email PT').fill(operator.email);
    await page.getByLabel('Codice Portale PT').fill(code);
    if (remember) await page.getByLabel('Ricorda questo dispositivo').check();
    await page.getByRole('button', { name: 'Accedi', exact: true }).click();
    await page.getByRole('button', { name: 'Esci dal Launcher' }).waitFor();
  }

  const first = await context();
  const desktop = await first.newPage();
  await login(desktop, true);
  const stored = await first.storageState();
  assert.equal(stored.cookies[0].httpOnly, true);
  assert.equal(stored.cookies[0].secure, true);
  assert.ok(stored.cookies[0].expires > Date.now() / 1000 + 13 * 86400);
  await first.close();

  const reopened = await context({ storageState: stored, viewport: { width: 390, height: 844 } });
  const launcher = await reopened.newPage();
  await launcher.goto(studio);
  await launcher.getByText('Profilo Prova · Calendario e Cruscotto PT').waitFor();
  assert.equal(await launcher.locator('.studio-access').evaluate(panel => panel.scrollWidth <= panel.clientWidth), true);
  const [ownerCalendar] = await Promise.all([launcher.waitForEvent('popup'), launcher.locator('[data-studio-app="calendario"]').click()]);
  try {
    await ownerCalendar.getByRole('button', { name: 'Registro attività' }).waitFor();
  } catch (error) {
    t.diagnostic(JSON.stringify({ bridgeRequests, errors, url: ownerCalendar.url(), view: await ownerCalendar.locator('#view-dashboard').innerText() }));
    throw error;
  }
  assert.equal(ownerCalendar.url(), `${calendar}/`);
  const [ownerDirection] = await Promise.all([launcher.waitForEvent('popup'), launcher.locator('[data-studio-app="cruscotto"]').click()]);
  await ownerDirection.getByText('Direzione verificata · salvataggi abilitati').waitFor();
  await ownerDirection.locator('#syncStatus').filter({ hasText: /Aggiornato/ }).waitFor();
  assert.equal(ownerDirection.url(), `${direction}/`);
  assert.equal(loginCount, 1);
  await launcher.getByRole('button', { name: 'Esci dal Launcher' }).click();
  await launcher.getByLabel('Email PT').waitFor();
  assert.equal((await reopened.cookies(studio)).length, 0);
  await reopened.close();

  role = 'pt';
  const trainerContext = await context();
  const trainer = await trainerContext.newPage();
  await login(trainer, false);
  assert.equal((await trainerContext.cookies(studio))[0].expires, -1);
  const [trainerCalendar] = await Promise.all([trainer.waitForEvent('popup'), trainer.locator('[data-studio-app="calendario"]').click()]);
  await trainerCalendar.waitForFunction(() => window.App?.portalPt?.authorized || document.querySelector('#portal-pt-badge')?.textContent.includes('Profilo'));
  assert.equal(trainerCalendar.url(), `${calendar}/?mode=pt`);
  assert.equal(await trainerCalendar.locator('[data-view="operators"]').isVisible(), false);
  await trainerCalendar.reload();
  await trainerCalendar.locator('#portal-pt-badge').filter({ hasText: /PT: Profilo/ }).waitFor();
  const deniedDirection = await trainerContext.newPage();
  await deniedDirection.goto(`${direction}/#accesso-studio`);
  await deniedDirection.getByText(/Per salvare, accedi con il codice/).waitFor();
  assert.equal(await deniedDirection.evaluate(() => sessionStorage.getItem('neacea-studio-audit-session')), null);
  enabled = false;
  await trainer.reload();
  await trainer.getByLabel('Email PT').waitFor();
  assert.equal((await trainerContext.cookies(studio)).length, 0);
  assert.equal(loginCount, 2);
  assert.deepEqual(errors, []);
});
