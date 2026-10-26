// Read-only verification against the actual previous production and committed candidate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const {api}=require('./calendar-client-release.cjs'),root=path.resolve(__dirname,'..');
const [ref,id,live]=process.argv.slice(2),siteId='28855faa-de52-4e4c-b1c2-e2db4965670f';
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
const git=p=>cp.execFileSync('git',['show',ref+':gestionale-studio-pt-netlify/'+p],{cwd:root});
(async()=>{
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/releases/20261026-calendar-save-guard-baseline.json')));
 const d=await api('/deploys/'+id);assert.equal(d.state,'ready');assert.equal(d.site_id,siteId);assert.equal(d.commit_ref,ref);
 const expected={...baseline.files},changed=['_headers','index.html','js/calendar-audit.js','js/supabase.js'];
 for(const f of changed)expected['/'+f]=sha(git('app/calendario-studio/'+f));
 const inventory=await api('/deploys/'+id+'/files');assert.deepEqual(Object.fromEntries(inventory.map(f=>[f.path,f.sha])),expected);
 assert.deepEqual(d.function_schedules,baseline.schedules);assert.equal(d.available_functions.length,baseline.functions.length);
 const gateways=['calendar-activity','studio-calendar-activity','acquisition-calendar-activity'],scheduled=['whatsapp-agenda-scheduled','expected-renewals-scheduled'];
 for(const f of d.available_functions){const old=baseline.functions.find(x=>x.n===f.n);assert.ok(old);for(const k of ['r','rg','m','rgo','mo','p','bd','im'])assert.deepEqual(f[k],old[k],f.n+': '+k);if(![...gateways,...scheduled].includes(f.n))assert.equal(f.d,old.d,f.n);}
 const origin=live==='live'?'https://new-calendar-neacea.netlify.app':d.links.permalink;
 for(const f of changed.filter(f=>f!=='_headers')){const r=await fetch(origin+'/'+f+'?release='+id,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),expected['/'+f]);}
 for(const f of ['/','/index.html']){const r=await fetch(origin+f,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.match(r.headers.get('cache-control')||'',/no-cache/);assert.match(r.headers.get('cache-control')||'',/must-revalidate/);}
 const denied=await fetch(origin+'/.netlify/functions/calendar-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'session'})});assert.equal(denied.status,401);
 const site=await api('/sites/'+siteId);assert.equal(site.published_deploy.id,live==='live'?id:baseline.baseline);assert.equal(site.published_deploy.locked,true);
 const result={commit:ref,deploy:id,live:live==='live',files:inventory.length,verifiedStaticAssets:3,htmlRevalidation:true,functions:d.available_functions.length,schedules:d.function_schedules.length,unchangedFunctionDigests:10,anonymousStatus:denied.status,calendarBundle:d.available_functions.find(f=>f.n==='calendar-activity').d};
 fs.writeFileSync('/tmp/neacea-calendar-update-'+(live==='live'?'published':'preview')+'-verified.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.message);process.exitCode=1});
