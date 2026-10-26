// One-shot unpublished validation: fixed synthetic IDs, exact candidate bundle.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),siteId='28855faa-de52-4e4c-b1c2-e2db4965670f';const [ref,candidateId]=process.argv.slice(2);
const {api,configs}=require('./calendar-client-release.cjs');
const cap=crypto.randomBytes(32).toString('hex'),capHash=crypto.createHash('sha256').update(cap).digest('hex'),expires=Date.now()+600000;
(async()=>{
 const site=await api('/sites/'+siteId);assert.equal(site.published_deploy.id,'6ad91785fd911ad109a6344c');assert.equal(site.published_deploy.locked,true);
 const candidate=await api('/deploys/'+candidateId);assert.equal(candidate.site_id,siteId);assert.equal(candidate.state,'ready');
 const bundle=await require('./calendar-client-bundle.cjs').build(ref);assert.equal(candidate.available_functions.find(f=>f.n==='calendar-activity').d,bundle.sha256);
 const test=cp.execFileSync('git',['show',ref+':gestionale-studio-pt-netlify/tests/fixtures/calendar-client-managed-check.cjs'],{cwd:root}).toString();
 const source=bundle.js.toString()+`\nconst candidateHandler=exports.handler;const checkModule={exports:{}};((module)=>{${test}})(checkModule);\nexports.handler=async event=>{const hash=require('node:crypto').createHash('sha256').update(String(event.headers?.['x-calendar-validation']||'')).digest('hex');if(Date.now()>${expires}||event.httpMethod!=='POST'||hash!==${JSON.stringify(capHash)})return{statusCode:404,body:'Not found'};try{return{statusCode:200,body:JSON.stringify(await checkModule.exports(candidateHandler,process.env.PT_ACCESS_SECRET||process.env.RESEND_API_KEY))}}catch(e){return{statusCode:500,body:JSON.stringify({error:e.message})}}};`;
 const archive=require('./calendar-client-bundle.cjs').zip(Buffer.from(source),'calendar-client-validation.js'),sha=crypto.createHash('sha256').update(archive).digest('hex');
 const files=Object.fromEntries((await api('/deploys/'+candidateId+'/files')).map(f=>[f.path,f.sha]));const functions=Object.fromEntries(candidate.available_functions.map(f=>[f.n,f.d]));functions['calendar-client-validation']=sha;
 const functions_config=configs(candidate.available_functions);functions_config['calendar-client-validation']={build_data:{runtimeAPIVersion:1}};
 const d=await api('/sites/'+siteId+'/deploys?title='+encodeURIComponent('Temporary synthetic Calendar validation '+ref),'POST',{files,functions,functions_config,function_schedules:candidate.function_schedules,draft:false,async:false});console.log(JSON.stringify({validationDeploy:d.id}));assert.equal((d.required||[]).length,0);
 for(const wanted of d.required_functions||[]){assert.equal(wanted,sha);await api('/deploys/'+d.id+'/functions/calendar-client-validation?runtime=js','PUT',archive,true)}
 let ready;for(let i=0;i<40;i++){ready=await api('/deploys/'+d.id);if(ready.state==='ready')break;assert.notEqual(ready.state,'error');await new Promise(r=>setTimeout(r,1000))}assert.equal(ready.state,'ready');assert.equal((await api('/sites/'+siteId)).published_deploy.id,site.published_deploy.id);
 const r=await fetch(ready.links.permalink+'/.netlify/functions/calendar-client-validation',{method:'POST',headers:{'x-calendar-validation':cap},signal:AbortSignal.timeout(60000)});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));console.log(JSON.stringify({validationDeploy:d.id,result}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
