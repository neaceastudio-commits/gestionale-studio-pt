'use strict';

const crypto = require('crypto');
const planner = require('./lib/package-calendar-planner');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_KEY
  || 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const ALLOWED_SERVICES = new Set(['pt11', 'pt12', 'circuit']);
const OWNER_ROLES = new Set(['admin', 'administrator', 'amministratore', 'owner', 'titolare', 'super_admin', 'direzione']);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function response(statusCode, payload) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function accessSecret() {
  return process.env.PT_ACCESS_SECRET || process.env.RESEND_API_KEY || '';
}

function verifyAccessToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || !accessSecret()) return null;
  const expected = crypto.createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.email || !data.operatorId || Number(data.exp || 0) <= Date.now()) return null;
    data.accessLevel = data.accessLevel === 'owner' ? 'owner' : 'pt';
    return data;
  } catch (_) {
    return null;
  }
}

function operatorRoles(operator) {
  return Array.from(new Set([
    ...(Array.isArray(operator?.system_roles) ? operator.system_roles : []),
    ...(Array.isArray(operator?.legacy_roles) ? operator.legacy_roles : []),
    ...(Array.isArray(operator?.roles) ? operator.roles : []),
    ...(operator?.role ? [operator.role] : []),
  ].filter(Boolean).map(role => String(role).trim().toLowerCase())));
}

function isOwnerOperator(operator) {
  return operatorRoles(operator).some(role => OWNER_ROLES.has(role));
}

async function supabaseRequest(table, { method = 'GET', query = '', body = null, prefer = '' } = {}) {
  const result = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await result.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch (_) { data = text; }
  }
  if (!result.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data || {});
    throw new Error(`Supabase ${table}: ${result.status} ${detail.slice(0, 240)}`);
  }
  return data;
}

async function assertOwnerSession(accessToken) {
  const data = verifyAccessToken(accessToken);
  if (!data || data.accessLevel !== 'owner') return null;

  let rows;
  try {
    rows = await supabaseRequest('operator_effective_roles', {
      query: `?select=*&active=eq.true&email=ilike.${encodeURIComponent(String(data.email).toLowerCase())}`,
    });
  } catch (_) {
    rows = await supabaseRequest('operators', {
      query: `?select=*&active=eq.true&email=ilike.${encodeURIComponent(String(data.email).toLowerCase())}`,
    });
  }
  const match = (Array.isArray(rows) ? rows : []).find(row =>
    String(row.operator_id || row.id || '') === String(data.operatorId) && isOwnerOperator(row)
  );
  return match ? data : null;
}

function serviceForClient(client) {
  const packages = Array.isArray(client?.package_types) ? client.package_types : [];
  if (packages.includes('PT 1:1')) return 'pt11';
  if (packages.includes('PT 1:2')) return 'pt12';
  if (packages.includes('Circuit')) return 'circuit';
  return '';
}

function compatibleService(client, requestedServiceId) {
  const expected = serviceForClient(client);
  return !!expected && expected === requestedServiceId;
}

function publicClient(client) {
  return {
    id: client.id,
    nome: client.nome || '',
    cognome: client.cognome || '',
    active: client.active !== false,
    sessionsTotal: Number(client.sessions_total || 0),
    sessionsRemaining: Number(client.sessions_remaining || 0),
    packageTypes: Array.isArray(client.package_types) ? client.package_types : [],
    operatorId: client.pt_assegnato || null,
    packageStart: client.package_start || client.data_inizio || '',
  };
}

