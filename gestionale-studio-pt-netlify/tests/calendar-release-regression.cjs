const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const calendarRoot = path.join(root, 'app/calendario-studio');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const indexSource = read('app/calendario-studio/index.html');
const appSource = read('app/calendario-studio/js/app.js');
const supabaseSource = read('app/calendario-studio/js/supabase.js');
const servicesSource = read('app/calendario-studio/js/services.js');
const packageLedgerSource = read('app/calendario-studio/js/package-ledger.js');
const clientsSource = read('app/calendario-studio/js/clients.js');
const portalSource = read('app/portale-personal-trainer/index.html');
const acquisitionSource = read('app/acquisizione/index.html');
const accessFunctionSource = read('netlify/functions/pt-access-email.js');
const appleFunctionSource = read('netlify/functions/apple-calendar.js');
const recordPaymentSource = appSource.slice(
  appSource.indexOf('async _recordPackagePayment(clientId)'),
  appSource.indexOf('async _updatePackageCycleAmount(clientId)')
);

[
  ['Apple Calendar CSS', indexSource.includes('css/apple-calendar.css')],
  ['Apple Calendar pulsante', indexSource.includes('App.openAppleCalendar()')],
  ['Apple Calendar script', indexSource.includes('js/apple-calendar.js')],
  ['Registro rinnovi caricato', indexSource.includes('js/package-ledger.js')],
  ['Rinnovo pacchetto', appSource.includes('_renewPackageAppointments(clientId)')],
  ['Rinnovo con registro economico', appSource.includes('PackageLedger.renew(currentClient, metrics')],
  ['Incassi separati dal rinnovo', appSource.includes('_recordPackagePayment(clientId)')],
  ['Incasso precaricato nel valore reale del campo', appSource.includes('id="pkg-payment-amount"') && appSource.includes('value="${currentFinance.balance.toFixed(2)}"') && !appSource.includes('placeholder="${currentFinance.balance.toFixed(2)}"')],
  ['Incasso normalizzato prima del registro', recordPaymentSource.includes('PackageLedger.parseMoneyInput(rawAmount)') && recordPaymentSource.includes('amount: normalizedAmount')],
  ['Pulsante incasso sbloccato dopo errore', recordPaymentSource.includes('submitButton.disabled = true') && recordPaymentSource.includes('submitButton.disabled = false')],
  ['Pagamenti separati dalla vista lezioni', appSource.includes("_setPackageWorkspace(mode = 'lessons')") && appSource.includes('package-finance-only" hidden')],
  ['Rettifica saldo tracciata', appSource.includes('_reconcilePackagePayment(clientId)') && packageLedgerSource.includes('function reconcilePaidTotal')],
  ['Storno incasso tracciato', appSource.includes('_reversePackagePayment(clientId, paymentId)') && packageLedgerSource.includes('function reversePayment')],
  ['Incassi pacchetto non bloccati da Sheets', appSource.includes('_syncPackageClientAfterPrimarySave(updated, \'incasso pacchetto\')') && !appSource.includes('await Sheets.pushClient(updated);')],
  ['Incasso salvato con PATCH mirato senza upsert', recordPaymentSource.includes('SupabaseSync.updateClientPackageFinance(updated)') && !recordPaymentSource.includes('SupabaseSync.pushClient(updated)')],
  ['Rollback rinnovo parziale', appSource.includes('_rollbackPackageRenewalRemote')],
  ['Export pagamenti CSV', clientsSource.includes('exportPackagePayments(clientId')],
  ['Separazione cicli', appSource.includes('_confirmCurrentPackageCycle(clientId)')],
  ['Doppio PT controllato', appSource.includes('_buildForcedAudit(validation, apptData)')],
  ['Storico clienti', clientsSource.includes('renderHistorySummary(clients)')],
  ['Flusso non rinnovo', clientsSource.includes('markNotRenewing(clientId)')],
  ['Riattivazione cliente', clientsSource.includes('reactivate(clientId)')],
  ['Filtro PT firmato', appSource.includes("action: 'verify_token'")],
  ['Portale accetta la sessione Dashboard', portalSource.includes('const accessToken = params.get("access")') && portalSource.includes('activatePtSession(pt, accessToken)')],
  ['Directory PT per la Dashboard', accessFunctionSource.includes("action === 'resolve'") && accessFunctionSource.includes('findPersonalTrainer')],
  ['PT cliente separato dal PT delle sedute', appSource.includes('Modifica il PT degli appuntamenti, non il PT assegnato al cliente.')],
  ['Assegnazione PT conservata negli aggiornamenti cliente', supabaseSource.includes('? { pt_assegnato: c.ptAssegnato || c.pt_assegnato || null }')],
  ['Portale usa solo assegnazione esplicita', !portalSource.includes('inferredTrainerId(client.id)')],
  ['Acquisizione assegna solo clienti ancora senza PT', acquisitionSource.includes('if(!currentPt&&p.ptId)patch.pt_assegnato=p.ptId;')],
  ['Trasferimento cliente riservato alla Direzione', appSource.includes('openTransferClient(clientId)') && appSource.includes('if (!App.guardStudioManagement()) return;')],
  ['Trasferimento aggiorna proprietà e sedute future', appSource.includes('ptAssegnato: newOperator.id') && appSource.includes('SupabaseSync.pushAppointment(change.after)')],
  ['Sedute condivise protette dal trasferimento', appSource.includes('appointments.filter(appt => appt.clientIds.length > 1)')],
  ['Comando trasferimento nascosto ai PT', clientsSource.includes("ptMode ? '' : `<button class=\"btn-icon-sm\" title=\"Trasferisci cliente a un altro PT\"")],
  ['Token PT firmato', accessFunctionSource.includes('function signAccessToken')],
  ['Funzione Apple Calendar', appleFunctionSource.includes('exports.handler') && appleFunctionSource.includes('BEGIN:VCALENDAR')],
].forEach(([label, condition]) => assert(label, condition));

