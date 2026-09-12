'use strict';

const DAY_INDEX = {
  domenica: 0,
  lunedi: 1,
  lunedì: 1,
  martedi: 2,
  martedì: 2,
  mercoledi: 3,
  mercoledì: 3,
  giovedi: 4,
  giovedì: 4,
  venerdi: 5,
  venerdì: 5,
  sabato: 6,
};

const SERVICE_META = {
  pt11: { durationMin: 60, bufferMin: 10, room: 'pt', roomLoad: 1 },
  pt12: { durationMin: 60, bufferMin: 10, room: 'pt', roomLoad: 2 },
  circuit: { durationMin: 60, bufferMin: 10, room: 'pt', roomLoad: 6 },
};

const ROOM_CAPACITY = { pt: 6 };

function cleanDay(value) {
  return String(value || '').trim().toLowerCase();
}

function dayIndex(value) {
  return DAY_INDEX[cleanDay(value)];
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function dateString(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const parts = String(value || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(date.getTime()) || dateString(date) !== value ? null : date;
}

function timeToMin(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const [hour, minute] = normalized.split(':').map(Number);
  return hour * 60 + minute;
}

function overlaps(a, b) {
  if (!a || !b || String(a.date || '') !== String(b.date || '')) return false;
  const aStart = timeToMin(a.startTime || a.start_time);
  const bStart = timeToMin(b.startTime || b.start_time);
  const aDuration = Number(a.durationMin ?? a.duration_min ?? 60);
  const bDuration = Number(b.durationMin ?? b.duration_min ?? 60);
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}

function normalizeSchedule(schedule = []) {
  const seen = new Set();
  const normalized = [];
  for (const item of Array.isArray(schedule) ? schedule : []) {
    const weekday = dayIndex(item?.weekday ?? item?.day);
    const time = normalizeTime(item?.time);
    if (weekday === undefined || !time) continue;
    const key = `${weekday}|${time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ weekday, time, sourceDay: String(item?.weekday ?? item?.day ?? '') });
  }
  return normalized.sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time));
}

function appointmentClientIds(appt) {
  if (Array.isArray(appt?.clientIds)) return appt.clientIds.map(String);
  if (Array.isArray(appt?.client_ids)) return appt.client_ids.map(String);
  return [];
}

function appointmentServiceId(appt) {
  return String(appt?.serviceId || appt?.service_id || '');
}

function appointmentOperatorId(appt) {
  return String(appt?.operatorId || appt?.operator_id || '');
}

function appointmentStatus(appt) {
  return String(appt?.status || 'prenotato');
}

function storedRemaining(client) {
  return Math.max(0, Number(client?.sessionsRemaining ?? client?.sessions_remaining ?? 0) || 0);
}

function storedTotal(client) {
  return Math.max(0, Number(client?.sessionsTotal ?? client?.sessions_total ?? 0) || 0);
}

function futureScheduledAppointments(client, appointments = [], { serviceId = '', fromDate = '' } = {}) {
  if (!client?.id) return [];
  const clientId = String(client.id);
  const start = String(fromDate || '').slice(0, 10);
  return (Array.isArray(appointments) ? appointments : []).filter(appt => {
    if (appointmentStatus(appt) !== 'prenotato') return false;
    if (serviceId && appointmentServiceId(appt) !== String(serviceId)) return false;
    if (start && String(appt.date || '') < start) return false;
    return appointmentClientIds(appt).includes(clientId);
  });
}

function schedulingAllowance(client, appointments = [], options = {}) {
  const remaining = storedRemaining(client);
  // Moving the requested start date must not hide sessions already reserved.
  const scheduled = futureScheduledAppointments(client, appointments, { serviceId: options.serviceId }).length;
  return {
    remaining,
    scheduled,
    toSchedule: Math.max(0, remaining - scheduled),
    total: storedTotal(client),
  };
}

function roomLoadFor(appt) {
  const meta = SERVICE_META[appointmentServiceId(appt)] || {};
  return Number(meta.roomLoad || 0);
}

function slotConflicts(candidate, appointments = [], { roomCapacity = ROOM_CAPACITY } = {}) {
  const conflicts = [];
  const clientId = appointmentClientIds(candidate)[0] || '';
  const operatorId = appointmentOperatorId(candidate);
  const serviceId = appointmentServiceId(candidate);
  const meta = SERVICE_META[serviceId] || { room: null, roomLoad: 0 };

  const sameDay = (Array.isArray(appointments) ? appointments : []).filter(appt =>
    appointmentStatus(appt) !== 'annullato' && String(appt.date || '') === String(candidate.date || '')
  );

  const operatorConflict = operatorId && sameDay.find(appt =>
    appointmentOperatorId(appt) === operatorId && overlaps(candidate, appt)
  );
  if (operatorConflict) conflicts.push({ type: 'operator', appointment: operatorConflict });

  const clientConflict = clientId && sameDay.find(appt =>
    appointmentClientIds(appt).includes(clientId) && overlaps(candidate, appt)
  );
  if (clientConflict) conflicts.push({ type: 'client', appointment: clientConflict });

  if (meta.room) {
    const load = sameDay
      .filter(appt => (SERVICE_META[appointmentServiceId(appt)] || {}).room === meta.room && overlaps(candidate, appt))
      .reduce((sum, appt) => sum + roomLoadFor(appt), 0);
    const max = Number(roomCapacity?.[meta.room] || 0);
    if (max > 0 && load + Number(meta.roomLoad || 0) > max) {
      conflicts.push({ type: 'room_capacity', load, add: Number(meta.roomLoad || 0), max });
    }
  }

  return conflicts;
}

function candidateFor({ clientId, operatorId, serviceId, date, time, index, total }) {
  const meta = SERVICE_META[serviceId] || { durationMin: 60, bufferMin: 10 };
  return {
    serviceId,
    clientIds: [String(clientId)],
    operatorId: operatorId || null,
    date,
    startTime: time,
    durationMin: meta.durationMin,
    bufferMin: meta.bufferMin,
    status: 'prenotato',
    notes: `[PROGRAMMA-PACCHETTO] seduta ${index}/${total}`,
  };
}

function planPackageAppointments({
  client,
  appointments = [],
  schedule = [],
  serviceId = 'pt11',
  operatorId = null,
  startDate,
  maxLookaheadDays = 370,
  roomCapacity = ROOM_CAPACITY,
} = {}) {
  if (!client?.id) return { ok: false, code: 'missing_client', created: [], skipped: [] };
  if (client.active === false) return { ok: false, code: 'inactive_client', created: [], skipped: [] };
  const start = parseDate(startDate);
  if (!start) return { ok: false, code: 'invalid_start_date', created: [], skipped: [] };
  const slots = normalizeSchedule(schedule);
  if (!slots.length) return { ok: false, code: 'missing_schedule', created: [], skipped: [] };
  if (!SERVICE_META[serviceId]) return { ok: false, code: 'unsupported_service', created: [], skipped: [] };

  const allowance = schedulingAllowance(client, appointments, { serviceId, fromDate: dateString(start) });
  if (allowance.toSchedule <= 0) {
    return { ok: true, code: 'fully_scheduled', allowance, created: [], skipped: [], endDate: null };
  }

  const baseDone = Math.max(0, allowance.total - allowance.remaining);
  const existingFuture = futureScheduledAppointments(client, appointments, { serviceId })
    .sort((a, b) => `${a.date} ${a.start_time || a.startTime || ''}`.localeCompare(`${b.date} ${b.start_time || b.startTime || ''}`));
  const working = [...appointments];
  const created = [];
  const skipped = [];

  for (let offset = 0; offset <= maxLookaheadDays && created.length < allowance.toSchedule; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const weekday = date.getDay();
    const dateValue = dateString(date);
    const daySlots = slots.filter(slot => slot.weekday === weekday);
    for (const slot of daySlots) {
      if (created.length >= allowance.toSchedule) break;
      const sequence = baseDone + existingFuture.length + created.length + 1;
      const candidate = candidateFor({
        clientId: client.id,
        operatorId,
        serviceId,
        date: dateValue,
        time: slot.time,
        index: sequence,
        total: allowance.total || allowance.remaining,
      });
      const conflicts = slotConflicts(candidate, working, { roomCapacity });
      if (conflicts.length) {
        skipped.push({ date: dateValue, time: slot.time, conflicts });
        continue;
      }
      created.push(candidate);
      working.push(candidate);
    }
  }

  if (created.length !== allowance.toSchedule) {
    return {
      ok: false,
      code: 'insufficient_valid_slots',
      allowance,
      created,
      skipped,
      missing: allowance.toSchedule - created.length,
      endDate: created.at(-1)?.date || null,
    };
  }

  return {
    ok: true,
    code: 'planned',
    allowance,
    created,
    skipped,
    endDate: created.at(-1)?.date || null,
  };
}

function appointmentSequence(appt, client, appointments = [], { serviceId = '', fromDate = '' } = {}) {
  if (!appt || !client?.id) return null;
  const total = storedTotal(client);
  const remaining = storedRemaining(client);
  const done = Math.max(0, total - remaining);
  const future = futureScheduledAppointments(client, appointments, { serviceId, fromDate })
    .sort((a, b) => `${a.date} ${a.start_time || a.startTime || ''} ${a.id || ''}`.localeCompare(`${b.date} ${b.start_time || b.startTime || ''} ${b.id || ''}`));
  const index = future.findIndex(item => String(item.id || '') === String(appt.id || ''));
  if (index < 0) return null;
  return { current: done + index + 1, total };
}

module.exports = {
  SERVICE_META,
  appointmentSequence,
  futureScheduledAppointments,
  normalizeSchedule,
  planPackageAppointments,
  schedulingAllowance,
  slotConflicts,
  storedRemaining,
  storedTotal,
};
