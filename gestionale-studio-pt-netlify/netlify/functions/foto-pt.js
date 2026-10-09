// Retired by the studio: keep a 410 endpoint for older open clients.
exports.handler = async event => ({
  statusCode: event.httpMethod === 'OPTIONS' ? 204 : 410,
  headers: {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'},
  body: JSON.stringify({success:false,error:'La sezione foto e allegati è stata rimossa.'})
});
