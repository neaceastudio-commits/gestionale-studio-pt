const crypto = require('crypto');

const PORTAL_URL = 'https://neacea-portale-personal-trainer.netlify.app/';
const DASHBOARD_URL = 'https://dashboard-pt.netlify.app/';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0rUGnUDD_Jb6shCE2LUfAXDYn8Vh85LLSXrtuxZvbyzkxXaAay9_lwn-s2NUlxC-Y/exec';
const DEFAULT_TOKEN = 'neacea2026studio';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function clean(value) {
  return String(value || '').replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  }[char]));
}

function accessLink(email, operatorId = '', destination = 'portal') {
  const url = new URL(destination === 'dashboard' ? DASHBOARD_URL : PORTAL_URL);
  url.searchParams.set('email', email);
  if (operatorId) url.searchParams.set('op', operatorId);
  return url.toString();
}

function operatorRoles(operator) {
  return Array.from(new Set([
    ...(Array.isArray(operator?.system_roles) ? operator.system_roles : []),
    ...(Array.isArray(operator?.legacy_roles) ? operator.legacy_roles : []),
    ...(Array.isArray(operator?.roles) ? operator.roles : []),
    ...(operator?.role ? [operator.role] : []),
  ].filter(Boolean).map((role) => String(role).trim().toLowerCase())));
}

function isPersonalTrainer(operator) {
  return operatorRoles(operator).some((role) => ['pt', 'personal_trainer', 'personal trainer'].includes(role));
}

function publicOperator(operator) {
  return {
    id: String(operator?.operator_id || operator?.id || '').trim(),
    email: String(operator?.email || '').trim().toLowerCase(),
    nome: String(operator?.nome || '').trim(),
    cognome: String(operator?.cognome || '').trim(),
  };
}

async function findPersonalTrainer(email, operatorId = '') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedId = String(operatorId || '').trim();
  if (!normalizedEmail || !normalizedEmail.includes('@')) return null;

  const load = async (table) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('active', 'eq.true');
    url.searchParams.set('email', `ilike.${normalizedEmail}`);
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`PT_DIRECTORY_${response.status}`);
    return response.json();
  };

  let operators = [];
  try {
    operators = await load('operator_effective_roles');
  } catch (_) {
    operators = await load('operators');
  }
  const matches = (operators || []).filter((operator) => {
    if (!isPersonalTrainer(operator)) return false;
    const value = publicOperator(operator);
    return value.email === normalizedEmail && (!normalizedId || value.id === normalizedId);
  });
  return matches.length === 1 ? publicOperator(matches[0]) : null;
}

function accessSecret() {
  return process.env.PT_ACCESS_SECRET || process.env.RESEND_API_KEY || DEFAULT_TOKEN;
}

function accessCode(email, operatorId = '') {
  const digest = crypto
    .createHmac('sha256', accessSecret())
    .update(`${String(email || '').trim().toLowerCase()}|${String(operatorId || '').trim()}`)
    .digest('hex');
  const numeric = parseInt(digest.slice(0, 12), 16) % 1000000;
  return String(numeric).padStart(6, '0');
}

