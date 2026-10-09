'use strict';
const FIELDS=['what','effects','usefulness','audience','usage','ingredients','nutrition','allergens','features','warnings'];
const safeText=(v,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
const content=v=>Object.fromEntries(FIELDS.filter(k=>typeof v?.[k]==='string').map(k=>[k,safeText(v[k])]));
function publicProduct(p,variants,tags,links,inventory,sources){
 return {id:p.id,name:p.name,brand:p.brand,description:p.description,content:content(p.content),image_url:p.image_url,image_scale:p.image_scale||1,verified_at:p.verified_at,
 tags:links.filter(x=>x.product_id===p.id).map(x=>tags.find(t=>t.id===x.tag_id)).filter(Boolean).map(({id,family,label,color})=>({id,family,label,color})),
 variants:variants.filter(v=>v.product_id===p.id&&v.active).map(v=>({id:v.id,label:v.label,format:v.format,image_url:v.image_url,content:content(v.content),available:Number(inventory.find(i=>i.variant_id===v.id)?.stock||0)>0})),
 sources:sources.filter(s=>s.product_id===p.id&&s.verified_at).map(({source_url,source_name,verified_at})=>({source_url,source_name,verified_at}))};
}
function url(value){if(!value)return '';const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('URL_HTTPS_REQUIRED');return u.href;}
function validateProduct(p){
 if(!safeText(p.name,200))throw Error('NAME_REQUIRED');
 if(!Array.isArray(p.variants)||!p.variants.length||p.variants.length>100)throw Error('VARIANTS_REQUIRED');
 return {...p,name:safeText(p.name,200),brand:safeText(p.brand,120),description:safeText(p.description,1000),content:content(p.content),image_url:url(p.image_url),source_url:url(p.source_url),source_name:safeText(p.source_name,200),tags:Array.isArray(p.tags)?p.tags:[],
 variants:p.variants.map(v=>{if(!safeText(v.label,120))throw Error('VARIANT_LABEL_REQUIRED');return {...v,label:safeText(v.label,120),format:safeText(v.format,120),content:content(v.content),image_url:url(v.image_url)};})};
}
function kpis(variants,inventory,prices){
 const basis=new Set(prices.filter(p=>inventory.some(i=>i.variant_id===p.variant_id&&(Number(i.stock)||Number(i.revenue)))).map(p=>p.tax_basis));
 const comparable=basis.size<=1&&!basis.has('unknown');
 const totals_by_basis=[...basis].map(tax_basis=>{const items=inventory.filter(i=>prices.some(p=>p.variant_id===i.variant_id&&p.tax_basis===tax_basis));return {tax_basis,value:items.reduce((n,i)=>n+Number(i.inventory_value||0),0),revenue:items.reduce((n,i)=>n+Number(i.revenue||0),0),profit:items.reduce((n,i)=>n+Number(i.gross_profit||0),0)};});
 return {totals_by_basis,units:inventory.reduce((s,i)=>s+Number(i.stock),0),value:comparable?inventory.reduce((s,i)=>s+Number(i.inventory_value),0):null,revenue:comparable?inventory.reduce((s,i)=>s+Number(i.revenue),0):null,profit:comparable?inventory.reduce((s,i)=>s+Number(i.gross_profit),0):null,tax_basis:comparable?[...basis][0]||'unknown':'mixed',low:variants.filter(v=>v.active&&Number(inventory.find(i=>i.variant_id===v.id)?.stock||0)<=Number(prices.find(p=>p.variant_id===v.id)?.reorder_level||0)).length};
}
module.exports={FIELDS,content,publicProduct,validateProduct,kpis,url};
