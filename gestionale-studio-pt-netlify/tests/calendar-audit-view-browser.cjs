const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const b=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
const p=await b.newPage({viewport:{width:1280,height:1000},timezoneId:'Europe/Rome'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.setContent('<div class="modal-overlay open"><div class="modal-box"><div id="modal-content"></div></div></div>');
for(const file of ['base.css','layout.css','calendar.css','clients-fix.css','ui-fixes.css','pt-availability-overview.css','apple-calendar.css','calendar-audit-view.css'])await p.addStyleTag({content:fs.readFileSync(path.join(__dirname,'../app/calendario-studio/css',file),'utf8')});
await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../app/calendario-studio/js/calendar-audit-view.js'),'utf8')});
await p.evaluate(()=>{
 const base={created_at:'2026-09-13T06:27:00Z',actor_name:'Gianluca Pirisi',actor_operator_id:'private-operator-id',source:'calendar',client_ids:['private-client-id'],entity_type:'appointments',entity_id:'private-appointment-id'};
 const row=(id,request,action,before,after)=>({...base,id,request_id:request,action,before_data:before,after_data:after});
 const first=[row(200,'request-completed','marked_done',{status:'prenotato'},{status:'fatto'}),
 row(199,'request-restored','done_reverted',{status:'fatto'},{status:'prenotato'}),row(198,'request-restored','status_changed',{status:'fatto'},{status:'prenotato'}),
 {...row(197,'request-restored','client_package_changed',{sessions_remaining:7},{sessions_remaining:8}),entity_type:'clients',entity_id:'private-client-id'},
 row(196,'request-cancel','appointment_cancelled',{status:'prenotato'},{status:'annullato'}),row(195,'request-noshow','marked_noshow',{status:'prenotato'},{status:'noshow'}),
 row(194,'request-move','appointment_moved',{date:'2026-09-15',start_time:'17:00'},{date:'2026-09-15',start_time:'18:00'}),
 row(193,'request-pt','operator_changed',{operator_id:'op1'},{operator_id:'op2'}),
 row(192,'request-package','package_appointment_created',null,{}),{...row(191,'request-package','package_appointment_created',null,{}),entity_id:'second-appointment'}];
 while(first.length<100)first.push({...row(190-first.length,'test-request-'+first.length,'appointment_created',null,{}),entity_id:'TEST_'+first.length});
 const second=[{...row(1,'request-completed','client_package_changed',{sessions_remaining:8},{sessions_remaining:7}),entity_type:'clients',entity_id:'private-client-id'}];
 window.calls=[];window.UI={closeModal(){}};
 CalendarAuditView.open({ui:{openModal:h=>document.getElementById('modal-content').innerHTML=h},state:{getClients:()=>[{id:'private-client-id',nome:'Giuliano',cognome:'Secchi'}],getOperators:()=>[{id:'op1',nome:'Alessandro',cognome:'Pirisi'},{id:'op2',nome:'Martina',cognome:'Perra'}]},labels:{marked_done:'Segnata Fatto'},call:async(operation,payload,filters)=>{calls.push({operation,filters});return filters.beforeId?second:first}});
});
await p.getByText('Seduta completata',{exact:false}).waitFor();assert.equal(await p.locator('.audit-entry').count(),7);
await p.getByRole('button',{name:'Carica altre'}).click();await p.getByText('Residuo 8 → 7',{exact:true}).waitFor();assert.equal(await p.locator('.audit-entry').count(),7);assert.ok((await p.locator('.audit-entry').filter({hasText:'Seduta ripristinata'}).innerText()).includes('Residuo 7 → 8'));assert.ok((await p.locator('.audit-entry').filter({hasText:'Pacchetto programmato'}).innerText()).includes('2 sedute programmate'));
let visible=await p.locator('.audit-output').innerText();assert.ok(!visible.includes('private-'));assert.ok(!visible.includes('request-'));assert.ok(!visible.includes('TEST_'));assert.ok(visible.includes('Alessandro Pirisi → Martina Perra'));assert.ok(visible.includes('17:00 → 18:00'));
await p.locator('details').first().locator('summary').click();assert.ok((await p.locator('details').first().innerText()).includes('request-completed'));assert.ok((await p.locator('details').first().innerText()).includes('before_data'));await p.locator('details').first().locator('summary').click();
await p.getByLabel('Mostra eventi TEST').check();assert.equal(await p.locator('.audit-entry').count(),97);await p.getByLabel('Mostra eventi TEST').uncheck();assert.equal(await p.locator('.audit-entry').count(),7);
for(const label of ['Dal','Al','Utente','Cliente','Azione','Origine'])assert.equal(await p.getByLabel(label,{exact:true}).count(),1);
await p.getByRole('button',{name:'Ultimi 7 giorni'}).click();await p.getByLabel('Origine',{exact:true}).selectOption('system');await p.getByRole('button',{name:'Filtra',exact:true}).click();assert.ok(await p.evaluate(()=>calls.some(c=>c.filters.source==='system'&&c.filters.from&&c.filters.to)));assert.ok(await p.evaluate(()=>calls.every(c=>c.operation==='list')));
await p.getByRole('button',{name:'Carica altre'}).click();await p.getByText('Residuo 8 → 7',{exact:true}).waitFor();
await p.getByLabel('Azione',{exact:true}).selectOption('marked_done');await p.getByRole('button',{name:'Filtra',exact:true}).click();await p.getByRole('button',{name:'Carica altre'}).click();await p.getByText('Residuo 8 → 7',{exact:true}).waitFor();assert.equal(await p.locator('.audit-entry').count(),1);assert.ok(await p.evaluate(()=>calls.every(c=>c.filters.action==='')));
await p.getByLabel('Azione',{exact:true}).selectOption('');await p.getByRole('button',{name:'Filtra',exact:true}).click();await p.getByRole('button',{name:'Carica altre'}).click();await p.getByText('Residuo 8 → 7',{exact:true}).waitFor();
await p.screenshot({path:'/tmp/neacea-audit-register-desktop.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/neacea-audit-register-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
console.log('PASS audit register: request grouping across pages, done/restored balances, TEST toggle, safe hidden IDs, technical details, all filters, read-only calls, desktop/mobile');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
