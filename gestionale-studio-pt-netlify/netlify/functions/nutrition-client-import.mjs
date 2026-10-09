import crypto from 'node:crypto';

const ALLOWED_OPERATOR_EMAIL = 'nutrizione.gianlucapirisi@gmail.com';
const DEFAULT_ACCESS_VERIFY_URL = 'https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email';
const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const detailCache = new Map();

const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

const clean = value => String(value ?? '').trim();
const normalizedEmail = value => clean(value).toLowerCase();
const normalizedFiscalCode = value => clean(value).replace(/\s+/g, '').toUpperCase();
const normalizedId = value => clean(value).toLowerCase();
const safeSourceId = value => clean(value).replace(/[\r\n|]+/g, ' ').replace(/\s+/g, ' ').slice(0, 160);
const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { ...responseHeaders, ...extraHeaders },
  body: JSON.stringify(body)
});

function parseBody(event) {
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body || '{}';
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function bearerToken(event) {
  const value = clean(event.headers?.authorization ?? event.headers?.Authorization);
  return value.startsWith('Bearer ') ? clean(value.slice(7)) : '';
}

function locallyVerifiedSession(token) {
  const secret = clean(process.env.PT_ACCESS_SECRET);
  if (!secret) return { configurationError: true };
  const [payload, signature] = clean(token).split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.email || !data?.operatorId || Number(data?.exp || 0) <= Date.now()) return null;
    return {
      email: normalizedEmail(data.email),
      operatorId: clean(data.operatorId),
      accessLevel: clean(data.accessLevel) || 'pt',
      expiresAt: Number(data.exp)
    };
  } catch {
    return null;
  }
}

async function verifiedOperator(event) {
  const token = bearerToken(event);
  if (!token) return { error: json(401, { success: false, error: 'Sessione PT richiesta.' }) };
  const signedSession = locallyVerifiedSession(token);
  if (signedSession?.configurationError) {
    return { error: json(503, { success: false, error: 'Verifica sicura della sessione PT non configurata.' }) };
  }
  if (!signedSession) return { error: json(401, { success: false, error: 'Sessione PT non valida o scaduta.' }) };

  const verifyUrl = clean(process.env.PT_ACCESS_VERIFY_URL) || DEFAULT_ACCESS_VERIFY_URL;
  let response;
  try {
    response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_token', token })
    });
  } catch {
    return { error: json(503, { success: false, error: 'Verifica della sessione PT non disponibile.' }) };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success !== true || !data?.operatorId || !data?.email) {
    return { error: json(401, { success: false, error: 'Sessione PT non valida o scaduta.' }) };
  }
  if (
    clean(data.operatorId) !== signedSession.operatorId
    || normalizedEmail(data.email) !== signedSession.email
  ) {
    return { error: json(401, { success: false, error: 'Sessione PT non coerente.' }) };
  }
  if (normalizedEmail(data.email) !== ALLOWED_OPERATOR_EMAIL) {
    return { error: json(403, { success: false, error: 'Importazione Nutrizione non autorizzata per questo profilo.' }) };
  }

  return {
    operator: {
      id: clean(data.operatorId),
      email: normalizedEmail(data.email),
      accessLevel: clean(data.accessLevel) || 'pt'
    }
  };
}

function nutritionSettings() {
  return {
    endpoint: clean(process.env.SCADENZE_API_URL),
    token: clean(process.env.SCADENZE_API_TOKEN)
  };
}

function supabaseSettings() {
  return {
    url: clean(process.env.SUPABASE_URL).replace(/\/$/, ''),
    serviceKey: clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

async function nutritionRequest(action, payload = {}) {
  const config = nutritionSettings();
  if (!config.endpoint || !config.token) throw new Error('NUTRITION_NOT_CONFIGURED');

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, _token: config.token, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`NUTRITION_${response.status}`);
  if (data?.success === false) throw new Error(clean(data.error) || 'NUTRITION_ERROR');
  return data;
}

function nutritionValues(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.clienti) ? data.clienti : Array.isArray(data?.clients) ? data.clients : [];
}

function hasNutritionAnamnesis(value) {
  const type = clean(value?.tipo).toLowerCase();
  const source = clean(value?.fonte).toLowerCase();
  if (type === 'allenamento') return false;
  if (source === 'form coaching' || source === 'manuale allenamento') return false;
  return true;
}

