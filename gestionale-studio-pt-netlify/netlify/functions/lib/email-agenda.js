'use strict';
const { buildAgendas, romeTime } = require('./whatsapp-agenda');
const signature = require('./email-agenda-signature');
const { randomUUID } = require('node:crypto');
const validEmail = value => /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value || '');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildEmail(agenda, email, env) {
  const date = new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome', weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(agenda.day+'T12:00:00Z'));
  const subject = `NEACEA · La tua agenda di ${date}`;
  const footer = 'I conteggi indicano le sedute già completate nel pacchetto corrente. Situazione aggiornata al momento della preparazione: consulta il Calendario per le modifiche successive.';
  const text = [`Ciao ${agenda.operatorName},`, '', `Ecco le tue sedute di ${date}.`, '', ...agenda.lines, '', `Totale: ${agenda.count} sedute`, '', footer, 'https://new-calendar-neacea.netlify.app/', '', 'Cordiali saluti,', 'NEACEA Desk · Segreteria e Accoglienza', 'NEACEA STUDIO S.R.L.', 'Via Francia 28, 09045 Quartu Sant’Elena (CA)', '+39 352 052 5230 · neacea.desk@gmail.com', 'https://www.neacea.com'].join('\n');
  const rows = agenda.lines.map(line => `<tr><td style="padding:14px 0;border-bottom:1px solid #e4eaf0;line-height:1.6">${escape(line)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#f3f6f8;color:#17314a;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:640px;margin:auto;background:#fff"><tr><td style="padding:24px;background:#17314a;color:white"><strong style="font-size:24px">NEACEA</strong><p style="margin-bottom:0">La tua agenda · ${escape(date)}</p></td></tr><tr><td style="padding:24px"><p>Ciao ${escape(agenda.operatorName)},</p><p>Ecco le tue sedute di oggi.</p><table role="presentation" width="100%">${rows}</table><p><strong>Totale: ${agenda.count} sedute</strong></p><p style="font-size:13px;line-height:1.6;color:#526777">${escape(footer)}</p><p><a href="https://new-calendar-neacea.netlify.app/" style="color:#17314a;font-weight:bold">Apri il Calendario</a></p><div style="margin-top:32px">${signature}</div></td></tr></table></td></tr></table></body></html>`;
  return { from:env.EMAIL_AGENDA_FROM, to:[email], reply_to:env.EMAIL_AGENDA_REPLY_TO || 'neacea.desk@gmail.com', subject, text, html };
}
function createService({db, env=process.env, fetchImpl=global.fetch, now=()=>new Date(), pause=ms=>new Promise(r=>setTimeout(r,ms))}) {
  async function all(table, query) {
    const rows=[];
    for(let offset=0;;offset+=1000) { const page=await db(table,{query:query+`&limit=1000&offset=${offset}`}); rows.push(...page); if(page.length<1000)return rows; }
  }
  async function preview(day=romeTime(now()).day) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('invalid_day');
    const [operators,roles,clients,appointments]=await Promise.all([
      all('operators','?select=id,nome,cognome,email,active,roles&order=id'),
      all('operator_effective_roles','?select=operator_id,system_roles,legacy_roles&order=operator_id'),
      all('clients','?select=id,nome,cognome,sessions_total,sessions_remaining&order=id'),
      all('appointments',`?select=id,date,start_time,service_id,client_ids,operator_id,status&date=eq.${day}&status=eq.prenotato&service_id=in.(pt11,pt12)&order=id`)
    ]);
    const agendas=buildAgendas({operators:operators.map(o=>({...o,...roles.find(r=>r.operator_id===o.id)})),clients,appointments},day).filter(a=>a.count>0);
    return agendas.map(a=>{const email=String(operators.find(o=>o.id===a.operatorId).email||'').trim().toLowerCase();return {...a,email,issues:[...a.issues,...(!validEmail(email)?['invalid_email']:[])],message:buildEmail(a,email,env)};});
  }
  async function run({dryRun=true}={}) {
    if(dryRun)return {dryRun:true,agendas:await preview()};
    if(env.EMAIL_AGENDA_ENABLED!=='true')return {skipped:'disabled'};
    if(!env.SITE_ID || env.SITE_ID!==env.EMAIL_AGENDA_SITE_ID)return {skipped:'site_mismatch'};
    if(!env.RESEND_API_KEY || !env.EMAIL_AGENDA_FROM)throw Error('email_provider_not_configured');
    const {day,time}=romeTime(now());
    // First send at 06:30; bounded recovery window, including daylight saving changes.
    if(time<'06:30'||time>'07:00')return {skipped:'outside_morning_window'};
    const agendas=await preview(day), results=[];
    for(const agenda of agendas) {
      if(agenda.issues.length){results.push({operatorId:agenda.operatorId,status:'blocked',issues:agenda.issues});continue;}
      const claimToken=randomUUID();
      const claim=await db('rpc/email_agenda_claim',{method:'POST',body:{p_day:day,p_operator_id:agenda.operatorId,p_payload:agenda.message,p_token:claimToken}});
      if(!claim){results.push({operatorId:agenda.operatorId,status:'already_claimed'});continue;}
      let status='pending',messageId=null,error='provider_outcome_unknown';
      try {
        const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`neacea-agenda/${day}/${agenda.operatorId}`},body:JSON.stringify(claim),signal:AbortSignal.timeout(8000)});
        const data=await response.json();
        if(response.ok&&typeof data.id==='string'){status='accepted';messageId=data.id;error=null;}
        else { status=response.status===429||response.status>=500||response.status===409?'pending':'failed';error=`provider_http_${response.status}`; }
      } catch { /* Persist the exact same payload and key for the next scheduled retry. */ }
      const finished=await db('rpc/email_agenda_finish',{method:'POST',body:{p_day:day,p_operator_id:agenda.operatorId,p_token:claimToken,p_status:status,p_message_id:messageId,p_error:error}});
      results.push({operatorId:agenda.operatorId,status:finished?status:'log_update_failed',messageId});
      await pause(600); // Resend's default rate limit is shared by the account.
    }
    return {day,accepted:results.filter(r=>r.status==='accepted').length,results};
  }
  return {preview,run};
}
module.exports={createService,buildEmail,validEmail};
