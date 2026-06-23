const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const SERVICES = {
  pt11: { id: 'pt11', label: 'PT 1:1', durationMin: 60, maxClients: 1 },
  pt12: { id: 'pt12', label: 'PT 1:2', durationMin: 60, maxClients: 2 },
  nutrizione: { id: 'nutrizione', label: 'Nutrizione - 1a visita', durationMin: 60, maxClients: 1 },
  check: { id: 'check', label: 'Check nutrizionale', durationMin: 30, maxClients: 1 },
  visbody: { id: 'visbody', label: 'Visbody', durationMin: 30, maxClients: 1 },
  baiobit: { id: 'baiobit', label: 'Baiobit', durationMin: 30, maxClients: 1 },
  circuit: { id: 'circuit', label: 'Circuit Training', durationMin: 60, maxClients: 6 },
  blocco: { id: 'blocco', label: 'Blocco agenda', durationMin: 60, maxClients: 0 },
};

const STATUS_LABELS = {
  prenotato: 'Prenotato',
  fatto: 'Fatto',
  annullato: 'Annullato',
  noshow: 'No-show',
};

const SERVICE_ALIASES = {
  'pt 1:1': 'pt11',
  'pt 1-1': 'pt11',
  'pt_1_1': 'pt11',
  'pt11': 'pt11',
  'pt 1:2': 'pt12',
  'pt 1-2': 'pt12',
  'pt_1_2': 'pt12',
  'pt12': 'pt12',
  'nutrizione': 'nutrizione',
  'check nutrizionale': 'check',
  'check': 'check',
  'visbody': 'visbody',
  'baiobit': 'baiobit',
  'circuit': 'circuit',
  'circuit training': 'circuit',
  'blocco': 'blocco',
  'blocco agenda': 'blocco',
};

const state = {
  operators: [],
  clients: [],
  sessions: [],
  programs: [],
  currentPt: null,
  selectedClientId: '',
  selectedProgramId: '',
  calendarView: 'week',
  calendarReference: todayIso(),
  myReference: todayIso(),
  programSessions: [],
  editingSessionId: '',
};

const els = {};

