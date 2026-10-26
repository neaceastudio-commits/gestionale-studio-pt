// Git-only, unpublished runtime validation. No raw capability is written to disk/Git.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {api}=require('./calendar-client-release.cjs');const root=path.resolve(__dirname,'..'),repo=path.dirname(root),prefix='gestionale-studio-pt-netlify/';
const [ref,candidateId]=process.argv.slice(2),siteId='28855faa-de52-4e4c-b1c2-e2db4965670f';
const cap=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(cap).digest('hex'),expires=Date.now()+600000;
const index=path.join(os.tmpdir(),'neacea-calendar-probe-index-'+crypto.randomBytes(6).toString('hex')),env={...process.env,GIT_INDEX_FILE:index};
const git=(args,input)=>cp.execFileSync('git',args,{cwd:repo,env,input,maxBuffer:8*1024*1024}).toString().trim();
(async()=>{
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,'6ad91785fd911ad109a6344c');assert.equal(s.published_deploy.locked,true);
 const candidate=await api('/deploys/'+candidateId);assert.equal(candidate.commit_ref,ref);
 const test=git(['show',ref+':'+prefix+'tests/fixtures/calendar-client-managed-check.cjs']);
 const wrapper=`const candidateHandler=require('./calendar-activity.js').handler;const checkModule={exports:{}};((module)=>{${test}})(checkModule);\nexports.handler=async event=>{const h=require('node:crypto').createHash('sha256').update(String(event.headers?.['x-calendar-validation']||'')).digest('hex');if(Date.now()>${expires}||event.httpMethod!=='POST'||h!==${JSON.stringify(hash)})return{statusCode:404,body:'Not found'};try{return{statusCode:200,body:JSON.stringify(await checkModule.exports(candidateHandler,process.env.PT_ACCESS_SECRET||process.env.RESEND_API_KEY))}}catch(e){return{statusCode:500,body:JSON.stringify({error:e.message})}}};\n`;
 let toml=git(['show',ref+':netlify.toml']);toml=toml.replace(/(  command = ".*)"/,`$1 && cp ${prefix}tests/fixtures/calendar-client-validation-wrapper.js .netlify/calendar-functions/calendar-client-validation.js"`);
 git(['read-tree',ref]);for(const [name,content]of [['netlify.toml',toml+'\n'],[prefix+'tests/fixtures/calendar-client-validation-wrapper.js',wrapper]]){const b=git(['hash-object','-w','--stdin'],content);git(['update-index','--add','--cacheinfo','100644',b,name])}
 const tree=git(['write-tree']),commit=git(['commit-tree',tree,'-p',ref,'-m','Temporary synthetic-only Calendar validation']);fs.unlinkSync(index);
 const branch='release/calendar-client-validation-20261026';git(['update-ref','refs/heads/'+branch,commit,'']);git(['push','origin','refs/heads/'+branch+':refs/heads/'+branch]);
 await api('/sites/'+siteId,'PATCH',{build_settings:{allowed_branches:['main',candidate.branch,branch],stop_builds:false}});
 const b=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(branch)+'&commit_sha='+commit,'POST',{});console.log(JSON.stringify({validationBuild:b.id,validationDeploy:b.deploy_id,commit}));
 let d;for(let i=0;i<90;i++){d=await api('/deploys/'+b.deploy_id);if(d.state==='ready')break;if(d.state==='error')throw Error(d.error_message||'Validation build failed');await new Promise(r=>setTimeout(r,2000))}assert.equal(d.state,'ready');assert.equal(d.commit_ref,commit);assert.equal(d.context,'branch-deploy');
 assert.equal(d.available_functions.find(f=>f.n==='calendar-activity').d,candidate.available_functions.find(f=>f.n==='calendar-activity').d,'Validation must reuse exact Calendar function bundle');
 const r=await fetch(d.links.permalink+'/.netlify/functions/calendar-client-validation',{method:'POST',headers:{'x-calendar-validation':cap},signal:AbortSignal.timeout(60000)});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));assert.equal((await api('/sites/'+siteId)).published_deploy.id,s.published_deploy.id);console.log(JSON.stringify({validationDeploy:d.id,result}));
 fs.writeFileSync('/tmp/neacea-calendar-managed-result.json',JSON.stringify({validationDeploy:d.id,commit,result}));
})().catch(e=>{try{fs.unlinkSync(index)}catch{}console.error(e.message);process.exitCode=1});