function signAccessToken(email, operatorId = '') {
  const payload = Buffer.from(JSON.stringify({
    email: String(email || '').trim().toLowerCase(),
    operatorId: String(operatorId || '').trim(),
    exp: Date.now() + (12 * 60 * 60 * 1000),
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyAccessToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', accessSecret()).update(payload).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.email || !data.operatorId || Number(data.exp || 0) <= Date.now()) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function buildEmail(payload, operator = null) {
  const email = String(payload.email || '').trim().toLowerCase();
  const operatorId = String(payload.operatorId || payload.operator_id || '').trim();
  const destination = String(payload.destination || '').toLowerCase() === 'dashboard' ? 'dashboard' : 'portal';
  const operatorName = [operator?.nome, operator?.cognome].filter(Boolean).join(' ');
  const name = operatorName || String(payload.name || '').trim() || 'Personal Trainer';
  const link = accessLink(email, operatorId, destination);
  const code = accessCode(email, operatorId);
  const subject = destination === 'dashboard'
    ? 'Accesso alla Dashboard Personal Trainer Neacea'
    : 'Accesso al Portale Personal Trainer Neacea';
  const accessLabel = destination === 'dashboard' ? 'Dashboard Personal Trainer' : 'Portale Personal Trainer';
  const html = `
    <div style="font-family:Arial,sans-serif;background:#eef6fb;padding:24px;color:#17314a">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8e7ef;border-radius:14px;overflow:hidden">
        <div style="background:#17314a;color:#fff;padding:20px 24px">
          <div style="font-size:24px;font-weight:800">Neacea</div>
          <div style="opacity:.8;font-weight:700">${accessLabel}</div>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 14px;font-size:17px;font-weight:700">Ciao ${clean(name)},</p>
          <p style="margin:0 0 18px;line-height:1.5">Il tuo accesso Neacea e' attivo. Inserisci questo codice una sola volta nella Dashboard; da li potrai aprire gli strumenti disponibili per il tuo profilo.</p>
          <p style="margin:0 0 10px;font-weight:800">Email accesso</p>
          <p style="margin:0 0 16px;background:#eef6fb;border:1px solid #d8e7ef;border-radius:10px;padding:12px 14px;font-size:18px;font-weight:800">${clean(email)}</p>
          <p style="margin:0 0 10px;font-weight:800">Codice / password</p>
          <p style="margin:0 0 22px;background:#17314a;color:#fff;border-radius:10px;padding:14px 16px;font-size:28px;letter-spacing:6px;font-weight:900;text-align:center">${clean(code)}</p>
          <p style="margin:0 0 24px">
            <a href="${clean(link)}" style="display:inline-block;background:#17314a;color:#fff;text-decoration:none;padding:13px 18px;border-radius:8px;font-weight:800">Apri ${accessLabel}</a>
          </p>
          <p style="margin:0;color:#668195;font-size:13px;line-height:1.45">Se il pulsante non si apre, copia questo link nel browser:<br><a href="${clean(link)}" style="color:#17314a">${clean(link)}</a></p>
        </div>
      </div>
    </div>`;
  const text = [
    `Ciao ${name},`,
    '',
    `Il tuo accesso alla ${accessLabel} Neacea e attivo.`,
    `Email accesso: ${email}`,
    `Codice / password: ${code}`,
    `Apri il portale da qui: ${link}`,
  ].join('\n');
  return { email, operatorId, name, subject, html, text, link, code };
}

async function sendWithResend(message) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return null;

  const from = process.env.MAIL_FROM || 'Neacea Studio <no-reply@neacea.com>';
  const replyTo = process.env.MAIL_REPLY_TO || 'neacea.desk@gmail.com';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [message.email],
      reply_to: replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  const text = await response.text();
  let result = {};
  try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }
  return {
    ok: response.ok,
    status: response.ok ? 200 : response.status,
    body: response.ok
      ? { success: true, provider: 'resend', to: message.email, result }
      : { success: false, provider: 'resend', error: result },
  };
}

async function sendWithGas(message) {
  const scriptUrl = process.env.GAS_WEBAPP_URL || DEFAULT_SCRIPT_URL;
  const token = process.env.GAS_SECRET_TOKEN || DEFAULT_TOKEN;
  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      _token: token,
      action: 'notifyModuloPT',
      type: 'accesso_portale_pt',
      to: message.email,
      subject: message.subject,
      htmlBody: message.html,
      textBody: message.text,
      payload: {
        nome: message.name,
        email: message.email,
        operator_id: message.operatorId,
        portal_url: message.link,
        access_code: message.code,
      },
    }),
  });
  const text = await response.text();
  let result = {};
  try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }
  return {
    ok: response.ok && result.success !== false,
    status: response.ok && result.success !== false ? 200 : 502,
    body: response.ok && result.success !== false
      ? { success: true, provider: 'google_apps_script', to: message.email, result }
      : { success: false, provider: 'google_apps_script', error: result },
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Metodo non consentito' }) };
  }

  try {
    const input = JSON.parse(event.body || '{}');
    const action = String(input.action || 'send').toLowerCase();
    if (action === 'resolve') {
      const operator = await findPersonalTrainer(input.email, input.operatorId || input.operator_id);
      return {
        statusCode: operator ? 200 : 404,
        headers,
        body: JSON.stringify(operator
          ? { success: true, operator }
          : { success: false, error: 'Email non trovata tra i Personal Trainer attivi.' }),
      };
    }
    if (action === 'verify_token') {
      const data = verifyAccessToken(input.token);
      return {
        statusCode: data ? 200 : 401,
        headers,
        body: JSON.stringify(data
          ? { success: true, email: data.email, operatorId: data.operatorId, expiresAt: data.exp }
          : { success: false, error: 'Sessione PT non valida o scaduta.' }),
      };
    }
    if (action === 'verify') {
      const email = String(input.email || '').trim().toLowerCase();
      const operatorId = String(input.operatorId || input.operator_id || '').trim();
      const code = String(input.code || '').replace(/\D/g, '');
      if (!email || !email.includes('@') || !code) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email e codice sono obbligatori.' }) };
      }
      const valid = crypto.timingSafeEqual(
        Buffer.from(accessCode(email, operatorId)),
        Buffer.from(code.padStart(6, '0').slice(-6))
      );
      return {
        statusCode: valid ? 200 : 401,
        headers,
        body: JSON.stringify(valid
          ? {
              success: true,
              email,
              operatorId,
              token: signAccessToken(email, operatorId),
              expiresAt: Date.now() + (12 * 60 * 60 * 1000),
            }
          : { success: false, error: 'Codice accesso non valido.' }),
      };
    }

    const operator = await findPersonalTrainer(input.email, input.operatorId || input.operator_id);
    if (!operator) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Email non trovata tra i Personal Trainer attivi.' }) };
    }
    const message = buildEmail({
      ...input,
      email: operator.email,
      operatorId: operator.id,
    }, operator);
    if (!message.email || !message.email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email PT non valida.' }) };
    }

    const resendResult = await sendWithResend(message);
    if (resendResult && resendResult.ok) {
      return { statusCode: resendResult.status, headers, body: JSON.stringify(resendResult.body) };
    }

    const gasResult = await sendWithGas(message);
    if (gasResult.ok) {
      return {
        statusCode: gasResult.status,
        headers,
        body: JSON.stringify({
          ...gasResult.body,
          primary_provider: resendResult ? resendResult.body : null,
        }),
      };
    }

    const result = resendResult || gasResult;
    return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: String(error.message || error) }),
    };
  }
};
