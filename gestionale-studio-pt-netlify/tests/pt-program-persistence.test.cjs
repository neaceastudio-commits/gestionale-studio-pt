const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

process.env.PT_ACCESS_SECRET = 'pt-program-persistence-test-secret';
process.env.SUPABASE_SECRET_KEY = 'pt-program-persistence-test-server-key';
process.env.SUPABASE_URL = 'https://supabase.test';

const portalSource = read('app/portale-personal-trainer/index.html');
const migrationSource = read('supabase/migrations/20260901094141_secure_pt_program_persistence.sql');
const auth = require(path.join(root, 'netlify/functions/lib/pt-auth.js'));
const ptData = require(path.join(root, 'netlify/functions/pt-data.js'));

assert('Portale senza chiave Supabase nel browser', !portalSource.includes('sb_publishable_') && !portalSource.includes('function sb('));
assert('Portale usa API autenticata', portalSource.includes('async function ptData(action, payload = {})') && portalSource.includes('Authorization: `Bearer ${appState.accessToken}`'));
assert('Anteprima locale gestisce API non ancora pubblicata', portalSource.includes('PT_DATA_NOT_DEPLOYED') && portalSource.includes('window.location.replace(publishedPortal.toString())'));
assert('Schema scheda aggiornato', portalSource.includes('const SCHEMA_VERSION = 8'));
assert('Data seduta registrata', portalSource.includes('Data seduta') && portalSource.includes('function updateWorkoutDate('));
assert('Nota serie modificabile', portalSource.includes("'sessionNote', this.value") && portalSource.includes('Nota della serie'));
assert('Campi scheda salvati durante la digitazione', portalSource.includes('document.getElementById(id).addEventListener("input"'));
assert('Errore localStorage non blocca il cloud', portalSource.includes('function writeLocalValue(') && portalSource.includes('queueCloudSave(exerciseId)'));
assert('Conflitto esplicito e risolvibile', portalSource.includes('PROGRAM_CONFLICT') && portalSource.includes('resolveProgramConflict'));
assert('Revisioni automatiche e ripristino rimossi dal portale', !portalSource.includes('restoreProgramRevision') && !portalSource.includes('Versioni precedenti ripristinabili'));
assert('Migrazione con transazione atomica', migrationSource.includes('create or replace function public.pt_save_program') && migrationSource.includes('pg_advisory_xact_lock'));
assert('Nuove tabelle PT chiuse al browser senza interrompere Scheda Cliente', migrationSource.includes("'pt_program_revisions'") && migrationSource.includes('revoke all privileges') && !migrationSource.includes("    'schede_allenamento',") && !migrationSource.includes("    'carichi_allenamento',"));

const stateFromProgramSource = portalSource.slice(portalSource.indexOf('    function stateFromProgram(program)'), portalSource.indexOf('    function previousExerciseHistory('));
const emptyProgramContext = vm.createContext({});
vm.runInContext(`${stateFromProgramSource}\nglobalThis.emptyProgram = stateFromProgram(null);`, emptyProgramContext);
assert('Cliente senza programmi apre una nuova bozza senza errore', emptyProgramContext.emptyProgram === null);