function commonNutritionFields(value = {}) {
  return {
    sourceId: safeSourceId(value.sourceId ?? value.id ?? value.client_id ?? value.ID_Paziente),
    nome: clean(value.nome ?? value.name ?? value.first_name).slice(0, 120),
    cognome: clean(value.cognome ?? value.surname ?? value.last_name).slice(0, 120),
    email: normalizedEmail(value.email).slice(0, 240),
    telefono: clean(value.telefono ?? value.phone ?? value.cellulare).slice(0, 80),
    codiceFiscale: normalizedFiscalCode(value.codice_fiscale ?? value.codiceFiscale ?? value.tax_code).slice(0, 32),
    nascita: normalizeDate(value.data_nascita ?? value.nascita ?? value.birth_date),
    sesso: clean(value.sesso ?? value.sex ?? value.gender).slice(0, 40),
    professione: clean(value.professione ?? value.occupation).slice(0, 160),
    fonte: clean(value.fonte ?? value.source).slice(0, 120),
    tipo: clean(value.tipo).slice(0, 80)
  };
}

function normalizeDate(value) {
  const raw = clean(value);
  if (!raw) return '';
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const italian = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (italian) return `${italian[3]}-${italian[2].padStart(2, '0')}-${italian[1].padStart(2, '0')}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function candidateSummary(value) {
  const common = commonNutritionFields(value);
  return {
    sourceId: common.sourceId,
    nome: common.nome,
    cognome: common.cognome,
    email: common.email,
    telefono: common.telefono,
    codiceFiscale: common.codiceFiscale,
    nascita: common.nascita,
    sesso: common.sesso,
    professione: common.professione
  };
}

async function nutritionDetail(email) {
  const key = normalizedEmail(email);
  if (!key) return null;
  const cached = detailCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const data = await nutritionRequest('getCliente', { email: key });
  const value = data?.cliente ?? data?.client ?? null;
  if (!value) return null;
  detailCache.set(key, { value, expiresAt: Date.now() + DETAIL_CACHE_TTL_MS });
  return value;
}

function directNutritionMatches(values, query) {
  const idQuery = normalizedId(query);
  const emailQuery = normalizedEmail(query);
  const fiscalQuery = normalizedFiscalCode(query);
  return values.filter(hasNutritionAnamnesis).filter(value => {
    const common = commonNutritionFields(value);
    return (common.sourceId && normalizedId(common.sourceId) === idQuery)
      || (common.codiceFiscale && common.codiceFiscale === fiscalQuery)
      || (common.email && common.email === emailQuery);
  });
}

async function fiscalCodeFallback(values, query) {
  const fiscalCode = normalizedFiscalCode(query);
  if (!/^[A-Z0-9]{11,16}$/.test(fiscalCode)) return [];

  const configuredLimit = Number.parseInt(process.env.NUTRITION_CF_SCAN_LIMIT || '160', 10);
  const limit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(configuredLimit, 300)) : 160;
  const candidates = values.filter(hasNutritionAnamnesis).filter(value => normalizedEmail(value?.email)).slice(0, limit);
  const batchSize = 8;
  for (let index = 0; index < candidates.length; index += batchSize) {
    const batch = candidates.slice(index, index + batchSize);
    const details = await Promise.allSettled(batch.map(value => nutritionDetail(value.email)));
    for (let offset = 0; offset < details.length; offset += 1) {
      const result = details[offset];
      if (result.status !== 'fulfilled' || !result.value) continue;
      const common = commonNutritionFields(result.value);
      if (common.codiceFiscale === fiscalCode) return [{ ...batch[offset], ...result.value }];
    }
  }
  return [];
}

async function searchNutrition(query) {
  const data = await nutritionRequest('getClienti');
  const values = nutritionValues(data);
  let matches = directNutritionMatches(values, query);
  if (!matches.length) matches = await fiscalCodeFallback(values, query);

  const unique = new Map();
  for (const value of matches) {
    const summary = candidateSummary(value);
    const key = normalizedId(summary.sourceId) || summary.email;
    if (key && !unique.has(key)) unique.set(key, summary);
  }
  return [...unique.values()].slice(0, 5);
}

function keyHeaders(key) {
  return {
    apikey: key,
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {})
  };
}

async function supabaseRequest(config, table, params = new URLSearchParams(), init = {}) {
  const query = params.toString();
  const response = await fetch(`${config.url}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    ...init,
    headers: {
      ...keyHeaders(config.serviceKey),
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.message || body?.error || `Supabase ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function missingColumn(error) {
  const message = clean(error?.message);
  return message.match(/Could not find the '([^']+)' column/i)?.[1]
    || message.match(/column ["']?([a-z0-9_]+)["']? .*does not exist/i)?.[1]
    || '';
}

async function rowsByIdentity(config, table, common, { select = '*', limit = '2' } = {}) {
  const attempts = [];
  if (common.codiceFiscale) attempts.push(['codice_fiscale', `eq.${common.codiceFiscale}`]);
  if (common.email) attempts.push(['email', `ilike.${common.email}`]);

  for (const [column, filter] of attempts) {
    const params = new URLSearchParams({ select, limit });
    params.set(column, filter);
    if (table === 'acquisizioni') params.set('order', 'data_acquisizione.desc');
    else params.set('order', 'active.desc,created_at.asc');
    try {
      const rows = await supabaseRequest(config, table, params);
      if (Array.isArray(rows) && rows.length) return rows;
    } catch (error) {
      if (column === 'codice_fiscale' && missingColumn(error) === 'codice_fiscale') continue;
      throw error;
    }
  }
  return [];
}

function servicesWithPt(value) {
  const services = Array.isArray(value)
    ? value.map(clean).filter(Boolean)
    : clean(value).split(',').map(clean).filter(Boolean);
  if (!services.some(service => service.toLowerCase() === 'pt')) services.unshift('PT');
  return [...new Set(services)].join(',');
}

function withImportAudit(current, sourceId, operator) {
  const raw = clean(current);
  const ownerPattern = /^\[PT_OWNER\].*$/m;
  const sourcePattern = new RegExp(`^\\[NUTRITION_SOURCE\\]\\s+${escapeRegExp(sourceId)}(?:\\s|$).*`, 'm');
  const parts = [raw];
  if (!ownerPattern.test(raw)) parts.push(`[PT_OWNER] ${operator.id} | ${operator.email}`);
  if (!sourcePattern.test(raw)) parts.push(`[NUTRITION_SOURCE] ${sourceId}`);
  parts.push(`[PT_AUDIT] IMPORTATO_DA_NUTRIZIONE | ${operator.id} | ${operator.email} | ${new Date().toISOString()}`);
  return parts.filter(Boolean).join('\n');
}

function escapeRegExp(value) {
  return clean(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function acquisitionCommonBody(common) {
  return {
    nome: common.nome,
    cognome: common.cognome,
    nascita: common.nascita || null,
    sesso: common.sesso,
    telefono: common.telefono,
    email: common.email,
    codice_fiscale: common.codiceFiscale,
    professione: common.professione
  };
}

function mergeOnlyMissing(existing, incoming) {
  const merged = {};
  for (const [key, value] of Object.entries(incoming)) {
    if ((existing?.[key] === null || existing?.[key] === undefined || clean(existing?.[key]) === '') && value) merged[key] = value;
  }
  return merged;
}

function fallbackNote(column, value) {
  const labels = {
    codice_fiscale: 'Codice fiscale',
    nascita: 'Data di nascita',
    sesso: 'Sesso',
    professione: 'Professione'
  };
  return labels[column] && value ? `${labels[column]}: ${value}` : '';
}

async function writeAcquisition(config, existing, body) {
  const next = { ...body };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const params = new URLSearchParams();
    if (existing) params.set('id', `eq.${existing.id}`);
    try {
      await supabaseRequest(config, 'acquisizioni', params, {
        method: existing ? 'PATCH' : 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(next)
      });
      return;
    } catch (error) {
      const column = missingColumn(error);
      if (!column || !(column in next)) throw error;
      const note = fallbackNote(column, next[column]);
      delete next[column];
      if (note) next.impressioni = [clean(next.impressioni), note].filter(Boolean).join('\n');
    }
  }
  throw new Error('ACQUISITION_SCHEMA_NOT_COMPATIBLE');
}

function existingClientSummary(value = {}) {
  return {
    id: clean(value.id),
    nome: clean(value.nome),
    cognome: clean(value.cognome),
    email: normalizedEmail(value.email),
    telefono: clean(value.telefono),
    active: value.active !== false
  };
}

async function importNutritionClient(sourceId, operator) {
  const listData = await nutritionRequest('getClienti');
  const listed = nutritionValues(listData).find(value => hasNutritionAnamnesis(value) && normalizedId(value?.id ?? value?.client_id) === normalizedId(sourceId));
  if (!listed || !normalizedEmail(listed.email)) throw new Error('NUTRITION_CLIENT_NOT_FOUND');

  const detailed = await nutritionDetail(listed.email);
  if (!detailed) throw new Error('NUTRITION_CLIENT_NOT_FOUND');
  const common = commonNutritionFields({ ...listed, ...detailed });
  if (!common.sourceId) common.sourceId = clean(sourceId);
  if (!common.email && !common.codiceFiscale) throw new Error('NUTRITION_CLIENT_WITHOUT_IDENTITY');

  const config = supabaseSettings();
  if (!config.url || !config.serviceKey) throw new Error('SUPABASE_NOT_CONFIGURED');

  const clients = await rowsByIdentity(config, 'clients', common, {
    select: '*'
  });
  if (clients.length) {
    return {
      status: 'existing_client',
      client: existingClientSummary(clients[0]),
      source: candidateSummary(common),
      preservedImpressioni: ''
    };
  }

  const acquisitions = await rowsByIdentity(config, 'acquisizioni', common);
  const existing = acquisitions[0] || null;
  if (existing && clean(existing.stato).toLowerCase() === 'convertito') {
    return {
      status: 'existing_acquisition',
      source: candidateSummary(common),
      preservedImpressioni: ''
    };
  }

  const commonBody = acquisitionCommonBody(common);
  const now = new Date().toISOString();
  const body = existing
    ? {
        ...mergeOnlyMissing(existing, commonBody),
        servizi: servicesWithPt(existing.servizi),
        impressioni: withImportAudit(existing.impressioni, common.sourceId, operator),
        updated_at: now
      }
    : {
        id: `acq_nut_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        ...commonBody,
        servizi: 'PT',
        stato: 'In valutazione',
        impressioni: withImportAudit('', common.sourceId, operator),
        updated_at: now
      };

  await writeAcquisition(config, existing, body);
  return {
    status: existing ? 'updated_acquisition' : 'created',
    acquisitionId: existing ? clean(existing.id) : body.id,
    source: candidateSummary(common),
    preservedImpressioni: clean(body.impressioni)
  };
}

