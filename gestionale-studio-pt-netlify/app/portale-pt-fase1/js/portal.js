const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';
const FOTO_STORAGE_BUCKET = 'client-photos';

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
  'Mobilita Anca': ['90/90 anche', 'CARs anca', 'Frog stretch', 'Allungamento flessori anca', 'Tenuta squat profondo'],
  'Attivazione Core': ['Dead bug', 'Bird dog', 'Tenuta hollow', 'Pallof press isometrico', 'Side plank breve'],
  Petto: ['Panca piana bilanciere', 'Panca inclinata bilanciere', 'Panca presa stretta', 'Panca Smith machine', 'Spinte manubri panca piana', 'Spinte manubri panca inclinata', 'Croci manubri', 'Croci cavi alti', 'Croci cavi bassi', 'Croci cavi medi', 'Piegamenti', 'Dip alle parallele'],
  'Schiena - Dorsali': ['Lat machine presa larga', 'Lat machine presa stretta', 'Lat machine presa neutra', 'Trazioni prone', 'Trazioni supine', 'Pulley basso presa larga', 'Pulley basso presa stretta', 'Pulley basso presa neutra', 'Rematore cavo monolaterale', 'Rematore bilanciere', 'Rematore Smith machine', 'Rematore manubrio', 'Pulldown braccia tese al cavo'],
  'Schiena - Romboidi / Trapezio': ['Face pull', 'Rematore alto al cavo', 'Croci inverse al cavo', 'Croci inverse manubri', 'Alzate posteriori busto flesso', 'Pulley presa larga'],
  Spalle: ['Military press', 'Military press Smith machine', 'Spinte manubri spalle', 'Arnold press', 'Alzate laterali manubri', 'Alzate laterali al cavo', 'Alzate frontali manubri', 'Alzate frontali al cavo', 'Tirate al mento', 'Y raise al cavo', 'Landmine press'],
  Bicipiti: ['Curl bilanciere', 'Curl manubri', 'Curl martello', 'Curl cavo basso', 'Curl cavo alto', 'Curl barra EZ', 'Curl concentrato', 'Curl panca Scott al cavo'],
  Tricipiti: ['Panca presa stretta', 'Dip alle parallele', 'Pushdown corda', 'Pushdown barra', 'Estensioni tricipiti sopra testa al cavo', 'Estensioni tricipiti sopra testa manubrio', 'French press', 'Pushdown monolaterale'],
  Quadricipiti: ['Squat', 'Front squat', 'Squat con pausa', 'Pin squat', 'Squat Smith machine', 'Hack squat bilanciere', 'Bulgarian split squat', 'Split squat Smith machine', 'Goblet squat', 'Landmine squat', 'Affondi manubri', 'Affondi camminati', 'Step up'],
  'Posteriori Coscia / Glutei': ['Stacco rumeno', 'Stacco da terra', 'Good morning', 'Hip thrust bilanciere', 'Hip thrust Smith machine', 'Hip thrust manubrio', 'Pull through al cavo', 'Swing kettlebell', 'Nordic curl', 'Stacco rumeno manubri', 'Stacco rumeno monopodalico'],
  Polpacci: ['Calf raise bilanciere', 'Calf raise manubri', 'Calf raise al cavo', 'Calf raise seduto'],
  Core: ['Plank', 'Side plank', 'Dead bug', 'Bird dog', 'Pallof press', 'Crunch al cavo', 'Sollevamento gambe alla sbarra', 'Ab wheel', 'Rotazioni landmine', 'Hollow body', 'Russian twist kettlebell'],
  'Kettlebell - Balistici': ['Swing kettlebell', 'Clean kettlebell', 'Snatch kettlebell', 'Press kettlebell', 'Turkish get up', 'Windmill', 'Halo', 'Goblet squat kettlebell'],
  'Multiarticolari / Full Body': ['Stacco da terra', 'Clean landmine', 'Thruster landmine', 'Camminata del contadino', 'Complex kettlebell'],
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
  calendarView: 'week',
  calendarReference: todayIso(),
  selectedOperatorId: '',
  selectedClientId: '',
  clientSection: 'overview',
  selectedProgramId: '',
  mediaClientId: '',
  mediaLoading: false,
  mediaError: '',
  datiFisici: [],
  foto: [],
  programSessions: [],
  builderExercise: null,
  builderProgressionGroup: 'Tecnica',
  builderProgression: null,
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToBase64Resized(file, maxW = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

function parseIsoDate(value) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(value, days) {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function addMonths(value, months) {
  const date = parseIsoDate(value);
  date.setMonth(date.getMonth() + months);
  return dateKey(date);
}

function weekStart(reference) {
  const start = new Date(reference);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

function sameMonth(value, reference = new Date()) {
  const date = parseIsoDate(value);
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

function sameWeek(value, reference = new Date()) {
  const date = parseIsoDate(value);
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function calendarRangeLabel(reference) {
  if (state.calendarView === 'day') return formatDate(dateKey(reference));
  if (state.calendarView === 'month') {
    return reference.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(dateKey(start))} - ${formatDate(dateKey(end))}`;
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

function selectedClient() {
  return getClient(state.selectedClientId);
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
      exercises: [],
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
    notes: '',
  };
}

function normalizeProgram(row) {
  const data = row.data || {};
  const clientId = row.cliente_id || data.client_id || data.clienteId || data.cliente_id || '';
  const rawSessions = Array.isArray(data.sessions) && data.sessions.length
    ? data.sessions
    : normalizeLegacyExercises(data);
  const sessions = rawSessions.map((session) => ({
    ...session,
    blocks: (session.blocks || []).map((block) => ({
      ...block,
      exercises: (block.exercises || []).filter((exercise) =>
        exercise?.name || exercise?.progression || exercise?.notes || exercise?.load
      ),
    })),
  }));
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

function cleanProgramName(value) {
  return String(value || 'Scheda PT')
    .replace(/(\s*-\s*copia)+$/gi, '')
    .replace(/\s*[·-]\s*(N\d{1,2}\s+[A-Za-zÀ-ÿ/ ]+|N\d{1,2}|CC)\b/gi, '')
    .replace(/\b(N\d{1,2}|CC)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Scheda PT';
}

function buildNeaceaString(program) {
  const split = program.split ? ` · ${program.split}` : '';
  return `${cleanProgramName(program.name || 'Scheda PT')}${split}`;
}

function sessionName(index) {
  return `Seduta ${String.fromCharCode(65 + index)}`;
}

function compactProgramList(programs) {
  const grouped = new Map();
  programs.forEach((program) => {
    const key = [
      program.client_id,
      cleanProgramName(program.name).toLowerCase(),
      String(program.goal || '').toLowerCase(),
      program.status,
    ].join('|');
    const current = grouped.get(key);
    if (!current || String(program.updated_at || '').localeCompare(String(current.updated_at || '')) > 0) {
      grouped.set(key, program);
    }
  });
  return Array.from(grouped.values())
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
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
    active: op.active !== false,
    portal_access_enabled: op.portal_access_enabled ?? op.pt_portal_enabled ?? false,
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

  if (state.selectedOperatorId && !state.operators.some((op) => op.id === state.selectedOperatorId)) {
    state.selectedOperatorId = '';
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

  els.operatorSelect.innerHTML = `<option value="">Tutti gli operatori</option>${options}`;
  els.assignTrainer.innerHTML = options || '<option value="">Nessun PT trovato</option>';
  els.operatorSelect.value = state.selectedOperatorId;
  els.assignTrainer.value = state.selectedOperatorId || state.operators[0]?.id || '';

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
  const metrics = state.selectedOperatorId
    ? (state.metrics.find((item) => item.trainer_id === state.selectedOperatorId) || {})
    : {
        clienti_assegnati: operatorClients().length,
        sedute_oggi: state.sessions.filter((session) => session.status !== 'annullato' && session.date === todayIso()).length,
        sedute_settimana: state.sessions.filter((session) => session.status !== 'annullato' && sameWeek(session.date)).length,
        clienti_da_rivalutare: state.metrics.reduce((sum, item) => sum + Number(item.clienti_da_rivalutare || 0), 0),
      };
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
    state.mediaClientId = '';
    state.mediaError = '';
    state.datiFisici = [];
    state.foto = [];
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

function percent(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function mediaForSelectedClient() {
  if (state.mediaClientId !== state.selectedClientId) {
    return { datiFisici: [], foto: [], mediaError: '' };
  }
  return { datiFisici: state.datiFisici || [], foto: state.foto || [], mediaError: state.mediaError || '' };
}

function flattenMediaRow(row) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};
  const url = data.url || row?.url || '';
  const filename = data.filename || data.nome_file || row?.filename || row?.nome_file || '';
  const inferredTipo = data.tipo || row?.tipo || inferMediaType({ url, filename, mimeType: data.mimeType || data.mime_type });
  return {
    ...data,
    id: row?.id || data.id || '',
    clienteId: row?.cliente_id || data.clienteId || data.cliente_id || '',
    url,
    filename,
    nome_file: data.nome_file || data.filename || row?.nome_file || row?.filename || '',
    data: data.data || row?.data_rilevazione || row?.created_at?.slice(0, 10) || '',
    visitaId: data.visitaId || data.visita_id || '',
    bucket: data.bucket || row?.bucket || '',
    storagePath: data.storagePath || data.storage_path || row?.storage_path || '',
    storage_path: data.storage_path || data.storagePath || row?.storage_path || '',
    tipo: inferredTipo,
  };
}

function inferMediaType(item) {
  const tipo = String(item?.tipo || '').toLowerCase();
  if (tipo) return tipo;
  const mime = String(item?.mimeType || item?.mime_type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'foto';
  if (mime.includes('pdf')) return 'file';
  const value = `${item?.url || ''} ${item?.filename || ''} ${item?.nome_file || ''}`.toLowerCase();
  if (value.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(value)) return 'foto';
  return 'file';
}

function flattenDatiFisiciRow(row) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...data,
    id: row?.id || data.id || '',
    clienteId: row?.cliente_id || data.clienteId || data.cliente_id || '',
    data: data.data || row?.data_rilevazione || row?.created_at?.slice(0, 10) || '',
    data_rilevazione: row?.data_rilevazione || data.data || data.data_rilevazione || '',
    peso: data.peso ?? row?.peso,
    altezza: data.altezza ?? row?.altezza,
    bmi: data.bmi ?? data.imc ?? row?.bmi,
    pgc: data.pgc ?? data.percentuale_grasso ?? data.grasso_percentuale ?? row?.percentuale_grasso,
    percentuale_grasso: data.percentuale_grasso ?? data.pgc ?? data.grasso_percentuale ?? row?.percentuale_grasso,
    massa_grassa: data.massa_grassa ?? data.v_grassa ?? row?.massa_grassa,
    massa_muscolare: data.massa_muscolare ?? data.v_muscolare ?? row?.massa_muscolare,
    metabolismo_basale: data.metabolismo_basale ?? data.metabolismo ?? data.tasso_metabolico ?? row?.metabolismo_basale,
    eta_metabolica: data.eta_metabolica ?? data.etaMet ?? row?.eta_metabolica,
    massa_magra: data.massa_magra ?? data.ffm ?? row?.massa_magra,
    acqua_totale: data.acqua_totale ?? data.tbw ?? data.acqua_corporea ?? row?.acqua_totale,
    vita: data.vita ?? row?.vita,
    fianchi: data.fianchi ?? row?.fianchi,
    score_visbody: data.score_visbody ?? data.score ?? row?.score_visbody,
    indice_salute: data.indice_salute ?? data.indice ?? row?.indice_salute,
  };
}

async function loadClientMedia(clientId) {
  if (!clientId || state.mediaClientId === clientId || state.mediaLoading) return;
  state.mediaLoading = true;
  state.mediaClientId = clientId;
  state.mediaError = '';
  state.datiFisici = [];
  state.foto = [];
  renderClientDetail();
  try {
    const [datiFisici, foto] = await Promise.all([
      sb('dati_fisici', `?select=*&cliente_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc`),
      sb('foto_allenamento', `?select=*&cliente_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc`),
    ]);
    if (state.selectedClientId !== clientId) return;
    state.datiFisici = (datiFisici || []).map(flattenDatiFisiciRow);
    state.foto = (foto || []).map(flattenMediaRow);
    state.mediaError = '';
  } catch (error) {
    if (state.selectedClientId === clientId) {
      state.datiFisici = [];
      state.foto = [];
      state.mediaError = 'Visbody e foto non disponibili al momento.';
    }
  } finally {
    state.mediaLoading = false;
    if (state.selectedClientId === clientId) renderClientDetail();
  }
}

function measureBox(label, value, unit) {
  return `
    <div class="measure-box">
      <span>${esc(label)}</span>
      <strong>${value || value === 0 ? esc(value) : '-'}</strong>
      <em>${esc(unit)}</em>
    </div>
  `;
}

function renderComposition(d) {
  if (!d || !Object.keys(d).length) return '<div class="empty compact">Nessun dato</div>';
  const rows = [
    ['Massa grassa', d.massa_grassa, 'kg'],
    ['Massa muscolare', d.massa_muscolare, 'kg'],
    ['Acqua totale', d.acqua_totale, 'lt'],
    ['Metabolismo basale', d.metabolismo_basale, 'kcal'],
    ['Eta metabolica', d.eta_metabolica, 'anni'],
    ['Score Visbody', d.score_visbody || d.indice_salute, ''],
  ].filter((row) => row[1] || row[1] === 0);
  if (!rows.length) return '<div class="empty compact">Rilevamento presente, ma senza valori di composizione.</div>';
  return `
    <div class="dati-grid">
      ${rows.map(([label, value, unit]) => `
        <div class="dati-item">
          <div class="dati-val">${esc(value)}${unit ? ` <span>${esc(unit)}</span>` : ''}</div>
          <div class="dati-label">${esc(label)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFileList() {
  const { foto } = mediaForSelectedClient();
  const files = foto.filter((item) => inferMediaType(item) !== 'foto');
  if (!files.length) return '<div class="empty compact">Nessun file dispositivo caricato.</div>';
  return files.map((item) => `
    <div class="device-file-row">
      <span>✓</span>
      <strong>${esc(String(item.tipo || 'file').toUpperCase())}</strong>
      <em>${esc(item.nome_file || item.filename || 'File caricato')}</em>
      <a href="${esc(item.url)}" target="_blank" rel="noopener">Apri →</a>
      <button class="foto-del inline" type="button" data-delete-photo="${esc(item.id)}">×</button>
    </div>
  `).join('');
}

function renderPhotoGrid() {
  const { foto } = mediaForSelectedClient();
  const photos = foto.filter((item) => inferMediaType(item) === 'foto' && item.url);
  if (!photos.length) return '<div class="empty" style="grid-column:1/-1"><div class="empty-title">Nessuna foto</div><div class="empty-sub">Le foto caricate appariranno qui</div></div>';
  return photos.map((item) => `
    <div class="foto-item" data-open-photo="${esc(item.url)}">
      <img src="${esc(item.url)}" alt="${esc(item.filename || item.nome_file || '')}" loading="lazy">
      <div class="foto-meta">${esc(formatDate(item.data || item.data_scatto))}</div>
      <button class="foto-del" type="button" data-delete-photo="${esc(item.id)}">×</button>
    </div>
  `).join('');
}

function renderClientMediaSection(client) {
  const loading = state.mediaLoading && state.mediaClientId === client.client_id;
  const { datiFisici, mediaError } = mediaForSelectedClient();
  const latest = datiFisici[0] || {};
  const mediaNotice = mediaError ? `<div class="media-note">${esc(mediaError)}</div>` : '';
  const dateLabel = loading
    ? 'Caricamento...'
    : (latest.data_rilevazione || latest.data ? `Ultimo rilevamento ${formatDate(latest.data_rilevazione || latest.data)}` : 'Nessun rilevamento');
  return `
    <div class="section-title">Dati Fisici & Composizione</div>
    ${mediaNotice}
    <div class="fisici-head">
      <div>
        <div class="fisici-title">Dati Fisici & Composizione</div>
        <div class="fisici-sub">${esc(dateLabel)}</div>
      </div>
      <button class="primary-btn slim" type="button">+ Nuovo rilevamento</button>
    </div>

    <div class="misure-grid">
      <div class="mis-box"><div class="mis-val">${latest.peso || latest.peso === 0 ? esc(latest.peso) : '—'}</div><div class="mis-unit">kg</div><div class="mis-label">Peso</div></div>
      <div class="mis-box"><div class="mis-val">${latest.altezza || latest.altezza === 0 ? esc(latest.altezza) : '—'}</div><div class="mis-unit">cm</div><div class="mis-label">Altezza</div></div>
      <div class="mis-box"><div class="mis-val">${latest.bmi || latest.bmi === 0 ? esc(latest.bmi) : '—'}</div><div class="mis-unit"></div><div class="mis-label">BMI</div></div>
      <div class="mis-box"><div class="mis-val">${latest.percentuale_grasso || latest.pgc || latest.percentuale_grasso === 0 || latest.pgc === 0 ? esc(latest.percentuale_grasso ?? latest.pgc) : '—'}</div><div class="mis-unit">%</div><div class="mis-label">% Grasso</div></div>
    </div>

    <div class="nutri-g2">
      <section class="nutri-card">
        <div class="nutri-card-head">
          <span class="nutri-card-title">Visbody — Composizione</span>
          <button class="secondary-btn slim" type="button">Aggiorna</button>
        </div>
        <div class="nutri-card-body">
          ${renderComposition(latest)}
        </div>
      </section>

      <section class="nutri-card">
        <div class="nutri-card-head">
          <span class="nutri-card-title">Baiobit — Test Funzionali</span>
          <button class="secondary-btn slim" type="button">Aggiorna</button>
        </div>
        <div class="nutri-card-body">
          <div class="test-grid">
            ${['Test Cammino', 'Test Spalla', 'Squat Jump', 'Rischio Caduta', 'Test Tronco', 'Test Cervicale', 'Drop Jump', 'Jump Monopodalico', 'Stiffness Test'].map((label) => `
              <div class="test-item"><strong>${esc(label)}</strong><span>—</span></div>
            `).join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="nutri-card">
      <div class="nutri-card-head"><span class="nutri-card-title">Carica File Dispositivi</span></div>
      <div class="nutri-card-body">
        <div class="nutri-g2">
          <div>
            <div class="upload-label">File Visbody (PDF/Immagine)</div>
            <div class="upload-area" data-upload-trigger="visbody" data-upload-kind="single">
              <input id="ptFileUpload" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden>
              <div class="upload-icon">File</div>
              <div class="upload-text">Trascina o clicca per caricare</div>
              <div class="upload-sub">PDF, JPG, PNG — max 10MB</div>
            </div>
            <div class="upload-progress" id="prog-visbody"><div class="upload-bar" id="bar-visbody"></div></div>
          </div>
          <div>
            <div class="upload-label">File Baiobit (PDF/Immagine)</div>
            <div class="upload-area" data-upload-trigger="baiobit" data-upload-kind="single">
              <input id="ptBaiobitUpload" type="file" accept=".pdf,.jpg,.jpeg,.png" hidden>
              <div class="upload-icon">Test</div>
              <div class="upload-text">Trascina o clicca per caricare</div>
              <div class="upload-sub">PDF, JPG, PNG — max 10MB</div>
            </div>
            <div class="upload-progress" id="prog-baiobit"><div class="upload-bar" id="bar-baiobit"></div></div>
          </div>
        </div>
        <div class="device-file-list">${renderFileList()}</div>
      </div>
    </section>

    <div class="section-title">Fotografie</div>
    <section class="nutri-card">
      <div class="nutri-card-body">
        <div class="foto-actions">
          <select id="foto-visita-filter" disabled><option value="">Tutte le visite</option></select>
          <button class="primary-btn slim" type="button" data-upload-trigger="foto">+ Carica foto</button>
          <input id="ptPhotoUpload" type="file" accept="image/*" multiple hidden>
        </div>
        <div class="upload-area" data-upload-trigger="foto" data-upload-kind="multi">
          <div class="upload-icon">Foto</div>
          <div class="upload-text">Trascina le foto o clicca per selezionare</div>
          <div class="upload-sub">JPG, PNG — ridimensionamento automatico a 1200px</div>
        </div>
        <div class="upload-progress" id="prog-foto"><div class="upload-bar" id="bar-foto"></div></div>
      </div>
    </section>
    <div class="foto-grid">${renderPhotoGrid()}</div>
  `;
}

function renderClientSectionNav(client, programs, alerts) {
  const items = [
    ['overview', 'Riepilogo', 'Anagrafica · Anamnesi · Alert'],
    ['media', 'Dati Fisici', 'Visbody · Baiobit · Foto'],
    ['programs', 'Programmi', `${programs.length} sched${programs.length === 1 ? 'a' : 'e'} PT`],
    ['notes', 'Note', 'Indicazioni operative'],
  ];
  return `
    <aside class="client-section-nav">
      ${items.map(([id, name, sub]) => `
        <button class="client-section-btn${state.clientSection === id ? ' active' : ''}" type="button" data-client-section="${id}">
          <span>${esc(name)}</span>
          <em>${esc(sub)}</em>
        </button>
      `).join('')}
      ${alerts.length ? `<div class="client-side-alert">${alerts.length} alert attiv${alerts.length === 1 ? 'o' : 'i'}</div>` : ''}
    </aside>
  `;
}

function renderClientOverviewSection(client, alerts) {
  return `
    <div class="client-section-body">
      <div class="section-title">Anagrafica cliente</div>
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
    </div>
  `;
}

function renderClientProgramSection(programs) {
  return `
    <div class="client-section-body">
      <div class="section-title">Programmi PT</div>
      <div class="stack">
        ${programs.length ? programs.map(renderClientProgramItem).join('') : '<div class="empty">Nessuna scheda PT</div>'}
      </div>
    </div>
  `;
}

function renderClientNotesSection(client) {
  return `
    <div class="client-section-body">
      <div class="section-title">Note operative</div>
      <div class="row-card">${esc(client.note_operative || client.note_cliente || 'Nessuna nota')}</div>
    </div>
  `;
}

function renderSelectedClientSection(client, programs, alerts) {
  if (state.clientSection === 'media') return renderClientMediaSection(client);
  if (state.clientSection === 'programs') return renderClientProgramSection(programs);
  if (state.clientSection === 'notes') return renderClientNotesSection(client);
  return renderClientOverviewSection(client, alerts);
}

function renderClientDetail() {
  const client = state.clients.find((item) => item.client_id === state.selectedClientId);
  if (!client) {
    els.clientDetail.className = 'detail-empty';
    els.clientDetail.innerHTML = '<div class="detail-empty">Seleziona un cliente</div>';
    return;
  }

  els.clientDetail.className = '';
  if (state.mediaClientId !== client.client_id && !state.mediaLoading) {
    loadClientMedia(client.client_id);
  }
  const alerts = client.alerts || [];
  const programs = clientPrograms(client.client_id);
  els.clientDetail.innerHTML = `
    <div class="client-workspace">
      <div class="client-hero">
        <div>
          <h3>${esc(fullName(client))}</h3>
          <p>${esc(client.obiettivo || 'Obiettivo non indicato')}</p>
        </div>
        <div class="client-hero-meta">
          <span>${esc(selectedOperator() ? fullName(selectedOperator()) : 'PT')}</span>
          <span>${programs.length} sched${programs.length === 1 ? 'a' : 'e'}</span>
          <button class="archive-client-btn" type="button" data-archive-client="${esc(client.client_id)}">Archivia atleta</button>
        </div>
      </div>

      <div class="client-sheet-layout">
        ${renderClientSectionNav(client, programs, alerts)}
        <section class="client-sheet-main">
          ${renderSelectedClientSection(client, programs, alerts)}
        </section>
      </div>
    </div>
  `;
}

function safeStorageSegment(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 90) || 'file';
}

function extFromMime(mimeType, filename) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('pdf')) return 'pdf';
  const ext = String(filename || '').split('.').pop();
  return ext && /^[a-z0-9]{2,5}$/i.test(ext) ? ext.toLowerCase() : 'jpg';
}

function encodeStoragePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function blobFromBase64(base64, mimeType) {
  const bin = atob(String(base64 || ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'image/jpeg' });
}

async function callFotoFunction(payload) {
  try {
    const response = await fetch('/.netlify/functions/foto-pt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.status === 404) return null;
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { success: false, error: text }; }
    if (!response.ok) return { error: json?.error || text || 'Function foto non disponibile' };
    return json;
  } catch (_) {
    return null;
  }
}

function storageErrorMessage(text) {
  const raw = String(text || '');
  if (/invalid_mime_type|mime type/i.test(raw)) return 'Tipo file non accettato dallo storage. I PDF devono usare il bucket client-files.';
  if (/Bucket not found|not found/i.test(raw)) return `Bucket foto Supabase non configurato: crea "${FOTO_STORAGE_BUCKET}".`;
  if (/row-level security|permission|policy|unauthorized|forbidden/i.test(raw)) return `Permessi Storage mancanti per "${FOTO_STORAGE_BUCKET}".`;
  return raw || 'Upload foto fallito';
}

async function uploadMediaStorage({ clientId, base64, filename, mimeType, data }) {
  const ext = extFromMime(mimeType, filename);
  const path = [
    safeStorageSegment(clientId),
    data || todayIso(),
    `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeStorageSegment(filename || 'foto')}.${ext}`,
  ].join('/');
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${FOTO_STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': mimeType || 'image/jpeg',
      upsert: 'false',
    },
    body: blobFromBase64(base64, mimeType || 'image/jpeg'),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(storageErrorMessage(text || response.statusText));
  return {
    success: true,
    bucket: FOTO_STORAGE_BUCKET,
    path,
    url: `${SUPABASE_URL}/storage/v1/object/public/${FOTO_STORAGE_BUCKET}/${encodeStoragePath(path)}`,
  };
}

async function deleteStorageObject(bucket, path) {
  if (!bucket || !path) return;
  const viaFunction = await callFotoFunction({ action: 'deleteFoto', bucket, path });
  if (viaFunction && viaFunction.success) return;
  if (viaFunction && viaFunction.error) throw new Error(viaFunction.error);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!response.ok && response.status !== 404) throw new Error(storageErrorMessage(await response.text()));
}

async function uploadClientFiles(files, tipo) {
  const client = selectedClient();
  if (!client || !files || !files.length) return;
  const progress = document.getElementById(`prog-${tipo}`);
  const bar = document.getElementById(`bar-${tipo}`);
  if (progress) progress.classList.add('show');
  try {
    let uploadedCount = 0;
    const fileList = tipo === 'foto' ? Array.from(files) : Array.from(files).slice(0, 1);
    for (let i = 0; i < fileList.length; i++) {
      if (bar) bar.style.width = `${Math.round((i / fileList.length) * 100)}%`;
      const file = fileList[i];
      const isImage = file.type.startsWith('image/');
      const dataUrl = isImage ? await fileToBase64Resized(file, 1200, 0.8) : await fileToBase64(file);
      const mimeType = isImage && tipo === 'foto' ? 'image/jpeg' : (file.type || 'application/octet-stream');
      const filename = `${client.client_id}_${tipo}_${Date.now()}_${safeStorageSegment(file.name || tipo)}`;
      let uploaded;
      if (tipo !== 'foto') {
        uploaded = {
          url: dataUrl,
          bucket: '',
          path: '',
          localFallback: true,
        };
      } else {
        uploaded = await uploadMediaStorage({
          clientId: client.client_id,
          base64: String(dataUrl).split(',')[1],
          filename,
          mimeType,
          data: todayIso(),
        });
      }
      const rowData = {
        url: uploaded.url,
        filename,
        nome_file: file.name || filename,
        mimeType,
        data: todayIso(),
        visitaId: '',
        bucket: uploaded.bucket,
        storagePath: uploaded.path,
        storage_path: uploaded.path,
        source: uploaded.localFallback ? 'database' : 'storage',
        tipo: tipo === 'foto' ? 'foto' : tipo,
      };
      await sb('foto_allenamento', '', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: {
          id: isoNowId('foto'),
          cliente_id: client.client_id,
          data: rowData,
        },
      });
      uploadedCount++;
    }
    state.mediaClientId = '';
    state.mediaError = '';
    await loadClientMedia(client.client_id);
    if (uploadedCount) clearError();
  } catch (error) {
    showError(`Upload non riuscito: ${error.message || error}`);
  } finally {
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (progress) progress.classList.remove('show');
      if (bar) bar.style.width = '0';
    }, 600);
  }
}

function handlePhotoDrop(event) {
  event.preventDefault();
  uploadClientFiles(event.dataTransfer.files, 'foto');
}

async function deleteClientPhoto(id) {
  const item = state.foto.find((row) => row.id === id);
  if (!item || !confirm('Eliminare questo elemento dalla scheda cliente?')) return;
  try {
    await deleteStorageObject(item.bucket || FOTO_STORAGE_BUCKET, item.storagePath || item.storage_path);
    await sb('foto_allenamento', `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    state.foto = state.foto.filter((row) => row.id !== id);
    renderClientDetail();
  } catch (error) {
    showError(`Eliminazione non riuscita: ${error.message || error}`);
  }
}

function openLightbox(url) {
  const box = document.getElementById('photoLightbox');
  const img = document.getElementById('photoLightboxImg');
  if (!box || !img) return;
  img.src = url;
  box.classList.add('show');
}

function closeLightbox() {
  const box = document.getElementById('photoLightbox');
  const img = document.getElementById('photoLightboxImg');
  if (!box || !img) return;
  box.classList.remove('show');
  img.src = '';
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
  const allPrograms = operatorPrograms();
  const programs = compactProgramList(allPrograms);
  els.programCount.textContent = programs.length;
  els.programList.innerHTML = programs.length
    ? programs.map(renderProgramRow).join('')
    : '<div class="empty">Nessuna scheda PT</div>';

  if (state.selectedProgramId && !programs.some((program) => program.id === state.selectedProgramId)) {
    state.selectedProgramId = '';
  }
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

function renderProgramRow(program) {
  const client = getClient(program.client_id);
  const selected = program.id === state.selectedProgramId ? ' selected' : '';
  const activeClass = program.status === 'attiva' ? ' info' : program.status === 'archiviata' ? ' warning' : '';
  const name = cleanProgramName(program.name);
  return `
    <article class="program-row clickable${selected}" data-program-id="${esc(program.id)}">
      <strong>${esc(name)}</strong>
      <span>${esc(client ? fullName(client) : 'Cliente')}</span>
      <span>${esc(program.goal || 'Obiettivo non indicato')}</span>
      <span>${esc(program.weeks)} sett. · ${esc(program.frequency)} sed./sett.</span>
      <span class="alert-pill${activeClass}">${esc(program.status)}</span>
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
  els.programName.value = cleanProgramName(program.name);
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
  renderExerciseBuilder();
  els.sessionEditor.innerHTML = state.programSessions.map((session, sessionIndex) => `
    <article class="session-card" data-session-index="${sessionIndex}">
      <div class="session-head">
        <label class="session-name-field">
          <span>Nome seduta</span>
          <input data-session-field="name" value="${esc(session.name || sessionName(sessionIndex))}">
        </label>
        <button class="icon-btn" type="button" data-remove-session="${sessionIndex}">Rimuovi</button>
      </div>
      <div class="program-form-grid compact">
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
    </article>
  `).join('');
}

function renderExerciseBuilder() {
  if (!els.exercisePickList) return;
  const q = (els.exerciseSearch?.value || '').trim().toLowerCase();
  const exercises = flattenExercises()
    .filter((item) => !q || `${item.name} ${item.category}`.toLowerCase().includes(q))
    .slice(0, 80);
  let currentCategory = '';
  els.exercisePickList.innerHTML = exercises.length
    ? exercises.map((item) => {
        const category = item.category !== currentCategory ? `<div class="pick-category">${esc(item.category)}</div>` : '';
        currentCategory = item.category;
        const selected = state.builderExercise?.name === item.name ? ' selected' : '';
        return `${category}
          <button class="pick-item${selected}" type="button" data-pick-exercise="${esc(item.name)}" data-pick-category="${esc(item.category)}">
            <span>${esc(item.name)}</span>
            <em>${esc(item.category)}</em>
          </button>`;
      }).join('')
    : '<div class="empty small">Nessun esercizio trovato</div>';

  const groups = Object.keys(PROGRESSION_LIBRARY);
  if (!groups.includes(state.builderProgressionGroup)) state.builderProgressionGroup = groups[0];
  els.progressionTabs.innerHTML = groups.map((group, index) => {
    const active = group === state.builderProgressionGroup ? ' active' : '';
    return `<button class="progression-tab dot-${index % 6}${active}" type="button" data-progression-group="${esc(group)}"><span></span>${esc(group)}</button>`;
  }).join('');

  const progressions = PROGRESSION_LIBRARY[state.builderProgressionGroup] || [];
  els.progressionPickList.innerHTML = `
    <button class="progression-item manual${state.builderProgression === 'manual' ? ' selected' : ''}" type="button" data-pick-progression="manual">
      <strong>Manuale</strong>
      <span>Compili liberamente, senza progressione predefinita</span>
    </button>
    ${progressions.map((item, index) => {
      const selected = state.builderProgression?.name === item.name ? ' selected' : '';
      return `
        <button class="progression-item${selected}" type="button" data-pick-progression="${esc(item.name)}">
          <strong>${esc(item.name)}</strong>
          <span>${esc(item.sessions.length)} sedute · TUT ${esc(item.tut)}</span>
          <i class="progression-dot dot-${index % 6}"></i>
        </button>`;
    }).join('')}`;
  renderBuilderProgressionPreview();

  els.builderSession.innerHTML = state.programSessions.map((session, index) =>
    `<option value="${index}">${esc(session.name || `Seduta ${index + 1}`)}</option>`
  ).join('');
}

function renderBuilderProgressionPreview() {
  if (!els.progressionPreview) return;
  const progression = state.builderProgression;
  if (!progression || progression === 'manual') {
    els.progressionPreview.innerHTML = '<div class="progression-preview-empty">Progressione manuale: aggiungi l esercizio e compila liberamente.</div>';
    return;
  }
  els.progressionPreview.innerHTML = `
    <div class="progression-preview-head">
      <strong>${esc(progression.name)}</strong>
      <span>TUT ${esc(progression.tut)}</span>
    </div>
    <div class="progression-preview-grid">
      ${progression.sessions.map((item, index) => `
        <div><span>Sed.${index + 1}</span><strong>${esc(item)}</strong></div>
      `).join('')}
    </div>`;
}

function renderBlockEditor(block, sessionIndex, blockIndex) {
  const exercises = block.exercises || [];
  return `
    <div class="block-card" data-block-index="${blockIndex}">
      <div class="exercise-list">
        ${exercises.length
          ? exercises.map((exercise, exerciseIndex) => renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex)).join('')
          : '<div class="empty compact-empty">Nessun esercizio inserito</div>'}
      </div>
      <button class="secondary-btn" type="button" data-add-exercise="${sessionIndex}:${blockIndex}">Aggiungi esercizio</button>
    </div>
  `;
}

function renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex) {
  const progression = normalizeProgression(exercise.progression);
  const sedute = progression?.sessions || [];
  const loadKey = `${sessionIndex}:${blockIndex}:${exerciseIndex}`;
  return `
    <div class="exercise-card-compact" data-exercise-index="${exerciseIndex}">
      <div class="exercise-display-head">
        <div class="exercise-order">${esc(exercise.order || exerciseIndex + 1)}</div>
        <div class="exercise-display-main">
          <strong>${esc(exercise.name || 'Esercizio')}</strong>
          <span>${esc(exercise.category || exerciseCategory(exercise.name) || 'Manuale')} · Recupero ${esc(exercise.rest || '-')}</span>
        </div>
        <span class="exercise-prog-badge ${progression ? '' : 'muted'}">${esc(progression?.name || 'Manuale')}</span>
        <button class="danger-btn slim" type="button" data-remove-exercise="${sessionIndex}:${blockIndex}:${exerciseIndex}">X</button>
      </div>
      <div class="exercise-progression-strip">
        <span class="tut-badge">TUT ${esc(progression?.tut || exercise.tut || '-')}</span>
        ${sedute.length
          ? sedute.map((item, index) => `<span class="seduta-pill"><b>Sed.${index + 1}</b>${esc(item)}</span>`).join('')
          : '<span class="seduta-empty">Progressione manuale</span>'}
      </div>
      ${exercise.notes ? `<div class="exercise-note-display">${esc(exercise.notes)}</div>` : ''}
      <div class="load-box" data-load-exercise="${esc(loadKey)}">
        <div class="load-head">
          <span>Carichi seduta</span>
          <input class="load-date" type="date" data-load-date value="${esc(todayIso())}">
        </div>
        ${[1, 2, 3, 4].map((setNumber) => `
          <div class="load-row" data-load-row="${setNumber}">
            <span>S${setNumber}</span>
            <input data-load-field="kg" placeholder="kg">
            <input data-load-field="reps" placeholder="rip">
            <input data-load-field="note" placeholder="note">
          </div>
        `).join('')}
        <button class="secondary-btn slim load-save" type="button" data-save-load="${esc(loadKey)}">Salva carichi</button>
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

function renderSessionEditorAtSamePoint() {
  const scrollY = window.scrollY;
  renderSessionEditor();
  window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0 }));
}

function addPickedExercise() {
  syncProgramEditor();
  const manualName = els.manualExerciseName.value.trim();
  const typedName = els.exerciseSearch.value.trim();
  const picked = state.builderExercise;
  const name = picked?.name || manualName || typedName;
  if (!name) throw new Error('Seleziona o scrivi un esercizio');
  const sessionIndex = Number(els.builderSession.value || 0);
  const session = state.programSessions[sessionIndex];
  if (!session) throw new Error('Seleziona una seduta');
  if (!Array.isArray(session.blocks) || !session.blocks.length) {
    session.blocks = [{ id: isoNowId('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [] }];
  }
  const block = session.blocks[0];
  const progression = state.builderProgression === 'manual' ? null : normalizeProgression(state.builderProgression);
  const exercises = block.exercises || [];
  exercises.push({
    id: isoNowId('exercise'),
    order: exercises.length + 1,
    name,
    category: picked?.category || exerciseCategory(name) || 'Manuale',
    progression,
    sets: '',
    reps: progression?.sessions?.join(' / ') || '',
    rest: els.builderRest.value || "2'",
    tut: progression?.tut || '',
    load: '',
    notes: els.builderNotes.value.trim(),
  });
  block.exercises = exercises;
  els.manualExerciseName.value = '';
  els.exerciseSearch.value = '';
  els.builderNotes.value = '';
  state.builderExercise = null;
  state.builderProgression = null;
  renderSessionEditorAtSamePoint();
  updateNeaceaPreview();
}

async function saveExerciseLoad(sessionIndex, blockIndex, exerciseIndex) {
  syncProgramEditor();
  const session = state.programSessions[sessionIndex];
  const block = session?.blocks?.[blockIndex];
  const exercise = block?.exercises?.[exerciseIndex];
  if (!exercise) throw new Error('Esercizio non trovato');
  if (!els.programClient.value) throw new Error('Seleziona un cliente');

  const loadKey = `${sessionIndex}:${blockIndex}:${exerciseIndex}`;
  const box = els.sessionEditor.querySelector(`[data-load-exercise="${loadKey}"]`);
  if (!box) throw new Error('Box carichi non trovato');

  const date = box.querySelector('[data-load-date]')?.value || todayIso();
  const rows = Array.from(box.querySelectorAll('[data-load-row]')).map((row, index) => {
    const read = (field) => row.querySelector(`[data-load-field="${field}"]`)?.value.trim() || '';
    return {
      serie: index + 1,
      kg: read('kg'),
      ripetizioni: read('reps'),
      note: read('note'),
    };
  }).filter((row) => row.kg || row.ripetizioni || row.note);

  if (!rows.length) throw new Error('Inserisci almeno una serie');

  const isNewProgram = !els.programId.value && !state.selectedProgramId;
  let programId = els.programId.value || state.selectedProgramId;
  if (!programId) {
    programId = isoNowId('pt_program');
    els.programId.value = programId;
  }
  if (isNewProgram) {
    const program = readProgramForm();
    await sb('schede_allenamento', '?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        id: program.id,
        cliente_id: program.client_id,
        data: programPayload(program),
        updated_at: new Date().toISOString(),
      },
    });
    state.selectedProgramId = program.id;
  }
  const id = `load_${els.programClient.value}_${programId}_${exercise.id}_${date}`.replace(/[^a-zA-Z0-9_]/g, '_');
  await sb('carichi_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id,
      cliente_id: els.programClient.value,
      data: {
        client_id: els.programClient.value,
        program_id: programId,
        program_name: els.programName.value,
        session_id: session.id,
        session_name: session.name,
        block_id: block.id,
        block_code: block.code,
        exercise_id: exercise.id,
        esercizio: exercise.name,
        progressione: normalizeProgression(exercise.progression)?.name || 'Manuale',
        data: date,
        serie: rows,
        created_by: state.selectedOperatorId,
      },
      updated_at: new Date().toISOString(),
    },
  });
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
        });
      });
    });
  }
  if (mode === 'progression') {
    clone.notes = `${clone.notes ? `${clone.notes}\n` : ''}Progressione proposta: aumentare i carichi del 2-5% dove tecnica e recupero lo consentono.`;
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
  const reference = parseIsoDate(state.calendarReference);
  const allSessions = operatorSessions(90);
  const sessions = allSessions.filter((session) => {
    if (state.calendarView === 'day') return session.date === dateKey(reference);
    if (state.calendarView === 'month') return sameMonth(session.date, reference);
    return sameWeek(session.date, reference);
  });
  els.calendarCount.textContent = sessions.length;
  if (els.calendarRange) els.calendarRange.textContent = calendarRangeLabel(reference);
  document.querySelectorAll('[data-calendar-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.calendarView === state.calendarView);
  });
  if (!sessions.length) {
    const label = state.calendarView === 'day' ? 'in questo giorno' : state.calendarView === 'month' ? 'in questo mese' : 'in questa settimana';
    els.calendarList.innerHTML = `<div class="empty">Nessuna seduta ${label}</div>`;
    return;
  }

  if (state.calendarView === 'month') {
    renderCalendarMonth(sessions, reference);
    return;
  }

  let lastDate = '';
  els.calendarList.innerHTML = sessions.map((session) => {
    const header = session.date !== lastDate ? `<div class="day-title">${esc(formatDate(session.date))}</div>` : '';
    lastDate = session.date;
    return `${header}${renderSessionCard(session)}`;
  }).join('');
}

