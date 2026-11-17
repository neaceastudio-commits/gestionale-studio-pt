import {createHash} from 'node:crypto';
import ruleTools from './whatsapp-agenda-rule.js';
export const agendaTemplate='neacea_agenda_pt_documento_v1';
const dayLabel=s=>s.split('-').reverse().join('/');
export function agendaRevision(report,row){return createHash('sha256').update(JSON.stringify([report.start,report.end,row.operatorId,row.name,row.count,row.text,row.incomplete])).digest('hex')}
function printable(text){return String(text).normalize('NFC').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\xff\n]/g,'?')}
export function agendaPdf(report,row){
 const lines=[];
 for(const line of printable('NEACEA - Agenda PT\n'+row.name+'\nPeriodo: '+dayLabel(report.start)+' - '+dayLabel(report.end)+'\n\n'+row.text).split('\n')){
  let rest=line;while(rest.length>83){let cut=rest.lastIndexOf(' ',83);if(cut<1)cut=83;lines.push(rest.slice(0,cut));rest=rest.slice(cut).trimStart()}lines.push(rest);
 }
 const pages=[];for(let i=0;i<lines.length;i+=43)pages.push(lines.slice(i,i+43));
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'];
 const pageIds=[];
 for(const [index,page] of pages.entries()){
  const pageId=objects.length+1, streamId=pageId+1;pageIds.push(pageId);
  const escape=s=>s.replace(/([\\()])/g,'\\$1');
  const content='BT /F1 10 Tf 45 790 Td 16 TL '+page.map(l=>'('+escape(l)+') Tj T*').join('\n')+' ET\nBT /F1 9 Tf 45 35 Td (NEACEA - Pagina '+(index+1)+' di '+pages.length+') Tj ET';
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+streamId+' 0 R >>','<< /Length '+Buffer.byteLength(content,'latin1')+' >>\nstream\n'+content+'\nendstream');
 }
 objects[1]='<< /Type /Pages /Count '+pages.length+' /Kids ['+pageIds.map(n=>n+' 0 R').join(' ')+'] >>';
 let out='%PDF-1.4\n',offsets=[0];
 objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(out,'latin1'));out+=(i+1)+' 0 obj\n'+obj+'\nendobj\n'});
 const xref=Buffer.byteLength(out,'latin1');out+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
 return Buffer.from(out,'latin1');
}
export async function prepareAgendaDocument(input,provider){
 if(!/^pt:[a-zA-Z0-9_-]{1,128}$/.test(input.contact)||!input.agenda||typeof input.agenda.revision!=='string')throw Error('Agenda o destinatario non valido.');
 let plan;try{plan=ruleTools.projection(input.agenda.rule,input.agenda.previewAt)}catch{throw Error('Regola agenda non valida.')}
 const report=await provider.weeklyAgenda(plan.day,plan.period);
 const row=report.agendas.find(r=>r.operatorId===input.contact.slice(3));
 if(!row||!row.count||row.incomplete)throw Error('Nessuna agenda completa disponibile per questo PT.');
 if(agendaRevision(report,row)!==input.agenda.revision)throw Error('Il calendario è cambiato: aggiorna l’anteprima prima di inviare.');
 const intro=typeof input.agenda.intro==='string'?input.agenda.intro:'Ciao {nome}, ecco la tua agenda NEACEA.';
 const link=typeof input.agenda.link==='string'?input.agenda.link:'';
 if(intro.length>2000||link.length>2000||(link&&!/^https?:\/\//i.test(link)))throw Error('Testo agenda non valido.');
 const body=agendaText(report,row,intro,link);
 if(body.length>4096)throw Error('Agenda troppo lunga: scegli un giorno. Nessuna seduta è stata tagliata.');
 // A calendar agenda is always text. Ignore legacy file/template fields from old drafts.
 return {...input,body,file:null,template:null};
}
export function agendaText(report,row,intro,link){
 return [(intro||'Ciao {nome}, ecco la tua agenda NEACEA.').replaceAll('{nome}',row.name.split(' ')[0]),'Periodo: '+dayLabel(report.start)+(report.start===report.end?'':' – '+dayLabel(report.end)),row.text,link||''].filter(Boolean).join('\n\n').trim();
}
