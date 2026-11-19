'use strict';
// Compatibility API for the legacy Studio readers. Identity is supplied only by the server.
const TABLES=new Set(['clients','operators','appointments','acquisizioni','client_pt_alerts','trainer_client_assignments','operator_system_roles','operator_effective_roles','operator_availability','consensi_cliente']);
const OPERATOR_FIELDS=['id','nome','cognome','email','roles','active','color'];
const PAGE_SIZE = 500;
const MAX_SCOPED_QUERY_LENGTH = 7000;
const fail=(code,status=400)=>Object.assign(Error(code),{status});

async function readPage(db, table, params, offset, limit) {
 const query = new URLSearchParams(params);
 query.set('offset', offset);
 query.set('limit', limit);
 const rows = await db(table, { query: '?' + query });
 if (!Array.isArray(rows)) throw fail('invalid_database_response', 503);
 return rows;
}

async function all(db, table, params) {
 const rows = [];
 for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
  const page = await readPage(db, table, params, offset, PAGE_SIZE);
  rows.push(...page);
  if (page.length < PAGE_SIZE) return rows;
 }
 throw fail('read_limit_exceeded', 413);
}
async function clientScope(actor,db){
 const [assigned,shared,appointments]=await Promise.all([
  all(db,'clients',{select:'id',pt_assegnato:'eq.'+actor.id}),
  all(db,'trainer_client_assignments',{select:'client_id',trainer_id:'eq.'+actor.id,active:'eq.true'}),
  all(db,'appointments',{select:'client_ids',operator_id:'eq.'+actor.id})]);
 return new Set([...assigned.map(r=>r.id),...shared.map(r=>r.client_id),...appointments.flatMap(r=>r.client_ids||[])]);
}
async function read(actor,input,db){
 if(!actor||!['owner','pt','secretary'].includes(actor.role))throw fail('session_required',401);
 const table=input.table;if(!TABLES.has(table))throw fail('read_not_supported');
 if(['consensi_cliente','operator_system_roles'].includes(table)&&actor.role!=='owner')throw fail('direction_only',403);
 const params=new URLSearchParams(input.query||'');if(String(input.query||'').length>8000)throw fail('invalid_read_query');
 const columns=params.get('select')||'*';if(columns!=='*'&&!/^[a-z_]+(?:,[a-z_]+)*$/.test(columns))throw fail('invalid_read_query');
 const query=new URLSearchParams();
 const operator=table==='operators'||table==='operator_effective_roles';
 query.set('select',operator?(table==='operators'?OPERATOR_FIELDS.join(','):'operator_id,nome,cognome,email,legacy_roles,system_roles,active'):'*');
 for(const [key,value] of params){
  if(['select','order','limit','offset'].includes(key))continue;
  if(!/^[a-z_]+$/.test(key)||!/^(eq\.[^(),]*|neq\.[^(),]*|(?:gte|lte|gt|lt)\.[0-9T:.Z+ -]+|is\.(?:true|false|null)|in\.\([a-zA-Z0-9_,:-]+\)|ilike\.[a-zA-Z0-9@_.+ -]+)$/.test(value))throw fail('invalid_read_query');
  query.append(key,value);
 }
 const order=params.get('order');if(order){if(!/^[a-z_]+(?:\.(?:asc|desc))?(?:,[a-z_]+(?:\.(?:asc|desc))?)*$/.test(order))throw fail('invalid_read_query');query.set('order',order);}else query.set('order',table==='operator_availability'?'operator_id.asc,day_key.asc':table==='operator_effective_roles'?'operator_id.asc':'id.asc');
 const offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||100000);
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>100000)throw fail('invalid_read_query');
 let scope=null;
 if(actor.role==='pt'){
  if(['clients','client_pt_alerts'].includes(table))scope=await clientScope(actor,db);
  if(['appointments','operator_availability'].includes(table))query.append('operator_id','eq.'+actor.id);
  if(table==='trainer_client_assignments')query.append('trainer_id','eq.'+actor.id);
  if(table==='acquisizioni')query.append('created_by_operator_id','eq.'+actor.id);
 }
 const scopeColumn = table === 'clients' ? 'id' : 'client_id';
 let pageQuery = limit <= PAGE_SIZE ? new URLSearchParams(query) : null;
 if (pageQuery && scope) {
  if (!scope.size) return [];
  const ids = [...scope];
  // Historical IDs or long scopes still use exact matching before slicing.
  if (ids.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id))) {
   pageQuery.append(scopeColumn, 'in.(' + ids.join(',') + ')');
  } else {
   pageQuery = null;
  }
  if (pageQuery && pageQuery.toString().length > MAX_SCOPED_QUERY_LENGTH) pageQuery = null;
 }
 let rows = pageQuery
  ? await readPage(db, table, pageQuery, offset, limit)
  : await all(db, table, query);
 if (scope) rows = rows.filter(row => scope.has(row[scopeColumn]));
 if (!pageQuery) rows = rows.slice(offset, offset + limit);
 if(operator){const fields=table==='operators'?OPERATOR_FIELDS:['operator_id','nome','cognome','email','legacy_roles','system_roles','active'];rows=rows.map(r=>Object.fromEntries(fields.filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]])));}
 return columns==='*'?rows:rows.map(r=>Object.fromEntries(columns.split(',').filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]])));
}
module.exports={read,all,clientScope,TABLES};
