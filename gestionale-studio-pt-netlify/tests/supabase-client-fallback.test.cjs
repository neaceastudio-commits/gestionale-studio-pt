const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.join(__dirname, '../app/calendario-studio/js/supabase.js'),
  'utf8'
);

function response(status, text = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return text;
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
  {
    const calls = [];
    const sync = createSync(async (url, options) => {
      calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      if (calls.length === 1) {
        return response(400, "Could not find the 'data_conferma' column of 'clients' in the schema cache");
      }
      return response(204);
    });

    await sync.pushClient({
      id: 'client-schema',
      nome: 'Schema',
      cognome: 'Fallback',
      email: 'schema@example.test',
      packageCycleStart: '2026-08-03',
      notes: 'ledger',
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[1].options.method, 'POST');
    assert.ok('data_conferma' in calls[0].body);
    assert.ok(!('data_conferma' in calls[1].body));
  }

  {
    const calls = [];
    const sync = createSync(async (url, options) => {
      calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      if (calls.length === 1) {
        return response(400, 'there is no unique or exclusion constraint matching the ON CONFLICT specification');
      }
      return response(204);
    });

    await sync.pushClient({
      id: 'client-patch',
      nome: 'Patch',
      cognome: 'Fallback',
      email: 'patch@example.test',
      notes: 'ledger',
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[1].options.method, 'PATCH');
    assert.ok(calls[1].url.includes('?id=eq.client-patch'));
  }

  console.log('supabase-client-fallback ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
