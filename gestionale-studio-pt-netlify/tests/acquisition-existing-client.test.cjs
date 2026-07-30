const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'app', 'acquisizione', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].at(-1)[1]
  .replace(/\bverifyAcquisitionAccess\(\)\.catch\(showAccessError\);\s*$/, '');

let fetchHandler = async () => response(500, 'fetch non configurato');
const context = vm.createContext({
  URL,
  console,
  setTimeout,
  clearTimeout,
  fetch: (...args) => fetchHandler(...args),
});
vm.runInContext(script, context);

function evaluate(source) {
  return vm.runInContext(source, context);
}

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function setAcquisition(overrides = {}) {
  const record = {
    id: 'acq_test',
    nome: 'Emanuela',
    cognome: 'Laconi',
    email: 'EMA.LACONI@example.com ',
    telefono: '',
    nascita: '1988-04-12',
    sesso: 'F',
    codiceFiscale: 'LCNMNL88D52B354R',
    indirizzo: 'Via Roma 10',
    cap: '09100',
    comune: 'Cagliari',
    provincia: 'CA',
    contattoEmergenza: 'Mario 3330000000',
    obiettivo: 'Dimagrimento',
    obiettivoLibero: 'Migliorare la composizione corporea',
    professione: 'Impiegata',
    come: 'Passaparola',
    motivazione: 8,
    sessioni_pref: '2×',
    impressioni: 'Patologie: ipertensione\nFarmaci: terapia prescritta',
    ...overrides,
  };
  context.recordForTest = record;
  evaluate('acquisizioni=[recordForTest]');
  return record;
}

test('un cliente già presente viene aggiornato e non duplicato', async () => {
  setAcquisition();
  const calls = [];
  fetchHandler = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (!options.method || options.method === 'GET') {
      return response(200, [{
        id: 'c_existing',
        nome: 'Emanuela',
        cognome: 'Laconi',
        email: 'ema.laconi@example.com',
        active: true,
      }]);
    }
    return response(204);
  };

  const result = await evaluate(`apiFetch({
    action:'confermaCliente',
    id:'acq_test',
    packageType:'PT 1:1',
    tipoAbbonamento:'Pacchetto 10',
    sessioni_totali:10,
    sessioni_usate:2,
    giorniSettimana:['Lunedì','Giovedì'],
    ptId:'op_1',
    importo:500,
    statoPagamento:'Pagato'
  })`);

  assert.equal(result.success, true);
  assert.equal(result.existingClient, true);
  assert.equal(result.clientId, 'c_existing');

  const clientWrites = calls.filter(call =>
    call.url.includes('/clients?') && call.options.method && call.options.method !== 'GET'
  );
  assert.equal(clientWrites.length, 1);
  assert.equal(clientWrites[0].options.method, 'PATCH');
  assert.match(clientWrites[0].url, /id=eq\.c_existing/);

  const patch = JSON.parse(clientWrites[0].options.body);
  assert.equal(patch.obiettivo, 'Migliorare la composizione corporea');
  assert.equal(patch.professione, 'Impiegata');
  assert.equal(patch.come, 'Passaparola');
  assert.equal(patch.motivazione, 8);
  assert.equal(patch.nascita, '1988-04-12');
  assert.equal(patch.codice_fiscale, 'LCNMNL88D52B354R');
  assert.equal(patch.contatto_emergenza, 'Mario 3330000000');
  assert.match(patch.notes, /Patologie: ipertensione/);
  assert.match(patch.notes, /Indirizzo: Via Roma 10, 09100 Cagliari CA/);
  assert.equal('package_types' in patch, false);
  assert.equal('sessions_total' in patch, false);
  assert.equal(patch.pt_assegnato, 'op_1');
  assert.equal('importo' in patch, false);

  const archived = calls.find(call =>
    call.url.includes('/acquisizioni?') && call.options.method === 'PATCH'
  );
  assert.ok(archived);
  assert.equal(JSON.parse(archived.options.body).stato, 'Convertito');
});

test('un errore nel controllo blocca la creazione del cliente', async () => {
  setAcquisition();
  const calls = [];
  fetchHandler = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return response(500, 'database non disponibile');
  };

  await assert.rejects(
    evaluate(`apiFetch({action:'confermaCliente',id:'acq_test'})`),
    /Controllo cliente non riuscito/
  );
  assert.equal(calls.some(call => call.options.method === 'POST'), false);
});

test('un cliente nuovo continua a essere creato normalmente', async () => {
  setAcquisition({ email: 'nuova@example.com' });
  const calls = [];
  fetchHandler = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (!options.method || options.method === 'GET') return response(200, []);
    return response(204);
  };

  const result = await evaluate(`apiFetch({
    action:'confermaCliente',
    id:'acq_test',
    packageType:'Nutrizione',
    tipoAbbonamento:'',
    sessioni_totali:0,
    sessioni_usate:0,
    giorniSettimana:[],
    ptId:'',
    importo:0,
    statoPagamento:'Da pagare'
  })`);

  assert.equal(result.success, true);
  assert.equal(result.existingClient, undefined);
  const clientInsert = calls.find(call =>
    call.url.includes('/clients?') && call.options.method === 'POST'
  );
  assert.ok(clientInsert);
  const inserted = JSON.parse(clientInsert.options.body);
  assert.equal(inserted.email, 'nuova@example.com');
  assert.equal(inserted.package_types[0], 'Nutrizione');
  assert.equal(inserted.codice_fiscale, 'LCNMNL88D52B354R');
  assert.match(inserted.notes, /Farmaci: terapia prescritta/);
});

test('il nome uguale da solo non unisce due persone diverse', async () => {
  setAcquisition({ email: 'persona-diversa@example.com', telefono: '' });
  const calls = [];
  fetchHandler = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (!options.method || options.method === 'GET') return response(200, []);
    return response(204);
  };

  await evaluate(`apiFetch({
    action:'confermaCliente',
    id:'acq_test',
    packageType:'Nutrizione',
    sessioni_totali:0,
    giorniSettimana:[]
  })`);

  const lookupUrls = calls
    .filter(call => !call.options.method || call.options.method === 'GET')
    .map(call => call.url);
  assert.equal(lookupUrls.some(url => url.includes('&nome=')), false);
  assert.equal(calls.some(call => call.options.method === 'POST'), true);
});

test('la finestra distingue chiaramente cliente esistente e cliente nuovo', () => {
  assert.match(html, /è già cliente\. Non verrà creata una seconda anagrafica/);
  assert.match(html, /Pacchetto, sessioni, pagamenti, PT assegnato e appuntamenti esistenti resteranno invariati/);
  assert.match(html, /Aggiorna e archivia/);
  assert.match(html, /Operazione bloccata per evitare la creazione accidentale di un doppione/);
});
