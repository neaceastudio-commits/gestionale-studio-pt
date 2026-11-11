// Commit only solo-recovery changes on top of verified production; preserve the work index.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const dir=process.argv[2],root=path.resolve(__dirname,'../..'),prefix='gestionale-studio-pt-netlify/';assert.ok(path.isAbsolute(dir));
const base=JSON.parse(fs.readFileSync(dir+'/baseline.json')),branch='release/calendar-pair-solo-20261111';
const git=(args,input,env={})=>cp.execFileSync('git',args,{cwd:root,input,env:{...process.env,...env},maxBuffer:16*1024*1024});
const read=p=>git(['show',base.deploy.commit_ref+':'+prefix+p]).toString(),current=p=>fs.readFileSync(path.join(root,prefix,p),'utf8'),files=new Map();
for(const file of ['app/calendario-studio/js/pt-pair-sessions.js','netlify/functions/lib/calendar-audit-endpoint.js','tests/calendar-audit-auth.test.cjs',
 'tests/calendar-pair-solo-recovery.test.cjs','tests/calendar-pair-solo-recovery-browser.cjs','tests/calendar-pair-solo-concurrency.test.cjs',
 'supabase/migrations/20261111100621_calendar_pair_solo_recovery.sql','docs/releases/20261111-pair-solo-recovery.md',
 'docs/releases/20261111-calendar-package-suspension.md','docs/releases/20261111-calendar-package-suspension-published.json',
 'tools/prepare-calendar-pair-solo.cjs','tools/calendar-pair-solo-release.cjs'])files.set(file,current(file));
let sync=read('app/calendario-studio/js/supabase.js');const method=current('app/calendario-studio/js/supabase.js').match(/  async function planPairSolo\([\s\S]*?(?=  async function saveAppointmentAtomic)/)[0];
sync=sync.replace('  async function saveAppointmentAtomic',method+'  async function saveAppointmentAtomic').replace('renewPtPair, correctPtSessions','renewPtPair, planPairSolo, correctPtSessions');files.set('app/calendario-studio/js/supabase.js',sync);
const html=read('app/calendario-studio/index.html').replace('js/supabase.js?v=20261111-package-suspension-v1&patch=20261106-automatic-recovery','js/supabase.js?v=20261111-package-suspension-v1&patch=20261111-solo-recovery').replace('js/pt-pair-sessions.js?v=20261029-assigned-pt&patch=20261106-automatic-recovery','js/pt-pair-sessions.js?v=20261111-solo-recovery');files.set('app/calendario-studio/index.html',html);
let check=read('scripts/check-calendar-release.sh');check=check.replace('node --test tests/calendar-archived-hours.test.cjs tests/calendar-package-suspension.test.cjs','node --test tests/calendar-archived-hours.test.cjs tests/calendar-package-suspension.test.cjs tests/calendar-pair-solo-recovery.test.cjs');check=check.replace('  critical_paths=(',`  critical_paths=(
    tests/calendar-pair-solo-recovery.test.cjs
    tests/calendar-pair-solo-recovery-browser.cjs
    tests/calendar-pair-solo-concurrency.test.cjs
    supabase/migrations/20261111100621_calendar_pair_solo_recovery.sql`);files.set('scripts/check-calendar-release.sh',check);
const env={GIT_INDEX_FILE:dir+'/candidate.index'};git(['read-tree',base.deploy.commit_ref],undefined,env);
for(const [file,content]of files){const blob=git(['hash-object','-w','--stdin'],content).toString().trim();git(['update-index','--add','--cacheinfo',file.startsWith('scripts/')?'100755':'100644',blob,prefix+file],undefined,env);}
const tree=git(['write-tree'],undefined,env).toString().trim(),commit=git(['commit-tree',tree,'-p',base.deploy.commit_ref],'Calendario: recuperi individuali dal pacchetto con partner sospeso\n').toString().trim();
const previous=fs.existsSync(dir+'/plan.json')?JSON.parse(fs.readFileSync(dir+'/plan.json')).commit:'';git(['update-ref','refs/heads/'+branch,commit,previous]);
const changed=git(['diff','--name-only',base.deploy.commit_ref,commit]).toString().trim().split('\n'),assets=['index.html','js/pt-pair-sessions.js','js/supabase.js'];
assert.deepEqual(changed.filter(p=>p.startsWith(prefix+'app/')).sort(),assets.map(p=>prefix+'app/calendario-studio/'+p).sort());assert.equal(git(['diff','--name-only',base.deploy.commit_ref,commit,'--',prefix+'netlify/functions']).toString().trim(),prefix+'netlify/functions/lib/calendar-audit-endpoint.js');assert.equal(git(['diff','--name-only',base.deploy.commit_ref,commit,'--','netlify.toml',prefix+'tools/coaching-editor/package-lock.json']).toString(),'');
const plan={commit,branch,tree,baseline:base.deploy.commit_ref,assets,changed};fs.writeFileSync(dir+'/plan.json',JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify(plan));
