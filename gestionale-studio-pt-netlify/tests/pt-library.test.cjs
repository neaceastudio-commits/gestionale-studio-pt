const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const auth=require('../netlify/functions/lib/pt-auth');
let actor={id:'pt-a',accessLevel:'pt'},clock=0;
const tables={pt_program_templates:[],pt_program_folders:[]};
auth.authenticatedOperator=async token=>token==='test'?actor:null;
auth.supabaseRequest=async(table,query,options={})=>{
  const q=new URLSearchParams(query),id=q.get('id')?.slice(3),version=q.get('updated_at')?.slice(3);
  if(table==='schede_allenamento')return [{id,cliente_id:'client-a',data:{}}];
  if(table==='clients')return [{id,pt_assegnato:'pt-a'}];
  if(table==='rpc/pt_set_current_program')return {currentProgramId:options.body.p_program_id};
  const all=tables[table];assert.ok(all,table);
  const rows=all.filter(r=>(!id||r.id===id)&&(!version||r.updated_at===version)&&(!q.has('archived_at')||!r.archived_at));
  if(options.method==='POST'){
    if(all.some(r=>r.id===options.body.id))return [];
    const row={...structuredClone(options.body),updated_at:String(++clock)};all.push(row);return [structuredClone(row)];
  }
  if(options.method==='PATCH')rows.forEach(r=>Object.assign(r,structuredClone(options.body),{updated_at:String(++clock)}));
  if(options.method==='DELETE')tables[table]=all.filter(r=>!rows.includes(r));
  return structuredClone(rows);
};
const {handler}=require('../netlify/functions/pt-data');
const call=async(action,payload={},token='test')=>{const r=await handler({httpMethod:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});return {status:r.statusCode,...JSON.parse(r.body)};};
const snapshot={program:{weeks:[1],days:[{key:'d',letter:'A',exercisesByWeek:{1:[{key:'e',name:'Squat',sets:'3',reps:'8'}]}}]}};
test('library API: direct creation, folders, independent duplication, optimistic edits, retries and permissions',async()=>{
  assert.equal((await call('create_template',{},'invalid')).status,401);
  let f=(await call('save_template_folder',{folderId:'folder-test-001',name:'Forza'})).folder;
  assert.ok(f);assert.equal((await call('save_template_folder',{folderId:f.id,name:'Retry'})).folder.name,'Forza');
  const child=(await call('save_template_folder',{folderId:'folder-child-001',parentId:f.id,name:'Intermedi'})).folder;
  assert.equal(child.parent_id,f.id);
  f=(await call('save_template_folder',{folderId:f.id,name:'Strength',expectedUpdatedAt:f.updated_at})).folder;
  assert.equal(f.name,'Strength');
  const original=(await call('create_template',{templateId:'template-test-001',title:'Base',snapshot,folderId:f.id})).template;
  assert.equal(original.folder_id,f.id);
  const copy=(await call('create_template',{templateId:'template-test-002',title:'Focus',snapshot:original.snapshot,folderId:child.id})).template;
  const changed=structuredClone(copy.snapshot);changed.program.days[0].exercisesByWeek[1][0].reps='12';
  const payload={templateId:copy.id,title:'Focus 2',snapshot:changed,folderId:'',expectedUpdatedAt:copy.updated_at,requestId:'request-edit-001'};
  const edited=await call('update_template',payload);assert.equal(edited.status,200);assert.equal(edited.template.folder_id,null);
  assert.equal((await call('update_template',payload)).status,200,'retry same write after response loss');
  assert.equal((await call('update_template',{...payload,requestId:'other-request'})).status,409);
  assert.equal(tables.pt_program_templates[0].snapshot.program.days[0].exercisesByWeek[1][0].reps,'8');
  assert.equal((await call('create_template',{templateId:'template-test-003',title:'Bad folder',snapshot,folderId:'missing'})).status,409);
  actor={id:'pt-b',accessLevel:'pt'};
  for(const action of ['update_template','archive_template'])assert.equal((await call(action,payload)).status,403);
  assert.equal((await call('delete_template_folder',{folderId:f.id,expectedUpdatedAt:f.updated_at})).status,403);
  assert.equal((await call('set_current_program',{programId:'own-program'})).status,403);
  assert.equal((await call('list_templates')).templates.length,2,'shared read preserved');
  actor={id:'owner',accessLevel:'owner'};
  assert.equal((await call('update_template',{...payload,requestId:'owner-request',expectedUpdatedAt:edited.template.updated_at})).status,200);
  assert.equal((await call('archive_template',{templateId:copy.id})).status,200);
  assert.equal((await call('update_template',{...payload,expectedUpdatedAt:tables.pt_program_templates[1].updated_at})).status,409);
  assert.equal((await call('delete_template_folder',{folderId:f.id,expectedUpdatedAt:'stale'})).status,409);
  assert.equal((await call('delete_template_folder',{folderId:f.id,expectedUpdatedAt:f.updated_at})).status,200);
  assert.equal((await call('delete_template_folder',{folderId:f.id,expectedUpdatedAt:f.updated_at})).status,200);
});
test('client current selector is independent of the opened or recently edited program',()=>{
  const html=fs.readFileSync(require.resolve('../app/portale-personal-trainer/index.html'),'utf8');
  const source=html.slice(html.indexOf('    function latestClientProgram('),html.indexOf('    function accessFunctionBase('));
  const programs=[{id:'old',created_at:'2026-08-01',updated_at:'2026-12-01'},{id:'new',created_at:'2026-09-01',updated_at:'2026-09-01'}];
  const context={appState:{selectedProgramId:'old',currentPrograms:{c:'new'}},programsForClient:()=>programs};vm.createContext(context);vm.runInContext(source,context);
  assert.equal(context.latestClientProgram('c').id,'new');
  context.appState.currentPrograms={};assert.equal(context.latestClientProgram('c').id,'new');
});

