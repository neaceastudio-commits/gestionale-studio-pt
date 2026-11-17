import {createHash} from 'node:crypto';
const fields=['id','nome','cognome','nascita','sesso','telefono','email','codice_fiscale','contatto_emergenza','professione','obiettivo','obiettivo_libero','esperienza','inattivo','sport','sessioni_pref','orari','impressioni'];
export async function submit(request,{env=key=>Netlify.env.get(key),fetchImpl=fetch}={}){
 const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method!=='POST')return json(405,{error:'Metodo non consentito'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return json(415,{error:'Formato non valido'});
 let input;try{const text=await request.text();if(Buffer.byteLength(text)>180000)return json(413,{error:'Compilazione troppo lunga'});input=JSON.parse(text);}catch{return json(400,{error:'Dati non validi'});}
 if(!input||typeof input.token!=='string'||! /^[a-f0-9]{64}$/.test(input.token)||!input.payload||Array.isArray(input.payload))return json(400,{error:'Invio non valido'});
 const p={};for(const k of fields){const v=input.payload[k];if(v!==undefined&&v!==null&&typeof v!=='string')return json(400,{error:'Campo non valido'});p[k]=v??null;if(typeof v==='string'&&v.length>(k==='impressioni'?100000:5000))return json(400,{error:'Campo troppo lungo'});}
 if(!/^acq_[a-zA-Z0-9_-]{10,140}$/.test(p.id||'')||!p.nome?.trim()||!p.cognome?.trim())return json(400,{error:'Controlla nome e cognome'});
 if(p.nascita&&!/^\d{4}-\d{2}-\d{2}$/.test(p.nascita))return json(400,{error:'Data non valida'});
 // Keep billing details in the same notes field used by the existing form fallback.
 const notes=[];for(const k of ['indirizzo','cap','comune','provincia']){const v=input.payload[k];if(v){if(typeof v!=='string'||v.length>5000)return json(400,{error:'Campo non valido'});notes.push(k+': '+v);}}
 p.impressioni=[String(p.impressioni||'').replace(/^\[(?:PT_OWNER|PT_AUDIT)\].*$/gm,''),...notes].filter(Boolean).join('\n');
 const key=env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY');if(!key)return json(503,{error:'Invio temporaneamente non disponibile'});
 const hash=x=>createHash('sha256').update(x).digest('hex');
 try{const r=await fetchImpl((env('SUPABASE_URL')||'https://cdywqyqqmjhgkzwrrixc.supabase.co')+'/rest/v1/rpc/studio_submit_anamnesis',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_id:p.id,p_token_hash:hash(input.token),p_payload_hash:hash(JSON.stringify(p)),p_payload:p}),signal:AbortSignal.timeout(15000)});if(!r.ok){const e=await r.json().catch(()=>({}));return json(e.code==='23505'?409:503,{error:e.code==='23505'?'Invio già registrato con dati differenti. Ricarica la pagina prima di un nuovo invio.':'Invio non confermato: riprova mantenendo la pagina aperta'});}return json(200,{success:true});}catch{return json(503,{error:'Connessione interrotta: riprova mantenendo la pagina aperta'});}
}
export default request=>submit(request);
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:10}};
