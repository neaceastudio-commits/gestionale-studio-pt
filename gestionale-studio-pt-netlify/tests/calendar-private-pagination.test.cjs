'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHandler } = require('../netlify/functions/lib/studio-private-endpoint.cjs');
const { read } = require('../netlify/functions/lib/studio-private-read.cjs');

const owner = { id: 'direction', role: 'owner' };
const secretary = { id: 'office', role: 'secretary' };
const trainer = { id: 'pt-one', role: 'pt' };
const appointmentOrder = 'date.asc,start_time.asc,id.asc';
const appointments = Array.from({ length: 2500 }, (_, index) => ({
  id: 'appointment-' + String(index).padStart(4, '0'),
  date: '2026-11-19',
  start_time: '09:00',
  operator_id: index % 2 ? 'pt-other' : trainer.id,
  client_ids: index === 0 ? ['from-history'] : [],
}));

function database(tables) {
  const calls = [];
  async function db(table, { query }) {
    const params = new URLSearchParams(query);
    let rows = tables[table] || [];
    for (const [column, value] of params) {
      if (value.startsWith('eq.')) {
        rows = rows.filter(row => String(row[column]) === value.slice(3));
      } else if (value.startsWith('in.(')) {
        const ids = value.slice(4, -1).split(',');
        rows = rows.filter(row => ids.includes(row[column]));
      } else {
        assert.ok(['limit', 'offset', 'select', 'order'].includes(column), column);
      }
    }
    const offset = Number(params.get('offset'));
    const limit = Number(params.get('limit'));
    const page = rows.slice(offset, offset + limit);
    const select = params.get('select');
    calls.push({ table, params, limit, offset, rowCount: page.length });
    return select === '*' ? page : page.map(row =>
      Object.fromEntries(select.split(',').map(field => [field, row[field]])));
  }
  return { db, calls };
}

test('one calendar refresh fetches each appointment page from Supabase once, including the empty last page', async () => {
  const { db, calls } = database({ appointments });
  const received = [];
  for (let offset = 0; ; offset += 500) {
    const page = await read(owner, {
      table: 'appointments', query: `?select=*&order=${appointmentOrder}&limit=500&offset=${offset}`,
    }, db);
    received.push(...page);
    if (page.length < 500) break;
  }
  assert.deepEqual(received, appointments);
  assert.deepEqual(calls.map(call => call.offset), [0, 500, 1000, 1500, 2000, 2500]);
  assert.ok(calls.every(call => call.params.get('order') === appointmentOrder));
  assert.equal(calls.reduce((total, call) => total + call.rowCount, 0), appointments.length);
});

test('PT appointment scope is applied in Supabase before pagination and narrows caller filters', async () => {
  const { db, calls } = database({ appointments });
  const page = await read(trainer, {
    table: 'appointments', query: `?select=id&order=${appointmentOrder}&limit=2&offset=2`,
  }, db);
  assert.deepEqual(page, [{ id: 'appointment-0004' }, { id: 'appointment-0006' }]);
  assert.deepEqual(calls.map(call => [call.offset, call.limit]), [[2, 2]]);
  const unrelated = await read(trainer, {
    table: 'appointments', query: '?limit=2&operator_id=eq.pt-other',
  }, db);
  assert.deepEqual(unrelated, []);
  assert.deepEqual(calls[1].params.getAll('operator_id'), ['eq.pt-other', 'eq.pt-one']);
});

test('PT client pages retain assigned, shared and historical clients and exclude unrelated clients', async () => {
  const clients = [
    { id: 'another-pt', pt_assegnato: 'pt-other' },
    { id: 'assigned', pt_assegnato: trainer.id },
    { id: 'from-history', pt_assegnato: 'pt-other' },
    { id: 'shared', pt_assegnato: 'pt-other' },
  ];
  const { db, calls } = database({
    clients,
    appointments: appointments.slice(0, 4),
    trainer_client_assignments: [
      { client_id: 'shared', trainer_id: trainer.id, active: true },
      { client_id: 'another-pt', trainer_id: trainer.id, active: false },
    ],
  });
  const page = await read(trainer, {
    table: 'clients', query: '?select=id&order=id.asc&limit=2&offset=1',
  }, db);
  assert.deepEqual(page, [{ id: 'from-history' }, { id: 'shared' }]);
  const [clientPage] = calls.filter(call => call.table === 'clients' && call.params.get('select') === '*');
  assert.deepEqual([clientPage.offset, clientPage.limit, clientPage.rowCount], [1, 2, 2]);
  assert.deepEqual(await read(trainer, {
    table: 'clients', query: '?limit=2&id=eq.another-pt',
  }, db), []);
});

test('historic client IDs with punctuation keep their exact scope before slicing', async () => {
  const clients = [
    { id: 'another-pt', pt_assegnato: 'pt-other' },
    { id: 'legacy,client', pt_assegnato: trainer.id },
    { id: 'shared', pt_assegnato: trainer.id },
  ];
  const { db } = database({ clients });
  assert.deepEqual(await read(trainer, {
    table: 'clients', query: '?select=id&order=id.asc&offset=1&limit=1',
  }, db), [{ id: 'shared' }]);
});

test('legacy callers can still request a complete snapshot or a page larger than 500 rows', async () => {
  const { db } = database({ appointments });
  assert.deepEqual(await read(secretary, { table: 'appointments' }, db), appointments);
  assert.deepEqual(await read(secretary, {
    table: 'appointments', query: '?limit=1200&offset=500',
  }, db), appointments.slice(500, 1700));
});

test('operator field restrictions apply before returning a bounded page', async () => {
  const { db, calls } = database({ operators: [{ id: trainer.id, email: 'test@example.invalid', access_code: 'private' }] });
  assert.deepEqual(await read(secretary, {
    table: 'operators', query: '?select=id,access_code&limit=1',
  }, db), [{ id: trainer.id }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].limit, 1);
  assert.ok(!calls[0].params.get('select').includes('access_code'));
});

test('the endpoint validates sessions, direction-only tables and pagination before data queries', async () => {
  const { db, calls } = database({});
  const handler = createHandler({ authenticate: async token => token === 'verified' ? trainer : null, db });
  function request(table, query, accessToken) {
    return handler({
      httpMethod: 'POST',
      body: JSON.stringify({ table, query, accessToken, actor: owner }),
    });
  }
  assert.equal((await request('appointments', '?limit=500', 'unverified')).statusCode, 401);
  assert.equal((await request('consensi_cliente', '?limit=10', 'verified')).statusCode, 403);
  assert.equal((await request('clients', '?limit=-1', 'verified')).statusCode, 400);
  assert.deepEqual(calls, []);
});
