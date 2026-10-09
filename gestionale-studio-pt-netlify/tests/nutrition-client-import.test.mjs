import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { handler, __test } from '../netlify/functions/nutrition-client-import.mjs';

const OWNER_EMAIL = 'nutrizione.gianlucapirisi@gmail.com';
const VERIFY_URL = 'https://pt.example.test/verify';
const NUTRITION_URL = 'https://nutrition.example.test/api';
const SUPABASE_URL = 'https://studio.example.supabase.co';
const ENV_KEYS = [
  'PT_ACCESS_VERIFY_URL',
  'PT_ACCESS_SECRET',
  'SCADENZE_API_URL',
  'SCADENZE_API_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NUTRITION_CF_SCAN_LIMIT'
];
const originalEnv = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function configure() {
  process.env.PT_ACCESS_VERIFY_URL = VERIFY_URL;
  process.env.PT_ACCESS_SECRET = 'pt-access-secret-for-tests';
  process.env.SCADENZE_API_URL = NUTRITION_URL;
  process.env.SCADENZE_API_TOKEN = 'nutrition-server-token';
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_server_test';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NUTRITION_CF_SCAN_LIMIT = '30';
  __test.clearCaches();
}

function signedToken(email = OWNER_EMAIL, operatorId = 'operator-owner') {
  const payload = Buffer.from(JSON.stringify({
    email,
    operatorId,
    accessLevel: email === OWNER_EMAIL ? 'owner' : 'pt',
    exp: Date.now() + 60_000
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.PT_ACCESS_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function event(body, token = signedToken()) {
  return {
    httpMethod: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body)
  };
}

function operatorResponse(email = OWNER_EMAIL) {
  return new Response(JSON.stringify({
    success: true,
    operatorId: email === OWNER_EMAIL ? 'operator-owner' : 'operator-pt',
    email,
    accessLevel: email === OWNER_EMAIL ? 'owner' : 'pt',
    expiresAt: Date.now() + 60_000
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function nutritionClient(overrides = {}) {
  return {
    id: 'NUT-1001',
    nome: 'Maria',
    cognome: 'Rossi',
    email: 'maria.rossi@example.test',
    telefono: '+39 333 0000000',
    tipo: 'Nutrizione',
    fonte: 'Form anamnesi',
    ...overrides
  };
}

function nutritionDetail(overrides = {}) {
  return nutritionClient({
    data_nascita: '1985-04-10',
    sesso: 'Femmina',
    codice_fiscale: 'RSSMRA85D50H501X',
    professione: 'Architetta',
    patologie: 'dato sanitario che non deve uscire',
    farmaci: 'dato sanitario che non deve essere copiato',
    note_nutrizionista: 'nota clinica privata',
    ...overrides
  });
}

function nutritionAction(init = {}) {
  return JSON.parse(init.body || '{}').action;
}

test.beforeEach(configure);

test.afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] == null) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
  __test.clearCaches();
});

test('una chiamata diretta senza sessione viene negata prima di interrogare servizi esterni', async () => {
  globalThis.fetch = async () => { throw new Error('fetch non previsto'); };
  const response = await handler(event({ action: 'search', query: 'maria.rossi@example.test' }, ''));
  assert.equal(response.statusCode, 401);
  assert.match(JSON.parse(response.body).error, /sessione/i);
});

test('un token contraffatto viene respinto localmente prima della verifica remota', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('fetch non previsto');
  };
  const forged = `${Buffer.from(JSON.stringify({ email: OWNER_EMAIL, operatorId: 'operator-owner', exp: Date.now() + 60_000 })).toString('base64url')}.firma-falsa`;
  const response = await handler(event({ action: 'search', query: 'maria.rossi@example.test' }, forged));
  assert.equal(response.statusCode, 401);
  assert.equal(calls, 0);
});

test('l’endpoint fallisce chiuso se il segreto PT condiviso non è configurato', async () => {
  delete process.env.PT_ACCESS_SECRET;
  globalThis.fetch = async () => { throw new Error('fetch non previsto'); };
  const response = await handler(event({ action: 'search', query: 'maria.rossi@example.test' }, 'token.formato'));
  assert.equal(response.statusCode, 503);
  assert.match(JSON.parse(response.body).error, /non configurata/i);
});

test('un normale Personal Trainer non può interrogare Nutrizione tramite l’endpoint', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (url === VERIFY_URL) return operatorResponse('trainer@example.test');
    throw new Error(`servizio non autorizzato interrogato: ${url}`);
  };
  const response = await handler(event({
    action: 'search',
    query: 'maria.rossi@example.test',
    email: OWNER_EMAIL
  }, signedToken('trainer@example.test', 'operator-pt')));
  assert.equal(response.statusCode, 403);
  assert.deepEqual(calls, [VERIFY_URL]);
});

