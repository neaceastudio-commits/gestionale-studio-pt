// Explicitly authorized Git release. Only two static assets may change.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const {api}=require('./calendar-client-release.cjs');
const [mode,id]=process.argv.slice(2),root='/tmp/neacea-pair-recovery-',base=JSON.parse(fs.readFileSync(root+'baseline.json')),candidate=JSON.parse(fs.readFileSync(root+'candidate.json'));
const siteId=base.site.id,assets=['index.html','js/pt-pair-sessions.js'];
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
const gitFile=asset=>cp.execFileSync('git',['show',candidate.commit+':gestionale-studio-pt-netlify/app/calendario-studio/'+asset],{maxBuffer:8*1024*1024});
const repo=branch=>Object.fromEntries([...['provider','repo_path','repo_url','repo_type','repo_owner_type','installation_id','deploy_key_id','public_repo','private_logs'].filter(k=>base.site.build_settings[k]!=null).map(k=>[k,base.site.build_settings[k]]),['repo_branch',branch]]);
async function verify(deployId,live=false){
 const d=await api('/deploys/'+deployId);assert.equal(d.site_id,siteId);assert.equal(d.state,'ready');assert.equal(d.commit_ref,candidate.commit);
 const files=Object.fromEntries((await api('/deploys/'+d.id+'/files')).map(f=>[f.path,f.sha]));
 const expected={...base.files};for(const a of assets)expected['/'+a]=sha(gitFile(a));assert.deepEqual(files,expected);
 assert.equal(d.available_functions.length,base.deploy.available_functions.length);
 for(const f of d.available_functions){const old=base.deploy.available_functions.find(x=>x.n===f.n);assert.ok(old);for(const k of ['d','r','rg','m','rgo','mo','p','bd','im'])assert.deepEqual(f[k],old[k],f.n+': '+k);}
 assert.deepEqual(d.function_schedules,base.deploy.function_schedules);
 const origin=live?'https://new-calendar-neacea.netlify.app':d.links.permalink;
 for(const a of assets){const r=await fetch(origin+'/'+a+'?release='+d.id,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),expected['/'+a]);}
 const response=await fetch(origin+'/.netlify/functions/calendar-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'session'}),signal:AbortSignal.timeout(30000)});assert.equal(response.status,401);
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,live?d.id:base.deploy.id);assert.equal(s.published_deploy.locked,true);
 const proof={commit:candidate.commit,branch:candidate.branch,deploy:d.id,publishedAt:d.published_at,origin,live,files:Object.keys(files).length,changedAssets:assets,unchangedFunctions:d.available_functions.length,schedules:d.function_schedules.length,anonymousStatus:401};
 fs.writeFileSync(root+(live?'published':'preview')+'-verified.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));return proof;
}
(async()=>{
 if(mode==='verify-preview')return verify(id);
 if(mode==='verify-live')return verify(id,true);
 if(mode==='status'){const d=await api('/deploys/'+id);console.log(JSON.stringify({deploy:d.id,state:d.state,commit:d.commit_ref,context:d.context,error:d.error_message}));return;}
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,base.deploy.id);assert.equal(s.published_deploy.locked,true);
 if(mode==='preview'){
  await api('/sites/'+siteId,'PATCH',{build_settings:{allowed_branches:[...new Set([...base.site.build_settings.allowed_branches,candidate.branch])],stop_builds:false}});
  const b=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(candidate.branch)+'&commit_sha='+candidate.commit,'POST',{});
  fs.writeFileSync(root+'preview.json',JSON.stringify({deploy:b.deploy_id,build:b.id}));console.log(JSON.stringify({preview:b.deploy_id,build:b.id}));return;
 }
 assert.equal(mode,'publish');assert.equal(JSON.parse(fs.readFileSync(root+'preview-verified.json')).commit,candidate.commit);
 assert.ok(fs.readFileSync(root+'candidate-check.log','utf8').trim().endsWith('OK: pacchetto Calendario completo e verificato.'));
 assert.ok(fs.readFileSync(root+'candidate-recovery.log','utf8').includes('PASS recovery: UI → real gateway → local PostgreSQL'));
 assert.ok(fs.readFileSync(root+'preview-browser.log','utf8').includes('PASS recovery: UI → real gateway → local PostgreSQL'));
 try{
  await api('/sites/'+siteId,'PATCH',{repo:repo(candidate.branch)});await api('/deploys/'+base.deploy.id+'/unlock','POST');
  const b=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(candidate.branch)+'&commit_sha='+candidate.commit,'POST',{});console.log(JSON.stringify({productionBuild:b.id,requestedDeploy:b.deploy_id}));
  for(let i=0;i<90;i++){
   const state=await api('/sites/'+siteId),d=state.published_deploy;
   if(d.commit_ref===candidate.commit&&d.state==='ready'){await api('/deploys/'+d.id+'/lock','POST');fs.writeFileSync(root+'production.json',JSON.stringify({deploy:d.id,commit:candidate.commit,requestedDeploy:b.deploy_id}));console.log(JSON.stringify({published:d.id}));return;}
   const pending=await api('/deploys/'+b.deploy_id);if(pending.state==='error')throw Error(pending.error_message||'Build failed');await new Promise(r=>setTimeout(r,2000));
  }throw Error('Publication not confirmed');
 }finally{
  const current=await api('/sites/'+siteId);await api('/deploys/'+current.published_deploy.id+'/lock','POST');
  const settings={stop_builds:base.site.build_settings.stop_builds,allowed_branches:base.site.build_settings.allowed_branches};
  await api('/sites/'+siteId,'PATCH',{build_settings:settings});await api('/sites/'+siteId,'PATCH',{repo:repo(base.site.build_settings.repo_branch)});await api('/sites/'+siteId,'PATCH',{build_settings:settings});
  const final=await api('/sites/'+siteId);assert.equal(final.build_settings.stop_builds,settings.stop_builds);assert.deepEqual(final.build_settings.allowed_branches,settings.allowed_branches);assert.equal(final.published_deploy.locked,true);assert.equal(final.build_settings.repo_branch,base.site.build_settings.repo_branch);console.log(JSON.stringify({configurationRestored:true}));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
