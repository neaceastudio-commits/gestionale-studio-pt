const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const ledgerSource = fs.readFileSync(path.join(root, 'app/calendario-studio/js/package-ledger.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app/calendario-studio/js/app.js'), 'utf8');

const ledgerContext = { console, Date, Intl, JSON, Math };
vm.createContext(ledgerContext);
vm.runInContext(`${ledgerSource}\nglobalThis.TestPackageLedger = PackageLedger;`, ledgerContext);
const PackageLedger = ledgerContext.TestPackageLedger;

[
  ['262.00', 262],
  ['262,00', 262],
  ['0.01', 0.01],
  ['0,01', 0.01],
].forEach(([input, expected]) => {
  assert.equal(PackageLedger.parseMoneyInput(input), expected, `normalizzazione ${input}`);
});
assert.ok(Number.isNaN(PackageLedger.parseMoneyInput('')));
assert.ok(Number.isNaN(PackageLedger.parseMoneyInput('262,0,0')));

class FakeElement {
  constructor(id, options = {}) {
    this.id = id;
    this.value = options.value || '';
    this.type = options.type || '';
    this.inputMode = options.inputMode || '';
    this.disabled = Boolean(options.disabled);
    this.textContent = options.textContent || '';
    this.hidden = false;
    this.style = {};
    this.attributes = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  remove() {}
}

const elements = new Map();
const dynamicIds = [
  'pkg-payment-amount',
  'pkg-payment-date',
  'pkg-payment-method',
  'pkg-payment-note',
  'pkg-payment-submit',
  'pkg-workspace-lessons',
  'pkg-workspace-finance',
  'pkg-footer-lessons',
  'pkg-footer-finance',
];

function attribute(openingTag, name) {
  return openingTag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '';
}

function parseModal(html) {
  dynamicIds.forEach(id => elements.delete(id));
  dynamicIds.forEach(id => {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const openingTag = html.match(new RegExp(`<[^>]+\\bid="${escapedId}"[^>]*>`))?.[0];
    if (!openingTag) return;
    const buttonText = html.match(new RegExp(`<button[^>]+\\bid="${escapedId}"[^>]*>([^<]*)</button>`))?.[1] || '';
    const value = id === 'pkg-payment-method' ? 'Contanti' : attribute(openingTag, 'value');
    elements.set(id, new FakeElement(id, {
      value,
      type: attribute(openingTag, 'type'),
      inputMode: attribute(openingTag, 'inputmode'),
      disabled: /\sdisabled(?:\s|>)/.test(openingTag),
      textContent: buttonText,
    }));
  });
}

const modalContent = new FakeElement('modal-content');
Object.defineProperty(modalContent, 'innerHTML', {
  get() { return this._innerHTML || ''; },
  set(value) {
    this._innerHTML = String(value);
    parseModal(this._innerHTML);
  },
});
elements.set('modal-content', modalContent);
elements.set('modal-overlay', new FakeElement('modal-overlay'));
elements.set('toast-area', { appendChild() {} });

const document = {
  body: { style: {} },
  addEventListener() {},
  getElementById(id) { return elements.get(id) || null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return new FakeElement('generated'); },
};

const originalClient = {
  id: 'emanuela-laconi-test',
  nome: 'Emanuela',
  cognome: 'Laconi',
  active: true,
  packageTypes: ['PT 1:1'],
  packageCycleStart: '2026-08-01',
  packageStart: '2026-08-01',
  sessionsTotal: 8,
  sessionsRemaining: 8,
  statoPagamento: 'Da pagare',
  importo: 262,
  giorniSettimana: ['Lunedì'],
  ptAssegnato: 'pt-1',
  notes: '',
};
const metrics = {
  total: 8,
  completed: 0,
  scheduled: 0,
  remaining: 8,
  toSchedule: 8,
  cycleStart: '2026-08-01',
};
let localClients = [structuredClone(originalClient)];
let persistedClient = null;
let syncCalls = 0;
const toasts = [];

const State = {
  getClients: () => localClients,
  getAppointments: () => [],
  getOperators: () => [],
  saveClients(next) { localClients = structuredClone(next); },
};
const Services = {
  getClientSessionMetrics: () => metrics,
  getService: id => ({ id, label: 'PT 1:1' }),
  serviceUsesPackageSessions: () => true,
  appointmentInCurrentPackageCycle: () => true,
};
const SupabaseSync = {
  async updateClientPackageFinance(client) {
    syncCalls += 1;
    persistedClient = structuredClone(client);
    return { id: client.id };
  },
};
const appConsole = { ...console, warn() {} };

const appContext = {
  State,
  Services,
  SupabaseSync,
  PackageLedger,
  Clients: { render() {}, markNotRenewing() {}, reactivate() {}, exportPackagePayments() {} },
  Calendar: { render() {} },
  Sheets: { pushClient() {} },
  CONFIG: { SHEETS: { enabled: false }, STATUS: {}, SERVICES: {}, ROOMS: {} },
  document,
  window: { location: { search: '' }, addEventListener() {} },
  location: { search: '' },
  URLSearchParams,
  console: appConsole,
  fetch,
  setTimeout,
  clearTimeout,
  alert() {},
  confirm: () => true,
  structuredClone,
  Date,
  Intl,
  JSON,
  Math,
};
vm.createContext(appContext);
vm.runInContext(`${appSource}\nglobalThis.TestApp = App; globalThis.TestUI = UI;`, appContext);
const App = appContext.TestApp;
const UI = appContext.TestUI;
UI.showToast = (message, type) => toasts.push({ message, type });
App.guardPackageManagement = () => true;
App.guardStudioManagement = () => true;
App.isPortalPtMode = () => false;
App._packageAppointments = () => [];
App._suggestPackageDates = () => [];

const originalRecordPayment = PackageLedger.recordPayment;
let amountReceivedByRecordPayment;
PackageLedger.recordPayment = (...args) => {
  amountReceivedByRecordPayment = args[2]?.amount;
  return originalRecordPayment(...args);
};

(async () => {
  App.openPackageOverview(originalClient.id);
  App._setPackageWorkspace('finance');

  const amountInput = document.getElementById('pkg-payment-amount');
  const submitButton = document.getElementById('pkg-payment-submit');
  assert.ok(amountInput, 'il quadro pacchetto crea il campo incasso');
  assert.equal(amountInput.value, '262.00', 'il saldo precaricato è nella proprietà value');
  assert.equal(amountInput.type, 'text');
  assert.equal(amountInput.inputMode, 'decimal');
  assert.ok(submitButton, 'il quadro pacchetto crea il pulsante incasso');

  submitButton.click = () => App._recordPackagePayment(originalClient.id);
  await submitButton.click();

  assert.equal(amountReceivedByRecordPayment, 262, 'recordPayment riceve il numero normalizzato');
  assert.equal(typeof amountReceivedByRecordPayment, 'number');
  assert.equal(syncCalls, 1, 'il movimento viene scritto una sola volta');
  assert.ok(persistedClient, 'la versione persistita è disponibile');

  const savedLedger = PackageLedger.parse(localClients[0]);
  const savedCycle = PackageLedger.currentCycle(savedLedger);
  const savedFinance = PackageLedger.cycleFinancial(savedCycle);
  assert.equal(savedCycle.payments.length, 1, 'il movimento compare nel ciclo');
  assert.equal(savedCycle.payments[0].amount, 262);
  assert.equal(savedFinance.paid, 262);
  assert.equal(savedFinance.balance, 0, 'il saldo viene aggiornato');
  assert.match(modalContent.innerHTML, /Movimenti del ciclo/);
  assert.match(modalContent.innerHTML, /package-movement-kind incasso/);
  assert.equal(document.getElementById('pkg-payment-submit').disabled, true, 'il nuovo pulsante resta disabilitato a saldo chiuso');

  localClients = [structuredClone(persistedClient)];
  App.openPackageOverview(originalClient.id);
  App._setPackageWorkspace('finance');
  const reloadedLedger = PackageLedger.parse(localClients[0]);
  const reloadedFinance = PackageLedger.cycleFinancial(PackageLedger.currentCycle(reloadedLedger));
  assert.equal(reloadedFinance.balance, 0, 'il saldo persiste dopo ricarica');
  assert.equal(PackageLedger.currentCycle(reloadedLedger).payments.length, 1, 'il movimento persiste dopo ricarica');
  assert.match(modalContent.innerHTML, /package-movement-kind incasso/);

  localClients = [structuredClone(originalClient)];
  persistedClient = null;
  App.openPackageOverview(originalClient.id);
  App._setPackageWorkspace('finance');
  const emptyAmount = document.getElementById('pkg-payment-amount');
  const retryButton = document.getElementById('pkg-payment-submit');
  emptyAmount.value = '';
  retryButton.click = () => App._recordPackagePayment(originalClient.id);
  const callsBeforeInvalidClick = syncCalls;
  await retryButton.click();

  assert.equal(syncCalls, callsBeforeInvalidClick, 'un importo non valido non avvia la persistenza');
  assert.equal(retryButton.disabled, false, 'il pulsante viene sbloccato dopo l’errore');
  assert.equal(retryButton.textContent, 'Registra incasso', 'l’etichetta del pulsante viene ripristinata');
  assert.ok(toasts.some(toast => toast.type === 'error' && /Inserisci l.importo incassato/.test(toast.message)), 'l’errore è mostrato nell’interfaccia');

  console.log('package-payment-prefill ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
