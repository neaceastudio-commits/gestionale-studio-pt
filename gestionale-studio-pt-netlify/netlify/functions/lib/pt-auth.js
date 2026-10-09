const crypto = require('crypto');

const DEFAULT_SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';

function cleanString(value) {
  return String(value || '').trim();
}

function supabaseUrl() {
  return cleanString(process.env.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
}

function supabaseServerKey() {
  const key = cleanString(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) throw new Error('SUPABASE_SERVER_KEY_MISSING');
  return key;
}

function accessSecret() {
  const secret = cleanString(process.env.PT_ACCESS_SECRET);
  if (!secret) throw new Error('PT_ACCESS_SECRET_MISSING');
  return secret;
}

function operatorRoles(operator) {
  return Array.from(new Set([
    ...(Array.isArray(operator?.system_roles) ? operator.system_roles : []),
    ...(Array.isArray(operator?.legacy_roles) ? operator.legacy_roles : []),
    ...(Array.isArray(operator?.roles) ? operator.roles : []),
    ...(operator?.role ? [operator.role] : []),
  ].filter(Boolean).map((role) => cleanString(role).toLowerCase())));
}

function isPersonalTrainer(operator) {
  return operatorRoles(operator).some((role) => ['pt', 'personal_trainer', 'personal trainer'].includes(role));
}

function accessLevelFor(operator) {
  const ownerRoles = new Set([
    'admin',
    'administrator',
    'amministratore',
    'owner',
    'titolare',
    'super_admin',
    'direzione',
  ]);
  return operatorRoles(operator).some((role) => ownerRoles.has(role)) ? 'owner' : 'pt';
}

function publicOperator(operator) {
  return {
    id: cleanString(operator?.operator_id || operator?.id),
    email: cleanString(operator?.email).toLowerCase(),
    nome: cleanString(operator?.nome),
    cognome: cleanString(operator?.cognome),
    roles: operatorRoles(operator),
    accessLevel: accessLevelFor(operator),
    accessVersion: Number(operator?.portal_access_version || 0),
  };
}

async function supabaseRequest(table, query = '', options = {}) {
  const key = supabaseServerKey();
  const response = await fetch(`${supabaseUrl().replace(/\/$/, '')}/rest/v1/${table}${query}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || text || `SUPABASE_${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function loadOperatorDirectory() {
  try {
    return await supabaseRequest('operator_effective_roles', '?select=*&active=eq.true&order=cognome.asc,nome.asc');
  } catch (error) {
    if (error.status !== 404) throw error;
    return supabaseRequest('operators', '?select=*&active=eq.true&order=cognome.asc,nome.asc');
  }
}

async function findPersonalTrainer(email, operatorId = '') {
  const normalizedEmail = cleanString(email).toLowerCase();
  const normalizedId = cleanString(operatorId);
  if (!normalizedEmail || !normalizedEmail.includes('@')) return null;
  const operators = await loadOperatorDirectory();
  const matches = (operators || []).filter((operator) => {
    if (!isPersonalTrainer(operator)) return false;
    const value = publicOperator(operator);
    return value.email === normalizedEmail && (!normalizedId || value.id === normalizedId);
  });
  if (matches.length !== 1) return null;
  const id = cleanString(matches[0].operator_id || matches[0].id);
  const access = await supabaseRequest('operators', '?select=id,active,portal_access_enabled,portal_access_version&id=eq.' + encodeURIComponent(id));
  const settings = access?.find(row => String(row.id) === id);
  if (!settings || settings.active === false || settings.portal_access_enabled === false) return null;
  return publicOperator({ ...matches[0], ...settings });
}

function accessCode(email, operatorId = '') {
  const digest = crypto
    .createHmac('sha256', accessSecret())
    .update(`${cleanString(email).toLowerCase()}|${cleanString(operatorId)}`)
    .digest('hex');
  const numeric = parseInt(digest.slice(0, 12), 16) % 1000000;
  return String(numeric).padStart(6, '0');
}

function signAccessToken(email, operatorId = '', accessLevel = 'pt', accessVersion = 0) {
  const payload = Buffer.from(JSON.stringify({
    email: cleanString(email).toLowerCase(),
    operatorId: cleanString(operatorId),
    accessLevel: accessLevel === 'owner' ? 'owner' : 'pt',
    accessVersion: Number(accessVersion),
    exp: Date.now() + (12 * 60 * 60 * 1000),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyAccessToken(token) {
  const [payload, signature] = cleanString(token).split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.email || !data.operatorId || Number(data.exp || 0) <= Date.now()) return null;
    data.accessLevel = data.accessLevel === 'owner' ? 'owner' : 'pt';
    return data;
  } catch (_) {
    return null;
  }
}

async function authenticatedOperator(token) {
  const claims = verifyAccessToken(token);
  if (!claims) return null;
  const operator = await findPersonalTrainer(claims.email, claims.operatorId);
  if (!operator || Number(claims.accessVersion || 0) !== operator.accessVersion) return null;
  return { ...operator, accessLevel: operator.accessLevel, expiresAt: claims.exp };
}

module.exports = {
  accessCode,
  accessLevelFor,
  accessSecret,
  authenticatedOperator,
  findPersonalTrainer,
  isPersonalTrainer,
  loadOperatorDirectory,
  operatorRoles,
  publicOperator,
  signAccessToken,
  supabaseRequest,
  supabaseServerKey,
  supabaseUrl,
  verifyAccessToken,
};
