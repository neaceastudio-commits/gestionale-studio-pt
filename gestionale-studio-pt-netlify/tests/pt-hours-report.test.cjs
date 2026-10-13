const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../app/calendario-studio/js/pt-session-model'),R=require('../app/calendario-studio/js/pt-hours-report');
const a=(id,date='2026-10-01',extra={})=>({id,date,startTime:'09:00',durationMin:60,serviceId:'pt11',clientIds:['a'],operatorId:'pt',status:'fatto',notes:'[CICLO-PACCHETTO-ID old]',...extra});
test('daily entries reconcile to monthly hours and fees, shared pairs counted once, closed archived clients included',()=>{
 const pair=M.write(a('pair','2026-10-02',{serviceId:'pt12',clientIds:['a','b']}),{version:1,participants:{a:{status:'fatto',cycleId:'old'},b:{status:'noshow',cycleId:'different'}}});
 const rows=[a('prior','2026-09-30',{operatorId:'other'}),a('done'),a('simultaneous','2026-10-01',{clientIds:['b']}),pair,M.withStatus(a('absent','2026-10-03'),'noshow_charged'),a('planned','2026-10-04',{status:'prenotato'}),a('cancel','2026-10-05',{status:'annullato'}),a('provisional','2026-10-06',{notes:'[ORARIO-PROVVISORIO]'})];
 const before=JSON.stringify(rows),r=R.build(rows,[{id:'a',nome:'Archivio',active:false},{id:'b',nome:'Partner'}],'2026-10');
 const total=r.totals.find(t=>t.operator==='pt');assert.equal(total.earnedMin,240);assert.equal(total.workedMin,120);assert.equal(total.cents,4500);
 assert.equal(r.rows.reduce((n,x)=>n+x.earnedMin,0),total.earnedMin);assert.equal(r.rows.reduce((n,x)=>n+x.cents,0),total.cents);assert.equal(r.rows.reduce((n,x)=>n+x.plannedMin,0),total.plannedMin);
 assert.equal(r.rows.find(x=>x.appointment.id==='pair').participants.length,2);assert.equal(r.rows.find(x=>x.appointment.id==='done').participants[0].lesson.label,'#2');assert.equal(r.rows.find(x=>x.appointment.id==='done').participants[0].archived,true);assert.equal(r.rows.find(x=>x.appointment.id==='absent').earnedMin,60);assert.equal(JSON.stringify(rows),before);
});
test('invalid overlaps are visible with zero hours; saved numbering and unavailable historic numbers are explicit',()=>{
 const rows=[a('conflict'),a('duplicate'),a('saved','2026-10-02',{notes:'[PROGRAMMA-PACCHETTO] seduta 4/8'}),a('unknown','2026-10-03',{notes:'',clientIds:['gone']})];
 const r=R.build(rows,[],'2026-10');assert.equal(r.issues.length,2);assert.equal(r.rows[0].earnedMin,0);assert.match(r.rows[0].issue,/sovrapposti/);assert.equal(r.rows[2].participants[0].lesson.label,'4/8');assert.equal(r.rows[3].participants[0].lesson.label,'—');assert.equal(r.rows.reduce((n,x)=>n+x.earnedMin,0),120);
});
