const crypto = require('crypto');
const { PT, packageInfo, operationalNote } = require('./lib/apple-calendar-package');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TIMEZONE = 'Europe/Rome';

const SERVICES = {
  pt11: { label: 'PT 1:1', room: 'Sala PT' },
  pt12: { label: 'PT 1:2', room: 'Sala PT' },
  nutrizione: { label: 'Nutrizione — 1ª visita', room: 'Sala Nutrizione' },
  check: { label: 'Check Nutrizionale', room: 'Sala Nutrizione' },
  visbody: { label: 'Visbody', room: 'Area Valutazioni' },
  baiobit: { label: 'Baiobit', room: 'NEACEA' },
  circuit: { label: 'Circuit', room: 'Sala PT' },
  blocco: { label: 'Blocco agenda', room: 'NEACEA' },
};

const STATUS_LABELS = {
  prenotato: 'Prenotato',
  fatto: 'Fatto',
  noshow: 'No-show',
};

const STATUS_TITLE_PREFIXES = {
  fatto: '✓ ',
  noshow: '⚠ NO-SHOW · ',
};

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    body,
  };
}

function safeTokenMatch(provided, expected) {
  if (!provided || !expected) return false;
  const providedHash = crypto.createHash('sha256').update(String(provided)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

async function supabaseRows(table, select, extra = {}) {
  const rows = [];
  // Continue to an empty page, even when the server caps results below our limit.
  for (let offset = 0; ; ) {
    const params = new URLSearchParams({ select, order: 'id.asc', ...extra, limit: '1000', offset: String(offset) });
    const result = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' },
    });
    if (!result.ok) throw new Error(`Supabase ${table}: ${result.status}`);
    const page = await result.json();
    if (!Array.isArray(page)) throw new Error('Invalid calendar response');
    if (!page.length) return rows;
    rows.push(...page);
    offset += page.length;
  }
}

function calendarText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line) {
  const pieces = [];
  let current = '';
  let bytes = 0;
  for (const char of String(line)) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (current && bytes + charBytes > 73) {
      pieces.push(current);
      current = char;
      bytes = charBytes;
    } else {
      current += char;
      bytes += charBytes;
    }
  }
  pieces.push(current);
  return pieces.join('\r\n ');
}

function utcStamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function localStamp(date, time) {
  return `${String(date || '').replace(/-/g, '')}T${String(time || '00:00').slice(0, 5).replace(':', '')}00`;
}

