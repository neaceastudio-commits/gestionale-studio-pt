'use strict';
const session = require('./pt-session-metadata');
const packageCycle = require('./apple-calendar-package');

function visibleClient(client) {
  return client.active !== false && !/ibern/i.test(String(client.stato_abbonamento || ''));
}

// A calendar attendance is not a saved workout. Completion belongs to the
// appointment + client + author, including both participants of a PT 1:2.
function clientScope(clients, appointments, records) {
  const contexts = new Map(clients.map(client => [client.id,
    packageCycle.context(client, appointments.filter(a => a.client_ids?.includes(client.id)))]));
  const assignments = appointments.filter(a => ['pt11', 'pt12'].includes(a.service_id)
    && ['prenotato', 'fatto'].includes(a.status)).map(a => ({
      ...a,
      client_ids: (a.client_ids || []).filter(id => contexts.has(id) && session.status(a,id) !== 'noshow' && (String(a.notes||'').includes('[RINNOVO-PREVISTO ') || packageCycle.inCycle(a, contexts.get(id)))),
    })).filter(a => a.client_ids.length);
  const saved = new Set(records.map(r => JSON.stringify([r.appointment_id, r.cliente_id, r.operator_id])));
  return {
    assignments,
    clients: clients.map(client => ({
      ...client,
      pending_session_pt_ids: [...new Set(assignments.filter(a => a.client_ids.includes(client.id)
        && !saved.has(JSON.stringify([a.id, client.id, a.operator_id]))).map(a => a.operator_id))],
    })),
  };
}

module.exports = { visibleClient, clientScope };
