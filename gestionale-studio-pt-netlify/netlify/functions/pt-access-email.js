const PORTAL_URL = 'https://neacea-portale-personal-trainer.netlify.app/';

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

function portalLink(email) {
  const url = new URL(PORTAL_URL);
  url.searchParams.set('email', email);
  return url.toString();
}

function buildEmail(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || '').trim() || 'Personal Trainer';
  const link = portalLink(email);
  const subject = 'Accesso al Portale Personal Trainer Neacea';
  const html = `
    <div style="font-family:Arial,sans-serif;background:#eef6fb;padding:24px;color:#17314a">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8e7ef;border-radius:14px;overflow:hidden">
        <div style="background:#17314a;color:#fff;padding:20px 24px">
          <div style="font-size:24px;font-weight:800">Neacea</div>
          <div style="opacity:.8;font-weight:700">Portale Personal Trainer</div>
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 14px;font-size:17px;font-weight:700">Ciao ${clean(name)},</p>
          <p style="margin:0 0 18px;line-height:1.5">Il tuo accesso al Portale Personal Trainer e' attivo. Da qui puoi vedere clienti assegnati, schede e appuntamenti collegati alla tua email.</p>
          <p style="margin:0 0 24px">
            <a href="${clean(link)}" style="display:inline-block;background:#17314a;color:#fff;text-decoration:none;padding:13px 18px;border-radius:8px;font-weight:800">Entra nel portale</a>
          </p>
          <p style="margin:0;color:#668195;font-size:13px;line-height:1.45">Se il pulsante non si apre, copia questo link nel browser:<br><a href="${clean(link)}" style="color:#17314a">${clean(link)}</a></p>
        </div>
      </div>
    </div>`;
  const text = [
    `Ciao ${name},`,
    '',
    'Il tuo accesso al Portale Personal Trainer Neacea e attivo.',
    `Apri il portale da qui: ${link}`,
  ].join('\n');
  return { email, subject, html, text };
}

async function sendWithResend(message) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      body: { success: false, error: 'RESEND_API_KEY non configurata su Netlify.' },
    };
  }

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Metodo non consentito' }) };
  }

  try {
    const input = JSON.parse(event.body || '{}');
    const message = buildEmail(input);
    if (!message.email || !message.email.includes('@')) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email PT non valida.' }) };
    }

    const result = await sendWithResend(message);
    return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: String(error.message || error) }),
    };
  }
};