function renderCalendarMonth(sessions, reference) {
  const sessionsByDate = sessions.reduce((acc, session) => {
    acc[session.date] = acc[session.date] || [];
    acc[session.date].push(session);
    return acc;
  }, {});
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const daySessions = sessionsByDate[key] || [];
    const outside = date.getMonth() !== reference.getMonth() ? ' muted-day' : '';
    return `
      <div class="month-cell${outside}">
        <strong>${date.getDate()}</strong>
        ${daySessions.slice(0, 3).map((session) => `<span>${esc(String(session.start_time || '').slice(0, 5))} ${esc(fullName(session))}</span>`).join('')}
        ${daySessions.length > 3 ? `<em>+${daySessions.length - 3}</em>` : ''}
      </div>`;
  }).join('');
  els.calendarList.innerHTML = `
    <div class="month-grid">
      ${['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => `<div class="month-head">${day}</div>`).join('')}
      ${cells}
    </div>`;
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

async function archiveClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  const ok = confirm(`Archiviare ${fullName(client)}?\n\nI dati restano salvati: anamnesi, foto, Visbody, programmi, carichi e storico non vengono cancellati.`);
  if (!ok) return;

  await sb('clients', `?id=eq.${encodeURIComponent(clientId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      active: false,
      updated_at: new Date().toISOString(),
    },
  });

  state.selectedClientId = '';
  state.clientSection = 'overview';
  state.mediaClientId = '';
  state.mediaError = '';
  state.datiFisici = [];
  state.foto = [];
  await refresh();
}

function renderAssignments() {
  els.assignButton.disabled = state.mode !== 'phase1';
  renderPtAccess();
}

function renderPtAccess(message = '') {
  const operator = selectedOperator();
  if (!operator) {
    els.ptAccessEmail.value = '';
    els.ptAccessEnabled.checked = false;
    els.ptAccessBadge.textContent = '-';
    els.savePtAccessButton.disabled = true;
    els.ptAccessStatus.textContent = 'Seleziona un personal trainer.';
    return;
  }

  const hasPtRole = (operator.roles || []).includes('PT');
  const hasEmail = Boolean(operator.email);
  const enabled = Boolean(operator.portal_access_enabled || (hasEmail && hasPtRole && operator.active !== false));
  els.ptAccessEmail.value = operator.email || '';
  els.ptAccessEnabled.checked = enabled;
  els.ptAccessBadge.textContent = enabled ? 'attivo' : 'non attivo';
  els.ptAccessBadge.className = `pill${enabled ? ' info' : ''}`;
  els.savePtAccessButton.disabled = false;
  els.ptAccessStatus.textContent = message || 'L email verra usata dal portale personale per riconoscere il PT e mostrare solo i suoi clienti.';
}

async function savePtAccess() {
  const operator = selectedOperator();
  if (!operator) return;

  const email = els.ptAccessEmail.value.trim().toLowerCase();
  const enabled = els.ptAccessEnabled.checked;
  if (enabled && !email) {
    throw new Error('Inserisci una email prima di attivare il portale personale.');
  }

  const roles = Array.from(new Set([...(operator.roles || []), 'PT']));
  const basePayload = {
    email,
    roles,
    active: true,
  };
  const portalPayload = {
    ...basePayload,
    portal_access_enabled: enabled,
  };

  try {
    await sb('operators', `?id=eq.${encodeURIComponent(operator.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: portalPayload,
    });
  } catch (error) {
    await sb('operators', `?id=eq.${encodeURIComponent(operator.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: basePayload,
    });
  }

  operator.email = email;
  operator.roles = roles;
  operator.active = true;
  operator.portal_access_enabled = enabled;
  await refresh();
  renderPtAccess(enabled ? 'Accesso personale PT attivo.' : 'Email salvata. Accesso personale non attivo.');
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
    state.clientSection = 'overview';
    state.mediaClientId = '';
    state.mediaError = '';
    state.datiFisici = [];
    state.foto = [];
    render();
  });

  els.clientSearch.addEventListener('input', renderClients);
  els.alertFilter.addEventListener('change', renderClients);

  els.clientList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-client-id]');
    if (!row) return;
    state.selectedClientId = row.dataset.clientId;
    state.clientSection = 'overview';
    state.mediaClientId = '';
    state.mediaError = '';
    state.datiFisici = [];
    state.foto = [];
    renderClients();
  });

  els.clientDetail.addEventListener('click', (event) => {
    const archive = event.target.closest('[data-archive-client]');
    if (archive) {
      archiveClient(archive.dataset.archiveClient).catch((error) => {
        showError(`Archiviazione atleta non riuscita: ${error.message || error}`);
      });
      return;
    }
    const section = event.target.closest('[data-client-section]');
    if (section) {
      state.clientSection = section.dataset.clientSection || 'overview';
      renderClientDetail();
      return;
    }
    const upload = event.target.closest('[data-upload-trigger]');
    if (upload) {
      const inputMap = {
        foto: 'ptPhotoUpload',
        visbody: 'ptFileUpload',
        baiobit: 'ptBaiobitUpload',
      };
      const input = document.getElementById(inputMap[upload.dataset.uploadTrigger] || 'ptFileUpload');
      input?.click();
      return;
    }
    const del = event.target.closest('[data-delete-photo]');
    if (del) {
      deleteClientPhoto(del.dataset.deletePhoto);
      return;
    }
    const photo = event.target.closest('[data-open-photo]');
    if (photo) {
      openLightbox(photo.dataset.openPhoto);
      return;
    }
    const row = event.target.closest('[data-open-program]');
    if (!row) return;
    state.selectedProgramId = row.dataset.openProgram;
    document.querySelector('[data-view="programs"]').click();
    renderPrograms();
  });

  els.clientDetail.addEventListener('change', (event) => {
    if (event.target.id === 'ptPhotoUpload') {
      uploadClientFiles(event.target.files, 'foto');
      event.target.value = '';
    }
    if (event.target.id === 'ptFileUpload') {
      uploadClientFiles(event.target.files, 'visbody');
      event.target.value = '';
    }
    if (event.target.id === 'ptBaiobitUpload') {
      uploadClientFiles(event.target.files, 'baiobit');
      event.target.value = '';
    }
  });

  els.clientDetail.addEventListener('dragover', (event) => {
    const area = event.target.closest('.upload-area');
    if (!area) return;
    event.preventDefault();
    area.classList.add('drag');
  });

  els.clientDetail.addEventListener('dragleave', (event) => {
    const area = event.target.closest('.upload-area');
    if (!area) return;
    area.classList.remove('drag');
  });

  els.clientDetail.addEventListener('drop', (event) => {
    const area = event.target.closest('[data-upload-trigger]');
    if (!area) return;
    event.preventDefault();
    area.classList.remove('drag');
    uploadClientFiles(event.dataTransfer.files, area.dataset.uploadTrigger);
  });

  document.querySelectorAll('[data-calendar-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.calendarView = button.dataset.calendarView;
      renderCalendar();
    });
  });

  document.querySelectorAll('[data-calendar-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const direction = Number(button.dataset.calendarMove || 0);
      if (state.calendarView === 'month') {
        state.calendarReference = addMonths(state.calendarReference, direction);
      } else {
        state.calendarReference = addDays(state.calendarReference, direction * (state.calendarView === 'week' ? 7 : 1));
      }
      renderCalendar();
    });
  });

  document.querySelector('[data-calendar-today]')?.addEventListener('click', () => {
    state.calendarReference = todayIso();
    renderCalendar();
  });

  els.assignTrainer.addEventListener('change', () => {
    state.selectedOperatorId = els.assignTrainer.value;
    state.selectedProgramId = '';
    render();
  });

  els.ptAccessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      clearError();
      els.savePtAccessButton.disabled = true;
      els.ptAccessStatus.textContent = 'Salvataggio accesso...';
      await savePtAccess();
    } catch (error) {
      showError(`Accesso PT non salvato: ${error.message}`);
      renderPtAccess(error.message);
    }
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
    const index = state.programSessions.length;
    state.programSessions.push({
      id: isoNowId('session'),
      name: sessionName(index),
      weekDay: String(index + 1),
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
        exercises: [],
      }],
    });
    renderSessionEditorAtSamePoint();
    updateNeaceaPreview();
  });

  els.exerciseSearch.addEventListener('input', renderExerciseBuilder);

  els.exercisePickList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick-exercise]');
    if (!item) return;
    state.builderExercise = {
      name: item.dataset.pickExercise,
      category: item.dataset.pickCategory,
    };
    els.manualExerciseName.value = '';
    renderExerciseBuilder();
  });

  els.manualExerciseName.addEventListener('input', () => {
    if (els.manualExerciseName.value.trim()) {
      state.builderExercise = null;
      renderExerciseBuilder();
    }
  });

  els.progressionTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-progression-group]');
    if (!tab) return;
    state.builderProgressionGroup = tab.dataset.progressionGroup;
    state.builderProgression = null;
    renderExerciseBuilder();
  });

  els.progressionPickList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick-progression]');
    if (!item) return;
    state.builderProgression = item.dataset.pickProgression === 'manual'
      ? 'manual'
      : progressionByName(item.dataset.pickProgression);
    renderExerciseBuilder();
  });

  els.addPickedExerciseButton.addEventListener('click', () => {
    try {
      clearError();
      addPickedExercise();
    } catch (error) {
      showError(`Esercizio non aggiunto: ${error.message}`);
    }
  });

  els.sessionEditor.addEventListener('click', async (event) => {
    const saveLoad = event.target.closest('[data-save-load]');
    if (saveLoad) {
      const [sessionIndex, blockIndex, exerciseIndex] = saveLoad.dataset.saveLoad.split(':').map(Number);
      try {
        clearError();
        await saveExerciseLoad(sessionIndex, blockIndex, exerciseIndex);
        saveLoad.textContent = 'Salvato';
        setTimeout(() => {
          saveLoad.textContent = 'Salva carichi';
        }, 1200);
      } catch (error) {
        showError(`Carichi non salvati: ${error.message}`);
      }
      return;
    }

    const addBlock = event.target.closest('[data-add-block]');
    const addExercise = event.target.closest('[data-add-exercise]');
    const removeSession = event.target.closest('[data-remove-session]');
    const removeBlock = event.target.closest('[data-remove-block]');
    const removeExercise = event.target.closest('[data-remove-exercise]');
    syncProgramEditor();

    if (addBlock) {
      const session = state.programSessions[Number(addBlock.dataset.addBlock)];
      session.blocks.push({ id: isoNowId('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [] });
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
      if (exercises.length) exercises.splice(exerciseIndex, 1);
    }

    if (addBlock || addExercise || removeSession || removeBlock || removeExercise) {
      renderSessionEditorAtSamePoint();
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
    'exerciseSearch',
    'exercisePickList',
    'manualExerciseName',
    'progressionTabs',
    'progressionPickList',
    'progressionPreview',
    'builderRest',
    'builderSession',
    'builderNotes',
    'addPickedExerciseButton',
    'addSessionButton',
    'sessionEditor',
    'archiveProgramButton',
    'calendarRange',
    'calendarCount',
    'calendarList',
    'assignTrainer',
    'assignClient',
    'assignButton',
    'ptAccessForm',
    'ptAccessEmail',
    'ptAccessEnabled',
    'ptAccessBadge',
    'ptAccessStatus',
    'savePtAccessButton',
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
