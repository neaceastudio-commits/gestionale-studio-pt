/* Local preview only: synthetic fixtures, all requests confined to localhost. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../app/calendario-studio');
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const ago=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
const clients=[
 {id:'demo-anna',nome:'Anna',cognome:'Rossi',data_inizio:ago(680),active:true},
 {id:'demo-marco',nome:'Marco',cognome:'Bianchi',data_inizio:ago(410),active:true},
 {id:'demo-elena',nome:'Elena',cognome:'Conti',data_inizio:ago(230),active:true},
 {id:'demo-luca',nome:'Luca',cognome:'Serra',data_inizio:ago(35),active:true},
 {id:'demo-sara',nome:'Sara',cognome:'Mura',data_inizio:ago(500),active:false}
];
const appointments=[],audit=[];
clients.forEach((c,index)=>{
 c.pt_assegnato='pt-demo';c.package_types=['PT 1:1'];c.sessions_total=8;c.sessions_remaining=0;c.package_frequency='2x settimana';
 const count=[8,6,4,1,5][index],step=[28,40,42,28,28][index],offset=[223,239,230,21,260][index];
 const cycles=Array.from({length:count},(_,i)=>({id:c.id+'-cycle'+i,source:i?'renewal':'legacy',legacy:false,startDate:ago(offset-i*step),sessionsTotal:8,frequency:'2x settimana'}));
 c.notes='[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({cycles})+'[/NEACEA-PACKAGE-LEDGER-V1]';
 cycles.forEach((cycle,i)=>{
  const offsets=index===1?[0,5,10,15,20,25,30,39]:index===2?[0,5,10,15,20,25,30,41]:[0,4,7,11,14,18,21,27];
  offsets.forEach((n,j)=>{const at=new Date(Date.parse(cycle.startDate+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);appointments.push({id:cycle.id+'-'+j,client_ids:[c.id],service_id:'pt11',operator_id:'pt-demo',date:at,start_time:'09:00',duration_min:60,status:at<=today?'fatto':'prenotato',notes:'[CICLO-PACCHETTO-ID '+cycle.id+']'});});
 });
 if(index===1)for(let j=0;j<4;j++)audit.push({id:String(40+j),action:'appointment_moved',client_ids:[c.id],entity_id:cycles.at(-1).id+'-0',request_id:'demo-move-'+j,created_at:ago(35)+'T12:00:00Z',before_data:{date:cycles.at(-1).startDate,start_time:'08:00',status:'prenotato'},after_data:{date:cycles.at(-1).startDate,start_time:'09:00',status:'prenotato'}});
});
const shim=`<script>
const previewFetch=window.fetch.bind(window);
window.fetch=(input,options={})=>{
 const u=new URL(typeof input==='string'?input:input.url,location.href);
 if(u.pathname.includes('/rest/v1/'))return previewFetch('/preview-api/'+u.pathname.split('/').pop()+u.search,options);
 if(u.pathname.includes('/.netlify/functions/'))return previewFetch('/preview-functions/'+u.pathname.split('/').pop(),options);
 if(u.origin!==location.origin)return Promise.resolve(new Response('{}',{status:403}));
 return previewFetch(input,options);
};
</script>`;
const banner=`<div style="padding:10px 18px;background:#fdf8ee;color:#1c3144;font:700 13px sans-serif;text-align:center">Anteprima locale · Clienti e statistiche di esempio · Nessuna pubblicazione</div>`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(u.pathname.startsWith('/preview-api/')){
  if(req.method!=='GET')return json({error:'Anteprima: salvataggi disabilitati'},403);
  const table=u.pathname.split('/').pop(),cursor=u.searchParams.get('id')?.slice(3)||'';
  const rows=table==='clients'?clients:table==='appointments'?appointments:table==='operators'?[{id:'pt-demo',nome:'Trainer',cognome:'Esempio',active:true,roles:['PT']}]:[];
  return json(u.searchParams.has('limit')?rows.filter(r=>r.id>cursor).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,500):rows);
 }
 if(u.pathname.startsWith('/preview-functions/')){
  if(u.pathname.endsWith('calendar-activity')){let raw='';req.on('data',chunk=>raw+=chunk);req.on('end',()=>{const body=JSON.parse(raw||'{}');return json(body.operation==='session'?{actor:{id:'staff_1',role:'owner'}}:body.operation==='list'?(body.filters?.beforeId?[]:audit):{error:'Anteprima: salvataggi disabilitati'},body.operation==='session'||body.operation==='list'?200:403);});return;}
  if(u.pathname.endsWith('calendar-runtime'))return json({CALENDAR_FLEX_MODE:true});
  if(u.pathname.endsWith('apple-caldav-link'))return json({eligible:false});
  return json({error:'Anteprima: funzione esterna disabilitata'},403);
 }
 const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{let body=fs.readFileSync(file);const ext=path.extname(file);
  if(ext==='.html')body=body.toString().replace('<head>','<head>'+shim).replace('<body>','<body>'+banner);
  if(ext==='.css')body=body.toString().replace(/^@import[^\n]+/gm,'');
  res.writeHead(200,{'Content-Type':ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/html','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.JOURNEY_PREVIEW_PORT||4178),'127.0.0.1',()=>console.log('Anteprima: http://127.0.0.1:'+server.address().port+'/?view=situation'));