function toDbAppointment(appt, { startDate, now = new Date() } = {}) {
  const id = `a_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const notes = [
    `[CICLO-PACCHETTO ${String(startDate || appt.date || '').slice(0, 10)}]`,
    String(appt.notes || '').trim(),
  ].filter(Boolean).join('\n');
  return {
    id,
    service_id: appt.serviceId,
    client_ids: Array.isArray(appt.clientIds) ? appt.clientIds : [],
    operator_id: appt.operatorId || null,
    date: appt.date,
    start_time: appt.startTime,
    duration_min: Number(appt.durationMin || 60),
    buffer_min: Number(appt.bufferMin || 0),
    status: 'prenotato',
    notes,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

async function loadClient(clientId) {
  const rows = await supabaseRequest('clients', {
    query: `?select=id,nome,cognome,active,package_types,sessions_total,sessions_remaining,pt_assegnato,package_start,data_inizio&id=eq.${encodeURIComponent(clientId)}&limit=1`,
  });
  return Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
}

async function loadAppointments() {
  const appointments = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const query = `?select=id,service_id,client_ids,operator_id,date,start_time,duration_min,buffer_min,status,notes&status=neq.annullato&order=date.asc,start_time.asc,id.asc&limit=${pageSize}&offset=${offset}`;
    const rows = await supabaseRequest('appointments', { query });
    if (!Array.isArray(rows)) throw new Error('Risposta appuntamenti non valida');
    appointments.push(...rows);
    if (rows.length < pageSize) return appointments;
  }
}

function planSummary(plan) {
  return {
    code: plan.code,
    remaining: plan.allowance?.remaining ?? 0,
    alreadyScheduled: plan.allowance?.scheduled ?? 0,
    toSchedule: plan.allowance?.toSchedule ?? 0,
    created: plan.created?.length || 0,
    endDate: plan.endDate || null,
    skipped: (plan.skipped || []).slice(0, 20).map(item => ({
      date: item.date,
      time: item.time,
      reasons: (item.conflicts || []).map(conflict => conflict.type),
    })),
  };
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Metodo non consentito' });

  try {
    const input = JSON.parse(event.body || '{}');
    const session = await assertOwnerSession(input.accessToken);
    if (!session) return response(401, { success: false, error: 'Sessione Direzione non valida o scaduta' });

    const clientId = String(input.clientId || '').trim();
    const startDate = String(input.startDate || '').slice(0, 10);
    const serviceId = String(input.serviceId || '').trim();
    const operatorId = String(input.operatorId || '').trim() || null;
    const schedule = Array.isArray(input.schedule) ? input.schedule : [];
    const dryRun = input.dryRun === true;

    if (!clientId || !startDate || !ALLOWED_SERVICES.has(serviceId) || !schedule.length) {
      return response(400, { success: false, error: 'Cliente, data inizio, servizio e pianificazione sono obbligatori' });
    }

    const clientRow = await loadClient(clientId);
    if (!clientRow || clientRow.active === false) {
      return response(404, { success: false, error: 'Cliente attivo non trovato' });
    }
    if (!compatibleService(clientRow, serviceId)) {
      return response(409, { success: false, error: 'Il pacchetto del cliente non è compatibile con il servizio richiesto' });
    }

    const effectiveOperatorId = operatorId || clientRow.pt_assegnato || null;
    if (!effectiveOperatorId) {
      return response(409, { success: false, error: 'Assegna un PT prima di programmare le sedute' });
    }

    const appointments = await loadAppointments();
    const client = {
      id: clientRow.id,
      active: clientRow.active !== false,
      sessionsTotal: Number(clientRow.sessions_total || 0),
      sessionsRemaining: Number(clientRow.sessions_remaining || 0),
    };

    const plan = planner.planPackageAppointments({
      client,
      appointments,
      schedule,
      serviceId,
      operatorId: effectiveOperatorId,
      startDate,
    });

    const summary = planSummary(plan);
    if (!plan.ok) {
      return response(409, {
        success: false,
        error: plan.code === 'insufficient_valid_slots'
          ? `Non ci sono abbastanza slot validi: mancano ${plan.missing || 0} sedute`
          : 'Pianificazione non valida',
        client: publicClient(clientRow),
        plan: summary,
      });
    }

    if (dryRun || plan.created.length === 0) {
      return response(200, {
        success: true,
        dryRun: true,
        client: publicClient(clientRow),
        plan: summary,
        appointments: plan.created,
        sessionsRemainingChanged: false,
      });
    }

    const rows = plan.created.map(appt => toDbAppointment(appt, { startDate }));
    await supabaseRequest('appointments', {
      method: 'POST',
      body: rows,
      prefer: 'return=representation',
    });

    return response(200, {
      success: true,
      dryRun: false,
      client: publicClient(clientRow),
      plan: { ...summary, created: rows.length },
      appointmentIds: rows.map(row => row.id),
      sessionsRemainingChanged: false,
    });
  } catch (error) {
    console.error('[schedule-client-package]', error);
    return response(500, { success: false, error: String(error.message || error) });
  }
};

exports._test = {
  compatibleService,
  publicClient,
  serviceForClient,
  toDbAppointment,
  verifyAccessToken,
};
