const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../app/calendario-studio/js/supabase.js'),
  'utf8'
);

function response(status, body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body;
    },
  };
}

function createSync(fetchImpl) {
  const context = {
    console,
    fetch: fetchImpl,
    State: {
      getAppointments: () => [],
      saveAppointments: () => {},
      saveClients: () => {},
      saveOperators: () => {},
      genId: prefix => `${prefix}-test`,
    },
    CONFIG: {
      SERVICES: { pt11: { durationMin: 60, bufferMin: 10 }, nutrizione: { durationMin: 60, bufferMin: 10 } },
      defaultBufferMin: 10,
    },
    localStorage: { setItem: () => {} },
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__SupabaseSync = SupabaseSync;`, context);
  return context.__SupabaseSync;
}

(async () => {
  const calls = [];
  const sync = createSync(async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return response(200, JSON.stringify([{ id: 'client/payment test' }]));
  });

  const saved = await sync.updateClientPackageFinance({
    id: 'client/payment test',
    nome: 'Non deve essere inviato',
    email: 'non-inviare@example.test',
    codiceFiscale: 'NONINVIARE',
    packageTypes: ['PT 1:1'],
    notes: '[NEACEA-PACKAGE-LEDGER-V1]{"payments":[{"amount":25}]}[/NEACEA-PACKAGE-LEDGER-V1]',
    statoPagamento: 'Parziale',
    importo: 150,
  });

  assert.equal(saved.id, 'client/payment test');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.ok(calls[0].url.endsWith('/clients?id=eq.client%2Fpayment%20test'));
  assert.ok(!calls[0].url.includes('on_conflict'));
  assert.equal(calls[0].options.headers.Prefer, 'return=representation');
  assert.deepEqual(Object.keys(calls[0].body).sort(), [
    'importo',
    'notes',
    'stato_pagamento',
    'updated_at',
  ]);
  assert.equal(calls[0].body.stato_pagamento, 'Parziale');
  assert.equal(calls[0].body.importo, 150);
  assert.ok(calls[0].body.notes.includes('"amount":25'));
  assert.ok(!('email' in calls[0].body));
  assert.ok(!('codice_fiscale' in calls[0].body));

  let missingIdCalled = false;
  const missingIdSync = createSync(async () => {
    missingIdCalled = true;
    return response(500);
  });
  const missingIdResult = await missingIdSync.updateClientPackageFinance({ notes: 'ledger' });
  assert.ok(missingIdResult.error.includes('ID cliente'));
  assert.equal(missingIdCalled, false);

  console.log('package-payment-persistence ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
