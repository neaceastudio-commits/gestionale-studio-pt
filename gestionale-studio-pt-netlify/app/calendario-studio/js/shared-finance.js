/* Incassi canonici in Scadenze; il Calendario conserva una copia verificata. */
const SharedFinance=(()=>{
 const money=n=>Number(n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
 const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
 const button=(text,fn)=>{const e=element('button',text);e.type='button';e.className='btn';e.onclick=fn;return e};
 function field(host,label,type,value,id){const wrap=element('label',label+' '),e=element('input');e.type=type;e.className='form-input';e.value=value??'';e.id=id;if(type==='text')e.inputMode='decimal';wrap.append(e);host.append(wrap);return e;}
 function apply(row){
  if(!row)return;const clients=State.getClients(),i=clients.findIndex(c=>c.id===row.id);if(i<0)return;
  clients[i]={...clients[i],notes:row.notes,importo:row.importo,statoPagamento:row.stato_pagamento};State.saveClients(clients);
 }
 function mount(clientId){
  const host=document.getElementById('shared-finance');if(!host)return;
  const client=State.getClients().find(c=>c.id===clientId);if(!client)return;
  host.dataset.clientId=clientId;
  let ledger;try{ledger=PackageLedger.ensure(client,Services.getClientSessionMetrics(client))}catch(error){host.textContent=error.message;return}
  const cycle=PackageLedger.currentCycle(ledger);
  host.append(element('h4','Quote PT e nutrizione'));
  host.append(element('p','Ripartisci il totale di questo ciclo. Puoi indicare zero per il servizio non previsto; la fattura resta unica.'));
  const fields=element('div');fields.className='shared-finance-fields';host.append(fields);
  const total=field(fields,'Totale concordato €','text',Number(cycle.amount||0).toFixed(2),'shared-total');
  const pt=field(fields,'Quota PT €','text',cycle.serviceAmounts?.pt?.toFixed(2),'shared-pt');
  const nutrition=field(fields,'Quota nutrizione €','text',cycle.serviceAmounts?.nutrition?.toFixed(2),'shared-nutrition');
  const message=element('p',cycle.serviceAmounts?'':'Quote precedenti da definire');message.setAttribute('role','status');host.append(message);
  const status=element('p','Riscontro Scadenze non ancora verificato');status.setAttribute('role','status');
  const records=element('div');let latest=null,busy=false,loaded=false,requestId=crypto.randomUUID();
  function localControls(shared){
   const panel=host.closest('.package-overview')?.querySelector('.package-payment-panel');if(!panel)return;
   panel.querySelectorAll('.package-payment-form input,.package-payment-form select,button').forEach(e=>{if(shared)e.disabled=true});
   if(shared&&!panel.querySelector('.shared-local-warning')){const warning=element('p','Questo ciclo usa gli incassi di Gestione Scadenze. Il riepilogo è una copia: aggiorna il riscontro per verificarlo.');warning.className='shared-local-warning';panel.prepend(warning);}
  }
  localControls(cycle.financeSource==='scadenze');
  async function run(payload){
   if(busy)return null;busy=true;host.querySelectorAll('button').forEach(b=>b.disabled=true);
   try{const result=await CalendarAudit.clientFinance({clientId,...payload});if(result.error)throw Error(result.error);apply(result.client);return result;}
   catch(error){if(host.isConnected)status.textContent=error.message;return null;}
   finally{busy=false;if(host.isConnected)host.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  const save=button('Salva totale e quote',async()=>{
   const c=State.getClients().find(c=>c.id===clientId);
   const result=await run({action:'split',cycleId:cycle.id,total:total.value,pt:pt.value,nutrition:nutrition.value,expectedNotes:c.notes});
   if(result&&host.isConnected){UI.showToast('Quote salvate e confermate dal server','success');App._openPackageFinance(clientId);}
  });save.id='shared-save';host.append(save);
  host.append(element('h4','Riscontro Gestione Scadenze'));
  host.append(element('p','Qui vedi incassi e fatture dello stesso cliente. Associa al ciclo soltanto gli incassi pertinenti. Una fattura emessa resta distinta da un pagamento ricevuto.'));
  const year=field(host,'Anno fatture','number',new Date().getFullYear(),'shared-year');year.min='2001';year.max='2100';
  const refresh=button('Aggiorna riscontro',()=>load());refresh.id='shared-refresh';host.append(refresh,status,records);
  const payFields=element('div');payFields.className='shared-finance-fields';
  const amount=field(payFields,'Nuovo incasso totale €','text','','shared-amount');
  const date=field(payFields,'Data incasso','date',new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),'shared-date');
  const method=field(payFields,'Metodo','text','Bonifico','shared-method');method.inputMode='text';
  const note=field(payFields,'Nota facoltativa','text','','shared-note');note.inputMode='text';note.maxLength=2000;
  host.append(payFields);
  const register=button('Registra incasso condiviso',async()=>{
   if(!loaded){status.textContent='Aggiorna prima il riscontro di Gestione Scadenze';return;}
   const result=await run({action:'register',cycleId:latest.cycleId,requestId,amount:amount.value,date:date.value,method:method.value,note:note.value});
   if(result&&host.isConnected){requestId=crypto.randomUUID();App._openPackageFinance(clientId);}
  });register.id='shared-register';host.append(register);
  const retry=button('Riprova conferma incasso',async()=>{
   const result=await run({action:'retry',cycleId:latest.cycleId});if(result&&host.isConnected)App._openPackageFinance(clientId);
  });retry.id='shared-retry';retry.hidden=true;host.append(retry);
  function table(title,headers,rows){
   records.append(element('h5',title));if(!rows.length){records.append(element('p','Nessuna registrazione'));return;}
   const scroll=element('div');scroll.className='package-history-scroll';const table=element('table');table.className='package-history-table';
   const head=element('thead'),tr=element('tr');headers.forEach(h=>tr.append(element('th',h)));head.append(tr);table.append(head);
   const body=element('tbody');rows.forEach(values=>{const row=element('tr');values.forEach(v=>{const td=element('td');if(v instanceof Node)td.append(v);else td.textContent=v;row.append(td)});body.append(row)});table.append(body);scroll.append(table);records.append(scroll);
  }
  async function load(){
   status.textContent='Verifica incassi in corso…';loaded=false;records.replaceChildren();
   const result=await run({action:'list',year:Number(year.value)});if(!result||!host.isConnected)return;
   latest=result;loaded=true;
   const sameCycle=result.cycleId===cycle.id;
   const c=State.getClients().find(c=>c.id===clientId),current=PackageLedger.currentCycle(c);
   localControls(current?.financeSource==='scadenze');
   status.textContent='Verificato '+new Date(result.checkedAt).toLocaleString('it-IT')+(result.pending?' · Incasso da confermare: usa Riprova conferma.':'');
   retry.hidden=!result.pending;register.hidden=!!result.pending;
   save.disabled=!!result.pending||!sameCycle;register.disabled=!sameCycle;
   if(!sameCycle)status.textContent+=' · La decorrenza del ciclo non coincide con i dati salvati: verifica il pacchetto prima di associare incassi.';
   if(current?.financeSource==='scadenze'){
    records.append(element('p','Ciclo corrente · '+result.finance.status+' · Incassato '+money(result.finance.paid)+' · Saldo '+money(result.finance.balance)));
    const panel=host.closest('.package-overview')?.querySelector('.package-payment-panel');
    panel?.querySelectorAll('.package-current-payment-summary strong').forEach((e,i)=>e.textContent=money([result.finance.total,result.finance.paid,result.finance.balance][i]));
    const badge=panel?.querySelector('.package-payment-badge');if(badge){badge.textContent=result.finance.status;badge.className='package-payment-badge '+App._packagePaymentStatusClass(result.finance.status);}
   }
   table('Incassi registrati in Scadenze',['Data','Importo','Servizio','Ciclo'],result.payments.map(p=>{
    const action=p.linked?'Associato a questo ciclo':p.assigned?'Associato a un altro ciclo':!sameCycle?'Verifica decorrenza ciclo':button('Associa a questo ciclo',async()=>{const saved=await run({action:'associate',cycleId:result.cycleId,paymentId:p.id});if(saved&&host.isConnected)App._openPackageFinance(clientId)});
    return [p.date,money(p.amount),p.service,action];
   }));
   if(result.invoiceError)records.append(element('p',result.invoiceError));
   else table('Fatture '+result.year,['Numero','Data','Totale','Stato','Prestazione'],result.invoices.map(f=>[f.label,f.date,money(f.total),f.status,f.description]));
  }
  host.refresh=()=>{if(!loaded&&!busy)load()};
 }
 function refresh(){document.getElementById('shared-finance')?.refresh?.();}
 return {mount,refresh};
})();
