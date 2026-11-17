import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareAgendaDocument,agendaRevision} from '../netlify/functions/lib/whatsapp-agenda-document.mjs';
const report={start:'2026-11-23',end:'2026-11-29',agendas:[{operatorId:'pt-one',name:'Trainer Esempio',count:1,incomplete:false,text:'lunedì 23 novembre\n09:00 · Cliente sintetico · PT 1:1 · 0/8\n\nTotale sedute: 1',entries:[{day:'2026-11-23',text:'09:00 · Cliente sintetico · PT 1:1 · 0/8'}]}]};
const provider={weeklyAgenda:async()=>report};
const input={contact:'pt:pt-one',body:'testo non attendibile',agenda:{format:'template',part:0,parts:1,revision:agendaRevision(report,report.agendas[0]),rule:{frequency:'weekly',weekday:1,time:'08:00',period:'week',offset:0},previewAt:'today'}};
test('agenda PT outside the window uses an approved-text-template payload with no media',async()=>{
 const prepared=await prepareAgendaDocument(input,provider);
 assert.equal(prepared.template?.name,'neacea_agenda_pt_testo_v1');
 assert.equal(prepared.file,null);
 assert.ok(prepared.template.parameters.some(p=>p.includes('Cliente sintetico')));
 assert.ok(prepared.template.parameters.every(p=>!/[\n\r\t]/.test(p)));
 assert.ok(!prepared.body.includes('testo non attendibile'));
});

import agendaModel from '../app/calendario-studio/js/whatsapp-agenda-text.js';
import {sendSelected} from '../netlify/functions/lib/whatsapp-compose.mjs';
const catalogue=(status='APPROVED')=>({templates:[{name:agendaModel.name,language:'it',status,supported:true,header:null,body:agendaModel.body,footer:agendaModel.footer,parameterCount:10}]});
const makeReport=(count=13,length=0)=>{
 const entries=Array.from({length:count},(_,i)=>({day:'2026-11-23',text:'09:00 · Cliente sintetico '+String(i).padStart(3,'0')+' '+('X'.repeat(length))+' · PT 1:1 · 0/8'}));
 return {start:'2026-11-23',end:'2026-11-29',agendas:[{operatorId:'pt-one',name:'Trainer Esempio',count,incomplete:false,entries,text:'lunedì 23 novembre\n'+entries.map(e=>e.text).join('\n')+'\n\nTotale sedute: '+count}]};
};
const env={WHATSAPP_SENDER_PHONE:'+393520525230',WHATSAPP_PHONE_NUMBER_ID:'1153168214557448',WHATSAPP_ACCESS_TOKEN:'LOCAL_SYNTHETIC',WHATSAPP_API_VERSION:'v25.0'};
function fixture(count=13){
 const report=makeReport(count),posts=[],records=new Map();let state='APPROVED',changedBody=false;
 const provider={weeklyAgenda:async()=>report,verifySender:async()=>{}};
 const db=async table=>table==='operators'?[{id:'pt-one',active:true,roles:['PT'],whatsapp_phone:'+393331234567'}]:table==='operator_effective_roles'?[{active:true,system_roles:['PT']}]:[{active:true,telefono:'+393331234568'}];
 const store=()=>({getWithMetadata:async k=>records.get(k)||null,set:async(k,v,options={})=>{if(options.onlyIfNew&&records.has(k))return {modified:false};records.set(k,{data:v,metadata:options.metadata||{}});return {modified:true}}});
 const fetchImpl=async(url,opts)=>{
  url=String(url);
  if(opts.method==='POST'){assert.match(url,/\/messages$/,'no media endpoint may be called');const p=JSON.parse(opts.body);posts.push(p);return Response.json({messages:[{id:'wamid.synthetic'+posts.length}]});}
  assert.match(url,/\/message_templates\?/);const row=catalogue(state).templates[0];
  return Response.json({data:[{name:row.name,language:row.language,status:row.status,components:[{type:'BODY',text:row.body+(changedBody?' changed':'')},{type:'FOOTER',text:row.footer}]}]});
 };
 const request=(part=0)=>({...input,batch:'11111111-1111-4111-8111-111111111111',file:{name:'legacy.pdf',type:'application/pdf',base64:'cGRm'},agenda:{...input.agenda,revision:agendaRevision(report,report.agendas[0]),part,parts:agendaModel.pages(report,report.agendas[0]).length}});
 return {report,posts,records,request,send:v=>sendSelected(v,{db,env,provider,store,fetchImpl}),status:s=>state=s,changeTemplate:()=>changedBody=true};
}

