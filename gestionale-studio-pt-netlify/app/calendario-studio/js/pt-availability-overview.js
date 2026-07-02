// Estensione vista Disponibilita: pacchetti PT, rinnovi, orari impegnati e ricerca slot liberi.
(function () {
  const NS = 'pt-availability-overview';
  let lastResultsHtml = '';

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

  function frequencyPerWeek(value) {
    const raw = String(value || '').toLowerCase();
    const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
    if (n > 0) return n;
    if (raw.includes('bisettimanale')) return 0.5;
    if (raw.includes('mensile')) return 0.25;
    return 1;
  }

  function operatorLabel(operator) {
    if (!operator) return '-';
    return `${operator.nome || ''} ${operator.cognome || ''}`.trim() || operator.email || operator.id || '-';
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

  function packageEnd(client, metrics) {
    const explicit = client.packageEnd || client.package_end || client.dataFine || client.data_fine || '';
    if (explicit) return explicit;
    if (metrics?.projectedEnd) return metrics.projectedEnd;
    const start = parseDate(packageStart(client));
    const total = Number(client.sessionsTotal ?? client.sessions_total ?? 0);
    if (!start || !total) return '';
    const weeks = Math.max(1, Math.ceil(total / frequencyPerWeek(client.packageFrequency || client.package_frequency)));
    return dateStr(addDays(start, weeks * 7));
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

  function currentWeekDays() {
    const base = parseDate(typeof Calendar !== 'undefined' && Calendar.getCurrentDateStr ? Calendar.getCurrentDateStr() : '') || new Date();
    const offset = base.getDay() === 0 ? 6 : base.getDay() - 1;
    const monday = addDays(base, -offset);
    return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  }

  function serviceOptions() {
    return Object.values(CONFIG.SERVICES)
      .filter(s => !s.isBlock)
      .map(s => `<option value="${esc(s.id)}" ${s.id === 'pt11' ? 'selected' : ''}>${esc(s.label)}</option>`)
      .join('');
  }

  function operatorOptions() {
    const ops = State.getOperators().filter(op => op.active !== false);
    return '<option value="">Qualsiasi PT compatibile</option>' + ops.map(op =>
      `<option value="${esc(op.id)}">${esc(operatorLabel(op))}${op.email ? ' · ' + esc(op.email) : ''}</option>`
    ).join('');
  }

  function findFreeSlots() {
    const serviceId = document.getElementById('pt-free-service')?.value || 'pt11';
    const operatorId = document.getElementById('pt-free-operator')?.value || '';
    const horizonDays = Number(document.getElementById('pt-free-days')?.value || 14);
    const maxResults = Number(document.getElementById('pt-free-limit')?.value || 12);
    const svc = Services.getService(serviceId) || CONFIG.SERVICES.pt11;
    const start = parseDate(typeof Calendar !== 'undefined' && Calendar.getCurrentDateStr ? Calendar.getCurrentDateStr() : '') || new Date();
    const now = new Date();
    const startMin = Services.timeToMin(CONFIG.workHours.start);
    const firstFullHourMin = Math.ceil(startMin / 60) * 60;
    const endMin = Services.timeToMin(CONFIG.workHours.end);
    const step = 60;
    const duration = Number(svc.durationMin || 60);
    const buffer = Number(svc.bufferMin ?? CONFIG.defaultBufferMin ?? 10);
    const out = [];

    for (let d = 0; d < horizonDays && out.length < maxResults; d += 1) {
      const day = addDays(start, d);
      const ds = dateStr(day);
      const isToday = ds === dateStr(now);
      for (let min = firstFullHourMin; min + duration <= endMin && out.length < maxResults; min += step) {
        if (isToday && min <= now.getHours() * 60 + now.getMinutes()) continue;
        const time = Services.minToTime(min);
        const availability = Services.getAvailableOperatorsForSlot(serviceId, ds, time, duration, buffer, null)
          .filter(item => item.available && item.hasRole);
        const candidates = operatorId ? availability.filter(item => item.id === operatorId) : availability;
        candidates.forEach(op => {
          if (out.length < maxResults) out.push({ date: ds, time, end: Services.minToTime(min + duration), op, svc });
        });
      }
    }

    lastResultsHtml = out.length ? out.map(slot => `
      <div class="pt-free-result">
        <div>
          <strong>${esc(fmtDate(slot.date))} · ${esc(slot.time)}-${esc(slot.end)}</strong>
          <span>${esc(slot.svc.label)} · ${esc(operatorLabel(slot.op))}${slot.op.email ? ' · ' + esc(slot.op.email) : ''}</span>
        </div>
        <button class="pt-free-book" onclick="App.openNewAppointment('${esc(slot.date)}', null, '${esc(slot.time)}', '${esc(slot.svc.id)}')">Crea</button>
      </div>`).join('') : '<div class="pt-free-empty">Nessuno slot libero trovato con questi filtri.</div>';

    const target = document.getElementById('pt-free-results');
    if (target) target.innerHTML = lastResultsHtml;
  }

  function renderFinder() {
    return `
      <div class="pt-panel pt-free-finder">
        <div class="pt-panel-title">
          <h3>Trova primo slot libero</h3>
          <span>per rispondere subito al cliente</span>
        </div>
        <div class="pt-free-controls">
          <label>Servizio<select id="pt-free-service">${serviceOptions()}</select></label>
          <label>PT<select id="pt-free-operator">${operatorOptions()}</select></label>
          <label>Periodo<select id="pt-free-days"><option value="7">Prossimi 7 giorni</option><option value="14" selected>Prossimi 14 giorni</option><option value="30">Prossimi 30 giorni</option></select></label>
          <label>Risultati<select id="pt-free-limit"><option value="8">8 slot</option><option value="12" selected>12 slot</option><option value="20">20 slot</option></select></label>
          <button class="pt-free-search" onclick="PTAvailabilityOverview.findSlots()">Cerca slot</button>
        </div>
        <div id="pt-free-results" class="pt-free-results">${lastResultsHtml || '<div class="pt-free-empty">Scegli servizio e PT, poi cerca gli orari liberi da proporre.</div>'}</div>
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
      return `
        <tr>
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
      const dayAppts = appointments.filter(a => a.date === ds).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
      const items = dayAppts.length ? dayAppts.map(a => {
        const op = Services.getOperator(a.operatorId);
        const svc = Services.getService(a.serviceId);
        const clients = (a.clientIds || []).map(Services.clientFullName).join(', ') || 'Blocco agenda';
        const end = Services.minToTime(Services.timeToMin(a.startTime) + Number(a.durationMin || svc?.durationMin || 60));
        return `<div class="pt-event" style="border-left-color:${esc(svc?.color || '#1f6848')}">
          <strong>${esc(String(a.startTime || '').slice(0, 5))}-${esc(end)}</strong>
          <span>${esc(operatorLabel(op))}</span>
          <em>${esc(clients)}</em>
        </div>`;
      }).join('') : '<div class="pt-empty">Nessun impegno</div>';
      return `<div class="pt-day"><h4>${day.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</h4>${items}</div>`;
    }).join('');
  }

  function enhanceAvailability() {
    const panel = document.getElementById('view-availability');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${NS}`).forEach(el => el.remove());

    const operators = State.getOperators().filter(op => op.active !== false);
    const clients = State.getClients().filter(c => c.active !== false);
    const appts = State.getAppointments().filter(a => a.status !== 'annullato');

    const wrap = document.createElement('div');
    wrap.className = NS;
    wrap.innerHTML = `
      <div class="pt-overview-head">
        <div>
          <div class="eyebrow">Disponibilita PT</div>
          <h3>Quadro mensile pacchetti e orari impegnati</h3>
          <p>Usa email/operatori gia presenti nel calendario. I PT modificano solo record collegati alla loro email; il resto resta in visualizzazione.</p>
        </div>
        <div class="pt-kpis">
          <div><strong>${operators.length}</strong><span>PT/staff attivi</span></div>
          <div><strong>${clients.length}</strong><span>clienti attivi</span></div>
          <div><strong>${appts.length}</strong><span>impegni futuri/storici</span></div>
        </div>
      </div>
      ${renderFinder()}
      <div class="pt-panel">
        <div class="pt-panel-title">
          <h3>Pacchetti e rinnovi</h3>
          <span>vista gestionale mensile</span>
        </div>
        <div class="pt-table-wrap">
          <table class="pt-package-table">
            <thead><tr><th>Cliente</th><th>PT</th><th>Inizio</th><th>Fine stimata</th><th>Pacchetto</th><th>Sedute</th><th>Stato</th><th>Follow-up</th></tr></thead>
            <tbody>${renderPackageRows()}</tbody>
          </table>
        </div>
      </div>
      <div class="pt-panel">
        <div class="pt-panel-title">
          <h3>Orari impegnati della settimana</h3>
          <span>derivati dagli appuntamenti reali</span>
        </div>
        <div class="pt-week-grid">${renderBusyColumns()}</div>
      </div>`;

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

  window.PTAvailabilityOverview = { findSlots: findFreeSlots };

  document.addEventListener('DOMContentLoaded', () => {
    hookCalendar();
    document.querySelectorAll('[data-view="availability"]').forEach(btn => btn.addEventListener('click', scheduleEnhance));
    scheduleEnhance();
  });
})();
