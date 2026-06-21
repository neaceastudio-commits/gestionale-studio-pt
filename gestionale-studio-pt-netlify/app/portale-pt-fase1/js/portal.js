const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const NEACEA_BLOCKS = [
  ['N0', 'Tecnico'],
  ['N1', 'Forza'],
  ['N2', 'Ipertrofia'],
  ['N3', 'Carenze'],
  ['N4', 'Neurale'],
  ['N5', 'Overload'],
  ['N6', 'Reset'],
  ['N7', 'Definizione'],
  ['N8', 'Neurale/peak'],
  ['N9', 'Neurale/peak avanzato'],
  ['N10', 'Metabolico/specifico'],
  ['N11', 'Core/controllo'],
];

const MODES = ['Singolo', 'Combo', 'Superset', 'Giant set', 'Multiset', 'Stripping', 'Ladder'];

const EXERCISE_LIBRARY = {
  'Mobilita Anca': ['Hip 90/90', 'Hip CARs', 'Frog Stretch', 'Couch Stretch', 'Deep Squat Hold'],
  'Attivazione Core': ['Dead Bug', 'Bird Dog', 'Hollow Body Hold', 'Pallof Press Isometrico', 'Side Plank Breve'],
  Petto: ['Bench Press', 'Incline Bench Press', 'Dumbbell Press', 'Cable Fly Medio', 'Push Up', 'Dip'],
  'Schiena - Dorsali': ['Lat Pulldown Presa Larga', 'Pull Up', 'Chin Up', 'Pulley Basso Presa Larga', 'Dumbbell Row'],
  Spalle: ['Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise DB', 'Cable Y-Raise', 'Landmine Press'],
  Bicipiti: ['Curl Bilanciere', 'Curl Manubri', 'Hammer Curl', 'Curl Cavo Basso'],
  Tricipiti: ['Close Grip Bench Press', 'Tricep Pushdown Corda', 'Overhead Tricep Extension DB', 'Skullcrusher'],
  Quadricipiti: ['Squat', 'Front Squat', 'Smith Squat', 'Bulgarian Split Squat', 'Walking Lunge', 'Step Up'],
  'Posteriori Coscia / Glutei': ['Romanian Deadlift', 'Deadlift', 'Hip Thrust Bilanciere', 'Cable Pull Through', 'Single Leg RDL'],
  Core: ['Plank', 'Side Plank', 'Pallof Press', 'Cable Crunch', 'Ab Wheel', 'Landmine Rotation'],
  'Compound / Full Body': ['Deadlift', 'Farmer Walk', 'Landmine Thruster', 'KB Swing'],
};

