const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=process.env.CALENDAR_TEST_ROOT||path.resolve(__dirname,'..');
const esbuild=require(require.resolve('esbuild',{paths:[path.join(root,'tools/coaching-editor')]}));
test('Calendar Netlify build packages all generated functions with their dependencies',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-functions-build-'));
 try{
  const app=path.join(dir,'gestionale-studio-pt-netlify');
  fs.mkdirSync(path.join(app,'tools'),{recursive:true});
  fs.cpSync(path.join(root,'netlify/functions'),path.join(app,'netlify/functions'),{recursive:true});
  fs.copyFileSync(path.join(root,'tools/prepare-calendar-shared-function.cjs'),path.join(app,'tools/prepare-calendar-shared-function.cjs'));
  fs.mkdirSync(path.join(app,'app/calendario-studio/js'),{recursive:true});
  fs.cpSync(path.join(root,'app/calendario-studio/js'),path.join(app,'app/calendario-studio/js'),{recursive:true});
  const config=fs.readFileSync(path.join(root,'../netlify.toml'),'utf8');
  const command=JSON.parse(config.match(/^\s*command\s*=\s*(".*")\s*$/m)[1]);
  const r=cp.spawnSync('bash',['-c',command],{cwd:dir,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const functionsDir=path.join(dir,'.netlify/calendar-functions');
  const entries=fs.readdirSync(functionsDir).filter(n=>/\.(mjs|js)$/.test(n));assert.equal(entries.length,16);
  for(const entry of entries){await esbuild.build({entryPoints:[path.join(functionsDir,entry)],bundle:true,platform:'node',target:'node24',format:'esm',write:false,logLevel:'silent'});}
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
