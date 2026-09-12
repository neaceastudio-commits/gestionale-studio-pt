const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const wrapper = fs.readFileSync(path.join(root, 'app/acquisizione/index-calendar-test.html'), 'utf8');
const integration = fs.readFileSync(path.join(root, 'app/acquisizione/activation-calendar-integration.js'), 'utf8');

assert.ok(wrapper.includes("frame.src = './index.html' + params"));
assert.ok(wrapper.includes("script.src = './activation-calendar-integration.js'"));
assert.ok(wrapper.includes('data-neacea-calendar-integration') || wrapper.includes('dataset.neaceaCalendarIntegration'));
assert.ok(integration.includes("const SCHEDULER_URL = '/.netlify/functions/schedule-client-package'"));
assert.ok(integration.includes('sessionsRemainingChanged !== false'));
assert.ok(integration.includes('selectedSchedule()'));
assert.ok(integration.includes('niente ricorrenze infinite') || integration.includes('Nessuna ricorrenza infinita'));

console.log('PASS wrapper test acquisizione: integrazione calendario caricata senza modificare index.html di produzione');
