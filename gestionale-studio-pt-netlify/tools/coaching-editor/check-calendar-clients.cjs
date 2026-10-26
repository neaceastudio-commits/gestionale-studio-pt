const {spawnSync}=require('node:child_process'),path=require('node:path');
const major=Number(process.versions.node.split('.')[0]);if(major<22||major>=25)throw Error('Use the declared Node >=22 <25 runtime.');
const cwd=path.resolve(__dirname,'../..'),env={...process.env,NODE_PATH:path.join(__dirname,'node_modules')};
function run(args){const r=spawnSync(process.execPath,args,{cwd,env,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1)}
run(['--test','tests/calendar-client-persistence.test.cjs','tests/calendar-client-groups-sql.test.cjs','tests/calendar-audit-auth.test.cjs','tests/calendar-update-guard.test.cjs']);
for(const file of ['calendar-update-guard-browser.cjs','supabase-client-fallback.test.cjs','client-transfer-regression.cjs','calendar-client-groups-browser.cjs','calendar-client-pair-browser.cjs','calendar-appointment-session-browser.cjs'])run(['tests/'+file]);
