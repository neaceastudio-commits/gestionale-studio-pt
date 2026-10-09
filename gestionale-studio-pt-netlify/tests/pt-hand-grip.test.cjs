const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

process.env.PT_ACCESS_SECRET = 'pt-hand-grip-test-secret';
process.env.SUPABASE_SECRET_KEY = 'pt-hand-grip-test-server-key';
process.env.SUPABASE_URL = 'https://supabase.test';

const portalSource = read('app/portale-personal-trainer/index.html');
const migrationSource = read('supabase/migrations/20260901094141_secure_pt_program_persistence.sql');
const auth = require(path.join(root, 'netlify/functions/lib/pt-auth.js'));
const ptData = require(path.join(root, 'netlify/functions/pt-data.js'));

assert('Voce Hand Grip disponibile nella navigazione', portalSource.includes('data-view="gripView"') && portalSource.includes('Forza della presa · Hand Grip'));
assert('Test separato per mano e protocollo', portalSource.includes('id="gripRight"') && portalSource.includes('id="gripLeft"') && portalSource.includes('id="gripAttempts"') && portalSource.includes('id="gripPosition"'));
assert('Storico confrontato con la misurazione iniziale', portalSource.includes('function gripDelta(') && portalSource.includes("Variazione dall'inizio") && portalSource.includes('Prima misurazione'));
assert('Salvataggio passa dalla API autenticata', portalSource.includes('ptData("save_hand_grip"') && portalSource.includes('saveHandGripMeasurement'));
assert('Correzione storica senza cancellazione definitiva', portalSource.includes('ptData("void_hand_grip"') && portalSource.includes('Il dato resterà tracciato'));
assert('Storico Hand Grip dedicato, indicizzato e chiuso al browser', migrationSource.includes('create table if not exists public.pt_hand_grip_measurements') && migrationSource.includes('pt_hand_grip_cliente_updated_idx') && migrationSource.includes('revoke all privileges on table public.pt_hand_grip_measurements from public, anon, authenticated'));
assert('Funzione SQL usa i privilegi del chiamante', migrationSource.includes('security invoker') && !migrationSource.includes('security definer'));

const gripStart = portalSource.indexOf('    function localDateValue(');
const gripEnd = portalSource.indexOf('    function renderClientFocus()', gripStart);
assert('Funzioni Hand Grip individuate', gripStart >= 0 && gripEnd > gripStart);
const gripContext = {
  appState: {
    selectedClientId: 'client-own',
    physicalMeasurements: [
      {
        id: 'grip-2', cliente_id: 'client-own', updated_at: '2026-09-08T10:00:00Z',
        data: { tipo: 'hand_grip', data: '2026-09-08', hand_grip_dx: 44, hand_grip_sx: 40 },
      },
      {
        id: 'grip-1', cliente_id: 'client-own', updated_at: '2026-08-01T10:00:00Z',
        data: { test_type: 'hand_grip', measured_on: '2026-08-01', hand_grip_dx: '40,0', hand_grip_sx: 38 },
      },
      { id: 'weight-1', cliente_id: 'client-own', data: { tipo: 'peso', peso: 80 } },
      { id: 'grip-other', cliente_id: 'client-other', data: { tipo: 'hand_grip', data: '2026-08-01', hand_grip_dx: 50 } },
    ],
  },
  Intl,
  Date,
  Number,
  String,
  Math,
  console,
};
vm.createContext(gripContext);
vm.runInContext(`${portalSource.slice(gripStart, gripEnd)}\nglobalThis.gripRows = handGripMeasurements; globalThis.gripChange = gripDelta;`, gripContext);
const normalizedRows = gripContext.gripRows();
const change = gripContext.gripChange(normalizedRows[1].rightKg, normalizedRows[0].rightKg);
assert('Storico isolato per cliente e ordinato dalla prima misurazione', normalizedRows.length === 2 && normalizedRows[0].id === 'grip-1' && normalizedRows[1].id === 'grip-2');
assert('Valori con virgola normalizzati e progresso calcolato', normalizedRows[0].rightKg === 40 && change.kg === 4 && change.percent === 10);

const token = auth.signAccessToken('paolo@qa.test', 'pt-own', 'pt');
const realFetch = global.fetch;
const insertedRows = [];
const existingGripRow = {
  id: 'grip-existing', cliente_id: 'client-own', created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
  data: { tipo: 'hand_grip', data: '2026-08-01', hand_grip_dx: 40, hand_grip_sx: 38 },
};

