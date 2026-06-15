// =============================================
// NEACEA — clients.js
// Vista e gestione anagrafica clienti
// =============================================

const Clients = (() => {
  function parseDate(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function fmtDate(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '—';
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function frequencyPerWeek(value) {
    const raw = String(value || '').toLowerCase();
    const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
    if (n > 0) return n;
    if (raw.includes('bisettimanale')) return 0.5;
    if (raw.includes('mensile')) return 0.25;
    return null;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function dateToStr(date) {
    return date.toISOString().slice(0, 10);
  }

  function getPackageMetrics(client) {
    const allAppts = State.getAppointments();
    const today = todayStr();
    const clientAppts = allAppts
      .filter(a => Array.isArray(a.clientIds) && a.clientIds.includes(client.id))
      .filter(a => Services.serviceUsesPackageSessions(a.serviceId))
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

    const activeAppts = clientAppts.filter(a => a.status !== 'annullato');
    const completed = activeAppts.filter(a => a.status === 'fatto').length;
    const scheduled = activeAppts.filter(a => a.status !== 'fatto' && a.date >= today).length;
    const noShow = activeAppts.filter(a => a.status === 'noshow').length;
    const total = Number(client.sessionsTotal ?? client.sessions_total ?? 0);
    const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : (client.packageType ? [client.packageType] : []);
    const hasPackage = pkgs.length > 0;
    const storedRemaining = Number(client.sessionsRemaining ?? client.sessions_remaining ?? 0);
    const computedRemaining = total > 0 ? Math.max(0, total - completed) : 0;
    const remaining = total > 0 ? computedRemaining : storedRemaining;
    const toSchedule = total > 0 ? Math.max(0, total - completed - scheduled) : 0;
    const pctDone = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    const next = activeAppts.find(a => a.date >= today && a.status !== 'fatto');
    const lastDone = [...activeAppts].reverse().find(a => a.status === 'fatto');
    const lastPlanned = [...activeAppts].reverse().find(a => a.status !== 'annullato');
    const freq = frequencyPerWeek(client.packageFrequency);

    let projectedEnd = lastPlanned?.date || '';
    if (!projectedEnd && remaining > 0 && freq) {
      const start = parseDate(client.packageStart) || new Date();
      const weeks = Math.ceil(remaining / freq);
      projectedEnd = dateToStr(addDays(start, weeks * 7));
    }

    const alerts = [];
    if (hasPackage && total <= 0) alerts.push('Sessioni totali mancanti');
    if (total > 0 && Math.abs(storedRemaining - computedRemaining) > 0) alerts.push('Residuo da riallineare');
    if (total > 0 && remaining <= 2 && remaining > 0) alerts.push('Pacchetto quasi finito');
    if (toSchedule > 0) alerts.push(`${toSchedule} da programmare`);
    if (remaining > 0 && !next) alerts.push('Nessun prossimo appuntamento');
    if (total > 0 && completed >= total) alerts.push('Pacchetto completato');

    return {
      total,
      hasPackage,
      completed,
      scheduled,
      noShow,
      remaining,
      storedRemaining,
      computedRemaining,
      toSchedule,
      pctDone,
      next,
      lastDone,
      projectedEnd,
      alerts,
    };
  }

  function renderManagementSummary(clients) {
    const metrics = clients.map(client => ({ client, metrics: getPackageMetrics(client) }));
    const activePackages = metrics.filter(x => x.metrics.hasPackage);
    const sessionsLeft = activePackages.reduce((sum, x) => sum + x.metrics.remaining, 0);
    const toSchedule = activePackages.reduce((sum, x) => sum + x.metrics.toSchedule, 0);
    const alerts = metrics.filter(x => x.metrics.alerts.length);

    return `
      <div class="client-management-grid">
        <div class="client-kpi">
          <span>Pacchetti attivi</span>
          <strong>${activePackages.length}</strong>
        </div>
        <div class="client-kpi">
          <span>Sessioni residue</span>
          <strong>${sessionsLeft}</strong>
        </div>
        <div class="client-kpi">
          <span>Da programmare</span>
          <strong>${toSchedule}</strong>
        </div>
        <div class="client-kpi ${alerts.length ? 'client-kpi-alert' : ''}">
          <span>Alert gestione</span>
          <strong>${alerts.length}</strong>
        </div>
      </div>`;
  }

  function renderDashboardAlerts(limit = 6) {
    const items = State.getClients()
      .filter(c => c.active !== false)
      .map(client => ({ client, metrics: getPackageMetrics(client) }))
      .filter(x => x.metrics.alerts.length)
      .sort((a, b) => b.metrics.alerts.length - a.metrics.alerts.length || a.metrics.remaining - b.metrics.remaining)
      .slice(0, limit);

    if (!items.length) {
      return '<p class="empty-state">Nessun pacchetto richiede attenzione</p>';
    }

    return items.map(({ client, metrics }) => `
      <div class="package-alert-row" onclick="Calendar.switchView('clients')">
        <div>
          <div class="package-alert-name">${client.nome} ${client.cognome}</div>
          <div class="package-alert-meta">
            ${metrics.completed}/${metrics.total || '—'} fatte · ${metrics.remaining} residue · prossimo ${fmtDate(metrics.next?.date)}
          </div>
        </div>
        <div class="package-alert-tags">
          ${metrics.alerts.slice(0, 2).map(a => `<span>${a}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

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
      </div>
      ${renderManagementSummary(clients)}
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contatti</th>
              <th>Pacchetto</th>
              <th>Frequenza</th>
              <th>Sessioni</th>
              <th>Gestione</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(c => {
              const pkgs = Array.isArray(c.packageTypes) ? c.packageTypes : (c.packageType ? [c.packageType] : []);
              const services = [...new Set(pkgs.flatMap(p => CONFIG.PACKAGE_SERVICE_MAP[p]||[]))]
                .map(id => CONFIG.SERVICES[id])
                .filter(Boolean);
              const svcColor = services[0]?.color || '#94A3B8';
              const metrics = getPackageMetrics(c);
              const remainingPct = metrics.total ? Math.round((metrics.remaining / metrics.total) * 100) : 0;
              return `
              <tr class="${c.active === false ? 'row-inactive' : ''}" onclick="App.openEditClient('${c.id}')">
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
                  ${metrics.total ? `
                    <div class="sessions-cell">
                      <span class="sessions-count ${metrics.remaining <= 2 ? 'sessions-low' : ''}">${metrics.remaining}/${metrics.total}</span>
                      <div class="sessions-bar-wrap">
                        <div class="sessions-bar" style="width:${remainingPct}%;background:${remainingPct < 20 ? '#DC2626' : remainingPct < 50 ? '#F59E0B' : '#16A34A'}"></div>
                      </div>
                      <span class="session-mini">${metrics.completed} fatte</span>
                    </div>` : (metrics.hasPackage ? `
                    <div class="sessions-cell sessions-missing">
                      <span class="sessions-count sessions-low">Da impostare</span>
                      <span class="session-mini">${metrics.completed} fatte rilevate</span>
                    </div>` : '<span class="text-muted">—</span>')}
                </td>
                <td>
                  <div class="package-status" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">
                    <div>${metrics.scheduled} programmate · ${metrics.toSchedule} da pianificare</div>
                    <div class="text-muted">Prossima: ${fmtDate(metrics.next?.date)} · Fine stimata: ${fmtDate(metrics.projectedEnd)}</div>
                    ${metrics.alerts.length ? `<div class="package-alerts">${metrics.alerts.map(a => `<span>${a}</span>`).join('')}</div>` : ''}
                  </div>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" title="Quadro pacchetto" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">📊</button>
                    <button class="btn-icon-sm" title="Modifica" onclick="event.stopPropagation();App.openEditClient('${c.id}')">✏️</button>
                    <button class="btn-icon-sm" title="Nuovo appuntamento" onclick="event.stopPropagation();App.openNewAppointment(null,'${c.id}')">📅</button>
                    <button class="btn-icon-sm" title="${c.active===false ? 'Attiva' : 'Disattiva'}" onclick="event.stopPropagation();Clients.toggleActive('${c.id}')">
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

  return { render, toggleActive, getPackageMetrics, renderDashboardAlerts };
})();
