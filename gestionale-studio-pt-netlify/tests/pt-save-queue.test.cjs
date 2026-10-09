const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
function body(name, next) {
  const start = html.indexOf(`    ${name}`);
  assert.ok(start >= 0);
  return html.slice(start, html.indexOf(`    ${next}`, start));
}
function fixture() {
  let finish, reject, generated = 0;
  const calls = [], timers = new Map();
  const state = { sheets: {}, meta: { name: 'Copia nominata' }, localDirty: true };
  const appState = { currentPt: { id: 'pt-test' }, selectedClientId: 'client-test', selectedProgramId: '', programs: [], revisions: [] };
  const context = vm.createContext({ captureWorkoutSessionNote() {},
    state, appState, stateVersions: new WeakMap(), cloudSaveRunning: false, cloudSaveQueued: false, cloudSaveTimer: null,
    cloudSaveRetryDelay: 350, pendingExerciseIds: new Set(), STORAGE_KEY: 'draft',
    document: { getElementById: () => ({ disabled: false }) }, console: { error() {} },
    setTimeout(fn) { const key = Symbol(); timers.set(key, fn); return key; },
    clearTimeout(key) { timers.delete(key); },
    canEditClient: () => true, selectedClient: () => ({ id: 'client-test' }),
    stateVersion: () => 1, markExerciseSaveState() {}, syncMetaFromInputs() {}, showToast() {},
    renderSaveState(mode) { appState.saveMode = mode; },
    writeLocalValue() {}, removeLocalValue() {}, storageKeyFor: (c, p) => `${c}/${p}`,
    normalizeProgram: row => row, renderClientList() {}, renderProgramHistory() {}, renderProgramManager() {}, renderClientFocus() {}, renderOperationalWeekNavigator() {},
    id: () => `program-${++generated}`, programPayload: (id, at, s) => ({ id, name: s.meta.name, save_meta: { request_id: s.pendingCloudSave?.requestId } }),
    queueCloudSave() {},
    ptData(action, payload) {
      calls.push({ action, payload });
      return new Promise((resolve, fail) => {
        finish = override => resolve(override || { row: { id: payload.programId, updated_at: '2026-09-18T12:00:00Z', data: payload.data } });
        reject = () => fail(new Error('Response lost'));
      });
    },
  });
  vm.runInContext(body('function writeLocalState(', 'function saveState(') +
    body('async function flushCloudSave(', 'function autosave(') +
    body('async function saveProgramToSupabase(', 'function renderSessions('), context);
  return { context, state, appState, calls, finish: override => finish(override), reject: () => reject(), timers };
}

test('slow first insert is serialized with manual saves and autosave', async () => {
  const f = fixture();
  const first = f.context.saveProgramToSupabase();
  assert.equal(f.calls.length, 1);
  assert.equal(await f.context.flushCloudSave(), false);
  assert.equal(await f.context.saveProgramToSupabase(), false);
  assert.equal(f.calls.length, 1, 'no concurrent insert');
  f.context.writeLocalState();
  assert.equal(f.state.draftProgramId, 'program-1', 'local edits keep reserved identity');
  f.finish(); assert.equal(await first, true);
  assert.equal(f.appState.programs.length, 1);
  const retry = f.context.flushCloudSave();
  assert.equal(f.calls[1].payload.programId, 'program-1');
  assert.equal(f.calls[1].payload.expectedUpdatedAt, '2026-09-18T12:00:00Z');
  f.finish(); assert.equal(await retry, true);
  assert.equal(f.appState.programs.length, 1);
});

test('a lost first response does not allocate a second program identity', async () => {
  const f = fixture();
  const first = f.context.saveProgramToSupabase();
  f.reject(); assert.equal(await first, false);
  f.context.writeLocalState();
  const retry = f.context.saveProgramToSupabase();
  assert.equal(f.calls[0].payload.programId, f.calls[1].payload.programId);
  assert.equal(f.calls[0].payload.data.save_meta.request_id, f.calls[1].payload.data.save_meta.request_id, 'retry has the same request identity');
  f.finish(); assert.equal(await retry, true);
  assert.equal(f.appState.programs.length, 1);
});


test('missing or unrelated server acknowledgement leaves the draft dirty and retries', async () => {
  for (const response of [{}, { row: { id: 'wrong-program', updated_at: '2026-10-08T10:00:00Z', data: {} } },
    { row: { id: 'program-1', updated_at: '2026-10-08T10:00:00Z', data: { save_meta: { request_id: 'another-save' } } } }]) {
    const f = fixture(), first = f.context.saveProgramToSupabase();
    f.finish(response);
    assert.equal(await first, false);
    assert.equal(f.state.localDirty, true);
    assert.equal(f.appState.saveMode, 'error');
    assert.equal(f.appState.programs.length, 0);
    const retry = f.context.flushCloudSave(); f.finish();
    assert.equal(await retry, true);
    assert.equal(f.state.localDirty, false);
  }
});

test('a stalled API request aborts and releases its timeout; HTTP conflicts remain explicit', async () => {
  let expire, cleared = 0;
  const c = vm.createContext({ appState: { accessToken: 'synthetic' }, AbortController,
    accessFunctionBase: () => '', setTimeout(fn, ms) { assert.equal(ms, 15000); expire = fn; return 1; },
    clearTimeout() { cleared++; },
    fetch: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Error('aborted')));
    }) });
  vm.runInContext(body('async function ptData(', 'function fullName('), c);
  const pending = c.ptData('upsert_program'); expire();
  await assert.rejects(pending, /non ha risposto in tempo/); assert.equal(cleared, 1);
  c.fetch = async () => ({ ok: false, status: 409, headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({ success: false, code: 'PROGRAM_CONFLICT', current: { id: 'p' } }) });
  await assert.rejects(c.ptData('upsert_program'), e => e.status === 409 && e.code === 'PROGRAM_CONFLICT' && e.current.id === 'p');
  assert.equal(cleared, 2);
});
