const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const ledgerSource = fs.readFileSync(path.join(root, 'app/calendario-studio/js/package-ledger.js'), 'utf8');
const servicesSource = fs.readFileSync(path.join(root, 'app/calendario-studio/js/services.js'), 'utf8');

const ledgerContext = { console, Date, Intl, JSON, Math };
vm.createContext(ledgerContext);
vm.runInContext(`${ledgerSource}\nglobalThis.TestPackageLedger = PackageLedger;`, ledgerContext);
const Ledger = ledgerContext.TestPackageLedger;

const baseClient = {
  id: 'client-ledger-test',
  nome: 'Cliente',
  cognome: 'Test',
  packageCycleStart: '2026-07-01',
  packageStart: '2026-07-01',
  sessionsTotal: 8,
  sessionsRemaining: 2,
  statoPagamento: 'Da pagare',
  importo: 200,
  giorniSettimana: ['Martedì', 'Giovedì'],
  ptAssegnato: 'pt-1',
  notes: 'Nota clinica da preservare',
};
const oldMetrics = {
  total: 8,
  completed: 6,
  scheduled: 2,
  remaining: 2,
  cycleStart: '2026-07-01',
};

const initial = Ledger.ensure(baseClient, oldMetrics, { now: '2026-07-28T10:00:00.000Z' });
assert.equal(initial.cycles.length, 1);
assert.equal(initial.cycles[0].source, 'legacy');
assert.deepEqual(JSON.parse(JSON.stringify(Ledger.cycleFinancial(initial.cycles[0]))), {
  total: 200,
  paid: 0,
  balance: 200,
  status: 'Da pagare',
});

const renewed = Ledger.renew(baseClient, oldMetrics, {
  sessions: 8,
  startDate: '2026-07-29',
  amount: 320,
  paidNow: 120,
  paymentDate: '2026-07-28',
  dueDate: '2026-08-10',
  paymentMethod: 'Bonifico',
  paymentNote: 'Acconto',
  days: ['Martedì', 'Giovedì'],
  time: '17:00',
  operatorId: 'pt-1',
}, {
  now: '2026-07-28T11:00:00.000Z',
  idFactory: () => 'pkg_cycle_2',
});

assert.equal(renewed.ledger.cycles.length, 2, 'il rinnovo aggiunge un ciclo senza sostituire il precedente');
assert.equal(renewed.ledger.cycles[0].sessionsCompletedAtClose, 6);
assert.equal(renewed.ledger.cycles[0].closedAt, '2026-07-28T11:00:00.000Z');
assert.equal(renewed.cycle.id, 'pkg_cycle_2');
assert.deepEqual(JSON.parse(JSON.stringify(renewed.finance)), {
  total: 320,
  paid: 120,
  balance: 200,
  status: 'Parziale',
});
assert.match(renewed.client.notes, /Nota clinica da preservare/);
assert.match(renewed.client.notes, /\[NEACEA-PACKAGE-LEDGER-V1\]/);
assert.equal(renewed.client.statoPagamento, 'Parziale');
assert.equal(renewed.client.importo, 320);

const parsed = Ledger.parse(renewed.client);
assert.equal(parsed.cycles.length, 2);
assert.equal(Ledger.currentCycle(parsed).id, 'pkg_cycle_2');

const paid = Ledger.recordPayment(renewed.client, {
  total: 8,
  completed: 0,
  scheduled: 8,
  remaining: 8,
  cycleStart: '2026-07-29',
}, {
  amount: 200,
  date: '2026-08-05',
  method: 'Carta / POS',
  note: 'Saldo',
}, {
  now: '2026-08-05T09:00:00.000Z',
  idFactory: () => 'pay_cycle_2_balance',
});

assert.equal(paid.finance.status, 'Pagato');
assert.equal(paid.finance.paid, 320);
assert.equal(paid.finance.balance, 0);
assert.equal(paid.cycle.payments.length, 2);
assert.equal(Ledger.parse(paid.client).cycles[0].sessionsCompletedAtClose, 6, 'il pagamento non modifica lo storico sedute');

const reopened = Ledger.reconcilePaidTotal(paid.client, {}, {
  targetPaid: 100,
  date: '2026-08-06',
  method: 'Rettifica Direzione',
  reason: 'Correzione test: riapertura saldo',
}, {
  now: '2026-08-06T10:00:00.000Z',
  idFactory: () => 'adj_reopen_balance',
});
assert.equal(reopened.adjustment, -220);
assert.equal(reopened.finance.paid, 100);
assert.equal(reopened.finance.balance, 220);
assert.equal(reopened.finance.status, 'Parziale');