function endpoint(table, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query}`;
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
    throw new Error(text || res.statusText);
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

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIso(value) {
  const [y, m, d] = String(value || todayIso()).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(value, days) {
  const d = parseIso(value);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function addMonths(value, months) {
  const d = parseIso(value);
  d.setMonth(d.getMonth() + months);
  return dateKey(d);
}

function weekStart(value) {
  const d = parseIso(value);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function sameWeek(value, reference = todayIso()) {
  const d = parseIso(value);
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function sameMonth(value, reference = todayIso()) {
  const a = parseIso(value);
  const b = parseIso(reference);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDate(value) {
  if (!value) return '-';
  return parseIso(value).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatTime(value) {
  return String(value || '').slice(0, 5) || '--:--';
}

function fullName(item) {
  return [item?.nome, item?.cognome].filter(Boolean).join(' ') || item?.email || '-';
}

function normalizeServiceId(serviceId) {
  const raw = String(serviceId || '').trim();
  if (SERVICES[raw]) return raw;
  return SERVICE_ALIASES[raw.toLowerCase()] || raw;
}

function serviceLabel(serviceId) {
  const normalized = normalizeServiceId(serviceId);
  return SERVICES[normalized]?.label || serviceId || 'Seduta';
}

function serviceDuration(serviceId, fallback = 60) {
  const normalized = normalizeServiceId(serviceId);
  return Number(fallback || SERVICES[normalized]?.durationMin || 60);
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || 'Prenotato';
}

function sessionClientIds(session) {
  if (Array.isArray(session?.client_ids)) return session.client_ids;
  if (Array.isArray(session?.clientIds)) return session.clientIds;
  return session?.client_id ? [session.client_id] : [];
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function showError(message) {
  els.errorBox.textContent = message;
  els.errorBox.classList.remove('hidden');
}

function clearError() {
  els.errorBox.textContent = '';
  els.errorBox.classList.add('hidden');
}

let toastTimer;
function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

async function loadData() {
  clearError();
  try {
    await loadPhaseViews();
  } catch (error) {
    await loadFallback();
  }
  await loadPrograms();
}

async function loadPhaseViews() {
  const [operators, clients, sessions] = await Promise.all([
    sb('operator_effective_roles', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('pt_client_overview', '?select=*&order=cognome.asc,nome.asc'),
    sb('pt_calendar_sessions', '?select=*&order=date.asc,start_time.asc'),
  ]);
  state.operators = (operators || []).map((op) => ({
    id: op.operator_id,
    nome: op.nome,
    cognome: op.cognome,
    email: op.email,
    roles: op.system_roles || [],
  }));
  state.clients = clients || [];
  state.sessions = sessions || [];
}

async function loadFallback() {
  const [operators, clients, appointments, acquisitions] = await Promise.all([
    sb('operators', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('clients', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('appointments', '?select=*&order=date.asc,start_time.asc'),
    sb('acquisizioni', '?select=*&order=data_acquisizione.desc'),
  ]);
  state.operators = (operators || [])
    .filter((op) => !Array.isArray(op.roles) || op.roles.includes('PT') || op.roles.includes('Personal Trainer'))
    .map((op) => ({ ...op, roles: op.roles || [] }));
  state.clients = (clients || []).map((client) => {
    const acq = (acquisitions || []).find((item) => {
      const email = client.email && item.email && client.email.toLowerCase() === item.email.toLowerCase();
      const phone = client.telefono && item.telefono && client.telefono === item.telefono;
      return email || phone;
    });
    return {
      assignment_id: `legacy_${client.id}`,
      trainer_id: client.pt_assegnato || client.trainer_id || '',
      client_id: client.id,
      nome: client.nome,
      cognome: client.cognome,
      telefono: client.telefono,
      email: client.email,
      professione: client.professione,
      obiettivo: client.obiettivo || acq?.obiettivo,
      esperienza: acq?.esperienza,
      livello_attivita_fisica: acq?.livello_attivita_fisica || acq?.inattivo,
      sport: acq?.sport,
      patologie: acq?.patologie,
      farmaci: acq?.farmaci,
      infortuni: acq?.infortuni,
      limitazioni: acq?.limitazioni,
      stress: acq?.stress,
      sonno: acq?.sonno,
      note_operative: acq?.impressioni || client.notes,
      alerts: [],
      alert_count: 0,
    };
  });
  state.sessions = (appointments || []).flatMap((appt) => {
    const ids = Array.isArray(appt.client_ids) ? appt.client_ids : [];
    return ids.map((clientId) => {
      const client = (clients || []).find((item) => item.id === clientId) || {};
      const trainer = (operators || []).find((item) => item.id === appt.operator_id) || {};
      return {
        appointment_id: appt.id,
        trainer_id: appt.operator_id,
        trainer_nome: trainer.nome,
        trainer_cognome: trainer.cognome,
        client_id: clientId,
        client_ids: ids,
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
}

function normalizeProgram(row) {
  const data = row.data || {};
  return {
    rowId: row.id,
    id: data.id || row.id,
    client_id: row.cliente_id || data.client_id || data.cliente_id || '',
    trainer_id: data.trainer_id || data.created_by || '',
    name: data.name || data.nome || 'Scheda PT',
    goal: data.goal || data.obiettivo || '',
    weeks: Number(data.weeks || data.settimane || 4),
    frequency: Number(data.frequency || data.frequenza || 2),
    status: data.status || data.stato || 'bozza',
    notes: data.notes || data.note || '',
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    updated_at: row.updated_at || row.created_at || '',
  };
}

async function loadPrograms() {
  try {
    const rows = await sb('schede_allenamento', '?select=id,cliente_id,data,created_at,updated_at&order=updated_at.desc');
    state.programs = (rows || []).map(normalizeProgram);
  } catch (error) {
    state.programs = [];
  }
}

function myClients() {
  return state.clients.filter((client) => client.trainer_id === state.currentPt?.id);
}

function myClientIds() {
  return new Set(myClients().map((client) => client.client_id));
}

function mySessions() {
  return state.sessions
    .filter((session) => session.trainer_id === state.currentPt?.id)
    .filter((session) => session.status !== 'annullato')
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

function myPrograms() {
  const allowed = myClientIds();
  const clientFilter = els.programClientFilter.value;
  const statusFilter = els.programStatusFilter.value;
  return state.programs
    .filter((program) => allowed.has(program.client_id) || program.trainer_id === state.currentPt?.id)
    .filter((program) => !clientFilter || program.client_id === clientFilter)
    .filter((program) => !statusFilter || program.status === statusFilter)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function clientById(clientId) {
  return state.clients.find((client) => client.client_id === clientId) || null;
}

function loginByEmail() {
  const email = els.loginEmail.value.trim().toLowerCase();
  const pt = state.operators.find((op) => String(op.email || '').toLowerCase() === email);
  if (!pt) {
    els.loginError.textContent = 'Email non trovata tra i Personal Trainer configurati.';
    els.loginError.classList.remove('hidden');
    return;
  }
  state.currentPt = pt;
  localStorage.setItem('neacea_pt_email', email);
  els.loginScreen.classList.add('hidden');
  els.app.classList.remove('hidden');
  renderAll();
}

function logout() {
  localStorage.removeItem('neacea_pt_email');
  state.currentPt = null;
  els.app.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
}

function renderAll() {
  if (!state.currentPt) return;
  els.currentPtName.textContent = fullName(state.currentPt);
  els.heroTitle.textContent = `Ciao ${state.currentPt.nome || 'PT'}`;
  els.heroSub.textContent = 'Qui trovi clienti, prenotazioni, schede e calendario studio.';
  renderDashboard();
  renderClients();
  renderProgramOptions();
  renderPrograms();
  renderMyAgenda();
  renderStudioCalendar();
}

function renderDashboard() {
  const mine = mySessions();
  const today = todayIso();
  els.kpiClienti.textContent = myClients().length;
  els.kpiOggi.textContent = mine.filter((session) => session.date === today).length;
  els.kpiSettimana.textContent = mine.filter((session) => sameWeek(session.date)).length;
  els.kpiStudio.textContent = state.sessions.filter((session) => session.date === today && session.status !== 'annullato').length;

  const next = mine.filter((session) => session.date >= today).slice(0, 7);
  els.mySessionCount.textContent = next.length;
  els.myNextSessions.innerHTML = next.length ? next.map(renderSessionCard).join('') : '<div class="empty">Nessuna prenotazione futura</div>';

  const alerts = myClients().filter((client) => Number(client.alert_count || 0) > 0 || (client.alerts || []).length);
  els.alertCount.textContent = alerts.length;
  els.alertClients.innerHTML = alerts.length ? alerts.map((client) => `
    <article class="row-card">
      <div class="row-title"><span>${esc(fullName(client))}</span><span class="pill alert">Alert</span></div>
      <div class="row-sub">${esc((client.alerts || [])[0]?.title || 'Controllare anamnesi e note operative')}</div>
    </article>
  `).join('') : '<div class="empty">Nessun alert sui tuoi clienti</div>';
}

function renderClients() {
  const q = els.clientSearch.value.trim().toLowerCase();
  const clients = myClients().filter((client) => !q || `${fullName(client)} ${client.email || ''} ${client.telefono || ''}`.toLowerCase().includes(q));
  els.clientCount.textContent = clients.length;
  if (!clients.some((client) => client.client_id === state.selectedClientId)) {
    state.selectedClientId = clients[0]?.client_id || '';
  }
  els.clientList.innerHTML = clients.length ? clients.map((client) => `
    <article class="client-card${client.client_id === state.selectedClientId ? ' active' : ''}" data-client-id="${esc(client.client_id)}">
      <div class="row-title"><span>${esc(fullName(client))}</span><span class="pill">${Number(client.alert_count || 0) ? 'Alert' : 'OK'}</span></div>
      <div class="row-sub">${esc(client.telefono || '-')} · ${esc(client.email || '-')}</div>
    </article>
  `).join('') : '<div class="empty">Nessun cliente assegnato</div>';
  renderClientDetail();
}

function field(label, value) {
  return `<div class="field"><span>${esc(label)}</span><strong>${esc(value || '-')}</strong></div>`;
}

function renderClientDetail() {
  const client = clientById(state.selectedClientId);
  if (!client) {
    els.clientDetail.innerHTML = '<div class="empty-state">Seleziona un cliente</div>';
    return;
  }
  const programs = state.programs.filter((program) => program.client_id === client.client_id);
  const sessions = mySessions().filter((session) => session.client_id === client.client_id && session.date >= todayIso()).slice(0, 5);
  els.clientDetail.innerHTML = `
    <div class="client-hero">
      <div>
        <h2>${esc(fullName(client))}</h2>
        <p>${esc(client.obiettivo || 'Cliente PT')}</p>
      </div>
      <div class="hero-actions">
        <span class="pill mine">${programs.length} schede</span>
        <button class="ghost-btn" type="button" data-new-program-for="${esc(client.client_id)}">Nuova scheda</button>
      </div>
    </div>
    <div class="client-sections">
      <div class="section-card"><span>Telefono</span><strong>${esc(client.telefono || '-')}</strong></div>
      <div class="section-card"><span>Email</span><strong>${esc(client.email || '-')}</strong></div>
      <div class="section-card"><span>Professione</span><strong>${esc(client.professione || '-')}</strong></div>
      <div class="section-card"><span>Obiettivo</span><strong>${esc(client.obiettivo || '-')}</strong></div>
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Anamnesi e riferimenti</h3>
      <div class="info-grid">
        ${field('Esperienza', client.esperienza)}
        ${field('Attivita fisica', client.livello_attivita_fisica)}
        ${field('Sport', client.sport)}
        ${field('Patologie', client.patologie)}
        ${field('Farmaci', client.farmaci)}
        ${field('Infortuni', client.infortuni)}
        ${field('Limitazioni', client.limitazioni)}
        ${field('Stress', client.stress)}
        ${field('Sonno', client.sonno)}
        ${field('Note operative', client.note_operative)}
      </div>
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Prossime prenotazioni</h3>
      <div class="stack">${sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna prenotazione futura per questo cliente</div>'}</div>
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Schede cliente</h3>
      <div class="stack">${programs.length ? programs.map(renderProgramMini).join('') : '<div class="empty">Nessuna scheda ancora</div>'}</div>
    </div>
  `;
}

function renderSessionCard(session) {
  const mine = session.trainer_id === state.currentPt?.id;
  const clientIds = sessionClientIds(session);
  const normalizedServiceId = normalizeServiceId(session.service_id);
  const service = SERVICES[normalizedServiceId] || {};
  const serviceExtra = service.maxClients > 1 && clientIds.length
    ? ` · ${clientIds.length}/${service.maxClients} clienti`
    : '';
  return `
    <article class="session-card ${mine ? 'mine' : 'locked'}">
      <div class="session-title">
        <span>${esc(formatDate(session.date))} · ${esc(formatTime(session.start_time))}</span>
        <span class="pill ${mine ? 'mine' : 'locked'}">${mine ? 'Mia' : esc([session.trainer_nome, session.trainer_cognome].filter(Boolean).join(' ') || 'Studio')}</span>
      </div>
      <div class="session-sub">${esc(fullName(session))} · ${esc(serviceLabel(normalizedServiceId))} · ${esc(serviceDuration(normalizedServiceId, session.duration_min))} min · ${esc(statusLabel(session.status))}${esc(serviceExtra)}</div>
      ${mine ? `
        <div class="session-actions">
          <button class="ghost-btn slim" type="button" data-edit-session="${esc(session.appointment_id || '')}">Modifica</button>
          <button class="ghost-btn slim" type="button" data-session-done="${esc(session.appointment_id || '')}">Segna fatta</button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderProgramOptions() {
  const clients = myClients();
  const options = clients.map((client) => `<option value="${esc(client.client_id)}">${esc(fullName(client))}</option>`).join('');
  els.programClient.innerHTML = options || '<option value="">Nessun cliente assegnato</option>';
  els.programClientFilter.innerHTML = `<option value="">Tutti i miei clienti</option>${options}`;
}

function renderPrograms() {
  const programs = myPrograms();
  els.programList.innerHTML = programs.length ? programs.map((program) => `
    <article class="program-card${program.id === state.selectedProgramId ? ' active' : ''}" data-program-id="${esc(program.id)}">
      <div class="row-title"><span>${esc(program.name)}</span><span class="pill">${esc(program.status)}</span></div>
      <div class="row-sub">${esc(fullName(clientById(program.client_id)))} · ${esc(program.goal || '-')} · ${program.sessions.length} sedute</div>
    </article>
  `).join('') : '<div class="empty">Nessuna scheda per i tuoi clienti</div>';
  if (!state.selectedProgramId && programs[0]) {
    loadProgramToForm(programs[0]);
  } else if (!programs.length) {
    newProgram();
  }
}

function renderProgramMini(program) {
  return `
    <article class="row-card">
      <div class="row-title"><span>${esc(program.name)}</span><button class="ghost-btn slim" type="button" data-open-program="${esc(program.id)}">Apri</button></div>
      <div class="row-sub">${esc(program.status)} · ${program.sessions.length} sedute · ${esc(program.goal || '-')}</div>
    </article>
  `;
}

function emptySession(index = 0) {
  return { id: id('session'), name: `Seduta ${String.fromCharCode(65 + index)}`, focus: '', duration: '60', exercises: [] };
}

function emptyExercise(order = 1) {
  return { id: id('exercise'), order, name: '', progression: '', sets: '', reps: '', rest: '', load: '', notes: '' };
}

function newProgram(clientId = '') {
  state.selectedProgramId = '';
  state.programSessions = [emptySession(0)];
  els.programId.value = '';
  els.programClient.value = clientId || myClients()[0]?.client_id || '';
  els.programStatus.value = 'bozza';
  els.programName.value = 'Scheda PT';
  els.programGoal.value = clientById(els.programClient.value)?.obiettivo || '';
  els.programWeeks.value = 4;
  els.programFrequency.value = 2;
  els.programNotes.value = '';
  els.programTitle.textContent = 'Nuova scheda';
  els.programState.textContent = 'bozza';
  renderSessionBuilder();
}

function loadProgramToForm(program) {
  if (!program) return;
  state.selectedProgramId = program.id;
  state.programSessions = JSON.parse(JSON.stringify(program.sessions?.length ? program.sessions : [emptySession(0)]));
  els.programId.value = program.id;
  els.programClient.value = program.client_id;
  els.programStatus.value = program.status;
  els.programName.value = program.name;
  els.programGoal.value = program.goal;
  els.programWeeks.value = program.weeks;
  els.programFrequency.value = program.frequency;
  els.programNotes.value = program.notes;
  els.programTitle.textContent = program.name;
  els.programState.textContent = program.status;
  renderPrograms();
  renderSessionBuilder();
}

function syncBuilder() {
  state.programSessions = Array.from(els.sessionBuilder.querySelectorAll('[data-session-index]')).map((box, index) => ({
    id: box.dataset.sessionId || id('session'),
    name: box.querySelector('[data-session-field="name"]').value.trim() || `Seduta ${String.fromCharCode(65 + index)}`,
    focus: box.querySelector('[data-session-field="focus"]').value.trim(),
    duration: box.querySelector('[data-session-field="duration"]').value.trim(),
    exercises: Array.from(box.querySelectorAll('[data-exercise-index]')).map((row, exerciseIndex) => ({
      id: row.dataset.exerciseId || id('exercise'),
      order: exerciseIndex + 1,
      name: row.querySelector('[data-exercise-field="name"]').value.trim(),
      progression: row.querySelector('[data-exercise-field="progression"]').value.trim(),
      sets: row.querySelector('[data-exercise-field="sets"]').value.trim(),
      reps: row.querySelector('[data-exercise-field="reps"]').value.trim(),
      rest: row.querySelector('[data-exercise-field="rest"]').value.trim(),
      load: row.querySelector('[data-exercise-field="load"]').value.trim(),
    })).filter((exercise) => exercise.name || exercise.progression || exercise.sets || exercise.reps || exercise.load),
  }));
}

function renderSessionBuilder() {
  els.sessionBuilder.innerHTML = state.programSessions.map((session, sessionIndex) => `
    <section class="builder-session" data-session-index="${sessionIndex}" data-session-id="${esc(session.id)}">
      <div class="builder-session-head">
        <strong>${esc(session.name || `Seduta ${sessionIndex + 1}`)}</strong>
        <div class="hero-actions">
          <button class="ghost-btn slim" type="button" data-add-exercise="${sessionIndex}">Aggiungi esercizio</button>
          <button class="ghost-btn slim" type="button" data-remove-session="${sessionIndex}">Elimina seduta</button>
        </div>
      </div>
      <div class="session-edit">
        <input data-session-field="name" value="${esc(session.name || '')}" placeholder="Nome seduta">
        <input data-session-field="focus" value="${esc(session.focus || '')}" placeholder="Focus">
        <input data-session-field="duration" value="${esc(session.duration || '')}" placeholder="Minuti">
      </div>
      <div class="exercise-list">
        ${(session.exercises || []).map((exercise, exerciseIndex) => `
          <div class="exercise-row" data-exercise-index="${exerciseIndex}" data-exercise-id="${esc(exercise.id)}">
            <input data-exercise-field="name" value="${esc(exercise.name || '')}" placeholder="Esercizio">
            <input data-exercise-field="progression" value="${esc(exercise.progression || '')}" placeholder="Progressione / manuale">
            <input data-exercise-field="sets" value="${esc(exercise.sets || '')}" placeholder="Serie">
            <input data-exercise-field="reps" value="${esc(exercise.reps || '')}" placeholder="Rep">
            <input data-exercise-field="load" value="${esc(exercise.load || '')}" placeholder="Carico">
            <button class="icon-btn" type="button" data-remove-exercise="${sessionIndex}:${exerciseIndex}">×</button>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}

function readProgramForm() {
  syncBuilder();
  const programId = els.programId.value || id('pt_program');
  return {
    id: programId,
    client_id: els.programClient.value,
    trainer_id: state.currentPt.id,
    created_by: state.currentPt.id,
    name: els.programName.value.trim() || 'Scheda PT',
    goal: els.programGoal.value.trim(),
    weeks: Number(els.programWeeks.value || 4),
    frequency: Number(els.programFrequency.value || 2),
    status: els.programStatus.value || 'bozza',
    notes: els.programNotes.value.trim(),
    sessions: state.programSessions,
    schema_version: 3,
  };
}

async function saveProgram(event) {
  event?.preventDefault();
  const program = readProgramForm();
  if (!myClientIds().has(program.client_id)) {
    toast('Puoi salvare schede solo per i tuoi clienti assegnati', true);
    return;
  }
  await sb('schede_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: program.id,
      cliente_id: program.client_id,
      data: program,
      updated_at: new Date().toISOString(),
    },
  });
  state.selectedProgramId = program.id;
  await loadPrograms();
  renderPrograms();
  renderClientDetail();
  toast('Scheda salvata');
}

function sessionsForRange(reference, view, onlyMine = false) {
  return state.sessions
    .filter((session) => !onlyMine || session.trainer_id === state.currentPt?.id)
    .filter((session) => session.status !== 'annullato')
    .filter((session) => {
      if (view === 'day') return session.date === reference;
      if (view === 'month') return sameMonth(session.date, reference);
      return sameWeek(session.date, reference);
    })
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

function rangeLabel(reference, view) {
  if (view === 'day') return formatDate(reference);
  if (view === 'month') return parseIso(reference).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(dateKey(start))} - ${formatDate(dateKey(end))}`;
}

function renderMyAgenda() {
  const sessions = sessionsForRange(state.myReference, 'week', true);
  els.myRange.textContent = rangeLabel(state.myReference, 'week');
  els.myAgenda.innerHTML = sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna seduta per questa settimana</div>';
}

function renderStudioCalendar() {
  const sessions = sessionsForRange(state.calendarReference, state.calendarView, false);
  els.calRange.textContent = rangeLabel(state.calendarReference, state.calendarView);
  document.querySelectorAll('[data-cal-view]').forEach((button) => button.classList.toggle('active', button.dataset.calView === state.calendarView));
  if (state.calendarView === 'month') {
    renderMonth(sessions);
    return;
  }
  els.studioCalendar.className = 'calendar-list';
  els.studioCalendar.innerHTML = sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna seduta nel periodo</div>';
}

function renderMonth(sessions) {
  const ref = parseIso(state.calendarReference);
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  const byDate = sessions.reduce((acc, session) => {
    acc[session.date] = acc[session.date] || [];
    acc[session.date].push(session);
    return acc;
  }, {});
  const cells = [];
  for (let i = 0; i < blanks; i++) cells.push('<div class="month-day empty"></div>');
  for (let day = 1; day <= last.getDate(); day++) {
    const key = dateKey(new Date(ref.getFullYear(), ref.getMonth(), day));
    const items = byDate[key] || [];
    cells.push(`
      <div class="month-day">
        <div class="month-number">${day}</div>
        ${items.map((item) => `<div class="month-item">${esc(formatTime(item.start_time))} ${esc(fullName(item))}</div>`).join('')}
      </div>
    `);
  }
  els.studioCalendar.className = 'calendar-list month';
  els.studioCalendar.innerHTML = cells.join('');
}

async function markSessionDone(appointmentId) {
  if (!appointmentId) return;
  await sb('appointments', `?id=eq.${encodeURIComponent(appointmentId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { status: 'fatto', updated_at: new Date().toISOString() },
  });
  await loadData();
  renderAll();
  toast('Seduta aggiornata');
}

async function editOwnSession(appointmentId) {
  if (!appointmentId) return;
  const session = state.sessions.find((item) => item.appointment_id === appointmentId);
  if (!session || session.trainer_id !== state.currentPt?.id) {
    toast('Puoi modificare solo le tue sedute', true);
    return;
  }
  openSessionEditor(session);
}

function serviceOptions(selected = '') {
  return Object.values(SERVICES).map((service) =>
    `<option value="${esc(service.id)}" ${service.id === selected ? 'selected' : ''}>${esc(service.label)}</option>`
  ).join('');
}

function statusOptions(selected = '') {
  return Object.entries(STATUS_LABELS).map(([value, label]) =>
    `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`
  ).join('');
}

function clientOptions(selectedIds = [], serviceId = 'pt11') {
  const max = SERVICES[serviceId]?.maxClients || 1;
  return myClients().map((client) => {
    const selected = selectedIds.includes(client.client_id);
    return `<option value="${esc(client.client_id)}" ${selected ? 'selected' : ''}>${esc(fullName(client))}</option>`;
  }).join('') || '<option value="">Nessun cliente assegnato</option>';
}

function ensureSessionModal() {
  let modal = document.getElementById('sessionModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sessionModal';
  modal.className = 'modal-overlay hidden';
  modal.innerHTML = '<div class="modal-card" id="sessionModalCard"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeSessionEditor();
  });
  return modal;
}

function closeSessionEditor() {
  state.editingSessionId = '';
  document.getElementById('sessionModal')?.classList.add('hidden');
}

function openSessionEditor(session) {
  state.editingSessionId = session.appointment_id;
  const modal = ensureSessionModal();
  const card = document.getElementById('sessionModalCard');
  const selectedIds = sessionClientIds(session);
  const serviceId = normalizeServiceId(session.service_id) || 'pt11';
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  card.innerHTML = `
    <div class="modal-head">
      <div>
        <h2>Modifica seduta</h2>
        <p>${esc(fullName(session))} · ${esc(serviceLabel(serviceId))}</p>
      </div>
      <button class="icon-btn" type="button" data-close-session-modal>×</button>
    </div>
    <div class="modal-body">
      <input id="editSessionId" type="hidden" value="${esc(session.appointment_id || '')}">
      <div class="form-grid modal-grid">
        <label><span>Servizio</span><select id="editSessionService">${serviceOptions(serviceId)}</select></label>
        <label><span>Stato</span><select id="editSessionStatus">${statusOptions(session.status || 'prenotato')}</select></label>
        <label><span>Data</span><input id="editSessionDate" type="date" value="${esc(session.date || todayIso())}"></label>
        <label><span>Ora</span><input id="editSessionTime" type="time" value="${esc(formatTime(session.start_time))}" step="900"></label>
        <label><span>Durata minuti</span><input id="editSessionDuration" type="number" min="15" step="15" value="${esc(serviceDuration(serviceId, session.duration_min))}"></label>
        <label><span>Operatore</span><input type="text" value="${esc(fullName(state.currentPt))}" disabled></label>
      </div>
      <label class="wide-label session-client-select">
        <span>Cliente${maxClients > 1 ? '/i' : ''}</span>
        <select id="editSessionClients" ${maxClients > 1 ? 'multiple size="5"' : ''}>
          ${clientOptions(selectedIds, serviceId)}
        </select>
      </label>
      <label class="wide-label">
        <span>Note</span>
        <textarea id="editSessionNotes" rows="3">${esc(session.notes || '')}</textarea>
      </label>
      <div id="editSessionHint" class="edit-hint"></div>
    </div>
    <div class="modal-foot">
      <button class="ghost-btn" type="button" data-close-session-modal>Annulla</button>
      <button class="primary-btn" type="button" data-save-session-modal>Salva modifiche</button>
    </div>
  `;
  modal.classList.remove('hidden');
  refreshSessionEditorClientMode();
}

function refreshSessionEditorClientMode() {
  const serviceId = document.getElementById('editSessionService')?.value || 'pt11';
  const clients = document.getElementById('editSessionClients');
  const duration = document.getElementById('editSessionDuration');
  const hint = document.getElementById('editSessionHint');
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  const selected = Array.from(clients?.selectedOptions || []).map((item) => item.value);
  if (duration && SERVICES[serviceId]) duration.value = SERVICES[serviceId].durationMin;
  if (clients) {
    clients.multiple = maxClients > 1;
    clients.size = maxClients > 1 ? 5 : 1;
    clients.innerHTML = clientOptions(selected, serviceId);
  }
  if (hint) {
    hint.textContent = maxClients > 1
      ? `Puoi selezionare fino a ${maxClients} clienti per ${serviceLabel(serviceId)}.`
      : 'Seduta individuale: seleziona un solo cliente.';
  }
}

async function saveSessionEditor() {
  const appointmentId = document.getElementById('editSessionId')?.value || state.editingSessionId;
  const original = state.sessions.find((item) => item.appointment_id === appointmentId);
  if (!original || original.trainer_id !== state.currentPt?.id) {
    toast('Puoi modificare solo le tue sedute', true);
    return;
  }
  const serviceId = normalizeServiceId(document.getElementById('editSessionService')?.value || original.service_id || 'pt11');
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  const clientIds = Array.from(document.getElementById('editSessionClients')?.selectedOptions || [])
    .map((item) => item.value)
    .filter(Boolean)
    .slice(0, maxClients);
  if (!SERVICES[serviceId]?.maxClients && serviceId !== 'blocco') {
    toast('Servizio non valido', true);
    return;
  }
  if (serviceId !== 'blocco' && !clientIds.length) {
    toast('Seleziona almeno un cliente', true);
    return;
  }
  await sb('appointments', `?id=eq.${encodeURIComponent(appointmentId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      service_id: serviceId,
      client_ids: serviceId === 'blocco' ? [] : clientIds,
      operator_id: state.currentPt.id,
      date: document.getElementById('editSessionDate')?.value || original.date,
      start_time: document.getElementById('editSessionTime')?.value || original.start_time,
      duration_min: Number(document.getElementById('editSessionDuration')?.value || serviceDuration(serviceId, original.duration_min)),
      status: document.getElementById('editSessionStatus')?.value || original.status || 'prenotato',
      notes: document.getElementById('editSessionNotes')?.value || '',
      updated_at: new Date().toISOString(),
    },
  });
  closeSessionEditor();
  await loadData();
  renderAll();
  toast('Seduta modificata');
}

function bindEvents() {
  els.loginButton.addEventListener('click', loginByEmail);
  els.loginEmail.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loginByEmail();
  });
  els.logoutButton.addEventListener('click', logout);
  els.refreshButton.addEventListener('click', async () => {
    await loadData();
    renderAll();
    toast('Dati aggiornati');
  });
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.view).classList.add('active');
    });
  });
  els.clientSearch.addEventListener('input', renderClients);
  els.clientList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-client-id]');
    if (!card) return;
    state.selectedClientId = card.dataset.clientId;
    renderClients();
  });
  els.clientDetail.addEventListener('click', (event) => {
    const newFor = event.target.closest('[data-new-program-for]');
    const open = event.target.closest('[data-open-program]');
    if (newFor) {
      activateView('schede');
      newProgram(newFor.dataset.newProgramFor);
    }
    if (open) {
      activateView('schede');
      loadProgramToForm(state.programs.find((program) => program.id === open.dataset.openProgram));
    }
  });
  els.programClientFilter.addEventListener('change', renderPrograms);
  els.programStatusFilter.addEventListener('change', renderPrograms);
  els.programList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-program-id]');
    if (!card) return;
    loadProgramToForm(state.programs.find((program) => program.id === card.dataset.programId));
  });
  els.newProgramButton.addEventListener('click', () => newProgram());
  els.programForm.addEventListener('submit', saveProgram);
  els.addSessionButton.addEventListener('click', () => {
    syncBuilder();
    state.programSessions.push(emptySession(state.programSessions.length));
    renderSessionBuilder();
  });
  els.sessionBuilder.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add-exercise]');
    const remSession = event.target.closest('[data-remove-session]');
    const remExercise = event.target.closest('[data-remove-exercise]');
    syncBuilder();
    if (add) {
      const index = Number(add.dataset.addExercise);
      state.programSessions[index].exercises.push(emptyExercise((state.programSessions[index].exercises || []).length + 1));
      renderSessionBuilder();
    }
    if (remSession) {
      state.programSessions.splice(Number(remSession.dataset.removeSession), 1);
      if (!state.programSessions.length) state.programSessions.push(emptySession(0));
      renderSessionBuilder();
    }
    if (remExercise) {
      const [sessionIndex, exerciseIndex] = remExercise.dataset.removeExercise.split(':').map(Number);
      state.programSessions[sessionIndex].exercises.splice(exerciseIndex, 1);
      renderSessionBuilder();
    }
  });
  document.body.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit-session]');
    const done = event.target.closest('[data-session-done]');
    const closeModal = event.target.closest('[data-close-session-modal]');
    const saveModal = event.target.closest('[data-save-session-modal]');
    if (edit) editOwnSession(edit.dataset.editSession).catch((error) => toast(error.message, true));
    if (done) markSessionDone(done.dataset.sessionDone).catch((error) => toast(error.message, true));
    if (closeModal) closeSessionEditor();
    if (saveModal) saveSessionEditor().catch((error) => toast(error.message, true));
  });
  document.body.addEventListener('change', (event) => {
    if (event.target?.id === 'editSessionService') refreshSessionEditorClientMode();
  });
  document.querySelectorAll('[data-my-move]').forEach((button) => {
    button.addEventListener('click', () => {
      state.myReference = addDays(state.myReference, Number(button.dataset.myMove) * 7);
      renderMyAgenda();
    });
  });
  els.myTodayButton.addEventListener('click', () => {
    state.myReference = todayIso();
    renderMyAgenda();
  });
  document.querySelectorAll('[data-cal-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.calMove);
      state.calendarReference = state.calendarView === 'month'
        ? addMonths(state.calendarReference, step)
        : addDays(state.calendarReference, step * (state.calendarView === 'week' ? 7 : 1));
      renderStudioCalendar();
    });
  });
  els.calTodayButton.addEventListener('click', () => {
    state.calendarReference = todayIso();
    renderStudioCalendar();
  });
  document.querySelectorAll('[data-cal-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.calendarView = button.dataset.calView;
      renderStudioCalendar();
    });
  });
}

