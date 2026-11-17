import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const idValid=id=>typeof id==='string' && /^wamid\.[A-Za-z0-9_+/=.-]{1,500}$/.test(id);
const digest=value=>createHash('sha256').update(value).digest('hex');
const labels={sent:'Inviato',delivered:'Consegnato',read:'Letto',failed:'Errore'};
const rank={sent:1,failed:2,delivered:3,read:4};
const same=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)};
export const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function receiveEvents(request,{env,store,now=Date.now}) {
  const url=new URL(request.url);
  const path=url.pathname.split('/').filter(Boolean);
  const secret=path.at(-1);
  if(!env.WHATSAPP_WEBHOOK_PATH_SECRET || !same(secret,env.WHATSAPP_WEBHOOK_PATH_SECRET))return new Response(null,{status:404});
  if(request.method==='GET'){
    if(url.searchParams.get('hub.mode')!=='subscribe'||!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN||
       !same(url.searchParams.get('hub.verify_token'),env.WHATSAPP_WEBHOOK_VERIFY_TOKEN))return new Response(null,{status:403});
    return new Response(url.searchParams.get('hub.challenge')||'',{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
  }
  if(request.method!=='POST')return new Response(null,{status:405});
  const raw=await request.text();
  if(Buffer.byteLength(raw)>4*1024*1024)return new Response(null,{status:413});
  // Forwarded events require the per-number signing secret when configured.
  if(env.WHATSAPP_WEBHOOK_FORWARD_SECRET){
    const match=/^t=(\d+),v1=([a-f0-9]{64})$/.exec(request.headers.get('x-ec-signature')||'');
    if(!match||Math.abs(now()/1000-Number(match[1]))>300)return new Response(null,{status:403});
    const sig=createHmac('sha256',env.WHATSAPP_WEBHOOK_FORWARD_SECRET).update(match[1]+'.'+raw).digest('hex');
    if(!same(sig,match[2]))return new Response(null,{status:403});
  }
  let body;try{body=JSON.parse(raw)}catch{return new Response(null,{status:400})}
  const changes=body.object==='whatsapp_business_account'
    ? (body.entry||[]).flatMap(entry=>entry.changes||[]).filter(c=>c.field==='messages').map(c=>c.value)
    : body.event==='messages'?[body.value]:[];
  const values=changes.filter(v=>v?.metadata?.phone_number_id===env.WHATSAPP_PHONE_NUMBER_ID);
  try{
    for(const value of values){
      for(const s of value.statuses||[]){
        if(!idValid(s.id)||!Object.hasOwn(labels,s.status)||!/^\d{1,12}$/.test(String(s.timestamp)))continue;
        const timestamp=Number(s.timestamp)*1000;
        if(!Number.isFinite(timestamp)||timestamp<=0||timestamp>now()+86400000)continue;
        const codes=[...new Set((s.errors||[]).map(e=>e.code).filter(Number.isInteger))];
        const event={messageId:s.id,status:s.status,timestamp,codes};
        await store.setJSON('delivery/'+digest(s.id)+'/'+s.timestamp+'-'+s.status+'-'+digest(JSON.stringify(codes)),event,{onlyIfNew:true});
      }
    }
    if(values.length)await store.setJSON('delivery-health',{receivedAt:new Date(now()).toISOString()});
    return new Response('OK',{status:200});
  }catch{return new Response(null,{status:503})}
}
export async function deliveryStatuses(input,{store,env}){
  if(!Array.isArray(input.messageIds)||input.messageIds.length>100||!input.messageIds.every(idValid))return json({error:'invalid_ids'},400);
  const results=await Promise.all([...new Set(input.messageIds)].map(async messageId=>{
    const {blobs}=await store.list({prefix:'delivery/'+digest(messageId)+'/'});
    const events=(await Promise.all(blobs.map(b=>store.get(b.key,{type:'json'})))).filter(Boolean);
    events.sort((a,b)=>rank[b.status]-rank[a.status]||b.timestamp-a.timestamp);
    const last=events[0];
    if(!last)return {messageId,status:'Accettato da Meta',events:[]};
    return {messageId,status:labels[last.status],codes:last.codes,events:events.sort((a,b)=>a.timestamp-b.timestamp).map(e=>({s:labels[e.status],t:new Date(e.timestamp).toISOString(),codes:e.codes}))};
  }));
  const health=await store.get('delivery-health',{type:'json'});
  return json({results,receivedAt:health?.receivedAt||null,configured:Boolean(env.WHATSAPP_WEBHOOK_PATH_SECRET&&env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)});
}
export async function deliverySetup({store,env}){
  const health=await store.get('delivery-health',{type:'json'});
  const configured=Boolean(env.WHATSAPP_WEBHOOK_PATH_SECRET&&env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  return json({configured,receivedAt:health?.receivedAt||null,
    ...(configured?{url:'https://deploy-preview-18--new-calendar-neacea.netlify.app/.netlify/functions/whatsapp-agenda-test/events/'+env.WHATSAPP_WEBHOOK_PATH_SECRET,verifyToken:env.WHATSAPP_WEBHOOK_VERIFY_TOKEN}:{})});
}
