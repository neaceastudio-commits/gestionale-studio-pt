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
clients.forEach((c,i)=>{c.pt_assegnato='pt-demo';c.package_types=['PT 1:1'];c.sessions_total=12;c.sessions_remaining=8;c.notes='[NEACEA-PACKAGE-LEDGER-V1]'+JSON.stringify({cycles:[{id:c.id+'-initial',source:'legacy',startDate:c.data_inizio},...Array.from({length:[7,4,2,0,3][i]},(_,j)=>({id:c.id+'-r'+j,source:'renewal',startDate:ago((j+1)*30)}))]})+'[/NEACEA-PACKAGE-LEDGER-V1]';});
const appointments=[];
function add(c,n,step=7,offset=1,missEvery=0){for(let i=0;i<n;i++)appointments.push({id:c.id+'-'+String(i).padStart(3,'0'),client_ids:[c.id],service_id:'pt11',operator_id:'pt-demo',date:ago(offset+i*step),start_time:'09:00',duration_min:60,status:missEvery&&i%missEvery===0?'noshow':'fatto'});}
add(clients[0],95,7,1,25);add(clients[1],60,5,2,20);add(clients[2],30,5,75,8);add(clients[3],8,4,1);add(clients[4],42,7,120);
// A historical interruption followed by resumed attendance.
appointments.filter(a=>a.client_ids[0]==='demo-marco'&&a.date>=ago(130)&&a.date<=ago(65)).forEach(a=>a.status='annullato');
for(const c of [clients[0],clients[1],clients[3]])appointments.push({id:c.id+'-next',client_ids:[c.id],service_id:'pt11',operator_id:'pt-demo',date:ago(-3),start_time:'09:00',status:'prenotato'});
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
