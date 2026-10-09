const workoutHandoff = require('../../app/portale-personal-trainer/js/workout-handoff');
const crypto = require('crypto');
const sharing = require('./lib/pt-client-sharing');
const sessionLog = require('./lib/pt-session-log');
const { visibleClient, clientScope } = require('./lib/pt-client-scope');
const { listTemplates, listArchivedTemplates, saveTemplate, archiveTemplate, purgeArchivedTemplates, listFolders, saveFolder, deleteFolder, updateTemplate, moveTemplate } = require('./lib/pt-templates');
const {
  authenticatedOperator,
  isPersonalTrainer,
  loadOperatorDirectory,
  publicOperator,
  supabaseRequest,
} = require('./lib/pt-auth');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function json(statusCode, body) {
  return { statusCode, headers: responseHeaders, body: JSON.stringify(body) };
}

function clean(value) {
  return String(value || '').trim();
}

function nullableNumber(value, fieldLabel) {
  const raw = clean(value).replace(',', '.');
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number <= 0 || number > 200) {
    const error = new Error(`${fieldLabel} deve essere un valore in kg maggiore di 0 e non superiore a 200.`);
    error.statusCode = 400;
    throw error;
  }
  return Math.round(number * 10) / 10;
}

function validLocalDate(value) {
  const date = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? '' : date;
}

function bearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function clientTrainerId(client) {
  return clean(client?.pt_assegnato || client?.trainer_id || client?.operator_id);
}

function inFilter(values) {
  return `in.(${values.map((value) => encodeURIComponent(clean(value))).join(',')})`;
}

function byClientIds(table, select, clientIds, suffix = '') {
  if (!clientIds.length) return Promise.resolve([]);
  return supabaseRequest(table, `?select=${select}&cliente_id=${inFilter(clientIds)}${suffix}`);
}

async function byClientIdsPaged(table, select, clientIds, suffix = '', pageSize = 1000) {
  const rows = [];
  for (let start = 0; start < clientIds.length; start += 50) {
    const chunk = clientIds.slice(start, start + 50);
    for (let offset = 0; ; offset += pageSize) {
      const page = await byClientIds(table, select, chunk, `${suffix}&limit=${pageSize}&offset=${offset}`);
      rows.push(...(page || []));
      if (!Array.isArray(page) || page.length < pageSize) break;
    }
  }
  return rows;
}