test('all sessions remain whole and ordered across pages, including long names and more than 4096 total characters',()=>{
 for(const [count,length] of [[1,0],[6,0],[7,0],[37,20],[9,200]]){
  const r=makeReport(count,length),pages=agendaModel.pages(r,r.agendas[0]);
  assert.deepEqual(pages.flatMap(p=>p.template.parameters.slice(4).filter(s=>s!=='—')),r.agendas[0].entries.map(e=>'23/11/2026 · '+e.text));
  for(const p of pages){assert.ok(p.body.length<=1024);assert.equal(p.template.parameters.length,10);assert.ok(p.template.parameters.every(v=>!/[\n\r\t]/.test(v)));assert.ok(p.text.endsWith(agendaModel.footer));}
 }
 const r=makeReport(1,1500);assert.throws(()=>agendaModel.pages(r,r.agendas[0]),/Nessuna riga è stata tagliata/);
});

test('explicit dispatch uses template-only messages, server calendar data and one deduplication claim per part',async()=>{
 const f=fixture(),parts=agendaModel.pages(f.report,f.report.agendas[0]);
 for(const p of parts){const response=await f.send(f.request(p.part));assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).status,'Accettato da Meta');}
 assert.equal(f.posts.length,parts.length);
 for(const [i,p] of f.posts.entries()){
  assert.equal(p.type,'template');assert.equal(p.template.name,agendaModel.name);assert.equal(p.template.language.code,'it');assert.equal(p.to,'393331234567');assert.equal(p.template.components.length,1);assert.equal(p.template.components[0].type,'body');
  assert.deepEqual(p.template.components[0].parameters.map(p=>p.text),parts[i].template.parameters);assert.ok(!p.document&&!p.image&&!p.text);
 }
 await Promise.all([f.send(f.request(0)),f.send(f.request(0))]);assert.equal(f.posts.length,parts.length);assert.equal(f.records.size,parts.length);
});

test('concurrent first dispatch of a part creates one message and a forged non-agenda part cannot bypass deduplication',async()=>{
 const f=fixture(1);await Promise.all([f.send(f.request()),f.send(f.request())]);assert.equal(f.posts.length,1);
 const manual={batch:input.batch||'22222222-2222-4222-8222-222222222222',contact:'pt:pt-one',body:'Testo sintetico',agendaPart:4};
 await f.send(manual);await f.send({...manual,agendaPart:5});assert.equal(f.posts.length,2);
});

test('pending/rejected/mismatched templates never claim or send and never fall back to free text',async()=>{
 for(const state of ['PENDING','REJECTED','PAUSED']){const f=fixture();f.status(state);const r=await f.send(f.request());assert.equal(r.status,400);assert.equal(f.posts.length,0);assert.equal(f.records.size,0);}
 const f=fixture();f.changeTemplate();assert.equal((await f.send(f.request())).status,400);assert.equal(f.posts.length,0);assert.equal(f.records.size,0);
});

test('stale calendar, forged parts, missing format and client recipients stop before any Meta call',async()=>{
 for(const change of [r=>r.agenda.revision='stale',r=>r.agenda.part=99,r=>r.agenda.parts=99,r=>delete r.agenda.format,r=>r.contact='cliente:one']){
  const f=fixture(),r=f.request();change(r);assert.equal((await f.send(r)).status,409);assert.equal(f.posts.length,0);assert.equal(f.records.size,0);
 }
});

test('free-text agenda mode remains explicit and strips old file/template and forged part fields',async()=>{
 const f=fixture(1),request=f.request();request.agenda.format='free';request.agenda.intro='Ciao {nome}';request.agendaPart=8;request.template={name:'document-template'};
 const prepared=await prepareAgendaDocument(request,{weeklyAgenda:async()=>f.report});assert.equal(prepared.template,null);assert.equal(prepared.file,null);assert.equal(prepared.agendaPart,null);assert.match(prepared.body,/Ciao Trainer/);
 assert.equal((await f.send(request)).status,200);assert.equal(f.posts[0].type,'text');assert.ok(!f.posts[0].document);
});

test('the submitted Meta model and synthetic examples match the shared preview contract',async()=>{
 const {readFile}=await import('node:fs/promises');const spec=JSON.parse(await readFile(new URL('../config/whatsapp-agenda-text-template.json',import.meta.url),'utf8'));
 assert.equal(spec.name,agendaModel.name);assert.equal(spec.language,agendaModel.language);assert.equal(spec.category,'UTILITY');assert.deepEqual(spec.components.map(c=>c.type),['BODY','FOOTER']);assert.equal(spec.components[0].text,agendaModel.body);assert.equal(spec.components[1].text,agendaModel.footer);assert.equal(spec.components[0].example.body_text[0].length,10);assert.ok(agendaModel.render(spec.components[0].example.body_text[0]).length<=1024);
});