assert('App completa non troncata', Buffer.byteLength(appSource) > 100000);
assert('Servizi completi non troncati', Buffer.byteLength(servicesSource) > 20000);
assert('Clienti completi non troncati', Buffer.byteLength(clientsSource) > 22000);
assert('Registro pacchetti completo', Buffer.byteLength(packageLedgerSource) > 9000);

const clients = [
  { id: 'client-own', ptAssegnato: 'pt-own', active: true },
  { id: 'client-other', ptAssegnato: 'pt-other', active: true },
];
const appointments = [
  { id: 'own-op', date: '2099-07-23', operatorId: 'pt-own', clientIds: ['client-other'], status: 'prenotato' },
  { id: 'own-client', date: '2099-07-23', operatorId: 'pt-other', clientIds: ['client-own'], status: 'prenotato' },
  { id: 'unrelated', date: '2099-07-23', operatorId: 'pt-other', clientIds: ['client-other'], status: 'prenotato' },
];
const operators = [
  { id: 'pt-own', nome: 'Paolo', cognome: 'Proprio', email: 'paolo@qa.test' },
  { id: 'pt-other', nome: 'Altro', cognome: 'Trainer', email: 'altro@qa.test' },
];

const State = {
  getClients: () => clients,
  getAppointments: () => appointments,
  getOperators: () => operators,
  saveClients() {},
};
const toastArea = { appendChild() {} };
const document = {
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById(id) { return id === 'toast-area' ? toastArea : null; },
  createElement() {
    return {
      className: '',
      textContent: '',
      classList: { add() {}, remove() {} },
      remove() {},
    };
  },
  body: { style: {} },
};
const context = {
  State,
  document,
  window: { location: { search: '' }, addEventListener() {} },
  location: { search: '' },
  URLSearchParams,
  CONFIG: { SHEETS: { enabled: false } },
  SupabaseSync: { pushClient() {} },
  Sheets: { pushClient() {} },
  console,
  fetch,
  setTimeout,
  clearTimeout,
};
vm.createContext(context);
vm.runInContext(`${appSource}\nglobalThis.TestApp = App;`, context);
const App = context.TestApp;
App.portalPt = {
  enabled: true,
  authorized: true,
  operator: operators[0],
  opParam: 'pt-own',
  emailParam: 'paolo@qa.test',
  accessParam: 'signed-token',
};

