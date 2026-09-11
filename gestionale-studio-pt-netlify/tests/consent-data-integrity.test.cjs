const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../app/calendario-studio/consenso/index.html'), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\s*load\(\);\s*$/, '');
function harness() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', style: {}, hidden: false, disabled: false, closest: () => ({ classList: { toggle() {} } }) });
    return elements.get(id);
  };
  const context = vm.createContext({ console, URLSearchParams, document: { getElementById: get, querySelector: () => null } });
  vm.runInContext(script, context);
  return { context, elements, get };
}
function fixture() {
  const report = { nome: 'Cliente', cognome: 'Dimostrativo', nascita: '1990-02-03', telefono: '3330000000', email: 'cliente@example.test', codice_fiscale: 'RSSMRA90B03H501X', indirizzo: 'Via di Esempio 12', cap: '09045', comune: 'Quartu Sant’Elena', provincia: 'CA', contatto_emergenza: 'Contatto di esempio 3331111111', professione: 'Impiegato', servizi: 'PT', obiettivo: 'Mobilità', obiettivo_libero: 'Allenarsi con continuità', esperienza: 'Principiante', inattivo: 'Leggera', sport: 'Camminata', sessioni_pref: '2x', orari: 'Martedì mattina e giovedì pomeriggio', patologie: 'Indicazione di esempio\nDettaglio: da conservare integralmente', farmaci: '', infortuni: 'Nessuno dichiarato', limitazioni: 'Evitare i movimenti segnalati durante il colloquio', stress: 'Medio', sonno: '7-8 ore', note: 'Risposta libera del cliente.', tutore_nome: '', tutore_telefono: '' };
  const acq = { ...report, id: 'acq_demo', impressioni: 'Proposta: Nota commerciale esclusa\nFarmaci: Vecchia risposta\n[ANAMNESI_PT_REPORT]\n' + JSON.stringify(report) + '\n[/ANAMNESI_PT_REPORT]' };
  const client = { id: 'demo', nome: report.nome, cognome: report.cognome, email: report.email, indirizzo: 'Via di Esempio 12, 09045 Quartu Sant’Elena CA', notes: '[TRASFERIMENTO PT 2026-09-01] Operatore A → B\n[NEACEA-PACKAGE-LEDGER-V1]\n{"cycles":[{"amount":900}]}\n[/NEACEA-PACKAGE-LEDGER-V1]\n[PT-AUDIT] operazione interna' };
  return { client, acq, report };
}
function tests() {
  const { context: c, get } = harness();
  const { client, acq, report } = fixture();
  c.fillDocument(client, acq, { nome: 'Operatore', cognome: 'Esempio' }, null);
  c.fillAnamnesis(client, acq);
  assert.equal(get('client-address').textContent, client.indirizzo);
  assert.equal(get('client-tax').textContent, report.codice_fiscale);
  assert.equal(get('client-birth').textContent, '03/02/1990');
  assert.equal(get('client-emergency').textContent, report.contatto_emergenza);
  assert.ok(get('anamnesis-health').textContent.includes(report.patologie));
  assert.ok(!get('anamnesis-health').textContent.includes('Vecchia risposta'));
  assert.ok(!get('anamnesis-health').textContent.includes('amount'));
  assert.ok(!get('anamnesis-health').textContent.includes('TRASFERIMENTO'));
  assert.ok(!get('anamnesis-health').textContent.includes('Proposta'));
  assert.equal(c.noteValue('Patologie: prima riga\nDettaglio: seconda riga\nFarmaci: nessuno', ['Patologie']), 'prima riga\nDettaglio: seconda riga');
  c.fillAnamnesis(client, null);
  assert.equal(get('anamnesis-health').textContent, '');
  assert.equal(c.samePerson(client, acq), true);
  assert.equal(c.samePerson({ ...client, nascita: '1980-01-01' }, acq), false);
  assert.equal(c.samePerson({ nome: client.nome, cognome: client.cognome }, acq), false);
  assert.equal(c.samePerson({ ...client, nome: 'Altra persona' }, acq), false);
  assert.equal(c.cleanClientText('[NEACEA-PACKAGE-LEDGER-V1]\n{"incompleto":true}'), '');
  c.showDataReview();
  assert.ok(get('data-review').textContent.includes('non aggiornano la scheda cliente'));
  console.log('PASS consenso: dati completi, note tecniche escluse, risposte multilinea, anagrafica e corrispondenze sicure');
}
if (require.main === module) tests();
module.exports = { harness, fixture };
