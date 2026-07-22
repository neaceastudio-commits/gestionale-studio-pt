const test = require('node:test');
const assert = require('node:assert/strict');
require('../app/shared/pt-domain.js');
const domain = global.NeaceaPtDomain;

const operators = [
  { id: 'pt-responsabile', nome: 'PT', cognome: 'Responsabile', email: 'responsabile@example.test' },
  { id: 'pt-sostituto', nome: 'PT', cognome: 'Sostituto', email: 'sostituto@example.test' },
];

test('l assegnazione stabile legge solo clients.pt_assegnato e solo per ID', () => {
  const client = { id: 'client-1', pt_assegnato: 'pt-responsabile' };
  assert.equal(domain.responsibleTrainerId(client, operators), 'pt-responsabile');
  assert.equal(domain.responsibleTrainerId({ pt_assegnato: 'responsabile@example.test' }, operators), '');
  assert.equal(domain.responsibleTrainerId({ pt_assegnato: 'PT Responsabile' }, operators), '');
  assert.equal(domain.responsibleTrainerId({ trainer_id: 'pt-responsabile' }, operators), '');
  assert.equal(domain.responsibleTrainerId({ operator_id: 'pt-responsabile' }, operators), '');
});

test('un sostituto nella singola seduta non cambia il responsabile del cliente', () => {
  const client = { id: 'client-1', pt_assegnato: 'pt-responsabile' };
  const appointment = domain.normalizePerformanceTransition(null, {
    id: 'appointment-1',
    operatorId: 'pt-sostituto',
    performedByOperatorId: 'pt-sostituto',
    status: 'fatto',
  }, operators);

  assert.equal(domain.responsibleTrainerId(client, operators), 'pt-responsabile');
  assert.equal(domain.scheduledTrainerId(appointment, operators), 'pt-sostituto');
  assert.equal(domain.performedTrainerId(appointment, operators), 'pt-sostituto');
  assert.equal(client.pt_assegnato, 'pt-responsabile');
});

test('le statistiche usano il PT esecutore esplicito, non quello pianificato', () => {
  const appointment = {
    operator_id: 'pt-responsabile',
    performed_by_operator_id: 'pt-sostituto',
    status: 'fatto',
  };
  assert.equal(domain.scheduledTrainerId(appointment, operators), 'pt-responsabile');
  assert.equal(domain.performedTrainerId(appointment, operators), 'pt-sostituto');
});

test('lo storico senza prova non viene attribuito al PT pianificato', () => {
  const appointment = { operator_id: 'pt-responsabile', status: 'fatto' };
  assert.equal(domain.performedTrainerId(appointment, operators), '');
  const normalized = domain.normalizePerformanceTransition(appointment, appointment, operators);
  assert.equal(normalized.performedByOperatorId, '');
  assert.equal(normalized.performed_by_operator_id, '');
});

test('solo un esecutore esplicito o l operatore agente puo completare la prestazione', () => {
  const scheduledOnly = {
    operatorId: 'pt-responsabile',
    status: 'fatto',
  };
  const withoutActor = domain.normalizePerformanceTransition(null, scheduledOnly, operators);
  assert.equal(withoutActor.performedByOperatorId, '');

  const withActor = domain.normalizePerformanceTransition(null, scheduledOnly, operators, 'pt-sostituto');
  assert.equal(withActor.performedByOperatorId, 'pt-sostituto');
  assert.equal(withActor.performed_by_operator_id, 'pt-sostituto');
  assert.equal(withActor.operatorId, 'pt-responsabile');
});

test('il conteggio sessioni e idempotente e limitato al pacchetto attivo', () => {
  const appointments = [
    { id: 'old', client_ids: ['client-1'], service_id: 'pt11', date: '2026-01-10', status: 'fatto' },
    { id: 'done', client_ids: ['client-1'], service_id: 'pt11', date: '2026-07-02', status: 'fatto' },
    { id: 'booked', client_ids: ['client-1'], service_id: 'pt11', date: '2026-07-30', status: 'prenotato' },
    { id: 'cancelled', client_ids: ['client-1'], service_id: 'pt11', date: '2026-07-31', status: 'annullato' },
  ];
  const input = {
    clientId: 'client-1',
    total: 10,
    appointments,
    packageStart: '2026-07-01',
    today: '2026-07-22',
    serviceUsesPackageSessions: serviceId => ['pt11', 'pt12', 'circuit'].includes(serviceId),
  };

  const first = domain.calculatePackageSessions(input);
  const second = domain.calculatePackageSessions(input);
  assert.deepEqual(first, second);
  assert.equal(first.completed, 1);
  assert.equal(first.remaining, 9);
  assert.equal(first.scheduled, 1);
});

test('riaprire una seduta rimuove l esecutore e ripristina il residuo al ricalcolo', () => {
  const done = domain.normalizePerformanceTransition(null, {
    id: 'appointment-1', operatorId: 'pt-responsabile', performedByOperatorId: 'pt-responsabile', status: 'fatto',
  }, operators);
  const reopened = domain.normalizePerformanceTransition(done, {
    ...done, status: 'prenotato',
  }, operators);
  assert.equal(reopened.performedByOperatorId, '');

  const metrics = domain.calculatePackageSessions({
    clientId: 'client-1',
    total: 10,
    appointments: [{ ...reopened, clientIds: ['client-1'], serviceId: 'pt11', date: '2026-07-22' }],
    packageStart: '2026-07-01',
    today: '2026-07-22',
    serviceUsesPackageSessions: () => true,
  });
  assert.equal(metrics.completed, 0);
  assert.equal(metrics.remaining, 10);
});
