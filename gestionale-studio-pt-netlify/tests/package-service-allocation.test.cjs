const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/calendario-studio/js/package-ledger.js','utf8')+'\nglobalThis.L=PackageLedger',ctx);const L=ctx.L;
const client={id:'test',importo:300,statoPagamento:'Da pagare',packageStart:'2026-10-01',notes:'Note originali',sessionsTotal:8};
test('quote esplicite: totale invariato, zero ammesso, riapertura e storico preservati',()=>{
 const result=L.setServiceAmounts(client,{}, {pt:'200,00',nutrition:'100'});
 assert.equal(result.client.importo,300);assert.equal(result.client.statoPagamento,'Da pagare');assert.match(result.client.notes,/Note originali/);
 assert.equal(L.currentCycle(L.parse(result.client)).serviceAmounts.pt,200);
 assert.equal(L.currentCycle(L.parse(result.client)).serviceAmounts.nutrition,100);
 assert.equal(L.currentCycle(L.parse(L.setServiceAmounts(client,{}, {pt:300,nutrition:0}).client)).serviceAmounts.nutrition,0);
 assert.equal(L.currentCycle(L.parse(L.setServiceAmounts(client,{}, {pt:0,nutrition:300}).client)).serviceAmounts.pt,0);
 assert.equal(L.currentCycle(L.ensure(client)).serviceAmounts,undefined);
});
test('quote incongruenti, valori non validi e variazioni totale non cancellano la suddivisione',()=>{
 for(const values of [{pt:200,nutrition:50},{pt:'',nutrition:300},{pt:-1,nutrition:301},{pt:'abc',nutrition:0}])assert.throws(()=>L.setServiceAmounts(client,{},values));
 const result=L.setServiceAmounts(client,{}, {pt:200,nutrition:100});
 assert.throws(()=>L.updateCurrentAmount(result.client,{},400),/quote/);
});
