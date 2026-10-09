import auth from './lib/calendar-audit-auth.js';
import model from './lib/supplements.js';
import imports from './lib/supplement-import.js';
import files from './lib/supplement-files.js';
import workflow from './lib/supplement-workflow.js';
const {db,authenticate}=auth;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
async function all(table,query='',fields='*'){
 const rows=[];for(let offset=0;offset<100000;offset+=500){const page=await db(table,{query:'?select='+fields+query+'&limit=500&offset='+offset});rows.push(...page);if(page.length<500)return rows;}throw Error('CATALOG_TOO_LARGE');
}
export default async function handler(req){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Metodo non consentito'});
 try{
 if(Number(req.headers.get('content-length'))>3600000)return reply(413,{error:'Documento troppo grande'});
 const text=await req.text();if(text.length>3600000)return reply(413,{error:'Documento troppo grande'});
 const input=JSON.parse(text);const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
 const actor=await authenticate(token);if(!actor||!['owner','pt'].includes(actor.role))return reply(403,{error:'Sessione non autorizzata o scaduta'});
 // Also enforce current access version for Direction sessions, as for PT sessions.
 const claims=auth.verify(token);const settings=await db('operators',{query:'?select=id,active,portal_access_enabled,portal_access_version&id=eq.'+encodeURIComponent(actor.id)});
 const setting=settings[0];if(!setting||setting.active===false||setting.portal_access_enabled===false||Number(setting.portal_access_version||0)!==Number(claims.accessVersion||0))return reply(403,{error:'Accesso revocato. Accedi nuovamente.'});
 const action=input.action||'catalog';
 if(action!=='catalog'&&actor.role!=='owner')return reply(403,{error:'Accesso riservato alla Direzione'});
 if(['catalog','inventory'].includes(action)){
 const [products,variants,tags,links,inventory,sources]=await Promise.all([
 all('supplement_products',action==='catalog'?(actor.role==='owner'?'&status=neq.archived&order=name.asc,id.asc':'&status=eq.published&order=name.asc,id.asc'):'&order=name.asc,id.asc'),all('supplement_variants','&order=id.asc'),all('supplement_tags','&order=family.asc,label.asc,id.asc'),all('supplement_product_tags','&order=product_id.asc,tag_id.asc'),all('supplement_inventory','&order=variant_id.asc'),all('supplement_sources','&order=created_at.asc,id.asc')]);
 if(action==='catalog')return reply(200,{role:actor.role,products:products.map(p=>({...model.publicProduct(p,variants,tags,links,inventory,sources),...(actor.role==='owner'?{status:p.status}:{})})),tags:tags.map(({id,label,family,color})=>({id,label,family,color}))});
 const [prices,movements,documents,documentFiles,operators]=await Promise.all([all('supplement_prices','&order=variant_id.asc'),all('supplement_inventory_movements','&order=created_at.desc,id.asc'),all('supplement_documents','&order=created_at.desc,id.asc'),db('supplement_document_files',{query:'?select=document_id&limit=10000'}),all('operators','&order=id.asc','id,nome,cognome')]);
 return reply(200,{role:actor.role,products,variants,tags,links,inventory,sources,prices,movements,operators,documents:documents.map(d=>({...d,has_file:documentFiles.some(f=>f.document_id===d.id)})),kpis:model.kpis(variants,inventory,prices)});
 }
 if(action==='upload_document'){const result=await db('rpc/supplement_upload',{method:'POST',body:{p_actor:actor.id,p_data:files.validate(input.data)}});return reply(200,{result});}
 if(action==='document_file'){if(!/^[0-9a-f-]{36}$/i.test(input.id||''))throw Error('INVALID_FILE');const rows=await db('supplement_document_files',{query:'?select=*&document_id=eq.'+input.id});return rows.length?reply(200,{file:rows[0]}):reply(404,{error:'Originale non disponibile'});}
 if(['intake','enrich','publish'].includes(action)){const data=workflow.validate(action,input.data);const result=await db('rpc/supplement_workflow',{method:'POST',body:{p_actor:actor.id,p_action:action,p_data:data}});return reply(200,{result});}
 if(action==='acquire')return reply(200,await imports.acquire(model.url(input.url)));
 if(action==='match_document')return reply(200,{rows:imports.matchRows(input.rows||[],await all('supplement_variants','&order=id.asc'),await all('supplement_products','&order=id.asc'))});
 if(!['product','tag','movement','document','import_document'].includes(action))return reply(400,{error:'Azione non valida'});
 const data=action==='product'?model.validateProduct(input.data):input.data;
 if(!data||typeof data!=='object')return reply(400,{error:'Dati mancanti'});
 if(action==='document'&&(!Array.isArray(data.rows)||!data.rows.length||data.rows.length>500))return reply(400,{error:'Documento senza righe valide'});
 const result=await db('rpc/supplement_write',{method:'POST',body:{p_actor:actor.id,p_action:action,p_data:data}});
 return reply(200,{result});
 }catch(error){
 const messages={INVALID_FILE:'Carica un PDF, JPEG, PNG o WebP fino a 2,5 MB e indica il riferimento.',IDENTITY_CONFLICT:'EAN e SKU indicano prodotti diversi: verifica i codici.',SAMPLE_COST_ZERO:'Un campione deve avere costo zero.',REQUEST_REQUIRED:'Identificativo richiesta mancante.',IDENTITY_REQUIRED:'Indica marca, nome e formato.',INVALID_SUPPLY_KIND:'Scegli acquisto o campione.',INVALID_FIELD:'Controlla i campi della scheda.',INVALID_PRICE:'Prezzo o costo non valido.',INVALID_QUANTITY:'Indica una quantità intera positiva.',INSUFFICIENT_STOCK:'Giacenza insufficiente: aggiorna il magazzino.',TAX_BASIS_REQUIRED:'Indica se prezzi e costi includono l’IVA prima di registrare movimenti.',TAX_BASIS_LOCKED:'La base IVA non può cambiare dopo il primo movimento.',CONFLICT:'La scheda è stata modificata: ricaricala prima di salvare.',VERIFICATION_REQUIRED:'Per pubblicare servono foto, marca, fonte e approvazione dei contenuti.',REQUEST_REUSED:'Richiesta già usata con dati diversi.',SOURCE_NOT_ALLOWED:'Usa una fonte ufficiale Why Sport, Why Nature, Powerbar o STIV Sport.',MATCH_REVIEW_REQUIRED:'Verifica gli abbinamenti del documento.',COST_REQUIRED:'Indica il costo effettivo.',EXCESS_RETURN:'Quantità resa superiore alla vendita.',RETURN_SALE_REQUIRED:'Seleziona la vendita originale.',FORBIDDEN:'Accesso riservato alla Direzione.'};
 if(error instanceof SyntaxError)return reply(400,{error:'Formato richiesta non valido'});
 const message=Object.entries(messages).find(([key])=>error.message.includes(key))?.[1];
 return reply(message?409:400,{error:message||'Operazione non completata. Controlla i dati e che la migrazione Integratori sia installata.'});
 }
}
