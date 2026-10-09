// Local visual QA only. No production credentials or remote writes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/portale-personal-trainer');const product=require('./fixtures/supplement-creatine.json');
const server=http.createServer(async(req,res)=>{
const url=new URL(req.url,'http://127.0.0.1');
if(url.pathname==='/.netlify/functions/supplements'){
 let raw='';for await(const chunk of req)raw+=chunk;const {action}=JSON.parse(raw||'{}');const role=req.headers.authorization==='Bearer preview-owner'?'owner':'pt';
 if(action!=='catalog'&&role!=='owner'){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Accesso riservato alla Direzione'}));return;}
 const variants=[...product.variants.map(v=>({...v,product_id:product.id,active:true})),{id:'sample',product_id:product.id,label:'Campione demo',format:'100 g',active:true},{id:'archived',product_id:product.id,label:'Archiviata',format:'100 g',active:false}];
 const now=new Date().toISOString();
 const movements=Array.from({length:24},(_,n)=>({id:'sale-'+n,variant_id:'creatine-neutral',kind:'SALE',quantity:-1,unit_cost:10,value_delta:-10,sale_price:n===0?25:20,tax_basis:'net',vat_rate:10,created_by:'demo',occurred_at:now,notes:'',document_ref:'',lot:''}));
 movements.push({id:'sample-load',variant_id:'sample',kind:'SAMPLE',quantity:1,unit_cost:0,value_delta:0,tax_basis:'gross',vat_rate:10,created_by:'demo',occurred_at:now,notes:'Campione gratuito'});
 const data=action==='catalog'?{role,products:[{...product,status:'published'}],tags:product.tags}:{role,products:[{...product,status:'published'}],variants,tags:product.tags,links:[],operators:[{id:'demo',nome:'Operatore',cognome:'Demo'}],prices:variants.map(v=>({variant_id:v.id,public_price:39.9,actual_sale_price:31.8182,tax_basis:'net',vat_rate:10,reorder_level:2})),inventory:[{variant_id:'creatine-neutral',stock:8,inventory_value:80,average_cost:10,purchased_units:32,purchase_average_cost:10,revenue:485,gross_profit:245},{variant_id:'sample',stock:1,average_cost:0,sample_units:1}],sources:[],movements,documents:[{id:'demo-document',reference:'DDT demo',rows:[{}],status:'imported'}],kpis:{units:9,value:80,revenue:485,profit:245,low:1,tax_basis:'net'}};
res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));return;}
const relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};const bytes=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}
});server.listen(Number(process.env.PORT||8846),'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${server.address().port}/integratori/#access=preview-owner (dati dimostrativi, stock non reale)`));
