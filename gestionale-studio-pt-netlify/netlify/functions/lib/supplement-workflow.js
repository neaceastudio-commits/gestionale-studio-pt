'use strict';
const model=require('./supplements');
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const text=(v,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('INVALID_FIELD');return v.trim();};
const amount=v=>{if(v===null||v===''||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1000000)throw Error('INVALID_PRICE');return Number(v);};
function validate(action,data){
 if(!data||!uuid(data.request_id))throw Error('REQUEST_REQUIRED');
 const out={request_id:data.request_id};
 if(action==='intake'){
 for(const key of ['name','brand','format'])out[key]=text(data[key],key==='name'?200:120);
 out.variant=data.variant?text(data.variant,120):'Standard';
 for(const key of ['ean','sku','document_ref','lot','notes'])if(data[key])out[key]=text(data[key],key==='notes'?2000:200);
 if(!['PURCHASE','SAMPLE'].includes(data.kind))throw Error('INVALID_SUPPLY_KIND');out.kind=data.kind;
 if(!Number.isInteger(Number(data.quantity))||Number(data.quantity)<=0||Number(data.quantity)>100000)throw Error('INVALID_QUANTITY');out.quantity=Number(data.quantity);
 out.unit_cost=data.kind==='SAMPLE'?0:amount(data.unit_cost);
 if(data.kind==='SAMPLE'&&data.unit_cost!=null&&Number(data.unit_cost)!==0)throw Error('SAMPLE_COST_ZERO');
 if(!['gross','net'].includes(data.tax_basis))throw Error('TAX_BASIS_REQUIRED');out.tax_basis=data.tax_basis;
 if(data.vat_rate!=null&&data.vat_rate!==''){out.vat_rate=amount(data.vat_rate);if(out.vat_rate>100)throw Error('INVALID_PRICE');}
 return out;
 }
 if(!uuid(data.variant_id)||!Number.isFinite(Date.parse(data.updated_at)))throw Error('CONFLICT');out.variant_id=data.variant_id;out.updated_at=data.updated_at;
 if(action==='publish'){if(data.approved!==true)throw Error('VERIFICATION_REQUIRED');return {...out,approved:true};}
 if(action!=='enrich')throw Error('UNKNOWN_ACTION');
 if(data.description!==undefined)out.description=text(data.description,1000);
 const mapping={what_it_is:'what',what_it_does:'effects',why_useful:'usefulness',suggested_use:'usage',active_ingredients:'nutrition'};
 out.content=model.content(data.content||{});
 for(const key of [...model.FIELDS,...Object.keys(mapping)])if(data[key]!==undefined)out.content[mapping[key]||key]=text(data[key],12000);
 if(data.official_image||data.image_url)out.image_url=model.url(data.official_image||data.image_url);
 for(const key of ['public_price','actual_sale_price'])if(data[key]!==undefined)out[key]=key==='actual_sale_price'&&data[key]===null?null:amount(data[key]);
 if(!Array.isArray(data.sources)||!data.sources.length||data.sources.length>20)throw Error('VERIFICATION_REQUIRED');
 if(!Number.isFinite(Date.parse(data.verification_date))||Date.parse(data.verification_date)>Date.now()+86400000)throw Error('VERIFICATION_REQUIRED');
 out.verification_date=new Date(data.verification_date).toISOString();out.sources=data.sources.map(s=>({url:model.url(text(s.url,2000)),name:text(s.name||'Produttore',200)}));
 if(data.tags!==undefined){if(!Array.isArray(data.tags)||data.tags.length>50)throw Error('INVALID_FIELD');out.tags=data.tags.map(t=>{const color=t.color||'#033d27';if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('INVALID_FIELD');return {family:text(t.family,100),label:text(t.label,100),color};});}
 return out;
}
module.exports={validate};
