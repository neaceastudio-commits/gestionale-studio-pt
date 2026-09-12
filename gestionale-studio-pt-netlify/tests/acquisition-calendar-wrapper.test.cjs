const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const wrapper = fs.readFileSync(path.join(root, 'app/acquisizione/index-calendar-test.html'), 'utf8');
const integration = fs.readFileSync(path.join(root, 'app/acquisizione/activation-calendar-integration.js'), 'utf8');

const production = fs.readFileSync(path.join(root, 'app/acquisizione/index.html'), 'utf8');
assert.equal((production.match(/<script[^>]+src="\.\/activation-calendar-integration\.js[^"]*"/g) || []).length, 1);
assert.ok(production.indexOf('activation-calendar-integration.js') > production.indexOf('verifyAcquisitionAccess().catch(showAccessError)'));
assert.ok(wrapper.includes("window.location.replace('./index.html' + window.location.search + window.location.hash)"));
assert.ok(!wrapper.includes('<iframe') && !wrapper.includes('createElement'));
assert.ok(integration.includes("const SCHEDULER_URL = '/.netlify/functions/schedule-client-package'"));
assert.ok(integration.includes('sessionsRemainingChanged !== false'));
assert.ok(integration.includes('selectedSchedule()'));
assert.ok(integration.includes('niente ricorrenze infinite') || integration.includes('Nessuna ricorrenza infinita'));

console.log('PASS Acquisizione production carica direttamente integrazione calendario; vecchio wrapper reindirizza');
