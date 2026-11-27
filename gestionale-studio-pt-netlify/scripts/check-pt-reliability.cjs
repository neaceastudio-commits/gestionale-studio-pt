// Offline verification: all records and credentials used by tests are synthetic.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const app=path.join(root,'app/portale-personal-trainer');
const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
let scripts=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=match[1].match(/\bsrc="([^"]+)"/);
 const file=src?src[1].split('?')[0]:`inline-${scripts}`;
 new vm.Script(src?fs.readFileSync(path.join(app,file),'utf8'):match[2],{filename:file});scripts++;
}
console.log(`Syntax: ${scripts} frontend scripts passed.`);
const tests=['pt-client-visibility','pt-portal-access','pt-save-queue','pt-explicit-session','pt-reliability','pt-usage-safety','pt-templates','pt-editor-usability','pt-workout-handoff','pt-workout-sessions','pt-program-persistence','pt-hand-grip','pt-mesocycle-activation'];
const result=cp.spawnSync(process.execPath,['--test',...tests.map(name=>path.join(root,'tests',name+'.test.cjs'))],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
