// Scoped Calendar release, explicitly authorized on 26 October 2026.
// Credentials stay in memory. Existing file/function digests are preserved.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),prefix='gestionale-studio-pt-netlify/';
const siteId='28855faa-de52-4e4c-b1c2-e2db4965670f',baselineId='6ad91785fd911ad109a6344c';
const planFile='docs/releases/20261026-calendar-client-baseline.json';
const [mode,ref,deployId]=process.argv.slice(2);
const git=(...args)=>cp.execFileSync('git',args,{cwd:root,maxBuffer:8*1024*1024});
const sha=(b,type='sha1')=>crypto.createHash(type).update(b).digest('hex');
let credential;
function token(){if(!credential){const c=JSON.parse(fs.readFileSync(path.join(os.homedir(),'Library/Preferences/netlify/config.json')));credential=process.env.NETLIFY_AUTH_TOKEN||c.users[c.userId].auth.token;}return credential}
async function api(p,method='GET',body,binary=false){const r=await fetch('https://api.netlify.com/api/v1'+p,{method,headers:{Authorization:'Bearer '+token(),...(body?{'Content-Type':binary?'application/octet-stream':'application/json'}:{})},body:body?(binary?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok){let detail='';try{const e=await r.json();detail=String(e.message||e.error||'').slice(0,1200)}catch{}throw Error('Netlify '+method+' '+p+': '+r.status+' '+detail)}return r.status===204?null:r.json()}
const normalize=items=>[...items].sort((a,b)=>a.n.localeCompare(b.n)).map(f=>Object.fromEntries(['n','d','id','r','rg','m','rgo','mo','p','bd','im','oid','obl','oblv'].filter(k=>f[k]!==undefined).map(k=>[k,f[k]])));
const configs=functions=>Object.fromEntries(functions.map(f=>[f.n,Object.fromEntries(Object.entries({display_name:f.dn,generator:f.g,build_data:f.bd,region:f.rgo,memory:f.mo,priority:f.p}).filter(([,v])=>v!=null))]));
async function baseline(){const site=await api('/sites/'+siteId);assert.equal(site.published_deploy.id,baselineId);assert.equal(site.published_deploy.locked,true);const d=await api('/deploys/'+baselineId);const inventory=await api('/deploys/'+baselineId+'/files');
 const changes=['index.html','js/app.js','js/clients.js','js/supabase.js'].map(asset=>({asset,source:'app/calendario-studio/'+asset}));
 const plan={siteId,baselineDeploy:baselineId,commit:d.commit_ref,functions:d.available_functions,functionSchedules:d.function_schedules,files:Object.fromEntries(inventory.map(f=>[f.path,f.sha])),changes,build:{repo:site.build_settings?.repo_url,branch:site.build_settings?.repo_branch,publish:site.build_settings?.dir,base:site.build_settings?.base,stopBuilds:site.build_settings?.stop_builds}};
 for(const c of changes){const r=await fetch('https://new-calendar-neacea.netlify.app/'+c.asset,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),plan.files['/'+c.asset]);}
 fs.writeFileSync(path.join(root,planFile),JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({baseline:baselineId,files:inventory.length,functions:d.available_functions.length,build:plan.build}));}
async function main(){if(mode==='baseline')return baseline();
 const commit=git('rev-parse','--verify',ref+'^{commit}').toString().trim();
 const read=p=>git('show',commit+':'+prefix+p);const plan=JSON.parse(read(planFile));assert.equal(plan.siteId,siteId);assert.equal(plan.baselineDeploy,baselineId);
 const files={...plan.files},payloads=new Map();for(const c of plan.changes){const b=read(c.source),s=sha(b);files['/'+c.asset]=s;payloads.set(s,{asset:c.asset,data:b});}
 const bundle=await require('./calendar-client-bundle.cjs').build(commit);
 const functions=Object.fromEntries(plan.functions.map(f=>[f.n,f.n==='calendar-activity'?bundle.sha256:f.d]));
 async function verify(id,live=false){const d=await api('/deploys/'+id);assert.equal(d.site_id,siteId);assert.equal(d.state,'ready');assert.equal(d.context,'production');assert.ok(d.title.includes(commit));assert.equal(d.available_functions.length,15);
 assert.deepEqual(normalize(d.available_functions.filter(f=>f.n!=='calendar-activity')),normalize(plan.functions.filter(f=>f.n!=='calendar-activity')));const actual=d.available_functions.find(f=>f.n==='calendar-activity'),prior=plan.functions.find(f=>f.n==='calendar-activity');assert.equal(actual.d,bundle.sha256);assert.equal(actual.r,'nodejs24.x');for(const k of ['rg','m','rgo','mo','p','bd','im'])assert.deepEqual(actual[k],prior[k]);assert.deepEqual(d.function_schedules,plan.functionSchedules);
 const inventory=await api('/deploys/'+id+'/files');assert.deepEqual(Object.fromEntries(inventory.map(f=>[f.path,f.sha])),files);
 const origin=live?'https://new-calendar-neacea.netlify.app':d.links.permalink;
 for(const c of plan.changes){const r=await fetch(origin+'/'+c.asset+'?release='+id,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),files['/'+c.asset]);}
 const denied=await fetch(origin+'/.netlify/functions/calendar-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'session'}),signal:AbortSignal.timeout(30000)});assert.equal(denied.status,401);
 if(live){const site=await api('/sites/'+siteId);assert.equal(site.published_deploy.id,id);assert.equal(site.published_deploy.locked,true)}
 return {commit,deploy:id,files:inventory.length,verifiedAssets:plan.changes.length,unchangedFunctions:14,schedules:d.function_schedules.length,anonymousStatus:denied.status,live,bundle:bundle.sha256};}
 async function create(){const d=await api('/sites/'+siteId+'/deploys?title='+encodeURIComponent('Calendario: trasferimento PT e gruppi clienti — '+commit),'POST',{files,functions,functions_config:configs(plan.functions),function_schedules:plan.functionSchedules,draft:false,async:false});console.log(JSON.stringify({created:d.id,commit}));for(const s of d.required_functions||[]){assert.equal(s,bundle.sha256);await api('/deploys/'+d.id+'/functions/calendar-activity?runtime=js','PUT',bundle.archive,true)}for(const s of d.required||[]){const f=payloads.get(s);assert.ok(f,'Requested file outside scope');await api('/deploys/'+d.id+'/files/'+f.asset,'PUT',f.data,true)}assert.equal((d.required_edge_functions||[]).length,0);assert.equal((d.required_server||[]).length,0);for(let i=0;i<40;i++){const ready=await api('/deploys/'+d.id);if(ready.state==='ready')return ready;assert.notEqual(ready.state,'error');await new Promise(r=>setTimeout(r,1000))}throw Error('Deploy not ready within bounded wait');}
 if(mode==='verify')return console.log(JSON.stringify(await verify(deployId,true)));
 if(mode==='verify-preview')return console.log(JSON.stringify(await verify(deployId)));
 assert.ok(['preview','deploy'].includes(mode));const site=await api('/sites/'+siteId);assert.equal(site.published_deploy.id,baselineId);assert.equal(site.published_deploy.locked,true);assert.deepEqual(Object.fromEntries((await api('/deploys/'+baselineId+'/files')).map(f=>[f.path,f.sha])),plan.files);
 if(mode==='preview'){const d=await create();assert.equal((await api('/sites/'+siteId)).published_deploy.id,baselineId);return console.log(JSON.stringify(await verify(d.id)))}
 await verify(deployId);await api('/deploys/'+baselineId+'/unlock','POST');try{const d=await create();await api('/deploys/'+d.id+'/lock','POST');console.log(JSON.stringify(await verify(d.id,true)))}catch(e){const current=await api('/sites/'+siteId);await api('/deploys/'+current.published_deploy.id+'/lock','POST');throw e}
}
module.exports={api,configs};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
