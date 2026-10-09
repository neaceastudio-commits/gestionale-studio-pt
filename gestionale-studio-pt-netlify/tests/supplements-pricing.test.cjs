const {test}=require('node:test');const assert=require('node:assert/strict');
const pricing=require('../app/portale-personal-trainer/integratori/pricing');
const doc=require('../docs/supplements-ddt-515.json');
test('all DDT 515 prices round-trip through net amounts to whole VAT-inclusive euros',()=>{
 assert.equal(doc.rows.length,19);assert.equal(doc.rows.reduce((n,r)=>n+r.quantity,0),41);
 assert.equal(doc.rows.reduce((n,r)=>n+Math.round(Number(r.line_net_total)*100),0),42947);
 for(const row of doc.rows){const sale=pricing.sale(row);assert.equal(sale,Number(row.sale_gross),row.sku);assert.ok(Number.isInteger(sale));assert.equal(pricing.gross(pricing.base(sale,row),row),sale);}
});
test('new suggestions round to the nearest half euro and retain net precision',()=>{
 const p={tax_basis:'net',vat_rate:10};assert.equal(pricing.sale({...p,suggested_price:31.99}),35);assert.equal(pricing.sale({...p,suggested_price:26.32}),29);
 assert.equal(pricing.base(27,p),24.5455);assert.equal(pricing.gross(24.5455,p),27);
 assert.equal(pricing.sale({tax_basis:'gross',suggested_price:12.49}),12.5);assert.equal(pricing.sale({tax_basis:'gross',suggested_price:12.5}),12.5);
 assert.equal(pricing.sale({}),null);assert.equal(pricing.base('',p),null);
});

test('saved prices are preserved; public less 20% rounds in both directions',()=>{
 assert.equal(pricing.sale({tax_basis:'gross',public_price:19.90}),16);
 assert.equal(pricing.sale({tax_basis:'gross',public_price:24.90}),20);
 assert.equal(pricing.sale({tax_basis:'gross',public_price:20.80}),16.5);
 assert.equal(pricing.sale({tax_basis:'gross',public_price:20,actual_sale_price:14.32}),14.32);
 assert.equal(pricing.roundHalf(12.24),12);assert.equal(pricing.roundHalf(12.25),12.5);
});
