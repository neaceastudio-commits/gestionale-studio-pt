// Logica servizi/calendario condivisa, basata sullo State locale.

const Services = (() => {
  function localDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getService(id) {
    return CONFIG.SERVICES[id] || null;
  }

  function timeToMin(time) {
    const [h, m] = String(time || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function minToTime(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function effectiveEnd(appt, includeBuffer = true) {
    const svc = getService(appt.serviceId);
    const duration = Number(appt.durationMin || svc?.durationMin || 60);
    const buffer = includeBuffer ? Number(appt.bufferMin ?? svc?.bufferMin ?? CONFIG.defaultBufferMin ?? 0) : 0;
    return timeToMin(appt.startTime) + duration + buffer;
  }

  function overlaps(a, b, includeBuffer = true) {
    if (!a || !b) return false;
    if (a.date && b.date && a.date !== b.date) return false;
    const aStart = timeToMin(a.startTime);
    const bStart = timeToMin(b.startTime);
    return aStart < effectiveEnd(b, includeBuffer) && bStart < effectiveEnd(a, includeBuffer);
  }

  function getClient(id) {
    return State.getClients().find(c => c.id === id) || null;
  }

  function getOperator(id) {
    return State.getOperators().find(o => o.id === id) || null;
  }

  function getActiveClientIds(appt) {
    if (!Array.isArray(appt?.clientIds)) return [];
    return appt.clientIds.filter(id => {
      const client = getClient(id);
      return !!client && client.active !== false;
    });
  }

  function isAppointmentVisible(appt) {
    if (!appt) return false;
    const svc = getService(appt.serviceId);
    if (svc?.isBlock) return true;
    return getActiveClientIds(appt).length > 0;
  }

  function getVisibleAppointment(appt) {
    if (!isAppointmentVisible(appt)) return null;
    const svc = getService(appt.serviceId);
    if (svc?.isBlock) return appt;
    const activeClientIds = getActiveClientIds(appt);
    return activeClientIds.length === (appt.clientIds || []).length
      ? appt
      : { ...appt, clientIds: activeClientIds };
  }

  function appointmentRoomLoad(appt) {
    const svc = getService(appt?.serviceId);
    if (!svc?.room) return 0;
    const configuredLoad = Number(svc.roomLoad || 0);
    if (svc.isGroup || Number(svc.maxClients || 1) > 1) {
      return Math.min(configuredLoad || getActiveClientIds(appt).length, getActiveClientIds(appt).length);
    }
    return configuredLoad;
  }

  function clientFullName(id) {
    const c = getClient(id);
    return c ? `${c.nome} ${c.cognome}`.trim() : id || '-';
  }

  function clientConflictLabel(id) {
    const c = getClient(id);
    if (c) {
      const name = `${c.nome} ${c.cognome}`.trim() || id || '-';
      return c.active === false ? `${name} (non attivo)` : name;
    }
    return `cliente non attivo/non caricato (${id || '-'})`;
  }

  function operatorFullName(id) {
    const o = getOperator(id);
    return o ? `${o.nome} ${o.cognome}`.trim() : '-';
  }

  function packageTypes(client) {
    if (Array.isArray(client.packageTypes)) return client.packageTypes;
    if (Array.isArray(client.package_types)) return client.package_types;
    if (client.packageType) return [client.packageType];
    return [];
  }

  function getCompatibleClients(serviceId) {
    const compatiblePkgs = Object.entries(CONFIG.PACKAGE_SERVICE_MAP)
      .filter(([, services]) => services.includes(serviceId))
      .map(([pkg]) => pkg);

    return State.getClients()
      .filter(c => c.active !== false)
      .map(c => {
        const pkgs = packageTypes(c);
        const compatible = compatiblePkgs.length === 0 || pkgs.some(p => compatiblePkgs.includes(p));
        return { ...c, _pkgs: pkgs, compatible };
      })
      .sort((a, b) => Number(b.compatible) - Number(a.compatible) || `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`));
  }

  function clientCanUseService(client, serviceId) {
    const compatiblePkgs = Object.entries(CONFIG.PACKAGE_SERVICE_MAP)
      .filter(([, services]) => services.includes(serviceId))
      .map(([pkg]) => pkg);
    if (!compatiblePkgs.length) return true;
    return packageTypes(client).some(pkg => compatiblePkgs.includes(pkg));
  }

  function serviceUsesPackageSessions(serviceOrId) {
    const svc = typeof serviceOrId === 'string' ? getService(serviceOrId) : serviceOrId;
    return !!svc && !svc.isBlock && !svc.isNutri && !svc.isValuation;
  }

  function extractAppointmentPackageCycle(appt) {
    const notes = String(appt?.notes || '');
    const explicit = notes.match(/\[CICLO-PACCHETTO\s+(\d{4}-\d{2}-\d{2})\]/i);
    if (explicit) return explicit[1];
    const renewals = [...notes.matchAll(/Rinnovo pacchetto da\s+(\d{4}-\d{2}-\d{2})/gi)];
    return renewals.length ? renewals[renewals.length - 1][1] : '';
  }

  function extractAppointmentPackageCycleId(appt) {
    return typeof PackageLedger !== 'undefined'
      ? PackageLedger.appointmentCycleId(appt?.notes)
      : (String(appt?.notes || '').match(/\[CICLO-PACCHETTO-ID\s+([a-zA-Z0-9_-]+)\]/i)?.[1] || '');
  }

  function getPackageCycleContext(client) {
    if (!client?.id) return { start: '', id: '', legacy: true, persisted: false, inferredFromAppointment: false };
    const ledger = typeof PackageLedger !== 'undefined' ? PackageLedger.parse(client) : null;
    const currentLedgerCycle = ledger && !ledger.parseError ? PackageLedger.currentCycle(ledger) : null;
    const persistedStart = String(client.packageCycleStart || client.package_cycle_start || '').slice(0, 10);
    const appointmentStarts = State.getAppointments()
      .filter(a => Array.isArray(a.clientIds) && a.clientIds.includes(client.id))
      .filter(a => serviceUsesPackageSessions(a.serviceId))
      .map(extractAppointmentPackageCycle)
      .filter(Boolean)
      .sort();
    const inferredStart = appointmentStarts[appointmentStarts.length - 1] || '';
    const acquisitionStart = String(
      client.acquisitionStart || client.dataInizio || client.data_inizio || client.packageStart || ''
    ).slice(0, 10);
    return {
      start: currentLedgerCycle?.startDate || persistedStart || inferredStart || acquisitionStart,
      id: currentLedgerCycle?.id || '',
      legacy: currentLedgerCycle ? currentLedgerCycle.legacy === true : true,
      persisted: !!persistedStart,
      inferredFromAppointment: !persistedStart && !!inferredStart,
    };
  }

  function appointmentInCurrentPackageCycle(appt, client) {
    if (!appt || !client) return false;
    const context = getPackageCycleContext(client);
    const appointmentCycle = extractAppointmentPackageCycle(appt);
    const appointmentCycleId = extractAppointmentPackageCycleId(appt);
    if (context.id && appointmentCycleId) return appointmentCycleId === context.id;
    // I cicli creati dal nuovo registro usano sempre un ID: una vecchia
    // seduta senza ID non puo' entrare per errore nel nuovo rinnovo.
    if (context.id && !context.legacy) return false;
    // Dopo che il ciclo è stato confermato sul cliente, la data di inizio è
    // l'unica fonte di verità: una lezione svolta nello stesso giorno del
    // rinnovo appartiene al nuovo ciclo anche se conserva una vecchia nota.
    if (context.persisted) return !context.start || String(appt.date || '') >= context.start;
    if (appointmentCycle) return !context.start || appointmentCycle === context.start;
    return !context.start || String(appt.date || '') >= context.start;
  }

  function getClientPackageAppointments(client, options = {}) {
    if (!client?.id) return [];
    const excludeAppointmentId = options.excludeAppointmentId || null;
    const includeCancelled = options.includeCancelled === true;
    return State.getAppointments().filter(a =>
      a.id !== excludeAppointmentId &&
      (includeCancelled || a.status !== 'annullato') &&
      Array.isArray(a.clientIds) &&
      a.clientIds.includes(client.id) &&
      serviceUsesPackageSessions(a.serviceId)
    );
  }

  function getClientSessionMetrics(client, excludeAppointmentId = null) {
    if (!client) {
      return { total: 0, rawTotal: 0, completed: 0, lifetimeCompleted: 0, previousCompleted: 0, scheduled: 0, remaining: 0, toSchedule: 0 };
    }

    const today = localDateStr(new Date());
    const rawTotal = Number(client.sessionsTotal ?? client.sessions_total ?? 0);
    const storedRemaining = Number(client.sessionsRemaining ?? client.sessions_remaining ?? 0);
    const packageAppts = getClientPackageAppointments(client, { excludeAppointmentId });
    const cycleContext = getPackageCycleContext(client);
    const currentAppts = packageAppts.filter(a => appointmentInCurrentPackageCycle(a, client));
    const completed = currentAppts.filter(a => a.status === 'fatto').length;
    const scheduled = currentAppts.filter(a => a.status === 'prenotato' && a.date >= today).length;
    const noShow = currentAppts.filter(a => a.status === 'noshow').length;
    const lifetimeCompleted = packageAppts.filter(a => a.status === 'fatto').length;
    const previousCompleted = Math.max(0, lifetimeCompleted - completed);
    let total = rawTotal;

    // I rinnovi creati dalle versioni precedenti sommavano il nuovo pacchetto
    // al totale storico. Finché il ciclo non viene confermato, ricaviamo il
    // totale corrente da residuo + fatte del ciclo e lo arrotondiamo solo per
    // i vecchi pacchetti chiaramente multipli di quattro.
    if (cycleContext.inferredFromAppointment && previousCompleted > 0 && rawTotal > 0) {
      const inferred = Math.max(completed + scheduled, storedRemaining + completed);
      let normalized = inferred;
      if (rawTotal % 4 === 0 && inferred > 0 && inferred < rawTotal && inferred % 4 !== 0) {
        normalized = Math.ceil(inferred / 4) * 4;
      }
      if (normalized > 0) total = Math.min(rawTotal, normalized);
    }

    const plannedTotal = completed + scheduled;
    const remaining = total > 0 ? Math.max(0, total - completed) : storedRemaining;
    const toSchedule = total > 0 ? Math.max(0, total - completed - scheduled) : 0;
    const overPlanned = total > 0 ? Math.max(0, plannedTotal - total) : 0;

    return {
      total,
      rawTotal,
      completed,
      lifetimeCompleted,
      previousCompleted,
      scheduled,
      noShow,
      plannedTotal,
      remaining,
      toSchedule,
      overPlanned,
      storedRemaining,
      computedRemaining: remaining,
      cycleStart: cycleContext.start,
      cyclePersisted: cycleContext.persisted,
      needsCycleSetup: cycleContext.inferredFromAppointment && !cycleContext.persisted,
    };
  }

  function opHasRole(op, svc) {
    if (!svc?.requiredRoles?.length) return true;
    const roles = Array.isArray(op.roles) ? op.roles : String(op.roles || '').split(',').map(r => r.trim());
    return svc.requiredRoles.some(r => roles.includes(r));
  }

  function getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin, excludeId = null) {
    const svc = getService(serviceId);
    const tmp = { serviceId, date, startTime, durationMin, bufferMin };
    return State.getOperators().filter(o => o.active !== false).map(op => {
      const hasRole = opHasRole(op, svc);
      const conflicts = State.getAppointments().filter(a =>
        a.id !== excludeId &&
        a.status !== 'annullato' &&
        isAppointmentVisible(a) &&
        a.operatorId === op.id &&
        a.date === date &&
        overlaps(tmp, a, false)
      );
      return { ...op, hasRole, available: conflicts.length === 0, conflicts };
    });
  }

  function autoAssignOperator(serviceId, date, startTime, durationMin, bufferMin, excludeId = null) {
    const ops = getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin, excludeId);
    const best = ops.find(o => o.hasRole && o.available);
    return best ? best.id : null;
  }

  function getAppointmentsForDate(date) {
    return State.getAppointments()
      .filter(a => a.date === date && isAppointmentVisible(a))
      .filter(a => typeof App === 'undefined' || !App.isPortalPtMode?.() || App.canViewAppointment(a))
      .map(getVisibleAppointment);
  }

  function weekdayName(dateStr) {
    const names = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const d = new Date(String(dateStr || '') + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? '' : names[d.getDay()];
  }

  function getRoomMax(roomId) {
    return CONFIG.ROOMS[roomId]?.max || 0;
  }

  function getRoomLoadAt(date, startTime, durationMin, roomId, excludeId = null) {
    const slot = { date, startTime, durationMin, bufferMin: 0 };
    return State.getAppointments()
      .filter(a => a.id !== excludeId && a.date === date && a.status !== 'annullato' && isAppointmentVisible(a))
      .filter(a => {
        const svc = getService(a.serviceId);
        return svc?.room === roomId && overlaps(slot, a, false);
      })
      .reduce((sum, a) => {
        return sum + appointmentRoomLoad(a);
      }, 0);
  }

  function canBookAppointment(appt, options = {}) {
    const errors = [];
    let operatorConflicts = [];
    let operatorOverrideEligible = false;
    const svc = getService(appt.serviceId);
    if (!svc) errors.push('Servizio non valido');

    if (svc && !svc.isBlock && (!appt.clientIds || !appt.clientIds.length)) {
      errors.push('Seleziona almeno un cliente');
    }
    if (svc?.maxClients && appt.clientIds?.length > svc.maxClients) {
      errors.push(`Massimo ${svc.maxClients} clienti`);
    }

    const appts = State.getAppointments().filter(a =>
      a.id !== appt.id &&
      a.date === appt.date &&
      a.status !== 'annullato' &&
      isAppointmentVisible(a)
    );

    if (appt.operatorId) {
      const op = getOperator(appt.operatorId);
      if (op && !opHasRole(op, svc)) errors.push('Operatore senza ruolo compatibile');
      operatorConflicts = appts.filter(a => a.operatorId === appt.operatorId && overlaps(appt, a, false));
      operatorOverrideEligible = appt.serviceId === 'pt11' &&
        operatorConflicts.length === 1 &&
        operatorConflicts.every(a => a.serviceId === 'pt11');
      if (operatorConflicts.length && !(options.allowOperatorOverlap && operatorOverrideEligible)) {
        const conflictSummary = operatorConflicts.map(operatorConflict => {
          const conflictClients = (operatorConflict.clientIds || []).map(clientConflictLabel).join(', ') || 'nessun cliente';
          return `${String(operatorConflict.startTime || '').slice(0, 5)} con ${conflictClients}`;
        }).join(' · ');
        errors.push(`${operatorFullName(appt.operatorId)} occupato alle ${conflictSummary}`);
      }
    }

    const clientConflictId = (appt.clientIds || []).find(cid =>
      appts.some(a => (a.clientIds || []).includes(cid) && overlaps(appt, a, false))
    );
    if (clientConflictId) errors.push(`${clientFullName(clientConflictId)} ha gia un appuntamento alle ${String(appt.startTime || '').slice(0, 5)}`);

    const incompatibleClient = (appt.clientIds || []).map(getClient).find(c =>
      c && svc && !svc.isBlock && !clientCanUseService(c, appt.serviceId)
    );
    if (incompatibleClient) {
      errors.push(`${clientFullName(incompatibleClient.id)} non ha un pacchetto compatibile con ${svc.label}`);
    }

    if (serviceUsesPackageSessions(svc)) {
      const apptDay = weekdayName(appt.date);
      if (options.strictPackageDays) {
        const dayMismatch = (appt.clientIds || []).map(getClient).find(c => {
          const days = c?.giorniSettimana || c?.giorni_settimana || [];
          return Array.isArray(days) && days.length && !days.includes(apptDay);
        });
        if (dayMismatch) errors.push(`${clientFullName(dayMismatch.id)} non ha ${apptDay} nella pianificazione reale del pacchetto`);
      }

      const noSessionsClient = (appt.clientIds || []).map(getClient).find(c => {
        const metrics = getClientSessionMetrics(c, appt.id || null);
        return metrics.total > 0 && metrics.remaining <= 0;
      });
      if (noSessionsClient) errors.push(`${clientFullName(noSessionsClient.id)} non ha sessioni rimanenti`);

      const fullyPlannedClient = (appt.clientIds || []).map(getClient).find(c => {
        const metrics = getClientSessionMetrics(c, appt.id || null);
        return !appt.id && metrics.total > 0 && appt.status !== 'fatto' && metrics.toSchedule <= 0;
      });
      if (fullyPlannedClient) errors.push(`${clientFullName(fullyPlannedClient.id)} ha gia tutte le sedute programmate`);
    }

    if (svc?.room) {
      const current = getRoomLoadAt(appt.date, appt.startTime, appt.durationMin, svc.room, appt.id);
      const add = appointmentRoomLoad(appt);
      const max = getRoomMax(svc.room);
      if (current + add > max) errors.push(`${CONFIG.ROOMS[svc.room]?.label || 'Sala'} piena`);
    }

    return { ok: errors.length === 0, errors, operatorConflicts, operatorOverrideEligible };
  }

  function hasForcedPt11Overlap(appt) {
    return /\[FORZA-PT11\]/.test(String(appt?.notes || ''));
  }

  function addAppointment(data) {
    const appointments = State.getAppointments();
    const now = Date.now();
    const appt = { id: State.genId('a'), createdAt: now, updatedAt: now, ...data };
    appointments.push(appt);
    State.saveAppointments(appointments);
    return appt;
  }

  function updateAppointment(id, patch) {
    const appointments = State.getAppointments();
    const idx = appointments.findIndex(a => a.id === id);
    if (idx < 0) return null;
    appointments[idx] = { ...appointments[idx], ...patch, updatedAt: Date.now() };
    State.saveAppointments(appointments);
    return appointments[idx];
  }

  function deleteAppointment(id) {
    State.saveAppointments(State.getAppointments().filter(a => a.id !== id));
  }

  function addCircuitParticipant(apptId, clientId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    const svc = appt && getService(appt.serviceId);
    if (!appt || !svc?.isGroup) return { ok: false, error: 'Appuntamento non valido' };
    if (appt.clientIds.includes(clientId)) return { ok: false, error: 'Cliente gia presente' };
    if (appt.clientIds.length >= svc.maxClients) return { ok: false, error: 'Circuit al completo' };
    updateAppointment(apptId, { clientIds: [...appt.clientIds, clientId] });
    return { ok: true };
  }

  function removeCircuitParticipant(apptId, clientId) {
    const appt = State.getAppointments().find(a => a.id === apptId);
    if (!appt) return;
    updateAppointment(apptId, { clientIds: appt.clientIds.filter(id => id !== clientId) });
  }

  function getSaturationTimeline(date) {
    const start = timeToMin(CONFIG.workHours.start);
    const end = timeToMin(CONFIG.workHours.end);
    const step = 60;
    const rows = [];
    for (let t = start; t < end; t += step) {
      const time = minToTime(t);
      const rooms = {};
      Object.values(CONFIG.ROOMS).forEach(room => {
        const load = getRoomLoadAt(date, time, step, room.id);
        rooms[room.id] = { load, max: room.max, pct: room.max ? Math.min(100, Math.round(load / room.max * 100)) : 0 };
      });
      rows.push({ time, label: `${time}-${minToTime(t + step)}`, rooms });
    }
    return rows;
  }

  function getKPIForDate(date) {
    const appts = getAppointmentsForDate(date).filter(a => a.status !== 'annullato');
    const now = new Date();
    const nowMin = localDateStr(now) === date ? now.getHours() * 60 + now.getMinutes() : -1;
    return {
      totalAppts: appts.length,
      inSalaNow: nowMin < 0 ? 0 : appts.reduce((sum, a) => {
        const svc = getService(a.serviceId);
        const inNow = timeToMin(a.startTime) <= nowMin && nowMin < timeToMin(a.startTime) + Number(a.durationMin || svc?.durationMin || 60);
        return inNow && svc?.room === 'pt' ? sum + appointmentRoomLoad(a) : sum;
      }, 0),
      nutriAppts: appts.filter(a => getService(a.serviceId)?.isNutri).length,
      valAppts: appts.filter(a => getService(a.serviceId)?.isValuation).length,
      circuitiCount: appts.filter(a => getService(a.serviceId)?.isGroup).length,
      circuitFreeSlots: appts.reduce((sum, a) => {
        const svc = getService(a.serviceId);
        return svc?.isGroup ? sum + Math.max(0, svc.maxClients - (a.clientIds?.length || 0)) : sum;
      }, 0),
      occupiedOps: new Set(appts.map(a => a.operatorId).filter(Boolean)).size,
    };
  }

  return {
    getService,
    timeToMin,
    minToTime,
    effectiveEnd,
    overlaps,
    getClient,
    getOperator,
    getActiveClientIds,
    isAppointmentVisible,
    getVisibleAppointment,
    clientFullName,
    clientConflictLabel,
    operatorFullName,
    clientCanUseService,
    serviceUsesPackageSessions,
    extractAppointmentPackageCycle,
    extractAppointmentPackageCycleId,
    getPackageCycleContext,
    appointmentInCurrentPackageCycle,
    getClientPackageAppointments,
    getClientSessionMetrics,
    getCompatibleClients,
    getAvailableOperatorsForSlot,
    autoAssignOperator,
    getAppointmentsForDate,
    getRoomMax,
    getRoomLoadAt,
    canBookAppointment,
    hasForcedPt11Overlap,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addCircuitParticipant,
    removeCircuitParticipant,
    getSaturationTimeline,
    getKPIForDate,
  };
})();
