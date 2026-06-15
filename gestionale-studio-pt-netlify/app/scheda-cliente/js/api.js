// ═══════════════════════════════════════════════════════
//  API Supabase - Schede PT
// ═══════════════════════════════════════════════════════

function sbUrl(table, query = '') {
  return SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table + query;
}

async function sb(table, { method = 'GET', query = '', body = null, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(sbUrl(table, query), {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!r.ok) return { error: await r.text() };
    if (r.status === 204) return null;
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    return { error: err.name === 'AbortError' ? 'Timeout Supabase' : (err.message || String(err)) };
  } finally {
    clearTimeout(timer);
  }
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
    const uploaded = await uploadFotoStorage({
      clienteId: p.clienteId,
      base64: p.base64,
      filename: p.filename || id + '.jpg',
      mimeType: p.mimeType || 'image/jpeg',
      data: p.data || new Date().toISOString().slice(0, 10),
    });
    if (uploaded.error) return uploaded;
    const data = {
      url: uploaded.url,
      filename: p.filename || '',
      data: p.data || new Date().toISOString().slice(0, 10),
      visitaId: p.visitaId || '',
      bucket: uploaded.bucket,
      storagePath: uploaded.path,
      storage_path: uploaded.path,
      source: 'storage',
    };
    const res = await sb('foto_allenamento', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { id, cliente_id: p.clienteId, data } });
    return res && res.error ? res : { success: true, id, url: uploaded.url, bucket: uploaded.bucket, path: uploaded.path };
  }

  if (action === 'deleteFoto') return deleteFoto(p);
  if (action === 'deleteScheda') return deleteRow('schede_allenamento', p.id);
  if (action === 'deleteVisitaAlle') return deleteRow('visite_allenamento', p.id);
  if (action === 'deleteCarico') return deleteRow('carichi_allenamento', p.id);
  if (action === 'deleteCarichiSeduta') return deleteCarichiSeduta(p);

  if (action === 'saveCarichiBulk') return saveCarichiBulk(p);

  const saveMap = {
    saveDatiFisici: ['dati_fisici', 'df'],
    saveVisitaAlle: ['visite_allenamento', 'vis'],
    saveScheda: ['schede_allenamento', 'sch'],
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

function storageBucket() {
  return typeof FOTO_STORAGE_BUCKET !== 'undefined' && FOTO_STORAGE_BUCKET ? FOTO_STORAGE_BUCKET : 'client-photos';
}

function encodeStoragePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function safeStorageSegment(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 90) || 'file';
}

function extFromMime(mimeType, filename) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  const ext = String(filename || '').split('.').pop();
  return ext && /^[a-z0-9]{2,5}$/i.test(ext) ? ext.toLowerCase() : 'jpg';
}

function blobFromBase64(base64, mimeType) {
  const bin = atob(String(base64 || ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'image/jpeg' });
}

async function uploadFotoStorage({ clienteId, base64, filename, mimeType, data }) {
  if (!clienteId || !base64) return { error: 'Foto o cliente mancanti' };
  const viaFunction = await callFotoFunction({
    action: 'uploadFoto',
    clienteId,
    base64,
    filename,
    mimeType,
    data,
  });
  if (viaFunction && viaFunction.success) return viaFunction;
  if (viaFunction && viaFunction.error) return viaFunction;

  const bucket = storageBucket();
  const date = data || oggi();
  const ext = extFromMime(mimeType, filename);
  const path = [
    safeStorageSegment(clienteId),
    date,
    Date.now() + '-' + Math.random().toString(16).slice(2) + '-' + safeStorageSegment(filename || 'foto') + '.' + ext,
  ].join('/');

  const res = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + bucket + '/' + encodeStoragePath(path), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': mimeType || 'image/jpeg',
      upsert: 'false',
    },
    body: blobFromBase64(base64, mimeType || 'image/jpeg'),
  });
  const text = await res.text();
  if (!res.ok) {
    return { error: storageErrorMessage(text || res.statusText) };
  }
  return {
    bucket,
    path,
    url: SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/' + bucket + '/' + encodeStoragePath(path),
  };
}

