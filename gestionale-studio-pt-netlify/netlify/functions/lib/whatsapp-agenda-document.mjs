import {createHash} from 'node:crypto';
import ruleTools from './whatsapp-agenda-rule.js';
import agendaModel from './whatsapp-agenda-text.js';
export const agendaTemplate=agendaModel.name;
const dayLabel=s=>s.split('-').reverse().join('/');
export function agendaRevision(report,row){return createHash('sha256').update(JSON.stringify([report.start,report.end,row.operatorId,row.name,row.count,row.text,row.entries,row.incomplete])).digest('hex')}
export async function prepareAgendaDocument(input,provider){
 if(!/^pt:[a-zA-Z0-9_-]{1,128}$/.test(input.contact)||!input.agenda||typeof input.agenda.revision!=='string')throw Error('Agenda o destinatario non valido.');
 let plan;try{plan=ruleTools.projection(input.agenda.rule,input.agenda.previewAt)}catch{throw Error('Regola agenda non valida.')}
 const report=await provider.weeklyAgenda(plan.day,plan.period);
 const row=report.agendas.find(r=>r.operatorId===input.contact.slice(3));
 if(!row||!row.count||row.incomplete)throw Error('Nessuna agenda completa disponibile per questo PT.');
 if(agendaRevision(report,row)!==input.agenda.revision)throw Error('Il calendario è cambiato: aggiorna l’anteprima prima di inviare.');
 if(!['free','template'].includes(input.agenda.format))throw Error('Formato agenda non valido. Riapri il pannello aggiornato.');
 if(input.agenda.format==='template'){
  const pages=agendaModel.pages(report,row);
  if(!Number.isInteger(input.agenda.part)||input.agenda.part<0||input.agenda.part>=pages.length||input.agenda.parts!==pages.length)throw Error('Le parti dell’agenda sono cambiate. Aggiorna l’anteprima.');
  const page=pages[input.agenda.part];
  return {...input,body:page.body,file:null,template:page.template,agendaPart:page.part};
 }
 const intro=typeof input.agenda.intro==='string'?input.agenda.intro:'Ciao {nome}, ecco la tua agenda NEACEA.';
 const link=typeof input.agenda.link==='string'?input.agenda.link:'';
 if(intro.length>2000||link.length>2000||(link&&!/^https?:\/\//i.test(link)))throw Error('Testo agenda non valido.');
 const body=agendaText(report,row,intro,link);
 if(body.length>4096)throw Error('Agenda troppo lunga: scegli un giorno. Nessuna seduta è stata tagliata.');
 // Free text is available only when the operator explicitly chooses the 24-hour mode.
 return {...input,body,file:null,template:null,agendaPart:null};
}
export function agendaText(report,row,intro,link){
 return [(intro||'Ciao {nome}, ecco la tua agenda NEACEA.').replaceAll('{nome}',row.name.split(' ')[0]),'Periodo: '+dayLabel(report.start)+(report.start===report.end?'':' – '+dayLabel(report.end)),row.text,link||''].filter(Boolean).join('\n\n').trim();
}