test('la sessione owner abilita il pannello senza interrogare Nutrizione', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    if (url === VERIFY_URL) return operatorResponse();
    throw new Error(`servizio inatteso: ${url}`);
  };
  const response = await handler(event({ action: 'authorize' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.success, true);
  assert.equal(body.email, OWNER_EMAIL);
  assert.deepEqual(calls, [VERIFY_URL]);
});

test('l’account autorizzato cerca per email e riceve soltanto il riepilogo anagrafico', async () => {
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL && nutritionAction(init) === 'getClienti') {
      return jsonResponse({ success: true, clienti: [nutritionClient({ patologie: 'privato', farmaci: 'privato' })] });
    }
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'search', query: 'maria.rossi@example.test' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.candidates.length, 1);
  assert.deepEqual(Object.keys(body.candidates[0]).sort(), [
    'codiceFiscale', 'cognome', 'email', 'nascita', 'nome', 'professione', 'sesso', 'sourceId', 'telefono'
  ].sort());
  assert.equal(JSON.stringify(body).includes('patologie'), false);
  assert.equal(JSON.stringify(body).includes('farmaci'), false);
});

test('la ricerca per codice fiscale usa il dettaglio server-side quando la lista non espone il campo', async () => {
  const actions = [];
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL) {
      const action = nutritionAction(init);
      actions.push(action);
      if (action === 'getClienti') return jsonResponse({ success: true, clienti: [nutritionClient()] });
      if (action === 'getCliente') return jsonResponse({ success: true, cliente: nutritionDetail() });
    }
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'search', query: 'RSSMRA85D50H501X' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.candidates[0].sourceId, 'NUT-1001');
  assert.equal(body.candidates[0].codiceFiscale, 'RSSMRA85D50H501X');
  assert.deepEqual(actions, ['getClienti', 'getCliente']);
});

test('un cliente non presente restituisce lista vuota e mantiene disponibile l’inserimento manuale', async () => {
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL && nutritionAction(init) === 'getClienti') return jsonResponse({ success: true, clienti: [] });
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'search', query: 'assente@example.test' }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).candidates, []);
});

test('un cliente già presente in clients non genera una nuova acquisizione', async () => {
  let acquisitionWrites = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL) {
      const action = nutritionAction(init);
      if (action === 'getClienti') return jsonResponse({ success: true, clienti: [nutritionClient()] });
      if (action === 'getCliente') return jsonResponse({ success: true, cliente: nutritionDetail() });
    }
    if (String(url).includes('/rest/v1/clients?')) {
      return jsonResponse([{ id: 'client-pt-1', nome: 'Maria', cognome: 'Rossi', email: 'maria.rossi@example.test', telefono: '333', active: true }]);
    }
    if (String(url).includes('/rest/v1/acquisizioni')) acquisitionWrites += 1;
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'import', sourceId: 'NUT-1001' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'existing_client');
  assert.equal(acquisitionWrites, 0);
  assert.match(body.message, /non è stata creata.*duplicata/i);
});