function activateView(name) {
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  document.querySelectorAll('.view').forEach((item) => item.classList.toggle('active', item.id === name));
}

function cacheEls() {
  [
    'loginScreen', 'app', 'loginEmail', 'loginButton', 'loginError', 'currentPtName', 'logoutButton',
    'refreshButton', 'heroTitle', 'heroSub', 'errorBox', 'toast', 'kpiClienti', 'kpiOggi',
    'kpiSettimana', 'kpiStudio', 'mySessionCount', 'myNextSessions', 'alertCount', 'alertClients',
    'clientCount', 'clientSearch', 'clientList', 'clientDetail', 'programClientFilter',
    'programStatusFilter', 'programList', 'newProgramButton', 'programTitle', 'programState',
    'programForm', 'programId', 'programClient', 'programStatus', 'programName', 'programGoal',
    'programWeeks', 'programFrequency', 'programNotes', 'addSessionButton', 'sessionBuilder',
    'myRange', 'myAgenda', 'myTodayButton', 'calRange', 'calTodayButton', 'studioCalendar',
  ].forEach((key) => { els[key] = document.getElementById(key); });
}

async function init() {
  cacheEls();
  bindEvents();
  try {
    await loadData();
    const savedEmail = localStorage.getItem('neacea_pt_email');
    if (savedEmail) {
      els.loginEmail.value = savedEmail;
      loginByEmail();
    }
  } catch (error) {
    els.loginError.textContent = `Caricamento non riuscito: ${error.message}`;
    els.loginError.classList.remove('hidden');
  }
}

init();
