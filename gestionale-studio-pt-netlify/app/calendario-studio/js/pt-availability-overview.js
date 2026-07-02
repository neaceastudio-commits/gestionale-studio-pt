// Sezione Staff: disponibilita settimanale dichiarata dai PT.
(function () {
  const STAFF_NS = 'pt-staff-availability-week';
  const STAFF_AVAILABILITY_KEY = 'neacea_staff_declared_availability_v1';
  const WEEK_DAYS = [
    ['mon', 'Lunedi'],
    ['tue', 'Martedi'],
    ['wed', 'Mercoledi'],
    ['thu', 'Giovedi'],
    ['fri', 'Venerdi'],
    ['sat', 'Sabato'],
    ['sun', 'Domenica']
  ];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function operatorLabel(operator) {
    if (!operator) return '-';
    return `${operator.nome || ''} ${operator.cognome || ''}`.trim() || operator.email || operator.id || '-';
  }

  function operatorKey(operator) {
    return String(operator.id || operator.email || operatorLabel(operator));
  }

  function loadStaffAvailability() {
    try { return JSON.parse(localStorage.getItem(STAFF_AVAILABILITY_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  function saveStaffAvailability() {
    const data = loadStaffAvailability();
    document.querySelectorAll('[data-staff-availability]').forEach(input => {
      const opId = input.getAttribute('data-operator-id');
      const day = input.getAttribute('data-day');
      if (!opId || !day) return;
      data[opId] = data[opId] || {};
      data[opId][day] = input.value.trim();
    });
    localStorage.setItem(STAFF_AVAILABILITY_KEY, JSON.stringify(data));
    const msg = document.getElementById('pt-staff-availability-save-result');
    if (msg) msg.textContent = 'Disponibilita salvata.';
  }

  function renderRows() {
    const availability = loadStaffAvailability();
    const operators = State.getOperators().filter(op => op.active !== false);
    if (!operators.length) return '<tr><td colspan="8" class="pt-muted">Nessun PT/staff attivo trovato.</td></tr>';

    return operators.map(op => {
      const key = operatorKey(op);
      const cells = WEEK_DAYS.map(([day, label]) => {
        const value = availability[key]?.[day] || '';
        return `<td><label><span>${label}</span><input data-staff-availability="1" data-operator-id="${esc(key)}" data-day="${esc(day)}" value="${esc(value)}" placeholder="es. 07:00-12:00"></label></td>`;
      }).join('');
      return `<tr><th><strong>${esc(operatorLabel(op))}</strong><small>${esc(op.email || '')}</small></th>${cells}</tr>`;
    }).join('');
  }

  function enhanceStaff() {
    const panel = document.getElementById('view-operators');
    if (!panel || !panel.classList.contains('active')) return;
    panel.querySelectorAll(`.${STAFF_NS}`).forEach(el => el.remove());

    const wrap = document.createElement('div');
    wrap.className = STAFF_NS;
    wrap.innerHTML = `
      <div class="pt-staff-panel">
        <div class="pt-staff-title">
          <div>
            <h3>Disponibilita settimanale PT</h3>
            <p>Inserisci qui gli orari di lavoro che ogni PT ti comunica. Servono per capire a chi assegnare nuovi clienti e poi popolare il calendario.</p>
          </div>
          <button class="pt-staff-save" onclick="PTAvailabilityOverview.saveStaffAvailability()">Salva disponibilita</button>
        </div>
        <div id="pt-staff-availability-save-result" class="pt-staff-save-result"></div>
        <div class="pt-staff-table-wrap">
          <table class="pt-staff-availability-table">
            <thead><tr><th>PT</th>${WEEK_DAYS.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead>
            <tbody>${renderRows()}</tbody>
          </table>
        </div>
      </div>`;
    panel.appendChild(wrap);
  }

  function scheduleEnhance() {
    setTimeout(enhanceStaff, 0);
    setTimeout(enhanceStaff, 250);
  }

  function hookCalendar() {
    if (typeof Calendar === 'undefined' || Calendar.__ptStaffAvailabilityHooked) return;
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
    Calendar.__ptStaffAvailabilityHooked = true;
  }

  window.PTAvailabilityOverview = { saveStaffAvailability };

  document.addEventListener('DOMContentLoaded', () => {
    hookCalendar();
    document.querySelectorAll('[data-view="operators"]').forEach(btn => btn.addEventListener('click', scheduleEnhance));
    scheduleEnhance();
  });
})();
