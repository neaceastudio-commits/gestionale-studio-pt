const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),vm=require('vm');
function setup(count=12){
 const source=fs.readFileSync(require('node:path').join(__dirname,'../app/calendario-studio/js/app.js'),'utf8');
 const appointments=Array.from({length:count},(_,i)=>({id:'a'+i,date:`2099-10-${String(i+1).padStart(2,'0')}`,startTime:'09:00',durationMin:60,operatorId:'pt-a',serviceId:'pt11',status:'prenotato',clientIds:['c'],notes:'cycle-marker'}));
 const inputs=Object.fromEntries(appointments.map(a=>['pkg-time-'+a.id,{value:'10:00'}]));inputs['pkg-batch-save']={disabled:false};inputs['pkg-batch-result']={textContent:''};inputs['pkg-batch-from']={value:'2099-10-01'};inputs['pkg-batch-weekday']={value:''};
 const selected=appointments.map(a=>({value:a.id,checked:true}));const writes=[],messages=[];let confirms=0;
 const context={Date,Set,console,document:{getElementById:id=>inputs[id],querySelectorAll:selector=>selector.endsWith(':checked')?selected.filter(el=>el.checked):selected},State:{getClients:()=>[{id:'c'}],getAppointments:()=>appointments},Services:{serviceUsesPackageSessions:()=>true,appointmentInCurrentPackageCycle:()=>true,canBookAppointment:()=>({ok:true})},UI:{showToast:(...args)=>messages.push(args)},CONFIG:{SHEETS:{enabled:false}},Calendar:{render(){}},confirm:()=>{confirms++;return true},App:{openPackageOverview:()=>{inputs.refreshed=true},isPortalPtMode:()=>false,guardPackageManagement:()=>true,canEditAppointment:()=>true,_dateStr:()=> '2026-09-30',_withPtAudit:n=>n+' audited',_persistAppointment:async(next,before)=>{writes.push({next,before});return next},_showPackageAvailabilityError:()=>messages.push(['conflict'])}};
 vm.createContext(context);vm.runInContext('Object.assign(App, {'+source.slice(source.indexOf('  _packageTimeBatchEligible('),source.indexOf('  async _updatePackageAppointmentRow('))+'});',context);
 return {context,appointments,inputs,selected,writes,messages,confirms:()=>confirms};
}
test('12 appointments change time preserving identity, date, trainer, duration and status',async()=>{
 const f=setup();await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,12);assert.equal(f.confirms(),1);
 for(const {next,before}of f.writes){assert.equal(next.startTime,'10:00');for(const key of ['id','date','operatorId','durationMin','status','serviceId','clientIds'])assert.deepEqual(next[key],before[key]);assert.match(next.notes,/cycle-marker/);}
 assert.match(f.inputs['pkg-batch-result'].textContent,/12 sedute aggiornate/);
});
test('conflict prevents every write, unchanged times do not cause writes',async()=>{
 const f=setup();f.context.Services.canBookAppointment=a=>({ok:a.id!=='a11',errors:['occupied']});await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,0);assert.equal(f.confirms(),0);
 f.context.Services.canBookAppointment=()=>({ok:true});Object.values(f.inputs).forEach(v=>{if(v.value==='10:00')v.value='09:00'});await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,0);
});
test('failure stops the batch and reports confirmed count; duplicate submit is blocked',async()=>{
 const f=setup();let calls=0;f.context.App._persistAppointment=async next=>++calls===3?null:next;await f.context.App._savePackageTimeBatch('c');assert.equal(calls,3);assert.match(f.inputs['pkg-batch-result'].textContent,/Salvate 2 di 12/);assert.equal(f.inputs['pkg-batch-save'].disabled,false);
 f.context.App._packageBatchSaving=true;await f.context.App._savePackageTimeBatch('c');assert.equal(calls,3);
});
test('past, completed, no-show, shared appointments, other client/cycle and portal PT are excluded',()=>{
 const f=setup(1),a=f.appointments[0],eligible=f.context.App._packageTimeBatchEligible;for(const patch of [{date:'2020-01-01'},{status:'fatto'},{status:'noshow'},{status:'annullato'},{clientIds:['c','d']},{clientIds:['d']}])assert.equal(eligible({...a,...patch},{id:'c'}),false);
 f.context.Services.appointmentInCurrentPackageCycle=()=>false;assert.equal(eligible(a,{id:'c'}),false);f.context.App.isPortalPtMode=()=>true;assert.equal(eligible(a,{id:'c'}),false);
});
test('weekday and lower date select only matching sessions',()=>{const f=setup();f.inputs['pkg-batch-from'].value='2099-10-04';f.inputs['pkg-batch-weekday'].value='1';f.context.App._selectPackageTimeBatch('c');for(let i=0;i<f.selected.length;i++)assert.equal(f.selected[i].checked,f.appointments[i].date>='2099-10-04'&&new Date(f.appointments[i].date+'T12:00:00').getDay()===1);});

test('common time is saved directly without preparing individual rows; unchecked sessions stay unchanged',async()=>{
 const f=setup();f.inputs['pkg-batch-time']={value:'10:30'};
 for(const a of f.appointments)f.inputs['pkg-time-'+a.id].value='09:00';
 f.selected[3].checked=false;
 await f.context.App._savePackageTimeBatch('c');
 assert.equal(f.writes.length,11);assert.ok(f.writes.every(w=>w.next.startTime==='10:30'&&w.next.id!=='a3'));
 assert.equal(f.inputs.refreshed,true);assert.match(f.inputs['pkg-batch-result'].textContent,/11 sedute aggiornate/);
});
test('empty selection, invalid time and cancelled confirmation never write',async()=>{
 const f=setup();f.inputs['pkg-batch-time']={value:'10:30'};f.selected.forEach(el=>el.checked=false);
 await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,0);assert.equal(f.confirms(),0);
 f.selected.forEach(el=>el.checked=true);f.inputs['pkg-batch-time'].value='25:99';
 await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,0);assert.equal(f.confirms(),0);
 f.inputs['pkg-batch-time'].value='10:30';f.context.confirm=()=>false;
 await f.context.App._savePackageTimeBatch('c');assert.equal(f.writes.length,0);
});
test('selection summary counts only checked sessions',()=>{
 const f=setup();f.selected[0].checked=false;f.context.App._updatePackageTimeBatchSummary();
 assert.match(f.inputs['pkg-batch-result'].textContent,/11 sedute selezionate/);
});
