const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'acquisizione', 'index.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)].at(-1)[1]
  .replace(/\bcarica\(\);\s*$/, '')
  .replace(/\bverifyAcquisitionAccess\(\)\.catch\(showAccessError\);\s*$/, '');
const context = vm.createContext({ URL, console, setTimeout, clearTimeout });
vm.runInContext(script, context);

function evaluate(source) {
  return vm.runInContext(source, context);
}

test('un lead PT riceve soltanto il link PT', () => {
  const links = evaluate(`linksAnamnesi({id:'acq_pt',servizi:'PT'})`);
  assert.equal(links.length, 1);
  assert.equal(links[0].label, 'Personal training');
  assert.equal(links[0].url, 'https://neacea-anamnesi-cliente.netlify.app/?id=acq_pt');
});

test('un lead Nutrizione riceve soltanto il link nutrizionale', () => {
  const links = evaluate(`linksAnamnesi({id:'acq_nutri',servizi:'Nutrizione'})`);
  assert.equal(links.length, 1);
  assert.equal(links[0].label, 'Nutrizione');
  assert.equal(links[0].url, 'https://anamnesi-nutrizione.netlify.app/?id=acq_nutri');
});

test('un lead misto riceve i due moduli separati', () => {
  const links = evaluate(`linksAnamnesi({id:'acq_both',servizi:'PT,Nutrizione'})`);
  assert.equal(links.length, 2);
  assert.deepEqual(Array.from(links, item => item.label), ['Personal training', 'Nutrizione']);
});

test('un lead Coaching riceve il modulo Coaching', () => {
  const links = evaluate(`linksAnamnesi({id:'acq_coach',servizi:'Coaching online'})`);
  assert.equal(links.length, 1);
  assert.equal(links[0].label, 'Coaching online');
  assert.equal(links[0].url, 'https://anamensi-coaching.netlify.app/?id=acq_coach');
});

test('le due anamnesi ricevute restano distinguibili', () => {
  const notes = [
    '[ANAMNESI_RICEVUTA] 2026-07-15T10:00:00.000Z | PT',
    '[ANAMNESI_RICEVUTA] 2026-07-15T11:00:00.000Z | Nutrizione',
  ].join('\n');
  context.notesForTest = notes;
  const receipts = evaluate('anamnesiReceipts(notesForTest)');
  assert.deepEqual(Array.from(receipts, item => item.service), ['PT', 'Nutrizione']);
});

test('l’anamnesi Coaching resta distinta da PT', () => {
  context.coachingNotesForTest = '[ANAMNESI_RICEVUTA] 2026-07-15T12:00:00.000Z | Coaching online';
  const receipts = evaluate('anamnesiReceipts(coachingNotesForTest)');
  assert.deepEqual(Array.from(receipts, item => item.service), ['Coaching online']);
});

test('legge i dati Coaching completi senza mostrarli nella nota commerciale', () => {
  context.fullCoachingNotes = [
    'Nota del commerciale',
    '[ANAMNESI_RICEVUTA] 2026-07-16T10:00:00.000Z | Coaching online',
    '[ANAMNESI_COACHING]',
    JSON.stringify({ obiettivo_primario: 'Forza', patologie: 'Nessuna', frequenza: '3 volte' }),
    '[/ANAMNESI_COACHING]',
  ].join('\n');
  const coaching = evaluate('coachingAnamnesi(fullCoachingNotes)');
  assert.equal(coaching.obiettivo_primario, 'Forza');
  assert.equal(coaching.frequenza, '3 volte');
  assert.equal(evaluate('visibleLeadNote(fullCoachingNotes)'), 'Nota del commerciale');
  assert.match(evaluate('legacyLeadTail(fullCoachingNotes)'), /\[ANAMNESI_COACHING\]/);
});

test('prima visita: ultima compilazione leggibile, nessun JSON o indirizzo duplicato', () => {
  const block = data => '[ANAMNESI_PT_REPORT]\n' + JSON.stringify(data) + '\n[/ANAMNESI_PT_REPORT]';
  const old = block({obiettivo:'Vecchio obiettivo',comune:'Comune precedente'});
  const latest = block({obiettivo:'Forza',sport:'Tennis',orari:'Mattina\nWeekend',patologie:'<script>alert(1)</script>',interesse_nutrizione:false,comune:'Comune aggiornato'});
  const notes = ['Richiamare venerdì', 'CAP: 09000', 'Comune: Comune precedente', old, 'Comune: Comune aggiornato', latest].join('\n\n');
  const rendered = context.renderPtVisit(notes);
  assert.match(rendered, /Forza/);
  assert.match(rendered, /Tennis/);
  assert.match(rendered, /Mattina\nWeekend/);
  assert.match(rendered, />No</);
  assert.match(rendered, /&lt;script&gt;/);
  assert.doesNotMatch(rendered, /Vecchio obiettivo|Comune precedente|ANAMNESI_PT_REPORT|<script>/);
  assert.equal(context.visibleLeadNote(notes), 'Richiamare venerdì');
  const saved = ['Nuova nota', context.legacyLeadTail(notes)].join('\n\n');
  assert.ok(saved.includes(old));
  assert.ok(saved.includes(latest));
  assert.equal(context.visibleLeadNote(saved), 'Nuova nota');
  assert.equal(context.renderPtVisit(saved), rendered);
  assert.equal(context.legacyLeadTail(saved), context.legacyLeadTail(notes));
});

test('report non leggibili o incompleti non espongono dati tecnici e restano salvati', () => {
  for (const block of ['[ANAMNESI_PT_REPORT]{rotto}[/ANAMNESI_PT_REPORT]', '[ANAMNESI_PT_REPORT]{incompleto', '[ANAMNESI_PT_REPORT][][/ANAMNESI_PT_REPORT]']) {
    const notes = 'Nota utile\n' + block;
    assert.equal(context.visibleLeadNote(notes), 'Nota utile');
    assert.ok(context.legacyLeadTail(notes).includes(block));
    assert.match(context.renderPtVisit(notes), /non è disponibile/);
    assert.doesNotMatch(context.renderPtVisit(notes), /ANAMNESI_PT_REPORT|rotto|incompleto/);
  }
  assert.equal(context.renderPtVisit('Solo nota'), '');
  assert.equal(context.visibleLeadNote('Prima riga\n\nSeconda riga'), 'Prima riga\n\nSeconda riga');
});