function addMinutes(dateValue, timeValue, durationMin) {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const [hour, minute] = String(timeValue || '00:00').split(':').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hour, minute + Number(durationMin || 0), 0));
  const pad = number => String(number).padStart(2, '0');
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}00`;
}

function personName(person) {
  return [person?.nome, person?.cognome].filter(Boolean).join(' ').trim();
}

function sequenceFor(row) {
  const timestamp = new Date(row.updated_at || 0).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor(timestamp / 1000)) : 0;
}

function buildCalendar(appointments, clients, operators, { operatorId = '', now = new Date() } = {}) {
  const clientMap = new Map((clients || []).filter(client => client.active !== false).map(client => [String(client.id), client]));
  const operatorMap = new Map((operators || []).map(operator => [String(operator.id), operator]));
  const selectedOperator = operatorId ? operatorMap.get(String(operatorId)) : null;
  const calendarName = selectedOperator ? `NEACEA — ${personName(selectedOperator) || 'PT'}` : 'NEACEA — Studio';

  const visible = (appointments || []).filter(row => {
    if (!row.id || row.status === 'annullato') return false;
    if (operatorId && !PT.has(row.service_id)) return false;
    if (operatorId && String(row.operator_id || '') !== String(operatorId)) return false;
    const clientIds = Array.isArray(row.client_ids) ? row.client_ids.map(String) : [];
    return (!operatorId && clientIds.length === 0) || clientIds.some(id => clientMap.has(id));
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEACEA//Calendario Gestionale//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarText(calendarName)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    'X-APPLE-CALENDAR-COLOR:#17314A',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  visible.forEach(row => {
    const service = SERVICES[row.service_id] || { label: row.service_id || 'Appuntamento', room: 'NEACEA' };
    const clientIds = Array.isArray(row.client_ids) ? row.client_ids.map(String) : [];
    const clientNames = clientIds.map(id => personName(clientMap.get(id))).filter(Boolean);
    const operatorName = personName(operatorMap.get(String(row.operator_id || '')));
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: TIMEZONE }).format(now);
    const people = clientIds.filter(id => clientMap.has(id)).map(id => {
      const client = clientMap.get(id);
      return { name: personName(client), info: PT.has(row.service_id) ? packageInfo(client, appointments, today) : null };
    });
    const positions = people.map(p => p.info?.position(row));
    const common = positions.length && positions.every(p => p && p.n === positions[0]?.n && p.total === positions[0]?.total) ? positions[0] : null;
    const titleService = row.status === 'noshow' ? '⚠ NO-SHOW' : `${row.status === 'fatto' ? '✓ ' : ''}${service.label}`;
    const summary = [titleService, clientNames.join(', '), common ? `${common.n}/${common.total}` : ''].filter(Boolean).join(' · ');
    const formatDate = value => value ? value.split('-').reverse().join('/') : 'Da definire';
    const description = [
      'NEACEA STUDIO',
      ...people.flatMap(({ name, info }) => {
        const pos = info?.position(row);
        return [`Cliente: ${name}`, `Servizio: ${service.label}`, `Personal Trainer: ${operatorName || '—'}`,
          ...(info ? [`Seduta: ${pos ? `${pos.n} di ${pos.total}` : 'Non numerabile nel ciclo corrente'}`] : []),
          `Stato: ${row.status === 'prenotato' ? 'Prenotata' : STATUS_LABELS[row.status] || '—'}`,
          ...(info ? ['', 'Pacchetto', `Sedute residue: ${info.remaining}`, `Future già programmate: ${info.scheduled}`,
            `Ancora da programmare: ${info.toSchedule}`, '', 'Programmazione abituale',
            ...(info.schedule.length ? info.schedule : ['—']), `Fine ciclo prevista: ${formatDate(info.endDate)}`] : []), ''];
      }),
      `Note operative: ${operationalNote(row.notes)}`, '', 'Gestione NEACEA',
      'Modificare data/orario senza creare nuove ricorrenze.',
    ].join('\n');
    const updated = row.updated_at || now;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${calendarText(String(row.id))}@calendar.neacea.it`,
      `DTSTAMP:${utcStamp(now)}`,
      `LAST-MODIFIED:${utcStamp(updated)}`,
      `SEQUENCE:${sequenceFor(row)}`,
      `DTSTART;TZID=${TIMEZONE}:${localStamp(row.date, row.start_time)}`,
      `DTEND;TZID=${TIMEZONE}:${addMinutes(row.date, row.start_time, row.duration_min || 60)}`,
      `SUMMARY:${calendarText(summary)}`,
      `DESCRIPTION:${calendarText(description)}`,
      'LOCATION:NEACEA Studio',
      `CATEGORIES:${calendarText(service.label)}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return {
    body: lines.map(foldLine).join('\r\n') + '\r\n',
    count: visible.length,
    name: calendarName,
  };
}

exports.handler = async event => {
  if (!['GET', 'HEAD'].includes(event.httpMethod)) {
    return response(405, 'Metodo non consentito', { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
  }

  const expectedToken = process.env.APPLE_CALENDAR_FEED_TOKEN || '';
  const providedToken = String(event.queryStringParameters?.token || '');
  if (!expectedToken) {
    return response(503, 'Feed calendario non configurato', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (!safeTokenMatch(providedToken, expectedToken)) {
    return response(401, 'Codice calendario non valido', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  if (!SUPABASE_KEY) return response(503, 'Chiave server calendario non configurata');

  try {
    const [appointments, clients, operators] = await Promise.all([
      supabaseRows('appointments', 'id,service_id,client_ids,operator_id,date,start_time,duration_min,status,notes,updated_at', { order: 'date.asc,start_time.asc,id.asc' }),
      supabaseRows('clients', 'id,nome,cognome,active,sessions_total,sessions_remaining,data_inizio,data_conferma,package_start,notes'),
      supabaseRows('operators', 'id,nome,cognome,active'),
    ]);
    const operatorId = String(event.queryStringParameters?.operatorId || '').trim();
    const calendar = buildCalendar(appointments, clients, operators, { operatorId });
    const headers = {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="neacea-calendar.ics"',
      'Cache-Control': 'private, max-age=60, must-revalidate',
      'X-NEACEA-Event-Count': String(calendar.count),
    };
    return response(200, event.httpMethod === 'HEAD' ? '' : calendar.body, headers);
  } catch (error) {
    console.error('[apple-calendar] Lettura calendario fallita');
    return response(502, 'Calendario temporaneamente non disponibile', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
};

exports._test = {
  addMinutes,
  buildCalendar,
  calendarText,
  operationalNote,
  foldLine,
  safeTokenMatch,
};
