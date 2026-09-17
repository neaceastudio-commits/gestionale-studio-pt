const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {start,seed}=require('./helpers/calendar-postgres.cjs');
(async()=>{const pg=await start(),c=pg.client;let second;try{
 await seed(c);const before=(await c.query('select jsonb_agg(to_jsonb(c)) v from clients c')).rows[0].v;
 await c.query(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20260917201500_email_agenda_pt.sql'),'utf8'));
 const day=(await c.query("select (now() at time zone 'Europe/Rome')::date::text d")).rows[0].d;
 const token='00000000-0000-4000-8000-000000000001';
 for(const role of ['anon','authenticated']){await c.query('set role '+role);await assert.rejects(c.query('select * from email_agenda_deliveries'),/permission denied/);await assert.rejects(c.query('select email_agenda_claim($1,$2,$3,$4)',[day,'pt','{}',token]),/permission denied/);await c.query('reset role');}
 await c.query('set role service_role');second=await pg.connection();await second.query('set role service_role');
 const args=[day,'pt',JSON.stringify({to:['pt@example.test'],text:'agenda originale'}),token];
 const results=await Promise.all([c.query('select email_agenda_claim($1,$2,$3,$4) v',args),second.query('select email_agenda_claim($1,$2,$3,$4) v',args)]);assert.equal(results.filter(r=>r.rows[0].v).length,1);
 await c.query("update email_agenda_deliveries set locked_until=now()-interval '1 minute'");
 const retried=(await c.query('select email_agenda_claim($1,$2,$3,$4) v',[day,'pt',JSON.stringify({text:'modificato'}),token])).rows[0].v;assert.equal(retried.text,'agenda originale');
 assert.equal((await c.query("select email_agenda_finish($1,'pt',$2,'accepted','provider-test',null) v",[day,token])).rows[0].v,true);
 assert.equal((await c.query('select email_agenda_claim($1,$2,$3,$4) v',args)).rows[0].v,null);
 await c.query('reset role');assert.deepEqual((await c.query('select jsonb_agg(to_jsonb(c)) v from clients c')).rows[0].v,before);
 console.log('PASS: concurrent claims, immutable retries, accepted deduplication, private RLS, unchanged client balances');
 }finally{if(second)await second.end();await pg.close();}})().catch(e=>{console.error(e);process.exitCode=1});