const reversed = Ledger.reversePayment(paid.client, {}, 'pay_cycle_2_balance', {
  date: '2026-08-07',
  method: 'Storno Direzione',
  reason: 'Incasso inserito per errore',
}, {
  now: '2026-08-07T10:00:00.000Z',
  idFactory: () => 'void_balance_payment',
});
assert.equal(reversed.finance.paid, 120);
assert.equal(reversed.finance.balance, 200);
assert.equal(reversed.cycle.payments.at(-1).kind, 'storno');
assert.equal(reversed.cycle.payments.at(-1).reversesPaymentId, 'pay_cycle_2_balance');
assert.throws(() => Ledger.reversePayment(reversed.client, {}, 'pay_cycle_2_balance', {
  date: '2026-08-08',
  reason: 'Secondo storno non consentito',
}), /già stato stornato/i);

assert.throws(() => Ledger.recordPayment(paid.client, {}, {
  amount: 1,
  date: '2026-08-06',
  method: 'Contanti',
}), /saldo residuo/i);

assert.throws(() => Ledger.updateCurrentAmount(paid.client, {}, 300), /inferiore a quanto già incassato/i);

assert.throws(() => Ledger.renew(renewed.client, {}, {
  sessions: 8,
  startDate: '2026-07-29',
  amount: 320,
  paidNow: 0,
}), /già un ciclo aperto/i);

const totals = Ledger.summary([paid.client]);
assert.equal(totals.cycles, 2);
assert.equal(totals.renewals, 1);
assert.equal(totals.expected, 520);
assert.equal(totals.collected, 320);
assert.equal(totals.outstanding, 200);

const malformed = {
  ...baseClient,
  notes: '[NEACEA-PACKAGE-LEDGER-V1]\n{non-json}\n[/NEACEA-PACKAGE-LEDGER-V1]',
};
assert.throws(() => Ledger.renew(malformed, oldMetrics, {
  sessions: 8,
  startDate: '2026-08-01',
  amount: 200,
  paidNow: 0,
}), /non leggibile/i);

// Integrazione ciclo-sedute: un nuovo ciclo con ID non ingloba vecchie
// lezioni solo perché hanno una data successiva.
const serviceClient = {
  ...paid.client,
  packageCycleStart: '2026-07-29',
  sessionsTotal: 8,
  sessionsRemaining: 8,
};
const appointments = [
  {
    id: 'old-with-same-date',
    serviceId: 'pt11',
    clientIds: [serviceClient.id],
    date: '2026-07-29',
    status: 'fatto',
    notes: '[CICLO-PACCHETTO 2026-07-01]',
  },
  {
    id: 'new-cycle',
    serviceId: 'pt11',
    clientIds: [serviceClient.id],
    date: '2026-07-29',
    status: 'prenotato',
    notes: '[CICLO-PACCHETTO 2026-07-29]\n[CICLO-PACCHETTO-ID pkg_cycle_2]',
  },
];
const State = {
  getClients: () => [serviceClient],
  getAppointments: () => appointments,
  getOperators: () => [],
};
const App = {
  isPortalPtMode: () => false,
  canViewAppointment: () => true,
};
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : ['2026-07-28T12:00:00Z']));
  }
}
const serviceContext = {
  State,
  App,
  PackageLedger: Ledger,
  CONFIG: {
    SERVICES: {
      pt11: { id: 'pt11', durationMin: 60, requiredRoles: [], room: 'pt' },
    },
    ROOMS: { pt: { id: 'pt', max: 10 } },
    STATUS: {},
    PACKAGE_SERVICE_MAP: { 'PT 1:1': ['pt11'] },
    workHours: { start: '08:00', end: '20:00' },
  },
  console,
  Date: FixedDate,
  Intl,
};
vm.createContext(serviceContext);
vm.runInContext(`${servicesSource}\nglobalThis.TestServices = Services;`, serviceContext);
const Services = serviceContext.TestServices;
assert.equal(Services.appointmentInCurrentPackageCycle(appointments[0], serviceClient), false);
assert.equal(Services.appointmentInCurrentPackageCycle(appointments[1], serviceClient), true);
assert.equal(Services.getClientSessionMetrics(serviceClient).scheduled, 1);
assert.equal(Services.getClientSessionMetrics(serviceClient).completed, 0);

process.stdout.write('PASS package renewal ledger end-to-end\n');
