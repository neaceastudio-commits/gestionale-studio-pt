const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const integration = fs.readFileSync(path.join(root, 'app/acquisizione/activation-calendar-integration.js'), 'utf8');
const scheduler = fs.readFileSync(path.join(root, 'netlify/functions/schedule-client-package.js'), 'utf8');
const planner = fs.readFileSync(path.join(root, 'netlify/functions/lib/package-calendar-planner.js'), 'utf8');

assert.ok(integration.includes("const SCHEDULER_URL = '/.netlify/functions/schedule-client-package'"));
assert.ok(integration.includes("'PT 1:1': 'pt11'"));
assert.ok(integration.includes("'PT 1:2': 'pt12'"));
assert.ok(integration.includes("Circuit: 'circuit'"));
assert.ok(integration.includes('selectedSchedule()'));
assert.ok(integration.includes('sessionsRemainingChanged !== false'));
assert.ok(integration.includes("showToast(`Cliente attivato · sedute da completare:"));
assert.ok(integration.includes('Nessuna ricorrenza infinita') || integration.includes('niente ricorrenze infinite'));
assert.ok(integration.includes('originalExecute = eseguiConferma'));
assert.ok(integration.includes("action: 'confermaCliente'"));
assert.ok(integration.includes('scheduleClientPackage({'));

assert.ok(scheduler.includes("sessionsRemainingChanged: false"));
assert.ok(scheduler.includes("status: 'prenotato'"));
assert.ok(scheduler.includes("await supabaseRequest('rpc/calendar_audit_write'"));
assert.ok(!scheduler.includes('sessions_remaining:') || scheduler.includes('sessionsRemaining: Number(client.sessions_remaining'));

assert.ok(planner.includes('toSchedule: Math.max(0, remaining - scheduled)'));
assert.ok(planner.includes("appointmentStatus(appt) !== 'prenotato'"));
assert.ok(planner.includes("status: 'prenotato'"));

console.log('PASS acquisizione → calendario: pianificazione limitata al pacchetto, appuntamenti reali, residuo protetto');
