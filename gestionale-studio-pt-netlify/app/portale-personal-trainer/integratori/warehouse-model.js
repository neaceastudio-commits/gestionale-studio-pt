(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.supplementWarehouse=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const num=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
const day=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
function period(p,now=new Date(),from='',to=''){
 const today=day(now);if(p==='all')return {from:'',to:''};if(p==='custom')return {from,to};
 if(p==='today')return {from:today,to:today};if(p==='year')return {from:today.slice(0,4)+'-01-01',to:today};
 if(p==='week'){const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-6);return {from:day(d),to:today};}
 return {from:today.slice(0,7)+'-01',to:today};
}
function within(m,range){if(!m.occurred_at||!Number.isFinite(Date.parse(m.occurred_at)))return false;const d=day(m.occurred_at);return (!range.from||d>=range.from)&&(!range.to||d<=range.to);}
function finance(m){
 const qty=Math.abs(Number(m.quantity)),rawRevenue=num(m.sale_price)==null?null:qty*Number(m.sale_price),rawCost=num(m.value_delta)==null?(num(m.unit_cost)==null?null:qty*Number(m.unit_cost)):Math.abs(Number(m.value_delta));
 const rate=num(m.vat_rate),known=rate!==null&&rate>=0,factor=known?1+rate/100:1;
 const net=m.tax_basis==='net',gross=m.tax_basis==='gross';
 const basis=net||gross&&known?'net':gross?'gross':'unknown',scale=gross&&known?factor:1;
 const revenue=rawRevenue==null?null:rawRevenue/scale,cost=rawCost==null?null:rawCost/scale,profit=revenue==null||cost==null?null:revenue-cost;
 return {qty,basis,revenue,cost,profit,margin:revenue>0&&profit!=null?profit/revenue*100:null,receipt:rawRevenue==null?null:net?(known?rawRevenue*factor:null):gross?rawRevenue:null};
}
function totals(sales){
 const groups=new Map();let receipt=0,receiptMissing=0,units=0;
 for(const m of sales){const f=finance(m);units+=f.qty;if(f.receipt==null)receiptMissing++;else receipt+=f.receipt;
  if(!groups.has(f.basis))groups.set(f.basis,{basis:f.basis,revenue:0,cost:0,profit:0});const g=groups.get(f.basis);
  for(const key of ['revenue','cost','profit'])g[key]=g[key]==null||f[key]==null?null:g[key]+f[key];
 }
 for(const g of groups.values())g.margin=g.revenue>0&&g.profit!=null?100*g.profit/g.revenue:null;
 return {count:sales.length,units,receipt:receiptMissing?null:receipt,receiptMissing,groups:[...groups.values()]};
}
function sales(movements,range){return movements.filter(m=>m.kind==='SALE'&&within(m,range)).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));}
function ranking(salesRows,sort='qty'){
 const grouped=new Map();for(const m of salesRows){if(!grouped.has(m.variant_id))grouped.set(m.variant_id,[]);grouped.get(m.variant_id).push(m);}
 return [...grouped].map(([id,rows])=>{const t=totals(rows);return {id,...t,qty:t.units,revenue:t.receipt,profit:t.groups.length===1?t.groups[0].profit:null,basis:t.groups.length===1?t.groups[0].basis:'mixed'};}).sort((a,b)=>{
  if(sort==='profit'&&a.basis!==b.basis)return a.basis.localeCompare(b.basis);
  return (b[sort]??-Infinity)-(a[sort]??-Infinity)||a.id.localeCompare(b.id);
 });
}
function products(d){return d.variants.map(v=>{const p=d.products.find(p=>p.id===v.product_id)||{},i=d.inventory.find(i=>i.variant_id===v.id)||{},price=d.prices.find(p=>p.variant_id===v.id)||{};const stock=Number(i.stock||0),threshold=Number(price.reorder_level??2),active=v.active!==false&&p.status!=='archived';return {v,p,i,price,stock,threshold,active,low:active&&stock<=threshold,suggested:Math.max(1,threshold*2-stock)};});}
return {day,period,within,finance,totals,sales,ranking,products};
});
