// Isolated UI fixture with synthetic identities only. No external API requests.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
let active=false;
const script=path.resolve(__dirname,'../../app/calendario-studio/js/calendar-audit.js');
http.createServer(async(req,res)=>{
 const send=(body,type='application/json')=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body)};
 if(req.url==='/calendar-audit.js')return send(fs.readFileSync(script),'text/javascript');
 if(req.url==='/.netlify/functions/calendar-activity'){
  let body='';for await(const chunk of req)body+=chunk;
  const input=JSON.parse(body);
  if(input.operation==='session')return send(JSON.stringify({actor:{role:'owner',id:'staff_1'}}));
  if(input.operation==='client_shares')return send(JSON.stringify({referent:'a',operators:[{id:'a',name:'PT referente di prova'},{id:'b',name:'PT collaboratore di prova'}],shares:[{operator_id:'b',active}]}));
  if(input.operation==='set_client_share'){active=input.payload.active;return send(JSON.stringify({success:true}));}
  return send('{}');
 }
 if(req.url!=='/'){res.writeHead(404);return res.end();}
 send(`<!doctype html><html lang="it"><meta charset="utf-8"><title>TEST ISOLATO — Condivisione PT</title><style>body{font:18px system-ui;max-width:800px;margin:30px auto;padding:16px;color:#203d36}button{padding:12px;margin:8px;border-radius:8px}.modal-header{display:flex;justify-content:space-between}.form-group{padding:18px;border-bottom:1px solid #ddd}p{line-height:1.5}</style><h1>Quadro pacchetto · Cliente di prova</h1><p>Solo dati sintetici: nessuna modifica al gestionale reale.</p><button onclick="CalendarAudit.openClientSharing('test-client')">Condividi cliente con PT</button><div id="modal"></div><script>window.UI={openModal:html=>document.getElementById('modal').innerHTML=html,closeModal:()=>document.getElementById('modal').replaceChildren()};</script><script src="/calendar-audit.js"></script></html>`,'text/html');
}).listen(8819,'127.0.0.1',()=>console.log('Synthetic sharing fixture on http://127.0.0.1:8819/'));
