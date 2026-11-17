import rules from './whatsapp-agenda-rule.js';
const prefix='agenda-rules-v1/';
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export async function agendaRules(input, store) {
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(input.action==='agenda-rules') {
    const {blobs}=await store.list({prefix});
    const rows=await Promise.all(blobs.map(b=>store.getWithMetadata(b.key,{type:'json'})));
    return reply({rules:rows.filter(r=>r?.data).map(r=>({...r.data,revision:r.etag})).sort((a,b)=>a.title.localeCompare(b.title,'it'))});
  }
  const r=input.rule;
  if(!uuid.test(r?.id)||typeof r.title!=='string'||!r.title.trim()||r.title.length>90||
     typeof r.intro!=='string'||r.intro.length>2000||typeof r.link!=='string'||
     r.link.length>2000||(r.link&&!/^https?:\/\//i.test(r.link))) return reply({error:'invalid_rule'},400);
  let spec;
  try{spec=rules.validateRule(r)}catch{return reply({error:'invalid_rule'},400)}
  const record={...spec,id:r.id,title:r.title.trim(),intro:r.intro,link:r.link,enabled:false};
  const options=r.revision?{onlyIfMatch:r.revision}:{onlyIfNew:true};
  const result=await store.setJSON(prefix+r.id,record,options);
  if(!result.modified)return reply({error:'version_conflict'},409);
  if (result.etag) return reply({rule:{...record,revision:result.etag}});
  const saved=await store.getWithMetadata(prefix+r.id,{type:'json'});
  return reply({rule:{...saved.data,revision:saved.etag}});
}
