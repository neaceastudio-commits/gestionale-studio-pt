// Ricalcolo robusto delle sessioni rimanenti quando cambia lo stato di una seduta.
(function () {
  if (!window.App || !window.Services || !window.State) return;

  App._recalculateClientSessions = async function (clientIds) {
    const clients = State.getClients();
    const touched = [];
    [...new Set(clientIds || [])].forEach(id => {
      const idx = clients.findIndex(c => c.id === id);
      if (idx < 0) return;
      const metrics = Services.getClientSessionMetrics(clients[idx]);
      if (metrics.total <= 0) return;
      if (Number(clients[idx].sessionsRemaining ?? 0) === Number(metrics.remaining)) return;
      clients[idx] = { ...clients[idx], sessionsRemaining: metrics.remaining };
      touched.push(clients[idx]);
    });

    if (!touched.length) return { ok: true, touched: [] };
    State.saveClients(clients);
    const results = await Promise.all(touched.map(client => SupabaseSync.pushClient(client)));
    if (CONFIG.SHEETS.enabled) touched.forEach(client => Sheets.pushClient(client));
    return { ok: !results.some(result => result?.error), touched };
  };

  App._consumeClientSessions = function (appt) {
    if (!appt?.clientIds?.length) return Promise.resolve({ ok: true, touched: [] });
    if (!Services.serviceUsesPackageSessions(appt.serviceId)) return Promise.resolve({ ok: true, touched: [] });
    return App._recalculateClientSessions(appt.clientIds);
  };

  // Status edits now persist appointment and balance in one database transaction.
  // Do not launch an independent balance write before that transaction completes.

  ['_addParticipant', '_removeParticipant'].forEach(method => {
    const original = App[method]?.bind(App);
    if (!original) return;
    App[method] = function (apptId, ...args) {
      const result = original(apptId, ...args);
      const appt = State.getAppointments().find(a => a.id === apptId);
      if (appt) {
        SupabaseSync.pushAppointment(appt);
        if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(appt);
      }
      return result;
    };
  });
})();
