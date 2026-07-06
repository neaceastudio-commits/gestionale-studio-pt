// =============================================
// NEACEA — clients.js
// Vista e gestione anagrafica clienti
// =============================================

const Clients = (() => {

  function render() {
    const panel = document.getElementById('view-clients');
    if (!panel) return;
    const clients = State.getClients();

    panel.innerHTML = `
      <div class="view-header">
        <div>
          <div class="eyebrow">Anagrafica</div>
          <div class="page-title">Clienti <em>attivi</em></div>
          
        </div>
        <button class="btn-primary" onclick="App.openNewClient()">
          <span>+</span> Nuovo cliente
        </button>
      </div>
      <div class="clients-list">
        ${clients.map(c => {
          const pkgs = Array.isArray(c.packageTypes) ? c.packageTypes : (c.packageType ? [c.packageType] : []);
          const services = [...new Set(pkgs.flatMap(p => CONFIG.PACKAGE_SERVICE_MAP[p]||[]))]
            .map(id => CONFIG.SERVICES[id])
            .filter(Boolean);
          const svcColor = services[0]?.color || '#94A3B8';
          const pct = c.sessionsTotal ? Math.round((c.sessionsRemaining / c.sessionsTotal) * 100) : 0;
          return `
          <section class="client-card ${c.active === false ? 'row-inactive' : ''}">
            <div class="client-main">
              <span class="op-avatar" style="background:${svcColor}">${(c.nome || '?')[0]}${(c.cognome || '?')[0]}</span>
              <div>
                <strong>${c.nome || ''} ${c.cognome || ''}</strong>
                ${c.notes ? `<small>${c.notes}</small>` : '<small>Nessuna nota</small>'}
              </div>
            </div>
            <div class="client-meta">
              <span>Contatti</span>
              ${c.email ? `<strong>${c.email}</strong>` : '<em>Email assente</em>'}
              ${c.telefono ? `<strong>${c.telefono}</strong>` : ''}
            </div>
            <div class="client-packages">
              <span>Pacchetto</span>
              <div class="role-tags">
                ${pkgs.length
                  ? pkgs.map(p => `<span class="role-tag">${p}</span>`).join('')
                  : '<em>Nessun pacchetto</em>'}
              </div>
            </div>
            <div class="client-frequency">
              <span>Frequenza</span>
              <strong>${c.packageFrequency || '—'}</strong>
            </div>
            <div class="client-sessions">
              <span>Sessioni</span>
              ${c.sessionsTotal ? `
                <div class="sessions-cell">
                  <strong class="sessions-count ${c.sessionsRemaining <= 2 ? 'sessions-low' : ''}">${c.sessionsRemaining}/${c.sessionsTotal}</strong>
                  <div class="sessions-bar-wrap">
                    <div class="sessions-bar" style="width:${pct}%;background:${pct < 20 ? '#DC2626' : pct < 50 ? '#F59E0B' : '#16A34A'}"></div>
                  </div>
                </div>` : '<em>—</em>'}
            </div>
            <div class="action-btns">
              <button class="btn-icon-sm" title="Modifica" onclick="App.openEditClient('${c.id}')">✏️</button>
              <button class="btn-icon-sm" title="Nuovo appuntamento" onclick="App.openNewAppointment()">📅</button>
              <button class="btn-icon-sm" title="${c.active===false ? 'Attiva' : 'Disattiva'}" onclick="Clients.toggleActive('${c.id}')">
                ${c.active === false ? '🟢' : '🔴'}
              </button>
            </div>
          </section>`;
        }).join('')}
      </div>
    `;
  }

  function toggleActive(clientId) {
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
      clients[idx].active = clients[idx].active === false ? true : false;
      State.saveClients(clients);
      render();
    }
  }

  return { render, toggleActive };
})();
