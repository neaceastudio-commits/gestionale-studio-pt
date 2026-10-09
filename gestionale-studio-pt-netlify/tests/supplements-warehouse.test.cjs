const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../app/portale-personal-trainer/integratori/warehouse-model');
const sale=(extra={})=>({id:'s',kind:'SALE',quantity:-2,sale_price:20,unit_cost:10,value_delta:-20,tax_basis:'net',vat_rate:10,occurred_at:'2026-10-07T09:00:00Z',variant_id:'v',...extra});
test('sales use immutable movement prices and cost deltas; margin is weighted, not mean of percentages',()=>{
 const rows=[sale(),sale({quantity:-1,sale_price:100,value_delta:-90,unit_cost:999})];const t=M.totals(rows);
 assert.equal(t.count,2);assert.equal(t.units,3);assert.equal(t.receipt,154);assert.equal(t.groups[0].cost,110);assert.equal(t.groups[0].profit,30);assert.equal(t.groups[0].margin,30/140*100);
});
test('normalizes known VAT bases, preserves zero-cost samples, separates unknown rates and handles empty periods',()=>{
 const t=M.totals([sale(),sale({tax_basis:'gross',quantity:-1,sale_price:22,value_delta:0})]);
 assert.equal(t.groups.length,1);assert.equal(t.groups[0].cost,20);assert.equal(t.groups[0].profit,40);assert.equal(t.receipt,66);
 assert.equal(M.totals([sale(),sale({tax_basis:'gross',vat_rate:null})]).groups.length,2);
 assert.equal(M.totals([sale({vat_rate:null})]).receipt,null);
 assert.equal(M.totals([]).receipt,0);assert.equal(M.finance(sale({sale_price:0})).margin,null);
 assert.equal(M.finance(sale({unit_cost:null,value_delta:null})).profit,null);
});
test('Rome date boundaries include last day; SALE only, no returns or purchases duplicated',()=>{
 const now=new Date('2026-10-07T10:00:00Z');assert.deepEqual(M.period('week',now),{from:'2026-10-01',to:'2026-10-07'});
 assert.equal(M.day('2026-10-06T22:30:00Z'),'2026-10-07');
 const result=M.sales([sale({id:'ok',occurred_at:'2026-10-31T22:59:00Z'}),sale({id:'next',occurred_at:'2026-10-31T23:01:00Z'}),sale({kind:'RETURN'}),sale({kind:'PURCHASE'})],{from:'2026-10-01',to:'2026-10-31'});assert.deepEqual(result.map(x=>x.id),['ok']);
});
test('reorders only active variants at/below threshold, including threshold zero',()=>{
 const d={products:[{id:'p',status:'published'},{id:'a',status:'archived'}],variants:[{id:'v',product_id:'p',active:true},{id:'zero',product_id:'p',active:true},{id:'archived',product_id:'a',active:true},{id:'inactive',product_id:'p',active:false}],inventory:[{variant_id:'v',stock:2}],prices:[{variant_id:'v',reorder_level:2},{variant_id:'zero',reorder_level:0}]};
 const rows=M.products(d).filter(x=>x.low);assert.deepEqual(rows.map(x=>x.v.id),['v','zero']);assert.deepEqual(rows.map(x=>x.suggested),[2,1]);
});
test('rankings group by variant and sort quantity, gross revenue and comparable profit',()=>{
 const rows=[sale({variant_id:'a',quantity:-5,sale_price:10,value_delta:-30}),sale({variant_id:'b',quantity:-1,sale_price:90,value_delta:-35})];
 assert.equal(M.ranking(rows,'qty')[0].id,'a');assert.equal(M.ranking(rows,'revenue')[0].id,'b');assert.equal(M.ranking(rows,'profit')[0].id,'b');
 assert.deepEqual(M.ranking([]),[]);
});
