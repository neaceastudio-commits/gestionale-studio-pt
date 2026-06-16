// Sincronizzazione Supabase per calendario, clienti e operatori.

const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const SupabaseSync = (() => {
  function url(table, query = '') {
    return SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table + query;
  }

  async function request(table, { method = 'GET', query = '', body = null, headers = {} } = {}) {
    const r = await fetch(url(table, query), {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) return { error: await r.text() };
    if (r.status === 204) return null;
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }

  function clientFromDb(r) {
    return {
      id: r.id,
      nome: r.nome || '',
      cognome: r.cognome || '',
      email: r.email || '',
      telefono: r.telefono || '',
      nascita: r.nascita || null,
      sesso: r.sesso || '',
      codiceFiscale: r.codice_fiscale || '',
      documento: r.documento || '',
      indirizzo: r.indirizzo || '',
      contattoEmergenza: r.contatto_emergenza || '',
      packageTypes: Array.isArray(r.package_types) ? r.package_types : [],
      packageFrequency: r.package_frequency || r.sessioni_pref || '',
      sessionsTotal: r.sessions_total || 0,
      sessionsRemaining: r.sessions_remaining || 0,
      giorniSettimana: Array.isArray(r.giorni_settimana) ? r.giorni_settimana : [],
      packageStart: r.package_start || r.data_inizio || '',
      notes: r.notes || '',
      ptAssegnato: r.pt_assegnato || null,
      tipoServizio: r.tipo_servizio || '',
      tipoAbbonamento: r.tipo_abbonamento || '',
      statoAbbonamento: r.stato_abbonamento || '',
      statoPagamento: r.stato_pagamento || '',
      importo: r.importo || 0,
      obiettivo: r.obiettivo || '',
      professione: r.professione || '',
      come: r.come || '',
      motivazione: r.motivazione || null,
      active: r.active !== false,
    };
  }

  function clientToDb(c) {
    return {
      id: c.id,
      nome: c.nome || '',
      cognome: c.cognome || '',
      email: c.email || '',
      telefono: c.telefono || '',
      nascita: c.nascita || null,
      sesso: c.sesso || '',
      codice_fiscale: c.codiceFiscale || c.codice_fiscale || '',
      documento: c.documento || '',
      indirizzo: c.indirizzo || '',
      contatto_emergenza: c.contattoEmergenza || c.contatto_emergenza || '',
      package_types: Array.isArray(c.packageTypes) ? c.packageTypes : [],
      package_frequency: c.packageFrequency || '',
      sessions_total: parseInt(c.sessionsTotal) || 0,
      sessions_remaining: parseInt(c.sessionsRemaining) || 0,
      giorni_settimana: Array.isArray(c.giorniSettimana) ? c.giorniSettimana : [],
      package_start: c.packageStart || null,
      notes: c.notes || '',
      tipo_servizio: c.tipoServizio || c.tipo_servizio || '',
      tipo_abbonamento: c.tipoAbbonamento || c.tipo_abbonamento || '',
      stato_abbonamento: c.statoAbbonamento || c.stato_abbonamento || '',
      stato_pagamento: c.statoPagamento || c.stato_pagamento || '',
      importo: Number(c.importo || 0),
      obiettivo: c.obiettivo || '',
      professione: c.professione || '',
      come: c.come || '',
      motivazione: c.motivazione ? parseInt(c.motivazione, 10) : null,
      active: c.active !== false,
      updated_at: new Date().toISOString(),
    };
  }

  function operatorFromDb(r) {
    return {
      id: r.id,
      nome: r.nome || '',
      cognome: r.cognome || '',
      email: r.email || '',
      roles: Array.isArray(r.roles) ? r.roles : [],
      color: r.color || '#2563EB',
      active: r.active !== false,
    };
  }

  function appointmentFromDb(r) {
    return {
      id: r.id,
      serviceId: r.service_id,
      clientIds: Array.isArray(r.client_ids) ? r.client_ids : [],
      operatorId: r.operator_id || null,
      date: r.date,
      startTime: String(r.start_time || '').slice(0, 5),
      durationMin: r.duration_min || 60,
      bufferMin: r.buffer_min || 0,
      status: r.status || 'prenotato',
      notes: r.notes || '',
      createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
    };
  }

  const DAY_INDEX = { 'Domenica': 0, 'Lunedi': 1, 'Lunedì': 1, 'Martedi': 2, 'Martedì': 2, 'Mercoledi': 3, 'Mercoledì': 3, 'Giovedi': 4, 'Giovedì': 4, 'Venerdi': 5, 'Venerdì': 5, 'Sabato': 6 };

  function localDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function parseLocalDate(value) {
    const parts = String(value || new Date().toISOString().slice(0, 10)).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function serviceIdForClient(client) {
    const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : [];
    if (pkgs.includes('PT 1:1')) return 'pt11';
    if (pkgs.includes('PT 1:2')) return 'pt12';
    if (pkgs.includes('Circuit')) return 'circuit';
    if (pkgs.includes('Valutazioni') || pkgs.includes('Visbody')) return 'visbody';
    if (pkgs.includes('Baiobit')) return 'baiobit';
    return null;
  }

  function nextPackageDates(start, giorni, count) {
    const wanted = new Set((giorni || []).map(day => DAY_INDEX[day]).filter(day => day !== undefined));
    if (!wanted.size || !count) return [];
    const out = [];
    const d = parseLocalDate(start);
    for (let guard = 0; out.length < count && guard < 370; guard += 1) {
      if (wanted.has(d.getDay())) out.push(localDateStr(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  async function ensurePackageAppointments(clients) {
    const current = State.getAppointments();
    const created = [];

    clients.forEach(client => {
      const pkgs = Array.isArray(client.packageTypes) ? client.packageTypes : [];
      const total = Number(client.sessionsTotal || 0);
      const days = Array.isArray(client.giorniSettimana) ? client.giorniSettimana : [];
      const trainingServiceId = serviceIdForClient(client);

      const existingTraining = current.filter(appt =>
        appt.status !== 'annullato' &&
        Array.isArray(appt.clientIds) &&
        appt.clientIds.includes(client.id) &&
        appt.serviceId === trainingServiceId
      );

      if (trainingServiceId && total && days.length) {
        const missing = Math.max(0, total - existingTraining.length);
        const usedDates = new Set(existingTraining.map(appt => appt.date));
        const dates = nextPackageDates(client.packageStart, days, total + existingTraining.length)
          .filter(date => !usedDates.has(date))
          .slice(0, missing);
        const service = CONFIG.SERVICES[trainingServiceId] || CONFIG.SERVICES.pt11;

        dates.forEach(date => {
          created.push({
            id: State.genId('a'),
            serviceId: trainingServiceId,
            clientIds: [client.id],
            operatorId: client.ptAssegnato || null,
            date,
            startTime: '09:00',
            durationMin: service.durationMin || 60,
            bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
            status: 'prenotato',
            notes: 'Programmazione generata dal pacchetto',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        });
      }

      if (pkgs.includes('Nutrizione')) {
        const hasNutrition = current.concat(created).some(appt =>
          appt.status !== 'annullato' &&
          Array.isArray(appt.clientIds) &&
          appt.clientIds.includes(client.id) &&
          (appt.serviceId === 'nutrizione' || appt.serviceId === 'check')
        );
        if (!hasNutrition) {
          const service = CONFIG.SERVICES.nutrizione;
          created.push({
            id: State.genId('a'),
            serviceId: 'nutrizione',
            clientIds: [client.id],
            operatorId: null,
            date: client.packageStart || localDateStr(new Date()),
            startTime: '10:30',
            durationMin: service.durationMin || 60,
            bufferMin: service.bufferMin ?? CONFIG.defaultBufferMin ?? 10,
            status: 'prenotato',
            notes: 'Visita nutrizionale generata dal pacchetto',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    });

    if (!created.length) return;
    State.saveAppointments([...current, ...created].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)));
    await Promise.all(created.map(pushAppointment));
  }

  function appointmentToDb(a) {
    return {
      id: a.id,
      service_id: a.serviceId,
      client_ids: a.clientIds || [],
      operator_id: a.operatorId || null,
      date: a.date,
      start_time: a.startTime,
      duration_min: parseInt(a.durationMin) || 60,
      buffer_min: parseInt(a.bufferMin) || 0,
      status: a.status || 'prenotato',
      notes: a.notes || '',
      updated_at: new Date().toISOString(),
    };
  }

  async function pullAll() {
    const [clients, operators, appointments] = await Promise.all([
      request('clients', { query: '?select=*&active=eq.true&order=cognome.asc,nome.asc' }),
      request('operators', { query: '?select=*&active=eq.true&order=cognome.asc,nome.asc' }),
      request('appointments', { query: '?select=*&order=date.asc,start_time.asc' }),
    ]);
    if (!clients?.error && Array.isArray(clients)) State.saveClients(clients.map(clientFromDb));
    if (!operators?.error && Array.isArray(operators)) State.saveOperators(operators.map(operatorFromDb));
    if (!appointments?.error && Array.isArray(appointments)) State.saveAppointments(appointments.map(appointmentFromDb));
    localStorage.setItem('neacea_last_sync', new Date().toISOString());
  }

  async function pushAppointment(appt) {
    if (!appt) return;
    return request('appointments', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: appointmentToDb(appt),
    });
  }

  async function pushClient(client) {
    if (!client) return;
    const body = clientToDb(client);
    const res = await request('clients', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body,
    });
    if (!res?.error) return res;
    if (!String(res.error).includes('column')) return res;
    const fallback = { ...body };
    ['nascita', 'sesso', 'codice_fiscale', 'documento', 'indirizzo', 'contatto_emergenza'].forEach(k => delete fallback[k]);
    return request('clients', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: fallback,
    });
  }

  async function pushOperator(operator) {
    if (!operator) return;
    return request('operators', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        id: operator.id,
        nome: operator.nome || '',
        cognome: operator.cognome || '',
        email: operator.email || '',
        roles: Array.isArray(operator.roles) ? operator.roles : [],
        color: operator.color || '#2563EB',
        active: operator.active !== false,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async function deleteAppointment(id) {
    return request('appointments', {
      method: 'DELETE',
      query: '?id=eq.' + encodeURIComponent(id),
      headers: { Prefer: 'return=minimal' },
    });
  }

  return { pullAll, pushAppointment, pushClient, pushOperator, deleteAppointment, ensurePackageAppointments };
})();