test('moving changes only folder metadata; nested/root moves, retry, stale versions and ownership are enforced',async()=>{
  tables.pt_program_templates=[];tables.pt_program_folders=[];actor={id:'pt-a',accessLevel:'pt'};
  const folder=(await call('save_template_folder',{folderId:'folder-move-001',name:'A'})).folder;
  const nested=(await call('save_template_folder',{folderId:'folder-move-002',name:'B',parentId:folder.id})).folder;
  const original=(await call('create_template',{templateId:'template-move-001',title:'Intatto',description:'Descrizione intatta',snapshot,folderId:''})).template;
  // Historical snapshots must not be normalized or rewritten by a simple move.
  tables.pt_program_templates[0].snapshot.legacyField={keep:true};
  const before=structuredClone(tables.pt_program_templates[0]);
  const payload={templateId:original.id,folderId:nested.id,expectedUpdatedAt:original.updated_at,requestId:'move-request-1',title:'Do not rename',snapshot:{}};
  const moved=await call('move_template',payload);assert.equal(moved.status,200);assert.equal(moved.template.folder_id,nested.id);
  for(const key of ['title','description','snapshot','created_by'])assert.deepEqual(moved.template[key],before[key]);
  assert.equal((await call('move_template',payload)).template.updated_at,moved.template.updated_at,'lost response retry does not repeat the write');
  assert.equal((await call('move_template',{...payload,folderId:''})).status,409,'same request cannot change destination');
  assert.equal((await call('move_template',{...payload,requestId:'stale-move'})).status,409);
  assert.equal((await call('move_template',{...payload,folderId:'missing',requestId:'missing-move'})).status,409);
  actor={id:'pt-b',accessLevel:'pt'};assert.equal((await call('move_template',{...payload,expectedUpdatedAt:moved.template.updated_at})).status,403);
  actor={id:'direction',accessLevel:'owner'};
  const root=await call('move_template',{...payload,folderId:'',requestId:'root-move',expectedUpdatedAt:moved.template.updated_at});
  assert.equal(root.status,200);assert.equal(root.template.folder_id,null);assert.deepEqual(root.template.snapshot,before.snapshot);
  await call('archive_template',{templateId:original.id});
  assert.equal((await call('move_template',{...payload,requestId:'trash-move',expectedUpdatedAt:tables.pt_program_templates[0].updated_at})).status,409);
  assert.equal(tables.pt_program_templates.length,1,'moves never create copies');
});
