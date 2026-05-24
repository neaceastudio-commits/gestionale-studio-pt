// Regole extra per pacchetti Nutrizione: prenotabile e segnabile senza scalare sedute PT.
(function () {
  if (!window.App || !window.Services) return;

  const originalConsume = App._consumeClientSessions?.bind(App);
  if (originalConsume) {
    App._consumeClientSessions = function (appt) {
      if (!Services.serviceUsesPackageSessions(appt?.serviceId)) return;
      return originalConsume(appt);
    };
  }

  const originalBuildClientsSection = App._buildClientsSection?.bind(App);
  if (originalBuildClientsSection) {
    App._buildClientsSection = function (...args) {
      return originalBuildClientsSection(...args).replace(
        '<select id="appt-clients" class="form-input"',
        '<select id="appt-clients" class="form-input" onchange="App._onSlotChange()"'
      );
    };
  }
})();
