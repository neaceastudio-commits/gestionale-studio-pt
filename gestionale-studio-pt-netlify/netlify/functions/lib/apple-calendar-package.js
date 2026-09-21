'use strict';
// Database-row adapter of Services.getPackageCycleContext / appointmentInCurrentPackageCycle.
// Keep parity tests against the browser implementation when changing these rules.
const PT = new Set(['pt11', 'pt12', 'circuit']);
const marker = notes => String(notes || '').match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/i)?.[1]
  || [...String(notes || '').matchAll(/Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})/gi)].at(-1)?.[1] || '';
const cycleId = notes => String(notes || '').match(/\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]/i)?.[1] || '';
function context(client, rows) {
  const blocks = [...String(client.notes || '').matchAll(/\[NEACEA-PACKAGE-LEDGER-V1\]\s*([\s\S]*?)\s*\[\/NEACEA-PACKAGE-LEDGER-V1\]/g)];
  let cycles = [];
  try { const parsed = JSON.parse(blocks.at(-1)?.[1] || '{"cycles":[]}'); if (Array.isArray(parsed.cycles)) cycles = parsed.cycles; } catch (_) { /* Browser falls back to legacy context for malformed ledgers. */ }
  const cycle = [...cycles].reverse().find(c => !c.closedAt) || cycles.at(-1);
  const persisted = String(String(client.notes || '').match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/i)?.[1] || client.data_conferma || '').slice(0, 10);
  const inferred = rows.map(a => marker(a.notes)).filter(Boolean).sort().at(-1) || '';
  return { start: cycle?.startDate || persisted || inferred || String(client.data_inizio || client.package_start || '').slice(0, 10), id: cycle?.id || '', legacy: cycle ? cycle.legacy === true : true, persisted: !!persisted, inferredFromAppointment: !persisted && !!inferred };
}
function inCycle(a, ctx) {
  const id = cycleId(a.notes);
  if (ctx.id && id) return id === ctx.id;
  if (ctx.id && !ctx.legacy) return false;
  if (marker(a.notes) && marker(a.notes) === ctx.start) return true;
  if (ctx.persisted) return !ctx.start || a.date >= ctx.start;
  const start = marker(a.notes);
  return start ? !ctx.start || start === ctx.start : !ctx.start || a.date >= ctx.start;
}
const order = (a, b) => `${a.date} ${a.start_time} ${a.id}`.localeCompare(`${b.date} ${b.start_time} ${b.id}`);
function packageInfo(client, appointments, today) {
  const rows = appointments.filter(a => PT.has(a.service_id) && a.client_ids?.includes(client.id));
  const ctx = context(client, rows);
  const current = rows.filter(a => inCycle(a, ctx)).sort(order);
  const completed = current.filter(a => a.status === 'fatto').length;
  const future = current.filter(a => a.status === 'prenotato' && a.date >= today);
  // The stored counters are authoritative: never infer progress from appointments.
  const remaining = Number(client.sessions_remaining) || 0;
  const total = Number(client.sessions_total) || 0;
  const progress = { n: total - remaining, total };
  const planned = current.filter(a => ['fatto', 'prenotato'].includes(a.status));
  const slots = [...new Set(planned.map(a => `${new Date(a.date + 'T12:00:00Z').getUTCDay()} ${String(a.start_time).slice(0, 5)}`))].sort((a,b) => ((Number(a[0])+6)%7)-((Number(b[0])+6)%7) || a.localeCompare(b));
  const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const toSchedule = Math.max(0, remaining - future.length);
  return { ctx, total, remaining, completed, scheduled: future.length, toSchedule, progress,
    schedule: slots.map(s => `${days[Number(s[0])]} ${s.slice(2)}`),
    endDate: toSchedule === 0 && planned.length ? planned.map(a => a.date).sort().at(-1) : null };
}
// Explicit closed vocabulary: a marker alone cannot make arbitrary personal text safe.
const OPERATIONAL_NOTES = new Set(['Portare un asciugamano', 'Portare scarpe pulite', 'Presentarsi 5 minuti prima']);
function operationalNote(notes) {
  return [...String(notes || '').matchAll(/^\[NOTA-OPERATIVA\]\s*([^\r\n]*)$/gm)]
    .map(m => m[1].trim()).filter(text => OPERATIONAL_NOTES.has(text)).join(' · ') || '—';
}
module.exports = { PT, context, inCycle, packageInfo, operationalNote };
