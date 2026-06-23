const DESK_EMAIL = 'neacea.desk@gmail.com';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function clean(value) {
  return String(value || '').replace(/[<>&]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
  }[char]));
}

function getName(payload) {
  return [payload?.nome, payload?.cognome].filter(Boolean).join(' ').trim() || 'Cliente';
}

function buildMessage(type, payload) {
  const name = getName(payload);
  const label = type === 'consenso_cliente' ? 'Consenso cliente' : 'Anamnesi cliente';
  const subject = `NEACEA - ${label} inviato: ${name}`;
  const rows = [
    ['Cliente', name],
    ['Email', payload?.email],
    ['Telefono', payload?.telefono],
    ['Obiettivo', payload?.obiettivo || payload?.data?.obiettivo],
    ['Data invio', new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })],
  ].filter(([, value]) => value);

  const htmlRows = rows.map(([key, value]) => (
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #d8e7ef;color:#668195;font-weight:700">${clean(key)}</td><td style="padding:8px 12px;border-bottom:1px solid #d8e7ef;color:#17314a;font-weight:700">${clean(value)}</td></tr>`
  )).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;background:#eef6fb;padding:24px;color:#17314a">
      <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8e7ef;border-radius:14px;overflow:hidden">
        <div style="background:#17314a;color:#fff;padding:18px 22px">
          <div style="font-size:22px;font-weight:800">NEACEA</div>
          <div style="opacity:.75;font-weight:700">${clean(label)} ricevuto</div>
        </div>
        <div style="padding:20px 22px">
          <p style="margin:0 0 14px;font-weight:700">E' stato inviato un nuovo modulo dal cliente.</p>
          <table style="width:100%;border-collapse:collapse">${htmlRows}</table>
          <p style="margin:18px 0 0;color:#668195;font-size:13px">Il dettaglio completo resta salvato nel gestionale NEACEA.</p>
        </div>
      </div>
    </div>`;

  const text = rows.map(([key, value]) => `${key}: ${value}`).join('\n');
  return { subject, html, text };
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
    const payload = input.payload || {};
    const type = input.type || 'anamnesi_cliente';
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.FORM_NOTIFY_FROM || 'NEACEA <onboarding@resend.dev>';
    const message = buildMessage(type, payload);

    if (!resendKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          skipped: true,
          to: DESK_EMAIL,
          error: 'RESEND_API_KEY non configurata su Netlify',
        }),
      };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: DESK_EMAIL,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    const resultText = await response.text();
    if (!response.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ success: false, to: DESK_EMAIL, error: resultText }),
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, to: DESK_EMAIL }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: String(error.message || error) }),
    };
  }
};
