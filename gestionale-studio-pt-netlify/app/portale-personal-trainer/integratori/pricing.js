(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.supplementPricing=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
 const cents=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 const factor=p=>p.tax_basis==='net'&&p.vat_rate!=null?1+Number(p.vat_rate)/100:1;
 const gross=(n,p)=>n==null?null:cents(Number(n)*factor(p));
 const base=(n,p)=>n==null||n===''?null:Math.round((Number(n)/factor(p)+Number.EPSILON)*10000)/10000;
 const roundHalf=n=>Math.round((Number(n)+Number.EPSILON)*2)/2;
 const sale=p=>p.actual_sale_price!=null?gross(p.actual_sale_price,p):p.public_price!=null?roundHalf(gross(p.public_price,p)*0.8):p.suggested_price==null?null:roundHalf(gross(p.suggested_price,p));
 return {gross,base,sale,roundHalf};
});