const PROGRESSION_LIBRARY = {
  Tecnica: [
    { name: 'Circuito Tecnico Base', tut: '2/1/1/1', sessions: ['2x10', '2x10', '3x10', '3x10', '3x12', '3x12'] },
    { name: 'Ladder Tecnico', tut: '2/1/1/1', sessions: ['2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)'] },
    { name: 'Progressione Lineare Tecnica', tut: '1/1/1/1', sessions: ['3x8', '3x9', '3x10', '4x8', '4x9', '4x10'] },
  ],
  Forza: [
    { name: 'Forza 5x5 Progressiva', tut: '2/1/1/1', sessions: ['5x5 @70%', '5x5 @72%', '5x5 @74%', '5x5 @76%', '5x5 @80%', '5x5 @82%'] },
    { name: 'Cluster Tecnico Forza', tut: '1/1/1/1', sessions: ['4x(2+2+2) @72%', '4x(2+2+2) @75%', '4x(2+2+2) @75%', '4x(2+2+2) @77%', '4x(2+2+2) @77%', '4x(2+2+2) @78%'] },
    { name: 'Top Set + Back Off', tut: '2/1/1/1', sessions: ['1x5@75%+2x6@65%', '1x5@77%+2x6@65%', '1x4@80%+3x6@68%', '1x4@82%+3x6@68%', '1x3@85%+3x5@70%', '1x3@85%+3x5@70%'] },
  ],
  Ipertrofia: [
    { name: 'Ipertrofia Lineare', tut: '2/1/1/1', sessions: ['4x8 @65%', '4x9 @67%', '4x10 @70%', '5x8 @72%', '5x9 @72%', '5x10 @74%'] },
    { name: 'Complementare Progressiva', tut: '1/1/1/1', sessions: ['3x10', '3x11', '3x12', '4x10', '4x11', '4x12'] },
    { name: 'Rest Pause Ipertrofia', tut: '1/1/1/1', sessions: ['3x10 (4-3)', '3x11 (4-3)', '3x12 (4-3)', '4x10 (4-3)', '4x11 (4-3)', '4x12 (4-3)'] },
  ],
  Densita: [
    { name: 'Densita Progressiva', tut: '2/1/1/1', sessions: ['5x8 (120")', '5x8 (105")', '6x8 (90")', '6x8 (75")', '7x8 (75")', '8x8 (60")'] },
    { name: 'Myo Reps', tut: '2/1/1/1', sessions: ['1x15+3x5', '1x16+3x5', '1x17+4x5', '1x18+4x5', '1x19+5x5', '1x20+5x5'] },
  ],
  Core: [
    { name: 'Core Stabilita', tut: '2/1/2/1', sessions: ['3x25"', '3x30"', '2x25"/lat', '2x30"/lat', '3x20"', '3x25"'] },
    { name: 'Core Circuito', tut: '2/1/2/1', sessions: ['2 giri x 3 ex', '2 giri (rip+)', '3 giri', '3 giri (rip+)', '3 giri', '3-4 giri'] },
  ],
  Scarico: [
    { name: 'Volume Minimo', tut: '2/1/1/1', sessions: ['3x8', '3x8', '3x8', '3x8', '3x8', '3x8'] },
    { name: 'Buffer Alto Costante', tut: '3/1/1/1', sessions: ['3x8@65%', '3x8', '3x8', '3x8', '3x8', '3x8'] },
  ],
};

