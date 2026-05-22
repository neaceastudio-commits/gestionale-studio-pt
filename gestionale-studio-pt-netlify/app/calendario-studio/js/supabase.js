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
      packageTypes: Array.isArray(r.package_types) ? r.package_types : [],
      packageFrequency: r.package_frequency || r.sessioni_pref || '',
      sessionsTotal: r.sessions_total || 0,
      sessionsRemaining: r.sessions_remaining || 0,
      giorniSettimana: Array.isArray(r.giorni_settimana) ? r.giorni_settimana : [],
      packageStart: r.package_start || r.data_inizio || '',
      notes: r.notes || '',
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
      package_types: Array.isArray(c.packageTypes) ? c.packageTypes : [],
      package_frequency: c.packageFrequency || '',
      sessions_total: parseInt(c.sessionsTotal) || 0,
      sessions_remaining: parseInt(c.sessionsRemaining) || 0,
      giorni_settimana: Array.isArray(c.giorniSettimana) ? c.giorniSettimana : [],
      package_start: c.packageStart || null,
      notes: c.notes || '',
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
    return request('clients', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: clientToDb(client),
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

  return { pullAll, pushAppointment, pushClient, pushOperator, deleteAppointment };
})();
