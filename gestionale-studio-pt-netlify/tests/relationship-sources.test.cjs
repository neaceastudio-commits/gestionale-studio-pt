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
    'function storageKeyFor('
  );

  [fase1, personal].forEach((body) => {
    assert.match(body, /responsibleTrainerId/);
    assert.doesNotMatch(body, /trainer_id|operator_id|email|nome/i);
  });
});

test('la modalita PT basata su op resta esplicitamente in sola lettura', () => {
  const contents = source('calendario-studio/js/app.js');
  assert.match(contents, /const PORTAL_PT_MUTATIONS_ENABLED = false/);
  const clientGuard = functionBody(contents, 'canEditClient(', 'canEditAppointment(');
  const appointmentGuard = functionBody(contents, 'canEditAppointment(', 'guardPortalEdit(');
  assert.match(clientGuard, /if \(!App\.portalPtMutationsEnabled\(\)\) return false/);
  assert.match(appointmentGuard, /if \(!App\.portalPtMutationsEnabled\(\)\) return false/);
  const newAppointment = functionBody(contents, 'openNewAppointment(', 'openDetail(');
  assert.match(newAppointment, /!App\.portalPtMutationsEnabled\(\)/);
  assert.match(contents, /button\.disabled = true/);
  assert.match(contents, /classList\.add\('portal-pt-readonly'\)/);
  assert.match(contents, /\[data-view="availability"\], \[data-view="operators"\]/);
  assert.match(contents, /portalBlockedView/);
  const dataManager = functionBody(contents, 'openDataManager(', '_importData(');
  assert.match(dataManager, /if \(App\.isPortalPtMode\(\)\)/);
  const localSync = functionBody(contents, 'async syncLocalToSupabase(', '// ── INIT');
  assert.match(localSync, /!App\.portalPtMutationsEnabled\(\)/);
  const clients = source('calendario-studio/js/clients.js');
  assert.match(clients, /canEdit \? `<button[^`]+Clients\.alignResidual/);
});

test('la modifica di una seduta non forza operator_id dal parametro URL', () => {
  const contents = source('calendario-studio/js/app.js');
  const saveAppointment = functionBody(contents, 'async _saveAppointment(', '_renderDetailModal(');
  const savePackageRow = functionBody(contents, 'async _updatePackageAppointmentRow(', 'async _deletePackageAppointment(');
  assert.doesNotMatch(saveAppointment, /opId\s*=\s*App\.portalOperatorId/);
  assert.doesNotMatch(savePackageRow, /nextOperatorId\s*=\s*App\.portalOperatorId/);
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

test('il fallback pre-migrazione riconosce soltanto la colonna esecutore mancante', () => {
  const activeSources = [
    source('calendario-studio/js/supabase.js'),
    source('portale-pt/index.html'),
    source('cruscotto-pt/index.html'),
  ].join('\n');

  assert.match(activeSources, /PGRST204/);
  assert.match(activeSources, /42703/);
  assert.doesNotMatch(activeSources, /includes\(['"]performed_['"]\)/);
});

test('il codice morto del correttivo sessioni non viene piu caricato', () => {
  const calendarHtml = source('calendario-studio/index.html');
  const personalPortal = source('portale-personal-trainer/index.html');
  assert.doesNotMatch(calendarHtml, /session-fixes\.js/);
  assert.doesNotMatch(personalPortal, /function sessionTrainerId\(/);
  assert.doesNotMatch(personalPortal, /pt_calendar_sessions/);
});
