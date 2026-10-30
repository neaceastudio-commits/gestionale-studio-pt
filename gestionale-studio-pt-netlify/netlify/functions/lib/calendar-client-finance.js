'use strict';
const L=require('../../../app/calendario-studio/js/package-ledger');
const email=v=>String(v||'').trim().toLowerCase();
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status})};
const paymentNote=p=>[p.note,'Metodo: '+p.method].filter(Boolean).join('\n');
const matchesPending=(p,pending)=>p.importo===pending.amount&&p.data===pending.date&&p.servizio===pending.service&&p.note===paymentNote(pending);
function mappedClient(row){return {...row,statoPagamento:row.stato_pagamento,packageStart:row.package_start,packageCycleStart:String(row.notes||'').match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/)?.[1]||row.data_conferma,sessionsTotal:row.sessions_total};}
function financeFields(row){return Object.fromEntries(['notes','importo','stato_pagamento'].map(k=>[k,row[k]??null]));}
function values(client){return {notes:client.notes,importo:client.importo,stato_pagamento:client.statoPagamento};}
function validDate(value){
 const s=String(value||''),date=new Date(s+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==s)fail('Data incasso non valida',400);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(s>today)fail('Indica la data di un incasso già ricevuto',400);return s;
}
function createService({db,upstream}){
 async function load(id){
  if(!id||typeof id!=='string'||id.length>200)fail('Seleziona un cliente',400);
  const rows=await db('clients',{query:'?select=id,email,active,notes,importo,stato_pagamento,package_start,data_conferma,sessions_total&id=eq.'+encodeURIComponent(id)});
  if(rows.length!==1||rows[0].active===false)fail('Cliente attivo non trovato',404);return rows[0];
 }
 async function save(actor,row,client){
  const result=await db('rpc/calendar_save_client_finance',{method:'POST',body:{p_actor_id:actor.id,p_client_id:row.id,p_expected:{...financeFields(row),email:row.email??null},p_values:values(client)}});
  if(!result||result.id!==row.id||result.notes!==client.notes||Number(result.importo)!==Number(client.importo)||result.stato_pagamento!==client.statoPagamento)fail('Salvataggio economico non confermato');
  return result;
 }
 async function paymentsFor(row){
  const address=email(row.email);if(!address)fail('Aggiungi l’email del cliente per collegare Gestione Scadenze',400);
  const same=await db('clients',{query:'?select=id&email=ilike.'+encodeURIComponent(address.replace(/[\\%_*]/g,'\\$&'))});
  if(same.length!==1||same[0].id!==row.id)fail('Email condivisa da più clienti: correggi l’anagrafica prima del collegamento');
  const result=await upstream('getPagamenti',{email:address});
  if(!Array.isArray(result.pagamenti))fail('Risposta incassi non valida',502);
  const seen=new Set();
  return result.pagamenti.map(p=>{
   if(email(p.email)!==address||!p.id||seen.has(String(p.id))||!Number.isFinite(Number(p.importo))||Number(p.importo)<0)fail('Registro incassi incoerente: verifica Gestione Scadenze',502);
   seen.add(String(p.id));return {...p,id:String(p.id),importo:L.roundMoney(p.importo)};
  });
 }
 function current(row){const client=mappedClient(row),parsed=L.parse(client);if(parsed.parseError)fail(parsed.parseError);const ledger=parsed.cycles.length?parsed:L.ensure(client),cycle=L.currentCycle(ledger);return {client,ledger,cycle};}
 function synchronize(row,payments){
  const {client,ledger}=current(row);
  if(!ledger.cycles.some(c=>c.financeSource==='scadenze'))return client;
  for(const cycle of ledger.cycles.filter(c=>c.financeSource==='scadenze')){
   const pending=cycle.sharedPending,confirmed=pending&&payments.find(p=>p.id===pending.id);
   if(confirmed){
    if(!matchesPending(confirmed,pending))fail('L’incasso in attesa ha dati diversi in Scadenze: verifica il registro prima di procedere');
    cycle.sharedPaymentIds=[...new Set([...(cycle.sharedPaymentIds||[]),pending.id])];
    cycle.sharedPaymentMethods={...cycle.sharedPaymentMethods,[pending.id]:pending.method};delete cycle.sharedPending;
   }
   cycle.payments=payments.filter(p=>(cycle.sharedPaymentIds||[]).includes(p.id)).map(p=>({id:'scadenze_'+p.id,source:'scadenze',externalId:p.id,kind:'incasso',amount:p.importo,date:p.data,method:cycle.sharedPaymentMethods?.[p.id]||'Scadenze',note:'Incasso condiviso con Gestione Scadenze'}));
   cycle.openingPaidAmount=0;cycle.legacyPaymentStatus='';
  }
  return L.applyToClient(client,ledger);
 }
 async function refresh(actor,row,payments){
  const next=synchronize(row,payments);
  if(JSON.stringify(financeFields(row))!==JSON.stringify(values(next)))row=await save(actor,row,next);
  return row;
 }
 async function handle(actor,input){
  let row=await load(input.clientId);let state=current(row);
  if(input.action==='split'){
   if(input.cycleId&&input.cycleId!==state.cycle.id)fail('La decorrenza del ciclo non coincide con i dati salvati: verifica il pacchetto prima di dividere le quote');
   if(state.cycle.sharedPending)fail('Completa prima la conferma dell’incasso in corso');
   if(input.expectedNotes!==row.notes)fail('Dati cambiati: aggiorna prima di salvare');
   return {client:await save(actor,row,L.setServiceAmounts(state.client,{},input).client)};
  }
  let payments=await paymentsFor(row);
  if(input.action==='list'){
   row=await refresh(actor,row,payments);state=current(row);
   const year=Number(input.year||new Date().getFullYear());if(!Number.isInteger(year)||year<2001||year>2100)fail('Anno non valido',400);
   let invoices=[],invoiceError='';
   try {const data=await upstream('getFatture',{anno:year});if(!Array.isArray(data.fatture))throw Error();invoices=data.fatture.filter(f=>email(f.email)===email(row.email)).map(f=>({id:f.id,label:f.numero_label,date:f.data_fattura,total:f.totale,status:f.stato,description:f.prestazione}));}
   catch {invoiceError='Registro fatture non disponibile: gli incassi sono stati verificati separatamente';}
   return {client:row,cycleId:state.cycle.id,finance:L.cycleFinancial(state.cycle),pending:state.cycle.sharedPending||null,checkedAt:new Date().toISOString(),year,invoices,invoiceError,
    payments:payments.map(p=>({id:p.id,date:p.data,amount:p.importo,service:p.servizio,linked:(state.cycle.sharedPaymentIds||[]).includes(p.id),assigned:state.ledger.cycles.some(c=>(c.sharedPaymentIds||[]).includes(p.id))}))};
  }
  if(!['register','associate','retry'].includes(input.action))fail('Operazione non valida',400);
  if(input.cycleId!==state.cycle.id)fail('Il ciclo è cambiato: riapri il pacchetto');
  if(!state.cycle.serviceAmounts)fail('Definisci prima le quote PT e nutrizione');
  if(state.cycle.financeSource!=='scadenze'&&L.cycleFinancial(state.cycle).paid>0)fail('Questo ciclo contiene già incassi locali. Riconciliali prima di passare agli incassi condivisi, per evitare duplicati');
  if(state.cycle.financeSource!=='scadenze'&&state.cycle.payments?.length)state.cycle.localPaymentsBeforeShared=state.cycle.payments;
  if(input.action==='associate'){
   if(state.cycle.sharedPending)fail('Completa prima l’incasso in corso');
   const original=payments.find(p=>p.id===input.paymentId);
   if(!original)fail('Pagamento non disponibile per l’associazione');
   if((state.cycle.sharedPaymentIds||[]).includes(original.id))return {client:await refresh(actor,row,payments),confirmed:true};
   if(state.ledger.cycles.some(c=>(c.sharedPaymentIds||[]).includes(original.id)))fail('Pagamento già associato a un altro ciclo');
   const live=synchronize(row,payments),balance=L.cycleFinancial(L.currentCycle(live)||state.cycle).balance;
   if(original.importo<=0||original.importo>balance)fail('L’incasso selezionato supera il saldo del ciclo',400);
   state.cycle.financeSource='scadenze';state.cycle.sharedPaymentIds=[...(state.cycle.sharedPaymentIds||[]),original.id];
   const prepared={...row,...values(L.applyToClient(state.client,state.ledger))};
   return {client:await save(actor,row,synchronize(prepared,payments)),confirmed:true};
  }
  let pending=state.cycle.sharedPending;
  if(pending){
   if(pending.email!==email(row.email))fail('L’email del cliente è cambiata durante l’incasso: verifica il registro prima di procedere');
   if(input.action!=='retry'&&input.requestId!==pending.requestId)fail('C’è un incasso da verificare: usa Riprova conferma');
   if(input.action==='register'&&(L.parseMoneyInput(input.amount)!==pending.amount||input.date!==pending.date))fail('Richiesta già usata con altri dati: usa Riprova conferma');
  }else{
   if(input.action==='retry')fail('Nessun incasso in attesa: aggiorna il riscontro');
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId||''))fail('Identificativo richiesta non valido',400);
   // A retry after a lost final response must not overwrite or duplicate it.
   const existing=payments.find(p=>p.id==='calendar_'+input.requestId);
   if(existing){if(!(state.cycle.sharedPaymentIds||[]).includes(existing.id)||existing.importo!==L.parseMoneyInput(input.amount)||existing.data!==input.date)fail('Richiesta già usata con altri dati');return {client:await refresh(actor,row,payments),confirmed:true};}
   const amount=L.parseMoneyInput(input.amount);
   const synced=synchronize(row,payments),balance=L.cycleFinancial(L.currentCycle(synced)||state.cycle).balance;
   if(!Number.isFinite(amount)||amount<=0||L.roundMoney(amount)!==amount||amount>balance)fail('L’incasso deve avere al massimo due decimali, essere positivo e non superare il saldo del ciclo',400);
   const date=validDate(input.date);
   const note=String(input.note||'').trim();
   if(note.length>2000)fail('Nota incasso non valida',400);
   const identity=await upstream('getCliente',{email:email(row.email)});
   if(!identity.cliente||email(identity.cliente.email)!==email(row.email)||identity.cliente.active===false)fail('Cliente non attivo in Gestione Scadenze. Per il solo PT usa il registro del Calendario');
   pending={id:'calendar_'+input.requestId,requestId:input.requestId,email:email(row.email),amount,date,service:state.cycle.serviceAmounts.pt===0?'Nutrizione':state.cycle.serviceAmounts.nutrition===0?'PT':'PT / Nutrizione',note,method:String(input.method||'Non indicato').slice(0,80)};
   state.cycle.financeSource='scadenze';state.cycle.sharedPending=pending;
   row=await save(actor,row,L.applyToClient(state.client,state.ledger));state=current(row);
  }
  const found=payments.find(p=>p.id===pending.id);
  if(found&&!matchesPending(found,pending))fail('Pagamento presente con dati diversi: verifica in Gestione Scadenze');
  if(!found){
   // The same server-persisted ID and payload are reused after any uncertain reply.
   await upstream('addPagamentoCondiviso',{id:pending.id,email:email(row.email),data:pending.date,importo:pending.amount,servizio:pending.service,note:paymentNote(pending)});
   payments=await paymentsFor(row);
  }
  const confirmed=payments.find(p=>p.id===pending.id&&matchesPending(p,pending));
  if(!confirmed)fail('Incasso non confermato dalla rilettura di Gestione Scadenze. Usa Riprova conferma');
  row=await refresh(actor,row,payments);
  return {client:row,confirmed:true};
 }
 return {handle};
}
async function upstream(action,payload){
 const url=process.env.SCADENZE_API_URL,token=process.env.SCADENZE_API_TOKEN;
 if(!url||!token)fail('Collegamento a Gestione Scadenze da configurare sul server',503);
 if(new URL(url).protocol!=='https:')fail('Collegamento Scadenze non valido',503);
 let response,data;
 try {response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload,_token:token})});data=await response.json();}
 catch {fail('Gestione Scadenze non raggiungibile. Un incasso in corso va verificato con Riprova conferma',502);}
 if(response.ok&&data.success===false&&action==='getCliente')return {cliente:null};
 if(!response.ok||data.success!==true)fail('Gestione Scadenze non ha confermato l’operazione. Aggiorna o riprova la conferma',502);
 return data;
}
module.exports={createService,upstream};
