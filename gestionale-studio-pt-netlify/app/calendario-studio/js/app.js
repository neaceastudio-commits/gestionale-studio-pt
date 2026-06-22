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

  // ── APERTURA MODALI ──────────────────────────────────

  openNewAppointment(dateStr = null, clientId = null) {
    App._renderAppointmentModal(null, dateStr || Calendar.getCurrentDateStr(), clientId ? [clientId] : []);
  },
  openDetail(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },

  // ── MODAL APPUNTAMENTO ───────────────────────────────

  _renderAppointmentModal(apptId, defaultDate, preselectedClientIds = []) {
    const appt   = apptId ? State.getAppointments().find(a => a.id === apptId) : null;
    const isEdit = !!appt;
    const curSvcId = appt?.serviceId || 'pt11';
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
            <input type="time" id="appt-time" class="form-input" value="${appt?.startTime||'09:00'}" step="900" onchange="App._onSlotChange()">
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
          ${App._buildOperatorSection(curSvcId, appt?.operatorId||null, appt?.date||defaultDate, appt?.startTime||'09:00', appt?.durationMin||svc?.durationMin||60, apptId || null)}
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
    const compatible = Services.getCompatibleClients(serviceId);
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
    const ops = Services.getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin, excludeId);

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

    const validation = Services.canBookAppointment(tmpAppt);
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
        validEl.innerHTML = `<div class="val-ok">✓ Slot disponibile${roomInfo}</div>`;
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

  // ── SALVA APPUNTAMENTO ───────────────────────────────
  _saveAppointment(apptId) {
    const svcId   = document.getElementById('appt-service')?.value;
    const date    = document.getElementById('appt-date')?.value;
    const time    = document.getElementById('appt-time')?.value;
    const dur     = parseInt(document.getElementById('appt-duration')?.value) || 60;
    const opId    = document.getElementById('appt-operator')?.value || null;
    const status  = document.getElementById('appt-status')?.value || 'prenotato';
    const notes   = document.getElementById('appt-notes')?.value || '';
    const svc     = Services.getService(svcId);
    const clientEls = [...(document.getElementById('appt-clients')?.selectedOptions || [])];
    const clientIds = clientEls.map(el => el.value);

    if (!svcId || !date || !time) { UI.showToast('Compila tutti i campi obbligatori', 'error'); return; }
    if (!svc?.isBlock && clientIds.length === 0) { UI.showToast('Seleziona almeno un cliente', 'error'); return; }

    const apptData = {
      serviceId: svcId, clientIds, operatorId: opId,
      date, startTime: time, durationMin: dur,
      bufferMin: svc?.bufferMin ?? 10, status, notes,
    };

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

    const validation = sameSlot
      ? { ok: true, errors: [] }
      : Services.canBookAppointment({ ...apptData, id: apptId||null });
    if (!validation.ok) {
      UI.showToast(validation.errors[0], 'error');
      const ve = document.getElementById('slot-validation');
      if (ve) ve.innerHTML = `<div class="val-error">⚠ ${validation.errors.join(' · ')}</div>`;
      return;
    }

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
                <button class="btn-icon-sm" onclick="App._removeParticipant('${appt.id}','${id}')">✕</button>
              </div>`;
            }).join('')}
          </div>
          ${appt.clientIds.length < svc.maxClients ? `
            <div class="add-participant">
              <select id="add-part-select" class="form-input form-input-sm">
                <option value="">— aggiungi cliente —</option>
                ${clients.filter(c => !appt.clientIds.includes(c.id))
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

    const html = `
      <div class="modal-header" style="border-left:4px solid ${svc?.color||'#64748B'}">
        <div>
          <h3>${svc?.label} ${roomTag}</h3>
          <p class="modal-subtitle">${appt.date} · ${appt.startTime} · ${appt.durationMin}min</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body appt-detail-body">
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
        <button class="act-btn del" onclick="App._deleteAppt('${appt.id}')">🗑 Elimina</button>
        ${!isBlock?`
          <button class="act-btn primary" onclick="App._markDone('${appt.id}')">✓ Fatto</button>
          <button class="act-btn gold" onclick="App._markNoShow('${appt.id}')">No-show</button>
        `:''}
        <button class="btn-primary" onclick="App._renderAppointmentModal('${appt.id}','${appt.date}')">Modifica</button>
      </div>
    `;
    UI.openModal(html);
  },

  _addParticipant(apptId) {
    const sel = document.getElementById('add-part-select');
    if (!sel?.value) return;
    const result = Services.addCircuitParticipant(apptId, sel.value);
    if (result?.ok === false) { UI.showToast(result.error, 'error'); return; }
    UI.showToast('Partecipante aggiunto', 'success');
    Calendar.render();
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },
  _removeParticipant(apptId, clientId) {
    Services.removeCircuitParticipant(apptId, clientId);
    UI.showToast('Partecipante rimosso', 'success');
    Calendar.render();
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },
  _markDone(apptId) {
    const before = State.getAppointments().find(a => a.id === apptId);
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
    const nsAppt = Services.updateAppointment(apptId, { status: 'noshow' });
    UI.closeModal(); UI.showToast('Segnato come no-show', 'success'); Calendar.render();
    SupabaseSync.pushAppointment(nsAppt);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(nsAppt);
  },
  _deleteAppt(apptId) {
    if (!confirm('Eliminare questo appuntamento?')) return;
    Services.deleteAppointment(apptId);
    SupabaseSync.deleteAppointment(apptId);
    UI.closeModal(); UI.showToast('Appuntamento eliminato', 'success'); Calendar.render();
  },

  // ── MODAL CLIENTE ────────────────────────────────────
  openNewClient()        { App._renderClientModal(null); },
  openEditClient(cid)    { App._renderClientModal(cid); },
  openEditPackage(cid)   { App._renderClientModal(cid, true); },

  _renderClientModal(clientId, packageOnly = false) {
    const client = clientId ? State.getClients().find(c => c.id === clientId) : null;
    const isEdit = !!client;
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
            <input type="number" id="cl-sessions-total" class="form-input" min="1" value="${client?.sessionsTotal||''}" onchange="App._limitClientDays()">
          </div>
          <div class="form-group">
            <label>Sessioni residue automatiche</label>
            <div class="computed-field">
              ${client ? (currentMetrics?.total ? `${currentMetrics.remaining} residue · ${currentMetrics.completed} fatte` : 'Imposta le sessioni totali') : 'Calcolate dopo il salvataggio'}
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
    const completedSessions = currentClient ? Services.getClientSessionMetrics({ ...currentClient, sessionsTotal: sessTotal }).completed : 0;
    const sessRem = sessTotal > 0 ? Math.max(0, sessTotal - completedSessions) : 0;
    const data = {
      nome, cognome, email, telefono, nascita, codiceFiscale, documento, indirizzo, contattoEmergenza,
      packageTypes: pkgs,
      packageFrequency: frequency,
      giorniSettimana,
      sessionsTotal: sessTotal, sessionsRemaining: sessRem,
      notes, active: true,
    };

    let saved;
    if (clientId) {
      const idx = clients.findIndex(c=>c.id===clientId);
      if (idx!==-1) { clients[idx] = { ...clients[idx], ...data }; saved = clients[idx]; }
    } else {
      const newC = { id: State.genId('c'), ...data, packageStart: new Date().toISOString().slice(0,10) };
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

  _packageAppointments(client, includeNutrition = true) {
    const trainingServiceId = App._packageServiceId(client);
    return State.getAppointments()
      .filter(a => a.status !== 'annullato')
      .filter(a => Array.isArray(a.clientIds) && a.clientIds.includes(client.id))
      .filter(a => {
        if (trainingServiceId && a.serviceId === trainingServiceId) return true;
        return includeNutrition && (a.serviceId === 'nutrizione' || a.serviceId === 'check');
      })
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

    const metrics = Services.getClientSessionMetrics(client);
    const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : [];
    const days = Array.isArray(client.giorniSettimana) ? client.giorniSettimana : [];
    const serviceId = App._packageServiceId(client);
    const service = serviceId ? Services.getService(serviceId) : null;
    const appointments = App._packageAppointments(client, true);
    const suggested = App._suggestPackageDates(client, metrics.toSchedule).slice(0, 8);
    const hasTotal = metrics.total > 0;
    const today = App._dateStr(new Date());
    const planningDays = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'].map(g => `
      <label class="checkbox-label package-plan-day">
        <input type="checkbox" name="pkg-plan-day" value="${g}" ${days.includes(g) ? 'checked' : ''} onchange="App._limitPackagePlanDays('${client.id}', this)">
        <span>${g.slice(0, 3)}</span>
      </label>`).join('');

    const rows = appointments.length ? appointments.map(a => {
      const svc = Services.getService(a.serviceId);
      const op = Services.getOperator(a.operatorId);
      const statusOptions = Object.entries(CONFIG.STATUS).map(([key, value]) =>
        `<option value="${key}" ${a.status === key ? 'selected' : ''}>${value.label}</option>`
      ).join('');
      return `
        <tr>
          <td>
            <input id="pkg-date-${a.id}" class="form-input package-date-input" type="date" value="${a.date}">
          </td>
          <td>
            <div class="time-edit-cell">
              <input id="pkg-time-${a.id}" class="form-input package-time-input" type="time" value="${a.startTime}" step="900">
            </div>
          </td>
          <td><span class="role-tag">${svc?.label || a.serviceId}</span></td>
          <td>${op ? `${op.nome} ${op.cognome}` : '—'}</td>
          <td>
            <select id="pkg-status-${a.id}" class="form-input package-status-input">
              ${statusOptions}
            </select>
          </td>
          <td>
            <div class="package-row-actions">
              <button class="btn-icon-sm" title="Salva questa riga" onclick="App._updatePackageAppointmentRow('${a.id}')">✓</button>
              <button class="btn-icon-sm" title="Modifica completa" onclick="UI.closeModal();App._renderAppointmentModal('${a.id}','${a.date}')">✏️</button>
              <button class="btn-icon-sm danger" title="Elimina appuntamento" onclick="App._deletePackageAppointment('${a.id}')">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('') : `
        <tr><td colspan="6" class="text-muted">Nessun appuntamento collegato al pacchetto.</td></tr>`;

    const html = `
      <div class="modal-header">
        <div>
          <h3>Quadro pacchetto</h3>
          <p class="modal-subtitle">${client.nome} ${client.cognome}</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body package-overview">
        <div class="package-overview-head">
          <div>
            <div class="eyebrow">Pacchetto acquistato</div>
            <div class="package-overview-title">${pkgs.join(' + ') || 'Nessun pacchetto impostato'}</div>
            <div class="package-overview-sub">
              ${service ? service.label : 'servizio non impostato'} · ${client.packageFrequency || 'frequenza non impostata'}
            </div>
          </div>
          <button class="btn" onclick="UI.closeModal();App.openEditPackage('${client.id}')">Modifica pacchetto</button>
        </div>

        <div class="package-overview-kpis">
          <div class="${hasTotal ? '' : 'warn'}"><span>Totali</span><strong>${hasTotal ? metrics.total : 'Da impostare'}</strong></div>
          <div><span>Fatte</span><strong>${metrics.completed}</strong></div>
          <div><span>Future</span><strong>${metrics.scheduled}</strong></div>
          <div><span>Residue</span><strong>${hasTotal ? metrics.remaining : '—'}</strong></div>
          <div class="${metrics.toSchedule ? 'warn' : ''}"><span>Da programmare</span><strong>${metrics.toSchedule}</strong></div>
          <div class="${metrics.overPlanned ? 'warn' : ''}"><span>Oltre pacchetto</span><strong>${metrics.overPlanned || 0}</strong></div>
        </div>

        <div class="package-overview-grid">
          <section class="package-panel">
            <h4>Giornate acquistate</h4>
            <div class="day-chip-row">
              ${days.length ? days.map(day => `<span>${day}</span>`).join('') : '<em>Nessun giorno impostato</em>'}
            </div>
            <p>Queste sono le giornate reali usate per generare le prossime sedute. L'acquisizione resta nello storico iniziale.</p>
          </section>

          <section class="package-panel">
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
          </section>
        </div>

        <section class="package-panel package-reschedule-panel">
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
                <label>Da data</label>
                <input id="pkg-plan-from" class="form-input" type="date" value="${today}">
              </div>
            </div>
          </div>
          <div class="package-reschedule-actions">
            <button class="btn" onclick="App._savePackageSchedule('${client.id}')">Salva solo giorni</button>
            <button class="btn-primary" ${hasTotal ? '' : 'disabled'} onclick="App._regenerateFuturePackageAppointments('${client.id}')">Rigenera future</button>
          </div>
          <p>Usalo quando il cliente cambia disponibilita: non modifica l'acquisizione originale, aggiorna la pianificazione reale e ricrea solo le sedute future non svolte.</p>
        </section>

        <section class="package-panel">
          <h4>Appuntamenti collegati</h4>
          <table class="package-timeline-table">
            <thead><tr><th>Data</th><th>Ora</th><th>Servizio</th><th>PT</th><th>Stato</th><th>Azioni</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="UI.closeModal()">Chiudi</button>
        <button class="btn-primary" onclick="UI.closeModal();App.openNewAppointment(null,'${client.id}')">Nuovo appuntamento</button>
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
    const clients = State.getClients();
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx < 0) return null;
    clients[idx] = {
      ...clients[idx],
      giorniSettimana: days,
      notes: [
        clients[idx].notes || '',
        `Cambio pianificazione reale ${new Date().toLocaleDateString('it-IT')}: ${days.join(', ') || 'nessun giorno'}`
      ].filter(Boolean).join('\n')
    };
    State.saveClients(clients);
    SupabaseSync.pushClient(clients[idx]);
    if (CONFIG.SHEETS.enabled) Sheets.pushClient(clients[idx]);
    return clients[idx];
  },

  _savePackageSchedule(clientId) {
    if (!App._limitPackagePlanDays(clientId)) return;
    const days = App._selectedPackagePlanDays();
    if (!days.length) {
      UI.showToast('Seleziona almeno un giorno reale', 'error');
      return;
    }
    const saved = App._updateClientPackageDays(clientId, days);
    if (!saved) return;
    UI.showToast('Giorni reali del pacchetto salvati', 'success');
    App.openPackageOverview(clientId);
  },

  async _regenerateFuturePackageAppointments(clientId) {
    if (!App._limitPackagePlanDays(clientId)) return;
    const currentClient = State.getClients().find(c => c.id === clientId);
    if (!currentClient) return;

    const days = App._selectedPackagePlanDays();
    const fromDate = document.getElementById('pkg-plan-from')?.value || App._dateStr(new Date());
    const time = document.getElementById('pkg-plan-time')?.value || '09:00';
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
    const fallbackOperator = futureToReplace[0]?.operatorId ||
      [...allAppointments].reverse().find(a => a.serviceId === serviceId && (a.clientIds || []).includes(clientId))?.operatorId ||
      currentClient.ptAssegnato ||
      null;

    const confirmed = confirm(
      `Rigenero le sedute future di ${currentClient.nome} ${currentClient.cognome} da ${fromDate}.\n` +
      `Le sedute future non svolte (${futureToReplace.length}) saranno sostituite con: ${days.join(', ')} alle ${time}.\n\n` +
      'Le sedute gia fatte non vengono toccate.'
    );
    if (!confirmed) return;

    const backupClients = State.getClients();
    const updatedClient = App._updateClientPackageDays(clientId, days);
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
        notes: `Rigenerata per cambio giorni da ${fromDate}`,
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

  async _updatePackageAppointmentRow(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    const nextDate = document.getElementById(`pkg-date-${apptId}`)?.value;
    const nextTime = document.getElementById(`pkg-time-${apptId}`)?.value;
    const nextStatus = document.getElementById(`pkg-status-${apptId}`)?.value;
    if (!appt || !nextDate || !nextTime || !nextStatus) return;
    if (appt.date === nextDate && appt.startTime === nextTime && appt.status === nextStatus) {
      UI.showToast('Riga gia aggiornata', 'success');
      return;
    }

    const patch = { ...appt, date: nextDate, startTime: nextTime, status: nextStatus };
    const validation = Services.canBookAppointment(patch);
    if (!validation.ok) {
      UI.showToast(validation.errors[0], 'error');
      return;
    }

    const saved = Services.updateAppointment(apptId, { date: nextDate, startTime: nextTime, status: nextStatus });
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
    if (!confirm('Eliminare questa seduta dal pacchetto?')) return;
    Services.deleteAppointment(apptId);
    await SupabaseSync.deleteAppointment(apptId);
    if (appt.status === 'fatto') App._consumeClientSessions(appt);
    Calendar.render();
    UI.showToast('Seduta eliminata dal pacchetto', 'success');
    const clientId = appt.clientIds?.[0];
    if (clientId) App.openPackageOverview(clientId);
  },

  async _generateMissingPackageAppointments(clientId) {
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
        operatorId: client.ptAssegnato || null,
        date,
        startTime: time,
        durationMin: service.durationMin || 60,
        bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
        status: 'prenotato',
        notes: 'Programmazione generata dal quadro pacchetto',
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

  _importFile(input) {
    const file = input.files[0];
    if (!file) return;
    State.importData(file).then(res => {
      UI.closeModal();
      Calendar.render();
      UI.showToast(`Importati: ${res.appointments} appuntamenti, ${res.clients} clienti, ${res.operators} staff`, 'success');
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

  // ── INIT ─────────────────────────────────────────────
  async init() {
    State.init();
    try {
      await SupabaseSync.pullAll();
    } catch (err) {
      console.warn('[Supabase] sync non riuscita:', err);
      UI.showToast('Supabase non raggiungibile: uso dati locali', 'error');
    }



    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); Calendar.switchView(el.dataset.view); });
    });

    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) UI.closeModal();
    });

    Calendar.switchView('dashboard');

    if (CONFIG.SHEETS.enabled) setTimeout(() => Sheets.fullSync(), 1500);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
