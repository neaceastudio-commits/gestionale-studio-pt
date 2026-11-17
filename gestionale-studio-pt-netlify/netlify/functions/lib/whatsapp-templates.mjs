import agendaText from './whatsapp-agenda-text.js';
const waba='4508719189457199';
export async function listTemplates(env,fetchImpl=fetch){
  const root='https://graph.facebook.com/'+env.WHATSAPP_API_VERSION+'/'+waba+'/message_templates';
  const templates=[];
  let after='';
  do {
    const url=new URL(root);
    url.searchParams.set('fields','name,status,language,components');
    url.searchParams.set('limit','100');
    if(after)url.searchParams.set('after',after);
    const res=await fetchImpl(url,{headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN},redirect:'error',signal:AbortSignal.timeout(9000)});
    const data=await res.json();
    if(!res.ok||!Array.isArray(data.data))throw Error('templates_unavailable');
    for(const row of data.data){
      const body=row.components?.find(c=>c.type==='BODY');
      const header=row.components?.find(c=>c.type==='HEADER');
      const footer=row.components?.find(c=>c.type==='FOOTER');
      const text=body?.text||'';
      const variables=[...new Set([...text.matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1])))].sort((a,b)=>a-b);
      const supported=Boolean(body)&&variables.every((n,i)=>n===i+1)&&
        !text.replace(/\{\{\d+\}\}/g,'').includes('{{')&&
        (!header||['DOCUMENT','IMAGE','TEXT'].includes(header.format))&&
        !header?.text?.includes('{{')&&row.components.every(c=>['BODY','HEADER','FOOTER'].includes(c.type));
      templates.push({name:row.name,language:row.language,status:row.status,body:text,
        header:header?.format||null,headerText:header?.text||'',footer:footer?.text||'',
        parameterCount:variables.length,supported});
    }
    after=data.paging?.next?data.paging?.cursors?.after||'':'';
  }while(after);
  return {templates};
}
export async function prepareTemplate(input,file,env,fetchImpl=fetch){
  if(!input||typeof input.name!=='string'||typeof input.language!=='string'||!Array.isArray(input.parameters))throw Error('Modello non valido.');
  const {templates}=await listTemplates(env,fetchImpl);
  const t=templates.find(t=>t.name===input.name&&t.language===input.language);
  if(input.name===agendaText.name){const issue=agendaText.templateIssue(templates);if(issue)throw Error(issue)}
  if(!t||t.status!=='APPROVED'||!t.supported)throw Error('Il modello deve essere approvato e supportato dal pannello.');
  if(input.parameters.length!==t.parameterCount||input.parameters.some(p=>typeof p!=='string'||!p.trim()||p.length>1024||/[\n\r\t]/.test(p)))throw Error('Completa i campi del modello con testo su una sola riga.');
  const rendered=t.body.replace(/\{\{(\d+)\}\}/g,(_,n)=>input.parameters[Number(n)-1]);
  if(rendered.length>1024)throw Error('Il testo del modello supera 1024 caratteri.');
  if(t.header==='DOCUMENT'&&file?.type!=='application/pdf')throw Error('Questo modello richiede un allegato PDF.');
  if(t.header==='IMAGE'&&!['image/jpeg','image/png'].includes(file?.type))throw Error('Questo modello richiede un’immagine JPEG o PNG.');
  if(!['DOCUMENT','IMAGE'].includes(t.header)&&file)throw Error('Questo modello non prevede un allegato.');
  return {name:t.name,language:{code:t.language},components:input.parameters.length?[{type:'body',parameters:input.parameters.map(text=>({type:'text',text}))}]:[]};
}

