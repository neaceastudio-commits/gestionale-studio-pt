const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Ledger = require('../app/calendario-studio/js/package-ledger');
const renewals = require('../netlify/functions/lib/expected-renewals');
const { createHandler } = require('../netlify/functions/calendar-client-finance');
const { open } = require('./helpers/calendar-recovery-db.cjs');

const start = '2099-10-01';
const nextStart = '2099-11-05';
const cycleSource = { cycleId: '', start };
const cycleMetrics = { cycleStart: start, total: 12, remaining: 1 };
const ledgerClient = row => ({
  ...row,
  packageStart: row.package_start,
  packageCycleStart: row.data_conferma,
  sessionsTotal: row.sessions_total,
});
const financePatch = client => ({
  id: client.id,
  notes: client.notes,
  importo: client.importo,
  stato_pagamento: client.statoPagamento,
});

async function setup(t, confirm) {
  const db = await open();
  t.after(() => db.close());
  await db.db.exec(`alter table clients add column email text default 'client@example.test';`);
  for (const file of [
    '20261030183151_calendar_shared_client_finance.sql',
    '20261116174042_calendar_cycle_recovery_sequence.sql',
  ]) await db.db.exec(readFileSync(path.join(__dirname, '../supabase/migrations', file), 'utf8'));
  const client = async () => (await db.all('clients'))[0];
  const renewal = (action, payload) =>
    db.rpc('calendar_expected_renewal', ['owner', action, JSON.stringify(payload)]);
  await db.patch({ id: 'a', notes: `[CICLO-PACCHETTO ${start}]`, importo: 0, stato_pagamento: 'Da pagare', sessions_remaining: 1 });
  const draft = {
    id: crypto.randomUUID(),
    plan: {
      serviceId: 'pt11', startDate: nextStart, issue: '',
      slots: [{ day: 4, time: '17:00', operatorId: 'pt', duration: 60 }],
      clients: [{ id: 'a', source: cycleSource, cycleId: 'next-a', sessions: 4, amount: 280 }],
    },
  };
  const proposal = await renewal('create', {
    ...draft,
    appointments: renewals.appointmentsFor(draft),
    clients: [{ id: 'a', expectedUpdatedAt: (await client()).updated_at }],
  });
  return {
    ...db, client, renewal,
    proposal: confirm ? await renewal('confirm', { id: proposal.id, version: proposal.version }) : proposal,
    cycleLink: async () => (await db.q('select calendar_pt_current_link(to_jsonb(c)) as link from clients c')).rows[0].link,
  };
}

test('first amount and receipt persist while a confirmed renewal remains valid', async t => {
  const db = await setup(t, true);
  const originalAppointments = await db.all('appointments');
  const before = await db.client();
  assert.deepEqual(await db.cycleLink(), cycleSource);
  assert.equal(Ledger.currentCycle(before), null);

  const amount = Ledger.updateCurrentAmount(ledgerClient(before), cycleMetrics, 240);
  await db.patch(financePatch(amount.client));
  const saved = await db.client();
  assert.equal(saved.importo, 240);
  assert.deepEqual(await db.cycleLink(), cycleSource);

  const payment = Ledger.recordPayment(ledgerClient(saved), cycleMetrics, {
    amount: 65, date: start, method: 'Bonifico',
  });
  await db.patch(financePatch(payment.client));
  const reopened = await db.client();
  assert.deepEqual(Ledger.cycleFinancial(Ledger.currentCycle(reopened)), {
    total: 240, paid: 65, balance: 175, status: 'Parziale',
  });
  assert.equal(reopened.sessions_remaining, before.sessions_remaining);
  assert.deepEqual(await db.all('appointments'), originalAppointments);
  assert.deepEqual(await db.all('calendar_expected_renewals'), [db.proposal]);
  await assert.rejects(db.patch({ id: 'a', data_conferma: '2099-10-02', notes: '[CICLO-PACCHETTO 2099-10-02]' }), /Esiste un rinnovo previsto/);

  await db.patch({ id: 'a', sessions_remaining: 0 });
  const activated = await db.renewal('activate', {
    id: db.proposal.id, version: db.proposal.version,
    clients: renewals.activationClients(db.proposal, [await db.client()], originalAppointments),
  });
  assert.equal(activated.state, 'activated');
  const ledger = Ledger.parse(await db.client());
  assert.equal(ledger.cycles.length, 2);
  assert.equal(Ledger.cycleFinancial(ledger.cycles[0]).paid, 65);
  assert.equal(Ledger.currentCycle(ledger).id, 'next-a');
  assert.equal(Ledger.cycleFinancial(Ledger.currentCycle(ledger)).balance, 280);
});

test('first split preserves a pending renewal and checks empty cycle identifiers on stale requests', async t => {
  const db = await setup(t, false);
  const handler = createHandler({
    auth: async () => ({ id: 'owner', role: 'owner' }),
    database: async (table, { body } = {}) => {
      if (table === 'clients') return [await db.client()];
      assert.equal(table, 'rpc/calendar_save_client_finance');
      return db.rpc('calendar_save_client_finance', [
        body.p_actor_id, body.p_client_id, JSON.stringify(body.p_expected), JSON.stringify(body.p_values),
      ]);
    },
  });
  const split = payload => handler({
    httpMethod: 'POST',
    body: JSON.stringify({ calendarRevision: '20261111-package-suspension-v1', action: 'split', clientId: 'a', ...payload }),
  });
  const before = await db.client();
  const cycleId = Ledger.currentCycle(Ledger.ensure(ledgerClient(before), cycleMetrics)).id;
  const result = await split({ cycleId, expectedNotes: before.notes, total: 240, pt: 240, nutrition: 0 });
  assert.equal(result.statusCode, 200, result.body);
  const stored = Ledger.currentCycle(await db.client());
  assert.deepEqual(stored.serviceAmounts, { pt: 240, nutrition: 0 });
  assert.deepEqual(await db.cycleLink(), cycleSource);
  const confirmed = await db.renewal('confirm', { id: db.proposal.id, version: db.proposal.version });
  const appointments = await db.all('appointments');
  await db.patch({ id: 'a', sessions_remaining: 0 });
  await db.renewal('activate', {
    id: confirmed.id, version: confirmed.version,
    clients: renewals.activationClients(confirmed, [await db.client()], appointments),
  });
  const fresh = await db.client();
  const stale = await split({ cycleId, expectedNotes: fresh.notes, total: 240, pt: 240, nutrition: 0 });
  assert.equal(stale.statusCode, 409);
  assert.match(JSON.parse(stale.body).error, /decorrenza/);
  assert.equal((await db.client()).importo, 280);
});
