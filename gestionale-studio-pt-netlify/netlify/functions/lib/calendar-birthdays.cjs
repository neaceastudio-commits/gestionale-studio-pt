'use strict';
const crypto = require('node:crypto');
const { all, clientScope } = require('./studio-private-read.cjs');

const normal = value => String(value || '').trim().toLocaleLowerCase('it');
function validDate(value, today = new Date().toISOString().slice(0, 10)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value < '1900-01-01' || value > today) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}
function resolveBirthdays(clients, operators, acquisitions, today) {
  const names = new Map(), emails = new Map();
  for (const client of clients) {
    const name = normal(client.nome) + '|' + normal(client.cognome);
    names.set(name, (names.get(name) || 0) + 1);
    const email = normal(client.email);
    if (email) emails.set(email, (emails.get(email) || 0) + 1);
  }
  return [
    ...clients.map(client => {
      let date = client.nascita;
      if (!validDate(date, today)) {
        const name = normal(client.nome) + '|' + normal(client.cognome);
        const email = normal(client.email);
        // A matching email has priority. Ambiguous people or conflicting dates require an explicit correction.
        const byEmail = email && emails.get(email) === 1
          ? acquisitions.filter(a => normal(a.email) === email) : [];
        const candidates = byEmail.length ? byEmail : names.get(name) === 1 && normal(client.nome) && normal(client.cognome)
          ? acquisitions.filter(a => normal(a.nome) + '|' + normal(a.cognome) === name) : [];
        const dates = [...new Set(candidates.map(a => a.nascita).filter(d => validDate(d, today)))];
        date = dates.length === 1 ? dates[0] : null;
      }
      return { ...client, date, kind: 'client' };
    }),
    ...operators.map(operator => ({ ...operator, date: operator.nascita, kind: 'operator' })),
  ].filter(p => p.active !== false && validDate(p.date, today)).map(p => ({
    id: p.id, kind: p.kind, name: [p.nome, p.cognome].filter(Boolean).join(' ').trim(),
    month: Number(p.date.slice(5, 7)), day: Number(p.date.slice(8, 10)),
    operatorId: p.pt_assegnato || null,
  })).sort((a, b) => a.month - b.month || a.day - b.day || a.name.localeCompare(b.name, 'it'));
}
async function loadBirthdays(db, actor = null) {
  if (actor && !['owner', 'secretary', 'pt'].includes(actor.role)) throw Object.assign(Error('session_required'), { status: 401 });
  const [clients, operators, acquisitions] = await Promise.all([
    all(db, 'clients', { select: 'id,nome,cognome,email,active,nascita,pt_assegnato', order: 'id.asc' }),
    all(db, 'operators', { select: 'id,nome,cognome,active,nascita', order: 'id.asc' }),
    all(db, 'acquisizioni', { select: 'id,nome,cognome,email,nascita', order: 'id.asc' }),
  ]);
  let birthdays = resolveBirthdays(clients, operators, acquisitions);
  if (actor?.role === 'pt') {
    const scope = await clientScope(actor, db);
    birthdays = birthdays.filter(b => b.kind === 'operator' ? b.id === actor.id : scope.has(b.id));
  }
  return birthdays;
}
const identity = b => crypto.createHash('sha256').update(b.kind + ':' + b.id).digest('hex');
const escape = text => String(text).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function eventLines(birthday) {
  const id = identity(birthday);
  // Use the neutral leap year 2000: the birth year/age never leaves the database.
  const start = new Date(Date.UTC(2000, birthday.month - 1, birthday.day));
  const end = new Date(+start + 86400000);
  const stamp = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  return [
    'BEGIN:VEVENT', `UID:neacea-birthday-${id}@calendar.neacea.it`,
    `X-NEACEA-BIRTHDAY-ID:${id}`, 'DTSTAMP:20000101T000000Z',
    `DTSTART;VALUE=DATE:${stamp(start)}`, `DTEND;VALUE=DATE:${stamp(end)}`,
    birthday.month === 2 && birthday.day === 29
      ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
    `SUMMARY:${escape('🎂 ' + birthday.name + (birthday.kind === 'operator' ? ' · Staff' : ''))}`,
    'DESCRIPTION:Compleanno · NEACEA Studio. Data gestita dal calendario NEACEA.',
    'CATEGORIES:Compleanni', 'CLASS:PRIVATE', 'TRANSP:TRANSPARENT', 'STATUS:CONFIRMED', 'END:VEVENT',
  ];
}
function fold(line) {
  const parts = []; let current = '';
  for (const char of line) {
    if (Buffer.byteLength(current + char) > 73) { parts.push(current); current = ''; }
    current += char;
  }
  parts.push(current); return parts.join('\r\n ');
}
function birthdayCalendar(birthday) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NEACEA//Compleanni//IT', ...eventLines(birthday), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
module.exports = { validDate, resolveBirthdays, loadBirthdays, identity, eventLines, birthdayCalendar };
