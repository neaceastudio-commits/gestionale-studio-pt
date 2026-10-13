// Administrative Studio writes do not use the appointment protocol. Owner authentication and audited SQL remain mandatory.
exports.handler=require('./lib/calendar-audit-endpoint').createHandler('calendar',{ownerOnly:true,enforceCalendarRevision:false});
