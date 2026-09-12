exports.handler=require('./lib/calendar-audit-endpoint').createHandler('calendar',{ownerOnly:true});
