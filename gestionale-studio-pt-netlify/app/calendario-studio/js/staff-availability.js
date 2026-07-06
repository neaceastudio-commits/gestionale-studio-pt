// Disponibilita staff salvate su Supabase.
const StaffAvailability = (() => {
  const LEGACY_KEY = 'neacea_pt_declared_availability_v4';
  const WEEK_DAYS = [
    ['mon', 'Lunedi'],
    ['tue', 'Martedi'],
    ['wed', 'Mercoledi'],
    ['thu', 'Giovedi'],
    ['fri', 'Venerdi'],
    ['sat', 'Sabato'],
  ];
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const HOURLY_SLOTS = Array.from({ length: 14 }, (_, i) => {
    const start = 7 + i;
    return `${String(start).padStart(2, '0')}:00-${String(start + 1).padStart(2, '0')}:00`;
  });

  let availability = {};
  let loaded = false;
  let loading = null;
  let dirty = false;
  let lastSearchHtml = '';

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function parseDate(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
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
    return (Calendar.getCurrentDateStr && Calendar.getCurrentDateStr()) || dateStr(new Date());
  }

  function defaultRangeEnd() {
    return dateStr(addDays(parseDate(currentDateValue()) || new Date(), 6));
  }

  function timeToMin(value) {
    const [h, m] = String(value || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minToTime(min) {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }

  function splitRange(value) {
    const [a, b] = String(value || '').split('-');
    const start = timeToMin(a);
    const end = timeToMin(b);
    return end > start ? { start, end } : null;
  }

  function operatorLabel(operator) {
    return `${operator?.nome || ''} ${operator?.cognome || ''}`.trim() || operator?.email || operator?.id || '-';
  }

  function operatorKey(operator) {
    return String(operator?.id || operator?.email || operatorLabel(operator));
  }

  function activeOperators() {
    return State.getOperators().filter(op => op.active !== false);
  }

  function hasRemoteRows(data) {
    return Object.values(data || {}).some(days => Object.values(days || {}).some(v => Array.isArray(v?.slots) && v.slots.length));
  }

  function mergeAvailability(base, incoming) {
    const merged = { ...(base || {}) };
    Object.entries(incoming || {}).forEach(([opKey, days]) => {
      merged[opKey] = { ...(merged[opKey] || {}) };
      Object.entries(days || {}).forEach(([day, value]) => {
        const current = merged[opKey][day]?.slots || [];
        const next = Array.isArray(value?.slots) ? value.slots : [];
        const slots = [...new Set([...current, ...next])].filter(Boolean).sort();
        merged[opKey][day] = { ...(merged[opKey][day] || {}), ...(value || {}), slots };
      });
    });
    return merged;
  }

  function legacyAvailability() {
    try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}') || {}; }
    catch { return {}; }
  }

  async function ensureLoaded() {
    if (loaded) return availability;
    if (loading) return loading;
    loading = (async () => {
      const remote = await SupabaseSync.pullOperatorAvailability();
      if (remote?.error) throw new Error('Tabella Supabase operator_availability non disponibile. Esegui docs/supabase-operator-availability.sql nel SQL Editor Supabase.');
      availability = remote || {};

      const legacy = legacyAvailability();
      if (hasRemoteRows(legacy)) {
        const merged = mergeAvailability(availability, legacy);
        const migrated = await SupabaseSync.pushOperatorAvailability(merged);
        if (migrated?.error) throw new Error('Migrazione disponibilita non riuscita: ' + migrated.error);
        const verified = await SupabaseSync.pullOperatorAvailability();
        if (verified?.error) throw new Error('Rilettura disponibilita non riuscita: ' + verified.error);
        availability = verified || merged;
        localStorage.removeItem(LEGACY_KEY);
      }

      loaded = true;
      return availability;
    })();
    try { return await loading; }
    finally { loading = null; }
  }

  function slotsFor(opKey, day) {
    return new Set(availability[opKey]?.[day]?.slots || []);
  }

  function savedSlotsForOperator(operator, day) {
    return availability[operatorKey(operator)]?.[day]?.slots || [];
  }

  function renderHourSlots(opKey, day) {
    const selected = slotsFor(opKey, day);
    return `<div class="staff-hour-grid" data-staff-day="1" data-operator-key="${esc(opKey)}" data-day="${esc(day)}">
      ${HOURLY_SLOTS.map(value => `<label class="staff-hour-pill">
        <input type="checkbox" data-hour-slot="1" value="${esc(value)}" ${selected.has(value) ? 'checked' : ''} onchange="StaffAvailability.markDirty()">
        <span>${esc(value.slice(0, 5))}</span>
      </label>`).join('')}
    </div>`;
  }

  function renderSetupInner(target) {
    const operators = activeOperators();
    target.innerHTML = `
      <div class="staff-avail-panel">
        <div class="staff-avail-title">
          <div>
            <h3>Disponibilita collaboratori</h3>
            <p>Fasce da 1 ora salvate su Supabase.</p>
          </div>
          <button class="staff-avail-action" onclick="StaffAvailability.save()">Salva disponibilita</button>
        </div>
        <div class="staff-avail-list">
          ${operators.length ? operators.map(op => {
            const key = operatorKey(op);
            return `<section class="staff-avail-card">
              <div class="staff-avail-person"><strong>${esc(operatorLabel(op))}</strong><small>${esc(op.email || '')}</small></div>
              <div class="staff-day-grid">
                ${WEEK_DAYS.map(([day, label]) => `<div class="staff-day-block">
                  <h4>${esc(label)}</h4>
                  ${renderHourSlots(key, day)}
                </div>`).join('')}
              </div>
            </section>`;
          }).join('') : '<div class="staff-avail-empty">Nessun collaboratore attivo trovato.</div>'}
        </div>
        <div class="staff-avail-footer"><span id="staff-avail-status">${dirty ? 'Modifiche non salvate.' : 'Dati caricati da Supabase.'}</span></div>
      </div>`;
  }

  async function renderSetup() {
    const target = document.getElementById('staff-availability-setup');
    if (!target) return;
    target.innerHTML = '<div class="staff-avail-panel"><div class="staff-avail-empty">Carico disponibilita da Supabase...</div></div>';
    try {
      await ensureLoaded();
      renderSetupInner(target);
    } catch (err) {
      target.innerHTML = `<div class="staff-avail-panel"><div class="staff-avail-error">${esc(err.message || err)}</div></div>`;
    }
  }

  function collectFromDom() {
    const data = {};
    document.querySelectorAll('[data-staff-day]').forEach(dayWrap => {
      const opKey = dayWrap.getAttribute('data-operator-key');
      const day = dayWrap.getAttribute('data-day');
      if (!opKey || !day) return;
      data[opKey] = data[opKey] || {};
      data[opKey][day] = {
        slots: [...dayWrap.querySelectorAll('[data-hour-slot]:checked')].map(input => input.value),
      };
    });
    return data;
  }

  function markDirty() {
    dirty = true;
    const status = document.getElementById('staff-avail-status');
    if (status) status.textContent = 'Modifiche non salvate.';
  }

  async function save() {
    availability = collectFromDom();
    const status = document.getElementById('staff-avail-status');
    if (status) status.textContent = 'Salvataggio su Supabase...';
    const res = await SupabaseSync.pushOperatorAvailability(availability);
    if (res?.error) {
      if (status) status.textContent = 'Errore Supabase: dati non salvati.';
      UI.showToast('Errore Supabase: disponibilita non salvata', 'error');
      console.error('[StaffAvailability] save failed', res.error);
      return;
    }
    const verified = await SupabaseSync.pullOperatorAvailability();
    if (verified?.error) {
      if (status) status.textContent = 'Errore Supabase: dati non verificati.';
      UI.showToast('Errore Supabase: verifica salvataggio fallita', 'error');
      console.error('[StaffAvailability] verify failed', verified.error);
      return;
    }
    availability = verified || availability;
    dirty = false;
    loaded = true;
    if (status) status.textContent = 'Disponibilita salvata su Supabase.';
    UI.showToast('Disponibilita salvata su Supabase', 'success');
  }

  function serviceOptions(selected = 'pt11') {
    return Object.values(CONFIG.SERVICES).map(svc => `<option value="${esc(svc.id)}" ${svc.id === selected ? 'selected' : ''}>${esc(svc.label)}</option>`).join('');
  }

  function operatorOptions(selected = 'all') {
    return '<option value="all">Tutti</option>' + activeOperators().map(op => {
      const key = operatorKey(op);
      return `<option value="${esc(key)}" ${key === selected ? 'selected' : ''}>${esc(operatorLabel(op))}</option>`;
    }).join('');
  }

  function hasRoleForService(operator, serviceId) {
    const svc = Services.getService(serviceId);
    const required = svc?.requiredRoles || svc?.roles || [];
    if (!required.length) return true;
    const roles = Array.isArray(operator.roles) ? operator.roles : [];
    return required.some(role => roles.includes(role));
  }

  function isFreeByCalendar(operator, serviceId, date, start, duration, buffer) {
    const status = Services.getAvailableOperatorsForSlot(serviceId, date, minToTime(start), duration, buffer, null)
      .find(item => String(item.id) === String(operator.id));
    return !!status && status.hasRole !== false && status.available;
  }

  async function runSearch() {
    await ensureLoaded();
    const serviceId = document.getElementById('staff-search-service')?.value || 'pt11';
    const operatorChoice = document.getElementById('staff-search-operator')?.value || 'all';
    const fromDate = parseDate(document.getElementById('staff-search-from')?.value) || new Date();
    const toDate = parseDate(document.getElementById('staff-search-to')?.value) || fromDate;
    const results = [];
    const svc = Services.getService(serviceId);
    const duration = Number(svc?.durationMin || 60);
    const buffer = Number(svc?.bufferMin ?? CONFIG.defaultBufferMin ?? 10);
    const days = Math.floor((toDate - fromDate) / 86400000) + 1;

    if (days <= 0) {
      lastSearchHtml = '<div class="staff-avail-empty">La data finale deve essere uguale o successiva alla data iniziale.</div>';
      renderSearch();
      return;
    }

    activeOperators()
      .filter(op => operatorChoice === 'all' || operatorKey(op) === operatorChoice)
      .filter(op => hasRoleForService(op, serviceId))
      .forEach(op => {
        for (let i = 0; i < days; i++) {
          const day = addDays(fromDate, i);
          const dayKey = DAY_KEYS[day.getDay()];
          if (dayKey === 'sun') continue;
          const date = dateStr(day);
          savedSlotsForOperator(op, dayKey).forEach(slotValue => {
            const slot = splitRange(slotValue);
            if (!slot) return;
            if (isFreeByCalendar(op, serviceId, date, slot.start, duration, buffer)) {
              results.push({ op, date, start: slot.start, end: slot.start + duration });
            }
          });
        }
      });

    lastSearchHtml = results.length
      ? `<div class="staff-result-grid">${results.map(item => `<div class="staff-result"><strong>${esc(operatorLabel(item.op))}</strong><span>${esc(item.date)} · ${esc(minToTime(item.start))}-${esc(minToTime(item.end))}</span></div>`).join('')}</div>`
      : '<div class="staff-avail-empty">Nessuna disponibilita trovata.</div>';
    renderSearch();
  }

  async function renderSearch() {
    const panel = document.getElementById('view-availability');
    if (!panel) return;
    const service = document.getElementById('staff-search-service')?.value || 'pt11';
    const op = document.getElementById('staff-search-operator')?.value || 'all';
    const from = document.getElementById('staff-search-from')?.value || currentDateValue();
    const to = document.getElementById('staff-search-to')?.value || defaultRangeEnd();
    panel.innerHTML = `
      <div class="view-header">
        <div>
          <div class="eyebrow">Calendario</div>
          <div class="page-title">Cerca <em>disponibilita</em></div>
          <div class="page-sub">Dati letti da Supabase, fasce da 1 ora.</div>
        </div>
      </div>
      <div class="staff-avail-panel">
        <div class="staff-search-controls">
          <label>Servizio<select id="staff-search-service">${serviceOptions(service)}</select></label>
          <label>Collaboratore<select id="staff-search-operator">${operatorOptions(op)}</select></label>
          <label>Dal<input type="date" id="staff-search-from" value="${esc(from)}"></label>
          <label>Al<input type="date" id="staff-search-to" value="${esc(to)}"></label>
          <button class="staff-avail-action" onclick="StaffAvailability.runSearch()">Cerca</button>
        </div>
        <div class="staff-search-output">${lastSearchHtml || '<div class="staff-avail-empty">Imposta Dal/Al e cerca le fasce libere.</div>'}</div>
      </div>`;
    try { await ensureLoaded(); }
    catch (err) {
      panel.querySelector('.staff-search-output').innerHTML = `<div class="staff-avail-error">${esc(err.message || err)}</div>`;
    }
  }

  return { renderSetup, renderSearch, runSearch, save, markDirty };
})();

window.StaffAvailability = StaffAvailability;
