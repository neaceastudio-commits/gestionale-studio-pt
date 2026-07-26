// =============================================
// NEACEA — clients.js
// Vista e gestione anagrafica clienti
// =============================================

const Clients = (() => {
  let viewMode = 'active';

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
    return dateToStr(new Date());
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
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getPackageMetrics(client) {
    const allAppts = State.getAppointments();
    const today = todayStr();
    const clientAppts = allAppts
      .filter(a => Array.isArray(a.clientIds) && a.clientIds.includes(client.id))
      .filter(a => Services.serviceUsesPackageSessions(a.serviceId))
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

    const serviceMetrics = Services.getClientSessionMetrics(client);
    const activeAppts = clientAppts
      .filter(a => a.status !== 'annullato')
      .filter(a => Services.appointmentInCurrentPackageCycle(a, client));
    const completed = serviceMetrics.completed;
    const scheduled = serviceMetrics.scheduled;
    const noShow = serviceMetrics.noShow;
    const total = serviceMetrics.total;
    const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : (client.packageType ? [client.packageType] : []);
    const hasPackage = pkgs.length > 0;
    const storedRemaining = serviceMetrics.storedRemaining;
    const computedRemaining = serviceMetrics.computedRemaining;
    const residualMismatch = total > 0 && Math.abs(storedRemaining - computedRemaining) > 0;
    const remaining = serviceMetrics.remaining;
    const toSchedule = serviceMetrics.toSchedule;
    const plannedTotal = serviceMetrics.plannedTotal;
    const overPlanned = serviceMetrics.overPlanned;
    const pctDone = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    const next = activeAppts.find(a => a.date >= today && a.status === 'prenotato');
    const lastDone = [...activeAppts].reverse().find(a => a.status === 'fatto');
    const lastDoneLifetime = [...clientAppts].reverse().find(a => a.status === 'fatto');
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
    if (serviceMetrics.needsCycleSetup) alerts.push('Conferma il ciclo corrente');
    if (residualMismatch) alerts.push(`Residuo da riallineare: salvato ${storedRemaining}, corretto ${computedRemaining}`);
    if (total > 0 && remaining <= 2 && remaining > 0) alerts.push('Pacchetto quasi finito');
    if (toSchedule > 0) alerts.push(`${toSchedule} da programmare`);
    if (overPlanned > 0) alerts.push(`${overPlanned} oltre pacchetto`);
    if (remaining > 0 && !next) alerts.push('Nessun prossimo appuntamento');
    if (total > 0 && completed >= total) alerts.push('Pacchetto completato');

    return {
      total,
      hasPackage,
      completed,
      scheduled,
      plannedTotal,
      noShow,
      lifetimeCompleted: serviceMetrics.lifetimeCompleted,
      previousCompleted: serviceMetrics.previousCompleted,
      remaining,
      storedRemaining,
      computedRemaining,
      residualMismatch,
      toSchedule,
      overPlanned,
      pctDone,
      next,
      lastDone,
      lastDoneLifetime,
      projectedEnd,
      cycleStart: serviceMetrics.cycleStart,
      cyclePersisted: serviceMetrics.cyclePersisted,
      needsCycleSetup: serviceMetrics.needsCycleSetup,
      alerts,
    };
  }

  function historyStatus(client) {
    const status = String(client?.statoAbbonamento || client?.stato_abbonamento || '').trim();
    if (!status || (client?.active === false && status.toLowerCase() === 'attivo')) return 'Archiviato';
    return status;
  }

  function historyDate(client) {
    const notes = String(client?.notes || '');
    const matches = [...notes.matchAll(/\[(?:NON RINNOVA|CLIENTE ELIMINATO)\s+(\d{4}-\d{2}-\d{2})\]/gi)];
    return matches.length ? matches[matches.length - 1][1] : '';
  }

  function setView(mode) {
    viewMode = mode === 'history' ? 'history' : 'active';
    render();
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

  function renderHistorySummary(clients) {
    const metrics = clients.map(client => ({ client, metrics: getPackageMetrics(client) }));
    const notRenewed = clients.filter(client => historyStatus(client) === 'Non rinnova').length;
    const otherArchived = clients.length - notRenewed;
    const completed = metrics.reduce((sum, item) => sum + item.metrics.lifetimeCompleted, 0);
    return `
      <div class="client-management-grid client-history-summary">
        <div class="client-kpi"><span>Clienti nello storico</span><strong>${clients.length}</strong></div>
        <div class="client-kpi"><span>Non rinnovano</span><strong>${notRenewed}</strong></div>
        <div class="client-kpi"><span>Altri archiviati</span><strong>${otherArchived}</strong></div>
        <div class="client-kpi"><span>Lezioni conservate</span><strong>${completed}</strong></div>
      </div>`;
  }

  function renderDashboardAlerts(limit = 6) {
    const visibleClients = typeof App !== 'undefined' && App.visibleClients
      ? App.visibleClients(State.getClients())
      : State.getClients();
    const items = visibleClients
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
            Ciclo: ${metrics.completed}/${metrics.total || '—'} fatte · ${metrics.remaining} residue · ${metrics.lifetimeCompleted} complessive
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
    const allClients = typeof App !== 'undefined' && App.visibleClients
      ? App.visibleClients(State.getClients())
      : State.getClients();
    const activeClients = allClients.filter(c => c.active !== false);
    const historyClients = allClients.filter(c => c.active === false);
    const showingHistory = viewMode === 'history';
    const clients = showingHistory ? historyClients : activeClients;

    panel.innerHTML = `
      <div class="view-header">
        <div>
          <div class="eyebrow">Anagrafica</div>
          <div class="page-title">${showingHistory ? 'Storico <em>clienti</em>' : 'Clienti <em>attivi</em>'}</div>
        </div>
        <div class="client-view-tabs" role="group" aria-label="Vista clienti">
          <button class="client-view-tab ${showingHistory ? '' : 'active'}" onclick="Clients.setView('active')">Attivi <span>${activeClients.length}</span></button>
          <button class="client-view-tab ${showingHistory ? 'active' : ''}" onclick="Clients.setView('history')">Storico <span>${historyClients.length}</span></button>
        </div>
      </div>
      ${showingHistory ? renderHistorySummary(clients) : renderManagementSummary(clients)}
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
              <tr class="${showingHistory ? 'row-inactive row-history' : ''}" onclick="${showingHistory ? `App.openPackageOverview('${c.id}')` : `App.openEditClient('${c.id}')`}">
                <td>
                  <div class="op-name-cell">
                    <span class="op-avatar" style="background:${svcColor}">${c.nome[0]}${c.cognome[0]}</span>
                    <div>
                      <div style="font-weight:600">${c.nome} ${c.cognome}</div>
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
                      <span class="session-mini">${metrics.completed} fatte nel ciclo · ${metrics.lifetimeCompleted} complessive</span>
                    </div>` : (metrics.hasPackage ? `
                    <div class="sessions-cell sessions-missing">
                      <span class="sessions-count sessions-low">Da impostare</span>
                      <span class="session-mini">${metrics.completed} fatte nel ciclo · ${metrics.lifetimeCompleted} complessive</span>
                    </div>` : '<span class="text-muted">—</span>')}
                </td>
                <td>
                  ${showingHistory ? `
                  <div class="client-history-status" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">
                    <span class="client-history-badge">${historyStatus(c)}</span>
                    <strong>${metrics.lifetimeCompleted} lezioni complessive</strong>
                    <div class="text-muted">Ultima svolta: ${fmtDate(metrics.lastDoneLifetime?.date)}</div>
                    <div class="text-muted">Spostato nello storico: ${fmtDate(historyDate(c))}</div>
                  </div>` : `
                  <div class="package-status" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">
                    <div>${metrics.scheduled} programmate · ${metrics.toSchedule} da pianificare</div>
                    <div class="text-muted">Ciclo corrente: ${fmtDate(metrics.cycleStart)} · storico precedente: ${metrics.previousCompleted} fatte</div>
                    ${metrics.overPlanned ? `<div class="text-muted" style="font-size:0.72rem;color:#DC2626">In calendario: ${metrics.plannedTotal}/${metrics.total} · ${metrics.overPlanned} lezioni oltre pacchetto</div>` : ''}
                    <div class="text-muted">Prossima: ${fmtDate(metrics.next?.date)} · Fine stimata: ${fmtDate(metrics.projectedEnd)}</div>
                    ${metrics.needsCycleSetup ? `
                      <div class="text-muted" style="font-size:0.72rem;color:#B45309">
                        Rinnovo precedente rilevato: conferma una volta il pacchetto corrente per separarlo definitivamente dallo storico.
                      </div>
                      <button class="btn-icon-sm" title="Conferma il ciclo corrente" onclick="event.stopPropagation();App._confirmCurrentPackageCycle('${c.id}')">
                        Conferma ciclo
                      </button>` : ''}
                    ${metrics.residualMismatch ? `
                      <div class="text-muted" style="font-size:0.72rem">
                        Residuo salvato nel cliente: ${metrics.storedRemaining} · residuo corretto dagli appuntamenti fatti: ${metrics.computedRemaining}
                      </div>
                      <button class="btn-icon-sm" title="Aggiorna il residuo del cliente al valore corretto" onclick="event.stopPropagation();Clients.alignResidual('${c.id}')">
                        Allinea residuo
                      </button>` : ''}
                    ${metrics.alerts.length ? `<div class="package-alerts">${metrics.alerts.map(a => `<span>${a}</span>`).join('')}</div>` : ''}
                  </div>`}
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" title="Quadro pacchetto" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">📊</button>
                    <button class="btn-icon-sm" title="Consenso informato" onclick="event.stopPropagation();window.open('consenso/?cliente=${encodeURIComponent(c.id)}','_blank')">📄</button>
                    ${showingHistory ? `
                      <button class="btn-icon-sm" title="Riattiva cliente" onclick="event.stopPropagation();Clients.reactivate('${c.id}')">🟢</button>
                    ` : `
                      <button class="btn-icon-sm" title="Modifica" onclick="event.stopPropagation();App.openEditClient('${c.id}')">✏️</button>
                      <button class="btn-icon-sm" title="Nuovo appuntamento" onclick="event.stopPropagation();App.openNewAppointment(null,'${c.id}')">📅</button>
                      <button class="btn-icon-sm archive" title="Non rinnova: sposta nello storico" onclick="event.stopPropagation();Clients.markNotRenewing('${c.id}')">📥</button>
                      <button class="btn-icon-sm danger" title="Elimina cliente" onclick="event.stopPropagation();Clients.confirmDelete('${c.id}')">🗑</button>
                    `}
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async function moveToHistory(clientId, options) {
    if (typeof App !== 'undefined' && App.guardStudioManagement && !App.guardStudioManagement()) return;
    if (typeof App !== 'undefined' && App.guardPortalEdit && !App.guardPortalEdit('client', clientId)) return;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx === -1) return;

    const client = clients[idx];
    const name = `${client.nome || ''} ${client.cognome || ''}`.trim() || 'questo cliente';
    const today = todayStr();
    const appointments = State.getAppointments();
    const futureAppointments = appointments.filter(appt =>
      appt.date >= today &&
      appt.status !== 'annullato' &&
      appt.status !== 'fatto' &&
      Array.isArray(appt.clientIds) &&
      appt.clientIds.includes(clientId)
    );
    const affectedLabel = futureAppointments.length === 1
      ? '1 prenotazione futura sarà annullata o aggiornata'
      : `${futureAppointments.length} prenotazioni future saranno annullate o aggiornate`;
    const ok = confirm(`${options.question} ${name}?\n\n${affectedLabel}. Negli appuntamenti condivisi verrà rimosso solo questo cliente. Tutte le lezioni già svolte resteranno consultabili nello Storico clienti.`);
    if (!ok) return;

    const marker = `[${options.marker} ${today}]`;
    const clientNotes = String(client.notes || '').includes(marker)
      ? String(client.notes || '')
      : [String(client.notes || '').trim(), marker].filter(Boolean).join('\n');
    const archivedClient = {
      ...client,
      active: false,
      statoAbbonamento: options.status,
      notes: clientNotes,
    };
    const audit = `${marker} ${new Date().toLocaleString('it-IT')} · ${name}`;
    const updatedAppointments = futureAppointments.map(appt => {
      const remainingClientIds = (appt.clientIds || []).filter(id =>
        id !== clientId && clients.some(item => item.id === id && item.active !== false)
      );
      const notes = String(appt.notes || '').includes(marker)
        ? String(appt.notes || '')
        : [String(appt.notes || '').trim(), audit].filter(Boolean).join('\n');
      return remainingClientIds.length
        ? { ...appt, clientIds: remainingClientIds, notes, updatedAt: Date.now() }
        : { ...appt, status: 'annullato', notes, updatedAt: Date.now() };
    });

    const appointmentSync = await Promise.all(updatedAppointments.map(appt => SupabaseSync.pushAppointment(appt)));
    if (appointmentSync.some(result => result?.error)) {
      UI.showToast('Operazione non eseguita: alcune prenotazioni future non sono state aggiornate', 'error');
      return;
    }
    const clientSync = await SupabaseSync.pushClient(archivedClient);
    if (clientSync?.error) {
      UI.showToast('Prenotazioni aggiornate, ma il cliente non è stato spostato nello storico: riprova', 'error');
      return;
    }

    const updatesById = new Map(updatedAppointments.map(appt => [appt.id, appt]));
    State.saveAppointments(appointments.map(appt => updatesById.get(appt.id) || appt));
    clients[idx] = archivedClient;
    State.saveClients(clients);
    viewMode = 'history';
    UI.closeModal();
    render();
    const suffix = updatedAppointments.length ? ` · ${updatedAppointments.length} prenotazioni aggiornate` : '';
    UI.showToast(`${name} spostato nello storico${suffix}`, 'success');
  }

  function markNotRenewing(clientId) {
    return moveToHistory(clientId, {
      question: 'Confermi che non rinnova',
      marker: 'NON RINNOVA',
      status: 'Non rinnova',
    });
  }

  async function reactivate(clientId) {
    if (typeof App !== 'undefined' && App.guardStudioManagement && !App.guardStudioManagement()) return;
    if (typeof App !== 'undefined' && App.guardPortalEdit && !App.guardPortalEdit('client', clientId)) return;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx === -1) return;
    const client = clients[idx];
    const name = `${client.nome || ''} ${client.cognome || ''}`.trim() || 'questo cliente';
    if (!confirm(`Riattivare ${name}?\n\nLe vecchie prenotazioni annullate non verranno ricreate. Dopo la riattivazione potrai impostare o rinnovare il pacchetto.`)) return;
    const updated = { ...client, active: true, statoAbbonamento: 'Attivo' };
    const result = await SupabaseSync.pushClient(updated);
    if (result?.error) {
      UI.showToast('Cliente non riattivato: riprova', 'error');
      return;
    }
    clients[idx] = updated;
    State.saveClients(clients);
    viewMode = 'active';
    UI.closeModal();
    render();
    UI.showToast(`${name} riattivato: verifica ora il nuovo pacchetto`, 'success');
    App.openEditPackage(clientId);
  }

  function toggleActive(clientId) {
    const client = State.getClients().find(item => item.id === clientId);
    return client?.active === false ? reactivate(clientId) : markNotRenewing(clientId);
  }

  async function confirmDelete(clientId) {
    if (typeof App !== 'undefined' && App.guardStudioManagement && !App.guardStudioManagement()) return;
    if (typeof App !== 'undefined' && App.guardPortalEdit && !App.guardPortalEdit('client', clientId)) return;
    return moveToHistory(clientId, {
      question: 'Eliminare dal calendario',
      marker: 'CLIENTE ELIMINATO',
      status: 'Eliminato',
    });
  }

  function alignResidual(clientId) {
    if (typeof App !== 'undefined' && App.guardStudioManagement && !App.guardStudioManagement()) return;
    if (typeof App !== 'undefined' && App.guardPortalEdit && !App.guardPortalEdit('client', clientId)) return;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx === -1) return;

    const metrics = getPackageMetrics(clients[idx]);
    clients[idx] = {
      ...clients[idx],
      sessionsRemaining: metrics.computedRemaining,
      sessions_remaining: metrics.computedRemaining,
    };
    State.saveClients(clients);
    SupabaseSync.pushClient(clients[idx]);
    if (CONFIG.SHEETS.enabled) Sheets.pushClient(clients[idx]);
    render();
    UI.showToast('Residuo allineato al calendario', 'success');
  }

  return {
    render,
    setView,
    toggleActive,
    markNotRenewing,
    reactivate,
    confirmDelete,
    alignResidual,
    getPackageMetrics,
    historyStatus,
    renderDashboardAlerts,
  };
})();
