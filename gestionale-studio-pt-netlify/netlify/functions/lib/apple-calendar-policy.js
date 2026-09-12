'use strict';

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^a-zA-Z0-9' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractPersonLabel(title) {
  let value = String(title || '').trim();
  value = value.replace(/^[✓⚠\s]+/, '');
  value = value.replace(/^no-show\s*[·:-]?\s*/i, '');
  value = value.replace(/^pt\s*1\s*:\s*[12]\s*[—–:-]?\s*/i, '');
  value = value.replace(/^personal(?:\s+trainer)?\s*[—–:-]?\s*/i, '');
  return value.trim();
}

function clientFullName(client) {
  return [client?.nome, client?.cognome].filter(Boolean).join(' ').trim();
}

function isClientCalendarEligible(client) {
  return !!client?.id && client.active !== false;
}

function matchClientFromTitle(title, clients = []) {
  const wanted = normalizeName(extractPersonLabel(title));
  if (!wanted) return { status: 'unknown', client: null, matches: [] };

  const exact = (clients || []).filter(client => normalizeName(clientFullName(client)) === wanted);
  const active = exact.filter(isClientCalendarEligible);

  if (active.length === 1) return { status: 'matched', client: active[0], matches: active };
  if (active.length > 1) return { status: 'ambiguous', client: null, matches: active };
  if (exact.length > 0) return { status: 'inactive', client: null, matches: exact };
  return { status: 'unknown', client: null, matches: [] };
}

function recurrencePolicy({ rrule = '', requestedOccurrences = 1, toSchedule = 0 } = {}) {
  const available = Math.max(0, Number(toSchedule) || 0);
  if (available <= 0) {
    return {
      ok: false,
      code: 'package_fully_planned',
      maxOccurrences: 0,
    };
  }

  const rawRule = String(rrule || '').trim();
  const recurring = /(?:^|;)FREQ=/i.test(rawRule);
  const bounded = /(?:^|;)(?:COUNT|UNTIL)=/i.test(rawRule);

  if (recurring && !bounded) {
    return {
      ok: false,
      code: 'unbounded_recurrence',
      maxOccurrences: available,
    };
  }

  const requested = Math.max(1, Math.floor(Number(requestedOccurrences) || 1));
  const allowed = Math.min(requested, available);
  return {
    ok: true,
    code: requested > available ? 'capped_to_package' : 'ok',
    maxOccurrences: allowed,
  };
}

function validateExternalBooking({
  title,
  clients = [],
  sessionMetrics = null,
  rrule = '',
  requestedOccurrences = 1,
} = {}) {
  const match = matchClientFromTitle(title, clients);
  if (match.status !== 'matched') {
    return {
      ok: false,
      code: match.status === 'inactive' ? 'inactive_client' : match.status === 'ambiguous' ? 'ambiguous_client' : 'unknown_client',
      match,
      maxOccurrences: 0,
    };
  }

  const toSchedule = Math.max(0, Number(sessionMetrics?.toSchedule) || 0);
  const recurrence = recurrencePolicy({ rrule, requestedOccurrences, toSchedule });
  if (!recurrence.ok) {
    return {
      ok: false,
      code: recurrence.code,
      match,
      maxOccurrences: recurrence.maxOccurrences,
    };
  }

  return {
    ok: true,
    code: recurrence.code,
    match,
    maxOccurrences: recurrence.maxOccurrences,
  };
}

module.exports = {
  clientFullName,
  extractPersonLabel,
  isClientCalendarEligible,
  matchClientFromTitle,
  normalizeName,
  recurrencePolicy,
  validateExternalBooking,
};
