// Dedicated script owned by neacea.desk@gmail.com. Secret stays in Script Properties.
// Deployment: execute as owner; cloud authenticates each request with REMINDER_SECRET.
function doPost(e) {
  function reply(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
  var input;try { input=JSON.parse(e.postData.contents); }catch (_) { return reply({status:'rejected'}); }
  var props=PropertiesService.getScriptProperties(),secret=props.getProperty('REMINDER_SECRET');
  if(!secret||secret.length<32||input.secret!==secret||Session.getEffectiveUser().getEmail()!=='neacea.desk@gmail.com')return reply({status:'rejected'});
  var p=input.payload,day=Utilities.formatDate(new Date(),'Europe/Rome','yyyy-MM-dd'),time=Utilities.formatDate(new Date(),'Europe/Rome','HH:mm');
  if(!/^[a-f0-9]{64}$/.test(input.key||'')||!p||p.from!=='NEACEA Desk <neacea.desk@gmail.com>'||p.subject!=='Il tuo pacchetto Personal Training sta per terminare'||!Array.isArray(p.to)||p.to.length!==1||!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(p.to[0])||typeof p.html!=='string'||typeof p.text!=='string')return reply({status:'rejected'});
  var lock=LockService.getScriptLock();if(!lock.tryLock(1000))return reply({status:'retry'});
  try{
    var key='sent/'+input.key,old=props.getProperty(key);
    if(old){var saved=JSON.parse(old);return reply({status:saved.status,id:input.key,sender:'neacea.desk@gmail.com'});}
    if(input.day!==day||time<'08:00'||time>='09:00')return reply({status:'rejected'});
    if(MailApp.getRemainingDailyQuota()<1)return reply({status:'retry'});
    // Reserve before sending. If Google terminates after acceptance, never resend blindly.
    props.setProperty(key,JSON.stringify({status:'uncertain',day:day}));
    try { MailApp.sendEmail({to:p.to[0],subject:p.subject,body:p.text,htmlBody:p.html,name:'NEACEA Desk',replyTo:'neacea.desk@gmail.com'}); }
    catch (_) { return reply({status:'uncertain',id:input.key,sender:'neacea.desk@gmail.com'}); }
    props.setProperty(key,JSON.stringify({status:'accepted',day:day}));
    return reply({status:'accepted',id:input.key,sender:'neacea.desk@gmail.com'});
  }finally{lock.releaseLock();}
}
function verifySender(){
  if(Session.getEffectiveUser().getEmail()!=='neacea.desk@gmail.com')throw new Error('Accedere con neacea.desk@gmail.com');
  console.log('Mittente verificato. Quota disponibile: '+MailApp.getRemainingDailyQuota());
}
