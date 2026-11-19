import {test} from 'node:test';
import assert from 'node:assert/strict';
import helpers from './helpers/calendar-recovery-db.cjs';
import {createClientService} from '../netlify/functions/lib/whatsapp-client-service.mjs';
const rule=kind=>({audience:'clients',kind,frequency:'daily',weekday:1,time:'08:00',...(kind==='remaining'?{remainingThreshold:2}:{daysBefore:kind==='expiry'?3:1})});
test('client automation preview reads real local SQL, preserves balances and history, and reflects audited cancellation independently',async()=>{
 const f=await helpers.open();try{
  const seeded=await f.seed();await f.db.exec("alter table clients add column telefono text,add column if not exists cognome text;");
  await f.write({...seeded,id:'done-10',date:'2099-10-10',status:'fatto'});await f.patch({id:'a',telefono:'+393331234567',stato_abbonamento:'Attivo'});
  const db=async(table,{query})=>{
   assert.ok(['clients','appointments'].includes(table));const p=new URLSearchParams(query),select=p.get('select');assert.match(select,/^[a-z_,]+$/);
   let sql='select '+select+' from '+table+' where true',args=[];
   for(const key of ['id','date','status'])if(p.has(key)){assert.ok(p.get(key).startsWith('eq.'));args.push(p.get(key).slice(3));sql+=' and '+key+'=$'+args.length}
   if(p.has('client_ids')){assert.ok(p.get('client_ids').startsWith('cs.'));args.push(p.get('client_ids').slice(3));sql+=' and client_ids @> $'+args.length+'::jsonb'}
   args.push(Number(p.get('limit')));sql+=' order by id limit $'+args.length;args.push(Number(p.get('offset')));sql+=' offset $'+args.length;
   // PostgREST serializes SQL dates/times as JSON strings.
   return (await f.q('select to_jsonb(t) r from ('+sql+') t',args)).rows.map(row=>row.r);
  };
  const now=new Date('2099-11-01T07:00:00Z'),service=createClientService({db,now:()=>now});
  const before={clients:await f.all('clients'),appointments:await f.all('appointments')};
  const reminder=await service.plan(rule('appointment'),now.toISOString());assert.equal(reminder.items.length,1);assert.match(reminder.items[0].body,/02\/11\/2099.*17:00/);
  const remaining=await service.plan(rule('remaining'),now.toISOString());assert.equal(remaining.items.length,1);assert.match(remaining.items[0].body,/2 sedute residue su 12/);
  const expiry=await service.plan(rule('expiry'),now.toISOString());assert.equal(expiry.items.length,1);assert.match(expiry.items[0].body,/04\/11\/2099/);
  assert.deepEqual({clients:await f.all('clients'),appointments:await f.all('appointments')},before,'planning never modifies operational data');
  const source=before.appointments.find(a=>a.id==='source');await f.write({...source,status:'annullato'},source);
  assert.equal((await service.plan(rule('appointment'),now.toISOString())).items.length,0);
  assert.equal((await service.plan(rule('expiry'),now.toISOString())).items.length,0,'incomplete remaining bookings do not invent an expiry');
  const reopened=createClientService({db,now:()=>now});assert.equal((await reopened.plan(rule('appointment'),now.toISOString(),{clientId:'a'})).items.length,0);
  const after=await f.all('appointments');assert.equal(after.find(a=>a.id==='source').status,'annullato');assert.equal(after.length,before.appointments.length);
 }finally{await f.close()}
});
