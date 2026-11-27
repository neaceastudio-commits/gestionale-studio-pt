const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {pathToFileURL}=require('node:url');

// Run with NETLIFY_PACKAGER_MODULE pointing to @netlify/zip-it-and-ship-it/dist/main.js.
// This checks the deploy artifact, not merely an esbuild source compilation.
test('Netlify v2 birthday artifact loads its XML parser outside the source repository',async()=>{
 assert.ok(process.env.NETLIFY_PACKAGER_MODULE,'Set NETLIFY_PACKAGER_MODULE to the installed Netlify packager');
 const {zipFunction}=await import(pathToFileURL(process.env.NETLIFY_PACKAGER_MODULE).href);
 const root=path.resolve(__dirname,'../..'),config=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
 const command=JSON.parse(config.match(/^\s*command\s*=\s*(".*")\s*$/m)[1]);
 const build=cp.spawnSync('bash',['-c',command],{cwd:root,encoding:'utf8'});
 assert.equal(build.status,0,build.stderr);
 const section=config.split('[functions."birthdays-sync-background"]')[1]?.split(/\n\[/)[0];
 const includedFiles=JSON.parse(section.match(/included_files\s*=\s*(\[[^\n]+\])/)[1]);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'birthday-netlify-artifact-'));
 try{
  const packed=await zipFunction(path.join(root,'.netlify/calendar-functions/birthdays-sync-background.mjs'),dir,{
   archiveFormat:'none',basePath:root,config:{'birthdays-sync-background':{includedFiles,nodeVersion:'24'}}
  });
  assert.ok(fs.existsSync(path.join(packed.path,'node_modules/fast-xml-parser/lib/fxp.cjs')));
  const entry=path.join(packed.path,'.netlify/calendar-functions/birthdays-sync-background.mjs');
  const smoke=cp.spawnSync(process.execPath,['--input-type=module','-e',
   'const m=await import('+JSON.stringify(pathToFileURL(entry).href)+'); if(typeof m.default!=="function")throw Error("Missing handler");'],
   {cwd:dir,encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(smoke.status,0,smoke.stderr);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
