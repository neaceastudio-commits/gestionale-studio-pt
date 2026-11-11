const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {setup}=require('./helpers/calendar-recovery-db.cjs');
test('independent PostgreSQL planners cannot book the same residual twice; retries share the same result',async()=>{
 process.env.EMBEDDED_POSTGRES_MODULE ||= require.resolve('embedded-postgres',{paths:[path.resolve(__dirname,'../tools/coaching-editor')]});
 const cluster=await require('./helpers/calendar-postgres.cjs').start();let second;
 try{
  const db=cluster.client;await setup({exec:sql=>db.query(sql),query:(sql,args)=>db.query(sql,args)},true,true);
  await db.query(fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20261111100621_calendar_pair_solo_recovery.sql'),'utf8'));await db.query('set role service_role');
  const rpc=async(name,args)=>(await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) r`,args)).rows[0].r;
  const a=(await db.query("select to_jsonb(c) r from clients c where id='a'")).rows[0].r;
  await rpc('calendar_save_pair_client',['owner',crypto.randomUUID(),JSON.stringify({client:{...a,pt_partner_id:'b'},expectedUpdatedAt:a.updated_at})]);
  await rpc('calendar_audit_write',['owner','owner','calendar',crypto.randomUUID(),'client',JSON.stringify({method:'PATCH',rows:[{id:'a',sessions_remaining:2},{id:'b',active:false,stato_abbonamento:'Ibernato'}]})]);
  const c=(await db.query("select to_jsonb(c) r from clients c where id='a'")).rows[0].r;
  const payload=()=>({mode:'pair_solo',suspendedPartnerId:'b',clients:[{id:'a',expectedUpdatedAt:c.updated_at,renewal:null}],appointments:[0,1].map(n=>({id:'solo-'+crypto.randomUUID(),service_id:'pt11',client_ids:['a'],operator_id:'pt',date:'2099-11-'+(10+n),start_time:'17:00',duration_min:60,buffer_min:10,status:'prenotato'}))});
  second=await cluster.connection();await second.query('set role service_role');
  const save=(connection,id,p)=>connection.query('select calendar_plan_pair_solo($1,$2,$3) r',['owner',id,JSON.stringify(p)]);
  const plans=[payload(),payload()],ids=[crypto.randomUUID(),crypto.randomUUID()];const results=await Promise.allSettled([save(db,ids[0],plans[0]),save(second,ids[1],plans[1])]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.match(results.find(x=>x.status==='rejected').reason.message,/residuo/);
  const winner=results.findIndex(x=>x.status==='fulfilled'),retries=await Promise.all([save(db,ids[winner],plans[winner]),save(second,ids[winner],plans[winner])]);assert.deepEqual(retries[0].rows[0].r,retries[1].rows[0].r);
  assert.equal((await db.query("select count(*)::int n from appointments where status='prenotato'")).rows[0].n,2);assert.equal((await second.query("select sessions_remaining from clients where id='b'")).rows[0].sessions_remaining,12);
 }finally{await second?.end();await cluster.close()}
});
