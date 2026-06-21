const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const state = {
  mode: 'phase1',
  operators: [],
  clients: [],
  metrics: [],
  sessions: [],
  selectedOperatorId: '',
  selectedClientId: '',
};

const els = {};

function endpoint(table, query = '') {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`;
}

async function sb(table, query = '', options = {}) {
  const res = await fetch(endpoint(table, query), {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text || res.statusText);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fullName(item) {
  return [item?.nome, item?.cognome].filter(Boolean).join(' ') || '-';
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function alertClass(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function showError(message) {
  els.errorBox.textContent = message;
  els.errorBox.classList.remove('hidden');
}

function clearError() {
  els.errorBox.textContent = '';
  els.errorBox.classList.add('hidden');
}

async function loadPhase1() {
  const [roles, metrics, clients, sessions] = await Promise.all([
    sb('operator_effective_roles', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('pt_dashboard_metrics', '?select=*'),
    sb('pt_client_overview', '?select=*&order=cognome.asc,nome.asc'),
    sb('pt_calendar_sessions', '?select=*&order=date.asc,start_time.asc'),
  ]);

  state.mode = 'phase1';
  state.operators = roles.map((op) => ({
    id: op.operator_id,
    nome: op.nome,
    cognome: op.cognome,
    email: op.email,
    roles: op.system_roles || [],
  }));
  state.metrics = metrics;
  state.clients = clients;
  state.sessions = sessions;
}

async function loadFallback() {
  const [operators, clients, appointments, acquisitions] = await Promise.all([
    sb('operators', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('clients', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('appointments', '?select=*&order=date.asc,start_time.asc'),
    sb('acquisizioni', '?select=*&order=data_acquisizione.desc'),
  ]);

  state.mode = 'fallback';
  state.operators = operators
    .filter((op) => Array.isArray(op.roles) && op.roles.includes('PT'))
    .map((op) => ({ ...op, roles: op.roles || [] }));

  state.clients = clients.map((client) => {
    const acq = acquisitions.find((item) => {
      const emailMatch = client.email && item.email && client.email.toLowerCase() === item.email.toLowerCase();
      const phoneMatch = client.telefono && item.telefono && client.telefono === item.telefono;
      const nameMatch = `${client.nome} ${client.cognome}`.toLowerCase() === `${item.nome} ${item.cognome}`.toLowerCase();
      return emailMatch || phoneMatch || nameMatch;
    });

    return {
      assignment_id: `legacy_${client.id}`,
      trainer_id: client.pt_assegnato || '',
      client_id: client.id,
      nome: client.nome,
      cognome: client.cognome,
      telefono: client.telefono,
      email: client.email,
      professione: client.professione,
      obiettivo: client.obiettivo,
      note_cliente: client.notes,
      data_acquisizione: acq?.data_acquisizione || '',
      anamnesi_obiettivo: acq?.obiettivo || '',
      obiettivo_libero: acq?.obiettivo_libero || '',
      esperienza: acq?.esperienza || '',
      livello_attivita_fisica: acq?.inattivo || '',
      sport: acq?.sport || '',
      non_funzionato: acq?.non_funzionato || '',
      note_operative: acq?.impressioni || '',
      patologie: null,
      farmaci: null,
      infortuni: null,
      limitazioni: null,
      stress: null,
      sonno: null,
      controindicazioni: null,
      alerts: [],
      alert_count: 0,
      critical_alert_count: 0,
    };
  });

  state.sessions = appointments.flatMap((appt) => {
    const clientIds = Array.isArray(appt.client_ids) ? appt.client_ids : [];
    return clientIds.map((clientId) => {
      const client = clients.find((item) => item.id === clientId) || {};
      const trainer = operators.find((item) => item.id === appt.operator_id) || {};
      return {
        appointment_id: appt.id,
        trainer_id: appt.operator_id,
        trainer_nome: trainer.nome,
        trainer_cognome: trainer.cognome,
        client_id: clientId,
        nome: client.nome,
        cognome: client.cognome,
        service_id: appt.service_id,
        date: appt.date,
        start_time: appt.start_time,
        duration_min: appt.duration_min,
        status: appt.status,
        notes: appt.notes,
      };
    });
  });

  state.metrics = buildFallbackMetrics();
}

function buildFallbackMetrics() {
  const start = todayIso();
  const end = addDaysIso(7);
  return state.operators.map((op) => {
    const assigned = state.clients.filter((client) => client.trainer_id === op.id);
    const sessions = state.sessions.filter((session) => session.trainer_id === op.id && session.status !== 'annullato');
    return {
      trainer_id: op.id,
      trainer_nome: op.nome,
      trainer_cognome: op.cognome,
      clienti_assegnati: assigned.length,
      sedute_oggi: sessions.filter((session) => session.date === start).length,
      sedute_settimana: sessions.filter((session) => session.date >= start && session.date < end).length,
      clienti_senza_programma: 0,
      clienti_da_rivalutare: 0,
    };
  });
}

async function loadData() {
  clearError();
  try {
    await loadPhase1();
    els.migrationNotice.classList.add('hidden');
  } catch (error) {
    await loadFallback();
    els.migrationNotice.classList.remove('hidden');
  }

  if (!state.selectedOperatorId && state.operators.length) {
    state.selectedOperatorId = state.operators[0].id;
  }
}

function selectedOperator() {
  return state.operators.find((op) => op.id === state.selectedOperatorId) || null;
}

function operatorClients() {
  const q = els.clientSearch.value.trim().toLowerCase();
  const alertFilter = els.alertFilter.value;
  return state.clients
    .filter((client) => !state.selectedOperatorId || client.trainer_id === state.selectedOperatorId)
    .filter((client) => {
      if (!q) return true;
      return `${client.nome || ''} ${client.cognome || ''} ${client.email || ''} ${client.telefono || ''}`
        .toLowerCase()
        .includes(q);
    })
    .filter((client) => {
      if (!alertFilter) return true;
      if (alertFilter === 'none') return Number(client.alert_count || 0) === 0;
      return (client.alerts || []).some((alert) => alert.severity === alertFilter);
    });
}

function operatorSessions(days = 14) {
  const end = addDaysIso(days);
  return state.sessions
    .filter((session) => !state.selectedOperatorId || session.trainer_id === state.selectedOperatorId)
    .filter((session) => session.status !== 'annullato')
    .filter((session) => session.date >= todayIso() && session.date <= end)
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

function renderOperators() {
  const options = state.operators
    .map((op) => `<option value="${esc(op.id)}">${esc(fullName(op))}</option>`)
    .join('');

  els.operatorSelect.innerHTML = options || '<option value="">Nessun PT trovato</option>';
  els.assignTrainer.innerHTML = options || '<option value="">Nessun PT trovato</option>';
  els.operatorSelect.value = state.selectedOperatorId;
  els.assignTrainer.value = state.selectedOperatorId;

  const clientOptions = state.clients
    .slice()
    .sort((a, b) => fullName(a).localeCompare(fullName(b)))
    .map((client) => `<option value="${esc(client.client_id)}">${esc(fullName(client))}</option>`)
    .join('');
  els.assignClient.innerHTML = clientOptions || '<option value="">Nessun cliente trovato</option>';
}

function renderDashboard() {
  const metrics = state.metrics.find((item) => item.trainer_id === state.selectedOperatorId) || {};
  els.kpiClients.textContent = metrics.clienti_assegnati ?? operatorClients().length;
  els.kpiToday.textContent = metrics.sedute_oggi ?? 0;
  els.kpiWeek.textContent = metrics.sedute_settimana ?? 0;
  els.kpiReview.textContent = metrics.clienti_da_rivalutare ?? 0;

  const clientsWithAlerts = operatorClients()
    .filter((client) => Number(client.alert_count || 0) > 0)
    .slice(0, 6);

  els.alertList.innerHTML = clientsWithAlerts.length
    ? clientsWithAlerts.map(renderAlertClient).join('')
    : '<div class="empty">Nessun alert attivo</div>';

  const sessions = operatorSessions(10).slice(0, 6);
  els.nextSessions.innerHTML = sessions.length
    ? sessions.map(renderSessionCard).join('')
    : '<div class="empty">Nessuna seduta in calendario</div>';
}

function renderAlertClient(client) {
  const firstAlert = (client.alerts || [])[0] || {};
  return `
    <article class="row-card">
      <div class="row-title">
        <span>${esc(fullName(client))}</span>
        <span class="alert-pill ${alertClass(firstAlert.severity)}">${esc(firstAlert.severity || 'alert')}</span>
      </div>
      <div class="row-sub">${esc(firstAlert.title || 'Alert cliente')} · ${esc(firstAlert.description || '')}</div>
    </article>
  `;
}

function renderSessionCard(session) {
  return `
    <article class="row-card">
      <div class="row-title">
        <span>${esc(formatDate(session.date))} · ${esc(String(session.start_time || '').slice(0, 5))}</span>
        <span class="pill">${esc(session.status || 'prenotato')}</span>
      </div>
      <div class="row-sub">${esc(fullName(session))} · ${esc(session.service_id || 'Seduta')}</div>
    </article>
  `;
}

function renderClients() {
  const clients = operatorClients();
  els.clientCount.textContent = clients.length;
  els.clientList.innerHTML = clients.length
    ? clients.map(renderClientRow).join('')
    : '<div class="empty">Nessun cliente assegnato</div>';

  if (!clients.some((client) => client.client_id === state.selectedClientId)) {
    state.selectedClientId = clients[0]?.client_id || '';
  }

  renderClientDetail();
}

function renderClientRow(client) {
  const selected = client.client_id === state.selectedClientId ? ' selected' : '';
  const alert = Number(client.critical_alert_count || 0) > 0
    ? '<span class="alert-pill critical">Critico</span>'
    : Number(client.alert_count || 0) > 0
      ? '<span class="alert-pill warning">Alert</span>'
      : '<span class="pill">OK</span>';

  return `
    <article class="row-card clickable${selected}" data-client-id="${esc(client.client_id)}">
      <div class="row-title">
        <span>${esc(fullName(client))}</span>
        ${alert}
      </div>
      <div class="row-sub">${esc(client.telefono || '-')} · ${esc(client.email || '-')}</div>
    </article>
  `;
}

function field(label, value) {
  return `
    <div class="field">
      <span>${esc(label)}</span>
      <strong>${esc(value || '-')}</strong>
    </div>
  `;
}

function renderClientDetail() {
  const client = state.clients.find((item) => item.client_id === state.selectedClientId);
  if (!client) {
    els.clientDetail.innerHTML = '<div class="detail-empty">Seleziona un cliente</div>';
    return;
  }

  const alerts = client.alerts || [];
  els.clientDetail.innerHTML = `
    <div class="detail">
      <div class="detail-header">
        <div>
          <h3>${esc(fullName(client))}</h3>
          <p class="row-sub">${esc(client.obiettivo || 'Obiettivo non indicato')}</p>
        </div>
        <span class="pill">${esc(selectedOperator() ? fullName(selectedOperator()) : 'PT')}</span>
      </div>

      <div class="detail-grid">
        ${field('Telefono', client.telefono)}
        ${field('Email', client.email)}
        ${field('Professione', client.professione)}
        ${field('Obiettivo', client.obiettivo || client.anamnesi_obiettivo)}
      </div>

      <div class="section-title">Anamnesi disponibile</div>
      <div class="detail-grid">
        ${field('Esperienza', client.esperienza)}
        ${field('Attivita fisica', client.livello_attivita_fisica)}
        ${field('Sport', client.sport)}
        ${field('Non funzionato', client.non_funzionato)}
        ${field('Patologie', client.patologie)}
        ${field('Farmaci', client.farmaci)}
        ${field('Infortuni', client.infortuni)}
        ${field('Limitazioni', client.limitazioni)}
        ${field('Stress', client.stress)}
        ${field('Sonno', client.sonno)}
      </div>

      <div class="section-title">Alert</div>
      <div class="stack">
        ${alerts.length ? alerts.map(renderAlertItem).join('') : '<div class="empty">Nessun alert attivo</div>'}
      </div>

      <div class="section-title">Note operative</div>
      <div class="row-card">${esc(client.note_operative || client.note_cliente || 'Nessuna nota')}</div>
    </div>
  `;
}

function renderAlertItem(alert) {
  return `
    <article class="row-card">
      <div class="row-title">
        <span>${esc(alert.title || alert.type || 'Alert')}</span>
        <span class="alert-pill ${alertClass(alert.severity)}">${esc(alert.severity || 'info')}</span>
      </div>
      <div class="row-sub">${esc(alert.description || alert.source || '')}</div>
    </article>
  `;
}

function renderCalendar() {
  const sessions = operatorSessions(30);
  els.calendarCount.textContent = sessions.length;
  if (!sessions.length) {
    els.calendarList.innerHTML = '<div class="empty">Nessuna seduta futura</div>';
    return;
  }

  let lastDate = '';
  els.calendarList.innerHTML = sessions.map((session) => {
    const header = session.date !== lastDate ? `<div class="day-title">${esc(formatDate(session.date))}</div>` : '';
    lastDate = session.date;
    return `${header}${renderSessionCard(session)}`;
  }).join('');
}

async function assignClient() {
  if (state.mode !== 'phase1') return;
  const trainerId = els.assignTrainer.value;
  const clientId = els.assignClient.value;
  if (!trainerId || !clientId) return;

  await sb('trainer_client_assignments', '?on_conflict=trainer_id,client_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: `tca_manual_${trainerId}_${clientId}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      trainer_id: trainerId,
      client_id: clientId,
      assignment_source: 'manual',
      active: true,
      notes: 'Assegnazione manuale da Portale PT Fase 1',
    },
  });
  await refresh();
}

