// =============================================
// NEACEA — app.js  v3.0
// Controller principale: modali, UI, sync Sheets
// =============================================

// ── UI HELPERS ────────────────────────────────────────────

const UI = {
  openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
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

  openNewAppointment(dateStr = null) {
    App._renderAppointmentModal(null, dateStr || Calendar.getCurrentDateStr());
  },
  openDetail(apptId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (appt) App._renderDetailModal(appt);
  },

  // ── MODAL APPUNTAMENTO ───────────────────────────────

  _renderAppointmentModal(apptId, defaultDate) {
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
          ${isBlock ? '' : App._buildClientsSection(curSvcId, appt?.clientIds||[])}
        </div>

        <!-- Operatore: ricostruito da _buildOperatorSection -->
        <div id="operator-section">
          ${App._buildOperatorSection(curSvcId, appt?.operatorId||null, appt?.date||defaultDate, appt?.startTime||'09:00', appt?.durationMin||svc?.durationMin||60)}
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
                ${isMulti?'multiple':''}>
          ${options}
        </select>
        <div class="form-hint">${hint}</div>
      </div>`;
  },

  // ── SEZIONE OPERATORE ─────────────────────────────────
  _buildOperatorSection(serviceId, selectedOpId, date, startTime, durationMin) {
    const svc = Services.getService(serviceId);
    const bufferMin = svc?.bufferMin || 0;
    const ops = Services.getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin);

    // Se selectedOpId non valido, prova auto-assign
    if (!selectedOpId && date && startTime) {
      selectedOpId = Services.autoAssignOperator(serviceId, date, startTime, durationMin, bufferMin) || '';
    }

    const opsHtml = `<option value="">— nessuno / scegli —</option>` + ops.map(op => {
      let icon = '';
      if (!op.hasRole)    icon = ' 🚫 ruolo mancante';
      else if (!op.available) icon = ` ⚠ occupato ${op.conflicts.map(c=>c.startTime).join(',')}`;
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

    const tmpAppt = {
      id: null, serviceId: svcId, clientIds, operatorId: opId,
      date, startTime: time, durationMin: dur, bufferMin: svc?.bufferMin||0, status: 'prenotato',
    };

    const validation = Services.canBookAppointment(tmpAppt);
    const validEl = document.getElementById('slot-validation');
    if (validEl) {
      if (validation.ok) {
        let roomInfo = '';
        if (svc?.room) {
          const load = Services.getRoomLoadAt(date, time, dur, svc.room);
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
    const os = document.getElementById('operator-section');
    if (os && svcId && date && time) {
      os.innerHTML = App._buildOperatorSection(svcId, curOp, date, time, dur);
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

    const validation = Services.canBookAppointment({ ...apptData, id: apptId||null });
    if (!validation.ok) {
      UI.showToast(validation.errors[0], 'error');
      const ve = document.getElementById('slot-validation');
      if (ve) ve.innerHTML = `<div class="val-error">⚠ ${validation.errors.join(' · ')}</div>`;
      return;
    }

    let saved;
    if (apptId) {
      saved = Services.updateAppointment(apptId, apptData);
      UI.showToast('Appuntamento aggiornato', 'success');
    } else {
      saved = Services.addAppointment(apptData);
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
      bodyHtml = `<div class="detail-section">
        <div class="detail-label">Tipo</div>
        <div class="detail-value" style="color:var(--text3)">Blocco agenda — operatore non disponibile</div>
      </div>`;
    } else if (isCircuit) {
      bodyHtml = `
        <div class="detail-section">
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
      <div class="modal-body">
        ${bodyHtml}
        <div class="detail-grid">
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
        ${appt.notes?`<div class="detail-section"><div class="detail-label">Note</div><div class="detail-value">${appt.notes}</div></div>`:''}
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
    const doneAppt = Services.updateAppointment(apptId, { status: 'fatto' });
    UI.closeModal(); UI.showToast('Segnato come fatto', 'success'); Calendar.render();
    SupabaseSync.pushAppointment(doneAppt);
    if (CONFIG.SHEETS.enabled) Sheets.pushAppointment(doneAppt);
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

  _renderClientModal(clientId) {
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
    const dayOptions = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'].map(g => `
      <label class="checkbox-label">
        <input type="checkbox" name="client-day" value="${g}" ${curDays.includes(g)?'checked':''} onchange="App._limitClientDays(this)">
        <span>${g.slice(0, 3)}</span>
      </label>`).join('');

    const html = `
      <div class="modal-header">
        <h3>${isEdit?'Modifica Cliente':'Nuovo Cliente'}</h3>
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

        <div class="form-section-label">Pacchetti acquistati</div>
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
            <label>Sessioni rimanenti</label>
            <input type="number" id="cl-sessions-rem" class="form-input" min="0" value="${client?.sessionsRemaining||''}">
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

  _maxClientDays() {
    const raw = document.getElementById('cl-frequency')?.value || '';
    const total = parseInt(document.getElementById('cl-sessions-total')?.value || '0', 10);
    if (total === 2) return 1;
    const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
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
    const pkgs      = [...document.querySelectorAll('input[name="pkg"]:checked')].map(el=>el.value);
    const frequency = document.getElementById('cl-frequency')?.value;
    const sessTotal = parseInt(document.getElementById('cl-sessions-total')?.value)||0;
    const sessRem   = parseInt(document.getElementById('cl-sessions-rem')?.value)||0;
    const notes     = document.getElementById('cl-notes')?.value.trim();
    if (!App._limitClientDays()) return;
    const giorniSettimana = [...document.querySelectorAll('input[name="client-day"]:checked')].map(el=>el.value);

    if (!nome||!cognome) { UI.showToast('Nome e cognome obbligatori','error'); return; }

    const clients = State.getClients();
    const data = {
      nome, cognome, email, telefono,
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