function userMessage(status) {
  if (status === 'created') return 'Dati cliente recuperati dall’anamnesi nutrizionale. Completa ora le informazioni specifiche per il percorso Personal Training.';
  if (status === 'updated_acquisition') return 'Il lead PT esistente è stato completato con i dati anagrafici mancanti. Completa ora le informazioni specifiche del percorso.';
  if (status === 'existing_client') return 'Il cliente è già presente nel sistema PT: non è stata creata alcuna anagrafica duplicata.';
  return 'Esiste già un’acquisizione PT per questo cliente: non è stato creato alcun duplicato.';
}

export async function handler(event = {}) {
  if (clean(event.httpMethod).toUpperCase() !== 'POST') {
    return json(405, { success: false, error: 'Metodo non consentito.' }, { Allow: 'POST' });
  }

  const auth = await verifiedOperator(event);
  if (auth.error) return auth.error;
  const input = parseBody(event);
  if (!input) return json(400, { success: false, error: 'JSON non valido.' });

  try {
    const action = clean(input.action).toLowerCase();
    if (action === 'authorize') {
      return json(200, { success: true, email: auth.operator.email });
    }
    if (action === 'search') {
      const query = clean(input.query).slice(0, 240);
      if (query.length < 5) return json(422, { success: false, error: 'Inserisci email, codice fiscale o ID cliente completo.' });
      const candidates = await searchNutrition(query);
      return json(200, { success: true, candidates });
    }
    if (action === 'import') {
      const sourceId = safeSourceId(input.sourceId);
      if (!sourceId) return json(422, { success: false, error: 'Seleziona prima il cliente Nutrizione.' });
      const result = await importNutritionClient(sourceId, auth.operator);
      return json(200, { success: true, ...result, message: userMessage(result.status) });
    }
    return json(400, { success: false, error: 'Azione non supportata.' });
  } catch (error) {
    const code = clean(error?.message);
    if (code === 'NUTRITION_CLIENT_NOT_FOUND') return json(404, { success: false, error: 'Nessuna anamnesi nutrizionale trovata.' });
    if (code === 'NUTRITION_CLIENT_WITHOUT_IDENTITY') return json(422, { success: false, error: 'Il cliente Nutrizione non ha un identificatore utilizzabile.' });
    if (code === 'NUTRITION_NOT_CONFIGURED' || code === 'SUPABASE_NOT_CONFIGURED') {
      return json(503, { success: false, error: 'Importazione Nutrizione non configurata sul server.' });
    }
    console.error('nutrition-client-import error', code || error);
    return json(502, { success: false, error: 'Importazione Nutrizione temporaneamente non disponibile.' });
  }
}

export const __test = {
  ALLOWED_OPERATOR_EMAIL,
  clearCaches: () => detailCache.clear(),
  commonNutritionFields,
  directNutritionMatches,
  hasNutritionAnamnesis,
  normalizeDate,
  servicesWithPt
};