function renderAssignments() {
  els.assignButton.disabled = state.mode !== 'phase1';
}

function render() {
  renderOperators();
  renderDashboard();
  renderClients();
  renderCalendar();
  renderAssignments();
}

async function refresh() {
  await loadData();
  render();
}

function bindEvents() {
  document.querySelectorAll('.nav-tab').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.view).classList.add('active');
    });
  });

  els.operatorSelect.addEventListener('change', () => {
    state.selectedOperatorId = els.operatorSelect.value;
    state.selectedClientId = '';
    render();
  });

  els.clientSearch.addEventListener('input', renderClients);
  els.alertFilter.addEventListener('change', renderClients);

  els.clientList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-client-id]');
    if (!row) return;
    state.selectedClientId = row.dataset.clientId;
    renderClients();
  });

  els.assignTrainer.addEventListener('change', () => {
    state.selectedOperatorId = els.assignTrainer.value;
    render();
  });

  els.assignButton.addEventListener('click', async () => {
    try {
      clearError();
      await assignClient();
    } catch (error) {
      showError(`Assegnazione non riuscita: ${error.message}`);
    }
  });
}

function cacheElements() {
  [
    'operatorSelect',
    'migrationNotice',
    'errorBox',
    'kpiClients',
    'kpiToday',
    'kpiWeek',
    'kpiReview',
    'alertList',
    'nextSessions',
    'clientSearch',
    'alertFilter',
    'clientCount',
    'clientList',
    'clientDetail',
    'calendarCount',
    'calendarList',
    'assignTrainer',
    'assignClient',
    'assignButton',
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  bindEvents();
  try {
    await refresh();
  } catch (error) {
    showError(`Caricamento non riuscito: ${error.message}`);
  }
});
