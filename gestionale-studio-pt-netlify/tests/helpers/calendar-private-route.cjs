// Exercise the published private-read handler against the same isolated SQL
// fixture used by Calendar browser tests. No production request is continued.
const assert=require('node:assert/strict');
const {createHandler}=require('../../netlify/functions/lib/studio-private-endpoint.cjs');
exports.fulfill=async(route,fixture)=>{
 const request=route.request();assert.equal(request.method(),'POST');
 const handler=createHandler({authenticate:async token=>token==='OWNER'?{id:'owner',role:'owner'}:null,db:async(table,{query})=>{
  if(!['clients','operators','appointments'].includes(table))return [];
  let rows=await fixture.all(table);const params=new URLSearchParams(query);
  for(const [key,value]of params){
   if(['select','order','limit','offset'].includes(key))continue;
   const dot=value.indexOf('.'),op=value.slice(0,dot),expected=value.slice(dot+1);
   if(op==='eq'||op==='is')rows=rows.filter(r=>String(r[key])===expected);
   else if(op==='neq')rows=rows.filter(r=>String(r[key])!==expected);
   else if(op==='gte')rows=rows.filter(r=>r[key]>=expected);
   else if(op==='lte')rows=rows.filter(r=>r[key]<=expected);
   else throw Error('Unsupported local private-read filter '+key+'='+value);
  }
  return rows.slice(Number(params.get('offset')||0),Number(params.get('offset')||0)+Number(params.get('limit')||500));
 }});
 const result=await handler({httpMethod:request.method(),body:request.postData()});
 return route.fulfill({status:result.statusCode,headers:result.headers,body:result.body});
};
