const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'content-type': 'application/json',
};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';
const BUCKET = process.env.SUPABASE_PT_PHOTO_BUCKET || 'client-photos';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { success: false, error: 'Metodo non supportato' });

  try {
    const data = JSON.parse(event.body || '{}');
    if (data.action === 'uploadFoto') return response(200, await uploadFoto(data));
    if (data.action === 'deleteFoto') return response(200, await deleteFoto(data));
    return response(400, { success: false, error: 'Azione non supportata' });
  } catch (err) {
    return response(500, { success: false, error: err.message || String(err) });
  }
};

function response(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

async function uploadFoto(data) {
  if (!data.clienteId || !data.base64) return { success: false, error: 'Cliente o foto mancanti' };
  const mimeType = data.mimeType || 'image/jpeg';
  const ext = extFromMime(mimeType, data.filename);
  const date = data.data || new Date().toISOString().slice(0, 10);
  const path = [
    safeSegment(data.clienteId),
    date,
    `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeSegment(data.filename || 'foto')}.${ext}`,
  ].join('/');

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': mimeType,
      upsert: 'false',
    },
    body: Buffer.from(String(data.base64), 'base64'),
  });
  const text = await res.text();
  if (!res.ok) return { success: false, error: storageError(text || res.statusText) };

  return {
    success: true,
    bucket: BUCKET,
    path,
    url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeStoragePath(path)}`,
  };
}

async function deleteFoto(data) {
  if (!data.bucket || !data.path) return { success: true };
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${data.bucket}/${encodeStoragePath(data.path)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (res.ok || res.status === 404) return { success: true };
  return { success: false, error: storageError(await res.text()) };
}

function safeSegment(value) {
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

function encodeStoragePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function storageError(text) {
  const raw = String(text || '');
  if (/Bucket not found|not found/i.test(raw)) return `Bucket foto Supabase non configurato: crea "${BUCKET}".`;
  if (/row-level security|permission|policy|unauthorized|forbidden/i.test(raw)) return `Permessi Storage mancanti per "${BUCKET}". Configura SUPABASE_SERVICE_ROLE_KEY su Netlify o le policy del bucket.`;
  return raw || 'Operazione Storage fallita';
}
