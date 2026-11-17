const {authenticate,db}=require('./lib/calendar-audit-auth');
exports.handler=require('./lib/studio-private-endpoint.cjs').createHandler({authenticate,db});
