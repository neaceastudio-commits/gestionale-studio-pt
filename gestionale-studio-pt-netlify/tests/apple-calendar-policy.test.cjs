const assert = require('node:assert/strict');
const policy = require('../netlify/functions/lib/apple-calendar-policy');

const clients = [
  { id: 'c1', nome: 'Michael', cognome: 'Jackson', active: true },
  { id: 'c2', nome: 'Mario', cognome: 'Rossi', active: false },
  { id: 'c3', nome: 'Anna', cognome: 'Verdi', active: true },
  { id: 'c4', nome: 'Anna', cognome: 'Verdi', active: true },
];

assert.equal(policy.extractPersonLabel('Personal Michael Jackson'), 'Michael Jackson');
assert.equal(policy.extractPersonLabel('PT 1:1 — Michael Jackson'), 'Michael Jackson');
assert.equal(policy.matchClientFromTitle('Personal Michael Jackson', clients).status, 'matched');
assert.equal(policy.matchClientFromTitle('Personal Mario Rossi', clients).status, 'inactive');
assert.equal(policy.matchClientFromTitle('Personal Freddie Mercury', clients).status, 'unknown');
assert.equal(policy.matchClientFromTitle('Personal Anna Verdi', clients).status, 'ambiguous');

const infinite = policy.recurrencePolicy({ rrule: 'FREQ=WEEKLY', requestedOccurrences: 99, toSchedule: 5 });
assert.equal(infinite.ok, false);
assert.equal(infinite.code, 'unbounded_recurrence');
assert.equal(infinite.maxOccurrences, 5);

const capped = policy.recurrencePolicy({ rrule: 'FREQ=WEEKLY;COUNT=8', requestedOccurrences: 8, toSchedule: 5 });
assert.equal(capped.ok, true);
assert.equal(capped.code, 'capped_to_package');
assert.equal(capped.maxOccurrences, 5);

const noRoom = policy.recurrencePolicy({ requestedOccurrences: 1, toSchedule: 0 });
assert.equal(noRoom.ok, false);
assert.equal(noRoom.code, 'package_fully_planned');

const ok = policy.validateExternalBooking({
  title: 'Personal Michael Jackson',
  clients,
  sessionMetrics: { toSchedule: 3 },
  requestedOccurrences: 1,
});
assert.equal(ok.ok, true);
assert.equal(ok.match.client.id, 'c1');
assert.equal(ok.maxOccurrences, 1);

const unknown = policy.validateExternalBooking({
  title: 'Personal Freddie Mercury',
  clients,
  sessionMetrics: { toSchedule: 3 },
});
assert.equal(unknown.ok, false);
assert.equal(unknown.code, 'unknown_client');

console.log('PASS Apple calendar policy: active clients only, unknown/inactive/ambiguous rejection, bounded package scheduling');