async function loadClient(clientId) {
  const rows = await supabaseRequest('clients', `?select=*&id=eq.${encodeURIComponent(clean(clientId))}&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function loadProgram(programId) {
  const rows = await supabaseRequest(
    'schede_allenamento',
    `?select=id,cliente_id,data,created_at,updated_at&id=eq.${encodeURIComponent(clean(programId))}&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function loadHandGripMeasurement(measurementId) {
  const rows = await supabaseRequest(
    'pt_hand_grip_measurements',
    `?select=*&id=eq.${encodeURIComponent(clean(measurementId))}&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

function canViewClient(operator, client) {
  return !!client && (operator?.accessLevel === 'owner' || isPersonalTrainer(operator));
}

function canEditClient(operator, client) {
  return clientTrainerId(client) === clean(operator?.id);
}

function assertClientAccess(operator, client, edit = false) {
  if (!client) {
    const error = new Error('Cliente non trovato.');
    error.statusCode = 404;
    throw error;
  }
  const allowed = edit ? canEditClient(operator, client) : canViewClient(operator, client);
  if (!allowed) {
    const error = new Error(edit
      ? 'Puoi modificare soltanto le schede dei clienti assegnati a te.'
      : 'Non hai accesso a questo cliente.');
    error.statusCode = 403;
    throw error;
  }
}

function localDateFromIso(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function stableLoadId(parts) {
  return `car_pt_${crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 40)}`;
}

function buildLoadRows(programId, clientId, programData, savedAt, actorId) {
  const studioState = programData?.pt_studio_state || programData?.studio_state || {};
  const sessions = Array.isArray(studioState.sessions) ? studioState.sessions : [];
  const sheetOrder = Array.isArray(studioState.sheetOrder) ? studioState.sheetOrder : Object.keys(studioState.sheets || {});
  const workoutDates = studioState.workoutDates && typeof studioState.workoutDates === 'object'
    ? studioState.workoutDates
    : (studioState.sessionDates || {});
  const syncToken = clean(programData?.save_meta?.sync_token) || savedAt;
  const fallbackDate = localDateFromIso(savedAt);
  const rows = [];

  sheetOrder.forEach((sheetKey) => {
    const exercises = Array.isArray(studioState.sheets?.[sheetKey]) ? studioState.sheets[sheetKey] : [];
    exercises.forEach((exercise, exerciseIndex) => {
      const weeks = Array.isArray(exercise.weekSets) ? exercise.weekSets : [];
      sessions.forEach((sessionName, weekIndex) => {
        const explicitDate = clean(workoutDates?.[sheetKey]?.[weekIndex]);
        const sets = Array.isArray(weeks[weekIndex]) ? weeks[weekIndex] : [];
        sets.forEach((set, setIndex) => {
          const load = clean(set?.load ?? set?.carico);
          const rir = clean(set?.rir ?? set?.rpe);
          const note = clean(set?.sessionNote ?? set?.session_note ?? set?.actualNote);
          const prescription = studioState.coachingEditorSnapshot?.program?.days
            ?.find(day => day.letter === sheetKey)?.exercisesByWeek?.[weekIndex + 1]
            ?.find(item => item.key === exercise?.id);
          // The editor projects prescribed RIR into sets. A template/new plan is not a completed session.
          // Actual input in the operational UI records an explicit workout date.
          const actualRir = rir && (!prescription || rir !== clean(prescription.rir));
          const hasPerformance = Boolean(load || actualRir || note);
          if (!explicitDate && !hasPerformance) return;
          const sessionDate = explicitDate || fallbackDate;
          const exerciseId = clean(exercise?.id) || `exercise_${exerciseIndex + 1}`;
          const setId = clean(set?.id) || `set_${setIndex + 1}`;
          const id = stableLoadId([programId, sheetKey, weekIndex, exerciseId, setId]);
          rows.push({
            id,
            cliente_id: clientId,
            data: {
              id,
              clienteId: clientId,
              schedaId: programId,
              program_id: programId,
              sync_token: syncToken,
              esercizio: clean(exercise?.name) || `Esercizio ${exerciseIndex + 1}`,
              exercise_id: exerciseId,
              gruppo: clean(exercise?.group),
              giorno: `Allenamento ${sheetKey}`,
              workout_key: sheetKey,
              seduta: String(weekIndex + 1),
              week_index: weekIndex,
              week_name: clean(sessionName) || `Settimana ${weekIndex + 1}`,
              data: sessionDate,
              session_date: sessionDate,
              date_inferred: !explicitDate,
              serie: setIndex + 1,
              set_id: setId,
              kg: load,
              load,
              rip: clean(set?.reps),
              reps: clean(set?.reps),
              rir,
              note,
              indicazione: clean(set?.note),
              source: 'portale_pt_v8',
              recorded_by: actorId,
            },
          });
        });
      });
    });
  });
  return rows;
}

function appendAudit(existingData, action, operator, at) {
  const previous = Array.isArray(existingData?.audit_log) ? [...existingData.audit_log] : [];
  const entry = { action, at, by: operator.id, email: operator.email };
  const last = previous.at(-1);
  const sameEditingSession = action === 'modifica' && last?.action === 'modifica' &&
    clean(last.by) === clean(operator.id) &&
    Math.abs(new Date(at).getTime() - new Date(last.at || 0).getTime()) < 10 * 60 * 1000;
  if (sameEditingSession) previous[previous.length - 1] = entry;
  else previous.push(entry);
  return previous.slice(-60);
}

function serverProgramData(inputData, existing, operator, programId, clientId, savedAt, action = '') {
  const input = inputData && typeof inputData === 'object' ? inputData : {};
  const operation = action || (existing ? 'modifica' : 'creazione');
  return {
    ...input,
    id: programId,
    client_id: clientId,
    cliente_id: clientId,
    trainer_id: operator.id,
    created_by: existing?.data?.created_by || operator.id,
    archived: input.archived === true,
    schema_version: Math.max(8, Number(input.schema_version) || 0),
    save_meta: {
      ...(input.save_meta || {}),
      saved_at: savedAt,
      saved_by: operator.id,
      sync_token: savedAt,
      source: 'pt_data_api',
    },
    audit_log: appendAudit(existing?.data, operation, operator, savedAt),
  };
}

async function saveProgram({ operator, programId, clientId, data, expectedUpdatedAt = null, force = false, action = '' }) {
  const client = await loadClient(clientId);
  assertClientAccess(operator, client, true);
  const existing = await loadProgram(programId);
  if (existing && clean(existing.cliente_id) !== clean(clientId)) {
    const error = new Error('La scheda indicata appartiene a un altro cliente.');
    error.statusCode = 409;
    throw error;
  }
  // A successful write may lose its HTTP response. Repeating its request ID
  // returns that write without a false conflict or a duplicate program.
  const requestId = clean(data?.save_meta?.request_id);
  if (!action && requestId && requestId === clean(existing?.data?.save_meta?.request_id)) {
    const current=await byClientIds('pt_client_current_programs','program_id',[clientId]);
    return { row: existing, currentProgramId: current?.[0]?.program_id || null };
  }
  const savedAt = new Date().toISOString();
  const nextData = serverProgramData(data, existing, operator, programId, clientId, savedAt, action);
  const loadRows = buildLoadRows(programId, clientId, nextData, savedAt, operator.id);
  const result = await supabaseRequest('rpc/pt_save_program_with_current', '', {
    method: 'POST',
    body: {
      p_program_id: programId,
      p_cliente_id: clientId,
      p_data: nextData,
      p_expected_updated_at: clean(expectedUpdatedAt) || null,
      p_actor_id: operator.id,
      p_force: force === true,
      p_load_rows: loadRows,
    },
  });
  if (result?.code === 'PROGRAM_CONFLICT' || result?.success === false) {
    return { conflict: true, current: result.current || null };
  }
  return {
    row: result?.row || result,
    loadCount: loadRows.length,
    currentProgramId: result?.currentProgramId,
  };
}

function acquisitionMatchesClients(acquisition, clients) {
  const email = clean(acquisition?.email).toLowerCase();
  const phone = clean(acquisition?.telefono);
  return clients.some((client) =>
    (email && clean(client?.email).toLowerCase() === email) ||
    (phone && clean(client?.telefono) === phone));
}

async function bootstrap(operator) {
  const directory = await loadOperatorDirectory();
  const operators = (directory || []).filter(isPersonalTrainer).map(publicOperator);
  // All authenticated PTs may consult other referents' clients. Reading never
  // grants session-entry or program-edit permissions.
  const appointments = await sessionLog.assignments(operator, true);
  const visibleClients = (await supabaseRequest('clients', '?select=*&order=cognome.asc,nome.asc')).filter(visibleClient);
  // Only completion identities are needed to build every PT's client list.
  // Other PTs' raw session records keep their existing access restrictions.
  const completions = sessionLog.enabled(operator)
    ? await byClientIdsPaged('pt_session_records', 'appointment_id,cliente_id,operator_id', visibleClients.map(c => c.id)) : [];
  const scope = clientScope(visibleClients, appointments, completions);
  const assigned = scope.assignments.filter(row => row.operator_id === operator.id);
  const assignedClientIds = new Set(assigned.flatMap(row => row.client_ids || []));
  const sharedIds = new Set((await sharing.grants(operator.id)).map(row => row.cliente_id));
  const clients = scope.clients.map(client => ({
    ...client,
    session_access: clientTrainerId(client) === clean(operator.id) || sharedIds.has(client.id) || assignedClientIds.has(client.id),
  }));
  const clientIds = clients.map(client => clean(client.id)).filter(Boolean);
  const writableSessionIds = clients.filter(client => client.session_access).map(client => client.id);
  const assignedSessions = assigned.map(({ notes, ...row }) => ({...row, client_ids: (row.client_ids || []).filter(id => writableSessionIds.includes(id))})).filter(row => row.client_ids.length);
  const [programs, acquisitions, archive, loadHistory, physicalMeasurements, currentPrograms] = await Promise.all([
    byClientIdsPaged('schede_allenamento', 'id,cliente_id,data,created_at,updated_at', clientIds, '&order=updated_at.desc'),
    supabaseRequest('acquisizioni', '?select=*&order=data_acquisizione.desc').catch(() => []),
    supabaseRequest('pt_exercise_archive', '?select=*&active=eq.true&order=group_name.asc,name.asc').catch(() => []),
    byClientIdsPaged('carichi_allenamento', 'id,cliente_id,data,created_at,updated_at', clientIds, '&order=updated_at.desc').catch(() => []),
    byClientIdsPaged('pt_hand_grip_measurements', 'id,cliente_id,data,created_at,updated_at', clientIds, '&order=updated_at.desc').catch(() => []),
    byClientIdsPaged('pt_client_current_programs', '*', clientIds, '&order=cliente_id.asc'),
  ]);
  const allSessionRecords = sessionLog.enabled(operator)
    ? await byClientIdsPaged('pt_session_records', '*', sessionLog.historyAllowed(operator) ? clientIds : writableSessionIds, '&order=updated_at.desc') : [];
  const sessionRecords = sessionLog.historyAllowed(operator) ? allSessionRecords : allSessionRecords.filter(row => row.operator_id === operator.id);
  // Operational handoff is a compact read-only reference, not access to the general registry.
  const sessionHandoffs = Object.fromEntries(programs.filter(p => writableSessionIds.includes(p.cliente_id)).map(p => {
    const client=clients.find(c=>c.id===p.cliente_id),owner=operators.find(o=>o.id===clientTrainerId(client));
    const studio=p.data?.pt_studio_state||p.data?.studio_state||{};
    return [p.id,workoutHandoff.build(studio,allSessionRecords.filter(r=>r.cliente_id===p.cliente_id),p.id,[owner?.nome,owner?.cognome].filter(Boolean).join(' '))];
  }));
  return {
    sessionLogEnabled: sessionLog.enabled(operator),
    sessionHistoryVisible: sessionLog.historyAllowed(operator),
    assignedSessions,
    sessionRecords,
    sessionHandoffs,
    sessionOperators: sessionLog.historyAllowed(operator) ? operators.map(({id,nome,cognome}) => ({id,nome,cognome})) : [],
    operator,
    operators,
    clients: clients || [],
    acquisitions: (acquisitions || []).filter((item) => acquisitionMatchesClients(item, clients || [])),
    programs: programs || [],
    exerciseArchive: archive || [],
    loadHistory: loadHistory || [],
    physicalMeasurements: physicalMeasurements || [],
    currentPrograms: currentPrograms || [],
  };
}

async function emptyTrash(operator) {
  const directory = await loadOperatorDirectory();
  const clientQuery = operator.accessLevel === 'owner'
    ? '?select=id'
    : `?select=id&pt_assegnato=eq.${encodeURIComponent(operator.id)}`;
  const clients = await supabaseRequest('clients', clientQuery);
  const clientIds = (clients || []).map(client => clean(client.id)).filter(Boolean);
  let programsDeleted = 0;
  for (let start = 0; start < clientIds.length; start += 50) {
    const chunk = clientIds.slice(start, start + 50);
    const rows = await byClientIdsPaged('schede_allenamento', 'id,cliente_id,data', chunk, '&limit=1000');
    for (const row of rows || []) {
      if (row.data?.archived !== true) continue;
      await supabaseRequest('schede_allenamento', `?id=eq.${encodeURIComponent(row.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      programsDeleted += 1;
    }
  }
  const templatesDeleted = await purgeArchivedTemplates(operator);
  return { programsDeleted, templatesDeleted, total: programsDeleted + templatesDeleted };
}

async function saveHandGrip(operator, input) {
  const clientId = clean(input.clientId || input.clienteId);
  const client = await loadClient(clientId);
  assertClientAccess(operator, client, true);

  const measuredOn = validLocalDate(input.measuredOn || input.date || input.data);
  if (!measuredOn) {
    const error = new Error('Inserisci una data valida per la misurazione Hand Grip.');
    error.statusCode = 400;
    throw error;
  }

  const rightKg = nullableNumber(input.rightKg, 'Hand Grip destro');
  const leftKg = nullableNumber(input.leftKg, 'Hand Grip sinistro');
  if (rightKg === null && leftKg === null) {
    const error = new Error('Inserisci almeno una misurazione Hand Grip.');
    error.statusCode = 400;
    throw error;
  }

  const dominantHand = clean(input.dominantHand).toLowerCase();
  if (dominantHand && !['destra', 'sinistra', 'ambidestro'].includes(dominantHand)) {
    const error = new Error('Mano dominante non valida.');
    error.statusCode = 400;
    throw error;
  }
  const position = clean(input.position).toLowerCase() || 'seduto';
  if (!['seduto', 'in_piedi'].includes(position)) {
    const error = new Error('Posizione del test non valida.');
    error.statusCode = 400;
    throw error;
  }
  const attempts = Number(input.attempts || 3);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 5) {
    const error = new Error('Il numero di tentativi deve essere compreso tra 1 e 5.');
    error.statusCode = 400;
    throw error;
  }

  const savedAt = new Date().toISOString();
  const requestedId = clean(input.measurementId);
  if (requestedId && !/^grip_[a-zA-Z0-9_-]{8,120}$/.test(requestedId)) {
    const error = new Error('Identificativo misurazione non valido.'); error.statusCode = 400; throw error;
  }
  const id = requestedId || `grip_${crypto.randomUUID()}`;
  const row = {
    id,
    cliente_id: clientId,
    data: {
      id,
      clienteId: clientId,
      tipo: 'hand_grip',
      test_type: 'hand_grip',
      data: measuredOn,
      measured_on: measuredOn,
      hand_grip_dx: rightKg,
      hand_grip_sx: leftKg,
      mano_dominante: dominantHand,
      tentativi: attempts,
      posizione: position,
      note: clean(input.notes),
      protocollo: 'miglior_valore_stessa_impostazione',
      source: 'portale_pt_hand_grip_v1',
      recorded_by: operator.id,
      recorded_at: savedAt,
    },
    updated_at: savedAt,
  };
  const compatibleRetry = existing => {
    if (!existing || existing.cliente_id !== clientId || existing.data?.voided_at ||
        Object.entries(row.data).some(([key, value]) => key !== 'recorded_at' && existing.data?.[key] !== value)) {
      const error = new Error('Misurazione già esistente con dati diversi. Riapri lo storico prima di riprovare.');
      error.statusCode = 409; throw error;
    }
    return existing;
  };
  if (requestedId) {
    const existing = await loadHandGripMeasurement(id);
    if (existing) return compatibleRetry(existing);
  }
  const saved = await supabaseRequest('pt_hand_grip_measurements', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: row,
  });
  if (Array.isArray(saved) && !saved.length) return compatibleRetry(await loadHandGripMeasurement(id));
  return Array.isArray(saved) ? saved[0] : saved || row;
}

