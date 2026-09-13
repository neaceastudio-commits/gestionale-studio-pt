// Controlled production verification only. Never retained in the final deployment.
import core from './lib/core.cjs';
import manual from './lib/manual-link.cjs';
import auth from '../../../netlify/functions/lib/calendar-audit-auth.js';
import crypto from 'node:crypto';
export default async request=>{
 if(request.method!=='POST')return new Response('',{status:405});
 try{
  const b=await request.json(),actor=await auth.authenticate(b.accessToken);
  if(!(actor?.id==='staff_1'&&actor.role==='owner')&&!await manual.authorize(b.accessToken))return new Response('',{status:403});
  if(process.env.SITE_NAME!=='neacea-caldav-gianluca'||!b.id?.startsWith('TEST_')||b.id!==process.env.APPLE_CALDAV_PROBE_ID)return new Response('',{status:403});
  const rows=await auth.db('appointments',{query:'?select=id,client_ids,operator_id,status&id=eq.'+encodeURIComponent(b.id)});
  const n=rows[0];if(!n||n.client_ids.some(id=>!id.startsWith('TEST_'))||!n.operator_id?.startsWith('TEST_'))return new Response('',{status:403});
  const cal=new core.CalDAV(process.env);await cal.verify();const href='neacea-'+crypto.createHash('sha256').update(b.id).digest('hex')+'.ics';const a=await cal.read(href);
  if(b.operation==='read'){
   if(!a)return Response.json({deleted:true});
   const unfolded=a.ics.replace(/\r?\n[ \t]/g,'');
   const r=await cal.request(cal.base,'REPORT','<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:prop-filter name="UID"><c:text-match collation="i;octet">'+b.id+'@calendar.neacea.it</c:text-match></c:prop-filter></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>',{Depth:'1','Content-Type':'application/xml'});
   if(r.status!==207)throw Error('Probe count failed');
   const xml=await r.text();const matches=[...xml.matchAll(/<(?:[\w-]+:)?response(?:\s[^>]*)?>/g)];
   return Response.json({...core.parse(a.ics),etag:a.etag,count:matches.length,professional:unfolded.includes(' · 0/8')&&unfolded.includes('Sedute completate: 0 di 8')&&!unfolded.includes('RRULE:')});
  }
  if(!a||core.parse(a.ics).uid!==b.id+'@calendar.neacea.it'||!(n.status==='prenotato'||(b.operation==='cleanup'&&n.status==='annullato')))return new Response('',{status:409});
  if(b.operation==='move18')await cal.put(href,core.rewrite(a.ics,{...core.parse(a.ics).slot,start_time:'18:00'}),a.etag);
  else if(['delete','cleanup'].includes(b.operation))await cal.delete(href,a.etag);
  else return new Response('',{status:400});
  return Response.json({ok:true});
 }catch{return Response.json({error:'Controlled Apple probe refused'},{status:409})}
};