async function callFotoFunction(payload) {
  try {
    const r = await fetch('/.netlify/functions/foto-pt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.status === 404) return null;
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = { success: false, error: text }; }
    if (!r.ok) return { error: json?.error || text || 'Function foto non disponibile' };
    return json;
  } catch (_) {
    return null;
  }
}

function storageErrorMessage(text) {
  const raw = String(text || '');
  if (/Bucket not found/i.test(raw) || /not found/i.test(raw)) {
    return 'Bucket foto Supabase non configurato: crea il bucket "' + storageBucket() + '" con upload pubblico/autorizzato.';
  }
  if (/row-level security|permission|policy|unauthorized|forbidden/i.test(raw)) {
    return 'Policy Supabase Storage non abilitate per upload/eliminazione foto nel bucket "' + storageBucket() + '".';
  }
  return raw || 'Upload foto fallito';
}

async function deleteStorageObject(bucket, path) {
  if (!bucket || !path) return { success: true };
  const viaFunction = await callFotoFunction({ action: 'deleteFoto', bucket, path });
  if (viaFunction && viaFunction.success) return { success: true };
  if (viaFunction && viaFunction.error) return viaFunction;

  const res = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + bucket + '/' + encodeStoragePath(path), {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
    },
  });
  if (res.ok || res.status === 404) return { success: true };
  return { error: storageErrorMessage(await res.text()) };
}

async function deleteFoto(p) {
  const rows = await sb('foto_allenamento', { query: '?id=eq.' + encodeURIComponent(p.id) + '&select=*' });
  const row = Array.isArray(rows) ? rows[0] : null;
  const data = row && row.data ? row.data : {};
  const bucket = data.bucket || p.bucket;
  const path = data.storagePath || data.storage_path || p.path || p.storagePath || p.storage_path;
  const storageRes = await deleteStorageObject(bucket, path);
  if (storageRes && storageRes.error) return storageRes;
  return deleteRow('foto_allenamento', p.id);
}

function jsonEq(field, value) {
  return '&data-%3E%3E' + encodeURIComponent(field) + '=eq.' + encodeURIComponent(String(value || ''));
}

async function deleteCarichiSeduta(p) {
  const clienteId = p.clienteId || clienteAtt?.id || '';
  const query = '?cliente_id=eq.' + encodeURIComponent(clienteId)
    + jsonEq('esercizio', p.esercizio)
    + jsonEq('data', p.data)
    + jsonEq('seduta', p.seduta);
  const res = await sb('carichi_allenamento', { method: 'DELETE', query, headers: { Prefer: 'return=minimal' } });
  return res && res.error ? res : { success: true };
}

async function saveCarichiBulk(p) {
  const clienteId = p.clienteId || clienteAtt?.id || '';
  const righe = Array.isArray(p.righe) ? p.righe : [];
  if (!clienteId || !p.esercizio || !p.data || !p.seduta || !righe.length) {
    return { error: 'Dati carichi incompleti' };
  }

  await deleteCarichiSeduta(p);

  const clean = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 70);

  const rows = righe.map((r, i) => {
    const serie = Number(r.serie) || i + 1;
    const id = [
      'car',
      clean(clienteId),
      clean(p.schedaId || 'scheda'),
      clean(p.esercizio),
      clean(p.data),
      clean(p.seduta),
      serie,
    ].join('_');
    return {
      id,
      cliente_id: clienteId,
      data: {
        id,
        clienteId,
        schedaId: p.schedaId || '',
        esercizio: p.esercizio,
        progressione: p.progressione || '',
        giorno: p.giorno || '',
        seduta: String(p.seduta),
        data: p.data,
        serie,
        kg: r.kg,
        rip: r.rip,
        note: r.note || '',
        dataCreazione: oggi(),
      },
      updated_at: new Date().toISOString(),
    };
  });

  const res = await sb('carichi_allenamento', {
    method: 'POST',
    query: '?on_conflict=id',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: rows,
  });
  return res && res.error ? res : { success: true, count: rows.length };
}
