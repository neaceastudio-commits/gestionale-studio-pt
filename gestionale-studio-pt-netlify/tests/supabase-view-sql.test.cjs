const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const docsRoot = path.join(__dirname, '..', 'docs');
const readSql = (name) => fs.readFileSync(path.join(docsRoot, name), 'utf8');

test('la verifica delle viste e esclusivamente read-only', () => {
  const sql = readSql('supabase-pt-views-performer-preview.sql');
  assert.match(sql, /from information_schema\.columns/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|alter|create|drop|truncate)\b/i);
});

test('l estensione della vista calendario e additiva, separata e senza backfill', () => {
  const sql = readSql('supabase-pt-calendar-view-performer.sql');
  assert.match(sql, /create or replace view public\.pt_calendar_sessions/i);
  assert.match(sql, /appointments\.performed_by_operator_id/i);
  assert.match(sql, /existing_view\.appointment_id/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /set\s+performed_by_operator_id/i);
});
