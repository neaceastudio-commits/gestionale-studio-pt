const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('shared session starts from selected workout prescription, never another session performance',()=>{
 const context={window:{},Map};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/portale-personal-trainer/js/session-log.js'),'utf8'),context);
 const state={sheets:{A:[{id:'e',name:'Squat',coachingActiveWeeks:[1,2],weekSets:[[{reps:'5',load:'80',rir:'0',sessionNote:'previous'}],[{reps:'8',load:''}]]}],B:[]},coachingEditorSnapshot:{program:{days:[{letter:'A',exercisesByWeek:{1:[{key:'e',name:'Squat',reps:'10'}],2:[{key:'e',name:'Squat',reps:'12'}]}}]}}};
 const rows=context.window.PTSessionLog.rowsForWorkout(state,'A',0);
 assert.equal(rows.length,1);assert.equal(rows[0].reps,'10');assert.equal(rows[0].load,'');assert.equal(rows[0].notes,'');assert.equal(rows[0].rir,'');
 assert.equal(context.window.PTSessionLog.rowsForWorkout(state,'A',1)[0].reps,'12');
 assert.equal(context.window.PTSessionLog.rowsForWorkout(state,'B',0).length,0);assert.equal(state.sheets.A[0].weekSets[0][0].load,'80');
});