async function voidHandGrip(operator, input) {
  const measurementId = clean(input.measurementId);
  if (!measurementId) {
    const error = new Error('Identificativo della misurazione Hand Grip mancante.');
    error.statusCode = 400;
    throw error;
  }
  const existing = await loadHandGripMeasurement(measurementId);
  if (!existing) {
    const error = new Error('Misurazione Hand Grip non trovata.');
    error.statusCode = 404;
    throw error;
  }
  const client = await loadClient(existing.cliente_id);
  assertClientAccess(operator, client, true);
  const voidedAt = new Date().toISOString();
  const nextData = {
    ...(existing.data || {}),
    voided_at: voidedAt,
    voided_by: operator.id,
  };
  const saved = await supabaseRequest(
    'pt_hand_grip_measurements',
    `?id=eq.${encodeURIComponent(measurementId)}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: { data: nextData, updated_at: voidedAt },
    },
  );
  return Array.isArray(saved) ? saved[0] || { ...existing, data: nextData, updated_at: voidedAt } : saved;
}

async function setProgramArchived(operator, input) {
  const programId = clean(input.programId);
  const existing = await loadProgram(programId);
  if (!existing) {
    const error = new Error('Scheda non trovata.');
    error.statusCode = 404;
    throw error;
  }
  const archived = input.archived === true;
  const at = new Date().toISOString();
  const nextData = {
    ...(existing.data || {}),
    archived,
    ...(archived
      ? { archived_at: at, archived_by: operator.id }
      : { restored_at: at, restored_by: operator.id }),
  };
  return saveProgram({
    operator,
    programId,
    clientId: existing.cliente_id,
    data: nextData,
    expectedUpdatedAt: input.expectedUpdatedAt,
    force: input.force,
    action: archived ? 'archiviazione' : 'ripristino',
  });
}

async function upsertExercise(operator, input) {
  const item = input.exercise && typeof input.exercise === 'object' ? input.exercise : {};
  const name = clean(item.name);
  if (!name) {
    const error = new Error('Nome esercizio obbligatorio.');
    error.statusCode = 400;
    throw error;
  }
  const row = {
    id: clean(item.id) || `ex_${crypto.createHash('sha256').update(`${name}|${clean(item.group_name)}`).digest('hex').slice(0, 32)}`,
    name,
    group_name: clean(item.group_name || item.group) || 'Full body',
    line: clean(item.line) || 'all',
    tags: Array.isArray(item.tags) ? item.tags.map(clean).filter(Boolean) : [],
    recovery: clean(item.recovery) || '75 sec',
    notes: clean(item.notes),
    active: true,
    created_by: operator.id,
    updated_at: new Date().toISOString(),
  };
  const result = await supabaseRequest('pt_exercise_archive?on_conflict=id', '', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: row,
  });
  return Array.isArray(result) ? result[0] || row : result || row;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: responseHeaders, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { success: false, error: 'Metodo non consentito.' });

  try {
    const operator = await authenticatedOperator(bearerToken(event));
    if (!operator) return json(401, { success: false, error: 'Sessione PT non valida o scaduta.' });
    const input = JSON.parse(event.body || '{}');
    const action = clean(input.action).toLowerCase();

    if (action === 'save_session_record') return json(200, { success: true, ...(await sessionLog.save(operator, input)) });
    if (action === 'bootstrap') return json(200, { success: true, ...(await bootstrap(operator)) });
    if (action === 'list_templates') {
      const [templates,folders]=await Promise.all([listTemplates(),listFolders()]);
      return json(200, { success: true, templates, folders });
    }
    if (action === 'list_template_trash') {
      return json(200, { success: true, templates: await listArchivedTemplates() });
    }
    if (action === 'empty_trash') return json(200, { success: true, ...(await emptyTrash(operator)) });
    if (action === 'create_template') return json(200, { success: true, template: await saveTemplate(operator,input) });
    if (action === 'move_template') return json(200, { success: true, template: await moveTemplate(operator,input) });
    if (action === 'update_template') return json(200, { success: true, template: await updateTemplate(operator,input) });
    if (action === 'save_template_folder') return json(200, { success: true, folder: await saveFolder(operator,input) });
    if (action === 'delete_template_folder') return json(200, { success: true, folderId: await deleteFolder(operator,input) });
    if (action === 'set_current_program') {
      const program=await loadProgram(input.programId);
      if(!program || program.data?.archived) return json(404,{success:false,error:'Scheda non disponibile.'});
      assertClientAccess(operator,await loadClient(program.cliente_id),true);
      const result=await supabaseRequest('rpc/pt_set_current_program','',{method:'POST',body:{p_cliente_id:program.cliente_id,p_program_id:program.id}});
      return json(200,{success:true,...result});
    }
    if (action === 'save_template') {
      const source = await loadProgram(input.programId);
      if (!source) return json(404, { success: false, error: 'Salva prima il programma del cliente.' });
      assertClientAccess(operator, await loadClient(source.cliente_id), true);
      return json(200, { success: true, template: await saveTemplate(operator, input) });
    }
    if (action === 'archive_template') return json(200, { success: true, templateId: await archiveTemplate(operator,input) });
    if (action === 'upsert_program') {
      const programId = clean(input.programId || input.data?.id);
      const clientId = clean(input.clientId || input.data?.client_id || input.data?.cliente_id);
      if (!programId || !clientId || !input.data) return json(400, { success: false, error: 'Dati scheda incompleti.' });
      const saved = await saveProgram({
        operator,
        programId,
        clientId,
        data: input.data,
        expectedUpdatedAt: input.expectedUpdatedAt,
        force: input.force,
      });
      if (saved.conflict) return json(409, { success: false, code: 'PROGRAM_CONFLICT', current: saved.current });
      return json(200, { success: true, ...saved });
    }
    if (action === 'set_program_archived') {
      const saved = await setProgramArchived(operator, input);
      if (saved.conflict) return json(409, { success: false, code: 'PROGRAM_CONFLICT', current: saved.current });
      return json(200, { success: true, ...saved });
    }
    if (action === 'upsert_exercise') return json(200, { success: true, exercise: await upsertExercise(operator, input) });
    if (action === 'save_hand_grip') return json(200, { success: true, measurement: await saveHandGrip(operator, input) });
    if (action === 'void_hand_grip') return json(200, { success: true, measurement: await voidHandGrip(operator, input) });
    return json(400, { success: false, error: 'Azione non supportata.' });
  } catch (error) {
    const missingConfiguration = /SUPABASE_SERVER_KEY_MISSING|PT_ACCESS_SECRET_MISSING/.test(clean(error.message));
    const statusCode = missingConfiguration ? 503 : (Number(error.statusCode) || 500);
    return json(statusCode, {
      success: false,
      error: missingConfiguration
        ? 'Configurazione server del Portale PT incompleta.'
        : clean(error.message) || 'Errore interno del Portale PT.',
    });
  }
};

exports._test = {
  appendAudit,
  buildLoadRows,
  canEditClient,
  canViewClient,
  localDateFromIso,
  nullableNumber,
  saveHandGrip,
  serverProgramData,
  stableLoadId,
  validLocalDate,
  voidHandGrip,
};
