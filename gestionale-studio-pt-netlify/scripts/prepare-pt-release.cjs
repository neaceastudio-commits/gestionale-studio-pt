// Builds a frontend-only candidate from a committed ref. Never deploys the repository/backend.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../..');
const prefix='gestionale-studio-pt-netlify/app/portale-personal-trainer/';
const baselineCommit='69027a43ff52cfed989cc115513521d9bbfceeac';
const baselineDeploy='6b09c15ad37b00f111899622';
const assets=['index.html','js/data-reader.js','js/session-log.js'];
const git=(...args)=>cp.execFileSync('git',args,{cwd:repo,maxBuffer:8*1024*1024});
const hash=(b,algorithm)=>crypto.createHash(algorithm).update(b).digest('hex');
function prepare(ref,out){
 assert.ok(out&&path.isAbsolute(out),'Specify an absolute output directory');
 const commit=git('rev-parse','--verify',ref+'^{commit}').toString().trim();
 assert.equal(git('status','--porcelain','--',prefix).toString(),'','Commit the frontend before packaging');
 const changed=git('diff','--name-only',baselineCommit,commit,'--',prefix).toString().trim().split('\n').filter(Boolean).sort();
 assert.deepEqual(changed,assets.map(a=>prefix+a).sort(),'Unexpected public files: review the release allowlist');
 for(const guarded of ['gestionale-studio-pt-netlify/netlify','gestionale-studio-pt-netlify/supabase','gestionale-studio-pt-netlify/netlify.toml'])assert.equal(git('diff','--name-only',baselineCommit,commit,'--',guarded).toString(),'','Server/config change outside release scope');
 assert.ok(!fs.existsSync(out),'Output directory already exists');
 fs.mkdirSync(out,{recursive:true});
 const files=assets.map(asset=>{
  const source=prefix+asset,before=git('show',baselineCommit+':'+source),content=git('show',commit+':'+source);
  const dest=path.join(out,'assets',asset);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
  return {asset,source,baselineSha1:hash(before,'sha1'),sha1:hash(content,'sha1'),sha256:hash(content,'sha256'),bytes:content.length};
 });
 const manifest={siteId:'3c87fb2e-525d-43b0-9a84-4699994352e4',baselineDeploy,baselineCommit,commit,files,
  deployment:'Replace only listed public assets in a fresh snapshot of the pinned published deploy; preserve every other file, function, schedule, header and redirect. Abort if production has changed.',
  backendSourceMatchesProduction:false,productionDeployed:false};
 fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
module.exports={prepare};
if(require.main===module){try{const result=prepare(process.argv[2]||'HEAD',process.argv[3]);console.log(JSON.stringify(result,null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
