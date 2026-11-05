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
    const ledger = typeof PackageLedger !== 'undefined' ? PackageLedger.parse(client) : { cycles: [] };
    const ledgerCurrent = !ledger.parseError && ledger.cycles.length ? PackageLedger.currentCycle(ledger) : null;
    const finance = typeof PackageLedger !== 'undefined'
      ? PackageLedger.cycleFinancial(ledgerCurrent || {
          amount: client.importo || 0,
          openingPaidAmount: String(client.statoPagamento || '').toLowerCase() === 'pagato' ? Number(client.importo || 0) : 0,
          payments: [],
        })
      : { total: Number(client.importo || 0), paid: 0, balance: Number(client.importo || 0), status: client.statoPagamento || 'Da pagare' };
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

    const alertDetails = [];
    const addAlert = (id, label, explanation, solution, action, actionLabel) =>
      alertDetails.push({ id, label, explanation, solution, action, actionLabel });
    if (hasPackage && total <= 0) addAlert('missing-total', 'Sessioni totali mancanti',
      'Il cliente ha un pacchetto, ma non è indicato un numero valido di sedute acquistate. Il residuo non può essere verificato.',
      'Controlla il pacchetto acquistato e imposta le sessioni totali in “Modifica pacchetto”. Non usare le sedute dello storico come totale del ciclo attuale.', 'edit', 'Apri Modifica pacchetto');
    if (serviceMetrics.needsCycleSetup) addAlert('cycle', 'Conferma il ciclo corrente',
      'È stato rilevato un rinnovo precedente, ma la separazione del ciclo corrente dallo storico deve ancora essere confermata.',
      'Nel quadro pacchetto verifica la data di inizio e le sedute acquistate, poi usa “Conferma separazione”. Se i dati non corrispondono al pacchetto acquistato, correggili prima di confermare.', 'lessons', 'Verifica il ciclo');
    if (residualMismatch) addAlert('residual', `Residuo da riallineare: salvato ${storedRemaining}, corretto ${computedRemaining}`,
      `Il residuo salvato (${storedRemaining}) è diverso da quello calcolato dalle sedute e dalle rettifiche del ciclo (${computedRemaining}).`,
      'Verifica prima il ciclo, gli stati delle sedute e le eventuali assenze scalate o rettifiche nel quadro pacchetto. Se il conteggio è corretto, nella lista Clienti usa “Allinea residuo”.', 'lessons', 'Controlla sedute e residuo');
    if (total > 0 && remaining <= 2 && remaining > 0) addAlert('almost-finished', 'Pacchetto quasi finito',
      `Restano ${remaining} sedute da utilizzare nel ciclo corrente. È un promemoria per organizzare la prosecuzione.`,
      'Concorda con il cliente se proseguire. Controlla il rinnovo previsto nel quadro pacchetto oppure prepara il rinnovo da “Pagamenti e rinnovo”. Confermare il rinnovo non equivale a registrare un incasso.', 'finance', 'Apri pagamenti e rinnovo');
    if (toSchedule > 0) addAlert('to-schedule', `${toSchedule} da programmare`,
      `${toSchedule} sedute del residuo del ciclo non sono ancora coperte da prenotazioni.`,
      'Controlla prima se ci sono appuntamenti già in agenda fuori dal ciclo. Nel quadro pacchetto puoi includerli, quando consentito, oppure usare “Genera mancanti”. Per la coppia PT 1:2 verifica entrambi i partecipanti prima di programmare.', 'lessons', 'Apri la programmazione');
    if (overPlanned > 0) addAlert('over-planned', `${overPlanned} oltre pacchetto`,
      `Il conteggio delle sedute consumate e programmate supera di ${overPlanned} il totale acquistato nel ciclo.`,
      'Controlla le singole sedute, gli stati e il ciclo associato. Correggi eventuali duplicati o prenotazioni errate; se le sedute appartengono a un rinnovo, verifica il rinnovo prima di intervenire. Non aumentare il totale senza riscontro del pacchetto acquistato.', 'lessons', 'Verifica le singole sedute');
    if (remaining > 0 && !next) addAlert('no-next', 'Nessun prossimo appuntamento',
      'Ci sono sedute residue, ma nessuna prenotazione del ciclo corrente da oggi in avanti.',
      'Concorda la prossima data con il cliente e prenotala dal quadro pacchetto. Verifica anche eventuali lezioni rimaste “Prenotato” in date passate. Se il percorso è in pausa, l’avviso può restare come promemoria.', 'lessons', 'Controlla gli appuntamenti');
    if (total > 0 && completed >= total) addAlert('completed', 'Pacchetto completato',
      'Le sedute segnate come fatte nel ciclo hanno raggiunto il totale acquistato. È un’informazione sulla conclusione del pacchetto.',
      'Se il cliente prosegue, verifica il rinnovo previsto o prepara quello successivo. Se non prosegue, usa “Non rinnova” per conservarlo nello storico. Controlla separatamente gli eventuali pagamenti aperti.', 'finance', 'Apri pagamenti e rinnovo');
    if (!(typeof App !== 'undefined' && App.isPortalPtMode?.()) && finance.balance > 0) {
      addAlert('payment', `Pagamento aperto: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(finance.balance)}`,
        'Il valore del ciclo non risulta interamente coperto dagli incassi registrati o associati. L’avviso descrive il saldo presente nel gestionale.',
        'In “Pagamenti” controlla gli incassi del ciclo e il riscontro con Scadenze. Se il pagamento è già in Scadenze, associalo al ciclo; altrimenti registra soltanto l’incasso effettivamente ricevuto. Una fattura o la conferma di un rinnovo non attestano un pagamento.', 'finance', 'Verifica i pagamenti');
    }
    const alerts = alertDetails.map(alert => alert.label);

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
      finance,
      alerts,
      alertDetails,
    };
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function clientArgument(clientId) {
    return `decodeURIComponent('${encodeURIComponent(String(clientId)).replace(/'/g, '%27')}')`;
  }

  function alertButton(client, alert) {
    return `<button type="button" class="package-alert-button" onclick="event.stopPropagation();Clients.openAlerts(${clientArgument(client.id)},'${alert.id}')" aria-label="${escapeHtml(alert.label)}: spiegazione e possibili soluzioni">${escapeHtml(alert.label)} ⓘ</button>`;
  }

  function visibleAlertClients() {
    const clients = typeof App !== 'undefined' && App.visibleClients ? App.visibleClients(State.getClients()) : State.getClients();
    return clients.filter(client => client.active !== false);
  }

  function openAlertSummary() {
    const items = visibleAlertClients().map(client => ({ client, metrics: getPackageMetrics(client) })).filter(item => item.metrics.alerts.length);
    UI.openModal(`<div class="modal-header"><h3>Alert gestione</h3><button class="modal-close" aria-label="Chiudi" onclick="UI.closeModal()">×</button></div>
      <div class="modal-body package-alert-guide"><p>${items.length} clienti con avvisi. Seleziona un alert per leggerne il significato e le possibili azioni.</p>
      ${items.map(({ client, metrics }) => `<section><h4>${escapeHtml(`${client.nome} ${client.cognome}`)}</h4><div class="package-alert-tags">${metrics.alertDetails.map(alert => alertButton(client, alert)).join('')}</div></section>`).join('') || '<p>Nessun pacchetto richiede attenzione.</p>'}</div>`);
  }

  function openAlerts(clientId, alertId = '') {
    const client = visibleAlertClients().find(client => client.id === clientId);
    if (!client || !App.guardPackageManagement(clientId)) return;
    const details = getPackageMetrics(client).alertDetails.filter(alert => !alertId || alert.id === alertId);
    const ptMode = App.isPortalPtMode();
    UI.openModal(`<div class="modal-header"><div><h3>Spiegazioni e soluzioni</h3><p class="modal-subtitle">${escapeHtml(`${client.nome} ${client.cognome}`)}</p></div><button class="modal-close" aria-label="Chiudi" onclick="UI.closeModal()">×</button></div>
      <div class="modal-body package-alert-guide"><p>Gli avvisi si aggiornano in base ai dati registrati. Alcuni sono promemoria e non richiedono una correzione.</p>
      ${details.map(alert => `<section><h4>${escapeHtml(alert.label)}</h4><p><strong>Cosa significa</strong><br>${escapeHtml(alert.explanation)}</p><p><strong>Cosa puoi fare</strong><br>${escapeHtml(alert.solution)}</p>
        ${ptMode && alert.action === 'finance'
          ? '<p>Per gestire rinnovi, pagamenti o archiviazione rivolgiti alla Direzione.</p>'
          : `<button type="button" class="btn" onclick="Clients.openAlertAction(${clientArgument(client.id)},'${alert.id}')">${escapeHtml(alert.actionLabel)}</button>`}
        ${ptMode && alert.id === 'residual' ? '<p>Chiedi alla Direzione l’eventuale riallineamento del residuo.</p>' : ''}</section>`).join('') || '<p>Questo avviso non è più presente. Ricontrolla la situazione aggiornata del cliente.</p>'}</div>
      <div class="modal-footer"><button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button></div>`);
  }

  function openAlertAction(clientId, alertId) {
    const client = visibleAlertClients().find(client => client.id === clientId);
    if (!client || !App.guardPackageManagement(clientId)) return;
    const alert = getPackageMetrics(client).alertDetails.find(alert => alert.id === alertId);
    if (!alert) return openAlerts(clientId);
    if (alert.action === 'finance' && !App.guardStudioManagement()) return;
    if (alert.action === 'edit') App.openEditPackage(clientId);
    else if (alert.action === 'finance') App._openPackageFinance(clientId);
    else App.openPackageOverview(clientId);
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
    const finance = typeof PackageLedger !== 'undefined'
      ? PackageLedger.summary(clients)
      : { expected: 0, collected: 0, outstanding: 0 };
    const money = value => new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
    const showFinance = !(typeof App !== 'undefined' && App.isPortalPtMode?.());

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
        <button type="button" class="client-kpi client-alert-summary ${alerts.length ? 'client-kpi-alert' : ''}" onclick="Clients.openAlertSummary()" aria-label="Alert gestione: ${alerts.length} clienti, apri spiegazioni e soluzioni">
          <span>Alert gestione</span>
          <strong>${alerts.length}</strong>
          <small>Clienti con avvisi · vedi dettagli</small>
        </button>
      </div>
      ${showFinance ? `
      <details class="client-finance-disclosure">
        <summary>Guadagni e pagamenti</summary>
        <div class="client-finance-grid">
        <div class="client-kpi">
          <span>Valore cicli</span>
          <strong>${money(finance.expected)}</strong>
        </div>
        <div class="client-kpi">
          <span>Incassato</span>
          <strong>${money(finance.collected)}</strong>
        </div>
        <div class="client-kpi ${finance.outstanding > 0 ? 'client-kpi-alert' : ''}">
          <span>Da incassare</span>
          <strong>${money(finance.outstanding)}</strong>
        </div>
        </div>
      </details>` : ''}`;
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function exportPackagePayments(clientId = '') {
    if (typeof App !== 'undefined' && App.guardStudioManagement && !App.guardStudioManagement()) return;
    const clients = State.getClients().filter(client => !clientId || client.id === clientId);
    const rows = [];
    clients.forEach(client => {
      let ledger;
      try {
        ledger = PackageLedger.ensure(client, {
          total: Number(client.sessionsTotal || 0),
          cycleStart: client.packageCycleStart || client.packageStart || '',
        });
      } catch (_) {
        return;
      }
      ledger.cycles.forEach((cycle, cycleIndex) => {
        const finance = PackageLedger.cycleFinancial(cycle);
        const payments = Array.isArray(cycle.payments) && cycle.payments.length ? cycle.payments : [null];
        payments.forEach(payment => rows.push([
          `${client.nome || ''} ${client.cognome || ''}`.trim(),
          client.id,
          cycleIndex + 1,
          cycle.voidedAt ? 'Rinnovo annullato' : (cycle.source === 'renewal' ? 'Rinnovo' : 'Importato'),
          cycle.id,
          cycle.startDate || '',
          cycle.createdAt || '',
          cycle.closedAt || '',
          cycle.voidedAt || '',
          cycle.voidReason || '',
          Number(cycle.sessionsTotal || 0),
          cycle.sessionsCompletedAtClose ?? '',
          cycle.frequency || '',
          Array.isArray(cycle.days) ? cycle.days.join(', ') : '',
          cycle.time || '',
          cycle.operatorId || '',
          finance.total.toFixed(2),
          finance.paid.toFixed(2),
          finance.balance.toFixed(2),
          cycle.voidedAt ? 'Annullato' : finance.status,
          payment?.id || '',
          payment?.kind || '',
          payment?.date || '',
          payment ? (
            payment.kind === 'storno'
              ? -Math.abs(Number(payment.amount || 0))
              : Number(payment.amount || 0)
          ).toFixed(2) : '',
          payment?.method || '',
          payment?.note || cycle.note || '',
        ]));
      });
    });
    const headers = [
      'Cliente', 'ID cliente', 'N. ciclo', 'Tipo ciclo', 'ID ciclo', 'Data inizio',
      'Creato il', 'Chiuso il', 'Annullato il', 'Motivo annullamento', 'Sedute acquistate', 'Sedute fatte alla chiusura',
      'Frequenza', 'Giorni', 'Orario', 'ID PT ciclo',
      'Valore ciclo', 'Incassato ciclo', 'Saldo ciclo', 'Stato pagamento',
      'ID movimento', 'Tipo movimento', 'Data movimento', 'Importo movimento', 'Metodo', 'Nota',
    ];
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neacea-rinnovi-pagamenti-${clientId || 'tutti'}-${todayStr()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    UI.showToast(`${rows.length} righe esportate`, 'success');
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
          <div class="package-alert-name">${escapeHtml(`${client.nome} ${client.cognome}`)}</div>
          <div class="package-alert-meta">
            Ciclo: ${metrics.completed}/${metrics.total || '—'} fatte · ${metrics.remaining} residue · ${metrics.lifetimeCompleted} complessive
          </div>
        </div>
        <div class="package-alert-tags">
          ${metrics.alertDetails.slice(0, 2).map(alert => alertButton(client, alert)).join('')}
          <button type="button" class="btn-ghost btn-sm" onclick="event.stopPropagation();Clients.openAlerts(${clientArgument(client.id)})">Spiegazioni e soluzioni (${metrics.alerts.length})</button>
        </div>
      </div>
    `).join('');
  }

  function render() {
    const panel = document.getElementById('view-clients');
    if (!panel) return;
    const ptMode = typeof App !== 'undefined' && App.isPortalPtMode?.();
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
          <div class="eyebrow">${ptMode ? 'Pacchetti assegnati' : 'Anagrafica'}</div>
          <div class="page-title">${showingHistory ? 'Storico <em>clienti</em>' : (ptMode ? 'I miei <em>clienti</em>' : 'Clienti <em>attivi</em>')}</div>
        </div>
        <div class="client-header-actions">
          ${ptMode ? '' : '<button class="btn" onclick="Clients.exportPackagePayments()">Esporta rinnovi e pagamenti</button>'}
          <div class="client-view-tabs" role="group" aria-label="Vista clienti">
            <button class="client-view-tab ${showingHistory ? '' : 'active'}" onclick="Clients.setView('active')">Attivi <span>${activeClients.length}</span></button>
            <button class="client-view-tab ${showingHistory ? 'active' : ''}" onclick="Clients.setView('history')">Storico <span>${historyClients.length}</span></button>
          </div>
        </div>
      </div>
      ${showingHistory ? renderHistorySummary(clients) : renderManagementSummary(clients)}
      <div class="card client-table-card">
        <table class="data-table client-data-table">
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
              <tr class="${showingHistory ? 'row-inactive row-history' : ''}" onclick="${showingHistory || ptMode ? `App.openPackageOverview('${c.id}')` : `App.openEditClient('${c.id}')`}">
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
                    ${metrics.alerts.length ? `<div class="package-alerts">${metrics.alertDetails.map(alert => alertButton(c, alert)).join('')}</div>` : ''}
                  </div>`}
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" title="Quadro pacchetto" onclick="event.stopPropagation();App.openPackageOverview('${c.id}')">📊</button>
                    <button class="btn-icon-sm" title="Consenso informato" onclick="event.stopPropagation();window.open('consenso/?cliente=${encodeURIComponent(c.id)}','_blank')">📄</button>
                    ${showingHistory ? `
                      ${ptMode ? '' : `<button class="btn-icon-sm" title="Riattiva cliente" onclick="event.stopPropagation();Clients.reactivate('${c.id}')">🟢</button>`}
                    ` : `
                      ${ptMode ? '' : `<button class="btn-icon-sm" title="Modifica anagrafica" onclick="event.stopPropagation();App.openEditClient('${c.id}')">✏️</button>`}
                      ${ptMode ? '' : `<button class="btn-icon-sm" title="Trasferisci cliente a un altro PT" onclick="event.stopPropagation();App.openTransferClient('${c.id}')">⇄</button>`}
                      <button class="btn-icon-sm" title="Nuovo appuntamento" onclick="event.stopPropagation();App.openNewAppointment(null,'${c.id}')">📅</button>
                      ${ptMode ? '' : `
                        <button class="btn-icon-sm archive" title="Non rinnova: sposta nello storico" onclick="event.stopPropagation();Clients.markNotRenewing('${c.id}')">📥</button>
                        <button class="btn-icon-sm danger" title="Elimina cliente" onclick="event.stopPropagation();Clients.confirmDelete('${c.id}')">🗑</button>
                      `}
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
      appt.status === 'prenotato' &&
      Array.isArray(appt.clientIds) &&
      appt.clientIds.includes(clientId)
    );
    const affectedLabel = futureAppointments.length === 1
      ? '1 prenotazione futura sarà annullata o aggiornata'
      : `${futureAppointments.length} prenotazioni future saranno annullate o aggiornate`;
    const ok = confirm(`${options.question} ${name}?\n\n${affectedLabel}. Le sedute future PT 1:2 saranno annullate per la coppia, senza consumare lezioni. Negli altri gruppi verrà rimosso solo questo cliente. Le sedute già chiuse e le ore maturate dai PT resteranno nello storico e nel riepilogo ore.`);
    if (!ok) return;

    const marker = `[${options.marker} ${today}]`;
    const archivedClient = {
      ...client,
      active: false,
      statoAbbonamento: options.status,
    };
    const audit = `${marker} ${new Date().toLocaleString('it-IT')} · ${name}`;
    const updatedAppointments = futureAppointments.map(appt => {
      const remainingClientIds = (appt.clientIds || []).filter(id =>
        id !== clientId && clients.some(item => item.id === id && item.active !== false)
      );
      const notes = String(appt.notes || '').includes(marker)
        ? String(appt.notes || '')
        : [String(appt.notes || '').trim(), audit].filter(Boolean).join('\n');
      return remainingClientIds.length && appt.serviceId !== 'pt12'
        ? { ...appt, clientIds: remainingClientIds, notes, updatedAt: Date.now() }
        : { ...appt, status: 'annullato', notes, updatedAt: Date.now() };
    });

    const appointmentSync = await Promise.all(updatedAppointments.map(appt => SupabaseSync.saveAppointmentAtomic(appt, appointments.find(before => before.id === appt.id))));
    if (appointmentSync.some(result => result?.error)) {
      UI.showToast('Operazione non eseguita: alcune prenotazioni future non sono state aggiornate', 'error');
      return;
    }
    const clientSync = await SupabaseSync.archiveClient(client, archivedClient);
    if (clientSync?.error) {
      UI.showToast('Prenotazioni aggiornate, ma il cliente non è stato spostato nello storico: riprova', 'error');
      return;
    }

    const updatesById = new Map(appointmentSync.map(result => [result.appointment.id, result.appointment]));
    State.saveAppointments(State.getAppointments().map(appt => updatesById.get(appt.id) || appt));
    State.saveClients(State.getClients().map(item => item.id === clientId ? clientSync : item));
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
    if (typeof App !== 'undefined' && App.guardPackageManagement && !App.guardPackageManagement(clientId)) return;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx === -1) return;

    const metrics = getPackageMetrics(clients[idx]);
    clients[idx] = {
      ...clients[idx],
      sessionsRemaining: metrics.computedRemaining,
      sessions_remaining: metrics.computedRemaining,
      notes: typeof App !== 'undefined' && App._withPtAudit
        ? App._withPtAudit(clients[idx].notes, 'residuo pacchetto allineato')
        : clients[idx].notes,
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
    openAlertSummary,
    openAlerts,
    openAlertAction,
    exportPackagePayments,
  };
})();
