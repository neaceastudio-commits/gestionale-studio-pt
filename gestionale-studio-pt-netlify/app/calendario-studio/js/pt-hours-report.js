/* Read-only detail of the same appointments used by PTSessionModel.summary. */
(function(root){
 'use strict';
 const M=root.PTSessionModel||(typeof require==='function'?require('./pt-session-model'):null);
 const compare=(a,b)=>String(a.date).localeCompare(String(b.date))||String(a.startTime||a.start_time).localeCompare(String(b.startTime||b.start_time))||String(a.id).localeCompare(String(b.id));
 function cycleKey(a,id){
  try{const p=M.cycle(a,id);if(p?.cycleId)return p.cycleId;if(p?.start)return p.start;}catch{return '';}
  return String(a.notes||'').match(/\[CICLO-PACCHETTO-ID\s+([^\]]+)\]/)?.[1]||String(a.notes||'').match(/\[CICLO-PACCHETTO\s+([^\]]+)\]/)?.[1]||'';
 }
 function lesson(a,id,appointments){
  if(a.status==='annullato'||M.provisional(a))return {label:'—',hint:'Seduta annullata o provvisoria'};
  const saved=String(a.notes||'').match(/\[PROGRAMMA-PACCHETTO\]\s*seduta\s+(\d+)\/(\d+)/i);
  if(saved&&M.ids(a)[0]===id)return {label:saved[1]+'/'+saved[2],hint:'Numero salvato nella programmazione'};
  const key=cycleKey(a,id);if(!key)return {label:'—',hint:'Numero non disponibile nello storico'};
  const same=appointments.filter(b=>M.ids(b).includes(id)&&M.service(b)===M.service(a)&&b.status!=='annullato'&&!M.provisional(b)&&cycleKey(b,id)===key).sort(compare);
  return {label:'#'+(same.findIndex(b=>b.id===a.id)+1),hint:'Ordine delle lezioni registrate in questo ciclo'};
 }
 function build(appointments,clients,month){
  const summary=M.summary(appointments,month),entries=new Map(summary.entries.map(e=>[e.appointment.id,e])),people=new Map(clients.map(c=>[c.id,c]));
  const rows=appointments.filter(a=>String(a.date).slice(0,7)===month&&['pt11','pt12'].includes(M.service(a))).sort(compare).map(a=>{
   const accounting=entries.get(a.id)||{earnedMin:0,plannedMin:0,cents:0,issue:''};
   const participants=M.ids(a).map(id=>{const c=people.get(id);let status;try{status=M.status(a,id);}catch{status='da verificare';}return {id,name:c?`${c.nome||''} ${c.cognome||''}`.trim()||id:'Cliente non più in anagrafica ('+id+')',archived:!c||c.active===false||/ibern|sospes/i.test(c.statoAbbonamento||''),status,lesson:lesson(a,id,appointments)};});
   return {...accounting,appointment:a,operator:a.operatorId||a.operator_id,participants,provisional:M.provisional(a)};
  });
  return {rows,totals:summary.totals,issues:summary.issues};
 }
 const api={build};root.PTHoursReport=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
