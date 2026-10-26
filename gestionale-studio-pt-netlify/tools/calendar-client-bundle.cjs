// Deterministic Node 24 function archive, using the repository's pinned esbuild.
// Build only from a Git commit. No network, credentials, or deploy side effects.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const esbuild=require('./coaching-editor/node_modules/esbuild');
const root=path.resolve(__dirname,'..'),prefix='gestionale-studio-pt-netlify/';
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function zip(data,filename='calendar-activity.js'){const name=Buffer.from(filename),crc=crc32(data),h=Buffer.alloc(30),c=Buffer.alloc(46),end=Buffer.alloc(22);
h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(33,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(33,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);
const body=Buffer.concat([h,name,data]),directory=Buffer.concat([c,name]);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(body.length,16);return Buffer.concat([body,directory,end]);}
async function build(ref){assert.equal(esbuild.version,'0.25.12');const sourceHashes={};
const plugin={name:'committed-sources',setup(b){b.onLoad({filter:/\.js$/},args=>{const source=path.relative(root,args.path).replaceAll(path.sep,'/');assert.ok(!source.startsWith('..'));const content=execFileSync('git',['show',ref+':'+prefix+source],{cwd:root});sourceHashes[source]=crypto.createHash('sha256').update(content).digest('hex');return{contents:content.toString(),loader:'js',resolveDir:path.dirname(args.path)}})}};
const result=await esbuild.build({absWorkingDir:root,entryPoints:['netlify/functions/calendar-activity.js'],bundle:true,platform:'node',target:'node24',format:'cjs',write:false,legalComments:'none',plugins:[plugin]});const js=Buffer.from(result.outputFiles[0].contents),archive=zip(js);return{js,archive,sourceHashes,sha256:crypto.createHash('sha256').update(archive).digest('hex')};}
module.exports={build,zip};
if(require.main===module){const [ref,out]=process.argv.slice(2);build(ref).then(b=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'calendar-activity.zip'),b.archive);fs.writeFileSync(path.join(out,'calendar-activity.js'),b.js);fs.writeFileSync(path.join(out,'bundle.json'),JSON.stringify({sha256:b.sha256,sourceHashes:b.sourceHashes},null,2));console.log(JSON.stringify({sha256:b.sha256,sources:Object.keys(b.sourceHashes),bytes:b.archive.length}));}).catch(e=>{console.error(e.message);process.exit(1)})}
