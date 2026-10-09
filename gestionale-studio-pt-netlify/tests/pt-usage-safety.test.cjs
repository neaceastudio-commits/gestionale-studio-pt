const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
function extract(start, end) {
  const from = html.indexOf(`    ${start}`);
  assert.ok(from >= 0, start);
  const to = html.indexOf(`    ${end}`, from);
  assert.ok(to > from, end);
  return html.slice(from, to);
}
test('client transition waits for an in-flight save and refuses offline or conflicting drafts', async () => {
  const c = vm.createContext({ captureWorkoutSessionNote() {}, state: { localDirty: true }, appState: { selectedClientId: 'a' },
    cloudSaveRunning: true, Date, selectedClient: () => ({}), canEditClient: () => true,
    showToast() {}, setTimeout(fn) { c.cloudSaveRunning = false; fn(); },
    async flushCloudSave() { c.state.localDirty = false; return true; } });
  vm.runInContext(extract('async function ensureCurrentProgramSaved(', 'function switchGripDraft('), c);
  assert.equal(await c.ensureCurrentProgramSaved(), true);
  c.state.localDirty = true;
  c.flushCloudSave = async () => false;
  assert.equal(await c.ensureCurrentProgramSaved(), false);
  c.appState.saveConflict = {};
  assert.equal(await c.ensureCurrentProgramSaved(), false);
  c.appState.saveConflict = null;
  c.appState.gripSaveMode = 'saving';
  assert.equal(await c.ensureCurrentProgramSaved(), false);
});
test('delete/restore waits for autosave, uses its fresh revision and always releases the UI lock', async () => {
  const shell = { inert: false }, calls = [];
  const c = vm.createContext({ captureWorkoutSessionNote() {}, programMutationRunning: false, selectionTransitionRunning: false,
    canEditClient: () => true, appState: { selectedClientId: 'a', programs: [{ id: 'p', client_id: 'a', updated_at: 'old' }] },
    document: { getElementById: () => shell },
    async ensureCurrentProgramSaved() { assert.equal(shell.inert, true); c.appState.programs[0].updated_at = 'fresh'; return true; },
    async ptData(action, payload) { calls.push({ action, payload }); return { row: { id: 'p' } }; },
    applyProgramMutation: result => result.row });
  vm.runInContext(extract('async function runProgramMutation(', 'async function deleteProgram('), c);
  assert.equal((await c.runProgramMutation('p', 'set_program_archived', { archived: true })).id, 'p');
  assert.equal(calls[0].payload.expectedUpdatedAt, 'fresh');
  assert.equal(shell.inert, false);
  c.ptData = async () => { throw Error('offline'); };
  await assert.rejects(c.runProgramMutation('p', 'set_program_archived', {}), /offline/);
  assert.equal(shell.inert, false);
  assert.equal(c.programMutationRunning, false);
});
test('full saved state never resurrects cleared loads from cached historical rows', () => {
  let merges = 0;
  const c = vm.createContext({ captureWorkoutSessionNote() {}, normalizeState: s => structuredClone(s), window: { NeaceaPTEditor: { toSnapshot: () => ({}) } },
    stateFromLegacyProgram: () => ({ legacy: true }), mergeLoadHistoryIntoState(p, s) { merges++; return s; } });
  vm.runInContext(extract('function stateFromProgram(', 'function previousExerciseHistory('), c);
  const next = c.stateFromProgram({ data: { pt_studio_state: { sessions: ['S1'], sheets: { A: [{ weekSets: [[{ load: '' }]] }] } } } });
  assert.equal(next.sheets.A[0].weekSets[0][0].load, '');
  assert.equal(merges, 0);
  c.stateFromProgram({ data: {} });
  assert.equal(merges, 1, 'legacy recovery still available');
});
test('removing an intermediate week keeps prescriptions, groups and actual measurements aligned', async () => {
  const exercise = { plan: ['a','b','c'], feedback: ['a','b','c'], previousFeedback: ['a','b','c'], previousPlan: ['a','b','c'], weekSets: [[1],[2],[3]] };
  const day = { exercisesByWeek: { 1: ['a'], 2: ['b'], 3: ['c'] }, groupsByWeek: { 1: ['ga'], 2: ['gb'], 3: ['gc'] } };
  const c = vm.createContext({ captureWorkoutSessionNote() {}, state: { sessions: ['S1','S2','S3'], sheetOrder: ['A'], sheets: { A: [exercise] }, workoutDates: { A: ['d1','d2','d3'] }, workoutSessions: { A: [{notes:'n1',completedAt:'c1'},{notes:'n2',completedAt:'c2'},{notes:'n3',completedAt:'c3'}] },
    coachingEditorSnapshot: { program: { weeks: [1,2,3], days: [day] } } }, confirmAction: async () => true, renderAll() {}, autosave() {}, showToast() {} });
  vm.runInContext(extract('async function removeSession(', 'function nextSheetName('), c);
  await c.removeSession(1);
  assert.deepEqual(Array.from(c.state.workoutSessions.A, entry => entry.notes), ['n1','n3']);
  assert.deepEqual(Array.from(c.state.workoutSessions.A, entry => entry.completedAt), ['c1','c3']);
  assert.deepEqual(JSON.parse(JSON.stringify(day.exercisesByWeek)), {1:['a'],2:['c']});
  assert.deepEqual(JSON.parse(JSON.stringify(day.groupsByWeek)), {1:['ga'],2:['gc']});
  assert.deepEqual(exercise.weekSets, [[1],[3]]);
  assert.deepEqual(c.state.workoutDates.A, ['d1','d3']);
});


