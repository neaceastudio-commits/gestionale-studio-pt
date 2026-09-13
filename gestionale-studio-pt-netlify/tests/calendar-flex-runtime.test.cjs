const assert=require('node:assert/strict');const {handler}=require('../netlify/functions/calendar-runtime');
(async()=>{const original=global.fetch;process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_ONLY';try{
 let calls=0;global.fetch=async(url,o)=>{calls++;assert.ok(url.endsWith('/rpc/calendar_flex_mode'));assert.equal(o.method,'POST');assert.equal(o.body,'{}');return {ok:true,text:async()=> 'true'}};
 let r=await handler({httpMethod:'GET'});assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).CALENDAR_FLEX_MODE,true);assert.equal(r.headers['Cache-Control'],'no-store');r=await handler({httpMethod:'HEAD'});assert.equal(r.body,'');r=await handler({httpMethod:'POST',body:'{"CALENDAR_FLEX_MODE":true}'});assert.equal(r.statusCode,405);assert.equal(calls,2);
 global.fetch=async()=>{throw Error('offline')};r=await handler({httpMethod:'GET'});assert.equal(r.statusCode,503);assert.equal(JSON.parse(r.body).CALENDAR_FLEX_MODE,false);console.log('PASS runtime flag: GET/HEAD only, database authoritative, no cache, failure defaults strict');
}finally{global.fetch=original}})().catch(e=>{console.error(e);process.exitCode=1});
