// Disponibilita PT: configurazione staff + ricerca disponibilita reale.
(function () {
  const NS = 'pt-availability-overview';
  const STAFF_NS = 'pt-staff-availability-setup';
  const AVAILABILITY_KEY = 'neacea_pt_declared_availability_v3';
  const WEEK_DAYS = [
    ['mon', 'Lunedi'],
    ['tue', 'Martedi'],
    ['wed', 'Mercoledi'],
    ['thu', 'Giovedi'],
    ['fri', 'Venerdi'],
    ['sat', 'Sabato']
  ];
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const TIME_SLOTS = [
    ['', 'Non disponibile'],
    ['07:00-12:00', '07:00-12:00'],
    ['08:00-13:00', '08:00-13:00'],
    ['09:00-14:00', '09:00-14:00'],
    ['12:00-16:00', '12:00-16:00'],
    ['14:00-18:00', '14:00-18:00'],
    ['15:00-20:00', '15:00-20:00'],
    ['16:00-21:00', '16:00-21:00'],
    ['07:00-21:00', 'Full day']
  ];
  const SEARCH_WINDOWS = [
    ['07:00-21:00', 'Tutta la giornata'],
    ['07:00-12:00', 'Mattina'],
    ['12:00-16:00', 'Pranzo / primo pomeriggio'],
    ['14:00-18:00', 'Pomeriggio'],
    ['15:00-21:00', 'Pomeriggio / sera']
  ];
  const PERIODS = [
    ['7', 'Prossimi 7 giorni'],
    ['14', 'Prossimi 14 giorni'],
    ['30', 'Prossimi 30 giorni']
  ];
  let lastSearchHtml = '';

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
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return { start, end };
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

  function loadAvailability() {
    try { return JSON.parse(localStorage.getItem(AVAILABILITY_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveAvailability(data) {
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(data));
  }

  function serviceOptions() {
    return Object.values(CONFIG.SERVICES)
      .filter(s => !s.isBlock)
      .map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`)
      .join('');
  }

  function operatorOptions(includeAll) {
    const prefix = includeAll ? '<option value="all">Tutti i PT</option>' : '';
    return prefix + State.getOperators().filter(op => op.active !== false).map(op =>
      `<option value="${esc(operatorKey(op))}">${esc(operatorLabel(op))}${op.email ? ' · ' + esc(op.email) : ''}</option>`
    ).join('');
  }

  function selectOptions(items, selected = '') {
    return items.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }

  function getOperatorByKey(key) {
    return State.getOperators().find(op => operatorKey(op) === key || String(op.id || '') === key || String(op.email || '') === key) || null;
  }

  function toggleStaffAvailability() {
    const box = document.getElementById('pt-staff-availability-editor');
    if (box) box.hidden = !box.hidden;
  }

  function saveStaffAvailability() {
    const data = loadAvailability();
    document.querySelectorAll('[data-pt-staff-slot]').forEach(select => {
      const opKey = select.getAttribute('data-operator-key');
      const day = select.getAttribute('data-day');
      const slot = select.getAttribute('data-slot');
      if (!opKey || !day || !slot) return;
      data[opKey] = data[opKey] || {};
      data[opKey][day] = data[opKey][day] || { a: '', b: '' };
      data[opKey][day][slot] = select.value;
    });
    saveAvailability(data);
    const msg = document.getElementById('pt-staff-save-result');
    if (msg) msg.textContent = 'Disponibilita salvata.';
    renderAvailabilityIfActive();
  }

  function renderStaffRows() {
    const data = loadAvailability();
    const operators = State.getOperators().filter(op => op.active !== false);
    if (!operators.length) return '<tr><td colspan="7" class="pt-muted">Nessun PT/staff attivo trovato.</td></tr>';
    return operators.map(op => {
      const opKey = operatorKey(op);
      const days = WEEK_DAYS.map(([day, label]) => {
        const saved = data[opKey]?.[day] || { a: '', b: '' };
        return `<td>
          <label><span>${esc(label)} fascia 1</span><select data-pt-staff-slot="1" data-operator-key="${esc(opKey)}" data-day="${esc(day)}" data-slot="a">${selectOptions(TIME_SLOTS, saved.a || '')}</select></label>
          <label><span>${esc(label)} fascia 2</span><select data-pt-staff-slot="1" data-operator-key="${esc(opKey)}" data-day="${esc(day)}" data-slot="b">${selectOptions(TIME_SLOTS, saved.b || '')}</select></label>
        </td>`;
      }).join('');
      return `<tr><th><strong>${esc(operatorLabel(op))}</strong><small>${esc(op.email || '')}</small></th>${days}</tr>`;
    }).join('');
  }

  function enhanceStaff() {
    const panel = document.getElementById('view-operators');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${STAFF_NS}`).forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = STAFF_NS;
    wrap.innerHTML = `
      <div class="pt-panel pt-staff-setup">
        <div class="pt-panel-title">
          <h3>Disponibilita PT</h3>
          <button class="pt-action" onclick="PTAvailabilityOverview.toggleStaffAvailability()">Apri disponibilita</button>
        </div>
        <div id="pt-staff-availability-editor" hidden>
          <p class="pt-help">Imposta i giorni e le fasce orarie che ogni PT ti comunica. La ricerca in Disponibilita usera questi dati insieme agli appuntamenti gia prenotati.</p>
          <div class="pt-table-wrap">
            <table class="pt-staff-table">
              <thead><tr><th>PT</th>${WEEK_DAYS.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead>
              <tbody>${renderStaffRows()}</tbody>
            </table>
          </div>
          <div class="pt-staff-actions"><button class="pt-action" onclick="PTAvailabilityOverview.saveStaffAvailability()">Salva disponibilita</button><span id="pt-staff-save-result"></span></div>
        </div>
      </div>`;
    panel.appendChild(wrap);
  }

  function declaredRangesFor(opKey, dayKey) {
    const saved = loadAvailability()[opKey]?.[dayKey] || {};
    return [saved.a, saved.b].map(splitRange).filter(Boolean);
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
      const svc = typeof Services !== 'undefined' && Services.getService ? Services.getService(a.serviceId) : null;
      const aStart = timeToMin(a.startTime);
      const aEnd = aStart + Number(a.durationMin || svc?.durationMin || 60);
      return start < aEnd && end > aStart;
    });
  }

  function runAvailabilitySearch() {
    const serviceId = document.getElementById('pt-search-service')?.value || 'pt11';
    const operatorChoice = document.getElementById('pt-search-operator')?.value || 'all';
    const periodDays = Number(document.getElementById('pt-search-period')?.value || 7);
    const windowRange = splitRange(document.getElementById('pt-search-window')?.value || '07:00-21:00');
    const service = typeof Services !== 'undefined' && Services.getService ? Services.getService(serviceId) : null;
    const duration = Number(service?.durationMin || 60);
    const buffer = Number(service?.bufferMin ?? CONFIG.defaultBufferMin ?? 10);
    const startDate = parseDate(currentDateValue()) || new Date();
    const operators = State.getOperators().filter(op => op.active !== false && (operatorChoice === 'all' || operatorKey(op) === operatorChoice));
    const results = [];

    operators.forEach(op => {
      if (!hasRoleForService(op, serviceId)) return;
      const opKey = operatorKey(op);
      for (let i = 0; i < periodDays; i++) {
        const day = addDays(startDate, i);
        const dayKey = DAY_KEYS[day.getDay()];
        if (dayKey === 'sun') continue;
        declaredRangesFor(opKey, dayKey).forEach(range => {
          const overlap = overlapRange(range, windowRange);
          if (!overlap) return;
          for (let start = overlap.start; start + duration <= overlap.end; start += 30) {
            if (isAvailableByCalendar(op, serviceId, dateStr(day), start, duration, buffer)) {
              results.push({ op, date: dateStr(day), start, end: start + duration });
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
    return `<div class="pt-panel pt-search-panel">
      <div class="pt-panel-title"><h3>Cerca disponibilita reale</h3><span>servizio, PT, periodo e fascia</span></div>
      <div class="pt-search-controls">
        <label>Servizio<select id="pt-search-service">${serviceOptions()}</select></label>
        <label>PT<select id="pt-search-operator">${operatorOptions(true)}</select></label>
        <label>Periodo<select id="pt-search-period">${selectOptions(PERIODS, '7')}</select></label>
        <label>Fascia oraria<select id="pt-search-window">${selectOptions(SEARCH_WINDOWS, '07:00-21:00')}</select></label>
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
    const start = parseDate(packageStart(client));
    const total = Number(client.sessionsTotal ?? client.sessions_total ?? 0);
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
    const operators = State.getOperators();
    const clients = State.getClients().filter(c => c.active !== false && packageTypes(c).length);
    if (!clients.length) return '<tr><td colspan="8" class="pt-muted">Nessun pacchetto PT attivo trovato.</td></tr>';
    return clients.map(client => {
      const op = operatorForClient(client, operators);
      const metrics = metricsFor(client);
      const start = packageStart(client);
      const end = packageEnd(client, metrics);
      const status = renewalStatus(client, metrics, end);
      const total = Number(metrics.total ?? client.sessionsTotal ?? 0) || '-';
      const completed = Number(metrics.completed ?? 0);
      const remaining = metrics.remaining ?? client.sessionsRemaining ?? '-';
      const toSchedule = Number(metrics.toSchedule ?? 0);
      const name = `${client.nome || ''} ${client.cognome || ''}`.trim() || client.id;
      return `<tr><td><strong>${esc(name)}</strong><small>${esc(client.email || '')}</small></td><td>${esc(operatorLabel(op))}<small>${esc(op?.email || client.ptAssegnato || '-')}</small></td><td>${esc(fmtDate(start))}</td><td>${esc(fmtDate(end))}</td><td>${esc(packageTypes(client).join(', ') || '-')}</td><td>${esc(completed)}/${esc(total)} fatte<br><small>${esc(remaining)} residue · ${esc(toSchedule)} da pianificare</small></td><td><span class="pt-status ${status.key}">${status.label}</span></td><td>${status.key === 'danger' ? '<span class="pt-status danger">Cliente da contattare</span>' : '<span class="pt-status read">Monitorare</span>'}</td></tr>`;
    }).join('');
  }

  function renderBusyColumns() {
    const base = parseDate(currentDateValue()) || new Date();
    const offset = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = addDays(base, -offset);
    const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
    const appointments = State.getAppointments().filter(a => a.status !== 'annullato');
    return days.map(day => {
      const ds = dateStr(day);
      const items = appointments.filter(a => a.date === ds).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))).map(a => {
        const op = Services.getOperator(a.operatorId);
        const svc = Services.getService(a.serviceId);
        const clients = (a.clientIds || []).map(Services.clientFullName).join(', ') || 'Blocco agenda';
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
    setTimeout(enhanceStaff, 0);
    setTimeout(enhanceStaff, 250);
  }

  function hookCalendar() {
    if (typeof Calendar === 'undefined' || Calendar.__ptAvailabilityHookedV2) return;
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
    Calendar.__ptAvailabilityHookedV2 = true;
  }

  window.PTAvailabilityOverview = { toggleStaffAvailability, saveStaffAvailability, runAvailabilitySearch };

  document.addEventListener('DOMContentLoaded', () => {
    hookCalendar();
    document.querySelectorAll('[data-view="availability"],[data-view="operators"]').forEach(btn => btn.addEventListener('click', scheduleEnhance));
    scheduleEnhance();
  });
})();