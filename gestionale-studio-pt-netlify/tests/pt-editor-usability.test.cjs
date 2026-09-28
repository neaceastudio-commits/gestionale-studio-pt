const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../app/portale-personal-trainer/index.html'), 'utf8');

test('every PT including owner defaults to own clients including history; wider owner scope requires explicit choice', () => {
  const appState = { currentPt: { id: 'a', role: 'pt' }, trainerFilter: '', clients: [
    { client_id: 'mine', pt: 'a', active: true },
    { client_id: 'other', pt: 'b', active: true },
    { client_id: 'old', pt: 'a', active: false },
  ] };
  const scope = { value: 'active' };
  const context = vm.createContext({ appState, document: { getElementById: () => scope },
    clientTrainerId: c => c.pt, isAdministrator: p => p.role === 'owner' });
  vm.runInContext(html.slice(html.indexOf('    function myClients()'), html.indexOf('    function selectedClient()')) + '\nglobalThis.visible = clientsInScope;', context);
  const ids = () => Array.from(context.visible(), c => c.client_id);
  assert.deepEqual(ids(), ['mine', 'old']);
  appState.trainerFilter = 'all';
  assert.deepEqual(ids(), ['mine', 'old'], 'ordinary PT cannot widen access');
  appState.currentPt.role = 'owner'; appState.trainerFilter = '';
  assert.deepEqual(ids(), ['mine', 'old']);
  appState.trainerFilter = 'all'; assert.deepEqual(ids(), ['mine', 'other', 'old']);
  appState.trainerFilter = 'b'; assert.deepEqual(ids(), ['other']);
  appState.trainerFilter = ''; scope.value = 'history'; assert.deepEqual(ids(), ['mine', 'old']);
  appState.currentPt.id = 'empty'; scope.value = 'active'; assert.deepEqual(ids(), []);
});

test('metadata starts collapsed and both footer save buttons use the existing save pipeline', () => {
  assert.match(html, /<details class="panel program-setup" id="sheetEditorPanel">/);
  for (const id of ['saveBottomBtn', 'saveSheetBottomBtn']) {
    assert.match(html, new RegExp(`id="${id}" type="button">Salva scheda`));
    assert.ok(html.includes(`document.getElementById("${id}").addEventListener("click", saveProgramToSupabase)`));
  }
  assert.ok(html.includes("fields.filter(field => !field.closest('#loginScreen'))"));
});

test('editor restores scroll across render and sync, focuses additions without jumping to the top', () => {
  const source = fs.readFileSync(path.join(__dirname, '../tools/coaching-editor/src/vendor/components/program-editor.ts'), 'utf8');
  const adapter = fs.readFileSync(path.join(__dirname, '../tools/coaching-editor/src/index.ts'), 'utf8');
  assert.match(source, /rememberEditorScroll\(root\)/);
  assert.match(source, /disableContactAutofill\(root\)/);
  assert.match(source, /focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(source, /scrollIntoView\(\{\s*block:\s*'nearest'/);
  assert.match(adapter, /rememberEditorScroll\(host\)/);
});

test('older programs stay available for archive, edit and trash; archived flag remains respected',()=>{
 const context=vm.createContext({appState:{selectedClientId:'c',programs:[
  {id:'old',client_id:'c',created_at:'2025-01-01',archived:false},
  {id:'trash',client_id:'c',created_at:'2025-01-01',archived:true},
  {id:'foreign',client_id:'other',archived:false}
 ]}});
 vm.runInContext(html.slice(html.indexOf('    function programsForClient('),html.indexOf('    function programLabel('))+';globalThis.list=programsForClient;',context);
 assert.deepEqual(Array.from(context.list(),p=>p.id),['old']);
 assert.deepEqual(Array.from(context.list('c',true),p=>p.id),['old','trash']);
 const buttonAt=html.indexOf('id="saveTemplateBtn"');
 const detailsStart=html.indexOf('<details class="panel program-setup"');
 assert.ok(buttonAt<detailsStart,'archive action is visible outside collapsed setup');
});
