(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.WhatsAppAgendaText=factory();
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const name='neacea_agenda_pt_testo_v1',language='it',slots=6;
 const body='Ciao {{1}}, ecco le sedute PT assegnate a te nel calendario NEACEA per il periodo {{2}}.\nRiepilogo {{3}} di {{4}}.\n\nSeduta: {{5}}\nSeduta: {{6}}\nSeduta: {{7}}\nSeduta: {{8}}\nSeduta: {{9}}\nSeduta: {{10}}\n\nOgni riga riporta giorno, orario, clienti e servizio. Il simbolo — indica una riga senza altre sedute.\nPer eventuali variazioni fa fede il calendario NEACEA.';
 const footer='Agenda personale PT · NEACEA';
 const dayLabel=s=>s.split('-').reverse().join('/');
 const render=parameters=>body.replace(/\{\{(\d+)\}\}/g,(_,n)=>parameters[Number(n)-1]);
 function templateIssue(templates){
  const t=templates.find(t=>t.name===name&&t.language===language);
  if(!t)return 'Modello agenda testuale non disponibile. Aggiorna lo stato da Meta.';
  if(t.status!=='APPROVED')return 'Modello agenda testuale: '+t.status+'. L’invio richiede l’approvazione di Meta.';
  if(!t.supported||t.header||t.body!==body||t.footer!==footer||t.parameterCount!==10)return 'Il modello agenda su Meta non corrisponde all’anteprima. Invio bloccato.';
  return '';
 }
 function pages(report,row){
  if(row.incomplete||!Array.isArray(row.entries)||!row.entries.length||row.entries.length!==row.count||!/^\d{4}-\d{2}-\d{2}$/.test(report.start)||!/^\d{4}-\d{2}-\d{2}$/.test(report.end))throw Error('Agenda incompleta. Rileggi il calendario.');
  const lines=row.entries.map(e=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(e.day)||e.day<report.start||e.day>report.end||typeof e.text!=='string'||!e.text.trim()||/[\r\n\t\x00-\x1f]/.test(e.text))throw Error('Dati agenda non validi. Rileggi il calendario.');
   return dayLabel(e.day)+' · '+e.text;
  });
  const firstName=String(row.name||'').trim().split(/\s+/)[0];
  if(!firstName||/[\r\n\t\x00-\x1f]/.test(firstName))throw Error('Nome PT non valido.');
  const period=dayLabel(report.start)+(report.start===report.end?'':' - '+dayLabel(report.end));
  const params=(group,index,total)=>[firstName,period,String(index),String(total),...group,...Array(slots-group.length).fill('—')];
  const groups=[];
  // Reserve enough digits for the worst case (one message per appointment).
  // Every appointment stays whole; no names or sessions are truncated.
  for(let start=0;start<lines.length;){
   let count=Math.min(slots,lines.length-start);
   while(count&&render(params(lines.slice(start,start+count),lines.length,lines.length)).length>1024)count--;
   if(!count)throw Error('Una seduta supera il limite del modello WhatsApp. Nessuna riga è stata tagliata.');
   groups.push(lines.slice(start,start+count));start+=count;
  }
  return groups.map((group,index)=>{
   const parameters=params(group,index+1,groups.length),text=render(parameters);
   return {part:index,parts:groups.length,body:text,text:text+'\n\n'+footer,template:{name,language,parameters}};
  });
 }
 return {name,language,body,footer,slots,render,pages,templateIssue};
});