global.fetch = async (url, options = {}) => {
  const value = String(url);
  const headers = options.headers || {};
  assert('Chiamata Supabase Hand Grip usa solo chiave server', headers.apikey === process.env.SUPABASE_SECRET_KEY && headers.Authorization === `Bearer ${process.env.SUPABASE_SECRET_KEY}`);
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
  if (value.includes('/pt_hand_grip_measurements') && options.method === 'POST') {
    assert('Endpoint Hand Grip corretto e idempotente', new URL(value).pathname === '/rest/v1/pt_hand_grip_measurements' && new URL(value).searchParams.get('on_conflict') === 'id');
    const row = JSON.parse(options.body || '{}');
    insertedRows.push(row);
    return new Response(JSON.stringify([{ ...row, created_at: row.updated_at }]), { status: 201 });
  }
  if (value.includes('/pt_hand_grip_measurements') && options.method === 'PATCH') {
    const id = decodeURIComponent(new URL(value).searchParams.get('id') || '').replace(/^eq\./, '');
    const existing = insertedRows.find(row => row.id === id) || (existingGripRow.id === id ? existingGripRow : null);
    const changes = JSON.parse(options.body || '{}');
    const saved = existing ? { ...existing, ...changes } : null;
    return new Response(JSON.stringify(saved ? [saved] : []), { status: 200 });
  }
  if (value.includes('/pt_hand_grip_measurements') && value.includes('id=eq.')) {
    const id = decodeURIComponent(new URL(value).searchParams.get('id') || '').replace(/^eq\./, '');
    const existing = insertedRows.find(row => row.id === id) || (existingGripRow.id === id ? existingGripRow : null);
    return new Response(JSON.stringify(existing ? [existing] : []), { status: 200 });
  }
  if (value.includes('/pt_hand_grip_measurements')) {
    return new Response(JSON.stringify([existingGripRow]), { status: 200 });
  }
  if (['/pt_client_shares', '/schede_allenamento', '/acquisizioni', '/pt_program_revisions', '/pt_exercise_archive', '/carichi_allenamento', '/pt_client_current_programs'].some(part => value.includes(part))) {
    return new Response('[]', { status: 200 });
  }
  throw new Error(`Fetch non previsto: ${value}`);
};

async function request(body) {
  return ptData.handler({
    httpMethod: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

(async () => {
  const bootstrap = await request({ action: 'bootstrap' });
  const bootstrapBody = JSON.parse(bootstrap.body);
  assert('Bootstrap carica lo storico Hand Grip autorizzato', bootstrap.statusCode === 200 && bootstrapBody.physicalMeasurements.length === 1 && bootstrapBody.physicalMeasurements[0].id === 'grip-existing');

  const firstSave = await request({
    action: 'save_hand_grip',
    clientId: 'client-own',
    measuredOn: '2026-09-08',
    rightKg: '41,2',
    leftKg: 39.7,
    dominantHand: 'destra',
    attempts: 3,
    position: 'seduto',
    notes: 'Stessa regolazione',
    measurementId: 'grip_stable-request-0001',
  });
  const firstBody = JSON.parse(firstSave.body);
  assert('Misurazione Hand Grip salvata', firstSave.statusCode === 200 && firstBody.success && insertedRows.length === 1);
  assert('Payload conserva valori numerici, protocollo e autore', insertedRows[0].data.hand_grip_dx === 41.2 && insertedRows[0].data.hand_grip_sx === 39.7 && insertedRows[0].data.tentativi === 3 && insertedRows[0].data.recorded_by === 'pt-own');
  const retry = await request({ action: 'save_hand_grip', clientId: 'client-own', measuredOn: '2026-09-08', rightKg: '41,2', leftKg: 39.7,
    dominantHand: 'destra', attempts: 3, position: 'seduto', notes: 'Stessa regolazione', measurementId: 'grip_stable-request-0001' });
  assert('Retry dopo risposta persa non duplica Hand Grip', retry.statusCode === 200 && insertedRows.length === 1);
  const changedRetry = await request({ action: 'save_hand_grip', clientId: 'client-own', measuredOn: '2026-09-08', rightKg: 90, measurementId: 'grip_stable-request-0001' });
  assert('Stesso identificativo non sovrascrive una misurazione diversa', changedRetry.statusCode === 409 && insertedRows[0].data.hand_grip_dx === 41.2);

  const secondSave = await request({ action: 'save_hand_grip', clientId: 'client-own', measuredOn: '2026-09-15', rightKg: 42, attempts: 3, position: 'seduto' });
  assert('Controlli successivi creano righe storiche distinte', secondSave.statusCode === 200 && insertedRows.length === 2 && insertedRows[0].id !== insertedRows[1].id);

  const voided = await request({ action: 'void_hand_grip', measurementId: insertedRows[0].id });
  const voidedBody = JSON.parse(voided.body);
  assert('Misurazione errata annullata senza cancellare la riga', voided.statusCode === 200 && voidedBody.measurement.data.voided_by === 'pt-own' && Boolean(voidedBody.measurement.data.voided_at));

  const missingValues = await request({ action: 'save_hand_grip', clientId: 'client-own', measuredOn: '2026-09-08' });
  assert('Misurazione vuota rifiutata', missingValues.statusCode === 400 && insertedRows.length === 2);

  const invalidDate = await request({ action: 'save_hand_grip', clientId: 'client-own', measuredOn: '2026-02-30', rightKg: 40 });
  assert('Data impossibile rifiutata', invalidDate.statusCode === 400 && insertedRows.length === 2);

  const forbidden = await request({ action: 'save_hand_grip', clientId: 'client-other', measuredOn: '2026-09-08', rightKg: 40 });
  assert('PT non salva Hand Grip su clienti altrui', forbidden.statusCode === 403 && insertedRows.length === 2);
  global.fetch = realFetch;
})().catch(error => {
  global.fetch = realFetch;
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
