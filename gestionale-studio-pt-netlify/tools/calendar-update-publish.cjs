// Scoped Git-only corrective release. Does not restore or publish old deploys.
const fs=require('node:fs'),assert=require('node:assert/strict'),{api}=require('./calendar-client-release.cjs');
const [commit,branch]=process.argv.slice(2),siteId='28855faa-de52-4e4c-b1c2-e2db4965670f',baseline='6adf69f5f0d7ca2465d67586';
function repo(s,repo_branch){return Object.fromEntries([...['provider','repo_path','repo_url','repo_type','repo_owner_type','installation_id','deploy_key_id','public_repo','private_logs'].filter(k=>s.build_settings[k]!=null).map(k=>[k,s.build_settings[k]]),['repo_branch',repo_branch]])}
(async()=>{
 assert.match(commit||'',/^[a-f0-9]{40}$/);assert.equal(branch,'release/calendar-save-guard-20261026');
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,baseline);assert.equal(s.published_deploy.locked,true);
 const preview=JSON.parse(fs.readFileSync('/tmp/neacea-calendar-update-preview-verified.json'));assert.equal(preview.commit,commit);
 const managed=JSON.parse(fs.readFileSync('/tmp/neacea-calendar-update-managed-result.json'));assert.equal(managed.result.oldCalendarRejected,true);assert.equal(managed.result.rejectedWriteLeftDatabaseUntouched,true);
 let build;
 try{
  await api('/sites/'+siteId,'PATCH',{repo:repo(s,branch)});
  await api('/deploys/'+baseline+'/unlock','POST');
  build=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(branch)+'&commit_sha='+commit,'POST',{});
  console.log(JSON.stringify({productionBuild:build.id,requestedDeploy:build.deploy_id,commit}));
  let last;for(let i=0;i<90;i++){
   const state=await api('/sites/'+siteId),d=state.published_deploy;
   if(d.commit_ref===commit && d.state==='ready'){await api('/deploys/'+d.id+'/lock','POST');fs.writeFileSync('/tmp/neacea-calendar-update-production.json',JSON.stringify({deploy:d.id,commit,requestedDeploy:build.deploy_id}));console.log(JSON.stringify({published:d.id,commit}));return;}
   const pending=await api('/deploys/'+build.deploy_id);if(pending.state!==last){last=pending.state;console.log(JSON.stringify({state:last}));}if(pending.state==='error')throw Error(pending.error_message||'Build failed');await new Promise(r=>setTimeout(r,2000));
  }throw Error('Publication not confirmed within bounded wait');
 }finally{
  const current=await api('/sites/'+siteId);await api('/deploys/'+current.published_deploy.id+'/lock','POST');
  await api('/sites/'+siteId,'PATCH',{build_settings:{stop_builds:true,allowed_branches:['main']}});
  await api('/sites/'+siteId,'PATCH',{repo:repo(s,'main')});
  // Netlify resets stop_builds when the repository configuration is replaced.
  await api('/sites/'+siteId,'PATCH',{build_settings:{stop_builds:true,allowed_branches:['main']}});
  const restored=await api('/sites/'+siteId);assert.equal(restored.published_deploy.locked,true);assert.equal(restored.build_settings.repo_branch,'main');assert.equal(restored.build_settings.stop_builds,true);
  console.log(JSON.stringify({configurationRestored:true,published:restored.published_deploy.id}));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
