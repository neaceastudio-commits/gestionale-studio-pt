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
const servicesSource = read('app/calendario-studio/js/services.js');
const clientsSource = read('app/calendario-studio/js/clients.js');
const accessFunctionSource = read('netlify/functions/pt-access-email.js');

[
  ['Apple Calendar CSS', indexSource.includes('css/apple-calendar.css')],
  ['Apple Calendar pulsante', indexSource.includes('App.openAppleCalendar()')],
  ['Apple Calendar script', indexSource.includes('js/apple-calendar.js')],
  ['Rinnovo pacchetto', appSource.includes('_renewPackageAppointments(clientId)')],
  ['Separazione cicli', appSource.includes('_confirmCurrentPackageCycle(clientId)')],
  ['Doppio PT controllato', appSource.includes('_buildForcedAudit(validation, apptData)')],
  ['Storico clienti', clientsSource.includes('renderHistorySummary(clients)')],
  ['Flusso non rinnovo', clientsSource.includes('markNotRenewing(clientId)')],
  ['Riattivazione cliente', clientsSource.includes('reactivate(clientId)')],
  ['Filtro PT firmato', appSource.includes("action: 'verify_token'")],
  ['Token PT firmato', accessFunctionSource.includes('function signAccessToken')],
].forEach(([label, condition]) => assert(label, condition));

assert('App completa non troncata', Buffer.byteLength(appSource) > 100000);
assert('Servizi completi non troncati', Buffer.byteLength(servicesSource) > 20000);
assert('Clienti completi non troncati', Buffer.byteLength(clientsSource) > 22000);

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
const accessFunctionPath = path.join(root, 'netlify/functions/pt-access-email.js');
delete require.cache[require.resolve(accessFunctionPath)];
const accessFunction = require(accessFunctionPath);
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

  assert('Cartella Calendario completa', fs.readdirSync(path.join(calendarRoot, 'js')).includes('apple-calendar.js'));
})().catch(error => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
