// Entire portal + authenticated handler, synthetic in-memory database only.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const port = '8857', url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(__dirname, '../tools/coaching-editor/visibility-fixture.cjs')], { env: { ...process.env, PT_FIXTURE_PORT: port } });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(Error(`fixture ${code}`))); });
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], writes = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (r.url().endsWith('/pt-data') && r.postDataJSON()?.action === 'upsert_program') writes.push(r.postDataJSON()); });
    const login = async () => { await page.locator('#loginEmail').fill('pt-a@example.test'); await page.locator('#loginCode').fill('111111'); await page.locator('#loginButton').click(); await page.locator('[data-client-id="a-active"]').waitFor(); };
    const synced = () => page.waitForFunction(() => !cloudSaveRunning && !state.localDirty && appState.saveMode === 'supabase');
    const control = body => page.request.post(url + '/__fixture/control', { data: body });
    const stored = async () => (await (await page.request.get(url + '/__fixture/state')).json()).programs.find(p => p.cliente_id === 'a-active').data.pt_studio_state;
    await page.goto(url); await login();
    // Seed a synthetic two-workout program; all subsequent measurements use UI fields.
    await page.evaluate(async () => {
      await selectClient('a-active'); state.meta.name = 'Collaudo salvataggi';
      state.sheetOrder = ['A', 'B'];
      for (const key of state.sheetOrder) state.sheets[key] = [makeExercise('Squat ' + key, 'Gambe', 'Tecnica controllata', ['3 x 8', '3 x 8', '3 x 8', '3 x 8'], '90 sec', '')];
      state.currentSheet = 'B'; renderAll(); autosave(); await ensureCurrentProgramSaved(); showView('sheetView');
    });
    await page.locator('#use-reps-0-0-0').fill('7');
    await page.locator('#use-load-0-0-0').fill('42,5 kg');
    await page.locator('#use-rir-0-0-0').fill('0');
    await page.locator('#use-note-0-0-0').fill('Nota della serie di prova');
    await page.locator('#use-date-B-0-0').fill('2026-10-08');
    await page.locator('#workoutSessionNote').fill('Nota della seduta B: esercizi adattati');
    await synced();
    let data = await stored();
    assert.equal(data.workoutSessions.B[0].notes, 'Nota della seduta B: esercizi adattati');
    assert.deepEqual(['reps','load','rir','sessionNote'].map(k => data.sheets.B[0].weekSets[0][0][k]), ['7','42,5 kg','0','Nota della serie di prova']);
    assert.equal(data.workoutDates.B[0], '2026-10-08');
    // Late mobile/change events: value already on screen must be captured by manual save.
    await page.locator('#workoutSessionNote').evaluate(e => { e.value = 'Nota completa anche prima dell’evento input'; });
    await page.locator('#saveSheetBottomBtn').click(); await synced();
    data = await stored(); assert.equal(data.workoutSessions.B[0].notes, 'Nota completa anche prima dell’evento input'); assert.ok(data.workoutSessions.B[0].completedAt);
    assert.match(await page.locator('#workoutSaveStatus').innerText(), /sincronizzati sul server/);
    // Clear the browser draft, reopen from the fixture's server, retain every saved field.
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await page.reload(); await login();
    await page.evaluate(async () => { await selectClient('a-active'); state.currentSheet = 'B'; showView('sheetView'); });
    assert.equal(await page.locator('#workoutSessionNote').inputValue(), 'Nota completa anche prima dell’evento input');
    assert.equal(await page.locator('#use-load-0-0-0').inputValue(), '42,5 kg');
    assert.equal(await page.locator('#use-rir-0-0-0').inputValue(), '0');
    // A slow response cannot acknowledge edits typed after its request was sent.
    await control({ delay: 1000 }); const start = writes.length;
    await page.locator('#workoutSessionNote').fill('Prima versione');
    await page.waitForFunction(() => cloudSaveRunning);
    await page.locator('#workoutSessionNote').fill('Ultima versione durante il salvataggio');
    await page.locator('#use-load-0-0-0').fill('45');
    await synced(); data = await stored();
    assert.equal(data.workoutSessions.B[0].notes, 'Ultima versione durante il salvataggio');
    assert.equal(data.sheets.B[0].weekSets[0][0].load, '45');
    assert.equal(writes.length - start, 2, 'rapid edits coalesce into one follow-up save');
    await control({});
    // A lost HTTP response can be retried with a stable request id.
    await control({ fault: 'upsert_program-lost-response' }); const retryStart = writes.length;
    await page.locator('#workoutSessionNote').fill('Risposta persa: nota conservata');
    await page.waitForFunction(() => appState.saveMode === 'error');
    assert.equal(await page.evaluate(() => state.localDirty), true);
    await page.evaluate(() => flushCloudSave()); await synced();
    assert.equal(writes[retryStart].data.save_meta.request_id, writes[retryStart + 1].data.save_meta.request_id);
    assert.equal((await stored()).workoutSessions.B[0].notes, 'Risposta persa: nota conservata');
    // Offline edits persist locally and cannot leak into another client.
    await control({ fault: 'offline' });
    await page.locator('#workoutSessionNote').fill('Nota offline'); await page.waitForFunction(() => appState.saveMode === 'error');
    assert.equal(await page.evaluate(() => selectClient('a-second')), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(STORAGE_KEY)).workoutSessions.B[0].notes), 'Nota offline');
    await control({}); await page.evaluate(() => window.dispatchEvent(new Event('online'))); await synced();
    assert.equal((await stored()).workoutSessions.B[0].notes, 'Nota offline');
    // Intentional deletion must remain deleted, including after loading history.
    await page.locator('#workoutSessionNote').fill(''); await page.locator('#use-note-0-0-0').fill(''); await page.locator('#use-load-0-0-0').fill(''); await synced();
    data = await stored(); assert.equal(data.workoutSessions.B[0].notes, ''); assert.equal(data.sheets.B[0].weekSets[0][0].sessionNote, ''); assert.equal(data.sheets.B[0].weekSets[0][0].load, '');
    // General program notes remain separate from the workout's note.
    await page.evaluate(() => showView('builderView')); await page.locator('#builderView details summary').first().click(); await page.locator('#generalNotes').fill('Indicazioni generali di prova'); await synced();
    assert.equal((await stored()).meta.generalNotes, 'Indicazioni generali di prova');
    // Simultaneous editor: refuse silent overwrites and retain local note.
    await page.evaluate(() => showView('sheetView'));
    const programId = await page.evaluate(() => appState.selectedProgramId); await control({ conflictProgramId: programId });
    await page.locator('#workoutSessionNote').fill('Nota in conflitto'); await page.waitForFunction(() => appState.saveMode === 'conflict');
    assert.equal(await page.evaluate(() => selectClient('a-second')), false);
    assert.equal((await stored()).workoutSessions.B[0].notes, '');
    assert.equal(await page.locator('#workoutSessionNote').inputValue(), 'Nota in conflitto');
    assert.deepEqual(errors, []);
    console.log('PASS mobile: complete round trip, pending note event, zero RIR, date, coalesced slow saves, lost response retry, offline recovery, clear values, general notes, concurrency conflict, client isolation');
  } finally { await browser?.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
