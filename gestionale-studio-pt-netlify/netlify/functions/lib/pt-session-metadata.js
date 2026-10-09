'use strict';
// Server adapter for the versioned calendar participant metadata; no UI dependencies.
function read(appointment) {
 const block=[...String(appointment?.notes||'').matchAll(/\[NEACEA-PT-SESSION-V1\]([\s\S]*?)\[\/NEACEA-PT-SESSION-V1\]/g)].at(-1);
 if(!block)return null;
 const data=JSON.parse(block[1]);
 if(data.version!==1||!data.participants||typeof data.participants!=='object'||Array.isArray(data.participants))throw new Error('Dati seduta PT non validi');
 return data;
}
const cycle=(appointment,id)=>read(appointment)?.participants?.[id]||null;
const status=(appointment,id)=>cycle(appointment,id)?.status||appointment.status;
module.exports={read,cycle,status};
