const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../app/calendario-studio/js/supabase.js','utf8');
function fixture(){
 const row={id:'synthetic',nome:'TEST',active:true,pt_assegnato:'old',notes:'Originale',package_types:['PT 1:1'],sessions_remaining:7,client_group:null};
 const writes=[];let failedRead=false;let reject=false;
 const context={console,State:{},CONFIG:{},localStorage:{},window:{CalendarAudit:{
  async write(table,{method,body}){writes.push({table,method,body:JSON.parse(JSON.stringify(body))});if(reject)return {error:'Rifiutato'};Object.assign(row,body);return [row];},
  async call(operation,p){writes.push({operation,p});if(reject)return {error:'Conflitto'};assert.equal(p.expectedGroup,row.client_group);row.client_group=p.group;return {...row};}
 }},fetch:async()=>({ok:!failedRead,status:failedRead?503:200,text:async()=>failedRead?'Rete assente':JSON.stringify([row])})};
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.sync=SupabaseSync',context);
 return {sync:context.sync,row,writes,setFailedRead:value=>failedRead=value,setReject:value=>reject=value};
}
test('trainer transfer patches only assignment and notes, then independently reloads server data',async()=>{
 const f=fixture();const saved=await f.sync.saveClientAssignment({id:'synthetic'},{id:'synthetic',ptAssegnato:'new',notes:'Originale\nTrasferimento'});
 assert.equal(saved.ptAssegnato,'new');assert.equal(saved.sessionsRemaining,7);assert.deepEqual(f.row.package_types,['PT 1:1']);
 assert.deepEqual(Object.keys(f.writes[0].body).sort(),['id','notes','pt_assegnato']);assert.equal(f.writes[0].method,'PATCH');
 const reopened=await f.sync.saveClientAssignment(saved,{...saved,ptAssegnato:'new'});assert.equal(reopened.ptAssegnato,'new');
});
test('failed readback or server rejection never confirms a trainer or a group',async()=>{
 const f=fixture();f.setFailedRead(true);
 assert.ok((await f.sync.saveClientAssignment({id:'synthetic'},{id:'synthetic',ptAssegnato:'new',notes:'Originale'})).error);
 f.setFailedRead(false);f.setReject(true);
 assert.ok((await f.sync.saveClientGroup({id:'synthetic',clientGroup:null},'regular')).error);assert.equal(f.row.client_group,null);
});
test('group saves preserve package, notes, trainer and history; clearing remains explicit',async()=>{
 const f=fixture();let saved=await f.sync.saveClientGroup({id:'synthetic',clientGroup:null},'occasional');
 assert.equal(saved.clientGroup,'occasional');assert.equal(saved.ptAssegnato,'old');assert.equal(saved.notes,'Originale');assert.equal(saved.sessionsRemaining,7);assert.equal(saved.active,true);
 saved=await f.sync.saveClientGroup(saved,null);assert.equal(saved.clientGroup,null);
 assert.ok((await f.sync.saveClientGroup(saved,'invented')).error);
});
