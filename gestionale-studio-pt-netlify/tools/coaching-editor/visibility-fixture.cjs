// Isolated local UI fixture: synthetic records only; never contacts production.
// Run: node tools/coaching-editor/visibility-fixture.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../app/portale-personal-trainer');
process.env.PT_SESSION_LOG_ENABLED = 'true';
process.env.PT_ACCESS_SECRET = 'local-ui-fixture-only';
process.env.SUPABASE_SECRET_KEY = 'local-ui-fixture-only';
const auth = require('../../netlify/functions/lib/pt-auth');
const { handler } = require('../../netlify/functions/pt-data');
const { templateSnapshot } = require('../../netlify/functions/lib/pt-templates');
const operators = ['pt-a', 'pt-b', 'owner', 'pt-empty'].map(id => ({
  operator_id: id, nome: id, cognome: 'Test', email: `${id}@example.test`, active: true,
  legacy_roles: id === 'owner' ? ['PT', 'Direzione'] : ['PT'],
}));
const clients = [
  { id: 'a-inactive', nome: 'Cliente', cognome: 'Storico A', pt_assegnato: 'pt-a', active: false },
  { id: 'a-active', nome: 'Cliente', cognome: 'Attivo A', pt_assegnato: 'pt-a', active: true },
  { id: 'a-second', nome: 'Secondo', cognome: 'Cliente A', pt_assegnato: 'pt-a', active: true },
  { id: 'b-inactive', nome: 'Cliente', cognome: 'Storico B', pt_assegnato: 'pt-b', active: false },
];
const programs = clients.filter(c => !c.active).map(c => ({
  id: `program-${c.id}`, cliente_id: c.id,
  created_at: '2026-06-15T12:00:00.000Z', updated_at: '2026-08-15T12:00:00.000Z',
  data: { periodo: '2026-08', settimane: 4, giorni: [{ id: 'A', nome: 'Allenamento A',
    esercizi: [{ id: 'squat-test', nome: 'Squat test storico', serie: 3, ripetizioni: 8, recupero: '90 sec' }],
  }] },
}));
const templateSeed = { program: { weeks: [1, 2], days: [{ key: 'seed-day', letter: 'A', name: 'Forza A',
  generalWarmup: ['Mobilità'], notes: [], preparation: [], rampUp: [], groupsByWeek: {},
  exercisesByWeek: Object.fromEntries([1, 2].map(w => [w, [{key:'seed-squat', name:'Squat archivio', sets:'3', reps:'8', rir:'2', rest:'90 sec'}]])),
}] } };
let templates = [{ id: 'template-fixture-001', title: 'Forza base condivisa', description: 'Modello di prova',
  updated_at:'2026-09-17T12:00:00.000Z',created_at:'2026-09-17T12:00:00.000Z',folder_id:null,
  created_by: 'pt-a', created_by_name: 'pt-a Test', archived_at: null,
  snapshot: templateSnapshot(templateSeed, 'Forza base condivisa'),
}];
const revisions = [], measurements = [], loads = [];
let folders=[];
const currentPrograms=programs.map(p=>({cliente_id:p.cliente_id,program_id:p.id}));
let fault = '', delay = 0, lastStamp = 0;
const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
const queryRows = (rows, u, key, field = key) => {
  const filter = u.searchParams.get(key);
  if (!filter) return rows;
  if (filter.startsWith('eq.')) return rows.filter(r => String(r[field]) === filter.slice(3));
  if (filter.startsWith('in.(')) return rows.filter(r => filter.slice(4, -1).split(',').includes(r[field]));
  throw Error('Unsupported fixture filter');
};
global.fetch = async (url, options = {}) => {
  const u = new URL(url); let rows = [];
  if (u.pathname.endsWith('/operator_effective_roles')) rows = operators;
  else if (u.pathname.endsWith('/operators')) rows = queryRows(operators.map(o => ({
    id: o.operator_id, active: true, portal_access_enabled: true, portal_access_version: 0,
  })), u, 'id');
  else if (u.pathname.endsWith('/pt_client_shares')) rows=[];
  else if (u.pathname.endsWith('/appointments')) rows=queryRows([{id:'assigned-test',operator_id:'pt-a',client_ids:['b-inactive'],service_id:'pt11',date:'2026-10-01',start_time:'18:00:00',status:'fatto'}],u,'operator_id');
  else if (u.pathname.endsWith('/rpc/pt_save_session_record')) {const b=JSON.parse(options.body);rows={record:{id:'synthetic-record',cliente_id:b.p_cliente_id,appointment_id:b.p_appointment_id,operator_id:b.p_actor_id,program_id:b.p_program_id,data:b.p_data,version:1}};}
  else if (u.pathname.endsWith('/clients')) rows = ['id', 'pt_assegnato', 'active'].reduce((r, k) => queryRows(r, u, k), clients);
  else if (u.pathname.endsWith('/schede_allenamento')) rows = ['id', 'cliente_id'].reduce((r, k) => queryRows(r, u, k), programs);
  else if (u.pathname.endsWith('/pt_client_current_programs')) rows=queryRows(currentPrograms,u,'cliente_id');
  else if (u.pathname.endsWith('/pt_program_folders')) {
    if(options.method==='POST') {const row=JSON.parse(options.body);if(!folders.some(f=>f.id===row.id)){rows=[{...row,updated_at:stamp()}];folders.push(rows[0]);}}
    else {
      rows=['id','updated_at'].reduce((r,k)=>queryRows(r,u,k),folders);
      if(options.method==='PATCH') rows.forEach(r=>Object.assign(r,JSON.parse(options.body),{updated_at:stamp()}));
      if(options.method==='DELETE') {const removed=new Set(rows.map(r=>r.id));folders=folders.filter(f=>!removed.has(f.id));for(const f of folders)if(removed.has(f.parent_id)){f.parent_id=null;f.updated_at=stamp();}for(const t of templates)if(removed.has(t.folder_id)){t.folder_id=null;t.updated_at=stamp();}}
    }
  }
  else if (u.pathname.endsWith('/pt_program_templates')) {
    if (options.method === 'PATCH') {
      rows = ['id','updated_at'].reduce((r,k)=>queryRows(r,u,k),templates);
      if(u.searchParams.get('archived_at')==='is.null')rows=rows.filter(r=>!r.archived_at);
      rows.forEach(r => Object.assign(r, JSON.parse(options.body),{updated_at:stamp()}));
    } else if (options.method === 'POST') {
      const row = JSON.parse(options.body);
      if (templates.some(t => t.id === row.id)) rows = [];
      else { rows=[{...row, archived_at:null,updated_at:stamp(),created_at:stamp()}];templates.push(rows[0]); }
    } else {
      rows = queryRows(templates, u, 'id');
      if (u.searchParams.get('archived_at') === 'is.null') rows = rows.filter(r => !r.archived_at);
    }
  }
  else if (u.pathname.endsWith('/rpc/pt_set_current_program')) {
    const body=JSON.parse(options.body),current=currentPrograms.find(p=>p.cliente_id===body.p_cliente_id);
    if(current)current.program_id=body.p_program_id;else currentPrograms.push({cliente_id:body.p_cliente_id,program_id:body.p_program_id});
    rows={currentProgramId:body.p_program_id};
  }
  else if (u.pathname.endsWith('/rpc/pt_save_program_with_current')) {
    const body = JSON.parse(options.body);
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    const previous = programs.find(p => p.id === body.p_program_id);
    if (previous && !body.p_force && previous.updated_at !== body.p_expected_updated_at) return new Response(JSON.stringify({success:false,code:'PROGRAM_CONFLICT',current:previous}));
    const row = { id: body.p_program_id, cliente_id: body.p_cliente_id, data: body.p_data,
      created_at: previous?.created_at || stamp(), updated_at: stamp() };
    const index = programs.findIndex(p => p.id === row.id);
    if (index >= 0) programs[index] = row; else programs.push(row);
    let current=currentPrograms.find(p=>p.cliente_id===row.cliente_id);
    if(!current){current={cliente_id:row.cliente_id,program_id:null};currentPrograms.push(current);}
    if(!previous && !row.data.archived)current.program_id=row.id;
    if(row.data.archived && current.program_id===row.id)current.program_id=programs.filter(p=>p.cliente_id===row.cliente_id&&!p.data.archived).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.id || null;
    for(let i=loads.length-1;i>=0;i--)if(loads[i].data.program_id===row.id)loads.splice(i,1);
    loads.push(...(body.p_load_rows || []));
    rows = { success: true, row, revision:null,currentProgramId:current.program_id };
  } else if (u.pathname.endsWith('/pt_program_revisions')) rows = ['id','cliente_id','program_id'].reduce((r,k)=>queryRows(r,u,k),revisions);
  else if (u.pathname.endsWith('/carichi_allenamento')) rows = queryRows(loads,u,'cliente_id');
  else if (u.pathname.endsWith('/pt_hand_grip_measurements')) {
    if(options.method==='POST') { const row=JSON.parse(options.body); if(!measurements.some(m=>m.id===row.id)){measurements.push(row);rows=[row];} }
    else if(options.method==='PATCH') { rows=queryRows(measurements,u,'id');rows.forEach(row=>Object.assign(row,JSON.parse(options.body))); }
    else rows=['id','cliente_id'].reduce((r,k)=>queryRows(r,u,k),measurements);
  } else if (!/\/(appointments|pt_session_records|acquisizioni|pt_program_revisions|pt_exercise_archive|carichi_allenamento|pt_hand_grip_measurements)$/.test(u.pathname)) {
    throw Error(`Network disabled in fixture: ${u.pathname}`);
  }
  if(Array.isArray(rows)&&u.searchParams.has('limit')){const offset=Number(u.searchParams.get('offset')||0);rows=rows.slice(offset,offset+Number(u.searchParams.get('limit')));}
  return new Response(JSON.stringify(rows), { status: 200 });
};
http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const send = (status, body, type = 'application/json') => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body); };
    if (u.pathname === '/__fixture/state') return send(200, JSON.stringify({programs,templates,folders,currentPrograms,revisions,measurements,loads}));
    if (u.pathname === '/__fixture/control' && req.method === 'POST') {
      let body='';for await(const chunk of req)body+=chunk;
      const input=JSON.parse(body);fault=input.fault||'';delay=Math.min(3000,Number(input.delay)||0);
      if(input.conflictProgramId){const row=programs.find(p=>p.id===input.conflictProgramId);if(row)row.updated_at=stamp();}
      return send(200,JSON.stringify({success:true}));
    }
    if (u.pathname.startsWith('/.netlify/functions/')) {
      let body = ''; for await (const chunk of req) body += chunk;
      if (u.pathname.endsWith('/pt-access-email')) {
        const input = JSON.parse(body), op = operators.find(o => o.email === input.email);
        if (!op || input.code !== '111111') return send(401, JSON.stringify({ success: false, error: 'Usa pt-a@example.test / 111111 (solo test)' }));
        const operator = auth.publicOperator(op);
        return send(200, JSON.stringify({ success: true, operator, token: auth.signAccessToken(operator.email, operator.id, operator.accessLevel) }));
      }
      const action=JSON.parse(body).action;
      if (fault==='offline' && action!=='bootstrap') return send(503,JSON.stringify({success:false,error:'Connessione assente simulata'}));
      const result = await handler({ httpMethod: req.method, headers: req.headers, body });
      if (fault===`${action}-lost-response` && result.statusCode===200) { fault='';return send(503,JSON.stringify({success:false,error:'Risposta persa simulata: riprova'})); }
      return send(result.statusCode, result.body);
    }
    const name = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep)) return send(404, '{}');
    if (name === 'js/coaching-editor.js' && req.headers.referer?.includes('editor=missing')) return send(404, '', 'text/javascript');
    let body = fs.readFileSync(file);
    if (name === 'index.html') body = body.toString().replace(
      /function accessFunctionBase\(\) \{[\s\S]*?\n    \}/,
      'function accessFunctionBase() { return ""; }',
    ).replace('<title>', '<title>TEST ISOLATO — ');
    send(200, body, name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html');
  } catch (error) { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(error.message); }
}).listen(Number(process.env.PT_FIXTURE_PORT || 8818), '127.0.0.1', () => console.log('Isolated synthetic PT fixture ready — pt-a@example.test / 111111'));
