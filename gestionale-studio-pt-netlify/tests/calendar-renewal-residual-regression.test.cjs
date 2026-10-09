const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const rows=[];const context=vm.createContext({console,CONFIG:{SERVICES:{pt11:{},pt12:{}}},State:{getAppointments:()=>rows}});
 for(const [f,name] of [['package-ledger.js','PackageLedger'],['pt-session-model.js','PTSessionModel'],['services.js','Services']])vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/'+f,'utf8')+`\nglobalThis.${name}=${name};`,context);
 const client=(id,adjust=0)=>({id,sessionsTotal:12,sessionsRemaining:4,packageCycleStart:'2026-09-14',notes:'[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({version:1,cycles:[{id:'legacy_'+id,legacy:true,startDate:'2026-09-14',sessionAdjustments:adjust?[{sessions:adjust,note:'Chiusura residuo dichiarata dalla Direzione'}]:[]}]})+'[/NEACEA-PACKAGE-LEDGER-V1]'});
 for(let i=0;i<11;i++)rows.push(context.PTSessionModel.write({id:'a'+i,clientIds:['a','b'],serviceId:'pt12',date:'2026-09-'+String(14+i).padStart(2,'0'),status:'fatto'},{version:1,participants:{a:{cycleId:i<3?'':'legacy_a',start:'2026-09-14',status:'fatto'},b:{cycleId:i<3?'':'legacy_b',start:'2026-09-14',status:i===0?'noshow':'fatto'}}}));
 rows.push({id:'future',clientIds:['a','b'],serviceId:'pt12',date:'2099-10-12',status:'prenotato',notes:'[RINNOVO-PREVISTO pending]'});
 return {context,rows,client};
}
test('legacy pair sessions all count; a Direction adjustment closes only one balance, never trainer fees',()=>{
 const {context:c,rows,client}=fixture(),before=c.PTSessionModel.summary(rows,'2026-09');
 const a=c.Services.getClientSessionMetrics(client('a',1)),b=c.Services.getClientSessionMetrics(client('b'));
 assert.equal(a.completed,11);assert.equal(a.sessionAdjustment,1);assert.equal(a.remaining,0);
 assert.equal(b.completed,10);assert.equal(b.chargedAbsences,1);assert.equal(b.remaining,1);
 assert.deepEqual(c.PTSessionModel.summary(rows,'2026-09'),before);
 const renewed=client('a',1);const l=JSON.parse(renewed.notes.split('[NEACEA-PACKAGE-LEDGER-V1]')[1].split('[/')[0]);l.cycles[0].closedAt='2026-10-10';l.cycles.push({id:'new',legacy:false,startDate:'2026-10-12'});renewed.notes='[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify(l)+'[/NEACEA-PACKAGE-LEDGER-V1]';renewed.sessionsTotal=8;
 assert.equal(c.Services.getClientSessionMetrics(renewed).remaining,8);assert.equal(c.Services.getClientSessionMetrics(renewed).sessionAdjustment,0);
});