const legacyStart = portalSource.indexOf('    function progressionPlan(value)');
const legacyEnd = portalSource.indexOf('    async function loadPortalData()', legacyStart);
assert('Convertitore legacy individuato', legacyStart >= 0 && legacyEnd > legacyStart);
const legacyContext = {
  defaultState: {
    meta: { goal: '', period: '2026-09', level: '', frequency: '', warmup: '', generalNotes: '' },
    sessions: ['Settimana 1', 'Settimana 2', 'Settimana 3', 'Settimana 4'],
    sheetOrder: ['A'],
    sheets: { A: [] },
  },
  clone: value => JSON.parse(JSON.stringify(value)),
  currentPeriodKey: () => '2026-09',
  normalizePeriodKey: value => value || '2026-09',
  makeExercise(name, group, notes, plan, recovery, effort) {
    return { id: 'generated', name, group, notes, plan, recovery, effort, feedback: plan.map(() => ''), weekSets: [] };
  },
  normalizeState: value => value,
  console,
};
vm.createContext(legacyContext);
vm.runInContext(`${portalSource.slice(legacyStart, legacyEnd)}\nglobalThis.convertLegacy = stateFromLegacyProgram;`, legacyContext);
const legacyState = legacyContext.convertLegacy({
  periodo: '2025-12',
  settimane: 4,
  giorni: [{ id: 'giorno-1', nome: 'Giorno gambe' }],
  esercizi: [{
    id: 'legacy-squat',
    giorno_id: 'giorno-1',
    nome: 'Squat',
    gruppo: 'Gambe',
    serie: 3,
    ripetizioni: 8,
    progressione: { sedute: ['3 x 8', '3 x 9', '3 x 10', '3 x 10'] },
  }],
});
assert('Vecchia scheda giorni/esercizi convertita', legacyState?.sheets?.A?.[0]?.name === 'Squat');
assert('Progressione legacy conservata', legacyState.sheets.A[0].plan[2] === '3 x 10' && legacyState.sessions.length === 4);

const helperFixture = {
  pt_studio_state: {
    sessions: ['Settimana 1'],
    sheetOrder: ['A'],
    workoutDates: { A: ['2026-09-01'] },
    sheets: {
      A: [{
        id: 'exercise-squat',
        name: 'Squat',
        group: 'Gambe',
        weekSets: [[
          { id: 'set-1', reps: '8', load: '50 kg', rir: '2', sessionNote: 'Tecnica pulita', note: 'Discesa controllata' },
          { id: 'set-2', reps: '8', load: '52 kg', rir: '1', note: '' },
        ]],
      }],
    },
  },
  save_meta: { sync_token: 'sync-fixture' },
};
const loadRows = ptData._test.buildLoadRows('program-1', 'client-own', helperFixture, '2026-09-01T10:00:00.000Z', 'pt-own');
assert('Ogni serie della seduta produce una riga storica', loadRows.length === 2);
assert('Carico, reps, RIR, note e data conservati', loadRows[0].data.load === '50 kg' && loadRows[0].data.reps === '8' && loadRows[0].data.rir === '2' && loadRows[0].data.note === 'Tecnica pulita' && loadRows[0].data.session_date === '2026-09-01');
assert('Identificatore carico deterministico', loadRows[0].id === ptData._test.buildLoadRows('program-1', 'client-own', helperFixture, '2026-09-01T10:00:00.000Z', 'pt-own')[0].id);
const plannedOnly = JSON.parse(JSON.stringify(helperFixture));
plannedOnly.pt_studio_state.workoutDates.A[0] = '';
plannedOnly.pt_studio_state.sheets.A[0].weekSets[0] = [{ id: 'set-planned', reps: '8', load: '', rir: '', note: 'Discesa controllata', sessionNote: '' }];
assert('Indicazione programmata non crea una falsa seduta', ptData._test.buildLoadRows('program-1', 'client-own', plannedOnly, '2026-09-01T10:00:00.000Z', 'pt-own').length === 0);

const token = auth.signAccessToken('paolo@qa.test', 'pt-own', 'pt');
const realFetch = global.fetch;
let rpcMode = 'success';
let rpcInput = null;
let storedRequestId = '';
let rpcCalls = 0;

