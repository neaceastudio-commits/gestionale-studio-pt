'use strict';
const auth = require('./lib/calendar-audit-auth');
const { createService } = require('./lib/whatsapp-agenda');
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (statusCode, data) => ({ statusCode, headers, body: JSON.stringify(data) });
exports.createHandler = ({ authenticate = auth.authenticate, service = createService({ db: auth.db }) } = {}) => async event => {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'method_not_allowed' });
  let input; try { input = JSON.parse(event.body || '{}'); } catch { return reply(400, { error: 'invalid_json' }); }
  try {
    const actor = await authenticate(input.accessToken);
    if (actor?.role !== 'owner') return reply(403, { error: 'direction_only' });
    if (input.action === 'session') return reply(200, { role: actor.role });
    if (input.action === 'settings') return reply(200, await service.settings());
    if (input.action === 'configure') return reply(200, await service.configure(actor, input));
    if (input.action && input.action !== 'agenda') return reply(400, { error: 'invalid_action' });
    return reply(200, await service.run({ dryRun: input.dryRun !== false }));
  } catch (e) {
    const allowed = ['invalid_phone','operator_missing','migration_required','sender_mismatch'];
    return reply(409, { error: allowed.includes(e.message) ? e.message : 'whatsapp_agenda_unavailable' });
  }
};
exports.handler = exports.createHandler();
