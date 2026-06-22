const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'content-type': 'application/json',
};

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';
const PHOTO_BUCKET = process.env.SUPABASE_PT_PHOTO_BUCKET || 'client-photos';
const FILE_BUCKET = process.env.SUPABASE_PT_FILE_BUCKET || 'client-files';

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
  const bucket = isImageMime(mimeType) ? PHOTO_BUCKET : FILE_BUCKET;
  if (bucket === FILE_BUCKET) {
    const ensured = await ensureBucket(bucket);
    if (ensured && ensured.error) return ensured;
  }
  const date = data.data || new Date().toISOString().slice(0, 10);
  const path = [
    safeSegment(data.clienteId),
    date,
    `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeSegment(data.filename || 'foto')}.${ext}`,
  ].join('/');

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(path)}`, {
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
  if (!res.ok) return { success: false, error: storageErrorForBucket(text || res.statusText, bucket) };

  return {
    success: true,
    bucket,
    path,
    url: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`,
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
  return { success: false, error: storageErrorForBucket(await res.text(), data.bucket) };
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
  if (mime.includes('pdf')) return 'pdf';
  const ext = String(filename || '').split('.').pop();
  return ext && /^[a-z0-9]{2,5}$/i.test(ext) ? ext.toLowerCase() : 'jpg';
}

function isImageMime(mimeType) {
  return String(mimeType || '').toLowerCase().startsWith('image/');
}

function encodeStoragePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

async function ensureBucket(bucket) {
  const getRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`, {
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (getRes.ok) return { success: true };

  const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 52428800,
      allowed_mime_types: null,
    }),
  });
  if (createRes.ok || createRes.status === 409) return { success: true };
  return { success: false, error: storageErrorForBucket(await createRes.text(), bucket) };
}

function storageError(text) {
  return storageErrorForBucket(text, PHOTO_BUCKET);
}

function storageErrorForBucket(text, bucket) {
  const raw = String(text || '');
  if (/invalid_mime_type|mime type/i.test(raw)) return `Tipo file non accettato dal bucket "${bucket}".`;
  if (/Bucket not found|not found/i.test(raw)) return `Bucket Supabase non configurato: crea "${bucket}".`;
  if (/row-level security|permission|policy|unauthorized|forbidden/i.test(raw)) return `Permessi Storage mancanti per "${bucket}". Configura SUPABASE_SERVICE_ROLE_KEY su Netlify o le policy del bucket.`;
  return raw || 'Operazione Storage fallita';
}
