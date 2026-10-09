'use strict';
const {safeFetch,extractProduct}=require('./supplement-sources');
async function acquire(source){const html=await safeFetch(source);return {...extractProduct(html,source),source_url:source,source_name:new URL(source).hostname,status:'draft',approved:false};}
function matchRows(rows,variants,products=[]){return rows.map(row=>{
 const exact=variants.filter(v=>(row.ean&&v.ean===String(row.ean))||(row.sku&&v.sku===String(row.sku)));
 const norm=v=>String(v||'').trim().toLowerCase();
 const identity=variants.filter(v=>{const p=products.find(p=>p.id===v.product_id);return p&&norm(row.brand)&&norm(row.name)&&norm(p.brand)===norm(row.brand)&&norm(p.name)===norm(row.name)&&norm(v.label)===norm(row.variant||row.label||'Standard')&&norm(v.format)===norm(row.format);});
 const candidates=exact.length?exact:identity;
 const matched=candidates.length===1&&(!row.ean||!candidates[0].ean||row.ean===candidates[0].ean)&&(!row.sku||!candidates[0].sku||norm(row.sku)===norm(candidates[0].sku));
 return {...row,variant_id:matched?candidates[0].id:null,candidates:candidates.map(v=>({id:v.id,label:v.label,format:v.format})),review:matched?'Conferma quantità e costo':'Possibile prodotto già presente — verifica richiesta'};
});}
module.exports={acquire,matchRows};
