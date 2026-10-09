const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.PT_ACCESS_SECRET = 'visibility-test-only';
process.env.SUPABASE_SECRET_KEY = 'visibility-test-only';
const auth = require('../netlify/functions/lib/pt-auth');
const { handler } = require('../netlify/functions/pt-data');

test('client scope includes referents and pending sessions while excluding hibernated clients', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
  const start = html.indexOf('    function isOperationalClient(client)');
  const end = html.indexOf('    function clientsInScope()', start);
  const context = vm.createContext({});
  vm.runInContext(html.slice(start, end) + '\nglobalThis.check = isOperationalClient;', context);
  assert.equal(context.check({ active: true, stato_abbonamento: 'Attivo' }), true);
  assert.equal(context.check({ active: true, stato_abbonamento: 'Attivo', data_conferma: null }), true, 'legacy confirmed client must not disappear because its confirmation date is absent');
  for (const status of ['Non rinnova', 'Da confermare', 'Non confermato', 'Ibernato', 'Sospeso', 'Inattivo', 'In attesa']) assert.equal(context.check({ active: true, stato_abbonamento: status }), false, status);
  assert.equal(context.check({ active: false, stato_abbonamento: 'Attivo' }), false);
  const scopeContext = vm.createContext({appState:{currentPt:{id:'pt-a'},clients:[
    {id:'own',trainer_id:'pt-a'}, {id:'shared',trainer_id:'pt-b',pending_session_pt_ids:['pt-a']}, {id:'foreign',trainer_id:'pt-b'}
  ]},clientTrainerId:c=>c.trainer_id,isAdministrator:()=>false});
  const scopeStart=html.indexOf('    function isVisibleClient(client)');
  const scopeEnd=html.indexOf('    function selectedClient()',scopeStart);
  vm.runInContext(html.slice(scopeStart,scopeEnd)+';globalThis.visible=clientsInScope;',scopeContext);
  assert.deepEqual(Array.from(scopeContext.visible(),c=>c.id),['own','shared']);
  scopeContext.appState.trainerFilter='pt-b';
  assert.deepEqual(Array.from(scopeContext.visible(),c=>c.id),['shared','foreign']);
  scopeContext.appState.trainerFilter='all';
  assert.deepEqual(Array.from(scopeContext.visible(),c=>c.id),['own','shared']);

});

test('new-program entry points are visible in clients and builder, with permission guards and an editor-loading fallback', () => {
  const fs = require('node:fs'), path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
  for (const view of ['clientsView', 'builderView']) {
    const start = html.indexOf(`id="${view}"`);
    const section = html.slice(start, html.indexOf('</section>', start));
    assert.match(section, /data-new-program>Nuovo programma/);
  }
  assert.match(html, /button\.disabled = !hasPt;\s*button\.classList\.remove\("hidden"\)/);
  assert.match(html, /#builderView\.coaching-ready #exerciseStack/);
  assert.doesNotMatch(html, /#builderView #exerciseStack[^\n]*display: none/);
  assert.match(html, /builder\.classList\.add\("coaching-ready"\)/);
});

test('every PT can consult clients by referent while session access stays explicitly assigned', async () => {
  const originalFetch = global.fetch;
  const directory = ['pt-a', 'pt-b', 'pt-empty', 'owner'].map(id => ({
    operator_id: id, email: `${id}@example.test`, active: true,
    legacy_roles: id === 'owner' ? ['PT', 'Direzione'] : ['PT'],
  }));
  const clients = [
    { id: 'a-active', pt_assegnato: 'pt-a', active: true },
    { id: 'a-inactive', pt_assegnato: 'pt-a', active: false },
    { id: 'b-inactive', pt_assegnato: 'pt-b', active: false },
  ];
  const programs = clients.map(c => ({ id: `program-${c.id}`, cliente_id: c.id, data: {} }));
  const requests = [];
  global.fetch = async (url, options = {}) => {
    assert.equal(options.method || 'GET', 'GET', 'bootstrap must not mutate records');
    const u = new URL(url); requests.push(u);
    let rows = [];
    if (u.pathname.endsWith('/operator_effective_roles')) rows = directory;
    else if (u.pathname.endsWith('/operators')) rows = directory.map(o => ({
      id: o.operator_id, active: true, portal_access_enabled: true, portal_access_version: 0,
    })).filter(o => `eq.${o.id}` === u.searchParams.get('id'));
    else if (u.pathname.endsWith('/clients')) rows = clients.filter(c =>
      (!u.searchParams.has('pt_assegnato') || `eq.${c.pt_assegnato}` === u.searchParams.get('pt_assegnato')) &&
      (!u.searchParams.has('active') || `eq.${c.active}` === u.searchParams.get('active')));
    else if (u.pathname.endsWith('/schede_allenamento')) {
      const ids = u.searchParams.get('cliente_id').slice(4, -1).split(',');
      rows = programs.filter(p => ids.includes(p.cliente_id));
    } else if (u.pathname.endsWith('/acquisizioni')) rows = [];
    else if (!/\/(pt_client_shares|pt_program_revisions|pt_exercise_archive|carichi_allenamento|pt_hand_grip_measurements|pt_client_current_programs)$/.test(u.pathname)) {
      throw Error(`Unexpected request: ${u.pathname}`);
    }
    return new Response(JSON.stringify(rows), { status: 200 });
  };
  try {
    for (const id of ['pt-a', 'pt-b', 'pt-empty', 'owner']) {
      const result = await handler({ httpMethod: 'POST', headers: {
        authorization: `Bearer ${auth.signAccessToken(`${id}@example.test`, id, id === 'owner' ? 'owner' : 'pt')}`,
      }, body: JSON.stringify({ action: 'bootstrap' }) });
      assert.equal(result.statusCode, 200);
      const body = JSON.parse(result.body);
      const expected = clients.filter(c => c.active !== false);
      assert.deepEqual(body.clients.map(c => c.id), expected.map(c => c.id), `${id}: inactive clients must not appear`);
      assert.deepEqual(body.programs.map(p => p.cliente_id), expected.map(c => c.id), `${id}: programs must only belong to visible clients`);
      assert.deepEqual(body.clients.map(c => c.active), expected.map(c => c.active), 'status must not be changed');
      assert.equal(body.operators.length, directory.length);
      assert.deepEqual(body.clients.filter(c => c.session_access).map(c => c.id), expected.filter(c => c.pt_assegnato === id).map(c => c.id));
    }
    assert.ok(requests.some(u => u.pathname.endsWith('/clients')));
  } finally { global.fetch = originalFetch; }
});


test('referent selector is always present and changing PT clears stale client searches', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');
  const panel = html.match(/<div class="([^"]*)" id="trainerFilterField">/);
  assert.ok(panel);
  assert.ok(!panel[1].split(/\s+/).includes('hidden'));
  assert.match(html, /<label for="trainerFilter">Scegli PT —/);
  const search = {value:'Cliente A'};
  let renders=0;
  const context=vm.createContext({appState:{trainerFilter:'pt-a',clientFilter:'Cliente A'},document:{getElementById:id=>{assert.equal(id,'clientSearch');return search;}},renderClientList:()=>renders++});
  const start=html.indexOf('    function changeTrainerFilter(value)');
  const end=html.indexOf('    document.getElementById("trainerFilter")',start);
  vm.runInContext(html.slice(start,end)+';changeTrainerFilter("pt-b");',context);
  assert.equal(context.appState.trainerFilter,'pt-b');
  assert.equal(context.appState.clientFilter,'');
  assert.equal(search.value,'');
  assert.equal(renders,1);
});