assert('PT modifica il proprio cliente', App.canEditClient('client-own'));
assert('PT non modifica clienti altrui', !App.canEditClient('client-other'));
assert('PT vede appuntamento assegnato come operatore', App.canViewAppointment(appointments[0]));
assert('PT vede appuntamento del proprio cliente', App.canViewAppointment(appointments[1]));
assert('PT non vede appuntamenti estranei', !App.canViewAppointment(appointments[2]));
assert('Elenco PT contiene solo clienti assegnati', App.visibleClients().length === 1 && App.visibleClients()[0].id === 'client-own');
App._updateClientPackagePlan('client-own', {
  days: ['Lunedì'],
  packageStart: '2099-07-01',
  ptAssegnato: 'pt-other',
});
assert('Ripianificazione pacchetto non cambia il PT del cliente', clients[0].ptAssegnato === 'pt-own');

const serviceContext = {
  State,
  App,
  CONFIG: {
    SERVICES: {},
    ROOMS: {},
    STATUS: {},
    workHours: { start: '08:00', end: '20:00' },
  },
  console,
};
vm.createContext(serviceContext);
vm.runInContext(`${servicesSource}\nglobalThis.TestServices = Services;`, serviceContext);
const visibleAppointments = serviceContext.TestServices.getAppointmentsForDate('2099-07-23');
assert('Vista calendario PT filtra gli appuntamenti estranei', visibleAppointments.length === 2 && !visibleAppointments.some(item => item.id === 'unrelated'));

process.env.PT_ACCESS_SECRET = 'calendar-release-regression-secret';
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  const value = String(url);
  if (value.includes('/rest/v1/operator_effective_roles') || value.includes('/rest/v1/operators')) {
    return new Response(JSON.stringify([{
      id: 'pt-own',
      operator_id: 'pt-own',
      email: 'paolo@qa.test',
      nome: 'Paolo',
      cognome: 'Proprio',
      roles: ['PT'],
      active: true,
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, options);
};
const accessFunctionPath = path.join(root, 'netlify/functions/pt-access-email.js');
delete require.cache[require.resolve(accessFunctionPath)];
const accessFunction = require(accessFunctionPath);
const appleFunctionPath = path.join(root, 'netlify/functions/apple-calendar.js');
delete require.cache[require.resolve(appleFunctionPath)];
const appleFunction = require(appleFunctionPath);
const digest = crypto.createHmac('sha256', process.env.PT_ACCESS_SECRET).update('paolo@qa.test|pt-own').digest('hex');
const code = String(parseInt(digest.slice(0, 12), 16) % 1000000).padStart(6, '0');

(async () => {
  const verify = await accessFunction.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ action: 'verify', email: 'paolo@qa.test', operatorId: 'pt-own', code }),
  });
  const verified = JSON.parse(verify.body);
  assert('Login PT restituisce una sessione firmata', verify.statusCode === 200 && verified.token);

  const tokenCheck = await accessFunction.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ action: 'verify_token', token: verified.token }),
  });
  const tokenBody = JSON.parse(tokenCheck.body);
  assert('Sessione firmata valida', tokenCheck.statusCode === 200 && tokenBody.operatorId === 'pt-own');

  const tampered = await accessFunction.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ action: 'verify_token', token: `${verified.token}x` }),
  });
  assert('Sessione alterata rifiutata', tampered.statusCode === 401);

  const calendar = appleFunction._test.buildCalendar([], [], []);
  assert('Feed Apple Calendar valido', calendar.body.includes('BEGIN:VCALENDAR') && calendar.body.includes('END:VCALENDAR'));

  assert('Cartella Calendario completa', fs.readdirSync(path.join(calendarRoot, 'js')).includes('apple-calendar.js'));
  global.fetch = realFetch;
})().catch(error => {
  global.fetch = realFetch;
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
