const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {handle}=require('../tools/apple-caldav-production/functions/lib/manual-link.cjs');
(async()=>{
 const secret='SIM_ONLY',sign=(extra={},key=secret)=>{const p=Buffer.from(JSON.stringify({operatorId:'staff_1',email:'owner@example.test',accessLevel:'owner',exp:Date.now()+60000,...extra})).toString('base64url');return p+'.'+crypto.createHmac('sha256',key).update(p).digest('base64url')};
 let calls=0;const deps={env:{APPLE_CALDAV_CALENDAR_SECRET:secret},db:async()=>[{email:'owner@example.test',system_roles:['owner']}],service:()=>({link:async id=>{calls++;assert.equal(id,'TEST_ID');return{linked:true}},linkStatus:async()=>({linked:false,eligible:true})})};
 const invoke=(token,operation='link',more={})=>handle(new Request('https://sync.test/',{method:'POST',body:JSON.stringify({accessToken:token,operation,id:'TEST_ID',...more})}),deps);
 assert.equal((await invoke(sign())).status,200);assert.equal(calls,1);
 for(const t of [sign({},'WRONG'),sign({exp:1}),sign({operatorId:'pt_1'}),sign({accessLevel:'pt'}),sign({email:'fake@example.test'}),''])assert.equal((await invoke(t,'link',{actor:{role:'owner'}})).status,403);
 assert.equal((await invoke(sign(),'run')).status,400);assert.equal((await invoke(sign(),'link',{id:['TEST_ID']})).status,400);assert.equal(calls,1);
 deps.db=async()=>[{email:'owner@example.test',system_roles:['PT']}];assert.equal((await invoke(sign())).status,403);
 console.log('PASS manual endpoint: verified current Direction only, forged/expired/PT refused, no arbitrary operation or batch');
})().catch(e=>{console.error(e);process.exitCode=1});