global.fetch = async (url, options = {}) => {
  const value = String(url);
  if (value.includes('/pt_client_current_programs')) return new Response(JSON.stringify([{program_id:'program-1'}]));
  const headers = options.headers || {};
  assert('Chiamata Supabase usa solo chiave server', headers.apikey === process.env.SUPABASE_SECRET_KEY && headers.Authorization === `Bearer ${process.env.SUPABASE_SECRET_KEY}`);
  if (value.includes('/operators?')) return new Response(JSON.stringify([{id:'pt-own',active:true,portal_access_enabled:true,portal_access_version:0}]),{status:200});
  if (value.includes('/operator_effective_roles')) {
    return new Response(JSON.stringify([{
      operator_id: 'pt-own', id: 'pt-own', email: 'paolo@qa.test', nome: 'Paolo', cognome: 'Proprio', roles: ['pt'], active: true,
    }]), { status: 200 });
  }
  if (value.includes('/clients') && value.includes('id=eq.client-other')) {
    return new Response(JSON.stringify([{ id: 'client-other', pt_assegnato: 'pt-other', active: true }]), { status: 200 });
  }
  if (value.includes('/clients')) {
    return new Response(JSON.stringify([{ id: 'client-own', pt_assegnato: 'pt-own', active: true }]), { status: 200 });
  }
  if (value.includes('/schede_allenamento')) {
    return new Response(JSON.stringify([{
      id: 'program-1', cliente_id: 'client-own', data: { ...helperFixture, save_meta: { ...helperFixture.save_meta, request_id: storedRequestId } }, updated_at: '2026-09-01T09:00:00.000Z', created_at: '2026-08-01T09:00:00.000Z',
    }]), { status: 200 });
  }
  if (value.includes('/rpc/pt_save_program')) {
    rpcCalls += 1;
    rpcInput = JSON.parse(options.body || '{}');
    if (rpcMode === 'conflict') {
      return new Response(JSON.stringify({ success: false, code: 'PROGRAM_CONFLICT', current: {
        id: 'program-1', cliente_id: 'client-own', data: helperFixture, updated_at: '2026-09-01T09:30:00.000Z',
      } }), { status: 200 });
    }
    return new Response(JSON.stringify({
      success: true,
      row: { id: 'program-1', cliente_id: 'client-own', data: rpcInput.p_data, updated_at: '2026-09-01T10:00:00.000Z' },
      revision: { id: 'revision-1', program_id: 'program-1', cliente_id: 'client-own', created_at: '2026-09-01T10:00:00.000Z' },
    }), { status: 200 });
  }
  throw new Error(`Fetch non previsto: ${value}`);
};

(async () => {
  const success = await ptData.handler({
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      action: 'upsert_program',
      programId: 'program-1',
      clientId: 'client-own',
      expectedUpdatedAt: '2026-09-01T09:00:00.000Z',
      data: helperFixture,
    }),
  });
  const successBody = JSON.parse(success.body);
  assert('Salvataggio API completato', success.statusCode === 200 && successBody.success && successBody.loadCount === 2);
  assert('Concorrenza inoltrata alla transazione', rpcInput.p_expected_updated_at === '2026-09-01T09:00:00.000Z' && rpcInput.p_force === false);
  assert('Autore imposto dal server', rpcInput.p_data.trainer_id === 'pt-own' && rpcInput.p_data.save_meta.source === 'pt_data_api');

  storedRequestId = 'request-lost-response';
  const beforeRetry = rpcCalls;
  const retried = await ptData.handler({
    httpMethod: 'POST', headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'upsert_program', programId: 'program-1', clientId: 'client-own',
      expectedUpdatedAt: '2026-09-01T08:00:00.000Z',
      data: { ...helperFixture, save_meta: { request_id: storedRequestId } } }),
  });
  assert('Risposta persa: retry riconosce il salvataggio già eseguito', retried.statusCode === 200 && rpcCalls === beforeRetry);
  storedRequestId = '';

  rpcMode = 'conflict';
  const conflict = await ptData.handler({
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'upsert_program', programId: 'program-1', clientId: 'client-own', data: helperFixture, expectedUpdatedAt: '2026-09-01T08:00:00.000Z' }),
  });
  assert('Conflitto restituito senza sovrascrittura silenziosa', conflict.statusCode === 409 && JSON.parse(conflict.body).code === 'PROGRAM_CONFLICT');

  rpcMode = 'success';
  const forbidden = await ptData.handler({
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'upsert_program', programId: 'program-other', clientId: 'client-other', data: helperFixture }),
  });
  assert('PT non modifica clienti altrui', forbidden.statusCode === 403);
  global.fetch = realFetch;
})().catch(error => {
  global.fetch = realFetch;
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
