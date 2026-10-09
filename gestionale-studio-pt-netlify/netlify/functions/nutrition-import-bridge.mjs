// Standalone Anamnesi uses the existing authenticated Portal gateway.
const endpoint='https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/nutrition-client-import';
const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
export default async request=>{
 if(request.method!=='POST')return Response.json({error:'Metodo non consentito'},{status:405,headers});
 const authorization=request.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return Response.json({error:'Sessione PT richiesta'},{status:401,headers});
 const body=await request.text();
 if(body.length>65536)return Response.json({error:'Richiesta troppo grande'},{status:413,headers});
 try{
  const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authorization},body,redirect:'error',signal:AbortSignal.timeout(25000)});
  return new Response(await upstream.text(),{status:upstream.status,headers});
 }catch{return Response.json({error:'Collegamento Nutrizione temporaneamente non disponibile'},{status:502,headers});}
};
