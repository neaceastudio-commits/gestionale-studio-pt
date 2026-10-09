const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {templateSnapshot}=require('../netlify/functions/lib/pt-templates');
test('new client programs never inherit personal goals or clinical notes',()=>{
 const html=fs.readFileSync(require.resolve('../app/portale-personal-trainer/index.html'),'utf8');
 const context=vm.createContext({normalizeState:s=>s,currentPeriodKey:()=> '2026-10'});
 vm.runInContext(html.slice(html.indexOf('    function emptyClientState('),html.indexOf('    function renderClientList()')),context);
 const state=context.emptyClientState({obiettivo:'PERSONAL_GOAL',note_operative:'CLINICAL_NOTES'});
 assert.equal(state.meta.goal,'');assert.equal(state.meta.generalNotes,'');
 assert.match(html,/button.dataset.view === "builderView"\) \{ openNewProgramModal\(\)/);
});
test('archive studio notes are explicit program settings, not imported client internal notes',()=>{
 const result=templateSnapshot({program:{weeks:[1],settings:{studioNotes:'Indicazioni scritte per il modello',generalNotes:'PRIVATE_CLIENT',client_id:'PRIVATE_ID'},days:[{exercisesByWeek:{1:[{key:'e',name:'Squat'}]}}]}},'Base');
 assert.equal(result.program.settings.studioNotes,'Indicazioni scritte per il modello');
 assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
});