test('l’importazione crea un solo lead PT con campi comuni e nessun dato clinico', async () => {
  let inserted = null;
  const nutritionActions = [];
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL) {
      const action = nutritionAction(init);
      nutritionActions.push(action);
      if (action === 'getClienti') return jsonResponse({ success: true, clienti: [nutritionClient()] });
      if (action === 'getCliente') return jsonResponse({ success: true, cliente: nutritionDetail() });
    }
    if (String(url).includes('/rest/v1/clients?')) return jsonResponse([]);
    if (String(url).includes('/rest/v1/acquisizioni?') && (!init.method || init.method === 'GET')) return jsonResponse([]);
    if (String(url).endsWith('/rest/v1/acquisizioni') && init.method === 'POST') {
      inserted = JSON.parse(init.body);
      return new Response(null, { status: 204 });
    }
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'import', sourceId: 'NUT-1001' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'created');
  assert.equal(body.source.professione, 'Architetta');
  assert.equal(JSON.stringify(body.source).includes('patologie'), false);
  assert.equal(JSON.stringify(body.source).includes('farmaci'), false);
  assert.match(body.preservedImpressioni, /\[NUTRITION_SOURCE\] NUT-1001/);
  assert.equal(inserted.nome, 'Maria');
  assert.equal(inserted.cognome, 'Rossi');
  assert.equal(inserted.codice_fiscale, 'RSSMRA85D50H501X');
  assert.equal(inserted.servizi, 'PT');
  assert.match(inserted.impressioni, /\[NUTRITION_SOURCE\] NUT-1001/);
  assert.match(inserted.impressioni, /\[PT_OWNER\] operator-owner/);
  assert.equal('patologie' in inserted, false);
  assert.equal('farmaci' in inserted, false);
  assert.equal('note_nutrizionista' in inserted, false);
  assert.deepEqual(nutritionActions, ['getClienti', 'getCliente']);
});

test('un’acquisizione esistente viene riutilizzata senza sovrascrivere i campi PT', async () => {
  let patched = null;
  globalThis.fetch = async (url, init = {}) => {
    if (url === VERIFY_URL) return operatorResponse();
    if (url === NUTRITION_URL) {
      const action = nutritionAction(init);
      if (action === 'getClienti') return jsonResponse({ success: true, clienti: [nutritionClient()] });
      if (action === 'getCliente') return jsonResponse({ success: true, cliente: nutritionDetail() });
    }
    if (String(url).includes('/rest/v1/clients?')) return jsonResponse([]);
    if (String(url).includes('/rest/v1/acquisizioni?') && (!init.method || init.method === 'GET')) {
      return jsonResponse([{
        id: 'acq-existing',
        nome: 'Maria',
        cognome: 'Rossi',
        email: 'maria.rossi@example.test',
        telefono: '',
        codice_fiscale: '',
        servizi: 'Nutrizione',
        stato: 'In valutazione',
        obiettivo: 'Obiettivo PT già compilato',
        impressioni: 'Nota PT esistente'
      }]);
    }
    if (String(url).includes('/rest/v1/acquisizioni?') && init.method === 'PATCH') {
      patched = JSON.parse(init.body);
      return new Response(null, { status: 204 });
    }
    throw new Error(`richiesta inattesa: ${url}`);
  };
  const response = await handler(event({ action: 'import', sourceId: 'NUT-1001' }));
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.status, 'updated_acquisition');
  assert.equal(body.acquisitionId, 'acq-existing');
  assert.equal(patched.telefono, '+39 333 0000000');
  assert.equal(patched.codice_fiscale, 'RSSMRA85D50H501X');
  assert.equal(patched.servizi, 'PT,Nutrizione');
  assert.equal('obiettivo' in patched, false);
  assert.match(patched.impressioni, /Nota PT esistente/);
});

test('il modulo rende gli strumenti Nutrizione inizialmente nascosti e usa il token verificato', () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(path.join(directory, '..', 'app', 'anamnesi-cliente', 'index.html'), 'utf8');
  assert.match(html, /id="nutritionTools" class="owner-tools hidden"/);
  assert.match(html, /nutritionRequest\(\{action:'authorize'\}\)/);
  assert.match(html, /Authorization:'Bearer '\+nutritionAccessToken/);
  assert.match(html, /Apri le anamnesi Nutrizione/);
  assert.match(html, /prefillCommonFields\(data\.source\|\|selectedNutritionClient\)/);
  assert.equal(html.includes('SCADENZE_API_TOKEN'), false);
  assert.equal(html.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
});

test('la Dashboard passa la sessione al modulo solo per l’account Nutrizione', () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const html = fs.readFileSync(path.join(directory, '..', '..', '..', 'dashboard-pt', 'index.html'), 'utf8');
  assert.match(html, /NUTRITION_IMPORT_EMAIL\s*=\s*"nutrizione\.gianlucapirisi@gmail\.com"/);
  assert.match(html, /appName === "anamnesis"/);
  assert.match(html, /isNutritionOwner[\s\S]*url\.hash = new URLSearchParams\(\{ access: session\.token \}\)/);
  assert.match(html, /data-app="anamnesis"/);
});
