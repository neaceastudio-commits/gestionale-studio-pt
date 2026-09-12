'use strict';

const crypto = require('crypto');
const policy = require('./lib/apple-calendar-policy');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_KEY
  || 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

function safeTokenMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

async function loadClients() {
  const select = [
    'id', 'nome', 'cognome', 'active', 'package_types',
    'sessions_total', 'sessions_remaining', 'pt_assegnato',
  ].join(',');
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/clients?select=${encodeURIComponent(select)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase clients: ${response.status} ${detail.slice(0, 180)}`);
  }
  return response.json();
}

function recurrenceShape(rrule) {
  const raw = String(rrule || '').trim();
  const recurring = /(?:^|;)FREQ=/i.test(raw);
  const bounded = /(?:^|;)(?:COUNT|UNTIL)=/i.test(raw);
  return { recurring, bounded, unbounded: recurring && !bounded };
}

function clientSnapshot(client) {
  if (!client) return null;
  return {
    id: client.id,
    nome: client.nome || '',
    cognome: client.cognome || '',
    active: client.active !== false,
    packageTypes: Array.isArray(client.package_types) ? client.package_types : [],
    sessionsTotal: Number(client.sessions_total || 0),
    sessionsRemaining: Number(client.sessions_remaining || 0),
    operatorId: client.pt_assegnato || null,
  };
}

function matchCode(status) {
  if (status === 'inactive') return 'inactive_client';
  if (status === 'ambiguous') return 'ambiguous_client';
  return 'unknown_client';
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'POST') return json(405, { ok: false, code: 'method_not_allowed' });

  const expectedToken = process.env.APPLE_CALENDAR_FEED_TOKEN || '';
  const providedToken = String(event.queryStringParameters?.token || '');
  if (!expectedToken) return json(503, { ok: false, code: 'calendar_token_not_configured' });
  if (!safeTokenMatch(providedToken, expectedToken)) return json(401, { ok: false, code: 'invalid_token' });

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, code: 'invalid_json' });
  }

  const title = String(input.title || '').trim();
  const rrule = String(input.rrule || '').trim();
  const requestedOccurrences = Math.max(1, Math.floor(Number(input.requestedOccurrences) || 1));
  if (!title) return json(400, { ok: false, code: 'missing_title' });

  try {
    const clients = await loadClients();
    const match = policy.matchClientFromTitle(title, clients);
    const recurrence = recurrenceShape(rrule);

    if (match.status !== 'matched') {
      return json(200, {
        ok: false,
        code: matchCode(match.status),
        title,
        recurrence,
        matchedClient: null,
        message: match.status === 'inactive'
          ? 'Cliente presente ma non attivo: attivarlo prima da Acquisizione NEACEA.'
          : match.status === 'ambiguous'
            ? 'Nome cliente ambiguo: serve una verifica nel gestionale.'
            : 'Cliente non riconosciuto: attivarlo prima da Acquisizione NEACEA.',
        writes: { appointments: 0, clients: 0, sessionsRemaining: 0 },
      });
    }

    const client = clientSnapshot(match.client);
    if (recurrence.unbounded) {
      return json(200, {
        ok: false,
        code: 'unbounded_recurrence',
        title,
        recurrence,
        requestedOccurrences,
        matchedClient: client,
        message: 'Ricorrenza senza fine non consentita. NEACEA dovrà limitarla alle sedute realmente programmabili.',
        packageGuard: 'pending_exact_to_schedule_check',
        writes: { appointments: 0, clients: 0, sessionsRemaining: 0 },
      });
    }

    return json(200, {
      ok: true,
      code: 'ready_for_package_check',
      title,
      recurrence,
      requestedOccurrences,
      matchedClient: client,
      message: 'Cliente riconosciuto. Nessuna scrittura eseguita: il prossimo controllo sarà il numero esatto di sedute programmabili.',
      packageGuard: 'pending_exact_to_schedule_check',
      writes: { appointments: 0, clients: 0, sessionsRemaining: 0 },
    });
  } catch (error) {
    console.error('[apple-calendar-dry-run]', error);
    return json(502, { ok: false, code: 'dry_run_failed' });
  }
};

exports._test = {
  clientSnapshot,
  matchCode,
  recurrenceShape,
  safeTokenMatch,
};
