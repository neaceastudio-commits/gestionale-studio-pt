
(()=>{
if(window.parent === window){location.replace('./?view=prova-whatsapp&area=messaggi');return;}

const $=id=>document.getElementById(id);
const people=Object.create(null);
let audience='Clienti';

const inAudience=id=>people[id]?.[1]===audience;
const availableClient=id=>people[id]?.[3]!==false;
const stages=['Accettato da Meta','Inviato','Consegnato','Letto','Da verificare','Errore'];
const key='neacea-wa-comunicazioni-v1';
const stamp=()=>new Date().toISOString();
const fmt=t=>new Date(t).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
function node(tag,txt){const n=document.createElement(tag);n.textContent=txt;return n}
function button(txt,fn){const b=node('button',txt);b.type='button';b.onclick=fn;return b}
function latest(r){return r.events[r.events.length-1]}
function statusMatches(row,status){return status==='Tutti'||latest(row).s===status||(status==='Da verificare'&&latest(row).s==='Esito da verificare')||(status==='Errore'&&isFailure(latest(row).s))}
function isFailure(status){return !['Accettato da Meta','Inviato','Consegnato','Letto','Programmato','Esito da verificare'].includes(status)}
function seed(){return {drafts:[],rows:[]}}
let data=seed(),selected=0,filter='Tutti',detail='',draftId='',attachment='';
try{data=JSON.parse(localStorage.getItem(key))||data}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify(data))}catch{$('notice').textContent='Memoria del browser indisponibile: modifiche valide in questa pagina.'}}
function view(name){for(const b of document.querySelectorAll('[data-view]')){const on=b.dataset.view===name;b.setAttribute('aria-pressed',on);$(b.dataset.view).hidden=!on}draw();if(name==='automazioni')drawAutomations();if(name==='bozze')drawSavedDrafts();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
function draw(){
 const base=data.rows.filter(r=>(r.real||$('showSimulations').checked)&&people[r.p]&&inAudience(r.p)&&($('group').value==='Tutti'||people[r.p][1]===$('group').value)&&(people[r.p][0]+' '+r.title).toLowerCase().includes($('query').value.toLowerCase()));
 $('metrics').replaceChildren();for(const s of ['Tutti',...stages]){const b=button(s,()=>{filter=s;detail='';draw()});b.prepend(node('strong',base.filter(r=>statusMatches(r,s)).length));b.setAttribute('aria-pressed',s===filter);$('metrics').append(b)}
 const rows=base.filter(r=>statusMatches(r,filter)).sort((a,b)=>latest(b).t.localeCompare(latest(a).t));$('log').replaceChildren();
 for(const r of rows){const tr=document.createElement('tr');for(const [index,value] of [people[r.p][0],r.title,latest(r).s,fmt(latest(r).t)].entries()){const td=node('td',index===2?'':value);if(index===2){const badge=node('span',value);badge.className='status-pill';badge.dataset.status=value;badge.dataset.error=isFailure(value);td.append(badge)}tr.append(td)}const td=document.createElement('td');td.append(button('Apri',()=>{detail=r.id;draw()}));tr.append(td);$('log').append(tr)}
 if(!rows.length){const tr=document.createElement('tr'),td=node('td','Nessun invio per questi filtri.');td.colSpan=5;tr.append(td);$('log').append(tr)}
 const r=rows.find(r=>r.id===detail);$('timeline').replaceChildren();if(r){const area=$('timeline');area.append(node('h3',r.title+' · '+people[r.p][0]));if(r.real&&!r.messageId)area.append(node('p','Esito finale non disponibile per questo invio precedente. Il messaggio era stato registrato senza identificativo Meta.'));
if(r.messageId)area.append(node('p','ID messaggio · '+r.messageId));
if(r.errorCodes?.length)area.append(node('p','Codici Meta · '+r.errorCodes.join(', ')+(r.errorCodes.includes(131047)?' · Invio fuori dalla finestra di 24 ore. Serve un modello approvato.':'')));
if(r.message)area.append(node('p',r.message));if(r.schedule)area.append(node('p',r.schedule));for(const e of r.events)area.append(node('div',fmt(e.t)+' · '+e.s));const s=latest(r).s;const next={Programmato:'Inviato',Inviato:'Consegnato',Consegnato:'Letto'}[s];if(next&&!r.real)area.append(button({Inviato:'Simula invio',Consegnato:'Simula consegna',Letto:'Simula lettura'}[next],()=>event(r,next)));if(s==='Inviato'&&!r.real)area.append(button('Simula errore',()=>event(r,'Errore')))}
 const ids=Object.keys(people).filter(i=>inAudience(i)&&(availableClient(i)||$('showArchived').checked)&&($('rg').value==='Tutti'||people[i][1]===$('rg').value)&&people[i][0].toLowerCase().includes($('rq').value.toLowerCase()));if(!ids.includes(selected))selected=ids[0];$('contacts').replaceChildren();for(const i of ids){const b=button(people[i][0]+(!availableClient(i)?' · '+(people[i][4]||'Archiviato'):''),()=>{selected=i;draw()});b.setAttribute('aria-pressed',i===selected);$('contacts').append(b,document.createElement('br'))}
 const card=$('card');card.replaceChildren();if(selected===undefined){card.textContent='Nessun contatto trovato.';return}const person=people[selected];card.append(node('h3',person[0]),node('p',!availableClient(selected)?'Storico · '+(person[4]||'Archiviato')+' · invio disabilitato':person[2]?'Numero WhatsApp disponibile':'Numero mancante'),node('h4','Storico messaggi'));const history=data.rows.filter(r=>r.real&&r.p===selected).sort((a,b)=>latest(b).t.localeCompare(latest(a).t));if(!history.length)card.append(node('p','Nessuna comunicazione'));for(const r of history)card.append(button(r.title+' · '+(r.real?'':'Simulazione · ')+latest(r).s,()=>{filter='Tutti';$('group').value='Tutti';$('query').value='';detail=r.id;view('registro')}));if(person[2]&&availableClient(selected))card.append(button('Scrivi a '+person[0],()=>{setForm({ids:[selected]});view('editor')}));
}
async function loadStaff(){
 const status=$('staffStatus'), submit=$('staffPreview');
 submit.disabled=true;
 status.textContent='Caricamento rubrica…';
 try{
  const token=new URLSearchParams(parent.location.search).get('access')||sessionStorage.getItem('neacea-calendar-audit-session')||'';
  const response=await fetch('/.netlify/functions/whatsapp-agenda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'directory',accessToken:token,dryRun:true})});
  if(!response.ok)throw Error();
  const settings=await response.json();
  const staff=settings.operators.filter(op=>op.active);
  for(const op of staff)people['pt:'+op.id]=[op.name,'PT',Boolean(op.whatsapp_phone)];
  for(const client of settings.clients)people['cliente:'+client.id]=[client.name,'Clienti',client.hasPhone,client.active!==false,client.status];
  $('recipients').replaceChildren();
  for(const [id,[name,group,available]] of Object.entries(people).sort((a,b)=>a[1][0].localeCompare(b[1][0],'it'))){
   const label=node('label',' '+name+' · '+group+(available?'':' · numero mancante'));
   const box=document.createElement('input');
   box.type='checkbox';box.dataset.contact=id;box.disabled=!available;
   label.prepend(box);$('recipients').append(label);inputs.set(id,box);
  }
  applyAudience(isAgenda());if(isAgenda())renderReport();
  updateAudienceUI();draw();preview();
  status.textContent=staff.length+' PT attivi.';
 }catch{status.textContent='Rubrica non disponibile. Riapri Direzione con il tuo accesso.';$('recipients').textContent=status.textContent}
}
function event(r,s){r.events.push({s,t:stamp()});save();filter='Tutti';draw()}
for(const id of ['query','group','rq','rg'])$(id).oninput=draw;
const inputs=new Map();
const rules=new Map(), agendas=new Map();
let generation=0, chosenRule='', report=null;
const isAgenda=()=>$('model').value==='Agenda PT';
function ruleValues(){
 return {frequency:$('frequency').value,weekday:Number($('weekday').value),time:$('ruleTime').value,
         period:$('period').value,offset:Number($('offset').value)};
}
function fillRule(rule={}){
 $('frequency').value=rule.frequency||'weekly';$('weekday').value=rule.weekday??1;
 $('ruleTime').value=rule.time||'08:00';$('period').value=rule.period||'week';$('offset').value=rule.offset??0;
 $('previewAt').value=rule.previewAt||'today';
}
async function agendaRequest(endpoint,fields){
 const accessToken=new URLSearchParams(parent.location.search).get('access')||sessionStorage.getItem('neacea-calendar-audit-session')||'';
 const res=await fetch('/.netlify/functions/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,accessToken})});
 if(!res.ok)throw Error(String(res.status));
 return res.json();
}
function applyAudience(autoSelect){
 const weekly=isAgenda();
 for(const [id,box] of inputs){
  const row=agendas.get(id);
  box.disabled=!people[id][2]||!availableClient(id)||!inAudience(id)||(weekly&&(!row||row.incomplete));
  box.parentNode.hidden=!inAudience(id)||!availableClient(id)||(weekly&&!row);
  if(box.disabled)box.checked=false;
  else if(autoSelect)box.checked=weekly;
 }
 for(const b of document.querySelectorAll('[data-group]'))b.hidden=weekly||!!b.dataset.group&&b.dataset.group!==audience;
 $('recipientSummary').textContent=weekly?'Selezionati dal calendario. Puoi escludere singoli PT.':audience==='Clienti'?'Solo clienti attivi. Ibernati e archiviati esclusi.':'Seleziona uno o più Personal Trainer.';
 filterRecipients();
}
const dayLabel=day=>day.split('-').reverse().join('/');
function renderReport(){
 if(!report)return;
 const missing=report.agendas.filter(r=>!people['pt:'+r.operatorId]?.[2]||r.incomplete).map(r=>r.name);
 const range=dayLabel(report.start)+(report.end===report.start?'':' – '+dayLabel(report.end));
 $('agendaInfo').textContent='Periodo: '+range+' · '+report.agendas.length+' PT con sedute.'+($('previewAt').value==='next'?' Calcolo riferito al '+dayLabel(report.plan.nextDay)+' alle '+report.plan.time+'.':'')+(missing.length?' Esclusi per dati incompleti o numero mancante: '+missing.join(', ')+'.':'');
}
async function refreshAgenda(){
 const ticket=++generation;if(isAgenda()){$('mode').value='Subito';configureAgendaFormat()}report=null;agendas.clear();applyAudience(true);
 $('agendaRules').hidden=!isAgenda();$('weekdayBox').hidden=$('frequency').value==='daily';
 if(!isAgenda()){preview();return}
 $('agendaInfo').textContent='Ricerca delle sedute nel calendario…';preview();
 try{
  const data=await agendaRequest('whatsapp-agenda',{action:'weekly-agenda',rule:ruleValues(),previewAt:$('previewAt').value});
  if(ticket!==generation)return;
  if(!Array.isArray(data.agendas))throw Error();
  report=data;for(const row of data.agendas)agendas.set('pt:'+row.operatorId,row);
  applyAudience(true);renderReport();preview();
 }catch{if(ticket===generation)$('agendaInfo').textContent='Agenda indisponibile. Controlla l’orario e premi Aggiorna dal calendario.'}
}
function showRules(){
 const select=$('ruleSaved');select.replaceChildren(new Option('Nuova matrice',''));
 for(const r of rules.values())select.add(new Option(r.title,r.id));
 select.value=chosenRule;
}
async function readRules(){
 try{
  const {rules:rows}=await agendaRequest('whatsapp-agenda-test',{action:'agenda-rules'});
  for(const row of rows)rules.set(row.id,row);
  showRules();drawAutomations();
 }catch{$('ruleNotice').textContent='Elenco delle matrici salvate indisponibile.'}
}
for(const id of ['frequency','weekday','ruleTime','period','offset','previewAt'])$(id).onchange=refreshAgenda;
$('reloadAgenda').onclick=refreshAgenda;

const fields=['subject','model','bodyText','link','mode','when','repeat','sendFormat'];
document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{
 inputs.forEach((c,i)=>{c.checked=!c.disabled && people[i][1]===b.dataset.group});
 preview();
});
$('previewRecipient').onchange=preview;

function draftAudience(d){return d.audience||(d.model==='Agenda PT'||d.ids?.[0]?.startsWith('pt:')?'PT':'Clienti')}
function drawSavedDrafts(){
 const list=$('libraryDrafts');
 list.replaceChildren();
 for(const d of allDrafts().filter(d=>draftAudience(d)===audience)){
  const article=document.createElement('article');
  article.className='paper';
  const audience=(d.ids||[]).map(i=>people[i]?.[0]).filter(Boolean).join(', ');
  article.append(node('h3',d.subject||'Senza titolo'),node('p',audience||'Destinatari da scegliere'));
  article.append(node('p',[d.attachment,timing(d)].filter(Boolean).join(' · ')));
  const actions=document.createElement('div');
  actions.className='tools';
  actions.append(button('Modifica',()=>{setForm(d);view('editor')}),button('Duplica',()=>{
   setForm({...d,id:'',subject:(d.subject||'Messaggio')+' (copia)'});
   view('editor');
   $('notice').textContent='Copia pronta da modificare e salvare.';
  }));
  article.append(actions);
  list.append(article);
 }
 if(!list.childElementCount)list.append(node('p','Nessuna bozza salvata.'),button('Crea una bozza',()=>{setForm();view('editor')}));
}

function values(){return {audience,...Object.fromEntries(fields.map(k=>[k,$(k).value])),ids:Array.from(inputs).filter(([,box])=>box.checked&&!box.disabled).map(([id])=>id),attachment,...(isTemplate()?{templateKey:$('templateName').value,templateParameters:Array.from($('templateParams').querySelectorAll('input')).map(n=>n.value)}:{}),...(isAgenda()?{rule:{...ruleValues(),previewAt:$('previewAt').value}}:{})}}
const localDrafts=new Map();
let selectedFile=null, downloadUrl='', formVersion=0;
function attach(file, legacyName=''){
 if(downloadUrl) URL.revokeObjectURL(downloadUrl);
 selectedFile=file;
 attachment=file?.name||legacyName;
 downloadUrl=file?URL.createObjectURL(file):'';
 const link=$('download');
 link.hidden=!file;
 if(file){link.href=downloadUrl;link.download=file.name}
 else link.removeAttribute('href');
}
function allDrafts(){
 const drafts=new Map(data.drafts.map(d=>[d.id,d]));
 for(const d of localDrafts.values()) drafts.set(d.id,d);
 return [...drafts.values()].sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
}
const database=new Promise((resolve,reject)=>{
 const request=indexedDB.open('neacea-whatsapp-drafts',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
async function loadDrafts(){
 const db=await database;
 const request=db.transaction('drafts').objectStore('drafts').getAll();
 request.onsuccess=()=>{for(const d of request.result)localDrafts.set(d.id,d);preview()};
 request.onerror=()=>{$('notice').textContent='Impossibile caricare le bozze salvate.'};
}
$('newDraft').onclick=()=>{setForm();$('notice').textContent='Nuova comunicazione.'};
function setForm(v={}){if(v.mode==='Programma')$('notice').textContent='Bozza riaperta: la vecchia data era una simulazione. Nessun invio è programmato.';v={...v,mode:'Subito'};if(v.audience)setAudience(v.audience,false);else if(v.model==='Agenda PT')setAudience('PT',false);else if(v.ids?.length)setAudience(v.ids[0].startsWith('pt:')?'PT':'Clienti',false);formVersion++;draftId=v.id||'';attach(v.file||null,v.attachment);$('file').value='';for(const k of fields){const n=$(k);if(n.tagName==='SELECT')n.selectedIndex=0;else n.value='';if(v[k])n.value=v[k]}chosenRule='';showRules();fillRule(v.rule);generation++;report=null;agendas.clear();applyAudience(false);$('ruleNotice').textContent='';$('agendaRules').hidden=!isAgenda();
inputs.forEach((c,i)=>c.checked=!c.disabled&&!!v.ids?.includes(i));restoreTemplate(v);if(isAgenda())refreshAgenda();else preview()}
function message(v,i){
 if(v.model==='Agenda PT'){
  const row=agendas.get(i);if(!row||!report)return '';
  return agendaText(report,row,v.bodyText,v.link);
 }
 if(v.sendFormat==='template'){
  const t=templateCatalogue.find(t=>templateKey(t)===v.templateKey);if(!t)return '';
  const ps=templateParameters(v,i);
  return [t.headerText,t.body.replace(/\{\{(\d+)\}\}/g,(_,n)=>ps[Number(n)-1]||'['+n+']'),t.footer,v.attachment?'Allegato · '+v.attachment:''].filter(Boolean).join('\n\n');
 }
 return [v.bodyText.replaceAll('{nome}',people[i]?.[0].split(' ')[0]||'{nome}'),v.link,v.attachment?'Allegato · '+v.attachment:''].filter(Boolean).join('\n\n');
}
function agendaText(report,row,intro,link){
 return [(intro||'Ciao {nome}, ecco la tua agenda NEACEA.').replaceAll('{nome}',row.name.split(' ')[0]),'Periodo: '+dayLabel(report.start)+(report.start===report.end?'':' – '+dayLabel(report.end)),row.text,link||''].filter(Boolean).join('\n\n').trim();
}
function timing(v){return v.mode==='Subito'?'Invio immediato':(v.when?v.when.replace('T',' alle '):'Scegli data e ora')+' · '+v.repeat}
function preview(){
 const v=values();$('when').required=false;$('whenBox').hidden=$('repeatBox').hidden=true;
 $('fileName').textContent=attachment+(attachment&&!selectedFile?' · file da riselezionare':'');$('removeFile').hidden=!attachment;
 const selector=$('previewRecipient'),previous=selector.value;
 selector.replaceChildren(...v.ids.map(i=>new Option(people[i][0],String(i))));
 selector.value=v.ids.includes(previous)&&previous!==''?previous:(v.ids[0]||'');
 $('recipientChoice').hidden=!v.ids.length;
 const text=message(v,selector.value||undefined);
 $('preview').textContent=text||(isAgenda()?'Scegli un periodo con sedute per vedere l’agenda personale.':'Il testo del messaggio comparirà qui.');
 $('schedule').textContent='Invio manuale · nessuna programmazione attiva';
 $('selectionCount').textContent=v.ids.length+' destinatari selezionati';
 $('characterCount').textContent=text.length+' caratteri per questo destinatario';
 $('draftCount').textContent=allDrafts().filter(d=>draftAudience(d)===audience).length;
 for(const b of document.querySelectorAll('[data-kind]'))b.setAttribute('aria-pressed',b.dataset.kind===(isAgenda()?'Agenda PT':'Personalizzato'));
 $('formatHelp').textContent=isTemplate()?'Il testo approvato resta fisso: personalizza i campi previsti e controlla l’anteprima.':'Il testo libero richiede un messaggio ricevuto dal destinatario nelle ultime 24 ore. Oltre questa finestra serve un modello approvato.';
 $('attachmentBox').hidden=isAgenda();if(isTemplate()&&['DOCUMENT','IMAGE'].includes(selectedTemplate()?.header))$('attachmentBox').open=true;$('formatLabel').hidden=isAgenda();
 $('bodyLabelHint').textContent=isAgenda()?'· introduzione, le sedute vengono aggiunte sotto':'';
 const summary=$('reviewSummary');summary.replaceChildren();
 for(const [label,value] of [['Destinatari',String(v.ids.length)],['Contenuto',isAgenda()?'Agenda personale':isTemplate()?'Modello approvato':'Testo libero'],['Allegato',isAgenda()?'Nessuno':attachment||'Nessuno']]){const row=node('div','');row.append(node('span',label),node('strong',value));summary.append(row)}
 const blocker=dispatchBlocker(v);$('sendBlocker').textContent=blocker;
 $('sendNow').hidden=false;$('sendNow').disabled=sending||!!blocker;
 $('sendNow').textContent=sending?'Invio in corso…':'Controlla e invia'+(v.ids.length?' · '+v.ids.length:'');
 drawSavedDrafts();filterRecipients();
}
function dispatchBlocker(v){
 if(!v.ids.length)return 'Seleziona almeno un destinatario.';
 if(!v.subject.trim())return 'Dai un nome alla comunicazione.';
 if(isAgenda()&&!report)return 'Attendi il caricamento del calendario.';
 if(isTemplate()){
  const t=selectedTemplate();if(!t||!t.supported||t.status!=='APPROVED')return 'Scegli un modello approvato.';
  if(v.templateParameters.some(p=>!p.trim()))return 'Completa tutti i campi del modello.';
  if(t.header==='DOCUMENT'&&selectedFile?.type!=='application/pdf')return 'Questo modello richiede un PDF: scegli il file.';
  if(t.header==='IMAGE'&&!['image/jpeg','image/png'].includes(selectedFile?.type))return 'Questo modello richiede un’immagine.';
  if(!['DOCUMENT','IMAGE'].includes(t.header)&&selectedFile)return 'Il modello scelto non prevede allegati. Rimuovi il file.';
 }
 if(v.attachment&&!selectedFile)return 'Riseleziona il file salvato nella vecchia bozza.';
 if(selectedFile&&(!['application/pdf','image/png','image/jpeg'].includes(selectedFile.type)||!selectedFile.size||selectedFile.size>3*1024*1024))return 'Usa un PDF, JPEG o PNG fino a 3 MB.';
 if(!$('link').checkValidity())return 'Correggi il link.';
 const limit=isTemplate()||selectedFile?1024:4096;
 const bodies=v.ids.map(id=>message({...v,attachment:''},id).trim());
 if(bodies.some(t=>!t))return 'Scrivi il messaggio.';
 if(bodies.some(t=>t.length>limit))return isAgenda()?'Una delle agende supera 4096 caratteri. Scegli un giorno: nessuna seduta verrà tagliata.':'Il contenuto supera il limite di '+limit+' caratteri.';
 return '';
}
function filterRecipients(){
 const q=$('recipientSearch').value.trim().toLocaleLowerCase('it');
 for(const [id,box] of inputs){box.parentNode.hidden=!inAudience(id)||!availableClient(id)||(isAgenda()&&!agendas.has(id))||!people[id][0].toLocaleLowerCase('it').includes(q)}
}
$('recipientSearch').oninput=filterRecipients;
$('compose').oninput=preview;$('file').onchange=()=>{const file=$('file').files[0];if(file)attach(file);preview()};$('removeFile').onclick=()=>{attach(null);$('file').value='';preview()};$('model').onchange=()=>{const m=$('model').value;const texts={'Ultime 2 sedute':'Ciao {nome}, ti restano 2 sedute del tuo pacchetto NEACEA.','Agenda PT':'Ciao {nome}, ecco la tua agenda.','Promemoria appuntamento':'Ciao {nome}, ti ricordiamo il tuo prossimo appuntamento in studio.'};if(texts[m]){$('subject').value=m;$('bodyText').value=texts[m]}updateFormat();if(isAgenda()){chosenRule='';showRules();fillRule();refreshAgenda()}else if(!$('agendaRules').hidden){refreshAgenda()}else preview()};
$('variable').onclick=()=>{const t=$('bodyText');t.setRangeText('{nome}',t.selectionStart,t.selectionEnd,'end');t.focus();preview()};
$('draft').onclick=async()=>{
 const version=formVersion;
 const d={...values(),id:draftId||crypto.randomUUID(),updated:stamp(),file:selectedFile};
 $('draft').disabled=true;
 try{
  const db=await database;
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('drafts','readwrite');
   tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
   tx.objectStore('drafts').put(d);
  });
  localDrafts.set(d.id,d);
  if(version===formVersion)draftId=d.id;
  preview();$('notice').textContent='Bozza salvata in questo browser.';
 }catch{$('notice').textContent='Salvataggio fallito. Verifica lo spazio disponibile e riprova.'}
 finally{$('draft').disabled=false}
};
let sending=false, lastDispatch=null;

let templateCatalogue=[], pendingTemplateDraft=null;
const isTemplate=()=>$('sendFormat').value==='template';
const templateKey=t=>t.name+'|'+t.language;
const selectedTemplate=()=>templateCatalogue.find(t=>templateKey(t)===$('templateName').value);
function templateParameters(v,id){return (v.templateParameters||[]).map(p=>p.replaceAll('{nome}',people[id]?.[0].split(' ')[0]||'{nome}'))}
function showTemplateFields(parameters){
 const t=selectedTemplate(),box=$('templateParams');box.replaceChildren();
 for(let i=0;i<(t?.parameterCount||0);i++){
  const label=document.createElement('label');
  const isName=t.name==='neacea_guida_app_cliente_v1'&&i===0;
  label.textContent=isName?'Nome · {nome} usa il destinatario selezionato':'Campo '+(i+1)+' · {{'+(i+1)+'}}';
  const input=document.createElement('input');input.type='text';input.required=isTemplate();input.maxLength=1024;
  input.value=parameters?.[i]??(isName?'{nome}':'');label.append(input);box.append(label);
 }
 $('templateNotice').textContent=t?('Stato Meta: '+t.status+(t.header==='DOCUMENT'?' · PDF obbligatorio':t.header==='IMAGE'?' · Immagine obbligatoria':' · Senza allegato')):'Seleziona un modello. I modelli in revisione non sono ancora utilizzabili.';
}
function updateFormat(){
 if(isAgenda()){configureAgendaFormat();return}
 const active=isTemplate();$('templateBox').hidden=!active;
 $('templateName').required=active;
 for(const id of ['bodyText','link','variable']){
  const n=$(id);n.disabled=active;
  if(id!=='variable')n.parentNode.hidden=active;else n.hidden=active;
 }
 $('bodyText').required=!active;
 for(const n of $('templateParams').querySelectorAll('input'))n.required=active;
 $('sendFormat').disabled=false;$('templateName').disabled=false;$('templateParams').hidden=false;$('file').disabled=false;$('file').parentNode.hidden=false;
 generation++;report=null;agendas.clear();applyAudience(false);$('agendaRules').hidden=true;
}
function restoreTemplate(v){
 pendingTemplateDraft=v.templateKey?{key:v.templateKey,parameters:v.templateParameters||[]}:null;
 if(pendingTemplateDraft&&templateCatalogue.some(t=>templateKey(t)===pendingTemplateDraft.key)){
  $('templateName').value=pendingTemplateDraft.key;showTemplateFields(pendingTemplateDraft.parameters);pendingTemplateDraft=null;
 }else showTemplateFields();
 updateFormat();
}
async function readTemplates(){
 $('reloadTemplates').disabled=true;
 const prior=pendingTemplateDraft||{key:$('templateName').value,parameters:Array.from($('templateParams').querySelectorAll('input')).map(n=>n.value)};
 try{
  const r=await agendaRequest('whatsapp-agenda-test',{action:'composer-templates'});
  if(!Array.isArray(r.templates))throw Error();
  templateCatalogue=r.templates;
  $('templateName').replaceChildren(new Option('Scegli un modello',''));
  for(const t of templateCatalogue){const option=new Option(t.name+' · '+t.language+' · '+t.status+(t.supported?'':' · formato non supportato'),templateKey(t));option.disabled=t.status!=='APPROVED'||!t.supported;$('templateName').append(option)}
  if(templateCatalogue.some(t=>templateKey(t)===prior.key))$('templateName').value=prior.key;
  showTemplateFields(prior.parameters);pendingTemplateDraft=null;if(isAgenda())configureAgendaFormat();preview();
 }catch{$('templateNotice').textContent='Modelli non disponibili. Riprova con Aggiorna modelli da Meta.'}
 finally{$('reloadTemplates').disabled=false}
}
 $('reloadTemplates').onclick=readTemplates;
 $('sendFormat').onchange=()=>{updateFormat();showTemplateFields();preview()};
 $('templateName').onchange=()=>{showTemplateFields();preview()};

function asBase64(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result).split(',')[1]);
  reader.onerror=reject;
  reader.readAsDataURL(file);
 });
}
$('sendNow').onclick=async()=>{
 if(sending)return;if(isAgenda())configureAgendaFormat();if(!$('compose').reportValidity())return;
 const blocked=dispatchBlocker(values());if(blocked){$('notice').textContent=blocked;return}
 const v=values(), file=selectedFile, notice=$('notice');
 if(v.mode!=='Subito')return;
 if(!v.ids.length){notice.textContent='Seleziona almeno un destinatario con un numero WhatsApp.';return}
 if(v.attachment&&!file){notice.textContent='Riseleziona il file di questa bozza prima di inviarla.';return}
 if(file&&(!['application/pdf','image/png','image/jpeg'].includes(file.type)||file.size>3*1024*1024||!file.size)){
  notice.textContent='Scegli un PDF, un JPEG o un PNG fino a 3 MB.';return;
 }
 const t=isTemplate()?selectedTemplate():null;
 if(isTemplate()&&!isAgenda()){
  if(!t||!t.supported||t.status!=='APPROVED'){notice.textContent='Scegli un modello approvato.';return}
  if(t.header==='DOCUMENT'&&file?.type!=='application/pdf'){notice.textContent='Questo modello richiede il PDF da allegare.';return}
  if(t.header==='IMAGE'&&!['image/jpeg','image/png'].includes(file?.type)){notice.textContent='Questo modello richiede un’immagine.';return}
  if(!['DOCUMENT','IMAGE'].includes(t.header)&&file){notice.textContent='Questo modello non prevede allegati. Scegli un modello con documento o rimuovi il file.';return}
 }
 const items=v.ids.map(id=>({id,name:people[id][0],body:message({...v,attachment:''},id).trim(),...(isAgenda()?{agenda:{rule:ruleValues(),previewAt:$('previewAt').value,revision:agendas.get(id)?.revision,intro:v.bodyText,link:v.link}}:t?{template:{name:t.name,language:t.language,parameters:templateParameters(v,id)}}:{})}));
 if(items.some(item=>!item.body||item.body.length>(file?1024:4096))){
  notice.textContent=file?'Con allegato puoi usare fino a 1024 caratteri, incluso il link.':'Il messaggio deve contenere da 1 a 4096 caratteri.';return;
 }
 const token=new URLSearchParams(parent.location.search).get('access')||sessionStorage.getItem('neacea-calendar-audit-session');
 if(!token){notice.textContent='Riapri il calendario con il tuo accesso Direzione.';return}
 if(!confirm('Inviare ora su WhatsApp a '+items.length+' destinatari?\n\n'+items.map(item=>item.name).join('\n')+(isAgenda()?'\n\nOgni PT riceve le proprie sedute come testo, senza allegati.':file?'\n\nAllegato: '+file.name:'')))return;
 sending=true;
 const form=$('compose');form.inert=true;$('sendNow').disabled=true;
 const signature=JSON.stringify([formVersion,v.subject,items,file?[file.name,file.size,file.lastModified]:null]);
 if(lastDispatch?.signature!==signature)lastDispatch={signature,batch:crypto.randomUUID()};
 const batch=lastDispatch.batch;
 try{
  const media=file?{name:file.name,type:file.type,base64:await asBase64(file)}:null;
  for(const [index,item] of items.entries()){
   notice.textContent='Invio '+(index+1)+' di '+items.length+' · '+item.name;
   let status='Esito da verificare', messageId=null;
   try{
    const res=await fetch('/.netlify/functions/whatsapp-agenda-test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'composer-send',accessToken:token,batch,contact:item.id,body:item.body,file:media,...(item.template?{template:item.template}:{}),...(item.agenda?{agenda:item.agenda}:{})})});
    const result=await res.json();
    if(typeof result.status==='string')status=result.status;
    if(typeof result.messageId==='string')messageId=result.messageId;
   }catch{}
   const rowId=batch+'_'+item.id;
   const row={id:rowId,p:item.id,real:true,messageId,title:v.subject,message:item.body,schedule:item.agenda?'Agenda personale · solo testo':file?'Allegato · '+file.name:'',events:[{s:status,t:stamp()}]};
   data.rows=data.rows.filter(r=>r.id!==rowId);
   data.rows.unshift(row);save();
  }
  $('group').value='Tutti';$('query').value='';filter='Tutti';detail='';
  notice.textContent='Esito per destinatario nel registro. “Accettato da Meta” indica la presa in carico.';
  view('registro');
 }catch{notice.textContent='Impossibile preparare l’invio. Controlla il file e riprova.'}
 finally{form.inert=false;sending=false;preview()}
};


let refreshingDelivery=false;
$('showSimulations').onchange=()=>{filter='Tutti';draw()};
async function refreshDelivery(){
 if(refreshingDelivery)return;
 refreshingDelivery=true;$('refreshDelivery').disabled=true;
 try{
  const rows=data.rows.filter(r=>r.real&&r.messageId);
  const results=[];
  let receivedAt=null, configured=false;
  for(let i=0;i<Math.max(rows.length,1);i+=100){
   const response=await agendaRequest('whatsapp-agenda-test',{action:'composer-status',messageIds:rows.slice(i,i+100).map(r=>r.messageId)});
   if(!Array.isArray(response.results))throw Error();
   results.push(...response.results);receivedAt=response.receivedAt;configured=response.configured;
  }
  for(const result of results){
   for(const row of rows.filter(r=>r.messageId===result.messageId)){
    if(!result.events?.length)continue;
    row.errorCodes=result.codes||[];
    const accepted=row.events.find(e=>e.s==='Accettato da Meta');
    const events=[...(accepted?[accepted]:[]),...result.events];
    // Use the highest confirmed delivery state, even if callbacks arrived out of order.
    const finalEvent=events.filter(e=>e.s===result.status).at(-1);
    row.events=events.filter(e=>e!==finalEvent);
    if(finalEvent)row.events.push(finalEvent);
   }
  }
  const old=data.rows.filter(r=>r.real&&!r.messageId).length;
  $('deliveryNotice').textContent=(receivedAt?'Ultima notifica WhatsApp ricevuta · '+fmt(receivedAt)+'.':
   configured?'Endpoint pronto. In attesa del primo evento dal provider.':'Collegamento esiti da configurare.')+
   (old?' '+old+' invii precedenti hanno l’esito finale non disponibile.':'');
  save();draw();
 }catch{$('deliveryNotice').textContent='Aggiornamento degli esiti non disponibile. Riprova più tardi.'}
 finally{refreshingDelivery=false;$('refreshDelivery').disabled=false}
}
$('refreshDelivery').onclick=refreshDelivery;
$('loadDeliverySetup').onclick=async()=>{
 const out=$('deliverySetupNotice');
 try{
  const cfg=await agendaRequest('whatsapp-agenda-test',{action:'composer-setup'});
  if(!cfg.configured){out.textContent='Parametri di collegamento ancora da configurare.';return}
  $('deliveryUrl').value=cfg.url;$('deliveryVerify').value=cfg.verifyToken;$('deliverySetup').hidden=false;
  out.textContent=cfg.receivedAt?'Ultimo evento ricevuto · '+fmt(cfg.receivedAt):'In attesa del primo evento dal provider.';
 }catch{out.textContent='Parametri non disponibili.'}
};
for(const [buttonId,inputId]of [['copyDeliveryUrl','deliveryUrl'],['copyDeliveryVerify','deliveryVerify']]){
 $(buttonId).onclick=async()=>{
  try{await navigator.clipboard.writeText($(inputId).value);$('deliverySetupNotice').textContent='Copiato negli appunti.'}
  catch{$('deliverySetupNotice').textContent='Copia automatica indisponibile. Usa il campo URL o token.'}
 };
}
setInterval(()=>{if(!document.hidden&&!$('registro').hidden)refreshDelivery()},30000);


function updateAudienceUI(){
 for(const b of document.querySelectorAll('[data-audience]'))b.setAttribute('aria-pressed',b.dataset.audience===audience);
 const pt=audience==='PT';$('prepareAgenda').hidden=!pt;$('archiveToggle').hidden=pt;$('newAutomation').hidden=!pt;
 $('directoryHeading').textContent=pt?'Rubrica Personal Trainer':'Rubrica clienti';
 $('audienceInfo').textContent=pt?'Solo Personal Trainer · dati e comunicazioni dedicati':'Solo clienti attivi · ibernati esclusi';
 drawAutomations();
}
function setAudience(next,redraw=true){
 audience=next==='PT'?'PT':'Clienti';$('group').value=audience;$('rg').value=audience;$('showArchived').checked=false;
 selected=undefined;detail='';filter='Tutti';$('recipientSearch').value='';$('automationForm').hidden=true;
 if(audience==='Clienti'&&isAgenda()){$('model').value='Personalizzato';generation++;agendas.clear();report=null;$('agendaRules').hidden=true}
 updateAudienceUI();applyAudience(false);
 if(redraw){setForm({audience});view('editor')}
}
function configureAgendaFormat(){
 if(audience!=='PT')setAudience('PT',false);
 $('sendFormat').value='free';$('sendFormat').disabled=true;$('templateBox').hidden=true;
 $('templateName').required=false;for(const n of $('templateParams').querySelectorAll('input'))n.required=false;
 for(const id of ['bodyText','link','variable']){const n=$(id);n.disabled=false;if(id==='variable')n.hidden=false;else n.parentNode.hidden=false}
 $('bodyText').required=false;$('file').disabled=true;
 if(selectedFile||attachment){attach(null);$('file').value=''}
}
const unfinishedForms=new Map();
for(const b of document.querySelectorAll('[data-audience]'))b.onclick=()=>{
 if(b.dataset.audience===audience)return;
 unfinishedForms.set(audience,{...values(),file:selectedFile,id:draftId});
 setAudience(b.dataset.audience,false);setForm(unfinishedForms.get(audience)||{audience});view('editor');
};
$('showArchived').onchange=draw;
$('prepareAgenda').onclick=()=>{setForm({audience:'PT',model:'Agenda PT',subject:'Agenda PT',bodyText:'Ciao {nome}, ecco la tua agenda.'});view('editor')};


$('compose').onsubmit=e=>e.preventDefault();
let editingAutomation='';
const weekdays=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
function automationDescription(r){return (r.frequency==='daily'?'Ogni giorno':'Ogni '+weekdays[r.weekday])+' alle '+r.time+' · '+(r.period==='day'?'giorno':'settimana')+' '+({'-1':'precedente','0':'corrente','1':r.period==='day'?'successivo':'successiva'}[r.offset])}
function drawAutomations(){
 const list=$('automationList');list.replaceChildren();const pt=audience==='PT';$('ruleCount').textContent=pt?rules.size:0;
 if(!pt){const empty=node('div','');empty.className='empty-state';empty.append(node('h3','Le regole clienti non sono ancora operative'),node('p','Puoi già preparare messaggi e bozze con allegati dedicati. Le regole legate alle sedute residue e alle scadenze dei pacchetti richiedono il collegamento al motore automatico.'),button('Prepara un messaggio',()=>{setForm();view('editor')}));list.append(empty);return}
 if(!rules.size){const empty=node('div','');empty.className='empty-state';empty.append(node('h3','La stessa logica, per ogni PT'),node('p','Definisci quando preparare l’agenda e quale periodo leggere. Il calendario determina destinatari e sedute: ogni PT vede soltanto la propria agenda.'),button('Crea la prima matrice',()=>editAutomation()));list.append(empty);return}
 for(const r of rules.values()){
  const card=node('article','');card.className='automation-card';const state=node('span','Bozza · invio ricorrente non attivo');state.className='badge';
  card.append(state,node('h3',r.title),node('p',automationDescription(r)),node('p','Calendario → PT con sedute → testo WhatsApp'));
  const actions=node('div','');actions.className='tools';actions.append(button('Modifica matrice',()=>editAutomation(r)),button('Verifica destinatari e testo',()=>previewRule(r)));card.append(actions);list.append(card);
 }
}
function autoValues(){return {title:$('autoTitle').value.trim(),intro:$('autoIntro').value,link:$('autoLink').value.trim(),frequency:$('autoFrequency').value,weekday:Number($('autoWeekday').value),time:$('autoTime').value,period:$('autoPeriod').value,offset:Number($('autoOffset').value)}}
function updateAutoSummary(){const r=autoValues();$('autoWeekdayBox').hidden=r.frequency==='daily';$('autoSummary').textContent=automationDescription(r)+'. Destinatari: PT con almeno una seduta prenotata. Ogni agenda sarà calcolata dai dati del calendario.'}
function editAutomation(r={}){
 editingAutomation=r.id||'';$('automationHeading').textContent=r.id?'Modifica matrice':'Nuova matrice PT';
 for(const [id,value] of Object.entries({autoTitle:r.title||'',autoIntro:r.intro||'Ciao {nome}, ecco la tua agenda NEACEA.',autoLink:r.link||'',autoFrequency:r.frequency||'weekly',autoWeekday:r.weekday??1,autoTime:r.time||'08:00',autoPeriod:r.period||'week',autoOffset:r.offset??0}))$(id).value=value;
 $('autoNotice').textContent='';$('automationForm').hidden=false;updateAutoSummary();$('autoTitle').focus();
}
function previewRule(r){
 setForm({audience:'PT',subject:r.title||'Agenda PT',model:'Agenda PT',bodyText:r.intro||'Ciao {nome}, ecco la tua agenda NEACEA.',link:r.link||'',rule:{...r,previewAt:'next'}});
 view('editor');$('notice').textContent='Anteprima della prossima scadenza. Nessun invio è stato programmato.';
}
$('newAutomation').onclick=()=>editAutomation();$('closeAutomation').onclick=()=>{$('automationForm').hidden=true};
$('automationForm').oninput=updateAutoSummary;
$('automationForm').onsubmit=async e=>{
 e.preventDefault();if(!$('automationForm').reportValidity())return;
 const r=autoValues();if(!r.title||!r.intro.trim()){$('autoNotice').textContent='Completa nome e introduzione.';return}
 $('saveAutomation').disabled=true;const id=editingAutomation||crypto.randomUUID();
 try{
  const {rule}=await agendaRequest('whatsapp-agenda-test',{action:'agenda-save-rule',rule:{...r,id,revision:rules.get(id)?.revision}});
  if(!rule?.id)throw Error();rules.set(rule.id,rule);editingAutomation=rule.id;showRules();drawAutomations();$('autoNotice').textContent='Matrice salvata in bozza. Nessun invio automatico è stato attivato.';
 }catch(e){$('autoNotice').textContent=e.message==='409'?'Questa matrice è stata modificata altrove. Ricarica l’elenco prima di salvarla.':'Salvataggio non riuscito. I dati restano nel modulo.'}
 finally{$('saveAutomation').disabled=false}
};
$('previewAutomation').onclick=()=>{if($('automationForm').reportValidity())previewRule(autoValues())};
for(const b of document.querySelectorAll('[data-kind]'))b.onclick=()=>{
 if(b.dataset.kind==='Agenda PT'){setForm({audience:'PT',model:'Agenda PT',subject:'Agenda PT',bodyText:'Ciao {nome}, ecco la tua agenda NEACEA.'})}
 else{setForm({audience,model:'Personalizzato'})}
};
setForm();setAudience('Clienti',false);view('editor');readRules();readTemplates();
loadStaff().then(()=>{refreshDelivery();return loadDrafts()}).catch(()=>{$('notice').textContent='Archivio bozze non disponibile in questo browser.'});
})();
