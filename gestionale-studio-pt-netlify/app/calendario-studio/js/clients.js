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
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contatti</th>
              <th>Pacchetto</th>
              <th>Frequenza</th>
              <th>Sessioni</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(c => {
              const pkgs = Array.isArray(c.packageTypes) ? c.packageTypes : (c.packageType ? [c.packageType] : []);
              const services = [...new Set(pkgs.flatMap(p => CONFIG.PACKAGE_SERVICE_MAP[p]||[]))]
                .map(id => CONFIG.SERVICES[id])
                .map(id => CONFIG.SERVICES[id])
                .filter(Boolean);
              const svcColor = services[0]?.color || '#94A3B8';
              const pct = c.sessionsTotal ? Math.round((c.sessionsRemaining / c.sessionsTotal) * 100) : 0;
              return `
              <tr class="${c.active === false ? 'row-inactive' : ''}">
                <td>
                  <div class="op-name-cell">
                    <span class="op-avatar" style="background:${svcColor}">${c.nome[0]}${c.cognome[0]}</span>
                    <div>
                      <div style="font-weight:600">${c.nome} ${c.cognome}</div>
                      ${c.notes ? `<div class="text-muted" style="font-size:0.72rem">${c.notes}</div>` : ''}
                    </div>
                  </div>
                </td>
                <td class="text-muted" style="font-size:0.8rem">
                  ${c.email ? `<div>${c.email}</div>` : ''}
                  ${c.telefono ? `<div>${c.telefono}</div>` : ''}
                </td>
                <td>
                  ${pkgs.length
                    ? pkgs.map(p => `<span class="role-tag" style="font-size:10px">${p}</span>`).join(' ')
                    : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-muted" style="font-size:0.8rem">${c.packageFrequency || '—'}</td>
                <td>
                  ${c.sessionsTotal ? `
                    <div class="sessions-cell">
                      <span class="sessions-count ${c.sessionsRemaining <= 2 ? 'sessions-low' : ''}">${c.sessionsRemaining}/${c.sessionsTotal}</span>
                      <div class="sessions-bar-wrap">
                        <div class="sessions-bar" style="width:${pct}%;background:${pct < 20 ? '#DC2626' : pct < 50 ? '#F59E0B' : '#16A34A'}"></div>
                      </div>
                    </div>` : '<span class="text-muted">—</span>'}
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" title="Modifica" onclick="App.openEditClient('${c.id}')">✏️</button>
                    <button class="btn-icon-sm" title="Nuovo appuntamento" onclick="App.openNewAppointment()">📅</button>
                    <button class="btn-icon-sm" title="${c.active===false ? 'Attiva' : 'Disattiva'}" onclick="Clients.toggleActive('${c.id}')">
                      ${c.active === false ? '🟢' : '🔴'}
                    </button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
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
