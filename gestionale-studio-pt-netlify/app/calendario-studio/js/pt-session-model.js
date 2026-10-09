/* Shared rules: one appointment, independent participants, one trainer fee. */
(function(root){
 'use strict';
 const tag='NEACEA-PT-SESSION-V1', re=/\n?\[NEACEA-PT-SESSION-V1\]([\s\S]*?)\[\/NEACEA-PT-SESSION-V1\]\n?/g;
 function read(a){const matches=[...String(a?.notes||'').matchAll(new RegExp(re.source,'g'))];if(!matches.length)return null;try{const d=JSON.parse(matches.at(-1)[1]);if(d.version!==1||!d.participants||typeof d.participants!=='object')throw Error();return d;}catch{throw Error('Dati della seduta PT non validi: verifica con la Direzione');}}
 const provisional=a=>String(a?.notes||'').includes('[ORARIO-PROVVISORIO]');
 const strip=notes=>String(notes||'').replace(re,'\n').trim();
 const write=(a,data)=>({...a,notes:strip(a.notes)+'\n['+tag+']'+JSON.stringify(data)+'[/'+tag+']'});
 const ids=a=>a.clientIds||a.client_ids||[];
 const service=a=>a.serviceId||a.service_id;
 const status=(a,id)=>read(a)?.participants?.[id]?.status||a.status;
 const cycle=(a,id)=>read(a)?.participants?.[id]||null;
 function prepare(a,clients,context,before){
   if(service(a)!=='pt12')return a;
   if(ids(a).length!==2||new Set(ids(a)).size!==2)throw Error('PT 1:2 richiede due clienti distinti nella stessa seduta');
   const prior=read(before||a), requested=read(a),participants={};
   for(const id of ids(a)){
     const c=clients.find(c=>c.id===id);if(!c||c.active===false||/ibern/i.test(c.statoAbbonamento||c.stato_abbonamento||''))throw Error('Partecipante non attivo');
     const prev=prior?.participants[id],ctx=context(c);
     participants[id]={cycleId:prev?.cycleId??ctx.id,start:prev?.start??ctx.start,status:before&&(a.status===before.status||(requested?.participants[id]&&requested.participants[id].status!==prev?.status))?(requested?.participants[id]?.status||prev?.status||a.status):a.status};
   }
   return write(a,{version:1,rateCents:1500,participants});
 }
 function attendance(a,values){const d=read(a);if(!d)throw Error('Prima unisci la coppia in una seduta condivisa');for(const id of ids(a)){if(!['fatto','noshow','prenotato'].includes(values[id]))throw Error('Indica la presenza di entrambi');d.participants[id].status=values[id];}const states=ids(a).map(id=>values[id]);if(states.includes('prenotato')&&states.some(s=>s!=='prenotato'))throw Error('Completa entrambe le presenze');return write({...a,status:states.every(s=>s==='prenotato')?'prenotato':states.every(s=>s==='noshow')?'noshow':'fatto'},d);}
 function summary(appointments,month){
   const rows=appointments.filter(a=>a.status!=='annullato'&&!provisional(a)&&String(a.date).slice(0,7)===month&&['pt11','pt12'].includes(service(a)));
   const minutesAt=a=>{const t=String(a.startTime||a.start_time||'').split(':').map(Number);return t[0]*60+t[1];};
   const totals=new Map(),issues=[],occupied=new Map();
   for(const a0 of rows){
     const group=[a0], overlaps=rows.filter(b=>b!==a0&&(b.operatorId||b.operator_id)===(a0.operatorId||a0.operator_id)&&b.date===a0.date&&minutesAt(b)<minutesAt(a0)+Number(a0.durationMin||a0.duration_min)&&minutesAt(a0)<minutesAt(b)+Number(b.durationMin||b.duration_min));
     if(overlaps.some(b=>!(service(a0)==='pt11'&&service(b)==='pt11'&&!ids(a0).some(id=>ids(b).includes(id))))){issues.push({appointments:[a0],reason:'Appuntamenti sovrapposti: correggere prima del pagamento'});continue;}
     const a=group[0],sid=service(a),minutes=Number(a.durationMin||a.duration_min),operator=a.operatorId||a.operator_id;
     if(!operator||!Number.isFinite(minutes)||minutes<=0||(sid==='pt12'&&(ids(a).length!==2||new Set(ids(a)).size!==2))){issues.push({appointments:group,reason:'Seduta incompleta: manca la coppia o la durata'});continue;}
     const t=totals.get(operator)||{operator,plannedMin:0,earnedMin:0,workedMin:0,cents:0,pt11:0,pt12:0};
     if(a.status==='prenotato')t.plannedMin+=minutes;
     else if(a.status==='fatto'||(sid==='pt12'&&a.status==='noshow')){t.earnedMin+=minutes;t[sid]+=minutes;t.cents+=Math.round(minutes*(sid==='pt12'?1500:1000)/60);if(a.status==='fatto'){const key=operator+'|'+a.date;const slots=occupied.get(key)||[];slots.push([minutesAt(a),minutesAt(a)+minutes]);occupied.set(key,slots);}}
     totals.set(operator,t);
   }
   for(const [key,slots] of occupied){slots.sort((a,b)=>a[0]-b[0]);let end=-Infinity,n=0;for(const [start,stop] of slots){n+=Math.max(0,stop-Math.max(start,end));end=Math.max(end,stop);}totals.get(key.split('|')[0]).workedMin+=n;}
   return {totals:[...totals.values()],issues};
 }
 const api={read,write,strip,provisional,ids,service,status,cycle,prepare,attendance,summary};root.PTSessionModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
