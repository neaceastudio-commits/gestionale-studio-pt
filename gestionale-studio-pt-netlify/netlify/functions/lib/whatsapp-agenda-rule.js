'use strict';
const {romeTime}=require('./whatsapp-agenda');
function validateRule(rule) {
  if (!rule || !['daily','weekly'].includes(rule.frequency) ||
      !Number.isInteger(rule.weekday) || rule.weekday<0 || rule.weekday>6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time) || !['day','week'].includes(rule.period) ||
      ![-1,0,1].includes(rule.offset)) throw Error('invalid_rule');
  return {source:'pt_bookings', audience:'assigned_trainer', timeZone:'Europe/Rome',
    frequency:rule.frequency, weekday:rule.weekday, time:rule.time, period:rule.period, offset:rule.offset};
}
function shift(day,count) {
  const d=new Date(day+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+count);
  return d.toISOString().slice(0,10);
}
function projection(rule, previewAt, now=new Date()) {
  const r=validateRule(rule), local=romeTime(now);
  const weekday=new Date(local.day+'T12:00:00Z').getUTCDay();
  let days=r.frequency==='daily'?0:(r.weekday-weekday+7)%7;
  if (days===0 && local.time>r.time) days=r.frequency==='daily'?1:7;
  const nextDay=shift(local.day,days);
  const sendDay=previewAt==='next'?nextDay:local.day;
  return {nextDay,time:r.time,sendDay,day:shift(sendDay,r.offset*(r.period==='week'?7:1)),period:r.period};
}
module.exports={validateRule,projection};
