// Disponibilita PT: configurazione staff + ricerca disponibilita reale.
(function () {
  const NS = 'pt-availability-overview';
  const STAFF_NS = 'pt-staff-availability-setup';
  const AVAILABILITY_KEY = 'neacea_pt_declared_availability_v4';
  const WEEK_DAYS = [
    ['mon', 'Lunedi'],
    ['tue', 'Martedi'],
    ['wed', 'Mercoledi'],
    ['thu', 'Giovedi'],
    ['fri', 'Venerdi'],
    ['sat', 'Sabato']
  ];
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const HOURLY_SLOTS = Array.from({ length: 14 }, (_, i) => {
    const start = 7 + i;
    const end = start + 1;
    return [`${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`, `${String(start).padStart(2, '0')}:00`];
  });
  const SEARCH_WINDOWS = [
    ['07:00-21:00', 'Tutta la giornata'],
    ...HOURLY_SLOTS.map(([value]) => [value, value])
  ];
  let staffEditorOpen = false;
  let staffEditorDirty = false;
  let hoursSummaryOpen = false;
  let hoursSummaryMonth = '';
  let lastSearchHtml = '';
  let lastSearchFilters = null;
  let availabilityCache = null;
  let availabilitySyncStarted = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function parseDate(value) {
    const parts = String(value || '').slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function currentDateValue() {
    return (typeof Calendar !== 'undefined' && Calendar.getCurrentDateStr ? Calendar.getCurrentDateStr() : '') || dateStr(new Date());
  }

  function fmtDate(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }) : '-';
  }

  function timeToMin(value) {
    if (typeof Services !== 'undefined' && Services.timeToMin) return Services.timeToMin(value);
    const [h, m] = String(value || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minToTime(value) {
    if (typeof Services !== 'undefined' && Services.minToTime) return Services.minToTime(value);
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function splitRange(range) {
    const parts = String(range || '').split('-');
    if (parts.length !== 2) return null;
    const start = timeToMin(parts[0]);
    const end = timeToMin(parts[1]);
    return end > start ? { start, end } : null;
  }

  function overlapRange(a, b) {
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    return end > start ? { start, end } : null;
  }

  function operatorLabel(operator) {
    if (!operator) return '-';
    return `${operator.nome || ''} ${operator.cognome || ''}`.trim() || operator.email || operator.id || '-';
  }

  function operatorKey(operator) {
    return String(operator.id || operator.email || operatorLabel(operator));
  }

  function activeOperators() {
    return State.getOperators().filter(op => op.active !== false);
  }

  function loadLocalAvailability() {
    try { return JSON.parse(localStorage.getItem(AVAILABILITY_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveLocalAvailability(data) {
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(data));
  }

  function hasAvailabilityRows(data) {
    return Object.values(data || {}).some(days =>
      Object.values(days || {}).some(value => Array.isArray(value?.slots) && value.slots.length)
    );
  }

  function mergeAvailability(base, incoming) {
    const merged = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([opKey, days]) => {
      merged[opKey] = { ...(merged[opKey] || {}) };
      Object.entries(days || {}).forEach(([day, value]) => {
        const current = Array.isArray(merged[opKey][day]?.slots) ? merged[opKey][day].slots : [];
        const next = Array.isArray(value?.slots) ? value.slots : [];
        const slots = [...new Set([...current, ...next])].filter(Boolean).sort();
        merged[opKey][day] = { ...(merged[opKey][day] || {}), ...(value || {}), slots };
      });
    });
    return merged;
  }

  function loadAvailability() {
    if (!availabilityCache) availabilityCache = loadLocalAvailability();
    return availabilityCache;
  }

  function saveAvailability(data) {
    availabilityCache = data || {};
    saveLocalAvailability(availabilityCache);
  }

  function syncAvailable() {
    return typeof SupabaseSync !== 'undefined' &&
      typeof SupabaseSync.pullOperatorAvailability === 'function' &&
      typeof SupabaseSync.pushOperatorAvailability === 'function';
  }

  async function pushAvailabilityToSupabase(data, statusEl = null) {
    if (!syncAvailable()) return { skipped: true };
    try {
      const res = await SupabaseSync.pushOperatorAvailability(data || {});
      if (res?.error) throw new Error(res.error);
      if (statusEl) statusEl.textContent = 'Disponibilita salvata anche su Supabase.';
      return { success: true };
    } catch (err) {
      console.warn('[PTAvailabilityOverview] Supabase availability sync failed', err);
      if (statusEl) statusEl.textContent = 'Disponibilita salvata in locale. Supabase non raggiungibile.';
      return { success: false, error: err };
    }
  }

  async function startAvailabilitySync() {
    if (availabilitySyncStarted) return;
    availabilitySyncStarted = true;
    availabilityCache = loadLocalAvailability();
    if (!syncAvailable()) return;
    try {
      const remote = await SupabaseSync.pullOperatorAvailability();
      if (remote?.error) throw new Error(remote.error);
      const localHasRows = hasAvailabilityRows(availabilityCache);
      const remoteHasRows = hasAvailabilityRows(remote);
      if (localHasRows) {
        const merged = remoteHasRows ? mergeAvailability(remote, availabilityCache) : availabilityCache;
        saveAvailability(merged);
        await pushAvailabilityToSupabase(merged);
      } else if (remoteHasRows) {
        saveAvailability(remote);
        renderStaffIfActive();
        renderAvailabilityIfActive();
      }
    } catch (err) {
      console.warn('[PTAvailabilityOverview] Supabase availability init failed; local fallback active', err);
    }
  }

  function selectOptions(items, selected = '') {
    return items.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }

  function serviceOptions() {
    return Object.values(CONFIG.SERVICES)
      .filter(s => !s.isBlock)
      .map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`)
      .join('');
  }

  function operatorOptions(includeAll) {
    const prefix = includeAll ? '<option value="all">Tutti i PT</option>' : '';
    return prefix + activeOperators().map(op =>
      `<option value="${esc(operatorKey(op))}">${esc(operatorLabel(op))}${op.email ? ' · ' + esc(op.email) : ''}</option>`
    ).join('');
  }

  function defaultRangeEnd() {
    return dateStr(addDays(parseDate(currentDateValue()) || new Date(), 6));
  }

  function currentMonthValue() {
    const d = parseDate(currentDateValue()) || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthLabel(value) {
    const [year, month] = String(value || currentMonthValue()).split('-').map(Number);
    if (!year || !month) return '-';
    return new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }

  function serviceLabel(serviceId) {
    const svc = typeof Services !== 'undefined' && Services.getService ? Services.getService(serviceId) : null;
    return svc?.label || CONFIG.SERVICES?.[serviceId]?.label || serviceId || 'Servizio';
  }

  function appointmentMinutes(appointment) {
    const svc = typeof Services !== 'undefined' && Services.getService ? Services.getService(appointment.serviceId) : null;
    return Number(appointment.durationMin || svc?.durationMin || 60);
  }

  function appointmentOperatorKey(appointment) {
    const op = typeof Services !== 'undefined' && Services.getOperator ? Services.getOperator(appointment.operatorId) : null;
    if (op) return operatorKey(op);
    return String(appointment.operatorId || '');
  }

  function buildHoursSummary(monthValue) {
    const month = monthValue || currentMonthValue();
    const operators = activeOperators();
    const rows = new Map();
    operators.forEach(op => rows.set(operatorKey(op), { op, totalMin: 0, services: new Map() }));
    State.getAppointments()
      .filter(a =>
        a.status !== 'annullato' &&
        String(a.date || '').slice(0, 7) === month &&
        a.operatorId &&
        (typeof Services === 'undefined' || !Services.isAppointmentVisible || Services.isAppointmentVisible(a))
      )
      .forEach(a => {
        const opKey = appointmentOperatorKey(a);
        if (!rows.has(opKey)) {
          const op = typeof Services !== 'undefined' && Services.getOperator ? Services.getOperator(a.operatorId) : null;
          rows.set(opKey, { op: op || { id: a.operatorId }, totalMin: 0, services: new Map() });
        }
        const row = rows.get(opKey);
        const serviceId = a.serviceId || 'servizio';
        const minutes = appointmentMinutes(a);
        row.totalMin += minutes;
        const item = row.services.get(serviceId) || { serviceId, minutes: 0, count: 0 };
        item.minutes += minutes;
        item.count += 1;
        row.services.set(serviceId, item);
      });
    return [...rows.values()]
      .filter(row => row.totalMin > 0)
      .sort((a, b) => operatorLabel(a.op).localeCompare(operatorLabel(b.op), 'it'));
  }

  function fmtHours(minutes) {
    const value = Math.round((Number(minutes || 0) / 60) * 10) / 10;
    return `${String(value).replace('.', ',')} h`;
  }

  function openHoursSummary() {
    hoursSummaryMonth = hoursSummaryMonth || currentMonthValue();
    hoursSummaryOpen = true;
    renderStaffIfActive();
  }

  function closeHoursSummary() {
    hoursSummaryOpen = false;
    renderStaffIfActive();
  }

  function changeHoursSummaryMonth(value) {
    hoursSummaryMonth = value || currentMonthValue();
    renderStaffIfActive();
  }

  function toggleStaffAvailability() {
    if (staffEditorOpen && staffEditorDirty && !confirm('Ci sono disponibilita non salvate. Chiudere senza salvare?')) return;
    staffEditorOpen = !staffEditorOpen;
    if (!staffEditorOpen) staffEditorDirty = false;
    renderStaffIfActive();
  }

  function markStaffAvailabilityDirty() {
    staffEditorDirty = true;
    const msg = document.getElementById('pt-staff-save-result');
    if (msg) msg.textContent = 'Modifiche non salvate.';
  }

  function shouldPauseAutoRefresh() {
    return staffEditorOpen || staffEditorDirty;
  }

  function saveStaffAvailability() {
    const data = loadAvailability();
    document.querySelectorAll('[data-pt-staff-day]').forEach(dayWrap => {
      const opKey = dayWrap.getAttribute('data-operator-key');
      const day = dayWrap.getAttribute('data-day');
      if (!opKey || !day) return;
      data[opKey] = data[opKey] || {};
      data[opKey][day] = {
        slots: [...dayWrap.querySelectorAll('[data-pt-hour-slot]:checked')].map(input => input.value)
      };
    });
    saveAvailability(data);
    staffEditorOpen = true;
    staffEditorDirty = false;
    renderStaffIfActive();
    renderAvailabilityIfActive();
    const msg = document.getElementById('pt-staff-save-result');
    if (msg) msg.textContent = 'Disponibilita salvata.';
    pushAvailabilityToSupabase(data, msg);
  }

  function savedSlotsForDay(saved) {
    if (Array.isArray(saved?.slots)) return saved.slots;
    const ranges = [saved?.a, saved?.b].map(splitRange).filter(Boolean);
    const slots = new Set();
    ranges.forEach(range => {
      HOURLY_SLOTS.forEach(([value]) => {
        const slot = splitRange(value);
        if (slot && slot.start >= range.start && slot.end <= range.end) slots.add(value);
      });
    });
    return [...slots];
  }

  function renderHourSlots(opKey, day, saved) {
    const selected = new Set(savedSlotsForDay(saved));
    return `<div class="pt-hour-grid" data-pt-staff-day="1" data-operator-key="${esc(opKey)}" data-day="${esc(day)}">
      ${HOURLY_SLOTS.map(([value, label]) => `<label class="pt-hour-pill">
        <input type="checkbox" data-pt-hour-slot="1" value="${esc(value)}" ${selected.has(value) ? 'checked' : ''} onchange="PTAvailabilityOverview.markStaffAvailabilityDirty()">
        <span>${esc(label)}</span>
      </label>`).join('')}
    </div>`;
  }

  function renderStaffRows() {
    const data = loadAvailability();
    const operators = activeOperators();
    if (!operators.length) return '<tr><td colspan="7" class="pt-muted">Nessun PT/staff attivo trovato.</td></tr>';
    return operators.map(op => {
      const opKey = operatorKey(op);
      const days = WEEK_DAYS.map(([day, label]) => {
        const saved = data[opKey]?.[day] || { slots: [] };
        return `<td>
          <div class="pt-day-slot-title">${esc(label)}</div>
          ${renderHourSlots(opKey, day, saved)}
        </td>`;
      }).join('');
      return `<tr><th><strong>${esc(operatorLabel(op))}</strong><small>${esc(op.email || '')}</small></th>${days}</tr>`;
    }).join('');
  }

  function renderHoursSummaryDrawer() {
    if (!hoursSummaryOpen) return '';
    const month = hoursSummaryMonth || currentMonthValue();
    const rows = buildHoursSummary(month);
    const body = rows.length ? rows.map(row => {
      const services = [...row.services.values()].sort((a, b) => b.minutes - a.minutes).map(item => `
        <div class="pt-hours-service">
          <span>${esc(serviceLabel(item.serviceId))}</span>
          <strong>${esc(fmtHours(item.minutes))}</strong>
          <small>${esc(item.count)} appunt.</small>
        </div>`).join('');
      return `<div class="pt-hours-card">
        <div class="pt-hours-person">
          <strong>${esc(operatorLabel(row.op))}</strong>
          <span>${esc(fmtHours(row.totalMin))}</span>
        </div>
        ${services}
      </div>`;
    }).join('') : '<div class="pt-search-empty">Nessuna ora trovata per questo mese.</div>';
    return `<div class="pt-hours-overlay" onclick="PTAvailabilityOverview.closeHoursSummary()">
      <aside class="pt-hours-drawer" onclick="event.stopPropagation()">
        <div class="pt-hours-header">
          <div>
            <h3>Riepilogo ore</h3>
            <span>${esc(monthLabel(month))}</span>
          </div>
          <button class="pt-hours-close" onclick="PTAvailabilityOverview.closeHoursSummary()" aria-label="Chiudi">×</button>
        </div>
        <label class="pt-hours-month">Mese<input type="month" value="${esc(month)}" onchange="PTAvailabilityOverview.changeHoursSummaryMonth(this.value)"></label>
        <p class="pt-help">Conteggio degli appuntamenti del mese non annullati, divisi per professionista e tipologia di servizio.</p>
        <div class="pt-hours-list">${body}</div>
      </aside>
    </div>`;
  }

  function renderStaffIfActive() {
    const panel = document.getElementById('view-operators');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${STAFF_NS}`).forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = STAFF_NS;
    wrap.innerHTML = `
        <div class="pt-panel pt-staff-setup">
          <div class="pt-panel-title">
            <h3>Disponibilita PT</h3>
          <div class="pt-title-actions">
            <button class="pt-action pt-action-secondary" onclick="PTAvailabilityOverview.openHoursSummary()">Riepilogo ore</button>
            <button class="pt-action" onclick="PTAvailabilityOverview.toggleStaffAvailability()">${staffEditorOpen ? 'Chiudi disponibilita' : 'Apri disponibilita'}</button>
          </div>
        </div>
        <div id="pt-staff-availability-editor" ${staffEditorOpen ? '' : 'hidden'}>
          <p class="pt-help">Imposta le singole ore che ogni PT ti comunica. La ricerca in Disponibilita usera questi slot insieme agli appuntamenti gia prenotati.</p>
          <div class="pt-table-wrap">
            <table class="pt-staff-table">
              <thead><tr><th>PT</th>${WEEK_DAYS.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead>
              <tbody>${renderStaffRows()}</tbody>
            </table>
          </div>
          <div class="pt-staff-actions"><button class="pt-action" onclick="PTAvailabilityOverview.saveStaffAvailability()">Salva disponibilita</button><span id="pt-staff-save-result"></span></div>
        </div>
      </div>
      ${renderHoursSummaryDrawer()}`;
    panel.appendChild(wrap);
  }

  function declaredRangesFor(opKey, dayKey) {
    const saved = loadAvailability()[opKey]?.[dayKey] || {};
    const seen = new Set();
    return savedSlotsForDay(saved).map(splitRange).filter(range => {
      if (!range) return false;
      const key = `${range.start}-${range.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function hasRoleForService(operator, serviceId) {
    const svc = typeof Services !== 'undefined' && Services.getService ? Services.getService(serviceId) : null;
    if (!svc || !svc.roles || !svc.roles.length) return true;
    const roles = operator.roles || operator.role || [];
    const list = Array.isArray(roles) ? roles : [roles];
    return svc.roles.some(role => list.includes(role));
  }

  function isAvailableByCalendar(operator, serviceId, date, start, duration, buffer) {
    if (typeof Services !== 'undefined' && Services.getAvailableOperatorsForSlot) {
      const status = Services.getAvailableOperatorsForSlot(serviceId, date, minToTime(start), duration, buffer, null)
        .find(item => String(item.id) === String(operator.id));
      return !!status && status.hasRole !== false && status.available;
    }
    const end = start + duration + buffer;
    return !State.getAppointments().some(a => {
      if (a.status === 'annullato' || a.date !== date || String(a.operatorId) !== String(operator.id)) return false;
      if (typeof Services !== 'undefined' && Services.isAppointmentVisible && !Services.isAppointmentVisible(a)) return false;
      const svc = typeof Services !== 'undefined' && Services.getService ? Services.getService(a.serviceId) : null;
      const aStart = timeToMin(a.startTime);
      const aEnd = aStart + Number(a.durationMin || svc?.durationMin || 60);
      return start < aEnd && end > aStart;
    });
  }

  function runAvailabilitySearch() {
    const serviceId = document.getElementById('pt-search-service')?.value || 'pt11';
    const operatorChoice = document.getElementById('pt-search-operator')?.value || 'all';
    const fromValue = document.getElementById('pt-search-from')?.value || currentDateValue();
    const toValue = document.getElementById('pt-search-to')?.value || defaultRangeEnd();
    const windowValue = document.getElementById('pt-search-window')?.value || '07:00-21:00';
    const fromDate = parseDate(fromValue) || parseDate(currentDateValue()) || new Date();
    const toDate = parseDate(toValue) || addDays(fromDate, 6);
    const windowRange = splitRange(windowValue);
    const service = typeof Services !== 'undefined' && Services.getService ? Services.getService(serviceId) : null;
    const duration = Number(service?.durationMin || 60);
    const buffer = Number(service?.bufferMin ?? CONFIG.defaultBufferMin ?? 10);
    const periodDays = Math.floor((toDate - fromDate) / 86400000) + 1;
    const operators = activeOperators().filter(op => operatorChoice === 'all' || operatorKey(op) === operatorChoice);
    const results = [];
    const seenResults = new Set();
    lastSearchFilters = { serviceId, operatorChoice, fromValue, toValue, windowValue };
    if (periodDays <= 0) {
      lastSearchHtml = '<div class="pt-search-empty">La data finale deve essere uguale o successiva alla data iniziale.</div>';
      renderAvailabilityIfActive();
      return;
    }
    if (!windowRange) {
      lastSearchHtml = '<div class="pt-search-empty">Fascia oraria non valida.</div>';
      renderAvailabilityIfActive();
      return;
    }

    operators.forEach(op => {
      if (!hasRoleForService(op, serviceId)) return;
      const opKey = operatorKey(op);
      for (let i = 0; i < periodDays; i++) {
        const day = addDays(fromDate, i);
        const dayKey = DAY_KEYS[day.getDay()];
        const dayDate = dateStr(day);
        if (dayKey === 'sun') continue;
        declaredRangesFor(opKey, dayKey).forEach(range => {
          const overlap = overlapRange(range, windowRange);
          if (!overlap) return;
          for (let start = overlap.start; start + duration <= overlap.end; start += 30) {
            const resultKey = `${opKey}|${dayDate}|${start}`;
            if (seenResults.has(resultKey)) continue;
            if (isAvailableByCalendar(op, serviceId, dayDate, start, duration, buffer)) {
              seenResults.add(resultKey);
              results.push({ op, date: dayDate, start, end: start + duration });
              break;
            }
          }
        });
      }
    });

    lastSearchHtml = renderSearchResults(results.slice(0, 40));
    renderAvailabilityIfActive();
  }

  function renderSearchResults(results) {
    if (!results.length) return '<div class="pt-search-empty">Nessuna disponibilita trovata con questi filtri.</div>';
    return `<div class="pt-search-results">${results.map(item => `<div class="pt-search-result"><strong>${esc(operatorLabel(item.op))}</strong><span>${esc(fmtDate(item.date))} · ${esc(minToTime(item.start))}-${esc(minToTime(item.end))}</span></div>`).join('')}</div>`;
  }

  function renderSearchBox() {
    const filters = lastSearchFilters || {
      serviceId: 'pt11',
      operatorChoice: 'all',
      fromValue: currentDateValue(),
      toValue: defaultRangeEnd(),
      windowValue: '07:00-21:00'
    };
    return `<div class="pt-panel pt-search-panel">
      <div class="pt-panel-title"><h3>Cerca disponibilita reale</h3><span>servizio, PT, periodo e fascia</span></div>
      <div class="pt-search-controls">
        <label>Servizio<select id="pt-search-service">${serviceOptions().replace(`value="${esc(filters.serviceId)}"`, `value="${esc(filters.serviceId)}" selected`)}</select></label>
        <label>PT<select id="pt-search-operator">${operatorOptions(true).replace(`value="${esc(filters.operatorChoice)}"`, `value="${esc(filters.operatorChoice)}" selected`)}</select></label>
        <label>Dal<input type="date" id="pt-search-from" value="${esc(filters.fromValue)}"></label>
        <label>Al<input type="date" id="pt-search-to" value="${esc(filters.toValue)}"></label>
        <label>Fascia oraria<select id="pt-search-window">${selectOptions(SEARCH_WINDOWS, filters.windowValue)}</select></label>
        <button class="pt-action" onclick="PTAvailabilityOverview.runAvailabilitySearch()">Cerca</button>
      </div>
      <div class="pt-search-output">${lastSearchHtml || '<div class="pt-search-empty">Imposta i filtri e cerca per vedere chi e quando e disponibile.</div>'}</div>
    </div>`;
  }

  function operatorForClient(client, operators) {
    const raw = client.ptAssegnato || client.pt_assegnato || client.operatorId || client.operator_id || '';
    if (!raw) return null;
    const normalized = String(raw).toLowerCase();
    return operators.find(op => String(op.id || '').toLowerCase() === normalized || String(op.email || '').toLowerCase() === normalized || operatorLabel(op).toLowerCase() === normalized) || null;
  }

  function packageTypes(client) {
    if (Array.isArray(client.packageTypes)) return client.packageTypes;
    if (Array.isArray(client.package_types)) return client.package_types;
    if (client.packageType) return [client.packageType];
    return [];
  }

  function packageStart(client) {
    return client.packageStart || client.package_start || client.dataInizio || client.data_inizio || '';
  }

  function frequencyPerWeek(value) {
    const raw = String(value || '').toLowerCase();
    const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
    if (n > 0) return n;
    if (raw.includes('bisettimanale')) return 0.5;
    if (raw.includes('mensile')) return 0.25;
    return 1;
  }

  function packageEnd(client, metrics) {
    const explicit = client.packageEnd || client.package_end || client.dataFine || client.data_fine || '';
    if (explicit) return explicit;
    if (metrics?.projectedEnd) return metrics.projectedEnd;
    const start = parseDate(metrics?.cycleStart || packageStart(client));
    const total = Number(metrics?.total ?? client.sessionsTotal ?? client.sessions_total ?? 0);
    if (!start || !total) return '';
    return dateStr(addDays(start, Math.max(1, Math.ceil(total / frequencyPerWeek(client.packageFrequency || client.package_frequency))) * 7));
  }

  function metricsFor(client) {
    if (typeof Clients !== 'undefined' && Clients.getPackageMetrics) return Clients.getPackageMetrics(client);
    if (typeof Services !== 'undefined' && Services.getClientSessionMetrics) return Services.getClientSessionMetrics(client);
    return { total: Number(client.sessionsTotal || 0), remaining: Number(client.sessionsRemaining || 0), completed: 0, scheduled: 0, toSchedule: 0 };
  }

  function renewalStatus(client, metrics, end) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = parseDate(end);
    const remaining = Number(metrics.remaining ?? 0);
    const total = Number(metrics.total ?? client.sessionsTotal ?? 0);
    if ((total > 0 && remaining <= 0) || (endDate && endDate < today)) return { key: 'danger', label: 'Da contattare' };
    if ((total > 0 && remaining <= 2) || (endDate && ((endDate - today) / 86400000) <= 14)) return { key: 'warn', label: 'Scade presto' };
    return { key: 'ok', label: 'In corso' };
  }

  function renderPackageRows() {
    const operators = activeOperators();
    const clients = State.getClients().filter(c => c.active !== false && packageTypes(c).length);
    if (!clients.length) return '<tr><td colspan="8" class="pt-muted">Nessun pacchetto PT attivo trovato.</td></tr>';
    return clients.map(client => {
      const op = operatorForClient(client, operators);
      const metrics = metricsFor(client);
      const start = metrics.cycleStart || packageStart(client);
      const end = packageEnd(client, metrics);
      const status = renewalStatus(client, metrics, end);
      const total = Number(metrics.total ?? client.sessionsTotal ?? 0) || '-';
      const completed = Number(metrics.completed ?? 0);
      const remaining = metrics.remaining ?? client.sessionsRemaining ?? '-';
      const toSchedule = Number(metrics.toSchedule ?? 0);
      const name = `${client.nome || ''} ${client.cognome || ''}`.trim() || client.id;
      return `<tr><td><strong>${esc(name)}</strong><small>${esc(client.email || '')}</small></td><td>${esc(operatorLabel(op))}<small>${esc(op?.email || client.ptAssegnato || '-')}</small></td><td>${esc(fmtDate(start))}</td><td>${esc(fmtDate(end))}</td><td>${esc(packageTypes(client).join(', ') || '-')}</td><td>${esc(completed)}/${esc(total)} fatte nel ciclo<br><small>${esc(remaining)} residue · ${esc(toSchedule)} da pianificare · ${esc(metrics.lifetimeCompleted ?? completed)} complessive</small></td><td><span class="pt-status ${status.key}">${status.label}</span></td><td>${status.key === 'danger' ? '<span class="pt-status danger">Cliente da contattare</span>' : '<span class="pt-status read">Monitorare</span>'}</td></tr>`;
    }).join('');
  }

  function renderBusyColumns() {
    const base = parseDate(currentDateValue()) || new Date();
    const offset = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = addDays(base, -offset);
    const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
    const appointments = State.getAppointments().filter(a =>
      a.status !== 'annullato' &&
      (typeof Services === 'undefined' || !Services.isAppointmentVisible || Services.isAppointmentVisible(a))
    );
    return days.map(day => {
      const ds = dateStr(day);
      const items = appointments.filter(a => a.date === ds).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))).map(a => {
        const op = Services.getOperator(a.operatorId);
        const svc = Services.getService(a.serviceId);
        const clients = (Services.getActiveClientIds ? Services.getActiveClientIds(a) : (a.clientIds || []))
          .map(Services.clientFullName).join(', ') || 'Blocco agenda';
        const end = minToTime(timeToMin(a.startTime) + Number(a.durationMin || svc?.durationMin || 60));
        return `<div class="pt-event" style="border-left-color:${esc(svc?.color || '#1f6848')}"><strong>${esc(String(a.startTime || '').slice(0, 5))}-${esc(end)}</strong><span>${esc(operatorLabel(op))}</span><em>${esc(clients)}</em></div>`;
      }).join('') || '<div class="pt-empty">Nessun impegno</div>';
      return `<div class="pt-day"><h4>${day.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h4>${items}</div>`;
    }).join('');
  }

  function renderAvailabilityIfActive() {
    const panel = document.getElementById('view-availability');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${NS}`).forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = NS;
    wrap.innerHTML = `${renderSearchBox()}
      <div class="pt-panel"><div class="pt-panel-title"><h3>Pacchetti e rinnovi</h3><span>quadro clienti</span></div><div class="pt-table-wrap"><table class="pt-package-table"><thead><tr><th>Cliente</th><th>PT</th><th>Inizio</th><th>Fine stimata</th><th>Pacchetto</th><th>Sedute</th><th>Stato</th><th>Follow-up</th></tr></thead><tbody>${renderPackageRows()}</tbody></table></div></div>
      <div class="pt-panel"><div class="pt-panel-title"><h3>Orari impegnati della settimana</h3><span>appuntamenti reali</span></div><div class="pt-week-grid">${renderBusyColumns()}</div></div>`;
    panel.appendChild(wrap);
  }

  function scheduleEnhance() {
    setTimeout(renderAvailabilityIfActive, 0);
    setTimeout(renderAvailabilityIfActive, 250);
    setTimeout(renderStaffIfActive, 0);
    setTimeout(renderStaffIfActive, 250);
  }

  function hookCalendar() {
    if (typeof Calendar === 'undefined' || Calendar.__ptAvailabilityHookedV4) return;
    const originalRender = Calendar.render;
    const originalSwitch = Calendar.switchView;
    Calendar.render = function () {
      const out = originalRender.apply(Calendar, arguments);
      scheduleEnhance();
      return out;
    };
    Calendar.switchView = function () {
      const out = originalSwitch.apply(Calendar, arguments);
      scheduleEnhance();
      return out;
    };
    Calendar.__ptAvailabilityHookedV4 = true;
  }

  window.PTAvailabilityOverview = { toggleStaffAvailability, markStaffAvailabilityDirty, shouldPauseAutoRefresh, saveStaffAvailability, runAvailabilitySearch, openHoursSummary, closeHoursSummary, changeHoursSummaryMonth };

  document.addEventListener('DOMContentLoaded', () => {
    hookCalendar();
    startAvailabilitySync();
    document.querySelectorAll('[data-view="availability"],[data-view="operators"]').forEach(btn => btn.addEventListener('click', scheduleEnhance));
    scheduleEnhance();
  });
})();
