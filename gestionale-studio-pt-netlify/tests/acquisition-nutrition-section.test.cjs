const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../app/acquisizione/index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/verifyAcquisitionAccess\(\)\.catch\(showAccessError\);\s*$/,'');
function setup({failure=false,conflict=false,pt=false,converted=false}={}){
 let row={id:'acq_demo',nome:'Cliente',cognome:'Esempio',servizi:'Nutrizione',stato:converted?'Convertito':'Pronto a iniziare',impressioni:'Patologie: risposta da conservare\n[ANAMNESI_CLIENTE PT]contenuto[/ANAMNESI_CLIENTE]',updated_at:'2026-09-11T10:00:00Z'};
 const calls=[];
 const ctx=vm.createContext({console,URL,setTimeout,clearTimeout,fetch:async(url,opts={})=>{
  calls.push({url,opts});assert.ok(url.includes('/acquisizioni?'));
  let data=[row];
  if(opts.method==='PATCH'){
   if(failure)return{ok:false,status:500,text:async()=> 'Errore salvataggio'};
   if(conflict)data=[];
   else{row={...row,...JSON.parse(opts.body)};data=[row];}
  }else if(opts.method==='POST'){row={...row,...JSON.parse(opts.body)};data=[row];}
  return{ok:true,status:200,text:async()=>JSON.stringify(data)};
 }});
 vm.runInContext(script,ctx);ctx.row=row;vm.runInContext(`acquisizioni=[acqFromDb(row)];accessState={authorized:true,mode:'${pt?'pt':'owner'}'};`,ctx);
 return{ctx,calls,row:()=>row,local:()=>vm.runInContext('acquisizioni[0]',ctx)};
}
test('spostamento manuale persistente e ritorno PT conservano dati e stato',async()=>{
 const env=setup();const before=env.row();
 assert.equal(env.ctx.isNutritionSection(before),false);
 assert.equal(env.ctx.isActivePtLead(before),true);
 assert.equal((await env.ctx.moveAcquisitionSection(before.id,true)).success,true);
 assert.equal(env.ctx.isNutritionSection(env.row()),true);
 assert.equal(env.ctx.isActivePtLead(env.local()),false);
 assert.equal(env.row().stato,before.stato);
 assert.ok(env.row().impressioni.includes(before.impressioni));
 assert.ok(env.calls[1].url.includes('updated_at=eq.'));
 assert.deepEqual(Object.keys(JSON.parse(env.calls[1].opts.body)).sort(),['impressioni','updated_at']);
 assert.equal((await env.ctx.moveAcquisitionSection(before.id,false)).success,true);
 assert.equal(env.row().impressioni,before.impressioni);
 assert.equal(env.ctx.isActivePtLead(env.local()),true);
});
test('nessuno spostamento locale quando il server fallisce o la scheda è cambiata',async()=>{
 for(const config of [{failure:true},{conflict:true}]){const env=setup(config);assert.ok((await env.ctx.moveAcquisitionSection('acq_demo',true)).error);assert.equal(env.ctx.isNutritionSection(env.local()),false);}
});
test('nessuna attivazione del calendario dalla sezione Nutrizione',async()=>{
 const env=setup();await env.ctx.moveAcquisitionSection('acq_demo',true);const count=env.calls.length;
 assert.ok((await env.ctx.apiFetch({action:'confermaCliente',id:'acq_demo'})).error);
 assert.equal(env.calls.length,count);
});
test('modificare le note conserva la sezione scelta',async()=>{
 const env=setup();await env.ctx.moveAcquisitionSection('acq_demo',true);
 await env.ctx.apiFetch({action:'saveAcquisizione',id:'acq_demo',nome:'Cliente',cognome:'Esempio',impressioni:'Nuova nota',servizi:'Nutrizione'});
 assert.equal(env.ctx.isNutritionSection(env.row()),true);
 assert.ok(env.row().impressioni.includes('Nuova nota'));
 assert.ok(!env.ctx.visibleLeadNote(env.row().impressioni).includes('ACQUISIZIONE_SEZIONE'));
});
test('permessi e clienti già attivati restano protetti',async()=>{
 const pt=setup({pt:true});assert.ok((await pt.ctx.moveAcquisitionSection('acq_demo',true)).error);assert.equal(pt.calls.length,0);
 const done=setup({converted:true});assert.ok((await done.ctx.moveAcquisitionSection('acq_demo',true)).error);assert.equal(done.calls.length,1);
});
