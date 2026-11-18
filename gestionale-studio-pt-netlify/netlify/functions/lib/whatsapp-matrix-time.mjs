import ruleTools from './whatsapp-agenda-rule.js';
import agenda from './whatsapp-agenda.js';
export const rulePrefix='agenda-rules-v1/';
export const runPrefix='agenda-runs-v1/';
export const siteId='28855faa-de52-4e4c-b1c2-e2db4965670f';
export const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function production(context,env){return context?.site?.id===siteId&&env.WHATSAPP_AGENDA_SITE_ID===siteId&&context.deploy?.context==='production'&&context.deploy?.published===true}
export function active(r){return r?.schemaVersion===2&&r.enabled===true&&uuid.test(r.activation?.id)&&typeof r.activation?.ownerId==='string'&&Number.isFinite(Date.parse(r.nextRunAt))}
export function shift(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
// Rome has two UTC offsets. Validate the local round-trip to handle both DST gaps
// and repeated hours. A repeated local time runs once, at its first occurrence.
export function instant(day,time){
 const local=Date.parse(day+'T'+time+':00Z');
 return [120,60].map(m=>new Date(local-m*60000)).find(d=>{const r=agenda.romeTime(d);return r.day===day&&r.time===time})||null;
}
export function nextRun(rule,after=new Date()){
 const r=ruleTools.validateRule(rule),first=agenda.romeTime(after).day;
 for(let i=0;i<370;i++){
  const day=shift(first,i);
  if(r.frequency==='weekly'&&new Date(day+'T12:00:00Z').getUTCDay()!==r.weekday)continue;
  const at=instant(day,r.time);if(at&&at>after)return at.toISOString();
 }
 throw Error('invalid_schedule');
}
export function runId(rule){const local=agenda.romeTime(new Date(rule.nextRunAt));return rule.id+'/'+local.day+'T'+local.time.replace(':','')}
export function agendaDay(rule,scheduledAt){return shift(agenda.romeTime(new Date(scheduledAt)).day,rule.offset*(rule.period==='week'?7:1))}
