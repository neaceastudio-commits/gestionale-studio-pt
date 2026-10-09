import test from 'node:test';import assert from 'node:assert/strict';import handler from '../netlify/functions/nutrition-import-bridge.mjs';
test('Anamnesi bridge forwards only to the existing gateway, preserves authorization and fails closed',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/nutrition-client-import');assert.equal(options.headers.Authorization,'Bearer TEST');assert.equal(options.redirect,'error');return Response.json({error:'Expired session'},{status:401});};
 assert.equal((await handler(new Request('https://local.test'))).status,405);
 assert.equal((await handler(new Request('https://local.test',{method:'POST',body:'{}'}))).status,401);assert.equal(calls,0);
 const request=()=>new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer TEST'},body:'{"action":"authorize"}'});
 assert.equal((await handler(request())).status,401);assert.equal(calls,1);
 globalThis.fetch=async()=>{throw Error('network')};assert.equal((await handler(request())).status,502);
 }finally{globalThis.fetch=original}
});
