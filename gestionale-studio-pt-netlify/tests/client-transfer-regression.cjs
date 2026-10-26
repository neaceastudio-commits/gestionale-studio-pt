const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'app/calendario-studio/js/app.js'), 'utf8');

function assert(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const clients = [{
  id: 'client-1',
  nome: 'Mario',
  cognome: 'Rossi',
  ptAssegnato: 'pt-old',
  notes: '',
  active: true,
}];
const operators = [
  { id: 'pt-old', nome: 'Paolo', cognome: 'Vecchio', roles: ['PT'], active: true },
  { id: 'pt-new', nome: 'Nina', cognome: 'Nuova', roles: ['PT'], active: true },
];
const appointments = [
  { id: 'future-single', serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-old', date: '2099-07-30', startTime: '10:00', status: 'prenotato' },
  { id: 'future-shared', serviceId: 'pt12', clientIds: ['client-1', 'client-2'], operatorId: 'pt-old', date: '2099-07-31', startTime: '11:00', status: 'prenotato' },
  { id: 'completed', serviceId: 'pt11', clientIds: ['client-1'], operatorId: 'pt-old', date: '2099-07-20', startTime: '10:00', status: 'fatto' },
];
const pushed = [];
let calendarRenders = 0;

const elements = {
  'transfer-new-operator': { value: 'pt-new' },
  'transfer-effective-date': { value: '2099-07-25' },
  'modal-overlay': { classList: { remove() {} } },
  'toast-area': { appendChild() {} },
  'view-clients': { classList: { contains() { return false; } } },
};
const State = {
  getClients: () => clients,
  getOperators: () => operators,
  getAppointments: () => appointments,
  saveClients(next) {
    clients.splice(0, clients.length, ...next);
  },
  saveAppointments(next) {
    appointments.splice(0, appointments.length, ...next);
  },
};
const Services = {
  getService(serviceId) {
    return { id: serviceId, requiredRoles: ['PT'] };
  },
  canBookAppointment() {
    return { ok: true, errors: [] };
  },
};
const document = {
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById(id) { return elements[id] || null; },
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
  Services,
  document,
  window: { location: { search: '' }, addEventListener() {} },
  location: { search: '' },
  URLSearchParams,
  CONFIG: { SHEETS: { enabled: false } },
  SupabaseSync: {
    async saveAppointmentAtomic(appt, before) {
      if (!before) throw Error('Transfer requires an optimistic-lock snapshot');
      pushed.push(`appointment:${appt.id}:${appt.operatorId}`);
      return { appointment: { ...appt, serverUpdatedAt: 'confirmed' } };
    },
    async saveClientAssignment(previous, client) {
      pushed.push(`client:${client.id}:${client.ptAssegnato}`);
      return client;
    },
  },
  Sheets: { pushClient() {}, pushAppointment() {} },
  Clients: { render() {} },
  Calendar: { render() { calendarRenders += 1; } },
  console,
  fetch,
  confirm: () => true,
  alert() {},
  setTimeout,
  clearTimeout,
};

vm.createContext(context);
vm.runInContext(`${appSource}\nglobalThis.TestApp = App;`, context);
const App = context.TestApp;

(async () => {
  App.portalPt = {
    enabled: true,
    authorized: true,
    operator: operators[0],
    opParam: 'pt-old',
    emailParam: '',
    accessParam: 'signed',
  };
  await App._transferClient('client-1');
  assert('Il PT non può trasferire un cliente', pushed.length === 0 && clients[0].ptAssegnato === 'pt-old');

  App.portalPt.enabled = false;
  await App._transferClient('client-1');

  assert('Il cliente passa al nuovo PT', clients[0].ptAssegnato === 'pt-new');
  assert('La seduta futura individuale passa al nuovo PT', appointments.find(item => item.id === 'future-single').operatorId === 'pt-new');
  assert('La seduta condivisa resta invariata', appointments.find(item => item.id === 'future-shared').operatorId === 'pt-old');
  assert('Lo storico resta invariato', appointments.find(item => item.id === 'completed').operatorId === 'pt-old');
  assert('Il trasferimento viene registrato nelle note', clients[0].notes.includes('[TRASFERIMENTO PT'));
  assert('Il cloud riceve prima la seduta e poi il cliente', pushed[0] === 'appointment:future-single:pt-new' && pushed[1] === 'client:client-1:pt-new');
  assert('Il calendario viene aggiornato', calendarRenders === 1);

  clients[0] = { ...clients[0], ptAssegnato: 'pt-old' };
  appointments.find(a => a.id === 'future-single').operatorId = 'pt-old';
  pushed.length = 0;
  context.SupabaseSync.saveClientAssignment = async () => ({ error: 'Rifiuto sintetico', status: 409 });
  await App._transferClient('client-1');
  assert('Un rifiuto non aggiorna il cliente locale', clients[0].ptAssegnato === 'pt-old');
  assert('Il rollback riguarda solo la seduta confermata', pushed.join('|') === 'appointment:future-single:pt-new|appointment:future-single:pt-old');
  assert('Un rifiuto non viene presentato come trasferimento completato', calendarRenders === 1);

  let release;
  pushed.length = 0;
  context.SupabaseSync.saveAppointmentAtomic = async (appt, before) => {
    if (!before) throw Error('Expected snapshot missing');
    pushed.push(`appointment:${appt.id}:${appt.operatorId}`);
    await new Promise(resolve => { release = resolve; });
    return { appointment: appt };
  };
  context.SupabaseSync.saveClientAssignment = async (previous, candidate) => candidate;
  const first = App._transferClient('client-1');
  await App._transferClient('client-1');
  assert('Il doppio clic non duplica il trasferimento', pushed.length === 1);
  release(); await first;
  assert('Il trasferimento si sblocca dopo la conferma', !App._clientTransferBusy && clients[0].ptAssegnato === 'pt-new');
})().catch(error => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
