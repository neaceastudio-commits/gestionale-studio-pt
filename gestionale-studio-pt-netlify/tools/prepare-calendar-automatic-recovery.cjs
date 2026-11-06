// Isolated Git index: preserve the user's HEAD, branch, index and dirty checkout.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const dir='/tmp/neacea-calendar-automatic-release',root=path.resolve(__dirname,'../..'),prefix='gestionale-studio-pt-netlify/';
const base=JSON.parse(fs.readFileSync(dir+'/baseline.json')),branch='release/calendar-automatic-recovery-20261106';
const git=(args,input,env={})=>cp.execFileSync('git',args,{cwd:root,input,env:{...process.env,...env},maxBuffer:12*1024*1024});
const read=p=>git(['show',base.deploy.commit_ref+':'+prefix+p]).toString();
const current=p=>fs.readFileSync(path.join(root,prefix,p),'utf8');
const files=new Map();
for(const file of ['app/calendario-studio/js/app.js','app/calendario-studio/js/services.js','app/calendario-studio/js/pt-pair-sessions.js','app/calendario-studio/css/ui-fixes.css','netlify/functions/lib/calendar-audit-endpoint.js',
 'tests/calendar-audit-auth.test.cjs','tests/calendar-exhausted-edit.test.cjs','tests/calendar-pair-recovery.test.cjs','tests/calendar-pair-recovery-browser.cjs',
 'tests/calendar-automatic-recovery.test.cjs','tests/calendar-automatic-recovery-concurrency.test.cjs','tests/calendar-automatic-recovery-browser.cjs','tests/helpers/calendar-recovery-db.cjs',
 'scripts/check-calendar-automatic-recovery.sh','supabase/migrations/20261106114015_calendar_automatic_recovery.sql',
 'supabase/migrations/20261029180107_calendar_reprogram_empty_confirmed_renewal.sql',
 'docs/releases/20261106-calendar-automatic-recovery.md','tools/prepare-calendar-automatic-recovery.cjs','tools/calendar-automatic-recovery-release.cjs'])files.set(file,current(file));
let html=current('app/calendario-studio/index.html');
html=html.replace('js/expected-renewals.js?v=20261029-reprogram-renewal','js/expected-renewals.js?v=20261029-assigned-pt');
files.set('app/calendario-studio/index.html',html);
// Preserve the live time serializer; only transplant this request's save method.
let sync=read('app/calendario-studio/js/supabase.js');
const method=current('app/calendario-studio/js/supabase.js').match(/  async function saveAppointmentAtomic\([\s\S]*?(?=  async function pushAppointment)/)[0];
sync=sync.replace(/  async function saveAppointmentAtomic\([\s\S]*?(?=  async function pushAppointment)/,()=>method);
files.set('app/calendario-studio/js/supabase.js',sync);
let check=read('scripts/check-calendar-release.sh');
check=check.replace('cd "$project_root"','cd "$project_root"\nbash scripts/check-calendar-automatic-recovery.sh');
check=check.replace('  critical_paths=(',`  critical_paths=(
    scripts/check-calendar-automatic-recovery.sh
    tests/calendar-automatic-recovery.test.cjs
    tests/calendar-automatic-recovery-concurrency.test.cjs
    tests/calendar-automatic-recovery-browser.cjs
    tests/helpers/calendar-recovery-db.cjs
    supabase/migrations/20261106114015_calendar_automatic_recovery.sql`);
files.set('scripts/check-calendar-release.sh',check);
const index=dir+'/candidate.index',env={GIT_INDEX_FILE:index};
git(['read-tree',base.deploy.commit_ref],undefined,env);
for(const [p,content] of files){const hash=git(['hash-object','-w','--stdin'],content).toString().trim();const executable=p.startsWith('scripts/')||p==='tools/prepare-calendar-automatic-recovery.cjs';git(['update-index','--add','--cacheinfo',executable?'100755':'100644',hash,prefix+p],undefined,env);}
const tree=git(['write-tree'],undefined,env).toString().trim();
const commit=git(['commit-tree',tree,'-p',base.deploy.commit_ref], 'Calendario: recupero automatico e sovrapposizioni con alert\n').toString().trim();
git(['update-ref','refs/heads/'+branch,commit]);
const changed=git(['diff','--name-only',base.deploy.commit_ref,commit]).toString().trim().split('\n');
const assets=['index.html','css/ui-fixes.css','js/app.js','js/pt-pair-sessions.js','js/services.js','js/supabase.js'];
assert.deepEqual(changed.filter(p=>p.startsWith(prefix+'app/')).sort(),assets.map(p=>prefix+'app/calendario-studio/'+p).sort());
assert.equal(git(['diff','--name-only',base.deploy.commit_ref,commit,'--','netlify.toml',prefix+'tools/coaching-editor/package-lock.json']).toString(),'');
const plan={commit,branch,tree,baseline:base.deploy.commit_ref,assets,changed};fs.writeFileSync(dir+'/plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify(plan));
