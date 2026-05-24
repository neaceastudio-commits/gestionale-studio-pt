// Logica servizi/calendario condivisa, basata sullo State locale.

const Services = (() => {
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

  function clientFullName(id) {
    const c = getClient(id);
    return c ? `${c.nome} ${c.cognome}`.trim() : id || '-';
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

  function opHasRole(op, svc) {
    if (!svc?.requiredRoles?.length) return true;
    const roles = Array.isArray(op.roles) ? op.roles : String(op.roles || '').split(',').map(r => r.trim());
    return svc.requiredRoles.some(r => roles.includes(r));
  }

  function getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin) {
    const svc = getService(serviceId);
    const tmp = { serviceId, date, startTime, durationMin, bufferMin };
    return State.getOperators().filter(o => o.active !== false).map(op => {
      const hasRole = opHasRole(op, svc);
      const conflicts = State.getAppointments().filter(a =>
        a.status !== 'annullato' &&
        a.operatorId === op.id &&
        a.date === date &&
        overlaps(tmp, a, true)
      );
      return { ...op, hasRole, available: conflicts.length === 0, conflicts };
    });
  }

  function autoAssignOperator(serviceId, date, startTime, durationMin, bufferMin) {
    const ops = getAvailableOperatorsForSlot(serviceId, date, startTime, durationMin, bufferMin);
    const best = ops.find(o => o.hasRole && o.available);
    return best ? best.id : null;
  }

  function getAppointmentsForDate(date) {
    return State.getAppointments().filter(a => a.date === date);
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
      .filter(a => a.id !== excludeId && a.date === date && a.status !== 'annullato')
      .filter(a => {
        const svc = getService(a.serviceId);
        return svc?.room === roomId && overlaps(slot, a, false);
      })
      .reduce((sum, a) => {
        const svc = getService(a.serviceId);
        return sum + (svc?.isGroup ? (a.clientIds?.length || 0) : Number(svc?.roomLoad || 0));
      }, 0);
  }

  function canBookAppointment(appt) {
    const errors = [];
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
      a.status !== 'annullato'
    );

    if (appt.operatorId) {
      const op = getOperator(appt.operatorId);
      if (op && !opHasRole(op, svc)) errors.push('Operatore senza ruolo compatibile');
      if (appts.some(a => a.operatorId === appt.operatorId && overlaps(appt, a, true))) {
        errors.push('Operatore occupato nello slot');
      }
    }

    const clientConflict = (appt.clientIds || []).some(cid =>
      appts.some(a => (a.clientIds || []).includes(cid) && overlaps(appt, a, false))
    );
    if (clientConflict) errors.push('Cliente gia prenotato nello slot');

    const incompatibleClient = (appt.clientIds || []).map(getClient).find(c =>
      c && svc && !svc.isBlock && !clientCanUseService(c, appt.serviceId)
    );
    if (incompatibleClient) {
      errors.push(`${clientFullName(incompatibleClient.id)} non ha un pacchetto compatibile con ${svc.label}`);
    }

    const apptDay = weekdayName(appt.date);
    const dayMismatch = (appt.clientIds || []).map(getClient).find(c => {
      const days = c?.giorniSettimana || c?.giorni_settimana || [];
      return Array.isArray(days) && days.length && !days.includes(apptDay);
    });
    if (dayMismatch) errors.push(`${clientFullName(dayMismatch.id)} non ha ${apptDay} nel pacchetto`);

    const noSessionsClient = (appt.clientIds || []).map(getClient).find(c => {
      const total = Number(c?.sessionsTotal ?? c?.sessions_total ?? 0);
      const remaining = Number(c?.sessionsRemaining ?? c?.sessions_remaining ?? 0);
      return total > 0 && remaining <= 0;
    });
    if (noSessionsClient) errors.push(`${clientFullName(noSessionsClient.id)} non ha sessioni rimanenti`);

    if (svc?.room) {
      const current = getRoomLoadAt(appt.date, appt.startTime, appt.durationMin, svc.room, appt.id);
      const add = svc.isGroup ? (appt.clientIds?.length || 0) : Number(svc.roomLoad || 0);
      const max = getRoomMax(svc.room);
      if (current + add > max) errors.push(`${CONFIG.ROOMS[svc.room]?.label || 'Sala'} piena`);
    }

    return { ok: errors.length === 0, errors };
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
    const nowMin = now.toISOString().slice(0, 10) === date ? now.getHours() * 60 + now.getMinutes() : -1;
    return {
      totalAppts: appts.length,
      inSalaNow: nowMin < 0 ? 0 : appts.reduce((sum, a) => {
        const svc = getService(a.serviceId);
        const inNow = timeToMin(a.startTime) <= nowMin && nowMin < timeToMin(a.startTime) + Number(a.durationMin || svc?.durationMin || 60);
        return inNow && svc?.room === 'pt' ? sum + (svc.isGroup ? (a.clientIds?.length || 0) : Number(svc.roomLoad || 0)) : sum;
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
    clientFullName,
    operatorFullName,
    clientCanUseService,
    getCompatibleClients,
    getAvailableOperatorsForSlot,
    autoAssignOperator,
    getAppointmentsForDate,
    getRoomMax,
    getRoomLoadAt,
    canBookAppointment,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addCircuitParticipant,
    removeCircuitParticipant,
    getSaturationTimeline,
    getKPIForDate,
  };
})();
