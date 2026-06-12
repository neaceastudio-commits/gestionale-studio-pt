// Ricalcolo robusto delle sessioni rimanenti quando cambia lo stato di una seduta.
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

  const recalcIfPackageSession = function (appt) {
    if (appt && Services.serviceUsesPackageSessions(appt.serviceId)) App._consumeClientSessions(appt);
  };

  const originalSaveAppointment = App._saveAppointment?.bind(App);
  if (originalSaveAppointment) {
    App._saveAppointment = function (apptId) {
      const before = apptId ? State.getAppointments().find(a => a.id === apptId) : null;
      const result = originalSaveAppointment(apptId);
      const after = apptId ? State.getAppointments().find(a => a.id === apptId) : null;
      if (before && after && before.status !== after.status) recalcIfPackageSession(after);
      return result;
    };
  }

  const originalMarkNoShow = App._markNoShow?.bind(App);
  if (originalMarkNoShow) {
    App._markNoShow = function (apptId) {
      const before = State.getAppointments().find(a => a.id === apptId);
      const result = originalMarkNoShow(apptId);
      const after = State.getAppointments().find(a => a.id === apptId);
      if (before?.status === 'fatto') recalcIfPackageSession(after || before);
      return result;
    };
  }

  const originalDeleteAppt = App._deleteAppt?.bind(App);
  if (originalDeleteAppt) {
    App._deleteAppt = function (apptId) {
      const before = State.getAppointments().find(a => a.id === apptId);
      const result = originalDeleteAppt(apptId);
      const after = State.getAppointments().find(a => a.id === apptId);
      if (before?.status === 'fatto' && !after) recalcIfPackageSession(before);
      return result;
    };
  }

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
