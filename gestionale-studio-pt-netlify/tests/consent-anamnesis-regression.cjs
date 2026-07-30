const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

function inlineScript(source) {
  const match = source.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Script inline non trovato');
  return match[1];
}

function createElement(id, anamnesis = false) {
  const classes = new Set();
  const field = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
  };
  return {
    id,
    textContent: '',
    className: '',
    hidden: false,
    style: {},
    classList: field.classList,
    closest(selector) {
      return anamnesis && selector === '[data-anamnesis-field]' ? field : null;
    },
    _field: field,
  };
}

async function runConsentPage(search) {
  const source = read('app/calendario-studio/consenso/index.html');
  const script = inlineScript(source);
  const anamnesisIds = new Set([
    'anamnesis-sex',
    'anamnesis-profession',
    'anamnesis-goal',
    'anamnesis-timing',
    'anamnesis-motivation',
    'anamnesis-experience',
    'anamnesis-activity',
    'anamnesis-sport',
    'anamnesis-frequency',
    'anamnesis-schedule',
    'anamnesis-source',
    'anamnesis-previous',
    'anamnesis-health',
    'anamnesis-operational',
  ]);
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, createElement(id, anamnesisIds.has(id)));
    return elements.get(id);
  };
  const signature = createElement('signature');
  const calls = [];
  const client = {
    id: 'c_test',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@example.test',
    telefono: '3331234567',
    pt_assegnato: 'pt_1',
    package_frequency: '2x',
    notes: '',
  };
  const acquisition = {
    id: 'acq_1',
    nome: 'Mario',
    cognome: 'Rossi',
    email: 'mario@example.test',
    telefono: '3331234567',
    nascita: '1990-02-03',
    sesso: 'M',
    professione: 'Impiegato',
    servizi: 'PT',
    obiettivo: 'Dimagrimento',
    obiettivo_libero: 'Perdere 8 kg',
    tempistica: '6 mesi',
    motivazione: 9,
    esperienza: 'Intermedio',
    inattivo: 'Sedentario',
    sport: 'Nuoto',
    sessioni_pref: '2x',
    orari: 'Lunedì sera',
    come: 'Passaparola',
    non_funzionato: 'Piani troppo rigidi',
    impressioni: 'Dati fatturazione:\\nCodice fiscale: RSSMRA90B03H501X\\nIndirizzo per fattura: Via Roma 1\\nCAP: 00100\\nComune: Roma\\nProvincia: RM\\nContatto emergenza: Anna 3330000000\\nPatologie: ipertensione\\nFarmaci: terapia prescritta',
    proposta: 'Percorso PT',
    followup: '2026-08-01',
  };
  const consent = {
    id: 'cons_1',
    cliente_id: 'c_test',
    email: client.email,
    data: {
      client_id: 'c_test',
      nome: 'Mario',
      cognome: 'Rossi',
      email: client.email,
      firma: 'Mario Rossi',
      data_consenso: '2026-07-24',
    },
  };

  async function fetchMock(url) {
    calls.push(url);
    let data = [];
    if (url.includes('/clients?')) data = [client];
    else if (url.includes('/operators?')) data = [{ id: 'pt_1', nome: 'Paolo', cognome: 'Trainer' }];
    else if (url.includes('/acquisizioni?')) data = [acquisition];
    else if (url.includes('/consensi_cliente?')) data = [consent];
    return {
      ok: true,
      status: 200,
      async json() { return data; },
      async text() { return JSON.stringify(data); },
    };
  }

  const context = {
    console,
    fetch: fetchMock,
    URLSearchParams,
    location: { search },
    document: {
      getElementById: getElement,
      querySelector(selector) {
        return selector === '.signature .line' ? signature : null;
      },
      createElement() {
        return createElement('created');
      },
    },
    setTimeout,
    clearTimeout,
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  await new Promise(resolve => setTimeout(resolve, 10));
  return { elements, signature, calls };
}

(async () => {
  const consentSource = read('app/calendario-studio/consenso/index.html');
  const acquisitionSource = read('app/acquisizione/index.html');
  const anamnesisSource = read('app/anamnesi-cliente/index.html');

  new vm.Script(inlineScript(consentSource));
  new vm.Script(inlineScript(acquisitionSource));
  new vm.Script(inlineScript(anamnesisSource));
  assert('Script HTML validi', true);

  const clientPage = await runConsentPage('?cliente=c_test');
  const value = id => clientPage.elements.get(id)?.textContent || '';
  assert('Il consenso interroga le acquisizioni', clientPage.calls.some(url => url.includes('/acquisizioni?')));
  assert('Codice fiscale recuperato dall’anamnesi', value('client-tax') === 'RSSMRA90B03H501X');
  assert('Indirizzo completo recuperato dall’anamnesi', value('client-address') === 'Via Roma 1, 00100 Roma RM');
  assert('Obiettivo completo stampato', value('anamnesis-goal').includes('Perdere 8 kg'));
  assert('Dati clinici completi e a capo', value('anamnesis-health').includes('Patologie: ipertensione\nFarmaci: terapia prescritta'));
  assert('Documento reso visibile', clientPage.elements.get('doc').style.display === 'block');

  const archivedConsentPage = await runConsentPage('?consenso=cons_1');
  assert('Consenso archiviato ricollegato al cliente', archivedConsentPage.calls.some(url => url.includes('/clients?')));
  assert('Consenso archiviato ricollegato all’anamnesi', archivedConsentPage.calls.some(url => url.includes('/acquisizioni?')));
  assert('Firma del consenso archiviato stampata', archivedConsentPage.signature.textContent === 'Mario Rossi');

  [
    'nascita:acq.nascita',
    'sesso:acq.sesso',
    'codice_fiscale:acq.codiceFiscale',
    'function acquisitionAddress(acq)',
    'contatto_emergenza:acq.contattoEmergenza',
    'notes:buildClientAnamnesisNotes(acq)',
    'stripMissingClientColumns',
  ].forEach(fragment => assert(`Trasferimento cliente: ${fragment}`, acquisitionSource.includes(fragment)));

  assert('Le nuove anamnesi salvano vere interruzioni di riga', anamnesisSource.includes("].filter(Boolean).join('\\n');"));
  assert('Rimosse le sequenze testuali doppie per gli a capo', !anamnesisSource.includes("join('\\\\n')"));
})().catch(error => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
