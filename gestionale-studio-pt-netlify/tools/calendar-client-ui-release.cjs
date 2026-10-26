// Scoped two-asset UI release; all server bundles must remain identical.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process'),{api}=require('./calendar-client-release.cjs');
const [mode,id]=process.argv.slice(2),c=JSON.parse(fs.readFileSync('/tmp/neacea-client-ui-candidate.json')),base=JSON.parse(fs.readFileSync('/tmp/neacea-client-ui-baseline.json')),siteId=base.site.id;
const repo=branch=>Object.fromEntries([...['provider','repo_path','repo_url','repo_type','repo_owner_type','installation_id','deploy_key_id','public_repo','private_logs'].filter(k=>base.site.build_settings[k]!=null).map(k=>[k,base.site.build_settings[k]]),['repo_branch',branch]]);
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
async function verify(deployId,live=false){
 const d=await api('/deploys/'+deployId);assert.equal(d.site_id,siteId);assert.equal(d.state,'ready');assert.equal(d.commit_ref,c.commit);
 const expected={...base.files};for(const f of ['index.html','js/clients.js'])expected['/'+f]=sha(cp.execFileSync('git',['show',c.commit+':gestionale-studio-pt-netlify/app/calendario-studio/'+f]));
 const files=await api('/deploys/'+d.id+'/files');assert.deepEqual(Object.fromEntries(files.map(f=>[f.path,f.sha])),expected);assert.equal(d.available_functions.length,15);
 for(const f of d.available_functions){const old=base.deploy.available_functions.find(x=>x.n===f.n);assert.ok(old);for(const k of ['d','r','rg','m','rgo','mo','p','bd','im'])assert.deepEqual(f[k],old[k],f.n+': '+k);}
 assert.deepEqual(d.function_schedules,base.deploy.function_schedules);
 const origin=live?'https://new-calendar-neacea.netlify.app':d.links.permalink;
 for(const f of ['index.html','js/clients.js']){const r=await fetch(origin+'/'+f+'?release='+d.id);assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),expected['/'+f]);}
 const r=await fetch(origin+'/.netlify/functions/calendar-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'session'})});assert.equal(r.status,401);
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,live?d.id:base.deploy.id);assert.equal(s.published_deploy.locked,true);
 const proof={commit:c.commit,deploy:d.id,publishedAt:d.published_at,live,files:files.length,verifiedAssets:2,unchangedFunctions:15,schedules:d.function_schedules.length,anonymousStatus:401};fs.writeFileSync('/tmp/neacea-client-ui-'+(live?'published':'preview')+'-verified.json',JSON.stringify(proof));console.log(JSON.stringify(proof));return proof;
}
(async()=>{
 if(mode==='verify-preview')return verify(id);
 if(mode==='verify-live')return verify(id,true);
 const s=await api('/sites/'+siteId);assert.equal(s.published_deploy.id,base.deploy.id);assert.equal(s.published_deploy.locked,true);
 if(mode==='preview'){await api('/sites/'+siteId,'PATCH',{build_settings:{allowed_branches:['main',c.branch],stop_builds:false}});const b=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(c.branch)+'&commit_sha='+c.commit,'POST',{});fs.writeFileSync('/tmp/neacea-client-ui-preview.json',JSON.stringify({deploy:b.deploy_id,build:b.id}));return console.log(JSON.stringify({preview:b.deploy_id}));}
 assert.equal(mode,'publish');assert.equal(JSON.parse(fs.readFileSync('/tmp/neacea-client-ui-preview-verified.json')).commit,c.commit);assert.ok(fs.readFileSync('/tmp/neacea-client-ui-candidate-check.log','utf8').trim().endsWith('OK: pacchetto Calendario completo e verificato.'));
 try{
  await api('/sites/'+siteId,'PATCH',{repo:repo(c.branch)});await api('/deploys/'+base.deploy.id+'/unlock','POST');
  const b=await api('/sites/'+siteId+'/builds?branch='+encodeURIComponent(c.branch)+'&commit_sha='+c.commit,'POST',{});console.log(JSON.stringify({productionBuild:b.id,requestedDeploy:b.deploy_id}));
  for(let i=0;i<90;i++){const state=await api('/sites/'+siteId),d=state.published_deploy;if(d.commit_ref===c.commit&&d.state==='ready'){await api('/deploys/'+d.id+'/lock','POST');fs.writeFileSync('/tmp/neacea-client-ui-production.json',JSON.stringify({deploy:d.id,commit:c.commit}));console.log(JSON.stringify({published:d.id}));return;}const pending=await api('/deploys/'+b.deploy_id);if(pending.state==='error')throw Error(pending.error_message||'Build failed');await new Promise(r=>setTimeout(r,2000));}throw Error('Publication not confirmed');
 }finally{const current=await api('/sites/'+siteId);await api('/deploys/'+current.published_deploy.id+'/lock','POST');await api('/sites/'+siteId,'PATCH',{build_settings:{stop_builds:true,allowed_branches:['main']}});await api('/sites/'+siteId,'PATCH',{repo:repo('main')});await api('/sites/'+siteId,'PATCH',{build_settings:{stop_builds:true,allowed_branches:['main']}});const final=await api('/sites/'+siteId);assert.equal(final.build_settings.stop_builds,true);assert.equal(final.published_deploy.locked,true);assert.equal(final.build_settings.repo_branch,'main');console.log(JSON.stringify({configurationRestored:true}));}
})().catch(error=>{console.error(error.message);process.exitCode=1});
