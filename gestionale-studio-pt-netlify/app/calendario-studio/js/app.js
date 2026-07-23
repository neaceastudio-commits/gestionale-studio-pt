// =============================================
// NEACEA — app.js  v3.0
// Controller principale: modali, UI, sync Sheets
// =============================================

// ── UI HELPERS ────────────────────────────────────────────

const UI = {
  openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  },
  showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    document.getElementById('toast-area').appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => { t.classList.remove('visible'); setTimeout(() => t.remove(), 300); }, 3200);
  },
};

// ── APP CONTROLLER ────────────────────────────────────────

const App = {
  portalPt: {
    enabled: false,
    authorized: false,
    operator: null,
    opParam: '',
    emailParam: '',
    accessParam: ''
  },

  _normKey(value) {
    return String(value || '').trim().toLowerCase();
  },

  _operatorLabel(operator) {
    return [operator?.nome, operator?.cognome].filter(Boolean).join(' ').trim() || operator?.email || operator?.id || '';
  },

  _operatorKeys(operator) {
    return [
      operator?.id,
      operator?.operator_id,
      operator?.email,
      App._operatorLabel(operator)
    ].map(App._normKey).filter(Boolean);
  },

  _clientTrainerKeys(client) {
    return [
      client?.ptAssegnato,
      client?.pt_assegnato,
      client?.trainer_id,
      client?.operatorId,
      client?.operator_id
    ].map(App._normKey).filter(Boolean);
  },

  _resolvePortalOperator(params = new URLSearchParams(window.location.search)) {
    const opParam = params.get('op') || params.get('operator') || params.get('operator_id') || '';
    const emailParam = params.get('email') || params.get('ptEmail') || '';
    const wanted = [opParam, emailParam].map(App._normKey).filter(Boolean);
    const operator = State.getOperators().find(op => {
      const keys = App._operatorKeys(op);
      return wanted.some(value => keys.includes(value));
    }) || null;
    return { operator, opParam, emailParam, accessParam: params.get('access') || '' };
  },

  async _initPortalPtMode() {
    const params = new URLSearchParams(window.location.search);
    const shouldEnable = params.get('pt') === '1' || params.get('mode') === 'pt';
    if (!shouldEnable) return true;

    const resolved = App._resolvePortalOperator(params);
    App.portalPt = { enabled: true, authorized: false, ...resolved };
    try {
      const response = await fetch('https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_token', token: resolved.accessParam }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Sessione PT non valida');
      const authorizedOperator = State.getOperators().find(op =>
        App._operatorKeys(op).includes(App._normKey(result.operatorId)) &&
        (!result.email || App._operatorKeys(op).includes(App._normKey(result.email)))
      ) || null;
      if (!authorizedOperator) throw new Error('Profilo PT non trovato');

      App.portalPt = {
        enabled: true,
        authorized: true,
        operator: authorizedOperator,
        opParam: result.operatorId,
        emailParam: result.email,
        accessParam: resolved.accessParam,
      };
    } catch (error) {
      console.warn('[PT access]', error);
      UI.showToast('Accesso calendario PT non valido o scaduto: rientra dal Portale PT', 'error');
    }
    App._applyPortalPtNavigation();
    App._renderPortalPtBadge();
    return App.portalPt.authorized;
  },

  _applyPortalPtNavigation() {
    if (!App.isPortalPtMode()) return;
    document.querySelectorAll('[data-view="room"], [data-view="availability"], [data-view="operators"]').forEach(button => {
      button.hidden = true;
    });
  },

  _renderPortalPtBadge() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('portal-pt-badge')) return;
    const label = App.portalPt.authorized
      ? (App._operatorLabel(App.portalPt.operator) || App.portalPt.emailParam || 'PT')
      : 'Accesso PT scaduto';
    const badge = document.createElement('span');
    badge.id = 'portal-pt-badge';
    badge.className = 'topbar-btn';
    badge.style.cursor = 'default';
    badge.style.background = 'rgba(255,255,255,.12)';
    badge.style.borderColor = 'rgba(255,255,255,.18)';
    badge.textContent = `PT: ${label}`;
    topbarRight.prepend(badge);
  },

  isPortalPtMode() {
    return !!App.portalPt.enabled;
  },

  currentPortalOperator() {
    return App.portalPt.operator || null;
  },

  portalOperatorId() {
    if (!App.portalPt.authorized) return '';
    return App.currentPortalOperator()?.id || '';
  },

  canEditClient(clientOrId) {
    if (!App.isPortalPtMode()) return true;
    if (!App.portalPt.authorized) return false;
    const client = typeof clientOrId === 'string'
      ? State.getClients().find(c => c.id === clientOrId)
      : clientOrId;
    if (!client) return false;
    const operatorKeys = App._operatorKeys(App.portalPt.operator);
    const trainerKeys = App._clientTrainerKeys(client);
    return operatorKeys.some(key => trainerKeys.includes(key));
  },

  canEditAppointment(appt) {
    if (!App.isPortalPtMode()) return true;
    if (!App.portalPt.authorized || !appt) return false;
    const clientIds = Array.isArray(appt.clientIds) ? appt.clientIds : [];
    if (clientIds.length) return clientIds.every(clientId => App.canEditClient(clientId));
    return App._operatorKeys(App.portalPt.operator).includes(App._normKey(appt.operatorId));
  },

  canViewAppointment(appt) {
    if (!App.isPortalPtMode()) return true;
    if (!App.portalPt.authorized || !appt) return false;
    const isOwnAppointment = App._operatorKeys(App.portalPt.operator).includes(App._normKey(appt.operatorId));
    const hasOwnClient = (appt.clientIds || []).some(clientId => App.canEditClient(clientId));
    return isOwnAppointment || hasOwnClient;
  },

  visibleClients(clients = State.getClients()) {
    return App.isPortalPtMode() ? clients.filter(client => App.canEditClient(client)) : clients;
  },

  guardPortalEdit(kind, item) {
    if (kind === 'client' && App.canEditClient(item)) return true;
    if (kind === 'appointment' && App.canEditAppointment(item)) return true;
    UI.showToast('Modalità PT: puoi modificare solo clienti e appuntamenti assegnati al tuo profilo', 'error');
    return false;
  },

  // ── APERTURA MODALI ──────────────────────────────────

  openNewAppointment(dateStr = null, clientId = null, startTime = null, serviceId = null) {
    if (App.isPortalPtMode() && clientId && !App.canEditClient(clientId)) {
      UI.showToast('Modalità PT: puoi creare appuntamenti solo per i tuoi clienti assegnati', 'error');
      return;
    }
    App._renderAppointmentModal(null, dateStr || Calendar.getCurrentDateStr(), clientId ? [clientId] : [], startTime || '09:00', serviceId || 'pt11');
  },
  openDetail(apptId) {
    const rawAppt = State.getAppointments().find(a => a.id === apptId);
    if (App.isPortalPtMode() && !App.canViewAppointment(rawAppt)) {
      UI.showToast('Questo appuntamento non è collegato al tuo profilo PT', 'error');
      return;
    }
    const appt = Services.getVisibleAppointment(rawAppt);
    if (appt) App._renderDetailModal(appt);
  },

  // ── MODAL APPUNTAMENTO ───────────────────────────────

  _renderAppointmentModal(apptId, defaultDate, preselectedClientIds = [], defaultStartTime = '09:00', defaultServiceId = 'pt11') {
    const appt   = apptId ? State.getAppointments().find(a => a.id === apptId) : null;
    const isEdit = !!appt;
    if (isEdit && !App.guardPortalEdit('appointment', appt)) {
      const visibleAppt = Services.getVisibleAppointment(appt);
      if (visibleAppt) App._renderDetailModal(visibleAppt);
      return;
    }
    const curSvcId = appt?.serviceId || defaultServiceId || 'pt11';
    const svc = Services.getService(curSvcId);

    // Servizi dropdown
    const svcsHtml = Object.values(CONFIG.SERVICES).map(s =>
      `<option value="${s.id}" ${curSvcId===s.id?'selected':''}>${s.label}${s.isBlock?' 🚫':''}</option>`
    ).join('');

    // Status dropdown
    const statusHtml = Object.entries(CONFIG.STATUS).map(([k,v]) =>
      `<option value="${k}" ${(appt?.status||'prenotato')===k?'selected':''}>${v.label}</option>`
    ).join('');

    // Durata: select per circuit, readonly per altri
    const durField = svc?.durationOptions?.length
      ? `<select id="appt-duration" class="form-input" onchange="App._onSlotChange()">
           ${svc.durationOptions.map(v=>`<option value="${v}" ${(appt?.durationMin||svc.durationMin)===v?'selected':''}>${v} min</option>`).join('')}
         </select>`
      : `<input type="number" id="appt-duration" class="form-input" value="${appt?.durationMin||svc?.durationMin||60}"
               readonly style="background:var(--bg);color:var(--text3);cursor:not-allowed">`;

    const isBlock = svc?.isBlock;

    const html = `
      <div class="modal-header">
        <div>
          <h3>${isEdit?'Modifica Appuntamento':'Nuovo Appuntamento'}</h3>
          ${isEdit?`<p class="modal-subtitle">${appt.date} · ${appt.startTime}</p>`:''}
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="appt-id" value="${apptId || ''}">

        <div class="form-row">
          <div class="form-group">
            <label>Servizio *</label>
            <select id="appt-service" class="form-input" onchange="App._onServiceChange()">
              ${svcsHtml}
            </select>
          </div>
          <div class="form-group">
            <label>Stato</label>
            <select id="appt-status" class="form-input">${statusHtml}</select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Data *</label>
            <input type="date" id="appt-date" class="form-input" value="${appt?.date||defaultDate||''}" onchange="App._onSlotChange()">
          </div>
          <div class="form-group">
            <label>Ora *</label>
            <input type="time" id="appt-time" class="form-input" value="${appt?.startTime||defaultStartTime||'09:00'}" step="900" onchange="App._onSlotChange()">
          </div>
          <div class="form-group" id="duration-group">
            <label>Durata</label>
            ${durField}
          </div>
        </div>

        <!-- Clienti: ricostruito da _buildClientsSection -->
        <div id="clients-section">
          ${isBlock ? '' : App._buildClientsSection(curSvcId, appt?.clientIds || preselectedClientIds)}
        </div>

        <!-- Operatore: ricostruito da _buildOperatorSection -->
        <div id="operator-section">
          ${App._buildOperatorSection(curSvcId, appt?.operatorId||null, appt?.date||defaultDate, appt?.startTime||defaultStartTime||'09:00', appt?.durationMin||svc?.durationMin||60, apptId || null)}
        </div>

        <div id="operator-overlap-override" class="operator-overlap-override" hidden>
          <label class="operator-overlap-toggle">
            <input id="appt-force-operator-overlap" type="checkbox"
                   ${Services.hasForcedPt11Overlap(appt) ? 'checked' : ''}
                   onchange="App._onSlotChange()">
            <span><strong>Forza doppio PT 1:1</strong> — richiesta specifica cliente autorizzata da PT/gestionale</span>
          </label>
          <div id="operator-overlap-copy" class="operator-overlap-copy"></div>
        </div>

        <div id="slot-validation" class="slot-validation" style="margin-bottom:8px"></div>

        <div class="form-group">
          <label>Note</label>
          <textarea id="appt-notes" class="form-input" rows="2">${appt?.notes||''}</textarea>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="UI.closeModal()">Annulla</button>
        <button class="btn-primary" onclick="App._saveAppointment('${apptId||''}')">
          ${isEdit?'Salva modifiche':'Crea appuntamento'}
        </button>
      </div>
    `;

    UI.openModal(html);
    // Trigger validazione iniziale
    App._onSlotChange();
  },

  // ── SEZIONE CLIENTI ──────────────────────────────────
  _buildClientsSection(serviceId, selectedIds) {
    const svc = Services.getService(serviceId);
    if (!svc || svc.isBlock) return '';
    const compatible = Services.getCompatibleClients(serviceId)
      .filter(client => !App.isPortalPtMode() || App.canEditClient(client));
    const compCount  = compatible.filter(c => c.compatible).length;
    const isMulti    = svc.maxClients > 1;

    const options = compatible.map(c => {
      const pkgStr = c._pkgs?.join(', ') || c.packageType || '—';
      const icon   = c.compatible ? '' : ' ⚠';
      return `<option value="${c.id}"
        ${selectedIds.includes(c.id)?'selected':''}
        style="color:${c.compatible?'inherit':'var(--text3)'}"
        title="Pacchetti: ${pkgStr}">
        ${c.nome} ${c.cognome}${icon} — ${pkgStr}
      </option>`;
    }).join('');

    const hint = svc.isGroup
      ? `Circuit: seleziona fino a ${svc.maxClients} partecipanti (Ctrl+click)`
      : compCount > 0
        ? `${compCount} clienti con pacchetto compatibile mostrati per primi`
        : 'Nessun cliente con pacchetto compatibile — tutti mostrati';

    return `
      <div class="form-group">
        <label>Cliente${isMulti?'/i':''} *
          ${compCount>0?`<span class="compat-badge">${compCount} compatibili</span>`:''}
        </label>
        <select id="appt-clients" class="form-input"
                size="${Math.min(5, compatible.length+1)}"
                ${isMulti?'multiple':''}
                onchange="App._onClientSelectionChange()">
          ${options}
        </select>
        <div class="form-hint">${hint}</div>
        <div id="appt-package-preview" class="appt-package-preview">
          ${App._clientPackagePreview(selectedIds)}
        </div>
      </div>`;
  },

  _clientPackagePreview(clientIds = []) {
    if (!clientIds.length) return '<div class="package-mini-empty">Seleziona un cliente per vedere il quadro pacchetto.</div>';
    return clientIds.map(id => {
      const c = Services.getClient(id);
      if (!c) return '';
      const metrics = Services.getClientSessionMetrics(c);
      const pkgs = Array.isArray(c.packageTypes) ? c.packageTypes : (c.packageType ? [c.packageType] : []);
      const days = Array.isArray(c.giorniSettimana) ? c.giorniSettimana : [];
      const totalLabel = metrics.total || 'da impostare';
      const remainingLabel = metrics.total ? metrics.remaining : '—';
      return `
        <div class="package-mini-card">
          <div>
            <strong>${c.nome} ${c.cognome}</strong>
            <span>${pkgs.join(', ') || 'Nessun pacchetto'} · ${days.join(', ') || 'giorni non impostati'}</span>
          </div>
          <div class="package-mini-stats">
            <span>${metrics.completed}/${totalLabel} fatte</span>
            <span>${remainingLabel} residue</span>
            <span>${metrics.scheduled} programmate</span>
            <span>${metrics.toSchedule} da pianificare</span>
          </div>
        </div>`;
    }).join('');
  },

  _onClientSelectionChange() {
    const selected = [...(document.getElementById('appt-clients')?.selectedOptions || [])].map(el => el.value);
    const target = document.getElementById('appt-package-preview');
    if (target) target.innerHTML = App._clientPackagePreview(selected);
    App._onSlotChange();
  },

  // ── SEZIONE OPERATORE ─────────────────────────────────
  _buildOperatorSection(serviceId, selectedOpId, date, startTime, durationMin, excludeAppointmentId = null) {
    const svc = Services.getService(serviceId);
    const bufferMin = svc?.bufferMin || 0;
    const excludeId = excludeAppointmentId || document.getElementById('appt-id')?.value || null;
    const portalOperator = App.currentPortalOperator();
    if (portalOperator?.id) selectedOpId = portalOperator.id;
    const ops = Services.getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin, excludeId)
      .filter(op => !App.isPortalPtMode() || !portalOperator || App._operatorKeys(op).some(key => App._operatorKeys(portalOperator).includes(key)));

    // Se selectedOpId non valido, prova auto-assign
    if (!selectedOpId && date && startTime) {
      selectedOpId = Services.autoAssignOperator(serviceId, date, startTime, durationMin, bufferMin, excludeId) || '';
    }

    const opsHtml = `<option value="">— nessuno / scegli —</option>` + ops.map(op => {
      let icon = '';
      if (!op.hasRole)    icon = ' 🚫 ruolo mancante';
      else if (!op.available) icon = ` ⚠ occupato ${[...new Set(op.conflicts.map(c=>c.startTime))].join(', ')}`;
      else                icon = ' ✓';
      return `<option value="${op.id}"
        ${op.id===selectedOpId?'selected':''}
        ${!op.available||!op.hasRole?'style="color:var(--text3)"':''}
        title="${op.hasRole?(op.available?'Disponibile':'Occupato in questo slot'):'Ruolo non compatibile'}">
        ${op.nome} ${op.cognome}${icon}
      </option>`;
    }).join('');

    const available = ops.filter(o => o.available && o.hasRole);
    const warning = available.length === 0
      ? `<div class="form-warning">⚠ Nessun operatore disponibile con il ruolo richiesto per questo slot</div>`
      : '';

    return `
      <div class="form-group">
        <label>Operatore</label>
        <select id="appt-operator" class="form-input" onchange="App._onSlotChange()">
          ${opsHtml}
        </select>
        ${warning}
      </div>`;
  },

  // ── CAMBIO SERVIZIO ──────────────────────────────────
  _onServiceChange() {
    const svcId = document.getElementById('appt-service')?.value;
    const svc   = Services.getService(svcId);
    if (!svc) return;

    // Aggiorna durata
    const group = document.getElementById('duration-group');
    if (group) {
      if (svc.durationOptions?.length) {
        const opts = svc.durationOptions.map(v=>`<option value="${v}">${v} min</option>`).join('');
        group.innerHTML = `<label>Durata</label><select id="appt-duration" class="form-input" onchange="App._onSlotChange()">${opts}</select>`;
      } else {
        group.innerHTML = `<label>Durata</label>
          <input type="number" id="appt-duration" class="form-input" value="${svc.durationMin}"
                 readonly style="background:var(--bg);color:var(--text3);cursor:not-allowed">`;
      }
    }

    // Aggiorna clienti
    const cs = document.getElementById('clients-section');
    if (cs) cs.innerHTML = svc.isBlock ? '' : App._buildClientsSection(svcId, []);

    // Aggiorna operatori
    App._rebuildOperatorSection();
    App._onSlotChange();
  },

  // ── CAMBIO SLOT ──────────────────────────────────────
  _onSlotChange() {
    const svcId  = document.getElementById('appt-service')?.value;
    const date   = document.getElementById('appt-date')?.value;
    const time   = document.getElementById('appt-time')?.value;
    const dur    = parseInt(document.getElementById('appt-duration')?.value) || 60;
    if (!svcId || !date || !time) return;

    // Ricostruisci sezione operatore con disponibilità aggiornata
    App._rebuildOperatorSection();

    const svc = Services.getService(svcId);
    const opId = document.getElementById('appt-operator')?.value || null;
    const clientEls = [...(document.getElementById('appt-clients')?.selectedOptions || [])];
    const clientIds = clientEls.map(el => el.value);
    const apptId = document.getElementById('appt-id')?.value || null;

    const tmpAppt = {
      id: apptId, serviceId: svcId, clientIds, operatorId: opId,
      date, startTime: time, durationMin: dur, bufferMin: svc?.bufferMin||0, status: 'prenotato',
    };

    const baseValidation = Services.canBookAppointment(tmpAppt);
    const overrideBox = document.getElementById('operator-overlap-override');
    const overrideInput = document.getElementById('appt-force-operator-overlap');
    const overrideCopy = document.getElementById('operator-overlap-copy');
    const overrideEligible = baseValidation.operatorOverrideEligible;

    if (overrideBox) overrideBox.hidden = !overrideEligible;
    if (!overrideEligible && overrideInput) overrideInput.checked = false;
    if (overrideCopy) {
      const conflicts = (baseValidation.operatorConflicts || [])
        .map(a => (a.clientIds || []).map(Services.clientConflictLabel).join(', ') || 'nessun cliente')
        .join(' · ');
      overrideCopy.textContent = overrideEligible
        ? `Eccezione consentita: massimo due PT 1:1 contemporanei. Già presente: ${conflicts}.`
        : '';
    }

    const forceRequested = overrideEligible && !!overrideInput?.checked;
    const validation = forceRequested
      ? Services.canBookAppointment(tmpAppt, { allowOperatorOverlap: true })
      : baseValidation;
    const validEl = document.getElementById('slot-validation');
    if (validEl) {
      if (validation.ok) {
        let roomInfo = '';
        if (svc?.room) {
          const load = Services.getRoomLoadAt(date, time, dur, svc.room, apptId);
          const eff  = svc.isGroup ? clientIds.length : (svc.roomLoad||0);
          const max  = Services.getRoomMax(svc.room);
          roomInfo = ` · ${CONFIG.ROOMS[svc.room].label}: ${load+eff}/${max}`;
        } else if (svc?.isValuation && !svc?.room) {
          roomInfo = ' · Nessuna sala occupata';
        }
        validEl.innerHTML = forceRequested
          ? `<div class="val-forced">⚠ Doppio PT 1:1 pronto per la forzatura${roomInfo}. Al salvataggio sarà richiesta conferma.</div>`
          : `<div class="val-ok">✓ Slot disponibile${roomInfo}</div>`;
      } else {
        validEl.innerHTML = `<div class="val-error">⚠ ${validation.errors.join(' · ')}</div>`;
      }
    }
  },

  _rebuildOperatorSection() {
    const svcId = document.getElementById('appt-service')?.value;
    const date  = document.getElementById('appt-date')?.value;
    const time  = document.getElementById('appt-time')?.value;
    const dur   = parseInt(document.getElementById('appt-duration')?.value) || 60;
    const curOp = document.getElementById('appt-operator')?.value || null;
    const apptId = document.getElementById('appt-id')?.value || null;
    const os = document.getElementById('operator-section');
    if (os && svcId && date && time) {
      os.innerHTML = App._buildOperatorSection(svcId, curOp, date, time, dur, apptId);
    }
  },

  _escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  },

  _forcedAuditLines(notes) {
    return String(notes || '').split('\n').filter(line => line.includes('[FORZA-PT11]'));
  },

  _archiveForcedAudit(notes) {
    return String(notes || '').replaceAll('[FORZA-PT11]', '[STORICO-FORZA-PT11]');
  },

  _buildForcedAudit(validation, apptData) {
    const when = new Date().toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const otherClients = (validation.operatorConflicts || [])
      .flatMap(a => a.clientIds || [])
      .map(Services.clientConflictLabel)
      .join(', ') || 'cliente non indicato';
    return `[FORZA-PT11] ${when} · Doppio PT 1:1 autorizzato da PT/gestionale · ${Services.operatorFullName(apptData.operatorId)} · sovrapposto a ${otherClients}`;
  },

  _apptTimeRange(appt, includeBuffer = false) {
    const start = String(appt.startTime || '').slice(0, 5);
    const end = Services.minToTime(Services.effectiveEnd(appt, includeBuffer));
    return `${start}-${end}`;
  },

  _appointmentMiniCard(appt, { markConflict = false } = {}) {
    const svc = Services.getService(appt.serviceId);
    const op = Services.getOperator(appt.operatorId);
    const room = svc?.room ? CONFIG.ROOMS[svc.room]?.label : 'nessuna sala';
    const clients = (appt.clientIds || []).map(Services.clientConflictLabel).join(', ') || 'nessun cliente';
    return `
      <div class="conflict-appt ${markConflict ? 'is-conflict' : ''}">
        <div class="conflict-appt-main">
          <span class="conflict-time">${App._escapeHtml(App._apptTimeRange(appt, false))}</span>
          <strong>${App._escapeHtml(svc?.label || appt.serviceId || 'Appuntamento')}</strong>
          <span>${App._escapeHtml(clients)}</span>
        </div>
        <div class="conflict-appt-meta">
          <span>${App._escapeHtml(op ? `${op.nome} ${op.cognome}` : 'PT non assegnato')}</span>
          <span>${App._escapeHtml(room)}</span>
          <button class="btn-icon-sm" title="Apri appuntamento" onclick="App.openDetail('${appt.id}')">✏️</button>
        </div>
      </div>`;
  },

  _openCurrentAppointmentConflict() {
    const svcId   = document.getElementById('appt-service')?.value;
    const date    = document.getElementById('appt-date')?.value;
    const time    = document.getElementById('appt-time')?.value;
    const dur     = parseInt(document.getElementById('appt-duration')?.value) || 60;
    let opId      = document.getElementById('appt-operator')?.value || null;
    const status  = document.getElementById('appt-status')?.value || 'prenotato';
    const notes   = document.getElementById('appt-notes')?.value || '';
    const svc     = Services.getService(svcId);
    const clientIds = [...(document.getElementById('appt-clients')?.selectedOptions || [])].map(el => el.value);
    const apptId = document.getElementById('appt-id')?.value || null;
    if (!svcId || !date || !time) return;

    const draft = {
      id: apptId,
      serviceId: svcId,
      clientIds,
      operatorId: opId,
      date,
      startTime: time,
      durationMin: dur,
      bufferMin: svc?.bufferMin ?? 10,
      status,
      notes,
    };
    const validation = Services.canBookAppointment(draft);
    App._openConflictOverview(draft, validation.errors);
  },

  _openConflictOverview(draft, errors = [], context = {}) {
    const svc = Services.getService(draft.serviceId);
    const op = Services.getOperator(draft.operatorId);
    const dateAppts = Services.getAppointmentsForDate(draft.date)
      .filter(a => a.id !== draft.id && a.status !== 'annullato')
      .sort((a, b) => `${a.startTime}`.localeCompare(`${b.startTime}`));
    const draftRoom = svc?.room || null;
    const draftClientIds = new Set(draft.clientIds || []);

    const conflictAppts = dateAppts.filter(a => {
      const otherSvc = Services.getService(a.serviceId);
      const sameOperator = draft.operatorId && a.operatorId === draft.operatorId && Services.overlaps(draft, a, false);
      const sameClient = (a.clientIds || []).some(id => draftClientIds.has(id)) && Services.overlaps(draft, a, false);
      const sameRoom = draftRoom && otherSvc?.room === draftRoom && Services.overlaps(draft, a, false);
      return sameOperator || sameClient || sameRoom;
    });

    const operators = Services.getAvailableOperatorsForSlot(
      draft.serviceId,
      draft.date,
      draft.startTime,
      draft.durationMin,
      draft.bufferMin,
      draft.id || null
    );
    const operatorRows = operators.map(operator => {
      const conflicts = operator.conflicts || [];
      const status = operator.available && operator.hasRole ? 'Libero' : (!operator.hasRole ? 'Ruolo non compatibile' : 'Occupato');
      return `
        <div class="conflict-operator ${operator.available && operator.hasRole ? 'is-free' : 'is-busy'}">
          <div>
            <strong>${App._escapeHtml(`${operator.nome} ${operator.cognome}`)}</strong>
            <span>${App._escapeHtml(status)}</span>
          </div>
          <div class="conflict-operator-conflicts">
            ${conflicts.length
              ? conflicts.map(a => `<button class="mini-link" onclick="App.openDetail('${a.id}')">${App._escapeHtml(App._apptTimeRange(a, false))} · ${App._escapeHtml((a.clientIds || []).map(Services.clientConflictLabel).join(', '))}</button>`).join('')
              : '<span class="text-muted">nessun blocco nello slot</span>'}
          </div>
        </div>`;
    }).join('');

    const startMin = Services.timeToMin(draft.startTime);
    const workStart = Services.timeToMin(CONFIG.workHours.start);
    const workEnd = Services.timeToMin(CONFIG.workHours.end);
    const windowStart = Math.max(workStart, Math.floor((startMin - 90) / 30) * 30);
    const windowEnd = Math.min(workEnd, Math.ceil((Services.effectiveEnd(draft, false) + 120) / 30) * 30);
    const rooms = Object.values(CONFIG.ROOMS);
    const timelineRows = [];
    for (let t = windowStart; t < windowEnd; t += 30) {
      const slot = { date: draft.date, startTime: Services.minToTime(t), durationMin: 30, bufferMin: 0 };
      const slotAppts = dateAppts.filter(a => Services.overlaps(slot, a, false));
      const staffBusy = slotAppts
        .filter(a => a.operatorId)
        .map(a => `${Services.operatorFullName(a.operatorId)}: ${(a.clientIds || []).map(Services.clientConflictLabel).join(', ') || Services.getService(a.serviceId)?.label || 'blocco'}`);
      const roomLoads = rooms.map(room => {
        const load = Services.getRoomLoadAt(draft.date, slot.startTime, 30, room.id, draft.id || null);
        const max = Services.getRoomMax(room.id);
        return `<span class="${load >= max ? 'is-full' : ''}">${App._escapeHtml(room.label)} ${load}/${max}</span>`;
      }).join('');
      timelineRows.push(`
        <tr class="${t <= startMin && startMin < t + 30 ? 'is-target' : ''}">
          <td>${App._escapeHtml(slot.startTime)}</td>
          <td>${staffBusy.length ? staffBusy.map(App._escapeHtml).join('<br>') : '<span class="text-muted">PT liberi</span>'}</td>
          <td>${roomLoads}</td>
        </tr>`);
    }

    const draftClients = (draft.clientIds || []).map(Services.clientConflictLabel).join(', ') || 'nessun cliente';
    const draftRoomLabel = draftRoom ? CONFIG.ROOMS[draftRoom]?.label : 'nessuna sala';
    const errorList = errors.length
      ? errors.map(err => `<li>${App._escapeHtml(err)}</li>`).join('')
      : '<li>Slot non disponibile.</li>';
    const returnPackageButton = context.returnPackageClientId
      ? `<button class="btn" onclick="App.openPackageOverview('${context.returnPackageClientId}')">Torna al quadro pacchetto</button>`
      : '';

    const html = `
      <div class="modal-header conflict-header">
        <div>
          <h3>Panoramica conflitto</h3>
          <p class="modal-subtitle">${App._escapeHtml(draft.date)} · ${App._escapeHtml(App._apptTimeRange(draft, false))}</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body conflict-overview">
        <section class="conflict-summary">
          <div>
            <div class="eyebrow">Stai provando a salvare</div>
            <h4>${App._escapeHtml(svc?.label || draft.serviceId)} · ${App._escapeHtml(draftClients)}</h4>
            <p>${App._escapeHtml(op ? `${op.nome} ${op.cognome}` : 'PT non assegnato')} · ${App._escapeHtml(draftRoomLabel)}</p>
          </div>
          <ul>${errorList}</ul>
        </section>

        <section class="conflict-section">
          <h4>Appuntamenti che impattano lo slot</h4>
          <div class="conflict-appt-list">
            ${conflictAppts.length ? conflictAppts.map(a => App._appointmentMiniCard(a, { markConflict: true })).join('') : '<p class="empty-state">Nessun appuntamento diretto trovato: controlla capienza sala o vincoli pacchetto.</p>'}
          </div>
        </section>

        <section class="conflict-section">
          <h4>Disponibilità PT nello slot</h4>
          <div class="conflict-operator-list">${operatorRows || '<p class="empty-state">Nessun PT configurato.</p>'}</div>
        </section>

        <section class="conflict-section">
          <h4>Studio nella fascia vicina</h4>
          <div class="conflict-table-wrap">
            <table class="conflict-table">
              <thead><tr><th>Ora</th><th>PT / clienti</th><th>Sale</th></tr></thead>
              <tbody>${timelineRows.join('')}</tbody>
            </table>
          </div>
        </section>
      </div>
      <div class="modal-footer">
        ${returnPackageButton}
        <button class="btn" onclick="UI.closeModal();Calendar.switchView('room','${draft.date}')">Vista sale del giorno</button>
        <button class="btn-primary" onclick="UI.closeModal()">Chiudi</button>
      </div>`;

    UI.openModal(html);
  },

  // ── SALVA APPUNTAMENTO ───────────────────────────────
  _saveAppointment(apptId) {
    const svcId   = document.getElementById('appt-service')?.value;
    const date    = document.getElementById('appt-date')?.value;
    const time    = document.getElementById('appt-time')?.value;
    const dur     = parseInt(document.getElementById('appt-duration')?.value) || 60;
    const opId    = document.getElementById('appt-operator')?.value || null;
    const status  = document.getElementById('appt-status')?.value || 'prenotato';
    let notes     = document.getElementById('appt-notes')?.value || '';
    const svc     = Services.getService(svcId);
    const clientEls = [...(document.getElementById('appt-clients')?.selectedOptions || [])];
    const clientIds = clientEls.map(el => el.value);
    if (App.isPortalPtMode() && App.portalOperatorId()) opId = App.portalOperatorId();

    if (!svcId || !date || !time) { UI.showToast('Compila tutti i campi obbligatori', 'error'); return; }
    if (!svc?.isBlock && clientIds.length === 0) { UI.showToast('Seleziona almeno un cliente', 'error'); return; }

    const apptData = {
      serviceId: svcId, clientIds, operatorId: opId,
      date, startTime: time, durationMin: dur,
      bufferMin: svc?.bufferMin ?? 10, status, notes,
    };
    if (!App.guardPortalEdit('appointment', { ...apptData, id: apptId || null })) return;

    const before = apptId ? State.getAppointments().find(a => a.id === apptId) : null;
    const sameClients = before
      ? JSON.stringify([...(before.clientIds || [])].sort()) === JSON.stringify([...clientIds].sort())
      : false;
    const sameSlot = before &&
      before.serviceId === svcId &&
      before.date === date &&
      before.startTime === time &&
      Number(before.durationMin || 60) === dur &&
      (before.operatorId || null) === opId &&
      sameClients;

    const draft = { ...apptData, id: apptId || null };
    const baseValidation = Services.canBookAppointment(draft);
    const forceRequested = !!document.getElementById('appt-force-operator-overlap')?.checked;
    const forceApproved = forceRequested && baseValidation.operatorOverrideEligible;
    const continuingAuthorizedOverlap = !!(
      sameSlot &&
      before &&
      Services.hasForcedPt11Overlap(before) &&
      baseValidation.operatorConflicts?.length
    );
    const validation = (sameSlot && (!baseValidation.operatorConflicts?.length || continuingAuthorizedOverlap))
      ? { ok: true, errors: [], operatorConflicts: baseValidation.operatorConflicts || [] }
      : Services.canBookAppointment(draft, { allowOperatorOverlap: forceApproved });
    if (!validation.ok) {
      UI.showToast(validation.errors[0], 'error');
      const ve = document.getElementById('slot-validation');
      if (ve) ve.innerHTML = `<div class="val-error">⚠ ${validation.errors.join(' · ')} <button class="mini-link" onclick="App._openCurrentAppointmentConflict()">Panoramica</button></div>`;
      App._openConflictOverview({ ...apptData, id: apptId || null }, validation.errors);
      return;
    }

    const authorizingOverlap = forceApproved && !continuingAuthorizedOverlap;
    if (authorizingOverlap) {
      const otherClients = (baseValidation.operatorConflicts || [])
        .flatMap(a => a.clientIds || [])
        .map(Services.clientConflictLabel)
        .join(', ');
      const confirmed = confirm(
        `ATTENZIONE: ${Services.operatorFullName(opId)} avrà due clienti PT 1:1 contemporaneamente (${otherClients} + ${clientIds.map(Services.clientConflictLabel).join(', ')}).\n\nConfermi la forzatura richiesta da PT/gestionale?`
      );
      if (!confirmed) return;
      notes = App._archiveForcedAudit(notes).trim();
      const auditLine = App._buildForcedAudit(baseValidation, apptData);
      notes = notes ? `${notes}\n${auditLine}` : auditLine;
    } else if (continuingAuthorizedOverlap) {
      const preservedLines = App._forcedAuditLines(before.notes);
      const missingLines = preservedLines.filter(line => !notes.includes(line));
      if (missingLines.length) notes = [notes.trim(), ...missingLines].filter(Boolean).join('\n');
    } else {
      notes = App._archiveForcedAudit(notes);
      if (before && Services.hasForcedPt11Overlap(before)) {
        const missingHistory = App._forcedAuditLines(before.notes)
          .map(line => line.replace('[FORZA-PT11]', '[STORICO-FORZA-PT11]'))
          .filter(line => !notes.includes(line));
        if (missingHistory.length) notes = [notes.trim(), ...missingHistory].filter(Boolean).join('\n');
      }
    }
    apptData.notes = notes;

    let saved;
    if (apptId) {
      saved = Services.updateAppointment(apptId, apptData);
      if (before?.status !== 'fatto' && saved?.status === 'fatto') App._consumeClientSessions(saved);
      UI.showToast('Appuntamento aggiornato', 'success');
    } else {
      saved = Services.addAppointment(apptData);
      if (saved?.status === 'fatto') App._consumeClientSessions(saved);
      UI.showToast('Appuntamento creato', 'success');
    }

    UI.closeModal();
    Calendar.render();
    SupabaseSync.pushAppointment(saved);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(saved);
  },

  // ── MODAL DETTAGLIO ──────────────────────────────────
  _renderDetailModal(appt) {
    const svc     = Services.getService(appt.serviceId);
    const op      = Services.getOperator(appt.operatorId);
    const isCircuit = svc?.isGroup;
    const isBlock   = svc?.isBlock;
    const clients   = State.getClients();
    const canEdit   = App.canEditAppointment(appt);

    let bodyHtml = '';
    if (isBlock) {
      bodyHtml = `<div class="detail-section detail-section-full">
        <div class="detail-label">Tipo</div>
        <div class="detail-value" style="color:var(--text3)">Blocco agenda — operatore non disponibile</div>
      </div>`;
    } else if (isCircuit) {
      bodyHtml = `
        <div class="detail-section detail-section-full">
          <div class="detail-label">Partecipanti (${appt.clientIds.length}/${svc.maxClients})</div>
          <div class="participant-list">
            ${appt.clientIds.map(id => {
              const c = Services.getClient(id);
              return `<div class="participant-row">
                <span>${c?`${c.nome} ${c.cognome}`:id}</span>
                ${canEdit ? `<button class="btn-icon-sm" onclick="App._removeParticipant('${appt.id}','${id}')">✕</button>` : ''}
              </div>`;
            }).join('')}
          </div>
          ${canEdit && appt.clientIds.length < svc.maxClients ? `
            <div class="add-participant">
              <select id="add-part-select" class="form-input form-input-sm">
                <option value="">— aggiungi cliente —</option>
                ${clients.filter(c => c.active !== false && !appt.clientIds.includes(c.id))
                  .filter(c => !App.isPortalPtMode() || App.canEditClient(c))
                  .map(c=>`<option value="${c.id}">${c.nome} ${c.cognome}</option>`).join('')}
              </select>
              <button class="btn-primary btn-sm" onclick="App._addParticipant('${appt.id}')">+</button>
            </div>` : `<div class="form-hint text-red">Circuit al completo</div>`}
        </div>`;
    } else {
      bodyHtml = `<div class="detail-section">
        <div class="detail-label">Cliente</div>
        <div class="detail-value">${appt.clientIds.map(id=>Services.clientFullName(id)).join(', ')}</div>
      </div>`;
    }

    const roomLabel = svc?.room ? CONFIG.ROOMS[svc.room]?.label : (svc?.isValuation ? 'Nessuna sala (mobile)' : '');
    const roomTag   = roomLabel ? `<span class="room-tag">${roomLabel}</span>` : '';
    const forcedOverlap = Services.hasForcedPt11Overlap(appt);

    const html = `
      <div class="modal-header" style="border-left:4px solid ${svc?.color||'#64748B'}">
        <div>
          <h3>${svc?.label} ${roomTag}</h3>
          <p class="modal-subtitle">${appt.date} · ${appt.startTime} · ${appt.durationMin}min</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body appt-detail-body">
        ${forcedOverlap ? `
          <div class="forced-overlap-alert">
            <strong>⚠ Doppio PT 1:1 autorizzato</strong>
            <span>Questo personal gestisce due clienti nello stesso orario. La forzatura è tracciata nelle note.</span>
          </div>` : ''}
        <div class="detail-grid">
          ${bodyHtml}
          <div class="detail-section">
            <div class="detail-label">Operatore</div>
            <div class="detail-value">${op?`${op.nome} ${op.cognome}`:'—'}</div>
          </div>
          <div class="detail-section">
            <div class="detail-label">Stato</div>
            <div class="detail-value">
              <span class="status-pill status-${appt.status}">${CONFIG.STATUS[appt.status]?.label||appt.status}</span>
            </div>
          </div>
        </div>
        ${appt.notes?`<div class="detail-section detail-section-full detail-notes"><div class="detail-label">Note</div><div class="detail-value">${appt.notes}</div></div>`:''}
      </div>
      <div class="modal-footer">
        ${!canEdit ? '<span class="form-hint">Modalità PT: appuntamento in sola lettura.</span>' : ''}
        ${canEdit ? `<button class="act-btn del" onclick="App._deleteAppt('${appt.id}')">🗑 Elimina</button>` : ''}
        ${canEdit && !isBlock?`
          <button class="act-btn primary" onclick="App._markDone('${appt.id}')">✓ Fatto</button>
          <button class="act-btn gold" onclick="App._markNoShow('${appt.id}')">No-show</button>
        `:''}
        ${canEdit ? `<button class="btn-primary" onclick="App._renderAppointmentModal('${appt.id}','${appt.date}')">Modifica</button>` : '<button class="btn-primary" onclick="UI.closeModal()">Chiudi</button>'}
      </div>
    `;
    UI.openModal(html);
  },

  _addParticipant(apptId) {
    const sel = document.getElementById('add-part-select');
    if (!sel?.value) return;
    const before = State.getAppointments().find(a => a.id === apptId);
    if (!App.guardPortalEdit('appointment', before) || !App.guardPortalEdit('client', sel.value)) return;
    const result = Services.addCircuitParticipant(apptId, sel.value);
    if (result?.ok === false) { UI.showToast(result.error, 'error'); return; }
    UI.showToast('Partecipante aggiunto', 'success');
    Calendar.render();
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },
  _removeParticipant(apptId, clientId) {
    const before = State.getAppointments().find(a => a.id === apptId);
    if (!App.guardPortalEdit('appointment', before) || !App.guardPortalEdit('client', clientId)) return;
    Services.removeCircuitParticipant(apptId, clientId);
    UI.showToast('Partecipante rimosso', 'success');
    Calendar.render();
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },
  _markDone(apptId) {
    const before = State.getAppointments().find(a => a.id === apptId);
    if (!App.guardPortalEdit('appointment', before)) return;
    const doneAppt = Services.updateAppointment(apptId, { status: 'fatto' });
    if (before?.status !== 'fatto') App._consumeClientSessions(doneAppt);
    UI.closeModal(); UI.showToast('Segnato come fatto', 'success'); Calendar.render();
    SupabaseSync.pushAppointment(doneAppt);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(doneAppt);
  },
  _consumeClientSessions(appt) {
    if (!appt?.clientIds?.length) return;
    const clients = State.getClients();
    const touched = [];
    appt.clientIds.forEach(id => {
      const idx = clients.findIndex(c => c.id === id);
      if (idx < 0) return;
      const total = Number(clients[idx].sessionsTotal ?? clients[idx].sessions_total ?? 0);
      const remaining = Number(clients[idx].sessionsRemaining ?? clients[idx].sessions_remaining ?? 0);
      if (total <= 0 || remaining <= 0) return;
      clients[idx] = { ...clients[idx], sessionsRemaining: Math.max(0, remaining - 1) };
      touched.push(clients[idx]);
    });
    if (!touched.length) return;
    State.saveClients(clients);
    touched.forEach(client => {
      SupabaseSync.pushClient(client);
      if (CONFIG.SHEETS.enabled) Sheets.pushClient(client);
    });
  },
  _markNoShow(apptId) {
    const before = State.getAppointments().find(a => a.id === apptId);
    if (!App.guardPortalEdit('appointment', before)) return;
    const nsAppt = Services.updateAppointment(apptId, { status: 'noshow' });
    UI.closeModal(); UI.showToast('Segnato come no-show', 'success'); Calendar.render();
    SupabaseSync.pushAppointment(nsAppt);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(nsAppt);
  },
  async _deleteAppt(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (!appt) return;
    if (!App.guardPortalEdit('appointment', appt)) return;
    const affectsCurrentCycle = appt.status === 'fatto' && appt.clientIds?.some(id => {
      const client = Services.getClient(id);
      return client && Services.serviceUsesPackageSessions(appt.serviceId) && Services.appointmentInCurrentPackageCycle(appt, client);
    });
    const impact = affectsCurrentCycle
      ? '\n\nÈ una lezione fatta del ciclo corrente: il residuo verrà aumentato automaticamente di 1.'
      : '';
    if (!confirm(`Eliminare definitivamente questo appuntamento?${impact}`)) return;

    const result = await SupabaseSync.deleteAppointment(apptId);
    if (result?.error) {
      UI.showToast('Appuntamento non eliminato: errore di sincronizzazione', 'error');
      return;
    }
    Services.deleteAppointment(apptId);
    const balance = Services.serviceUsesPackageSessions(appt.serviceId) && App._recalculateClientSessions
      ? await App._recalculateClientSessions(appt.clientIds || [])
      : { ok: true };
    UI.closeModal();
    UI.showToast(balance?.ok === false ? 'Appuntamento eliminato, residuo da verificare' : 'Appuntamento eliminato e conteggi aggiornati', balance?.ok === false ? 'info' : 'success');
    Calendar.render();
  },

  // ── MODAL CLIENTE ────────────────────────────────────
  openNewClient() {
    if (App.isPortalPtMode()) {
      UI.showToast('Modalità PT: la creazione cliente resta al gestionale studio', 'error');
      return;
    }
    App._renderClientModal(null);
  },
  openEditClient(cid) {
    if (!App.guardPortalEdit('client', cid)) {
      App.openPackageOverview(cid);
      return;
    }
    App._renderClientModal(cid);
  },
  openEditPackage(cid) {
    if (!App.guardPortalEdit('client', cid)) {
      App.openPackageOverview(cid);
      return;
    }
    App._renderClientModal(cid, true);
  },

  _renderClientModal(clientId, packageOnly = false) {
    const client = clientId ? State.getClients().find(c => c.id === clientId) : null;
    const isEdit = !!client;
    if (App.isPortalPtMode() && (!clientId || !App.canEditClient(clientId))) {
      UI.showToast('Modalità PT: puoi modificare solo i tuoi clienti assegnati', 'error');
      return;
    }
    // Supporta sia vecchio schema stringa che nuovo array
    const curPkgs = client ? (Array.isArray(client.packageTypes) ? client.packageTypes : (client.packageType ? [client.packageType] : [])) : [];

    const pkgCheckboxes = Object.keys(CONFIG.PACKAGE_SERVICE_MAP).map(p => {
      const svcs = CONFIG.PACKAGE_SERVICE_MAP[p].map(id => CONFIG.SERVICES[id]?.label).filter(Boolean);
      return `<label class="checkbox-label">
        <input type="checkbox" name="pkg" value="${p}" ${curPkgs.includes(p)?'checked':''} onchange="App._onPackageChange()">
        <span>${p} <small style="color:var(--text3)">(${svcs.join(', ')})</small></span>
      </label>`;
    }).join('');

    const freqOptions = CONFIG.FREQUENCIES.map(f =>
      `<option value="${f}" ${client?.packageFrequency===f?'selected':''}>${f}</option>`
    ).join('');
    const curDays = Array.isArray(client?.giorniSettimana) ? client.giorniSettimana : [];
    const currentMetrics = client ? Services.getClientSessionMetrics(client) : null;
    const dayOptions = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'].map(g => `
      <label class="checkbox-label">
        <input type="checkbox" name="client-day" value="${g}" ${curDays.includes(g)?'checked':''} onchange="App._limitClientDays(this)">
        <span>${g.slice(0, 3)}</span>
      </label>`).join('');

    const html = `
      <div class="modal-header">
        <h3>${packageOnly ? 'Modifica pacchetto e giorni' : (isEdit?'Modifica Cliente':'Nuovo Cliente')}</h3>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Nome *</label>
            <input type="text" id="cl-nome" class="form-input" value="${client?.nome||''}">
          </div>
          <div class="form-group">
            <label>Cognome *</label>
            <input type="text" id="cl-cognome" class="form-input" value="${client?.cognome||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="cl-email" class="form-input" value="${client?.email||''}">
          </div>
          <div class="form-group">
            <label>Telefono</label>
            <input type="text" id="cl-telefono" class="form-input" value="${client?.telefono||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Data di nascita</label>
            <input type="date" id="cl-nascita" class="form-input" value="${client?.nascita||''}">
          </div>
          <div class="form-group">
            <label>Codice fiscale</label>
            <input type="text" id="cl-codice-fiscale" class="form-input" value="${client?.codiceFiscale||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Documento</label>
            <input type="text" id="cl-documento" class="form-input" value="${client?.documento||''}">
          </div>
          <div class="form-group">
            <label>Contatto emergenza</label>
            <input type="text" id="cl-contatto-emergenza" class="form-input" value="${client?.contattoEmergenza||''}">
          </div>
        </div>
        <div class="form-group">
          <label>Indirizzo</label>
          <input type="text" id="cl-indirizzo" class="form-input" value="${client?.indirizzo||''}">
        </div>

        <div class="form-section-label">Pacchetti acquistati</div>
        ${packageOnly ? '<div class="form-hint" style="margin-bottom:8px">Qui modifichi pacchetto, frequenza, sessioni totali e giorni acquistati. Le sedute gia in calendario restano sotto controllo nel Quadro pacchetto.</div>' : ''}
        <div class="checkbox-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
          ${pkgCheckboxes}
        </div>

        <div id="package-calendar-preview" style="margin-top:10px"></div>

        <div class="form-row" style="margin-top:12px">
          <div class="form-group">
            <label>Frequenza</label>
            <select id="cl-frequency" class="form-input" onchange="App._limitClientDays()">
              <option value="">— seleziona —</option>
              ${freqOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Sessioni totali</label>
            <input type="number" id="cl-sessions-total" class="form-input" min="1" value="${currentMetrics?.total || client?.sessionsTotal || ''}" onchange="App._limitClientDays()">
          </div>
          <div class="form-group">
            <label>Sessioni residue automatiche</label>
            <div class="computed-field">
              ${client ? (currentMetrics?.total ? `${currentMetrics.remaining} residue · ${currentMetrics.completed} fatte nel ciclo · ${currentMetrics.lifetimeCompleted} complessive` : 'Imposta le sessioni totali') : 'Calcolate dopo il salvataggio'}
            </div>
            <div class="form-hint">Si aggiornano segnando le sedute come fatto.</div>
          </div>
        </div>

        <div class="form-section-label">Giorni del pacchetto</div>
        <div class="checkbox-grid" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr))">
          ${dayOptions}
        </div>

        <div class="form-group">
          <label>Note</label>
          <textarea id="cl-notes" class="form-input" rows="2">${client?.notes||''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="UI.closeModal()">Annulla</button>
        <button class="btn-primary" onclick="App._saveClient('${clientId||''}')">
          ${isEdit?'Salva modifiche':'Salva cliente'}
        </button>
      </div>
    `;
    UI.openModal(html);
    App._onPackageChange();
    App._limitClientDays();
  },

  _frequencyMaxDaysValue(raw) {
    const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  },

  _maxClientDays() {
    return App._frequencyMaxDaysValue(document.getElementById('cl-frequency')?.value || '');
  },

  _limitClientDays(changed) {
    const max = App._maxClientDays();
    if (!max) return true;
    const checked = [...document.querySelectorAll('input[name="client-day"]:checked')];
    if (checked.length <= max) return true;
    if (changed) changed.checked = false;
    else checked.slice(max).forEach(input => { input.checked = false; });
    UI.showToast(`Il pacchetto prevede massimo ${max} giorni a settimana`, 'error');
    return false;
  },

  _onPackageChange() {
    const checked = [...document.querySelectorAll('input[name="pkg"]:checked')].map(el => el.value);
    const preview = document.getElementById('package-calendar-preview');
    if (!preview) return;
    if (checked.length === 0) { preview.innerHTML = ''; return; }
    const allSvcs = [...new Set(checked.flatMap(p => CONFIG.PACKAGE_SERVICE_MAP[p]||[]))];
    const labels  = allSvcs.map(id => CONFIG.SERVICES[id]).filter(Boolean);
    preview.innerHTML = `<div class="package-info">
      <span class="package-info-label">Servizi prenotabili:</span>
      ${labels.map(s=>`<span class="role-tag" style="background:${s.colorLight};color:${s.color};border-color:${s.color}44">${s.label}</span>`).join('')}
    </div>`;
  },

  _saveClient(clientId) {
    if (App.isPortalPtMode() && (!clientId || !App.canEditClient(clientId))) {
      UI.showToast('Modalità PT: puoi salvare solo i tuoi clienti assegnati', 'error');
      return;
    }
    const nome      = document.getElementById('cl-nome')?.value.trim();
    const cognome   = document.getElementById('cl-cognome')?.value.trim();
    const email     = document.getElementById('cl-email')?.value.trim();
    const telefono  = document.getElementById('cl-telefono')?.value.trim();
    const nascita   = document.getElementById('cl-nascita')?.value || null;
    const codiceFiscale = document.getElementById('cl-codice-fiscale')?.value.trim();
    const documento = document.getElementById('cl-documento')?.value.trim();
    const indirizzo = document.getElementById('cl-indirizzo')?.value.trim();
    const contattoEmergenza = document.getElementById('cl-contatto-emergenza')?.value.trim();
    const pkgs      = [...document.querySelectorAll('input[name="pkg"]:checked')].map(el=>el.value);
    const frequency = document.getElementById('cl-frequency')?.value;
    const sessTotal = parseInt(document.getElementById('cl-sessions-total')?.value)||0;
    const notes     = document.getElementById('cl-notes')?.value.trim();
    if (!App._limitClientDays()) return;
    const giorniSettimana = [...document.querySelectorAll('input[name="client-day"]:checked')].map(el=>el.value);

    if (!nome||!cognome) { UI.showToast('Nome e cognome obbligatori','error'); return; }

    const clients = State.getClients();
    const currentClient = clientId ? clients.find(c => c.id === clientId) : null;
    const currentMetrics = currentClient ? Services.getClientSessionMetrics(currentClient) : null;
    const completedSessions = currentMetrics?.completed || 0;
    const sessRem = sessTotal > 0 ? Math.max(0, sessTotal - completedSessions) : 0;
    const data = {
      nome, cognome, email, telefono, nascita, codiceFiscale, documento, indirizzo, contattoEmergenza,
      packageTypes: pkgs,
      packageFrequency: frequency,
      giorniSettimana,
      sessionsTotal: sessTotal, sessionsRemaining: sessRem,
      packageCycleStart: currentClient
        ? (currentClient.packageCycleStart || currentMetrics?.cycleStart || currentClient.packageStart || App._dateStr(new Date()))
        : App._dateStr(new Date()),
      notes, active: true,
    };

    let saved;
    if (clientId) {
      const idx = clients.findIndex(c=>c.id===clientId);
      if (idx!==-1) { clients[idx] = { ...clients[idx], ...data }; saved = clients[idx]; }
    } else {
      const newC = { id: State.genId('c'), ...data, packageStart: App._dateStr(new Date()) };
      clients.push(newC); saved = newC;
    }
    State.saveClients(clients);
    SupabaseSync.pushClient(saved);
    if (CONFIG.SHEETS.enabled) Sheets.pushClient(saved);

    UI.closeModal();
    if (document.getElementById('view-clients')?.classList.contains('active')) Clients.render();
    UI.showToast(clientId?'Cliente aggiornato':'Cliente salvato','success');
  },

  // ── QUADRO PACCHETTO CLIENTE ─────────────────────────
  _packageServiceId(client) {
    const pkgs = Array.isArray(client?.packageTypes) ? client.packageTypes : [];
    if (pkgs.includes('PT 1:1')) return 'pt11';
    if (pkgs.includes('PT 1:2')) return 'pt12';
    if (pkgs.includes('Circuit')) return 'circuit';
    if (pkgs.includes('Valutazioni') || pkgs.includes('Visbody')) return 'visbody';
    if (pkgs.includes('Baiobit')) return 'baiobit';
    return null;
  },

  _withPackageCycle(notes, cycleStart) {
    const clean = String(notes || '')
      .replace(/\n?\[CICLO-PACCHETTO\s+\d{4}-\d{2}-\d{2}\]/gi, '')
      .trim();
    const marker = cycleStart ? `[CICLO-PACCHETTO ${cycleStart}]` : '';
    return [clean, marker].filter(Boolean).join('\n');
  },

  _packageAppointments(client, includeNutrition = true) {
    const packageAppointments = Services.getClientPackageAppointments(client);
    const nutritionAppointments = includeNutrition
      ? State.getAppointments().filter(a =>
          a.status !== 'annullato' &&
          Array.isArray(a.clientIds) &&
          a.clientIds.includes(client.id) &&
          (a.serviceId === 'nutrizione' || a.serviceId === 'check')
        )
      : [];
    return [...new Map([...packageAppointments, ...nutritionAppointments].map(a => [a.id, a])).values()]
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  },

  _fmtLongDate(dateStr) {
    if (!dateStr) return '—';
    const parts = String(dateStr).split('-').map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
  },

  _dateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  _parseDate(dateStr) {
    const parts = String(dateStr || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  _weekdayName(dateStr) {
    const names = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const d = App._parseDate(dateStr);
    return names[d.getDay()];
  },

  _suggestPackageDates(client, count, options = {}) {
    const days = Array.isArray(options.days) ? options.days : (Array.isArray(client.giorniSettimana) ? client.giorniSettimana : []);
    if (!days.length || count <= 0) return [];

    const wanted = new Set(days);
    const trainingServiceId = App._packageServiceId(client);
    const existing = App._packageAppointments(client, false).filter(a => a.serviceId === trainingServiceId);
    const usedDates = new Set(existing.map(a => a.date));
    const lastPlanned = existing[existing.length - 1]?.date;
    const today = App._dateStr(new Date());
    const startSeed = options.fromDate || [today, client.packageStart, lastPlanned].filter(Boolean).sort().pop();
    const cursor = App._parseDate(startSeed);
    if (!options.includeStart && usedDates.has(App._dateStr(cursor))) cursor.setDate(cursor.getDate() + 1);

    const out = [];
    for (let guard = 0; out.length < count && guard < 420; guard += 1) {
      const date = App._dateStr(cursor);
      if (wanted.has(App._weekdayName(date)) && !usedDates.has(date)) {
        out.push(date);
        usedDates.add(date);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  },

  openPackageOverview(clientId) {
    const client = State.getClients().find(c => c.id === clientId);
    if (!client) return;

    const isArchived = client.active === false;
    const storedArchivedStatus = String(client.statoAbbonamento || client.stato_abbonamento || '').trim();
    const archivedStatus = !storedArchivedStatus || (isArchived && storedArchivedStatus.toLowerCase() === 'attivo')
      ? 'Archiviato'
      : storedArchivedStatus;
    const readOnlyAttr = isArchived ? 'disabled' : '';
    const metrics = Services.getClientSessionMetrics(client);
    const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : [];
    const days = Array.isArray(client.giorniSettimana) ? client.giorniSettimana : [];
    const serviceId = App._packageServiceId(client);
    const service = serviceId ? Services.getService(serviceId) : null;
    const appointments = App._packageAppointments(client, true);
    const displayAppointments = [...appointments].sort((a, b) =>
      `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
    );
    const operators = State.getOperators().filter(o => o.active !== false);
    const suggested = App._suggestPackageDates(client, metrics.toSchedule).slice(0, 8);
    const hasTotal = metrics.total > 0;
    const today = App._dateStr(new Date());
    const planningDays = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'].map(g => `
      <label class="checkbox-label package-plan-day">
        <input type="checkbox" name="pkg-plan-day" value="${g}" ${days.includes(g) ? 'checked' : ''} onchange="App._limitPackagePlanDays('${client.id}', this)">
        <span>${g.slice(0, 3)}</span>
      </label>`).join('');

    const rows = displayAppointments.length ? displayAppointments.map(a => {
      const svc = Services.getService(a.serviceId);
      const usesPackage = Services.serviceUsesPackageSessions(a.serviceId);
      const isCurrentCycle = usesPackage && Services.appointmentInCurrentPackageCycle(a, client);
      const cycleLabel = usesPackage ? (isCurrentCycle ? 'Ciclo corrente' : 'Storico') : 'Servizio extra';
      const operatorOptions = State.getOperators()
        .filter(op => op.active !== false)
        .map(op => `<option value="${op.id}" ${a.operatorId === op.id ? 'selected' : ''}>${op.nome} ${op.cognome}</option>`)
        .join('');
      const statusOptions = Object.entries(CONFIG.STATUS).map(([key, value]) =>
        `<option value="${key}" ${a.status === key ? 'selected' : ''}>${value.label}</option>`
      ).join('');
      return `
        <tr>
          <td>
            <input id="pkg-date-${a.id}" class="form-input package-date-input" type="date" value="${a.date}" ${readOnlyAttr}>
          </td>
          <td>
            <div class="time-edit-cell">
              <input id="pkg-time-${a.id}" class="form-input package-time-input" type="time" value="${a.startTime}" step="900" ${readOnlyAttr}>
            </div>
          </td>
          <td><span class="role-tag">${svc?.label || a.serviceId}</span></td>
          <td>
            <select id="pkg-operator-${a.id}" class="form-input package-operator-input" ${readOnlyAttr}>
              <option value="">—</option>
              ${operatorOptions}
            </select>
          </td>
          <td>
            <select id="pkg-status-${a.id}" class="form-input package-status-input" ${readOnlyAttr}>
              ${statusOptions}
            </select>
          </td>
          <td><span class="role-tag">${cycleLabel}</span></td>
          <td>
            ${isArchived ? '<span class="client-history-readonly">Solo storico</span>' : `<div class="package-row-actions">
              <button class="btn-icon-sm" title="Salva questa riga" onclick="App._updatePackageAppointmentRow('${a.id}')">✓</button>
              <button class="btn-icon-sm" title="Modifica completa" onclick="UI.closeModal();App._renderAppointmentModal('${a.id}','${a.date}')">✏️</button>
              <button class="btn-icon-sm danger" title="Elimina appuntamento" onclick="App._deletePackageAppointment('${a.id}')">🗑</button>
            </div>`}
          </td>
        </tr>`;
    }).join('') : `
        <tr><td colspan="7" class="text-muted">Nessun appuntamento collegato al pacchetto.</td></tr>`;

    const html = `
      <div class="modal-header">
        <div>
          <h3>Quadro pacchetto</h3>
          <p class="modal-subtitle">${client.nome} ${client.cognome}${isArchived ? ` · Storico: ${archivedStatus}` : ''}</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body package-overview">
        <div class="package-overview-head">
          <div>
            <div class="eyebrow">Pacchetto acquistato</div>
            <div class="package-overview-title">${pkgs.join(' + ') || 'Nessun pacchetto impostato'}</div>
            <div class="package-overview-sub">
              ${service ? service.label : 'servizio non impostato'} · ${client.packageFrequency || 'frequenza non impostata'} · ciclo dal ${App._fmtLongDate(metrics.cycleStart)}
            </div>
          </div>
          ${isArchived
            ? '<span class="client-history-badge">Storico in sola lettura</span>'
            : `<button class="btn" onclick="UI.closeModal();App.openEditPackage('${client.id}')">Modifica pacchetto</button>`}
        </div>

        <div class="package-overview-kpis">
          <div class="${hasTotal ? '' : 'warn'}"><span>Acquistate nel ciclo</span><strong>${hasTotal ? metrics.total : 'Da impostare'}</strong></div>
          <div><span>Fatte nel ciclo</span><strong>${metrics.completed}</strong></div>
          <div><span>Future del ciclo</span><strong>${metrics.scheduled}</strong></div>
          <div><span>Residue</span><strong>${hasTotal ? metrics.remaining : '—'}</strong></div>
          <div class="${metrics.toSchedule ? 'warn' : ''}"><span>Da programmare</span><strong>${metrics.toSchedule}</strong></div>
          <div><span>Fatte complessive</span><strong>${metrics.lifetimeCompleted}</strong></div>
          <div><span>Storico precedente</span><strong>${metrics.previousCompleted}</strong></div>
          <div class="${String(client.statoPagamento || '').toLowerCase().includes('pagato') ? '' : 'warn'}"><span>Pagamento</span><strong>${client.statoPagamento || 'Da verificare'}</strong></div>
        </div>

        ${!isArchived && metrics.needsCycleSetup ? `
          <section class="package-panel" style="border-color:#F59E0B;background:#FFFBEB">
            <h4>Ciclo corrente rilevato</h4>
            <p>Il vecchio sistema sommava i rinnovi. Ho separato ${metrics.total} lezioni del ciclo corrente dalle ${metrics.previousCompleted} già svolte in precedenza.</p>
            <button class="btn-primary" onclick="App._confirmCurrentPackageCycle('${client.id}')">Conferma separazione</button>
          </section>` : ''}

        <div class="package-overview-grid">
          <section class="package-panel">
            <h4>Giornate acquistate</h4>
            <div class="day-chip-row">
              ${days.length ? days.map(day => `<span>${day}</span>`).join('') : '<em>Nessun giorno impostato</em>'}
            </div>
            <p>Queste sono le giornate reali usate per generare le prossime sedute. L'acquisizione resta nello storico iniziale.</p>
          </section>

          ${isArchived ? '' : `<section class="package-panel">
            <h4>Prossime date suggerite</h4>
            <div class="suggested-date-row">
              ${hasTotal
                ? (suggested.length ? suggested.map(date => `<span>${App._fmtLongDate(date)}</span>`).join('') : '<em>Nessuna data da generare</em>')
                : '<em>Imposta prima il numero di sessioni totali del pacchetto.</em>'}
            </div>
            <div class="package-generate-row">
              <label>Ora</label>
              <input id="pkg-gen-time" class="form-input" type="time" value="09:00" step="900">
              <button class="btn-primary" ${hasTotal ? '' : 'disabled'} onclick="App._generateMissingPackageAppointments('${client.id}')">Genera mancanti</button>
            </div>
          </section>`}
        </div>

        ${isArchived ? `
        <section class="package-panel client-history-notice">
          <h4>Cliente nello storico</h4>
          <p>Anagrafica, lezioni e conteggi sono conservati. Non è possibile programmare o modificare sedute finché il cliente non viene riattivato.</p>
        </section>` : `<section class="package-panel package-reschedule-panel">
          <h4>Cambio giorni/orari futuri</h4>
          <div class="package-reschedule-grid">
            <div>
              <label>Nuovi giorni reali</label>
              <div class="checkbox-grid package-plan-grid">
                ${planningDays}
              </div>
            </div>
            <div class="package-reschedule-fields">
              <div class="form-group">
                <label>Orario</label>
                <input id="pkg-plan-time" class="form-input" type="time" value="${appointments.find(a => a.serviceId === serviceId && a.date >= today)?.startTime || '09:00'}" step="900">
              </div>
              <div class="form-group">
                <label>PT</label>
                <select id="pkg-plan-operator" class="form-input">
                  <option value="">Mantieni/auto</option>
                  ${operators.map(op => `<option value="${op.id}" ${op.id === (appointments.find(a => a.serviceId === serviceId && a.date >= today)?.operatorId || client.ptAssegnato) ? 'selected' : ''}>${op.nome} ${op.cognome}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Data partenza pacchetto</label>
                <input id="pkg-plan-from" class="form-input" type="date" value="${today}">
              </div>
              <div class="form-group">
                <label>Nuove sedute rinnovo</label>
                <input id="pkg-renew-count" class="form-input" type="number" min="1" step="1" value="${hasTotal ? metrics.total : 8}">
              </div>
              <div class="form-group">
                <label>Pagamento rinnovo</label>
                <select id="pkg-renew-payment" class="form-input">
                  <option value="Pagato" ${client.statoPagamento === 'Pagato' ? 'selected' : ''}>Pagato</option>
                  <option value="Da pagare" ${client.statoPagamento === 'Da pagare' || !client.statoPagamento ? 'selected' : ''}>Da pagare</option>
                  <option value="Acconto" ${client.statoPagamento === 'Acconto' ? 'selected' : ''}>Acconto</option>
                </select>
              </div>
            </div>
          </div>
          <div class="package-reschedule-actions">
            <button class="btn" onclick="App._savePackageSchedule('${client.id}')">Salva solo giorni</button>
            <button class="btn-primary" ${hasTotal ? '' : 'disabled'} onclick="App._regenerateFuturePackageAppointments('${client.id}')">Rigenera future</button>
            <button class="btn-primary" onclick="App._renewPackageAppointments('${client.id}')">Rinnova pacchetto</button>
          </div>
          <p>Usalo quando il cliente cambia disponibilita: non modifica l'acquisizione originale, aggiorna la pianificazione reale e ricrea solo le sedute future non svolte. Se il pacchetto e finito, usa Rinnova pacchetto per aggiungere nuove sedute e generarle da capo.</p>
        </section>`}

        <section class="package-panel">
          <h4>Appuntamenti collegati</h4>
          <table class="package-timeline-table">
            <thead><tr><th>Data</th><th>Ora</th><th>Servizio</th><th>PT</th><th>Stato</th><th>Ciclo</th><th>Azioni</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      </div>
      <div class="modal-footer">
        ${isArchived ? `
          <button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button>
          <button class="btn-primary" onclick="Clients.reactivate('${client.id}')">Riattiva cliente</button>
        ` : `
          <button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button>
          <button class="btn btn-archive" onclick="Clients.markNotRenewing('${client.id}')">Non rinnova</button>
          <button class="btn-primary" onclick="App._renewPackageAppointments('${client.id}')">Rinnova pacchetto</button>
          <button class="btn-primary" onclick="UI.closeModal();App.openNewAppointment(null,'${client.id}')">Nuovo appuntamento</button>
        `}
      </div>
    `;
    UI.openModal(html);
  },

  _selectedPackagePlanDays() {
    return [...document.querySelectorAll('input[name="pkg-plan-day"]:checked')].map(el => el.value);
  },

  _limitPackagePlanDays(clientId, changed) {
    const client = State.getClients().find(c => c.id === clientId);
    const max = App._frequencyMaxDaysValue(client?.packageFrequency || '');
    if (!max) return true;
    const checked = [...document.querySelectorAll('input[name="pkg-plan-day"]:checked')];
    if (checked.length <= max) return true;
    if (changed) changed.checked = false;
    else checked.slice(max).forEach(input => { input.checked = false; });
    UI.showToast(`La frequenza del pacchetto prevede massimo ${max} giorni a settimana`, 'error');
    return false;
  },

  _updateClientPackageDays(clientId, days) {
    return App._updateClientPackagePlan(clientId, { days });
  },

  _updateClientPackagePlan(clientId, { days = null, packageStart = '', ptAssegnato = undefined } = {}) {
    if (!App.guardPortalEdit('client', clientId)) return null;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx < 0) return null;
    const patch = {};
    if (Array.isArray(days)) patch.giorniSettimana = days;
    if (packageStart) patch.packageStart = packageStart;
    if (ptAssegnato !== undefined) patch.ptAssegnato = ptAssegnato || clients[idx].ptAssegnato || null;
    clients[idx] = { ...clients[idx], ...patch };
    State.saveClients(clients);
    SupabaseSync.pushClient(clients[idx]);
    if (CONFIG.SHEETS.enabled) Sheets.pushClient(clients[idx]);
    return clients[idx];
  },

  async _confirmCurrentPackageCycle(clientId) {
    if (!App.guardPortalEdit('client', clientId)) return;
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx < 0) return;
    const client = clients[idx];
    const metrics = Services.getClientSessionMetrics(client);
    const cycleStart = metrics.cycleStart || client.packageStart || App._dateStr(new Date());
    const confirmed = confirm(
      `Confermi il ciclo corrente di ${client.nome} ${client.cognome}?\n\n` +
      `${metrics.total} lezioni acquistate nel ciclo dal ${cycleStart}.\n` +
      `${metrics.completed} fatte nel ciclo, ${metrics.remaining} residue.\n` +
      `${metrics.previousCompleted} lezioni precedenti resteranno nello storico separato.\n\n` +
      'Se il numero acquistato non è corretto, annulla e usa Modifica pacchetto.'
    );
    if (!confirmed) return;

    const updated = {
      ...client,
      packageCycleStart: cycleStart,
      sessionsTotal: metrics.total,
      sessionsRemaining: metrics.remaining,
    };
    const result = await SupabaseSync.pushClient(updated);
    if (result?.error) {
      UI.showToast('Ciclo non salvato: riprova', 'error');
      return;
    }
    clients[idx] = updated;
    State.saveClients(clients);
    Calendar.render();
    UI.showToast('Ciclo corrente separato dallo storico', 'success');
    App.openPackageOverview(clientId);
  },

  _packageAvailabilitySuggestions(appt, limit = 8) {
    const svc = Services.getService(appt.serviceId);
    if (!svc || !appt.date) return [];

    const start = Services.timeToMin(CONFIG.workHours.start);
    const end = Services.timeToMin(CONFIG.workHours.end);
    const duration = Number(appt.durationMin || svc.durationMin || 60);
    const buffer = Number(appt.bufferMin ?? svc.bufferMin ?? CONFIG.defaultBufferMin ?? 0);
    const operators = State.getOperators().filter(o => o.active !== false);
    const suggestions = [];
    const seen = new Set();

    for (let t = start; t + duration <= end && suggestions.length < limit; t += 15) {
      const time = Services.minToTime(t);
      const candidates = appt.operatorId
        ? [appt.operatorId, ...operators.map(o => o.id).filter(id => id !== appt.operatorId)]
        : [null, ...operators.map(o => o.id)];

      for (const operatorId of candidates) {
        const draft = { ...appt, startTime: time, operatorId };
        const validation = Services.canBookAppointment(draft, { strictPackageDays: false });
        if (!validation.ok) continue;

        const key = `${time}-${operatorId || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const opName = operatorId ? Services.operatorFullName(operatorId) : 'senza PT assegnato';
        const roomInfo = svc.room
          ? ` · ${CONFIG.ROOMS[svc.room]?.label || 'Sala'} ok`
          : '';
        suggestions.push(`${time} con ${opName}${roomInfo}`);
        break;
      }
    }

    return suggestions;
  },

  _showPackageAvailabilityError(title, appt, errors) {
    const suggestions = App._packageAvailabilitySuggestions(appt);
    const detail = [
      title,
      '',
      ...errors.map(e => `- ${e}`),
      '',
      suggestions.length
        ? 'Orari disponibili nella stessa data:\n' + suggestions.map(s => `- ${s}`).join('\n')
        : 'Non ho trovato orari disponibili nella stessa data con sala/cliente/PT compatibili.'
    ].join('\n');

    UI.showToast(errors[0] || 'Slot non disponibile', 'error');
    alert(detail);
  },

  _plannedPackageFutureChanges(clientId, fromDate, time, operatorId, serviceId) {
    return State.getAppointments()
      .filter(a =>
        a.status !== 'annullato' &&
        a.status !== 'fatto' &&
        a.date >= fromDate &&
        a.serviceId === serviceId &&
        Array.isArray(a.clientIds) &&
        a.clientIds.includes(clientId)
      )
      .map(appt => {
        const patch = {};
        if (time) patch.startTime = time;
        if (operatorId) patch.operatorId = operatorId;
        return { appt, patch, next: { ...appt, ...patch } };
      })
      .filter(change => Object.keys(change.patch).length);
  },

  _savePackageSchedule(clientId) {
    if (!App.guardPortalEdit('client', clientId)) return;
    if (!App._limitPackagePlanDays(clientId)) return;
    const currentClient = State.getClients().find(c => c.id === clientId);
    if (!currentClient) return;
    const days = App._selectedPackagePlanDays();
    const fromDate = document.getElementById('pkg-plan-from')?.value || App._dateStr(new Date());
    const time = document.getElementById('pkg-plan-time')?.value || '';
    const operatorId = App.isPortalPtMode() && App.portalOperatorId()
      ? App.portalOperatorId()
      : (document.getElementById('pkg-plan-operator')?.value || '');
    if (!days.length) {
      UI.showToast('Seleziona almeno un giorno reale', 'error');
      return;
    }
    const serviceId = App._packageServiceId(currentClient);
    const changes = App._plannedPackageFutureChanges(clientId, fromDate, time, operatorId, serviceId);
    const conflicts = changes
      .map(change => ({ ...change, validation: Services.canBookAppointment(change.next, { strictPackageDays: false }) }))
      .filter(change => !change.validation.ok);

    if (conflicts.length) {
      const first = conflicts[0];
      App._showPackageAvailabilityError(
        `Cambio non salvato: ${conflicts.length} sedute future hanno conflitti.`,
        first.next,
        first.validation.errors
      );
      App.openPackageOverview(clientId);
      return;
    }

    const saved = App._updateClientPackagePlan(clientId, {
      days,
      packageStart: fromDate,
      ...(operatorId ? { ptAssegnato: operatorId } : {})
    });
    if (!saved) return;
    const touched = changes
      .map(change => Services.updateAppointment(change.appt.id, change.patch))
      .filter(Boolean);
    touched.forEach(appt => SupabaseSync.pushAppointment(appt));
    if (CONFIG.SHEETS.enabled) touched.forEach(appt => Sheets.pushAppointment(appt));
    Calendar.render();
    UI.showToast(touched.length ? `Data pacchetto e ${touched.length} sedute future aggiornate` : 'Data e giorni reali del pacchetto salvati', 'success');
    App.openPackageOverview(clientId);
  },

  async _regenerateFuturePackageAppointments(clientId) {
    if (!App.guardPortalEdit('client', clientId)) return;
    if (!App._limitPackagePlanDays(clientId)) return;
    const currentClient = State.getClients().find(c => c.id === clientId);
    if (!currentClient) return;

    const days = App._selectedPackagePlanDays();
    const fromDate = document.getElementById('pkg-plan-from')?.value || App._dateStr(new Date());
    const time = document.getElementById('pkg-plan-time')?.value || '09:00';
    const selectedOperator = App.isPortalPtMode() && App.portalOperatorId()
      ? App.portalOperatorId()
      : (document.getElementById('pkg-plan-operator')?.value || null);
    if (!days.length) {
      UI.showToast('Seleziona almeno un giorno reale', 'error');
      return;
    }

    const serviceId = App._packageServiceId(currentClient);
    const service = serviceId ? Services.getService(serviceId) : null;
    if (!service) {
      UI.showToast('Pacchetto PT non impostato per questo cliente', 'error');
      return;
    }

    const allAppointments = State.getAppointments();
    const futureToReplace = allAppointments.filter(a =>
      a.status !== 'annullato' &&
      a.status !== 'fatto' &&
      a.date >= fromDate &&
      a.serviceId === serviceId &&
      Array.isArray(a.clientIds) &&
      a.clientIds.includes(clientId)
    );
    const fallbackOperator = selectedOperator ||
      futureToReplace[0]?.operatorId ||
      [...allAppointments].reverse().find(a => a.serviceId === serviceId && (a.clientIds || []).includes(clientId))?.operatorId ||
      currentClient.ptAssegnato ||
      null;
    const fallbackOperatorData = fallbackOperator ? Services.getOperator(fallbackOperator) : null;
    const fallbackOperatorLabel = fallbackOperatorData ? `${fallbackOperatorData.nome} ${fallbackOperatorData.cognome}` : 'senza PT assegnato';

    const confirmed = confirm(
      `Rigenero le sedute future di ${currentClient.nome} ${currentClient.cognome} da ${fromDate}.\n` +
      `Le sedute future non svolte (${futureToReplace.length}) saranno sostituite con: ${days.join(', ')} alle ${time}, PT ${fallbackOperatorLabel}.\n\n` +
      'La data partenza pacchetto verra aggiornata.\n' +
      'Le sedute gia fatte non vengono toccate.'
    );
    if (!confirmed) return;

    const backupClients = State.getClients();
    const updatedClient = App._updateClientPackagePlan(clientId, {
      days,
      packageStart: fromDate,
      ptAssegnato: fallbackOperator
    });
    if (!updatedClient) return;
    const backupAppointments = State.getAppointments();
    const futureIds = new Set(futureToReplace.map(a => a.id));
    State.saveAppointments(backupAppointments.filter(a => !futureIds.has(a.id)));

    const metricsAfterRemoval = Services.getClientSessionMetrics(updatedClient);
    const missing = metricsAfterRemoval.toSchedule;
    if (missing <= 0) {
      await Promise.all(futureToReplace.map(a => SupabaseSync.deleteAppointment(a.id)));
      Calendar.render();
      UI.showToast('Pianificazione aggiornata: nessuna seduta futura da creare', 'success');
      App.openPackageOverview(clientId);
      return;
    }

    const dates = App._suggestPackageDates(updatedClient, missing * 8, { days, fromDate, includeStart: true });
    const created = [];
    const skipped = [];

    dates.some(date => {
      if (created.length >= missing) return true;
      const draft = {
        serviceId,
        clientIds: [clientId],
        operatorId: fallbackOperator,
        date,
        startTime: time,
        durationMin: service.durationMin || 60,
        bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
        status: 'prenotato',
        notes: App._withPackageCycle(
          `Rigenerata per cambio giorni da ${fromDate}`,
          Services.getPackageCycleContext(updatedClient).start
        ),
      };
      const validation = Services.canBookAppointment(draft, { strictPackageDays: true });
      if (!validation.ok) {
        skipped.push(`${App._fmtLongDate(date)}: ${validation.errors[0]}`);
        return false;
      }
      created.push(Services.addAppointment(draft));
      return false;
    });

    if (!created.length && skipped.length) {
      State.saveAppointments(backupAppointments);
      State.saveClients(backupClients);
      SupabaseSync.pushClient(currentClient);
      UI.showToast('Cambio non applicato: tutte le date sono in conflitto', 'error');
      alert('Cambio giorni non applicato per conflitti:\n' + skipped.slice(0, 12).join('\n'));
      App.openPackageOverview(clientId);
      return;
    }

    await Promise.all([
      ...futureToReplace.map(a => SupabaseSync.deleteAppointment(a.id)),
      ...created.map(a => SupabaseSync.pushAppointment(a)),
    ]);
    if (CONFIG.SHEETS.enabled) created.forEach(a => Sheets.pushAppointment(a));
    Calendar.render();

    if (skipped.length) {
      UI.showToast(`${created.length} create, ${skipped.length} date saltate per conflitti`, 'info');
      alert('Date non generate per conflitto:\n' + skipped.slice(0, 12).join('\n'));
    } else {
      UI.showToast(`${created.length} sedute future rigenerate`, 'success');
    }
    App.openPackageOverview(clientId);
  },

  async _renewPackageAppointments(clientId) {
    if (!App.guardPortalEdit('client', clientId)) return;
    if (!App._limitPackagePlanDays(clientId)) return;
    const currentClient = State.getClients().find(c => c.id === clientId);
    if (!currentClient) return;

    const days = App._selectedPackagePlanDays();
    const fromDate = document.getElementById('pkg-plan-from')?.value || App._dateStr(new Date());
    const time = document.getElementById('pkg-plan-time')?.value || '09:00';
    const selectedOperator = App.isPortalPtMode() && App.portalOperatorId()
      ? App.portalOperatorId()
      : (document.getElementById('pkg-plan-operator')?.value || currentClient.ptAssegnato || null);
    const renewCount = parseInt(document.getElementById('pkg-renew-count')?.value || '0', 10);
    const paymentStatus = document.getElementById('pkg-renew-payment')?.value || currentClient.statoPagamento || 'Da pagare';
    if (!days.length) {
      UI.showToast('Seleziona almeno un giorno reale', 'error');
      return;
    }
    if (!Number.isFinite(renewCount) || renewCount <= 0) {
      UI.showToast('Inserisci il numero di nuove sedute del rinnovo', 'error');
      return;
    }

    const serviceId = App._packageServiceId(currentClient);
    const service = serviceId ? Services.getService(serviceId) : null;
    if (!service) {
      UI.showToast('Pacchetto PT non impostato per questo cliente', 'error');
      return;
    }

    const metrics = Services.getClientSessionMetrics(currentClient);
    const futureToCarry = State.getAppointments().filter(a =>
      a.status === 'prenotato' &&
      a.date >= fromDate &&
      a.serviceId === serviceId &&
      Array.isArray(a.clientIds) &&
      a.clientIds.includes(clientId)
    );
    const operatorData = selectedOperator ? Services.getOperator(selectedOperator) : null;
    const operatorLabel = operatorData ? `${operatorData.nome} ${operatorData.cognome}` : 'senza PT assegnato';
    const confirmed = confirm(
      `Rinnovo pacchetto di ${currentClient.nome} ${currentClient.cognome}.\n` +
      `Apro un nuovo ciclo di ${renewCount} sedute dal ${fromDate}: ${days.join(', ')} alle ${time}, PT ${operatorLabel}.\n` +
      `${futureToCarry.length} sedute già programmate da quella data saranno assegnate al nuovo ciclo; creerò solo quelle mancanti.\n` +
      `Pagamento rinnovo: ${paymentStatus}.\n` +
      `Il ciclo precedente (${metrics.completed} fatte su ${metrics.total}) resterà nello storico e non verrà sommato.`
    );
    if (!confirmed) return;

    const backupClients = State.getClients();
    const backupAppointments = State.getAppointments();
    const carriedAppointments = futureToCarry.map(appt => ({
      ...appt,
      notes: App._withPackageCycle(appt.notes, fromDate),
      updatedAt: Date.now(),
    }));
    const carriedById = new Map(carriedAppointments.map(appt => [appt.id, appt]));
    State.saveAppointments(backupAppointments.map(appt => carriedById.get(appt.id) || appt));
    const updatedClient = {
      ...currentClient,
      giorniSettimana: days,
      packageStart: fromDate,
      packageCycleStart: fromDate,
      ptAssegnato: selectedOperator,
      sessionsTotal: renewCount,
      sessionsRemaining: renewCount,
      active: true,
      statoAbbonamento: currentClient.statoAbbonamento || 'Attivo',
      statoPagamento: paymentStatus,
    };
    State.saveClients(backupClients.map(c => c.id === clientId ? updatedClient : c));

    const updatedMetrics = Services.getClientSessionMetrics(updatedClient);
    const missing = Math.max(0, updatedMetrics.toSchedule);
    if (!missing) {
      const syncResults = await Promise.all([
        SupabaseSync.pushClient(updatedClient),
        ...carriedAppointments.map(appt => SupabaseSync.pushAppointment(appt)),
      ]);
      if (syncResults.some(result => result?.error)) {
        State.saveClients(backupClients);
        State.saveAppointments(backupAppointments);
        UI.showToast('Rinnovo non salvato: errore di sincronizzazione', 'error');
        return;
      }
      if (CONFIG.SHEETS.enabled) await Sheets.pushClient(updatedClient);
      UI.showToast('Nuovo ciclo salvato: le sedute erano già programmate', 'success');
      App.openPackageOverview(clientId);
      return;
    }

    const dates = App._suggestPackageDates(updatedClient, missing * 8, { days, fromDate, includeStart: true });
    const created = [];
    const skipped = [];

    dates.some(date => {
      if (created.length >= missing) return true;
      const draft = {
        serviceId,
        clientIds: [clientId],
        operatorId: selectedOperator,
        date,
        startTime: time,
        durationMin: service.durationMin || 60,
        bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
        status: 'prenotato',
        notes: App._withPackageCycle(`Rinnovo pacchetto da ${fromDate} · Pagamento: ${paymentStatus}`, fromDate),
      };
      const validation = Services.canBookAppointment(draft, { strictPackageDays: true });
      if (!validation.ok) {
        skipped.push(`${App._fmtLongDate(date)}: ${validation.errors[0]}`);
        return false;
      }
      created.push(Services.addAppointment(draft));
      return false;
    });

    if (!created.length && !carriedAppointments.length) {
      State.saveClients(backupClients);
      State.saveAppointments(backupAppointments);
      UI.showToast('Rinnovo non applicato: tutte le date sono in conflitto', 'error');
      alert('Rinnovo non applicato per conflitti:\n' + skipped.slice(0, 12).join('\n'));
      App.openPackageOverview(clientId);
      return;
    }

    const renewSyncResults = await Promise.all([
      SupabaseSync.pushClient(updatedClient),
      ...carriedAppointments.map(appt => SupabaseSync.pushAppointment(appt)),
      ...created.map(appt => SupabaseSync.pushAppointment(appt)),
    ]);
    if (renewSyncResults.some(result => result?.error)) {
      UI.showToast('Rinnovo salvato solo in parte: verifica la sincronizzazione', 'error');
      return;
    }
    App._lastRenewedPackage = { clientId, appointmentIds: [...carriedAppointments, ...created].map(appt => appt.id) };
    if (CONFIG.SHEETS.enabled) {
      Sheets.pushClient(updatedClient);
      created.forEach(appt => Sheets.pushAppointment(appt));
    }
    Calendar.render();

    if (skipped.length) {
      UI.showToast(`Nuovo ciclo: ${carriedAppointments.length} mantenute, ${created.length} create, ${skipped.length} date saltate`, 'info');
      alert('Date non generate per conflitto:\n' + skipped.slice(0, 12).join('\n'));
    } else {
      UI.showToast(`Nuovo ciclo salvato: ${carriedAppointments.length} mantenute, ${created.length} create`, 'success');
    }
    App.openPackageOverview(clientId);
  },

  async _updatePackageAppointmentRow(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (!App.guardPortalEdit('appointment', appt)) return;
    const nextDate = document.getElementById(`pkg-date-${apptId}`)?.value;
    const nextTime = document.getElementById(`pkg-time-${apptId}`)?.value;
    const nextOperatorId = App.isPortalPtMode() && App.portalOperatorId()
      ? App.portalOperatorId()
      : (document.getElementById(`pkg-operator-${apptId}`)?.value || null);
    const nextStatus = document.getElementById(`pkg-status-${apptId}`)?.value;
    if (!appt || !nextDate || !nextTime || !nextStatus) return;
    if (appt.date === nextDate && appt.startTime === nextTime && (appt.operatorId || null) === nextOperatorId && appt.status === nextStatus) {
      UI.showToast('Riga gia aggiornata', 'success');
      return;
    }

    const patch = { ...appt, date: nextDate, startTime: nextTime, operatorId: nextOperatorId, status: nextStatus };
    const validation = Services.canBookAppointment(patch);
    if (!validation.ok) {
      UI.showToast(validation.errors[0], 'error');
      App._openConflictOverview(patch, validation.errors, { returnPackageClientId: appt.clientIds?.[0] || null });
      return;
    }

    const saved = Services.updateAppointment(apptId, { date: nextDate, startTime: nextTime, operatorId: nextOperatorId, status: nextStatus });
    if (appt.status !== saved.status) App._consumeClientSessions(saved);
    await SupabaseSync.pushAppointment(saved);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(saved);
    Calendar.render();
    UI.showToast('Appuntamento aggiornato', 'success');
    const clientId = saved?.clientIds?.[0];
    if (clientId) App.openPackageOverview(clientId);
  },

  async _deletePackageAppointment(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (!appt) return;
    if (!App.guardPortalEdit('appointment', appt)) return;
    const client = appt.clientIds?.map(Services.getClient).find(Boolean);
    const affectsCurrentCycle = appt.status === 'fatto' && client && Services.appointmentInCurrentPackageCycle(appt, client);
    const impact = affectsCurrentCycle
      ? '\n\nÈ una lezione fatta del ciclo corrente: il residuo aumenterà automaticamente di 1.'
      : '\n\nLo storico e il ciclo corrente verranno ricalcolati automaticamente.';
    if (!confirm(`Eliminare definitivamente questa seduta?${impact}`)) return;
    const result = await SupabaseSync.deleteAppointment(apptId);
    if (result?.error) {
      UI.showToast('Seduta non eliminata: errore di sincronizzazione', 'error');
      return;
    }
    Services.deleteAppointment(apptId);
    const balance = App._recalculateClientSessions
      ? await App._recalculateClientSessions(appt.clientIds || [])
      : { ok: true };
    Calendar.render();
    UI.showToast(balance?.ok === false ? 'Seduta eliminata, residuo da verificare' : 'Seduta eliminata e conteggi aggiornati', balance?.ok === false ? 'info' : 'success');
    const clientId = appt.clientIds?.[0];
    if (clientId) App.openPackageOverview(clientId);
  },

  async _generateMissingPackageAppointments(clientId) {
    if (!App.guardPortalEdit('client', clientId)) return;
    const client = State.getClients().find(c => c.id === clientId);
    if (!client) return;

    const serviceId = App._packageServiceId(client);
    const service = serviceId ? Services.getService(serviceId) : null;
    if (!service) {
      UI.showToast('Pacchetto PT non impostato per questo cliente', 'error');
      return;
    }

    const metrics = Services.getClientSessionMetrics(client);
    if (metrics.total <= 0) {
      UI.showToast('Imposta prima le sessioni totali del pacchetto', 'error');
      return;
    }
    const missing = metrics.toSchedule;
    if (missing <= 0) {
      UI.showToast('Non ci sono sedute mancanti da programmare', 'success');
      return;
    }

    const time = document.getElementById('pkg-gen-time')?.value || '09:00';
    const dates = App._suggestPackageDates(client, missing * 6);
    const created = [];
    const skipped = [];

    dates.some(date => {
      if (created.length >= missing) return true;
      const draft = {
        serviceId,
        clientIds: [client.id],
        operatorId: App.isPortalPtMode() && App.portalOperatorId()
          ? App.portalOperatorId()
          : (client.ptAssegnato || null),
        date,
        startTime: time,
        durationMin: service.durationMin || 60,
        bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
        status: 'prenotato',
        notes: App._withPackageCycle(
          'Programmazione generata dal quadro pacchetto',
          Services.getPackageCycleContext(client).start
        ),
      };
      const validation = Services.canBookAppointment(draft, { strictPackageDays: true });
      if (!validation.ok) {
        skipped.push(`${App._fmtLongDate(date)}: ${validation.errors[0]}`);
        return false;
      }
      created.push(Services.addAppointment(draft));
      return false;
    });

    if (created.length) {
      await Promise.all(created.map(appt => SupabaseSync.pushAppointment(appt)));
      if (CONFIG.SHEETS.enabled) created.forEach(appt => Sheets.pushAppointment(appt));
      Calendar.render();
    }

    if (skipped.length) {
      UI.showToast(`${created.length} create, ${skipped.length} date saltate per conflitti`, created.length ? 'info' : 'error');
      alert('Date non generate per conflitto:\n' + skipped.slice(0, 12).join('\n'));
      console.warn('[Pacchetto] Sedute saltate:', skipped);
    } else {
      UI.showToast(`${created.length} sedute programmate`, 'success');
    }
    App.openPackageOverview(client.id);
  },


  // ── GESTIONE DATI ────────────────────────────────────
  openDataManager() {
    const hasBackup = !!localStorage.getItem('neacea_backup');
    const lastSync  = localStorage.getItem('neacea_last_sync');
    const bkRaw     = localStorage.getItem('neacea_backup');
    const bkDate    = bkRaw ? new Date(JSON.parse(bkRaw).ts).toLocaleString('it-IT') : null;

    const html = `
      <div class="modal-header">
        <h3>💾 Gestione Dati</h3>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body">

        <div class="form-section-label">Backup e ripristino</div>

        <div class="data-action-row">
          <div class="data-action-info">
            <div class="data-action-title">⬇ Esporta dati</div>
            <div class="data-action-sub">Scarica un file JSON con tutti i tuoi appuntamenti, clienti e staff</div>
          </div>
          <button class="act-btn primary" onclick="State.exportData();UI.showToast('File scaricato','success')">Esporta JSON</button>
        </div>

        <div class="data-action-row">
          <div class="data-action-info">
            <div class="data-action-title">⬆ Importa dati</div>
            <div class="data-action-sub">Carica un file JSON precedentemente esportato</div>
          </div>
          <label class="act-btn primary" style="cursor:pointer">
            Importa JSON
            <input type="file" accept=".json" style="display:none" onchange="App._importFile(this)">
          </label>
        </div>

        <div class="data-action-row" style="border-color:#2563EB;background:rgba(37,99,235,.06)">
          <div class="data-action-info">
            <div class="data-action-title">⇧ Porta il locale su Supabase</div>
            <div class="data-action-sub">Invia a Supabase i dati presenti in questo browser prima di rileggerli dal database</div>
          </div>
          <button class="act-btn primary" onclick="App.syncLocalToSupabase({ silent:false, refresh:true })">Sincronizza ora</button>
        </div>

        ${hasBackup ? `
        <div class="data-action-row" style="border-color:var(--green);background:var(--green-pale)">
          <div class="data-action-info">
            <div class="data-action-title" style="color:var(--green)">↩ Ripristina backup</div>
            <div class="data-action-sub">Dati salvati il ${bkDate} — prima dell'ultimo reset</div>
          </div>
          <button class="act-btn primary" onclick="App._restoreBackup()">Ripristina</button>
        </div>` : ''}

        <div class="form-section-label" style="margin-top:20px">Reset</div>

        <div class="data-action-row" style="border-color:var(--gold)">
          <div class="data-action-info">
            <div class="data-action-title">🔄 Torna ai dati demo</div>
            <div class="data-action-sub">Sostituisce i dati attuali con quelli demo — salva automaticamente un backup prima</div>
          </div>
          <button class="act-btn gold" onclick="App._resetDemo()">Reset demo</button>
        </div>

        <div class="data-action-row" style="border-color:var(--red)">
          <div class="data-action-info">
            <div class="data-action-title">🗑 Reset completo</div>
            <div class="data-action-sub">Cancella tutto — usa solo se vuoi ripartire da zero</div>
          </div>
          <button class="act-btn del" onclick="App._resetHard()">Reset totale</button>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button>
      </div>
    `;
    UI.openModal(html);
  },

  async _importFile(input) {
    const file = input.files[0];
    if (!file) return;
    State.importData(file).then(async res => {
      await App.syncLocalToSupabase({ silent: true, refresh: false });
      UI.closeModal();
      Calendar.render();
      UI.showToast(`Importati e caricati su Supabase: ${res.appointments} appuntamenti, ${res.clients} clienti, ${res.operators} staff`, 'success');
    }).catch(err => UI.showToast('Errore importazione: ' + err.message, 'error'));
  },

  _restoreBackup() {
    if (!confirm('Ripristinare il backup? I dati attuali verranno sovrascritti.')) return;
    if (State.restoreBackup()) {
      UI.closeModal(); Calendar.render();
      UI.showToast('Backup ripristinato', 'success');
    } else {
      UI.showToast('Nessun backup disponibile', 'error');
    }
  },

  _resetDemo() {
    if (!confirm('Tornare ai dati demo? I dati attuali saranno salvati come backup.')) return;
    State.reset();
    UI.closeModal(); Calendar.render();
    UI.showToast('Dati demo ripristinati — backup salvato automaticamente', 'success');
  },

  _resetHard() {
    if (!confirm('ATTENZIONE: questa operazione cancella TUTTI i dati senza backup.\nSei sicuro?')) return;
    if (!confirm('Ultima conferma — questa azione è irreversibile.')) return;
    State.resetHard();
    UI.closeModal(); Calendar.render();
    UI.showToast('Reset completo eseguito', 'success');
  },

  async refreshFromSupabase({ silent = true, force = false } = {}) {
    if (!force && window.PTAvailabilityOverview?.shouldPauseAutoRefresh?.()) return;
    try {
      await SupabaseSync.pullAll();
      Calendar.render();
      if (document.getElementById('view-clients')?.classList.contains('active')) Clients.render();
      if (!silent) UI.showToast('Calendario aggiornato da Supabase', 'success');
    } catch (err) {
      console.warn('[Supabase] refresh non riuscito:', err);
      if (!silent) UI.showToast('Aggiornamento Supabase non riuscito', 'error');
    }
  },

  async syncLocalToSupabase({ silent = true, refresh = false } = {}) {
    const snapshot = {
      operators: State.getOperators(),
      clients: State.getClients(),
      appointments: State.getAppointments(),
    };
    const total = snapshot.operators.length + snapshot.clients.length + snapshot.appointments.length;
    if (!total) return { operators: 0, clients: 0, appointments: 0, success: true, errors: [] };

    try {
      const res = await SupabaseSync.pushLocalSnapshot(snapshot);
      localStorage.setItem('neacea_last_push_to_supabase', new Date().toISOString());
      if (res.errors?.length) {
        console.warn('[Supabase] alcune righe locali non sono state caricate:', res.errors);
        if (!silent) UI.showToast(`${res.errors.length} elementi locali non caricati su Supabase`, 'error');
      } else if (!silent) {
        UI.showToast(`Locale caricato su Supabase: ${res.appointments} appuntamenti, ${res.clients} clienti, ${res.operators} staff`, 'success');
      }
      if (refresh) await App.refreshFromSupabase({ silent: true });
      return res;
    } catch (err) {
      console.warn('[Supabase] push locale non riuscito:', err);
      if (!silent) UI.showToast('Caricamento locale su Supabase non riuscito', 'error');
      return { success: false, errors: [{ label: 'syncLocalToSupabase', error: String(err?.message || err) }] };
    }
  },

  // ── INIT ─────────────────────────────────────────────
  async init() {
    State.init();
    await App.refreshFromSupabase({ silent: true, force: true });
    await App._initPortalPtMode();

    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); Calendar.switchView(el.dataset.view); });
    });

    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) UI.closeModal();
    });

    const params = new URLSearchParams(window.location.search);
    const allowedViews = App.isPortalPtMode()
      ? ['dashboard', 'day', 'week', 'clients']
      : ['dashboard', 'day', 'week', 'room', 'availability', 'clients', 'operators'];
    const initialView = allowedViews.includes(params.get('view'))
      ? params.get('view')
      : 'dashboard';
    Calendar.switchView(initialView);

    window.addEventListener('focus', () => App.refreshFromSupabase({ silent: true }));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) App.refreshFromSupabase({ silent: true });
    });
    setInterval(() => {
      if (!document.hidden) App.refreshFromSupabase({ silent: true });
    }, 30000);

    if (CONFIG.SHEETS.enabled) setTimeout(() => Sheets.fullSync(), 1500);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
