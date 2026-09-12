(function attachCompensationEngine(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.NeaceaCompensation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCompensationEngine() {
  'use strict';

  const SERVICE_DEFINITIONS = Object.freeze([
    { id: 'pt11', label: 'PT 1:1', requiredRoles: ['PT'], aliases: ['pt 1:1', 'personal training 1:1', 'personal training individuale'] },
    { id: 'pt12', label: 'PT 1:2', requiredRoles: ['PT'], aliases: ['pt 1:2', 'personal training 1:2', 'personal training in coppia'] },
    { id: 'circuit', label: 'Circuit Training', requiredRoles: ['Circuit', 'PT'], aliases: ['ct', 'circuito', 'circuit training'] },
    { id: 'coaching', label: 'Coaching', requiredRoles: [], calendarEnabled: false, aliases: ['scheda coaching', 'coaching online'] },
    { id: 'nutrizione', label: 'Nutrizione · Prima visita', requiredRoles: ['Nutrizionista'], aliases: ['nutrition', 'prima visita nutrizione', 'visita nutrizionale'] },
    { id: 'check', label: 'Nutrizione · Check', requiredRoles: ['Nutrizionista'], aliases: ['check nutrizione', 'check nutrizionale', 'controllo nutrizione'] },
    { id: 'baiobit', label: 'Baiobit', requiredRoles: ['Valutazioni'], aliases: ['valutazione baiobit'] },
    { id: 'visbody', label: 'Visbody', requiredRoles: ['Valutazioni'], aliases: ['valutazione', 'valutazione visbody'] }
  ]);

  const SERVICE_ALIASES = SERVICE_DEFINITIONS.reduce((map, service) => {
    [service.id, service.label, ...(service.aliases || [])].forEach((alias) => {
      map[normalizeToken(alias)] = service.id;
    });
    return map;
  }, {});

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function normalizeToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9:]+/g, ' ')
      .trim();
  }

  function normalizeServiceId(value) {
    const token = normalizeToken(value);
    return SERVICE_ALIASES[token] || token.replace(/\s+/g, '-') || 'non-specificato';
  }

  function operatorRoles(operator) {
    const raw = Array.isArray(operator?.roles) ? operator.roles : String(operator?.roles || '').split(',');
    return raw.map(normalizeToken).filter(Boolean);
  }

  function servicesForOperator(operator) {
    const roles = operatorRoles(operator);
    return SERVICE_DEFINITIONS.filter((service) => {
      if (service.calendarEnabled === false || !service.requiredRoles?.length) return false;
      return service.requiredRoles.some((role) => roles.includes(normalizeToken(role)));
    });
  }

  function operatorCanPerformService(operator, serviceOrId) {
    const serviceId = normalizeServiceId(typeof serviceOrId === 'string' ? serviceOrId : serviceOrId?.id);
    return servicesForOperator(operator).some((service) => service.id === serviceId);
  }

  function defaultRates(operator = null) {
    const services = operator ? servicesForOperator(operator) : SERVICE_DEFINITIONS.filter((service) => service.calendarEnabled !== false);
    return services.map((service) => ({
      operatorId: operator?.id ? String(operator.id) : '',
      serviceId: service.id,
      label: service.label,
      basis: 'session',
      amount: 0,
      studioValue: 0,
      payNoShow: false,
      active: true,
      configured: false
    }));
  }

  function normalizeRates(input) {
    const given = Array.isArray(input) ? input : [];
    const unique = new Map();
    given.map((rate) => normalizeRate(rate)).forEach((rate) => {
      unique.set(`${rate.operatorId}::${rate.serviceId}`, rate);
    });
    return [...unique.values()];
  }

  function normalizeRate(rate, fallback = {}) {
    const serviceId = normalizeServiceId(rate?.serviceId || rate?.id || rate?.label || fallback.serviceId);
    const definition = SERVICE_DEFINITIONS.find((service) => service.id === serviceId);
    const basis = ['session', 'hour', 'percent'].includes(rate?.basis) ? rate.basis : (fallback.basis || 'session');
    return {
      operatorId: String(rate?.operatorId ?? rate?.operator_id ?? fallback.operatorId ?? ''),
      serviceId,
      label: String(rate?.label || fallback.label || definition?.label || serviceId),
      basis,
      amount: Math.max(0, Number(rate?.amount ?? fallback.amount ?? 0) || 0),
      studioValue: Math.max(0, Number(rate?.studioValue ?? fallback.studioValue ?? 0) || 0),
      payNoShow: Boolean(rate?.payNoShow ?? fallback.payNoShow),
      active: rate?.active !== false && fallback.active !== false,
      configured: Boolean(rate?.configured ?? fallback.configured)
    };
  }

  function appointmentServiceId(appointment) {
    return normalizeServiceId(appointment?.service_id || appointment?.serviceId || appointment?.service || '');
  }

  function isPayableStatus(status, rate) {
    const normalized = normalizeToken(status);
    if (normalized === 'fatto' || normalized === 'completato' || normalized === 'eseguito') return true;
    return normalized === 'noshow' || normalized === 'no show' ? Boolean(rate?.payNoShow) : false;
  }

  function isPerformedStatus(status) {
    const normalized = normalizeToken(status);
    return normalized === 'fatto' || normalized === 'completato' || normalized === 'eseguito';
  }

  function resolveRate(rates, serviceId, operatorId) {
    return rates.find((item) => item.operatorId === operatorId && item.serviceId === serviceId)
      || rates.find((item) => !item.operatorId && item.serviceId === serviceId)
      || null;
  }

  function calculateAppointment(appointment, rates) {
    const normalizedRates = normalizeRates(rates);
    const serviceId = appointmentServiceId(appointment);
    const definition = SERVICE_DEFINITIONS.find((service) => service.id === serviceId);
    const compensable = Boolean(definition && definition.calendarEnabled !== false && definition.requiredRoles?.length);
    const operatorId = String(appointment?.operator_id || appointment?.operatorId || 'non-assegnato');
    const rate = resolveRate(normalizedRates, serviceId, operatorId);
    const durationMinutes = Math.max(0, Number(appointment?.duration_min ?? appointment?.durationMinutes ?? 60) || 0);
    const payable = Boolean(rate?.active) && isPayableStatus(appointment?.status, rate);
    const performed = isPerformedStatus(appointment?.status);
    const unconfigured = compensable && performed && !Boolean(rate?.configured);
    const studioValue = payable ? Math.max(0, Number(rate?.studioValue || 0)) : 0;
    let compensation = 0;

    if (payable && rate) {
      if (rate.basis === 'hour') compensation = Number(rate.amount || 0) * (durationMinutes / 60);
      else if (rate.basis === 'percent') compensation = studioValue * (Number(rate.amount || 0) / 100);
      else compensation = Number(rate.amount || 0);
    }

    return {
      serviceId,
      serviceLabel: rate?.label || definition?.label || serviceId,
      operatorId,
      status: normalizeToken(appointment?.status),
      durationMinutes,
      compensable,
      performed,
      payable,
      configured: Boolean(rate?.configured),
      unconfigured,
      studioValue: roundMoney(studioValue),
      compensation: roundMoney(compensation),
      margin: roundMoney(studioValue - compensation)
    };
  }

  function buildMonthlyLedger(appointments, operators, rates, month, operatorFilter = '') {
    const normalizedRates = normalizeRates(rates);
    const operatorNames = new Map((operators || []).map((operator) => [
      String(operator?.id || ''),
      [operator?.nome, operator?.cognome].filter(Boolean).join(' ') || operator?.email || 'Operatore'
    ]));
    const relevant = (appointments || []).filter((appointment) => {
      const date = String(appointment?.date || '');
      const operatorId = String(appointment?.operator_id || appointment?.operatorId || 'non-assegnato');
      return (!month || date.startsWith(month)) && (!operatorFilter || operatorId === String(operatorFilter));
    });

    const operatorRows = new Map();
    const serviceRows = new Map();
    const totals = {
      scheduled: relevant.length,
      performed: 0,
      payable: 0,
      noShows: 0,
      unconfigured: 0,
      minutes: 0,
      workedMinutes: 0,
      studioValue: 0,
      compensation: 0,
      margin: 0
    };

    relevant.forEach((appointment) => {
      const item = calculateAppointment(appointment, normalizedRates);
      if (item.performed && item.compensable) {
        totals.performed += 1;
        totals.workedMinutes += item.durationMinutes;
      }
      if (item.status === 'noshow' || item.status === 'no show') totals.noShows += 1;
      if (!item.payable && !item.unconfigured) return;
      if (item.payable) totals.payable += 1;
      totals.minutes += item.durationMinutes;
      totals.studioValue += item.studioValue;
      totals.compensation += item.compensation;
      totals.margin += item.margin;
      if (item.unconfigured) totals.unconfigured += 1;

      const operatorRow = operatorRows.get(item.operatorId) || {
        operatorId: item.operatorId,
        operatorName: operatorNames.get(item.operatorId) || (item.operatorId === 'non-assegnato' ? 'PT non assegnato' : item.operatorId),
        sessions: 0,
        minutes: 0,
        studioValue: 0,
        compensation: 0,
        margin: 0,
        unconfigured: 0
      };
      operatorRow.sessions += 1;
      operatorRow.minutes += item.durationMinutes;
      operatorRow.studioValue += item.studioValue;
      operatorRow.compensation += item.compensation;
      operatorRow.margin += item.margin;
      if (item.unconfigured) operatorRow.unconfigured += 1;
      operatorRows.set(item.operatorId, operatorRow);

      const serviceRow = serviceRows.get(item.serviceId) || {
        serviceId: item.serviceId,
        serviceLabel: item.serviceLabel,
        sessions: 0,
        minutes: 0,
        studioValue: 0,
        compensation: 0,
        margin: 0,
        unconfigured: 0
      };
      serviceRow.sessions += 1;
      serviceRow.minutes += item.durationMinutes;
      serviceRow.studioValue += item.studioValue;
      serviceRow.compensation += item.compensation;
      serviceRow.margin += item.margin;
      if (item.unconfigured) serviceRow.unconfigured += 1;
      serviceRows.set(item.serviceId, serviceRow);
    });

    const moneyFields = ['studioValue', 'compensation', 'margin'];
    moneyFields.forEach((field) => { totals[field] = roundMoney(totals[field]); });
    const finalize = (row) => {
      moneyFields.forEach((field) => { row[field] = roundMoney(row[field]); });
      row.hours = roundMoney(row.minutes / 60);
      return row;
    };

    return {
      month,
      totals,
      operators: [...operatorRows.values()].map(finalize).sort((a, b) => b.compensation - a.compensation || a.operatorName.localeCompare(b.operatorName)),
      services: [...serviceRows.values()].map(finalize).sort((a, b) => b.compensation - a.compensation || a.serviceLabel.localeCompare(b.serviceLabel))
    };
  }

  return {
    SERVICE_DEFINITIONS,
    defaultRates,
    servicesForOperator,
    operatorCanPerformService,
    normalizeRates,
    normalizeServiceId,
    calculateAppointment,
    buildMonthlyLedger,
    roundMoney
  };
});
