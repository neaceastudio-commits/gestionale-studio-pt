const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.join(__dirname, '..', 'app');

function source(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function functionBody(contents, name, nextMarker) {
  const start = contents.indexOf(name);
  assert.notEqual(start, -1, `Funzione non trovata: ${name}`);
  const end = nextMarker ? contents.indexOf(nextMarker, start + name.length) : -1;
  return contents.slice(start, end === -1 ? contents.length : end);
}

test('la modalita PT dell Agenda risolve l operatore soltanto da ID', () => {
  const contents = source('calendario-studio/js/app.js');
  const body = functionBody(contents, '_resolvePortalOperator(', '_initPortalPtMode(');
  assert.match(body, /strictOperatorId\(opParam, operators\)/);
  assert.doesNotMatch(body, /email|fullName|_operatorLabel|_operatorKeys/i);
});

test('i portali attivi leggono il responsabile soltanto dal dominio canonico', () => {
  const fase1 = functionBody(
    source('portale-pt-fase1/js/portal.js'),
    'function clientTrainerId(',
    'function sessionTrainerId('
  );
  const personal = functionBody(
    source('portale-personal-trainer/index.html'),
    'function clientTrainerId(',
    'function sessionTrainerId('
  );

  [fase1, personal].forEach((body) => {
    assert.match(body, /responsibleTrainerId/);
    assert.doesNotMatch(body, /trainer_id|operator_id|email|nome/i);
  });
});

test('la rigenerazione conserva il PT delle sedute future ma non usa l ultimo appuntamento', () => {
  const contents = source('calendario-studio/js/app.js');
  const body = functionBody(contents, 'async _regenerateFuturePackageAppointments(', 'async _editPackageAppointment(');
  assert.match(body, /futureToReplace\[0\]\?\.operatorId/);
  assert.match(body, /currentClient\.ptAssegnato/);
  assert.doesNotMatch(body, /reverse\(\).*operatorId/);
});

test('non esiste inferenza del responsabile dagli appuntamenti nei portali attivi', () => {
  const activeSources = [
    source('portale-pt-fase1/js/portal.js'),
    source('portale-personal-trainer/index.html'),
    source('portale-pt/index.html'),
    source('cruscotto-pt/index.html'),
  ].join('\n');

  assert.doesNotMatch(activeSources, /inferTrainerByClient|inferredTrainerByClient|inferredTrainerId/);
});
