'use strict';

const tables = {
  calendar_package_summaries: { filter: 'day', argument: 'p_day' },
  calendar_client_history: { filter: 'client', argument: 'p_client_id' },
};

function invalid() {
  return Object.assign(Error('invalid_calendar_package_query'), { status: 400 });
}

async function readCalendarPackage(actor, input, db) {
  if (!Object.hasOwn(tables, input.table)) return null;
  if (!actor?.id || !['owner', 'secretary', 'pt'].includes(actor.role)) {
    throw Object.assign(Error('session_required'), { status: 401 });
  }
  if (input.method && input.method !== 'GET') {
    throw Object.assign(Error('calendar_package_read_only'), { status: 403 });
  }

  const { filter, argument } = tables[input.table];
  const params = new URLSearchParams(input.query || '');
  for (const key of params.keys()) {
    if (![filter, 'limit', 'offset'].includes(key) || params.getAll(key).length !== 1) throw invalid();
  }
  const value = params.get(filter);
  if (!value || value.length > 160 || /[\x00-\x1f\x7f]/.test(value) ||
      (filter === 'day' && !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw invalid();
  const limit = Number(params.get('limit') ?? 500);
  const offset = Number(params.get('offset') ?? 0);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > 2147483147) throw invalid();

  const rows = await db('rpc/' + input.table, {
    method: 'POST',
    body: { p_actor_id: actor.id, p_actor_role: actor.role, [argument]: value, p_limit: limit, p_offset: offset },
  });
  if (!Array.isArray(rows)) throw Object.assign(Error('invalid_database_response'), { status: 503 });
  return { version: 1, rows };
}

module.exports = { readCalendarPackage };
