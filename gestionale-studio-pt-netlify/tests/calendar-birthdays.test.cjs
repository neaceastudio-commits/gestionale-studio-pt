const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { resolveBirthdays, birthdayCalendar, identity, loadBirthdays } = require('../netlify/functions/lib/calendar-birthdays.cjs');
const { syncBirthdays } = require('../netlify/functions/lib/birthday-sync.cjs');
const { createHandler } = require('../netlify/functions/lib/studio-private-endpoint.cjs');
const { onDate } = require('../app/calendario-studio/js/birthdays.js');
const person = { id: 'c1', nome: 'Mario', cognome: 'Rossi', email: 'm@example.test', active: true };
const acquisition = { ...person, id: 'a1', nascita: '1980-02-29' };
const birth = { id: 'c1', kind: 'client', name: 'Mario Rossi', month: 2, day: 29 };

test('dates resolve without false matches, inactive customers or conflicting acquisitions', () => {
  const rows = resolveBirthdays([person, { ...person, id: 'inactive', active: false, nome: 'Inactive', email: '', nascita: '1980-01-01' }], [], [acquisition]);
  assert.equal(rows.length, 1); assert.equal(rows[0].day, 29);
  assert.equal(resolveBirthdays([person], [], [acquisition, { ...acquisition, nascita: '1980-02-28' }]).length, 0);
  assert.equal(resolveBirthdays([{ ...person, nascita: '1980-03-01' }], [], [acquisition])[0].month, 3);
  assert.equal(resolveBirthdays([{ ...person, email: '' }, { ...person, email: '', id: 'same-name' }], [], [acquisition]).length, 0);
  assert.equal(resolveBirthdays([person], [], [{ ...acquisition, nascita: '1980-02-30' }]).length, 0);
  assert.equal(resolveBirthdays([person], [], [{ ...acquisition, nascita: '2099-01-01' }]).length, 0);
  assert.equal(resolveBirthdays([person], [{ ...person, id: 'pt1', nascita: '1985-12-31' }], [acquisition]).length, 2);
});
test('all-day annual events preserve dates, identity, UTF8 and privacy', () => {
  const ics = birthdayCalendar(birth);
  assert.match(ics, /DTSTART;VALUE=DATE:20000229/);
  assert.match(ics, /DTEND;VALUE=DATE:20000301/);
  assert.match(ics, /RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1/);
  assert.match(ics, /TRANSP:TRANSPARENT/);
  assert.doesNotMatch(ics, /TZID|1980|VALARM/);
  const yearEnd = birthdayCalendar({ ...birth, month: 12, day: 31 });
  assert.match(yearEnd, /DTEND;VALUE=DATE:20010101/);
  assert.equal(identity(birth), identity({ ...birth, name: 'New name', day: 5 }));
  const attack = birthdayCalendar({ ...birth, name: 'È'.repeat(80) + '\r\nATTENDEE:mailto:x@test' });
  assert.doesNotMatch(attack, /\r\nATTENDEE/);
  for (const line of attack.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
test('calendar and Apple use the same leap-day policy', () => {
  assert.equal(onDate([birth], '2027-02-28').length, 1);
  assert.equal(onDate([birth], '2028-02-28').length, 0);
  assert.equal(onDate([birth], '2028-02-29').length, 1);
  assert.equal(onDate([birth], '2027-03-01').length, 0);
});
test('private endpoint rejects anonymous writes and only reveals scoped birthdays to PT', async () => {
  let calls = 0;
  const unauth = createHandler({ authenticate: async () => null, db: async () => { calls++; } });
  assert.equal((await unauth({ httpMethod: 'POST', body: JSON.stringify({ table: 'calendar_birthdays' }) })).statusCode, 401);
  assert.equal(calls, 0);
  const owner = createHandler({ authenticate: async () => ({ id: 'staff_1', role: 'owner' }), db: async () => { calls++; } });
  assert.equal((await owner({ httpMethod: 'POST', body: JSON.stringify({ table: 'calendar_birthdays', method: 'DELETE' }) })).statusCode, 403);
  assert.equal(calls, 0);
  const db = async (table, { query }) => {
    const q = new URLSearchParams(query);
    if (q.get('offset') !== '0') return [];
    if (table === 'clients') return q.get('select') === 'id' ? [{ id: 'c1' }] : [person, { ...person, id: 'c2', nome: 'Luca', email: '', nascita: '1980-01-01' }];
    if (table === 'operators') return [{ ...person, id: 'pt1', nascita: '1980-05-01' }, { ...person, id: 'pt2', nascita: '1980-05-01' }];
    if (table === 'acquisizioni') return [acquisition];
    return [];
  };
  const result = await loadBirthdays(db, { id: 'pt1', role: 'pt' });
  assert.deepEqual(result.map(r => r.id).sort(), ['c1', 'pt1']);
  assert.ok(result.every(r => !('nascita' in r) && !('email' in r)));
});

function harness() {
  const data = new Map(), remote = new Map(); let version = 0;
  const count = { puts: 0, deletes: 0 };
  const store = {
    get: async key => structuredClone(data.get(key)?.data ?? null),
    getWithMetadata: async key => structuredClone(data.get(key) ?? null),
    setJSON: async (key, value, options = {}) => {
      const previous = data.get(key);
      if (options.onlyIfNew && previous || options.onlyIfMatch && options.onlyIfMatch !== previous?.etag) return { modified: false };
      const etag = String(++version); data.set(key, { data: structuredClone(value), etag }); return { modified: true, etag };
    },
  };
  const cal = {
    base: 'https://caldav.icloud.com/dedicated/', verify: async () => {},
    read: async href => structuredClone(remote.get(href) || null),
    put: async (href, ics, etag) => { assert.equal(remote.get(href)?.etag, etag); remote.set(href, { ics, etag: String(++version) }); count.puts++; },
    delete: async (href, etag) => { assert.equal(remote.get(href)?.etag, etag); remote.delete(href); count.deletes++; },
  };
  const env = { SITE_ID: '28855faa-de52-4e4c-b1c2-e2db4965670f', APPLE_BIRTHDAYS_ENABLED: 'true' };
  return { data, remote, count, options: { env, store, cal, load: async () => [birth] } };
}
test('Apple create, rerun, rename, date correction and retirement are idempotent', async () => {
  const h = harness();
  h.remote.set('foreign.ics', { ics: 'manual event', etag: 'foreign' });
  assert.equal((await syncBirthdays(h.options)).created, 1);
  assert.equal((await syncBirthdays(h.options)).created, 0);
  assert.equal(h.count.puts, 1);
  const edited = { ...birth, name: 'Mario Updated', month: 5, day: 12 };
  assert.equal((await syncBirthdays({ ...h.options, load: async () => [edited] })).updated, 1);
  assert.equal(h.remote.size, 2);
  assert.equal((await syncBirthdays({ ...h.options, load: async () => [] })).removed, 1);
  assert.equal(h.remote.get('foreign.ics').ics, 'manual event');
});
test('unavailable source, ETag conflicts and foreign identity never cause deletion', async () => {
  const h = harness(); await syncBirthdays(h.options);
  await assert.rejects(syncBirthdays({ ...h.options, load: async () => { throw Error('offline'); } }));
  assert.equal(h.count.deletes, 0);
  const href = `neacea-birthday-${identity(birth)}.ics`;
  h.remote.set(href, { ics: 'BEGIN:VEVENT\r\nUID:foreign\r\nEND:VEVENT', etag: 'foreign' });
  const result = await syncBirthdays({ ...h.options, load: async () => [] });
  assert.equal(result.errors, 1); assert.equal(result.complete, false); assert.equal(h.count.deletes, 0);
  const conflict = harness(); await syncBirthdays(conflict.options);
  conflict.options.cal.put = async () => { throw Error('412'); };
  assert.equal((await syncBirthdays({ ...conflict.options, load: async () => [{ ...birth, name: 'Updated' }] })).errors, 1);
});
test('pending creation is recoverable even if the person becomes inactive before retry', async () => {
  const h = harness(); const read = h.options.cal.read;
  h.options.cal.read = async href => { if (h.count.puts) throw Error('read interrupted'); return read(href); };
  assert.equal((await syncBirthdays(h.options)).errors, 1);
  h.options.cal.read = read;
  assert.equal((await syncBirthdays({ ...h.options, load: async () => [] })).removed, 1);
});
test('concurrent worker and wrong deployment cannot write Apple events', async () => {
  const h = harness();
  await h.options.store.setJSON('lease', { until: Date.now() + 60000 });
  assert.equal((await syncBirthdays(h.options)).busy, true); assert.equal(h.count.puts, 0);
  await assert.rejects(syncBirthdays({ ...h.options, env: { ...h.options.env, SITE_ID: 'other' } }));
});
test('staff editor waits for server confirmation before updating local data', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/calendario-studio/js/operators.js'), 'utf8');
  const values = { 'op-nome': 'Test', 'op-cognome': 'Staff', 'op-email': '', 'op-color': '#fff', 'op-nascita': '1980-05-12' };
  let saves = 0, closed = 0; const messages = [];
  const ctx = { document: { getElementById: id => ({ value: values[id] }), querySelectorAll: () => [] },
    State: { getOperators: () => [{ id: 'pt1' }], saveOperators: () => { saves++; } },
    SupabaseSync: { pushOperator: async () => ({ error: 'offline' }) }, Birthdays: { refresh: async () => {} },
    UI: { showToast: message => messages.push(message), closeModal: () => { closed++; } }, CONFIG: { SHEETS: { enabled: false } }, Calendar: { render: () => {} }, window: {},
  };
  vm.createContext(ctx); vm.runInContext(source + '\nthis.staff=Operators;', ctx);
  await ctx.staff.save('pt1'); assert.equal(saves, 0); assert.equal(closed, 0); assert.equal(messages[0], 'offline');
});

test('additive SQL migration preserves rows and rejects invalid/future dates', async () => {
  const { PGlite } = require('../tools/coaching-editor/node_modules/@electric-sql/pglite');
  const db = new PGlite();
  try {
    await db.exec("create table clients(id text primary key, sessions_remaining integer); create table operators(id text primary key); insert into clients values('c1',7); insert into operators values('pt1');");
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261127080000_calendar_birthdays.sql'), 'utf8'));
    assert.deepEqual((await db.query('select * from clients')).rows, [{ id: 'c1', sessions_remaining: 7, nascita: null }]);
    await db.exec("update operators set nascita='1980-02-29' where id='pt1'");
    assert.equal((await db.query("select nascita::text from operators where id='pt1'")).rows[0].nascita, '1980-02-29');
    await assert.rejects(db.exec("update operators set nascita='2099-01-01'"));
    await assert.rejects(db.exec("update operators set nascita='1980-02-30'"));
    assert.equal((await db.query('select sessions_remaining from clients')).rows[0].sessions_remaining, 7);
  } finally { await db.close(); }
});
