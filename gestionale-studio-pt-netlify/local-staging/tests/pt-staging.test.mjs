import assert from 'node:assert/strict';
import test from 'node:test';
import {
  localEnvironment,
  queryScalar,
} from '../scripts/runtime.mjs';

const environment = localEnvironment();
const apiUrl = environment.API_URL.replace(/\/$/, '');
const anonKey = environment.ANON_KEY;
const serviceRoleKey = environment.SERVICE_ROLE_KEY;

async function request(path, {
  key = anonKey,
  method = 'GET',
  body,
  prefer = 'return=representation',
} = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { response, data };
}

test('la migrazione additiva è idempotente e la vista espone l esecutore', () => {
  assert.equal(queryScalar(`
    select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'performed_by_operator_id'
  `), '1');
  assert.equal(queryScalar(`
    select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pt_calendar_sessions'
      and column_name = 'performed_by_operator_id'
  `), '1');
  assert.equal(queryScalar(`
    select count(*) from pg_constraint
    where conname = 'appointments_performer_pt_fk'
      and conrelid = 'public.appointments'::regclass
  `), '1');
});

test('anon può leggere ma non modificare il PT responsabile', async () => {
  const initial = await request('clients?id=eq.client-stabile&select=id,pt_assegnato');
  assert.equal(initial.response.status, 200);
  assert.equal(initial.data[0].pt_assegnato, 'pt-responsabile');

  const denied = await request('clients?id=eq.client-stabile', {
    method: 'PATCH',
    body: { pt_assegnato: 'pt-sostituto' },
  });
  assert.equal(denied.response.ok, false);

  const after = await request('clients?id=eq.client-stabile&select=id,pt_assegnato');
  assert.equal(after.data[0].pt_assegnato, 'pt-responsabile');
});

test('service_role persiste e rilegge pt_assegnato senza derivarlo dalla seduta', async () => {
  const update = await request('clients?id=eq.client-stabile', {
    key: serviceRoleKey,
    method: 'PATCH',
    body: { pt_assegnato: 'pt-responsabile' },
  });
  assert.equal(update.response.status, 200);

  const read = await request('clients?id=eq.client-stabile&select=id,pt_assegnato', {
    key: serviceRoleKey,
  });
  assert.equal(read.data[0].pt_assegnato, 'pt-responsabile');
});

test('la sostituzione conserva PT responsabile e PT programmato distinti', async () => {
  const appointment = await request(
    'appointments?id=eq.appointment-substitution&select=id,operator_id,performed_by_operator_id',
    { key: serviceRoleKey }
  );
  const client = await request(
    'clients?id=eq.client-stabile&select=id,pt_assegnato',
    { key: serviceRoleKey }
  );

  assert.equal(client.data[0].pt_assegnato, 'pt-responsabile');
  assert.equal(appointment.data[0].operator_id, 'pt-sostituto');
  assert.equal(appointment.data[0].performed_by_operator_id, null);
});

test('PT programmato ed esecutore diverso restano entrambi nella timeline', async () => {
  const result = await request(
    'pt_calendar_sessions?appointment_id=eq.appointment-performed-different&select=appointment_id,trainer_id,performed_by_operator_id,status'
  );
  assert.equal(result.response.status, 200);
  assert.equal(result.data[0].trainer_id, 'pt-responsabile');
  assert.equal(result.data[0].performed_by_operator_id, 'pt-sostituto');
  assert.equal(result.data[0].status, 'fatto');
});

test('un esecutore inesistente viene bloccato dalla FK senza downgrade', async () => {
  const result = await request('appointments?id=eq.appointment-performed-different', {
    key: serviceRoleKey,
    method: 'PATCH',
    body: { performed_by_operator_id: 'pt-inesistente' },
  });
  assert.equal(result.response.ok, false);
  assert.equal(result.data.code, '23503');

  const unchanged = await request(
    'appointments?id=eq.appointment-performed-different&select=performed_by_operator_id',
    { key: serviceRoleKey }
  );
  assert.equal(unchanged.data[0].performed_by_operator_id, 'pt-sostituto');
});

test('lo storico conserva esecutore assente e operatore inattivo senza inferenze', async () => {
  const missing = await request(
    'appointments?id=eq.appointment-missing-performer-history&select=operator_id,performed_by_operator_id,status'
  );
  const inactive = await request(
    'appointments?id=eq.appointment-inactive-history&select=operator_id,performed_by_operator_id,status'
  );
  const operator = await request(
    'operators?id=eq.pt-inattivo&select=id,active'
  );

  assert.equal(missing.data[0].status, 'fatto');
  assert.equal(missing.data[0].performed_by_operator_id, null);
  assert.equal(inactive.data[0].operator_id, 'pt-inattivo');
  assert.equal(inactive.data[0].performed_by_operator_id, 'pt-inattivo');
  assert.equal(operator.data[0].active, false);
});

test('il PT legacy non valido resta rilevabile come dato non autorevole', async () => {
  const result = await request(
    'clients?id=eq.client-legacy-invalido&select=id,pt_assegnato'
  );
  assert.equal(result.data[0].pt_assegnato, 'responsabile@example.test');
  assert.equal(queryScalar(`
    select count(*)
    from public.operators
    where id = (
      select pt_assegnato
      from public.clients
      where id = 'client-legacy-invalido'
    )
  `), '0');
});
