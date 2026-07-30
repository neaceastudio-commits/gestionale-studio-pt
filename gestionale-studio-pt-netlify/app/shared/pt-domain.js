(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NeaceaPtDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const COMPLETED_STATUS = 'fatto';

  function strictOperatorId(value, operators = []) {
    const id = String(value || '').trim();
    if (!id) return '';
    return operators.some((operator) => String(operator?.id || '') === id) ? id : '';
  }

  function responsibleTrainerId(client, operators = []) {
    return strictOperatorId(client?.ptAssegnato ?? client?.pt_assegnato, operators);
  }

  function scheduledTrainerId(appointment, operators = []) {
    return strictOperatorId(appointment?.operatorId ?? appointment?.operator_id, operators);
  }

  function explicitPerformerId(appointment, operators = []) {
    return strictOperatorId(
      appointment?.performedByOperatorId ?? appointment?.performed_by_operator_id,
      operators
    );
  }

  function performedTrainerId(appointment, operators = []) {
    if ((appointment?.status || '') !== COMPLETED_STATUS) return '';
    return explicitPerformerId(appointment, operators);
  }

  function normalizePerformanceTransition(previous, next, operators = [], actingOperatorId = '') {
    const normalized = { ...next };
    const nextStatus = normalized.status || '';

    if (nextStatus !== COMPLETED_STATUS) {
      normalized.performedByOperatorId = '';
      normalized.performed_by_operator_id = '';
      return normalized;
    }

    const performer = explicitPerformerId(normalized, operators)
      || explicitPerformerId(previous, operators)
      || strictOperatorId(actingOperatorId, operators);

    normalized.performedByOperatorId = performer;
    normalized.performed_by_operator_id = performer;
    return normalized;
  }

  function calculatePackageSessions({
    clientId,
    total,
    appointments = [],
    packageStart = '',
    serviceUsesPackageSessions,
    today = new Date().toISOString().slice(0, 10),
  }) {
    const normalizedTotal = Math.max(0, Number(total || 0));
    const relevant = appointments.filter((appointment) => {
      const clientIds = appointment.clientIds ?? appointment.client_ids ?? [];
      const date = String(appointment.date || '');
      return Array.isArray(clientIds)
        && clientIds.map(String).includes(String(clientId))
        && (!packageStart || date >= packageStart)
        && typeof serviceUsesPackageSessions === 'function'
        && serviceUsesPackageSessions(appointment.serviceId ?? appointment.service_id);
    });
    const completed = relevant.filter((appointment) => appointment.status === COMPLETED_STATUS).length;
    const scheduled = relevant.filter((appointment) => (
      appointment.status !== COMPLETED_STATUS
      && appointment.status !== 'annullato'
      && String(appointment.date || '') >= today
    )).length;
    const remaining = normalizedTotal > 0 ? Math.max(0, normalizedTotal - completed) : 0;
    return {
      total: normalizedTotal,
      completed,
      scheduled,
      plannedTotal: completed + scheduled,
      remaining,
      toSchedule: normalizedTotal > 0 ? Math.max(0, normalizedTotal - completed - scheduled) : 0,
      overPlanned: normalizedTotal > 0 ? Math.max(0, completed + scheduled - normalizedTotal) : 0,
    };
  }

  return {
    COMPLETED_STATUS,
    strictOperatorId,
    responsibleTrainerId,
    scheduledTrainerId,
    explicitPerformerId,
    performedTrainerId,
    normalizePerformanceTransition,
    calculatePackageSessions,
  };
});
