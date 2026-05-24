// Ricalcolo robusto delle sessioni rimanenti quando un allenamento viene segnato fatto.
(function () {
  if (!window.App || !window.Services || !window.State) return;

  App._consumeClientSessions = function (appt) {
    if (!appt?.clientIds?.length) return;
    if (!Services.serviceUsesPackageSessions(appt.serviceId)) return;

    const clients = State.getClients();
    const appointments = State.getAppointments();
    const touched = [];

    appt.clientIds.forEach(id => {
      const idx = clients.findIndex(c => c.id === id);
      if (idx < 0) return;

      const total = Number(clients[idx].sessionsTotal ?? clients[idx].sessions_total ?? 0);
      if (total <= 0) return;

      const completed = appointments.filter(a =>
        a.status === 'fatto' &&
        Array.isArray(a.clientIds) &&
        a.clientIds.includes(id) &&
        Services.serviceUsesPackageSessions(a.serviceId)
      ).length;

      const remaining = Math.max(0, total - completed);
      clients[idx] = { ...clients[idx], sessionsRemaining: remaining };
      touched.push(clients[idx]);
    });

    if (!touched.length) return;
    State.saveClients(clients);
    touched.forEach(client => {
      SupabaseSync.pushClient(client);
      if (CONFIG.SHEETS.enabled) Sheets.pushClient(client);
    });
  };
})();
