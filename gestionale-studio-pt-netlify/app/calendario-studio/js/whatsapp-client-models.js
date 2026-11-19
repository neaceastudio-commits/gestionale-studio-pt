(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WhatsAppClientModels=factory()})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const specs=[
  {
    "name": "neacea_promemoria_appuntamento_v1",
    "language": "it",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Ciao {{1}}, ti ricordiamo il tuo appuntamento NEACEA del {{2}} alle {{3}} per {{4}}. Per eventuali variazioni contatta lo studio.",
        "example": {
          "body_text": [
            [
              "Mario",
              "24/11/2026",
              "09:00",
              "PT 1:1"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "NEACEA Studio · Servizi clienti"
      }
    ]
  },
  {
    "name": "neacea_sedute_residue_v1",
    "language": "it",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Ciao {{1}}, aggiornamento sul tuo pacchetto NEACEA iniziato il {{2}}: risultano {{3}} sedute residue su {{4}}. Il riepilogo considera le sedute registrate dallo studio.",
        "example": {
          "body_text": [
            [
              "Mario",
              "02/11/2026",
              "2",
              "8"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "NEACEA Studio · Servizi clienti"
      }
    ]
  },
  {
    "name": "neacea_fine_pacchetto_v1",
    "language": "it",
    "category": "UTILITY",
    "components": [
      {
        "type": "BODY",
        "text": "Ciao {{1}}, per il tuo pacchetto NEACEA iniziato il {{2}} la fine del ciclo è prevista il {{3}}, in base alle sedute attualmente prenotate. Eventuali variazioni del calendario possono modificare questa data.",
        "example": {
          "body_text": [
            [
              "Mario",
              "02/11/2026",
              "30/11/2026"
            ]
          ]
        }
      },
      {
        "type": "FOOTER",
        "text": "NEACEA Studio · Servizi clienti"
      }
    ]
  }
];
const kinds=['appointment','remaining','expiry'];
const byKind=Object.fromEntries(kinds.map((kind,i)=>[kind,{kind,...specs[i],body:specs[i].components[0].text,footer:specs[i].components[1].text,parameterCount:[4,4,3][i]}]));
function validateRule(r){
 if(!r||!kinds.includes(r.kind)||!['daily','weekly'].includes(r.frequency)||!Number.isInteger(r.weekday)||r.weekday<0||r.weekday>6||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time))throw Error('invalid_rule');
 const option=r.kind==='remaining'?{remainingThreshold:r.remainingThreshold}:{daysBefore:r.daysBefore};
 const n=Object.values(option)[0],max=r.kind==='appointment'?30:r.kind==='expiry'?90:100;
 if(!Number.isInteger(n)||n<0||n>max)throw Error('invalid_rule');
 return {source:'client_events',audience:'clients',timeZone:'Europe/Rome',kind:r.kind,frequency:r.frequency,weekday:r.weekday,time:r.time,...option};
}
function templateIssue(kind,templates){
 const spec=byKind[kind];if(!spec)return 'Tipo di matrice clienti non valido.';
 const t=templates.find(t=>t.name===spec.name&&t.language===spec.language);
 if(!t)return 'Modello clienti non disponibile: '+spec.name+'.';
 if(t.status!=='APPROVED')return 'Modello clienti '+spec.name+' · '+t.status+'. Attendi l’approvazione Meta.';
 if(t.category!=='UTILITY'||!t.supported||t.header!==null||t.parameterCount!==spec.parameterCount||t.body!==spec.body||t.footer!==spec.footer)return 'Il modello clienti non corrisponde al testo di servizio previsto.';
 return '';
}
function render(kind,parameters){
 const spec=byKind[kind];if(!spec||parameters.length!==spec.parameterCount||parameters.some(p=>typeof p!=='string'||!p.trim()||/[\n\r\t]/.test(p)))throw Error('invalid_parameters');
 const body=spec.body.replace(/\{\{(\d+)\}\}/g,(_,n)=>parameters[Number(n)-1]);if(body.length>1024)throw Error('client_message_too_long');
 return {body,text:body+'\n\n'+spec.footer,template:{name:spec.name,language:spec.language,parameters}};
}
return {specs,kinds,byKind,validateRule,templateIssue,render};
});
