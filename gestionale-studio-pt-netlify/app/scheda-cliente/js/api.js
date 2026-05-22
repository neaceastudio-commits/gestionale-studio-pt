// ═══════════════════════════════════════════════════════
//  API Supabase - Schede PT
// ═══════════════════════════════════════════════════════

function sbUrl(table, query = '') {
  return SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table + query;
}

async function sb(table, { method = 'GET', query = '', body = null, headers = {} } = {}) {
  const r = await fetch(sbUrl(table, query), {
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

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function clientFromDb(r) {
  return {
    id: r.id, nome: r.nome || '', cognome: r.cognome || '', telefono: r.telefono || '', email: r.email || '',
    obiettivo: r.obiettivo || '', ptAssegnato: r.pt_assegnato || '', tipoServizio: r.tipo_servizio || '',
    tipoAbbonamento: r.tipo_abbonamento || '', statoAbbonamento: r.stato_abbonamento || '',
    dataInizio: r.data_inizio || r.package_start || '', dataScadenza: r.data_scadenza || '',
    statoPagamento: r.stato_pagamento || '', importo: r.importo || 0,
    packageTypes: Array.isArray(r.package_types) ? r.package_types : [],
    sessionsTotal: r.sessions_total || 0, sessionsRemaining: r.sessions_remaining || 0,
    giorniSettimana: Array.isArray(r.giorni_settimana) ? r.giorni_settimana : [],
    professione: r.professione || '', come: r.come || '', motivazione: r.motivazione || '',
    sessioni_pref: r.sessioni_pref || r.package_frequency || '', note: r.notes || '',
  };
}

function clientToDb(c) {
  const nome = c.nome || '';
  const cognome = c.cognome || '';
  const packageTypes = Array.isArray(c.packageTypes) ? c.packageTypes : (Array.isArray(c.package_types) ? c.package_types : []);
  return {
    id: c.id || genId('c'),
    nome,
    cognome,
    telefono: c.telefono || '',
    email: c.email || '',
    package_types: packageTypes,
    package_frequency: c.packageFrequency || c.package_frequency || c.sessioni_pref || '',
    sessions_total: parseInt(c.sessionsTotal ?? c.sessions_total ?? c.sessioni_totali) || 0,
    sessions_remaining: parseInt(c.sessionsRemaining ?? c.sessions_remaining) || 0,
    package_start: c.packageStart || c.package_start || c.dataInizio || c.data_inizio || null,
    notes: c.notes || c.note || '',
    active: c.active !== false,
    tipo_servizio: c.tipoServizio || c.tipo_servizio || packageTypes.join(', '),
    tipo_abbonamento: c.tipoAbbonamento || c.tipo_abbonamento || '',
    data_inizio: c.dataInizio || c.data_inizio || c.packageStart || c.package_start || null,
    data_scadenza: c.dataScadenza || c.data_scadenza || null,
    stato_abbonamento: c.statoAbbonamento || c.stato_abbonamento || (c.active === false ? '' : 'Attivo'),
    stato_pagamento: c.statoPagamento || c.stato_pagamento || 'Da pagare',
    pt_assegnato: c.ptAssegnato || c.pt_assegnato || null,
    obiettivo: c.obiettivo || '',
    giorni_settimana: Array.isArray(c.giorniSettimana) ? c.giorniSettimana : (Array.isArray(c.giorni_settimana) ? c.giorni_settimana : []),
    sessioni_pref: c.sessioni_pref || c.packageFrequency || c.package_frequency || '',
    updated_at: new Date().toISOString(),
  };
}

function staffFromDb(r) {
  const role = Array.isArray(r.roles) ? r.roles[0] : '';
  return { id: r.id, nome: r.nome || '', cognome: r.cognome || '', ruolo: role || '', email: r.email || '' };
}

async function apiGet(action, params = {}) {
  if (action === 'getClienti') {
    const rows = await sb('clients', { query: '?select=*&active=eq.true&order=cognome.asc,nome.asc' });
    if (rows.error) return rows;
    return { clienti: (rows || []).map(clientFromDb) };
  }
  if (action === 'getStaff') {
    const rows = await sb('operators', { query: '?select=*&active=eq.true&order=cognome.asc,nome.asc' });
    if (rows.error) return rows;
    return { staff: (rows || []).map(staffFromDb) };
  }
  const map = {
    getDatiFisici: ['dati_fisici', 'datiFisici'],
    getVisiteAlle: ['visite_allenamento', 'visite'],
    getSchede: ['schede_allenamento', 'schede'],
    getFoto: ['foto_allenamento', 'foto'],
    getCarichi: ['carichi_allenamento', 'carichi'],
  };
  if (map[action]) {
    const [table, key] = map[action];
    const rows = await sb(table, { query: '?select=*&cliente_id=eq.' + encodeURIComponent(params.clienteId || '') + '&order=created_at.desc' });
    if (rows.error) return rows;
    return { [key]: (rows || []).map(r => ({ id: r.id, clienteId: r.cliente_id, ...(r.data || {}) })) };
  }
  return { error: 'Azione non supportata: ' + action };
}

async function apiPost(payload) {
  const p = { ...payload };
  const action = p.action;
  delete p.action;

  if (action === 'modificaCliente') {
    const id = p.id || p.clienteId;
    const body = {
      nome: p.nome || '', cognome: p.cognome || '', telefono: p.telefono || '', email: p.email || '',
      obiettivo: p.obiettivo || '', tipo_servizio: p.servizi || p.tipoServizio || '',
      updated_at: new Date().toISOString(),
    };
    const res = await sb('clients', { method: 'PATCH', query: '?id=eq.' + encodeURIComponent(id), headers: { Prefer: 'return=minimal' }, body });
    return res && res.error ? res : { success: true };
  }

  if (action === 'assegnaPT') {
    const res = await sb('clients', { method: 'PATCH', query: '?id=eq.' + encodeURIComponent(p.clienteId), headers: { Prefer: 'return=minimal' }, body: { pt_assegnato: p.ptId || null, updated_at: new Date().toISOString() } });
    return res && res.error ? res : { success: true };
  }

  if (action === 'rinnovaAbbonamento') {
    const id = p.id || p.clienteId;
    const body = {
      tipo_abbonamento: p.tipoAbbonamento || '',
      data_inizio: p.dataInizio || null,
      sessions_total: parseInt(p.sessioni_totali ?? p.sessionsTotal) || 0,
      sessions_remaining: parseInt(p.sessioni_totali ?? p.sessionsTotal) || 0,
      importo: parseFloat(p.importo) || 0,
      stato_pagamento: p.statoPagamento || 'Da pagare',
      stato_abbonamento: 'Attivo',
      updated_at: new Date().toISOString(),
    };
    const res = await sb('clients', { method: 'PATCH', query: '?id=eq.' + encodeURIComponent(id), headers: { Prefer: 'return=minimal' }, body });
    return res && res.error ? res : { success: true };
  }

  if (action === 'importClienti') {
    const clienti = Array.isArray(p.clienti) ? p.clienti : [];
    if (!clienti.length) return { success: true, count: 0 };
    const body = clienti.map(clientToDb);
    const res = await sb('clients', {
      method: 'POST',
      query: '?on_conflict=id',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body,
    });
    return res && res.error ? res : { success: true, count: body.length };
  }

  if (action === 'uploadFoto') {
    const id = genId('foto');
    const url = 'data:' + (p.mimeType || 'image/jpeg') + ';base64,' + p.base64;
    const data = { url, filename: p.filename || '', data: p.data || new Date().toISOString().slice(0, 10), visitaId: p.visitaId || '' };
    const res = await sb('foto_allenamento', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { id, cliente_id: p.clienteId, data } });
    return res && res.error ? res : { success: true, id, url };
  }

  if (action === 'deleteFoto') return deleteRow('foto_allenamento', p.id);
  if (action === 'deleteScheda') return deleteRow('schede_allenamento', p.id);
  if (action === 'deleteVisitaAlle') return deleteRow('visite_allenamento', p.id);
  if (action === 'deleteCarico' || action === 'deleteCarichiSeduta') return deleteRow('carichi_allenamento', p.id);

  const saveMap = {
    saveDatiFisici: ['dati_fisici', 'df'],
    saveVisitaAlle: ['visite_allenamento', 'vis'],
    saveScheda: ['schede_allenamento', 'sch'],
    saveCarichiBulk: ['carichi_allenamento', 'car'],
  };
  if (saveMap[action]) {
    const [table, prefix] = saveMap[action];
    const id = p.id || genId(prefix);
    const clienteId = p.clienteId || clienteAtt?.id || '';
    const body = { id, cliente_id: clienteId, data: { ...p, id, clienteId }, updated_at: new Date().toISOString() };
    const res = await sb(table, { method: 'POST', query: '?on_conflict=id', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body });
    return res && res.error ? res : { success: true, id };
  }

  return { error: 'Azione non supportata: ' + action };
}

async function deleteRow(table, id) {
  const res = await sb(table, { method: 'DELETE', query: '?id=eq.' + encodeURIComponent(id), headers: { Prefer: 'return=minimal' } });
  return res && res.error ? res : { success: true };
}
