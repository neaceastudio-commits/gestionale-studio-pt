const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
test('Studio administrative/payment writes work without appointment revision; identity and Calendar revision remain enforced',async()=>{
 const previousFetch=global.fetch,previousSecret=process.env.PT_ACCESS_SECRET;process.env.PT_ACCESS_SECRET='SIM_PROTOCOL_SECRET';process.env.SUPABASE_SERVICE_ROLE_KEY='SIM_SERVER';let writes=0;
 const token=role=>{const payload=Buffer.from(JSON.stringify({operatorId:role,email:role+'@example.test',accessLevel:role==='owner'?'owner':'pt',exp:Date.now()+60000})).toString('base64url');return payload+'.'+crypto.createHmac('sha256','SIM_PROTOCOL_SECRET').update(payload).digest('base64url')};
 global.fetch=async(url,options)=>{let data;if(url.includes('operator_effective_roles')){const id=url.includes('eq.owner')?'owner':'pt';data=[{operator_id:id,email:id+'@example.test',active:true,legacy_roles:[id==='owner'?'Direzione':'PT'],system_roles:[]}];}else if(url.includes('/operators?'))data=[{id:'pt',portal_access_enabled:true,portal_access_version:0}];else{const body=JSON.parse(options.body);assert.equal(body.p_actor_role,'owner');assert.equal(body.p_operation,'client');writes++;data=body.p_payload.rows;}return {ok:true,text:async()=>JSON.stringify(data)};};
 try{const studio=require('../netlify/functions/studio-calendar-activity').handler,calendar=require('../netlify/functions/calendar-activity').handler;
 const payload={method:'PATCH',rows:[{id:'sim',importo:100,stato_pagamento:'Pagato'}]};
 const call=(handler,role,extra={})=>handler({httpMethod:'POST',body:JSON.stringify({accessToken:role?token(role):'',operation:'client',payload,...extra})});
 assert.equal((await call(studio,'owner')).statusCode,200);assert.equal(writes,1);
 assert.equal((await call(calendar,'owner')).statusCode,409);assert.equal(writes,1);
 assert.equal((await call(calendar,'owner',{calendarRevision:'20261030-shared-finance-v1'})).statusCode,200);assert.equal(writes,2);
 assert.equal((await call(studio,'pt')).statusCode,403);assert.equal((await call(studio,null)).statusCode,401);assert.equal(writes,2);
 }finally{global.fetch=previousFetch;if(previousSecret===undefined)delete process.env.PT_ACCESS_SECRET;else process.env.PT_ACCESS_SECRET=previousSecret;}
});
