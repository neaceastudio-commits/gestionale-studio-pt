// Static module build: validate scripts and assemble the existing deployable app in a temporary directory.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const source=path.resolve(__dirname,'../app/portale-personal-trainer/integratori');
for(const file of ['integratori.js','pricing.js','warehouse-model.js','warehouse-view.js'])new vm.Script(fs.readFileSync(path.join(source,file),'utf8'),{filename:file});
const out=fs.mkdtempSync(path.join(os.tmpdir(),'neacea-inventory-build-'));fs.cpSync(source,path.join(out,'integratori'),{recursive:true});
const html=fs.readFileSync(path.join(source,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#:]+)"/g)){if(!match[1].startsWith('../')&&!fs.existsSync(path.join(source,match[1])))throw Error('Missing asset: '+match[1]);}
console.log('Build statico verificato: '+out);
