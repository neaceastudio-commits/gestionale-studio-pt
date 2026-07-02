// Vista Disponibilita: quadro gestionale + disponibilita PT dichiarata con menu.
(function () {
  const NS = 'pt-availability-overview';
  const AVAILABILITY_KEY = 'neacea_pt_declared_availability_v2';
  const WEEK_DAYS = [
    ['mon', 'Lunedi'],
    ['tue', 'Martedi'],
    ['wed', 'Mercoledi'],
    ['thu', 'Giovedi'],
    ['fri', 'Venerdi'],
    ['sat', 'Sabato'],
    ['sun', 'Domenica']
  ];
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

  function fmtDate(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' }) : '-';
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function currentDateValue() {
    return (typeof Calendar !== 'undefined' && Calendar.getCurrentDateStr ? Calendar.getCurrentDateStr() : '') || dateStr(new Date());
  }

  function currentWeekDays() {
    const base = parseDate(currentDateValue()) || new Date();
    const offset = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = addDays(base, -offset);
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  }

  function operatorLabel(operator) {
    if (!operator) return '-';
    return `${operator.nome || ''} ${operator.cognome || ''}`.trim() || operator.email || operator.id || '-';
  }

  function operatorKey(operator) {
    return String(operator.id || operator.email || operatorLabel(operator));
  }

  function operatorForClient(client, operators) {
    const raw = client.ptAssegnato || client.pt_assegnato || client.operatorId || client.operator_id || '';
    if (!raw) return null;
    const normalized = String(raw).toLowerCase();
    return operators.find(op =>
      String(op.id || '').toLowerCase() === normalized ||
      String(op.email || '').toLowerCase() === normalized ||
      `${op.nome || ''} ${op.cognome || ''}`.trim().toLowerCase() === normalized
    ) || null;
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

  function loadAvailability() {
    try { return JSON.parse(localStorage.getItem(AVAILABILITY_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveAvailability(data) {
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(data));
  }

  function operatorOptions() {
    return State.getOperators().filter(op => op.active !== false).map(op =>
      `<option value="${esc(operatorKey(op))}">${esc(operatorLabel(op))}${op.email ? ' · ' + esc(op.email) : ''}</option>`
    ).join('');
  }

  function dayOptions() {
    return WEEK_DAYS.map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join('');
  }

  function slotOptions(selected = '') {
    return TIME_SLOTS.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }

  function addDeclaredAvailability() {
    const opKey = document.getElementById('pt-av-op')?.value || '';
    const day = document.getElementById('pt-av-day')?.value || '';
    const slot = document.getElementById('pt-av-slot')?.value || '';
    if (!opKey || !day) return;
    const data = loadAvailability();
    data[opKey] = data[opKey] || {};
    data[opKey][day] = slot;
    saveAvailability(data);
    enhanceAvailability();
  }

  function renderDeclaredAvailability() {
    const data = loadAvailability();
    const operators = State.getOperators().filter(op => op.active !== false);
    const rows = operators.map(op => {
      const key = operatorKey(op);
      const days = WEEK_DAYS.map(([day, label]) => {
        const value = data[key]?.[day] || '';
        const text = value || 'Non disponibile';
        return `<span class="pt-av-chip ${value ? 'ok' : 'off'}"><strong>${esc(label.slice(0, 3))}</strong>${esc(text)}</span>`;
      }).join('');
      return `<div class="pt-av-row"><div><strong>${esc(operatorLabel(op))}</strong><small>${esc(op.email || '')}</small></div><div>${days}</div></div>`;
    }).join('');
    return rows || '<div class="pt-muted">Nessun PT/staff attivo trovato.</div>';
  }

  function renderAvailabilityBox() {
    return `<div class="pt-panel pt-av-panel">
      <div class="pt-panel-title"><h3>Disponibilita PT dichiarata</h3><span>per assegnare clienti</span></div>
      <div class="pt-av-controls">
        <label>PT<select id="pt-av-op">${operatorOptions()}</select></label>
        <label>Giorno<select id="pt-av-day">${dayOptions()}</select></label>
        <label>Fascia oraria<select id="pt-av-slot">${slotOptions()}</select></label>
        <button class="pt-action" onclick="PTAvailabilityOverview.addDeclaredAvailability()">Salva fascia</button>
      </div>
      <div class="pt-av-summary">${renderDeclaredAvailability()}</div>
    </div>`;
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
      return `<tr>
        <td><strong>${esc(name)}</strong><small>${esc(client.email || '')}</small></td>
        <td>${esc(operatorLabel(op))}<small>${esc(op?.email || client.ptAssegnato || '-')}</small></td>
        <td>${esc(fmtDate(start))}</td>
        <td>${esc(fmtDate(end))}</td>
        <td>${esc(packageTypes(client).join(', ') || '-')}</td>
        <td>${esc(completed)}/${esc(total)} fatte<br><small>${esc(remaining)} residue · ${esc(toSchedule)} da pianificare</small></td>
        <td><span class="pt-status ${status.key}">${status.label}</span></td>
        <td>${status.key === 'danger' ? '<span class="pt-status danger">Cliente da contattare</span>' : '<span class="pt-status read">Monitorare</span>'}</td>
      </tr>`;
    }).join('');
  }

  function renderBusyColumns() {
    const days = currentWeekDays();
    const appointments = State.getAppointments().filter(a => a.status !== 'annullato');
    return days.map(day => {
      const ds = dateStr(day);
      const items = appointments.filter(a => a.date === ds).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))).map(a => {
        const op = Services.getOperator(a.operatorId);
        const svc = Services.getService(a.serviceId);
        const clients = (a.clientIds || []).map(Services.clientFullName).join(', ') || 'Blocco agenda';
        const end = Services.minToTime(Services.timeToMin(a.startTime) + Number(a.durationMin || svc?.durationMin || 60));
        return `<div class="pt-event" style="border-left-color:${esc(svc?.color || '#1f6848')}"><strong>${esc(String(a.startTime || '').slice(0, 5))}-${esc(end)}</strong><span>${esc(operatorLabel(op))}</span><em>${esc(clients)}</em></div>`;
      }).join('') || '<div class="pt-empty">Nessun impegno</div>';
      return `<div class="pt-day"><h4>${day.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h4>${items}</div>`;
    }).join('');
  }

  function enhanceAvailability() {
    const panel = document.getElementById('view-availability');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${NS}`).forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = NS;
    wrap.innerHTML = `${renderAvailabilityBox()}
      <div class="pt-panel"><div class="pt-panel-title"><h3>Pacchetti e rinnovi</h3><span>quadro clienti</span></div><div class="pt-table-wrap"><table class="pt-package-table"><thead><tr><th>Cliente</th><th>PT</th><th>Inizio</th><th>Fine stimata</th><th>Pacchetto</th><th>Sedute</th><th>Stato</th><th>Follow-up</th></tr></thead><tbody>${renderPackageRows()}</tbody></table></div></div>
      <div class="pt-panel"><div class="pt-panel-title"><h3>Orari impegnati della settimana</h3><span>appuntamenti reali</span></div><div class="pt-week-grid">${renderBusyColumns()}</div></div>`;
    panel.appendChild(wrap);
  }

  function scheduleEnhance() {
    setTimeout(enhanceAvailability, 0);
    setTimeout(enhanceAvailability, 250);
  }

  function hookCalendar() {
    if (typeof Calendar === 'undefined' || Calendar.__ptAvailabilityHooked) return;
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
    Calendar.__ptAvailabilityHooked = true;
  }

  window.PTAvailabilityOverview = { addDeclaredAvailability };

  document.addEventListener('DOMContentLoaded', () => {
    hookCalendar();
    document.querySelectorAll('[data-view="availability"]').forEach(btn => btn.addEventListener('click', scheduleEnhance));
    scheduleEnhance();
  });
})();
