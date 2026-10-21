const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('a stalled runtime check expires, shares concurrent reads, and recovers on retry', async () => {
  let timeout, requests = 0, recover = false;
  const context = { window: {}, AbortController,
    setTimeout: callback => { timeout = callback; return 1; }, clearTimeout() {},
    fetch: async (url, options) => {
      requests++;
      if (recover) return { ok: true, json: async () => ({ CALENDAR_FLEX_MODE: true }) };
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout'))));
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(__dirname + '/../app/calendario-studio/js/calendar-flex.js', 'utf8'), context);
  const runtime = context.window.CalendarFlex;
  const first = runtime.refresh(), second = runtime.refresh();
  assert.equal(requests, 1);
  timeout();
  assert.equal(await first, false); assert.equal(await second, false);
  assert.equal(await runtime.ready, false);
  recover = true;
  assert.equal(await runtime.refresh(), true);
  assert.equal(requests, 2); assert.equal(runtime.enabled, true);
});