test('Usa scheda compiles results without adding or removing prescribed series', () => {
  const exercise = { id: 'e', weekSets: [[{ reps: '8', load: '', rir: '2', sessionNote: '' }, { reps: '8' }]] };
  const c = vm.createContext({ captureWorkoutSessionNote() {}, state: { sessions: ['S1'], activeWeekIndex: 0, currentSheet: 'A', sheets: { A: [exercise] } },
    appState: { activeView: 'sheetView' }, canEditClient: () => true,
    ensureExerciseWeekSets() {}, escapeAttr: String, escapeHtml: String,
    normalizeSetEntry: value => value, syncExerciseWeekSummary() {}, renderExercises() {}, autosave() {}, showToast() {} });
  vm.runInContext(extract('function renderWeekSetEditor(', 'function renderSheetPreview('), c);
  const use = c.renderWeekSetEditor(exercise, 0, 'use');
  assert.match(use, /Carico/); assert.match(use, /Ripetizioni/);
  assert.doesNotMatch(use, /onclick="(?:add|remove)ExerciseSet/);
  assert.match(c.renderWeekSetEditor(exercise, 0, 'builder'), /onclick="addExerciseSet/);
  vm.runInContext(extract('function addExerciseSet(', 'function addSession('), c);
  c.addExerciseSet(0, 0); c.removeExerciseSet(0, 0, 0);
  assert.equal(exercise.weekSets[0].length, 2);
  c.appState.activeView = 'builderView'; c.canEditClient = () => false;
  c.addExerciseSet(0, 0); c.removeExerciseSet(0, 0, 0);
  assert.equal(exercise.weekSets[0].length, 2);
  c.canEditClient = () => true; c.addExerciseSet(0, 0);
  assert.equal(exercise.weekSets[0].length, 3);
  c.removeExerciseSet(0, 0, 0); assert.equal(exercise.weekSets[0].length, 2);
});

test('monitoring belongs only to the named owner; shared use does not grant structural editing', () => {
  const c = vm.createContext({ captureWorkoutSessionNote() {}, appState: { currentPt: { id: 'b', email: 'b@test', accessLevel: 'pt' }, sessionLogEnabled: true },
    selectedClient: () => ({ pt_assegnato: 'a', session_access: true }),
    clientTrainerId: client => client.pt_assegnato,
    isAdministrator: operator => operator?.accessLevel === 'owner' });
  vm.runInContext(extract('function canEditClient(', 'function isReadOnlySelection('), c);
  assert.equal(c.canEditClient(), false); assert.equal(c.canCompileSharedSession(), true);
  assert.equal(c.canMonitorActivity(), false);
  c.appState.currentPt = { id: 'owner', email: 'other@test', accessLevel: 'owner' };
  assert.equal(c.canMonitorActivity(), false);
  c.appState.currentPt.email = 'nutrizione.gianlucapirisi@gmail.com';
  assert.equal(c.canMonitorActivity(), true);
  assert.doesNotMatch(html.slice(html.indexOf('function renderProgramManager('), html.indexOf('function gripNumber(')), /Versioni precedenti ripristinabili|data-restore-revision/);
});
