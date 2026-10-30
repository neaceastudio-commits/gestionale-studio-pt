const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const L=require('../app/calendario-studio/js/package-ledger');
const {createService}=require('../netlify/functions/lib/calendar-client-finance');
const {createHandler}=require('../netlify/functions/calendar-client-finance');
const actor={id:'owner',role:'owner'},copy=o=>JSON.parse(JSON.stringify(o));
function setup(){
 let row={id:'c',email:'test@example.invalid',active:true,notes:'Note da preservare',importo:300,stato_pagamento:'Da pagare',package_start:'2026-10-01',sessions_total:8};
 let payments=[],writes=0,failAfterWrite=false,failRead=false,duplicates=false,invoiceFail=false,failSave=false,missingIdentity=false;const calls=[];
 const db=async(table,opts)=>{
  if(table==='clients')return opts.query.includes('email=')?(duplicates?[{id:'c'},{id:'other'}]:[{id:'c'}]):[copy(row)];
  assert.equal(table,'rpc/calendar_save_client_finance');const b=opts.body;
  if(failSave)throw Error('CONFLICT');
  assert.equal(b.p_actor_id,'owner');assert.deepEqual(b.p_expected,{notes:row.notes,importo:row.importo,stato_pagamento:row.stato_pagamento,email:row.email});
  row={...row,...b.p_values};return copy(row);
 };
 const upstream=async(action,p)=>{
  calls.push({action,p:copy(p)});assert.equal(p._token,undefined);
  if(action==='getCliente')return {cliente:missingIdentity?null:{email:row.email,active:true}};
  if(action==='getFatture'){if(invoiceFail)throw Error('NO');return {fatture:[{id:'mine',email:row.email,numero_label:'1/2026',totale:300},{id:'other',email:'other@example.invalid',codice_fiscale:'PRIVATE'}]};}
  if(action==='getPagamenti'){if(failRead)throw Error('OFFLINE');return {pagamenti:copy(payments)};}
  assert.equal(action,'addPagamentoCondiviso');writes++;const i=payments.findIndex(x=>x.id===p.id);if(i<0)payments.push(copy(p));else payments[i]=copy(p);
  if(failAfterWrite){failAfterWrite=false;throw Error('Risposta persa');}return {success:true};
 };
 const service=createService({db,upstream});
 const handle=p=>service.handle(actor,{clientId:'c',...p});
 const split=()=>handle({action:'split',expectedNotes:row.notes,pt:200,nutrition:100,total:300});
 const cycle=()=>L.currentCycle(row);
 return {handle,split,cycle,calls,get row(){return row},get payments(){return payments},get writes(){return writes},set failAfterWrite(v){failAfterWrite=v},set failRead(v){failRead=v},set duplicates(v){duplicates=v},set invoiceFail(v){invoiceFail=v},set failSave(v){failSave=v},set missingIdentity(v){missingIdentity=v}};
}
test('incasso condiviso, conferma per rilettura, nessuna fattura duplicata, riapertura e retry idempotente',async()=>{
 const s=setup();await s.split();const requestId=crypto.randomUUID(),input={action:'register',cycleId:s.cycle().id,requestId,amount:'120,50',date:'2026-10-01',method:'Carta'};
 await s.handle(input);assert.equal(s.writes,1);assert.equal(s.payments.length,1);assert.equal(s.row.stato_pagamento,'Parziale');assert.equal(L.cycleFinancial(s.cycle()).paid,120.5);assert.equal(s.cycle().sharedPending,undefined);
 await s.handle(input);assert.equal(s.writes,1);assert.equal(s.payments.length,1);
 const read=await s.handle({action:'list',year:2026});assert.equal(read.invoices.length,1);assert.equal(read.invoices[0].id,'mine');assert.equal(read.finance.balance,179.5);assert.equal(read.payments[0].linked,true);
 assert.equal(s.calls.some(c=>c.action==='emettiFattura'),false);
 assert.throws(()=>L.recordPayment({...s.row,statoPagamento:s.row.stato_pagamento},{},{amount:10,date:'2026-10-01'}),/condivisi/);
});
test('risposta persa dopo la scrittura: pending persistito, rilettura ripara senza invio duplicato',async()=>{
 const s=setup();await s.split();s.failAfterWrite=true;
 await assert.rejects(s.handle({action:'register',cycleId:s.cycle().id,requestId:crypto.randomUUID(),amount:300,date:'2026-10-01'}),/persa/);
 assert.ok(s.cycle().sharedPending);assert.equal(s.row.stato_pagamento,'Da pagare');
 const result=await s.handle({action:'retry',cycleId:s.cycle().id});assert.equal(result.confirmed,true);assert.equal(s.writes,1);assert.equal(s.row.stato_pagamento,'Pagato');
});
test('pagamento storico: associazione esplicita senza modificare il record sorgente',async()=>{
 const s=setup();await s.split();s.payments.push({id:'old',email:s.row.email,data:'2026-09-01',importo:100,servizio:'Nutrizione',note:'Originale'});
 const before=copy(s.payments[0]);await s.handle({action:'associate',cycleId:s.cycle().id,paymentId:'old'});
 assert.equal(s.writes,0);assert.deepEqual(s.payments[0],before);assert.equal(s.row.stato_pagamento,'Parziale');
 await s.handle({action:'associate',cycleId:s.cycle().id,paymentId:'old'});assert.equal(L.cycleFinancial(s.cycle()).paid,100);
 s.payments[0].importo=80;assert.equal((await s.handle({action:'list'})).finance.paid,80);
 s.payments.length=0;assert.equal((await s.handle({action:'list'})).finance.paid,0);
});
test('nessun saldo dedotto dalle fatture o da incassi di un altro ciclo',async()=>{
 const s=setup();await s.split();const ledger=L.parse(s.row);ledger.cycles.unshift({id:'older',amount:300,closedAt:'2026-09-01',financeSource:'scadenze',sharedPaymentIds:['other']});s.row.notes=L.serialize(s.row.notes,ledger);
 s.payments.push({id:'other',email:s.row.email,data:'2026-10-01',importo:300,note:'Storico'});
 const result=await s.handle({action:'list'});assert.equal(result.finance.paid,0);assert.equal(result.payments[0].assigned,true);assert.equal(result.payments[0].linked,false);
 await assert.rejects(s.handle({action:'associate',cycleId:s.cycle().id,paymentId:'other'}),/altro ciclo/);
});
test('permessi gateway, identità email, conflitto, dati malformati e guasto provider',async()=>{
 const oldPage=createHandler({auth:async()=>actor,database:()=>assert.fail('old page must not access DB'),provider:()=>assert.fail('old page must not access provider')});
 assert.equal((await oldPage({httpMethod:'POST',body:JSON.stringify({calendarRevision:'20261026-client-save-v2',action:'register'})})).statusCode,409);
 for(const identity of [null,{id:'pt',role:'pt'},{id:'sec',role:'secretary'}]){
  const handler=createHandler({auth:async()=>identity,database:()=>assert.fail('no DB'),provider:()=>assert.fail('no provider')});
  const r=await handler({httpMethod:'POST',body:JSON.stringify({action:'list'})});assert.equal(r.statusCode,identity?403:401);
 }
 const s=setup();await s.split();s.duplicates=true;await assert.rejects(s.handle({action:'list'}),/più clienti/);s.duplicates=false;
 await assert.rejects(s.handle({action:'split',expectedNotes:'stale',total:300,pt:200,nutrition:100}),/cambiati/);
 await assert.rejects(s.handle({action:'split',cycleId:'altra-decorrenza',expectedNotes:s.row.notes,total:300,pt:200,nutrition:100}),/decorrenza/);
 s.failRead=true;await assert.rejects(s.handle({action:'list'}),/OFFLINE/);s.failRead=false;
 s.invoiceFail=true;assert.match((await s.handle({action:'list'})).invoiceError,/non disponibile/);
 s.payments.push({id:'bad',email:'foreign@example.invalid',importo:1});await assert.rejects(s.handle({action:'list'}),/incoerente/);
});
test('nessun incasso se il salvataggio preparatorio fallisce o la quota manca',async()=>{
 const s=setup(),input={action:'register',requestId:crypto.randomUUID(),amount:1,date:'2026-10-01'};
 const listing=await s.handle({action:'list'});input.cycleId=listing.cycleId;
 await assert.rejects(s.handle(input),/quote/);await s.split();s.failSave=true;
 await assert.rejects(s.handle(input),/CONFLICT/);assert.equal(s.writes,0);
});
test('solo PT senza anagrafica Nutrizione: nessuna creazione implicita e nessun incasso bloccato in attesa',async()=>{
 const s=setup();await s.split();s.missingIdentity=true;
 await assert.rejects(s.handle({action:'register',cycleId:s.cycle().id,requestId:crypto.randomUUID(),amount:100,date:'2026-10-01'}),/solo PT/);
 assert.equal(s.cycle().sharedPending,undefined);assert.equal(s.writes,0);
});
test('incasso in attesa protegge rinnovo e modifica delle quote; dati diversi non riutilizzano la richiesta',async()=>{
 const s=setup();await s.split();s.failAfterWrite=true;const input={action:'register',cycleId:s.cycle().id,requestId:crypto.randomUUID(),amount:100,date:'2026-10-01'};
 await assert.rejects(s.handle(input));
 assert.throws(()=>L.renew(s.row,{},{}),/conferma/);
 await assert.rejects(s.handle({...input,amount:150}),/altri dati/);
 await assert.rejects(s.handle({action:'split',expectedNotes:s.row.notes,total:300,pt:150,nutrition:150}),/Completa prima/);
 assert.equal(s.writes,1);
});
