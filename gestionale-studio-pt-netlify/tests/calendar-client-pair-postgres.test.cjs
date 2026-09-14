const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { start, seed, rpc } = require('./helpers/calendar-postgres.cjs');

(async () => {
  const db = await start(), c = db.client;
  try {
    await seed(c);
    await c.query(`alter table clients add column tipo_servizio text;
      update clients set tipo_servizio='PT 1:1';
      insert into operators(id,nome,cognome,email,roles) values('owner','Direzione','TEST','owner@example.test',array['owner']);
      create view operator_effective_roles as select id operator_id,nome,cognome,email,active,roles legacy_roles,'[]'::jsonb system_roles from operators;
      grant select on operator_effective_roles to service_role;`);
    for (const name of ['20260912212042_calendar_activity_audit.sql', '20260912225335_calendar_audit_assignment_partial_unique.sql', '20260913211931_calendar_flex_mode.sql']) await c.query(fs.readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8'));
    const write = async (operation, payload) => {
      await c.query('set role service_role');
      try { return await rpc(c, 'calendar_audit_write', { p_actor_id: 'owner', p_actor_role: 'owner', p_source: 'calendar', p_request_id: crypto.randomUUID(), p_operation: operation, p_payload: payload }); }
      finally { await c.query('reset role'); }
    };
    for (const id of ['test', 'other']) {
      const r = await write('client', { method: 'PATCH', rows: [{ id, package_types: ['PT 1:2'], tipo_servizio: 'PT 1:2' }] });
      assert.deepEqual(r[0].package_types, ['PT 1:2']);
      assert.equal(r[0].tipo_servizio, 'PT 1:2');
      assert.equal(r[0].sessions_remaining, 8);
    }
    let r = await write('save', { appointment: { id: 'pair-test', service_id: 'pt12', client_ids: ['test', 'other'], operator_id: 'pt', date: '2026-09-15', start_time: '17:00', duration_min: 60, buffer_min: 0, status: 'prenotato', notes: '' } });
    assert.equal((await c.query('select count(*)::int n from appointments')).rows[0].n, 1);
    assert.deepEqual(r.clients.map(c => c.sessions_remaining), [8, 8]);
    r = await write('save', { appointment: { ...r.appointment, status: 'fatto' }, expected: r.appointment });
    assert.deepEqual(r.clients.map(c => c.sessions_remaining), [7, 7]);
    r = await write('save', { appointment: { ...r.appointment, status: 'prenotato' }, expected: r.appointment });
    assert.deepEqual(r.clients.map(c => c.sessions_remaining), [8, 8]);
    const logs = (await c.query('select actor_operator_id, action, before_data, after_data from calendar_audit_log')).rows;
    assert.ok(logs.every(l => l.actor_operator_id === 'owner'));
    assert.equal(logs.filter(l => l.action === 'client_package_changed' && l.before_data.package_types[0] === 'PT 1:1' && l.after_data.package_types[0] === 'PT 1:2').length, 2);
    assert.ok(logs.some(l => l.action === 'marked_done'));
    assert.ok(logs.some(l => l.action === 'done_reverted'));
    console.log('PASS PostgreSQL: audited PT 1:2 package PATCH, one two-client appointment, independent Fatto decrement/reversal, verified actor');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
