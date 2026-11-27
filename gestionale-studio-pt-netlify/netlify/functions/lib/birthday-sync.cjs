'use strict';
const crypto = require('node:crypto');
const { identity, birthdayCalendar } = require('./calendar-birthdays.cjs');
const SITE = '28855faa-de52-4e4c-b1c2-e2db4965670f';
const need = (ok, message) => { if (!ok) throw Error(message); };

async function syncBirthdays({ env, store, cal, load, now = Date.now }) {
  need(env.SITE_ID === SITE && env.APPLE_BIRTHDAYS_ENABLED === 'true', 'Birthday worker not enabled on the calendar site');
  const start = now(), owner = crypto.randomUUID();
  const oldLease = await store.getWithMetadata('lease', { type: 'json' });
  if (oldLease && oldLease.data.until > start) return { busy: true };
  const lease = await store.setJSON('lease', { owner, until: start + 900000 }, oldLease ? { onlyIfMatch: oldLease.etag } : { onlyIfNew: true });
  if (!lease.modified) return { busy: true };
  const result = { checked: 0, created: 0, updated: 0, removed: 0, errors: 0, complete: false };
  try {
    await cal.verify();
    // Load the full source before any deletion. An unavailable DB must never look like an empty list.
    const birthdays = await load();
    need(Array.isArray(birthdays), 'Invalid birthday source');
    const prior = await store.get('manifest', { type: 'json' }) || { calendar: cal.base, items: {} };
    need(prior.calendar === cal.base, 'Birthday collection changed');
    const desired = Object.fromEntries(birthdays.map(b => [identity(b), b]));
    const items = { ...prior.items };
    const keys = [...new Set([...Object.keys(desired), ...Object.keys(items)])].sort();
    const cursor = Number(await store.get('cursor', { type: 'json' }) || 0) % Math.max(1, keys.length);
    for (let index = 0; index < keys.length; index++) {
      if (now() - start > 780000) break;
      const position = (cursor + index) % keys.length, key = keys[position];
      need(/^[a-f0-9]{64}$/.test(key), 'Invalid birthday identity');
      const href = `neacea-birthday-${key}.ics`;
      try {
        const remote = await cal.read(href);
        if (remote) {
          const lines = remote.ics.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
          need(lines.filter(l => l === 'BEGIN:VEVENT').length === 1 &&
            lines.filter(l => l.startsWith('UID:')).length === 1 &&
            lines.includes(`UID:neacea-birthday-${key}@calendar.neacea.it`) &&
            lines.includes(`X-NEACEA-BIRTHDAY-ID:${key}`), 'Unowned birthday resource');
        }
        const birthday = desired[key];
        if (!birthday) {
          if (remote) { await cal.delete(href, remote.etag); result.removed++; }
          delete items[key];
        } else {
          const ics = birthdayCalendar(birthday);
          const hash = crypto.createHash('sha256').update(ics).digest('hex');
          if (!remote || items[key]?.hash !== hash || items[key]?.etag !== remote.etag) {
            if (!items[key]) {
              items[key] = { pending: true };
              await store.setJSON('manifest', { calendar: cal.base, items });
            }
            await cal.put(href, ics, remote?.etag);
            const saved = await cal.read(href);
            need(saved, 'Birthday write not confirmed');
            items[key] = { hash, etag: saved.etag };
            result[remote ? 'updated' : 'created']++;
          }
        }
      } catch (_) { result.errors++; }
      result.checked++;
      // A write interrupted before this checkpoint is recovered at the same deterministic href.
      await store.setJSON('manifest', { calendar: cal.base, items });
      await store.setJSON('cursor', (position + 1) % Math.max(1, keys.length));
    }
    result.complete = result.checked === keys.length && result.errors === 0;
    await store.setJSON('last-run', { ...result, at: new Date(now()).toISOString() });
    return result;
  } finally {
    await store.setJSON('lease', { owner, until: 0 }, { onlyIfMatch: lease.etag });
  }
}
module.exports = { syncBirthdays };
