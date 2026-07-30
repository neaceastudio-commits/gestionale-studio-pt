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
  assert.match(sql, /rtrim\(existing_definition/i);
  assert.doesNotMatch(sql, /\b(insert|update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /set\s+performed_by_operator_id/i);
});

test('la migrazione blocca tipi ID incompatibili prima della FK', () => {
  const sql = readSql('supabase-pt-responsibility-execution.sql');
  assert.match(sql, /performer_type\s*<>\s*operator_type/i);
  assert.match(sql, /scheduled_type\s*<>\s*operator_type/i);
  assert.match(sql, /tipi ID incompatibili/i);
  assert.doesNotMatch(sql, /\bupdate\s+public\.appointments\b/i);
});

test('preflight e postflight produzione sono esclusivamente read-only', () => {
  const preflight = readSql('supabase-pt-production-preflight.sql');
  const postflight = readSql('supabase-pt-production-postflight.sql');
  [preflight, postflight].forEach((sql) => {
    assert.match(sql, /\bselect\b/i);
    assert.doesNotMatch(sql, /\b(insert|update|delete|alter|create|drop|truncate)\b/i);
  });
  assert.match(preflight, /from pg_views/i);
  assert.match(postflight, /calendar_performer_mismatches/i);
});

test('l anteprima allineamento tratta client_ids come JSONB e non scrive dati', () => {
  const sql = readSql('supabase-pt-alignment-preview.sql');
  const executable = sql
    .split('-- Template di applicazione')[0]
    .replace(/--.*$/gm, '');
  assert.match(executable, /jsonb_array_elements_text/i);
  assert.match(executable, /responsible\.id is not null/i);
  assert.match(executable, /not a valid operators\.id/i);
  assert.doesNotMatch(executable, /\b(insert|update|delete|alter|create|drop|truncate)\b/i);
});

test('il rollback strutturale si blocca dopo l estensione della vista', () => {
  const sql = readSql('supabase-pt-responsibility-execution-rollback.sql');
  assert.match(sql, /pt_calendar_sessions/);
  assert.match(sql, /rollback strutturale bloccato/i);
  assert.match(sql, /performed_by_operator_id contiene dati/i);
});
