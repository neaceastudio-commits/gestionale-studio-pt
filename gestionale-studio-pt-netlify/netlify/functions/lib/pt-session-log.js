const sharing = require('./pt-client-sharing');
const {supabaseRequest: db, isPersonalTrainer} = require('./pt-auth');
// Identity and active Portal access are verified by pt-data before this module.
// The database transaction restricts writes to the appointment's assigned PT.
const allowed = operator => !!operator?.id && isPersonalTrainer(operator);
const enabled = operator => process.env.PT_SESSION_LOG_ENABLED === 'true' && allowed(operator);
const historyAllowed = operator => enabled(operator) && operator.accessLevel === 'owner' && String(operator.email || '').trim().toLowerCase() === 'nutrizione.gianlucapirisi@gmail.com';
const fields = 'id,operator_id,client_ids,service_id,date,start_time,status';
async function assignments(operator) {
  if (!enabled(operator)) return [];
  const rows=[];
  for(let offset=0;;offset+=1000){
    const page=await db('appointments',`?select=${fields}&operator_id=eq.${encodeURIComponent(operator.id)}&service_id=in.(pt11,pt12)&status=in.(prenotato,fatto)&order=id&limit=1000&offset=${offset}`);
    rows.push(...page);if(page.length<1000)break;
  }
  return rows;
}
function payload(value) {
  const fail=()=>{const e=new Error('Dati seduta non validi: controlla esercizi, serie e note.');e.statusCode=400;throw e};
  if(!value || !Array.isArray(value.rows) || value.rows.length>200 || typeof value.notes!=='string' || value.notes.length>4000)fail();
  const rows=value.rows.map(row=>{
    if(!row || typeof row!=='object')fail();
    const out={};
    for(const [key,max] of Object.entries({exercise:160,load:40,reps:40,rir:20,notes:1000})) {
      if(typeof row[key]!=='string' || row[key].length>max)fail();out[key]=row[key].trim();
    }
    if(!out.exercise)fail();
    return out;
  });
  return {rows,notes:value.notes.trim()};
}
async function save(operator,input) {
  if(!allowed(operator)){const e=new Error('Accesso al Registro sedute non autorizzato.');e.statusCode=403;throw e;}
  if(!enabled(operator)){const e=new Error('Registrazione sedute condivise non ancora attiva.');e.statusCode=503;throw e;}
  if(!await sharing.canAccess(operator.id,String(input.clientId||''))){const e=new Error('Il cliente non è assegnato a te e non è stato condiviso dalla Direzione.');e.statusCode=403;throw e;}
  const data=payload(input.data);
  if(!/^[0-9a-f-]{36}$/i.test(input.requestId||'')){const e=new Error('Identificativo salvataggio non valido.');e.statusCode=400;throw e;}
  try { return await db('rpc/pt_save_session_record','',{method:'POST',body:{p_appointment_id:String(input.appointmentId||''),p_cliente_id:String(input.clientId||''),p_program_id:String(input.programId||''),p_actor_id:operator.id,p_data:data,p_expected_version:Number.isInteger(input.version)?input.version:0,p_request_id:input.requestId}}); }
  catch(error){
    const messages={PT_SESSION_FORBIDDEN:'La seduta non è più assegnata a te oppure è stata annullata.',PT_SESSION_FUTURE:'Puoi registrare i risultati dal giorno della seduta.',PT_SESSION_PROGRAM_MISMATCH:'Il programma non appartiene al cliente della seduta.',PT_SESSION_INVALID:'Controlla i dati della registrazione.',PT_SESSION_REQUEST_REUSED:'La richiesta è cambiata: riapri la registrazione prima di salvare.'};
    const code=Object.keys(messages).find(code=>String(error.message).includes(code));
    if(code){error.message=messages[code];error.statusCode=code==='PT_SESSION_FORBIDDEN'?403:400;}
    throw error;
  }
}
module.exports={allowed,enabled,historyAllowed,assignments,payload,save};