const state = {
  mode: 'phase1',
  operators: [],
  clients: [],
  metrics: [],
  sessions: [],
  programs: [],
  selectedOperatorId: '',
  selectedClientId: '',
  selectedProgramId: '',
  programSessions: [],
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

function isoNowId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function blockLabel(code) {
  const found = NEACEA_BLOCKS.find(([itemCode]) => itemCode === code);
  return found ? `${found[0]} ${found[1]}` : code || 'N0 Tecnico';
}

function getClient(clientId) {
  return state.clients.find((item) => item.client_id === clientId) || null;
}

function flattenExercises() {
  return Object.entries(EXERCISE_LIBRARY).flatMap(([category, names]) => names.map((name) => ({ category, name })));
}

function exerciseCategory(name) {
  const found = flattenExercises().find((item) => item.name.toLowerCase() === String(name || '').toLowerCase());
  return found?.category || '';
}

function flattenProgressions() {
  return Object.entries(PROGRESSION_LIBRARY).flatMap(([group, progressions]) =>
    progressions.map((progression) => ({ group, ...progression }))
  );
}

function progressionByName(name) {
  return flattenProgressions().find((item) => item.name === name) || null;
}

function normalizeProgression(value) {
  if (!value) return null;
  if (typeof value === 'string') return progressionByName(value);
  return {
    name: value.name || value.nome || '',
    tut: value.tut || '',
    sessions: value.sessions || value.sedute || [],
  };
}

function normalizeLegacyExercises(data) {
  const esercizi = data?.esercizi || {};
  const days = Object.keys(esercizi);
  if (!days.length) return defaultSessions();
  return days.map((day, index) => ({
    id: isoNowId('session'),
    name: day,
    weekDay: String(index + 1),
    focus: data?.split || '',
    duration: '',
    warmup: '',
    cooldown: '',
    notes: '',
    blocks: [{
      id: isoNowId('block'),
      code: 'N0',
      line: '',
      mode: 'Singolo',
      exercises: (esercizi[day] || []).map((exercise, exerciseIndex) => ({
        id: exercise.id || isoNowId('exercise'),
        order: exerciseIndex + 1,
        name: exercise.nome || '',
        category: exercise.categoria || exerciseCategory(exercise.nome),
        progression: normalizeProgression(exercise.progressione),
        sets: '',
        reps: Array.isArray(exercise.progressione?.sedute) ? exercise.progressione.sedute.join(' / ') : '',
        rest: exercise.recupero || '',
        tut: exercise.progressione?.tut || '',
        load: '',
        rir: '',
        notes: exercise.note || exercise.categoria || '',
      })),
    }],
  }));
}

function defaultSessions() {
  return [{
    id: isoNowId('session'),
    name: 'Seduta A',
    weekDay: '1',
    focus: '',
    duration: '60',
    warmup: '',
    cooldown: '',
    notes: '',
    blocks: [{
      id: isoNowId('block'),
      code: 'N0',
      line: '',
      mode: 'Singolo',
      exercises: [emptyExercise(1)],
    }],
  }];
}

function emptyExercise(order = 1) {
  return {
    id: isoNowId('exercise'),
    order,
    name: '',
    category: '',
    progression: null,
    sets: '',
    reps: '',
    rest: '',
    tut: '',
    load: '',
    rir: '',
    notes: '',
  };
}

function normalizeProgram(row) {
  const data = row.data || {};
  const clientId = row.cliente_id || data.client_id || data.clienteId || data.cliente_id || '';
  const sessions = Array.isArray(data.sessions) && data.sessions.length
    ? data.sessions
    : normalizeLegacyExercises(data);
  return {
    rowId: row.id,
    id: data.id || row.id,
    client_id: clientId,
    trainer_id: data.trainer_id || data.trainerId || '',
    created_by: data.created_by || data.createdBy || data.trainer_id || '',
    name: data.name || data.nome || 'Scheda senza nome',
    goal: data.goal || data.obiettivo || data.note || '',
    level: data.level || data.livello || 'base',
    weeks: Number(data.weeks || data.settimane || 4),
    frequency: Number(data.frequency || data.frequenza_settimanale || (Array.isArray(data.giorni) ? data.giorni.length : 2)),
    split: data.split || '',
    start_date: data.start_date || data.inizio || '',
    end_date: data.end_date || '',
    status: data.status || data.stato || 'attiva',
    notes: data.notes || data.note_generali || '',
    neacea_string: data.neacea_string || '',
    sessions,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function programPayload(program) {
  return {
    id: program.id,
    client_id: program.client_id,
    trainer_id: program.trainer_id,
    created_by: program.created_by || program.trainer_id,
    name: program.name,
    goal: program.goal,
    level: program.level,
    weeks: Number(program.weeks || 4),
    frequency: Number(program.frequency || 1),
    split: program.split,
    start_date: program.start_date,
    end_date: program.end_date,
    status: program.status,
    notes: program.notes,
    neacea_string: program.neacea_string,
    sessions: program.sessions,
    schema_version: 2,
  };
}

function buildNeaceaString(program) {
  const codes = [];
  (program.sessions || []).forEach((session) => {
    (session.blocks || []).forEach((block) => {
      if (block.code && !codes.includes(block.code)) codes.push(block.code);
    });
  });
  const split = program.split ? ` · ${program.split}` : '';
  return `${program.name || 'Scheda'} · ${codes.map(blockLabel).join(' / ') || 'N0 Tecnico'}${split}`;
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

async function loadPrograms() {
  try {
    const rows = await sb('schede_allenamento', '?select=id,cliente_id,data,created_at,updated_at&order=updated_at.desc');
    state.programs = (rows || []).map(normalizeProgram);
  } catch (error) {
    state.programs = [];
  }
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

  await loadPrograms();

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

function operatorPrograms() {
  const allowedClientIds = new Set(operatorClients().map((client) => client.client_id));
  const clientFilter = els.programClientFilter.value;
  const statusFilter = els.programStatusFilter.value;
  return state.programs
    .filter((program) => !state.selectedOperatorId || program.trainer_id === state.selectedOperatorId || allowedClientIds.has(program.client_id))
    .filter((program) => !clientFilter || program.client_id === clientFilter)
    .filter((program) => !statusFilter || program.status === statusFilter)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function clientPrograms(clientId) {
  return state.programs.filter((program) => program.client_id === clientId);
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
  els.programClient.innerHTML = clientOptions || '<option value="">Nessun cliente trovato</option>';
  els.programClientFilter.innerHTML = `<option value="">Tutti i clienti assegnati</option>${clientOptions}`;
  els.exerciseLibrary.innerHTML = flattenExercises()
    .map((item) => `<option value="${esc(item.name)}" label="${esc(item.category)}"></option>`)
    .join('');
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
  const programs = clientPrograms(client.client_id);
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

      <div class="section-title">Programmi PT</div>
      <div class="stack">
        ${programs.length ? programs.slice(0, 5).map(renderClientProgramItem).join('') : '<div class="empty">Nessuna scheda PT</div>'}
      </div>

      <div class="section-title">Note operative</div>
      <div class="row-card">${esc(client.note_operative || client.note_cliente || 'Nessuna nota')}</div>
    </div>
  `;
}

function renderClientProgramItem(program) {
  return `
    <article class="row-card clickable" data-open-program="${esc(program.id)}">
      <div class="row-title">
        <span>${esc(program.name)}</span>
        <span class="pill">${esc(program.status)}</span>
      </div>
      <div class="row-sub">${esc(program.goal || 'Obiettivo non indicato')} · ${esc(program.weeks)} settimane</div>
    </article>
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

function renderPrograms() {
  const programs = operatorPrograms();
  els.programCount.textContent = programs.length;
  els.programList.innerHTML = programs.length
    ? programs.map(renderProgramCard).join('')
    : '<div class="empty">Nessuna scheda PT</div>';

  if (!state.selectedProgramId && programs.length) {
    state.selectedProgramId = programs[0].id;
  }

  const current = state.programs.find((program) => program.id === state.selectedProgramId);
  if (current) {
    fillProgramForm(current);
  } else {
    newProgramDraft();
  }
}

function renderProgramCard(program) {
  const client = getClient(program.client_id);
  const selected = program.id === state.selectedProgramId ? ' selected' : '';
  const activeClass = program.status === 'attiva' ? ' info' : program.status === 'archiviata' ? ' warning' : '';
  return `
    <article class="row-card clickable${selected}" data-program-id="${esc(program.id)}">
      <div class="row-title">
        <span>${esc(program.name)}</span>
        <span class="alert-pill${activeClass}">${esc(program.status)}</span>
      </div>
      <div class="row-sub">${esc(client ? fullName(client) : 'Cliente')} · ${esc(program.goal || 'Obiettivo non indicato')}</div>
      <div class="row-sub">${esc(program.weeks)} settimane · ${esc(program.frequency)} sedute/settimana · ${esc(program.neacea_string || buildNeaceaString(program))}</div>
    </article>
  `;
}

function newProgramDraft(clientId = '') {
  const client = clientId ? getClient(clientId) : operatorClients()[0];
  const draft = {
    id: '',
    client_id: client?.client_id || '',
    trainer_id: state.selectedOperatorId,
    created_by: state.selectedOperatorId,
    name: '',
    goal: client?.obiettivo || client?.anamnesi_obiettivo || '',
    level: 'base',
    weeks: 4,
    frequency: 2,
    split: '',
    start_date: todayIso(),
    end_date: '',
    status: 'bozza',
    notes: '',
    neacea_string: '',
    sessions: defaultSessions(),
  };
  fillProgramForm(draft);
}

function fillProgramForm(program) {
  state.programSessions = JSON.parse(JSON.stringify(program.sessions || defaultSessions()));
  els.programId.value = program.id || '';
  els.programClient.value = program.client_id || operatorClients()[0]?.client_id || '';
  els.programStatus.value = program.status || 'bozza';
  els.programName.value = program.name || '';
  els.programGoal.value = program.goal || '';
  els.programLevel.value = program.level || 'base';
  els.programWeeks.value = program.weeks || 4;
  els.programFrequency.value = program.frequency || 2;
  els.programSplit.value = program.split || '';
  els.programStart.value = program.start_date || '';
  els.programEnd.value = program.end_date || '';
  els.programNotes.value = program.notes || '';
  els.programEditorTitle.textContent = program.id ? 'Modifica scheda' : 'Nuova scheda';
  els.programEditorStatus.textContent = program.status || 'bozza';
  renderSessionEditor();
  updateNeaceaPreview();
}

function readProgramForm() {
  const program = {
    id: els.programId.value || isoNowId('pt_program'),
    client_id: els.programClient.value,
    trainer_id: state.selectedOperatorId,
    created_by: state.selectedOperatorId,
    name: els.programName.value.trim() || 'Scheda PT',
    goal: els.programGoal.value.trim(),
    level: els.programLevel.value,
    weeks: Number(els.programWeeks.value || 4),
    frequency: Number(els.programFrequency.value || 1),
    split: els.programSplit.value.trim(),
    start_date: els.programStart.value,
    end_date: els.programEnd.value,
    status: els.programStatus.value,
    notes: els.programNotes.value.trim(),
    sessions: state.programSessions,
  };
  program.neacea_string = buildNeaceaString(program);
  return program;
}

function renderSessionEditor() {
  els.sessionEditor.innerHTML = state.programSessions.map((session, sessionIndex) => `
    <article class="session-card" data-session-index="${sessionIndex}">
      <div class="session-head">
        <strong>${esc(session.name || `Seduta ${sessionIndex + 1}`)}</strong>
        <button class="icon-btn" type="button" data-remove-session="${sessionIndex}">Rimuovi</button>
      </div>
      <div class="program-form-grid compact">
        <label><span>Nome seduta</span><input data-session-field="name" value="${esc(session.name)}"></label>
        <label><span>Giorno/settimana</span><input data-session-field="weekDay" value="${esc(session.weekDay)}"></label>
        <label><span>Focus</span><input data-session-field="focus" value="${esc(session.focus)}"></label>
        <label><span>Durata min</span><input data-session-field="duration" value="${esc(session.duration)}"></label>
      </div>
      <div class="program-form-grid compact">
        <label><span>Riscaldamento</span><input data-session-field="warmup" value="${esc(session.warmup)}"></label>
        <label><span>Defaticamento</span><input data-session-field="cooldown" value="${esc(session.cooldown)}"></label>
        <label class="span-2"><span>Note trainer</span><input data-session-field="notes" value="${esc(session.notes)}"></label>
      </div>
      <div class="block-list">
        ${(session.blocks || []).map((block, blockIndex) => renderBlockEditor(block, sessionIndex, blockIndex)).join('')}
      </div>
      <button class="secondary-btn" type="button" data-add-block="${sessionIndex}">Aggiungi blocco</button>
    </article>
  `).join('');
}

function renderBlockEditor(block, sessionIndex, blockIndex) {
  const codeOptions = NEACEA_BLOCKS.map(([code, label]) =>
    `<option value="${esc(code)}"${block.code === code ? ' selected' : ''}>${esc(code)} - ${esc(label)}</option>`
  ).join('');
  const modeOptions = MODES.map((mode) =>
    `<option value="${esc(mode)}"${block.mode === mode ? ' selected' : ''}>${esc(mode)}</option>`
  ).join('');
  return `
    <div class="block-card" data-block-index="${blockIndex}">
      <div class="program-form-grid compact">
        <label><span>Codice NEACEA</span><select data-block-field="code">${codeOptions}</select></label>
        <label><span>Linea movimento</span><input data-block-field="line" value="${esc(block.line)}" placeholder="Spinta orizzontale"></label>
        <label><span>Modalita</span><select data-block-field="mode">${modeOptions}</select></label>
        <label><span>Azioni</span><button class="danger-btn slim" type="button" data-remove-block="${sessionIndex}:${blockIndex}">Rimuovi blocco</button></label>
      </div>
      <div class="exercise-list">
        ${(block.exercises || []).map((exercise, exerciseIndex) => renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex)).join('')}
      </div>
      <button class="secondary-btn" type="button" data-add-exercise="${sessionIndex}:${blockIndex}">Aggiungi esercizio</button>
    </div>
  `;
}

function renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex) {
  const progression = normalizeProgression(exercise.progression);
  const progressionOptions = [
    '<option value="">Senza progressione</option>',
    ...Object.entries(PROGRESSION_LIBRARY).map(([group, progressions]) => `
      <optgroup label="${esc(group)}">
        ${progressions.map((item) => `<option value="${esc(item.name)}"${progression?.name === item.name ? ' selected' : ''}>${esc(item.name)}</option>`).join('')}
      </optgroup>
    `),
  ].join('');
  const sedute = progression?.sessions || [];
  return `
    <div class="exercise-card-compact" data-exercise-index="${exerciseIndex}">
      <div class="exercise-compact-head">
        <div class="exercise-order">${esc(exercise.order || exerciseIndex + 1)}</div>
        <div class="exercise-main-fields">
          <input class="exercise-name-input" data-exercise-field="name" list="exerciseLibrary" value="${esc(exercise.name)}" placeholder="Esercizio">
          <input data-exercise-field="category" value="${esc(exercise.category || exerciseCategory(exercise.name))}" placeholder="Categoria">
        </div>
        <select data-exercise-field="progressionName">${progressionOptions}</select>
        <input data-exercise-field="rest" value="${esc(exercise.rest)}" placeholder="Rec.">
        <input data-exercise-field="load" value="${esc(exercise.load)}" placeholder="Carico">
        <input data-exercise-field="rir" value="${esc(exercise.rir)}" placeholder="RIR">
        <button class="danger-btn slim" type="button" data-remove-exercise="${sessionIndex}:${blockIndex}:${exerciseIndex}">X</button>
      </div>
      <div class="exercise-progression-strip">
        <span class="tut-badge">TUT ${esc(progression?.tut || exercise.tut || '-')}</span>
        ${sedute.length
          ? sedute.map((item, index) => `<span class="seduta-pill"><b>Sed.${index + 1}</b>${esc(item)}</span>`).join('')
          : '<span class="seduta-empty">Progressione manuale</span>'}
      </div>
      <div class="exercise-notes-line">
        <input data-exercise-field="notes" value="${esc(exercise.notes)}" placeholder="Note tecniche">
      </div>
    </div>
  `;
}

function syncProgramEditor() {
  els.sessionEditor.querySelectorAll('[data-session-index]').forEach((sessionEl) => {
    const session = state.programSessions[Number(sessionEl.dataset.sessionIndex)];
    sessionEl.querySelectorAll('[data-session-field]').forEach((input) => {
      session[input.dataset.sessionField] = input.value;
    });
    sessionEl.querySelectorAll('[data-block-index]').forEach((blockEl) => {
      const block = session.blocks[Number(blockEl.dataset.blockIndex)];
      blockEl.querySelectorAll('[data-block-field]').forEach((input) => {
        block[input.dataset.blockField] = input.value;
      });
      blockEl.querySelectorAll('[data-exercise-index]').forEach((exerciseEl) => {
        const exercise = block.exercises[Number(exerciseEl.dataset.exerciseIndex)];
        exerciseEl.querySelectorAll('[data-exercise-field]').forEach((input) => {
          if (input.dataset.exerciseField === 'progressionName') {
            exercise.progression = normalizeProgression(input.value);
            exercise.tut = exercise.progression?.tut || exercise.tut || '';
            exercise.reps = exercise.progression?.sessions?.join(' / ') || exercise.reps || '';
          } else {
            exercise[input.dataset.exerciseField] = input.value;
          }
        });
        if (!exercise.category) exercise.category = exerciseCategory(exercise.name);
      });
    });
  });
}

function updateNeaceaPreview() {
  const program = readProgramForm();
  els.neaceaString.textContent = buildNeaceaString(program);
}

async function saveProgram() {
  syncProgramEditor();
  const program = readProgramForm();
  if (!program.client_id) throw new Error('Seleziona un cliente');
  await sb('schede_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: {
      id: program.id,
      cliente_id: program.client_id,
      data: programPayload(program),
      updated_at: new Date().toISOString(),
    },
  });
  state.selectedProgramId = program.id;
  await refresh();
}

async function archiveProgram() {
  if (!els.programId.value) return;
  els.programStatus.value = 'archiviata';
  await saveProgram();
}

async function duplicateProgram(mode) {
  syncProgramEditor();
  const source = readProgramForm();
  const clone = JSON.parse(JSON.stringify(source));
  clone.id = isoNowId('pt_program');
  clone.name = `${source.name || 'Scheda PT'} - copia`;
  clone.status = 'bozza';
  clone.start_date = todayIso();
  clone.end_date = '';
  if (mode === 'empty') {
    clone.sessions.forEach((session) => {
      session.blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          exercise.load = '';
          exercise.rir = '';
        });
      });
    });
  }
  if (mode === 'progression') {
    clone.notes = `${clone.notes ? `${clone.notes}\n` : ''}Progressione proposta: aumentare i carichi del 2-5% dove tecnica e RIR lo consentono.`;
  }
  clone.neacea_string = buildNeaceaString(clone);
  await sb('schede_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: {
      id: clone.id,
      cliente_id: clone.client_id,
      data: programPayload(clone),
      updated_at: new Date().toISOString(),
    },
  });
  state.selectedProgramId = clone.id;
  await refresh();
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
  renderPrograms();
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

  els.clientDetail.addEventListener('click', (event) => {
    const row = event.target.closest('[data-open-program]');
    if (!row) return;
    state.selectedProgramId = row.dataset.openProgram;
    document.querySelector('[data-view="programs"]').click();
    renderPrograms();
  });

  els.assignTrainer.addEventListener('change', () => {
    state.selectedOperatorId = els.assignTrainer.value;
    state.selectedProgramId = '';
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

  els.programClientFilter.addEventListener('change', () => {
    state.selectedProgramId = '';
    renderPrograms();
  });

  els.programStatusFilter.addEventListener('change', () => {
    state.selectedProgramId = '';
    renderPrograms();
  });

  els.newProgramButton.addEventListener('click', () => {
    state.selectedProgramId = '';
    newProgramDraft(els.programClientFilter.value || state.selectedClientId);
  });

  els.programList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-program-id]');
    if (!row) return;
    state.selectedProgramId = row.dataset.programId;
    renderPrograms();
  });

  els.programForm.addEventListener('input', () => {
    syncProgramEditor();
    updateNeaceaPreview();
  });

  els.programForm.addEventListener('change', (event) => {
    syncProgramEditor();
    if (event.target?.dataset?.exerciseField === 'progressionName' || event.target?.dataset?.exerciseField === 'name') {
      renderSessionEditor();
    }
    updateNeaceaPreview();
  });

  els.programForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      clearError();
      await saveProgram();
    } catch (error) {
      showError(`Salvataggio scheda non riuscito: ${error.message}`);
    }
  });

  els.addSessionButton.addEventListener('click', () => {
    syncProgramEditor();
    state.programSessions.push({
      id: isoNowId('session'),
      name: `Seduta ${state.programSessions.length + 1}`,
      weekDay: String(state.programSessions.length + 1),
      focus: '',
      duration: '60',
      warmup: '',
      cooldown: '',
      notes: '',
      blocks: [{
        id: isoNowId('block'),
        code: 'N0',
        line: '',
        mode: 'Singolo',
        exercises: [emptyExercise(1)],
      }],
    });
    renderSessionEditor();
    updateNeaceaPreview();
  });

  els.sessionEditor.addEventListener('click', (event) => {
    const addBlock = event.target.closest('[data-add-block]');
    const addExercise = event.target.closest('[data-add-exercise]');
    const removeSession = event.target.closest('[data-remove-session]');
    const removeBlock = event.target.closest('[data-remove-block]');
    const removeExercise = event.target.closest('[data-remove-exercise]');
    syncProgramEditor();

    if (addBlock) {
      const session = state.programSessions[Number(addBlock.dataset.addBlock)];
      session.blocks.push({ id: isoNowId('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [emptyExercise(1)] });
    }

    if (addExercise) {
      const [sessionIndex, blockIndex] = addExercise.dataset.addExercise.split(':').map(Number);
      const exercises = state.programSessions[sessionIndex].blocks[blockIndex].exercises;
      exercises.push(emptyExercise(exercises.length + 1));
    }

    if (removeSession && state.programSessions.length > 1) {
      state.programSessions.splice(Number(removeSession.dataset.removeSession), 1);
    }

    if (removeBlock) {
      const [sessionIndex, blockIndex] = removeBlock.dataset.removeBlock.split(':').map(Number);
      const blocks = state.programSessions[sessionIndex].blocks;
      if (blocks.length > 1) blocks.splice(blockIndex, 1);
    }

    if (removeExercise) {
      const [sessionIndex, blockIndex, exerciseIndex] = removeExercise.dataset.removeExercise.split(':').map(Number);
      const exercises = state.programSessions[sessionIndex].blocks[blockIndex].exercises;
      if (exercises.length > 1) exercises.splice(exerciseIndex, 1);
    }

    if (addBlock || addExercise || removeSession || removeBlock || removeExercise) {
      renderSessionEditor();
      updateNeaceaPreview();
    }
  });

  els.archiveProgramButton.addEventListener('click', async () => {
    try {
      clearError();
      await archiveProgram();
    } catch (error) {
      showError(`Archiviazione non riuscita: ${error.message}`);
    }
  });

  els.duplicateEmptyButton.addEventListener('click', async () => {
    try {
      clearError();
      await duplicateProgram('empty');
    } catch (error) {
      showError(`Duplicazione non riuscita: ${error.message}`);
    }
  });

  els.duplicateHistoryButton.addEventListener('click', async () => {
    try {
      clearError();
      await duplicateProgram('history');
    } catch (error) {
      showError(`Duplicazione non riuscita: ${error.message}`);
    }
  });

  els.duplicateProgressionButton.addEventListener('click', async () => {
    try {
      clearError();
      await duplicateProgram('progression');
    } catch (error) {
      showError(`Duplicazione non riuscita: ${error.message}`);
    }
  });
}

function cacheElements() {
  [
    'operatorSelect',
    'migrationNotice',
    'errorBox',
    'exerciseLibrary',
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
    'programClientFilter',
    'programStatusFilter',
    'newProgramButton',
    'programCount',
    'programList',
    'programEditorTitle',
    'programEditorStatus',
    'programForm',
    'programId',
    'programClient',
    'programStatus',
    'programName',
    'programGoal',
    'programLevel',
    'programWeeks',
    'programFrequency',
    'programSplit',
    'programStart',
    'programEnd',
    'programNotes',
    'neaceaString',
    'addSessionButton',
    'sessionEditor',
    'duplicateEmptyButton',
    'duplicateHistoryButton',
    'duplicateProgressionButton',
    'archiveProgramButton',
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
