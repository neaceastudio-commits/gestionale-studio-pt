const assert=require('node:assert/strict'),S=require('../app/calendario-studio/js/client-journey-scoring.js'),M=require('../app/calendario-studio/js/client-journey-model.js'),P=require('../app/calendario-studio/js/pt-session-model.js');
const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const c={id:'a',active:true,notes:''};
const cycle=(id,start,offsets=[0,4,7,11,14,18,21,27])=>({id,startDate:start,sessionsTotal:8,frequency:'2x settimana',legacy:false,offsets});
const appts=cycles=>cycles.flatMap(x=>x.offsets.map((n,i)=>({id:x.id+'-'+i,clientIds:['a'],serviceId:'pt11',date:add(x.startDate,n),startTime:'09:00',status:'fatto',notes:'[CICLO-PACCHETTO-ID '+x.id+']'})));
const run=(cycles,today,extra={})=>M.summarize({...c,...extra},appts(cycles),{today,ledger:{cycles},session:P,audit:extra.audit||[],scoring:S,minMonths:0,minSessions:1});
const timely=cycle('on','2026-01-01');let r=run([timely],'2026-01-28');assert.equal(r.regularity,100);assert.equal(r.timing.packages[0].durationDays,28);
const delayed=cycle('late','2026-01-01',[0,7,14,21,28,35,42,55]);r=run([delayed],'2026-02-25');assert.equal(r.regularity,50);assert.equal(r.attendance,100);assert.equal(r.timing.packages[0].delayDays,28);assert.equal(r.top,false);
// Finished packages stop ageing, and breaks between them have no penalty.
assert.equal(run([timely],'2026-10-11').regularity,100);
assert.equal(run([timely,cycle('second','2026-03-01')],'2026-03-28').regularity,100);
const averaged=run([timely,cycle('late2','2026-03-01',[0,7,14,21,28,35,42,55])],'2026-04-25');assert.equal(averaged.regularity,75);
// Current packages are penalized only once they exceed the agreed duration.
const open=cycle('open','2026-01-01',[0,7]);assert.equal(run([open],'2026-01-28').regularity,100);assert.ok(Math.abs(run([open],'2026-02-11').regularity-100*28/42)<1e-9);
r=run([delayed],'2026-02-25',{notes:'Pausa Studio | 2026-01-29 | 2026-02-25 | Chiusura documentata'});assert.equal(r.regularity,100);assert.equal(r.timing.packages[0].excludedDays,28);
// No access to the audit log is required, and moves do not independently lower the score.
r=run([timely],'2026-01-28',{audit:Array.from({length:10},(_,i)=>({id:i,action:'appointment_moved'}))});assert.equal(r.regularity,100);
r=M.summarize(c,appts([timely]),{today:'2026-01-28',ledger:{cycles:[timely]},session:P,scoring:S,minMonths:0,minSessions:1});assert.equal(r.regularity,100);assert.equal(r.top,true);
r=run([{...timely,frequency:'',days:[]}],'2026-01-28');assert.equal(r.regularity,null);assert.ok(r.timing.warnings.length);
// Incomplete history is skipped without fabricating durations or hiding usable packages.
r=run([{...timely,frequency:'',days:[]},cycle('second','2026-03-01')],'2026-03-28');assert.equal(r.regularity,100);assert.equal(r.timing.packages.length,1);
r=run([open,cycle('second','2026-03-01')],'2026-03-28');assert.equal(r.regularity,100);assert.equal(r.timing.packages.length,1);
assert.equal(S.excludedDays('2026-01-01','2026-01-11',[{from:'2026-01-02',to:'2026-01-07'},{from:'2026-01-05',to:'2026-01-09'}]),7);
const noShowRows=appts([timely]);noShowRows[0].status='noshow';const absent=M.summarize(c,noShowRows,{today:'2026-01-28',ledger:{cycles:[timely]},session:P,scoring:S});assert.equal(absent.regularity,100);assert.equal(absent.attendance,87.5);assert.ok(M.summarize(c,noShowRows,{today:'2026-02-11',ledger:{cycles:[timely]},session:P,scoring:S}).regularity<100);
const chargedRows=noShowRows.map((a,i)=>i? a:P.withStatus(a,'noshow_charged'));assert.equal(M.summarize(c,chargedRows,{today:'2026-02-11',ledger:{cycles:[timely]},session:P,scoring:S}).regularity,100);
const paired=noShowRows.map(a=>P.write({...a,serviceId:'pt12',clientIds:['a','b']},{version:1,participants:{a:{status:a.status,cycleId:'on',start:'2026-01-01'},b:{status:'prenotato',cycleId:'other',start:'2026-01-01'}}}));assert.equal(M.summarize(c,paired,{today:'2026-01-28',ledger:{cycles:[timely]},session:P,scoring:S}).regularity,100);
assert.equal(S.frequency({frequency:'Su richiesta',days:['Lunedì']}),null);assert.equal(S.frequency({frequency:'Mensile',days:['Lunedì']}),0.25);assert.equal(S.frequency({frequency:'Bisettimanale'}),0.5);assert.equal(S.frequency({days:['']}),null);
assert.equal(S.documentation('Pausa concordata | 2026-02-30 | 2026-03-01 | prova').pauses.length,0);
console.log('PASS tempi pacchetti: durata doppia 50%, media semplice, pacchetti in corso, pause documentate, nessuna penalità per stacchi/spostamenti, presenze separate, coppie e dati mancanti');
