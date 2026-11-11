// Build a scoped commit through a separate Git index; never change the user's checkout.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const dir=process.argv[2],root=path.resolve(__dirname,'../..'),prefix='gestionale-studio-pt-netlify/';
assert.ok(path.isAbsolute(dir));const base=JSON.parse(fs.readFileSync(dir+'/baseline.json'));
const git=(args,input,env={})=>cp.execFileSync('git',args,{cwd:root,input,env:{...process.env,...env},maxBuffer:16*1024*1024});
const read=p=>git(['show',base.deploy.commit_ref+':'+prefix+p]).toString(),current=p=>fs.readFileSync(path.join(root,prefix,p),'utf8');
const files=new Map(),revision='20261111-package-suspension-v1',branch='release/calendar-package-suspension-20261111';
// Transplant the lifecycle change into the actual online serializer.
let sync=read('app/calendario-studio/js/supabase.js');
const block=current('app/calendario-studio/js/supabase.js').match(/  async function archiveClient\([\s\S]*?(?=  async function pushClient)/)[0];
sync=sync.replace(/  async function archiveClient\([\s\S]*?(?=  async function pushClient)/,()=>block).replace('archiveClient, saveAppointmentAtomic','archiveClient, reactivateClient, saveAppointmentAtomic').replaceAll('20261030-shared-finance-v1',revision);
files.set('app/calendario-studio/js/supabase.js',sync);
for(const file of ['app/calendario-studio/js/clients.js','app/calendario-studio/js/app.js','app/calendario-studio/js/calendar-audit.js','netlify/functions/lib/calendar-audit-endpoint.js',
 'tests/calendar-audit-auth.test.cjs','tests/calendar-archived-hours.test.cjs','tests/calendar-archived-hours-browser.cjs','tests/calendar-package-suspension.test.cjs','tests/calendar-package-suspension-concurrency.test.cjs',
 'supabase/migrations/20261111091927_calendar_package_suspension.sql','docs/releases/20261111-calendar-package-suspension.md','tools/prepare-calendar-suspension.cjs','tools/calendar-suspension-release.cjs'])files.set(file,current(file));
files.set('app/calendario-studio/index.html',current('app/calendario-studio/index.html').replace('js/expected-renewals.js?v=20261029-reprogram-renewal','js/expected-renewals.js?v=20261029-assigned-pt'));
const protocolFiles=git(['grep','-l','20261030-shared-finance-v1',base.deploy.commit_ref,'--',prefix]).toString().trim().split('\n').filter(Boolean).map(p=>p.slice(p.indexOf(':')+1).slice(prefix.length));
for(const file of protocolFiles)if(!files.has(file))files.set(file,read(file).replaceAll('20261030-shared-finance-v1',revision));
let check=read('scripts/check-calendar-release.sh');check=check.replace('node --test tests/calendar-archived-hours.test.cjs','node --test tests/calendar-archived-hours.test.cjs tests/calendar-package-suspension.test.cjs');
check=check.replace('  critical_paths=(',`  critical_paths=(
    tests/calendar-package-suspension.test.cjs
    tests/calendar-package-suspension-concurrency.test.cjs
    supabase/migrations/20261111091927_calendar_package_suspension.sql`);
files.set('scripts/check-calendar-release.sh',check);
const env={GIT_INDEX_FILE:dir+'/candidate.index'};git(['read-tree',base.deploy.commit_ref],undefined,env);
for(const [file,content]of files){const blob=git(['hash-object','-w','--stdin'],content).toString().trim();git(['update-index','--add','--cacheinfo',file.startsWith('scripts/')?'100755':'100644',blob,prefix+file],undefined,env);}
const tree=git(['write-tree'],undefined,env).toString().trim(),commit=git(['commit-tree',tree,'-p',base.deploy.commit_ref], 'Calendario: sospendi e riprendi il pacchetto conservando residuo e ore PT\n').toString().trim();
const previous=fs.existsSync(dir+'/plan.json')?JSON.parse(fs.readFileSync(dir+'/plan.json')).commit:'';
git(['update-ref','refs/heads/'+branch,commit,previous]);
const changed=git(['diff','--name-only',base.deploy.commit_ref,commit]).toString().trim().split('\n'),assets=['index.html','js/app.js','js/clients.js','js/supabase.js','js/calendar-audit.js'];
assert.deepEqual(changed.filter(p=>p.startsWith(prefix+'app/')).sort(),assets.map(p=>prefix+'app/calendario-studio/'+p).sort());
assert.deepEqual(changed.filter(p=>p.startsWith(prefix+'netlify/functions/')).sort(),['netlify/functions/calendar-client-finance.js','netlify/functions/lib/calendar-audit-endpoint.js'].map(p=>prefix+p).sort());
assert.equal(git(['diff','--name-only',base.deploy.commit_ref,commit,'--','netlify.toml',prefix+'tools/coaching-editor/package-lock.json']).toString(),'');
const plan={commit,branch,tree,baseline:base.deploy.commit_ref,assets,changed};fs.writeFileSync(dir+'/plan.json',JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify(plan));
