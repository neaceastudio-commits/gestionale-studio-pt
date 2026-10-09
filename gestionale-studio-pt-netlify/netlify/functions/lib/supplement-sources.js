'use strict';
// Restrict acquisition to known public producers; redirects are validated at every hop.
const HOSTS=new Set(['www.whysport.it','whysport.it','www.whysportprofessional.it','whysportprofessional.it','www.whynature.it','whynature.it','www.powerbar.eu','powerbar.eu','www.powerbar.com','powerbar.com','www.stivsport.it','stivsport.it']);
function validateSource(value){const u=new URL(value);if(u.protocol!=='https:'||u.port||u.username||u.password||!HOSTS.has(u.hostname))throw Error('SOURCE_NOT_ALLOWED');return u;}
async function safeFetch(value){let u=validateSource(value);for(let n=0;n<4;n++){
 const response=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'text/html'}});
 if([301,302,303,307,308].includes(response.status)){u=validateSource(new URL(response.headers.get('location'),u).href);continue;}
 if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('SOURCE_UNAVAILABLE');
 const reader=response.body.getReader();let total=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>2000000){await reader.cancel();throw Error('SOURCE_TOO_LARGE');}chunks.push(Buffer.from(value));}return Buffer.concat(chunks).toString('utf8');
 }throw Error('SOURCE_REDIRECT_LIMIT');}
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
function extractProduct(html,source){
 const nodes=[];function walk(x){if(Array.isArray(x))return x.forEach(walk);if(!x||typeof x!=='object')return;if([x['@type']].flat().includes('Product'))nodes.push(x);if(x['@graph'])walk(x['@graph']);}
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]));}catch{}}
 const p=nodes[0];if(!p)return {needs_review:true,candidates:[],message:'La fonte non espone dati prodotto strutturati. Consulta la scheda ufficiale e verifica l’etichetta.',content:{},source_excerpt:clean(html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'')).slice(0,20000)};
 const image=Array.isArray(p.image)?p.image[0]:p.image;let image_url='';try{const u=new URL(typeof image==='object'?image.url:image,source);if(u.protocol==='https:')image_url=u.href;}catch{}
 const structured={};for(const field of ['ingredients','nutrition','allergens'])if(typeof p[field]==='string')structured[field]=clean(p[field]);
 return {name:clean(p.name),brand:clean(p.brand?.name||p.brand),description:clean(p.description),image_url,content:structured,needs_review:true,
 candidates:nodes.map(n=>({name:clean(n.name),sku:clean(n.sku),ean:clean(n.gtin13||n.gtin)})),
 source_excerpt:clean(html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'')).slice(0,20000)};
}
module.exports={safeFetch,extractProduct,validateSource};
