// Incolla questo blocco nello stesso Google Apps Script usato dalla nutrizione.
// Poi aggiungi il case indicato dentro lo switch di doPost.

// Dentro doPost(e), nello switch(action), aggiungi:
// case 'notifyModuloPT': return handleNotifyModuloPT(data);

const EMAIL_DESK_PT = 'neacea.desk@gmail.com';

function handleNotifyModuloPT(data) {
  const to = EMAIL_DESK_PT;
  const subject = data.subject || '[Neacea PT] Nuovo modulo cliente';
  const htmlBody = data.htmlBody || buildModuloPTEmail_(data);
  const textBody = data.textBody || '';

  MailApp.sendEmail(to, subject, textBody, {
    htmlBody: htmlBody,
    name: 'Neacea Studio PT'
  });

  return jsonResponse({
    success: true,
    to: to,
    action: 'notifyModuloPT'
  });
}

function buildModuloPTEmail_(data) {
  const payload = data.payload || {};
  const nome = escapeModuloPT_([payload.nome, payload.cognome].filter(Boolean).join(' ') || 'Cliente');
  const tipo = data.type === 'consenso_cliente' ? 'Consenso cliente PT' : 'Anamnesi cliente PT';

  function row(label, value) {
    if (!value) return '';
    return '<tr>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #d8e7ef;color:#668195;font-weight:700;text-transform:uppercase;font-size:11px;">' + escapeModuloPT_(label) + '</td>'
      + '<td style="padding:8px 12px;border-bottom:1px solid #d8e7ef;color:#17314a;font-weight:700;">' + escapeModuloPT_(value) + '</td>'
      + '</tr>';
  }

  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;background:#eef6fb;padding:24px;color:#17314a;">'
    + '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8e7ef;border-radius:14px;overflow:hidden;">'
    + '<div style="background:#17314a;color:#fff;padding:20px 24px;">'
    + '<div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.58);">NEACEA STUDIO PT</div>'
    + '<div style="font-size:24px;font-weight:800;margin-top:6px;">' + tipo + '</div>'
    + '<div style="font-size:13px;color:rgba(255,255,255,.62);margin-top:4px;">' + nome + '</div>'
    + '</div>'
    + '<div style="padding:22px 24px;">'
    + '<table style="width:100%;border-collapse:collapse;">'
    + row('Cliente', nome)
    + row('Email', payload.email)
    + row('Telefono', payload.telefono)
    + row('Obiettivo', payload.obiettivo || payload.obiettivo_libero)
    + row('Data invio', new Date().toLocaleString('it-IT'))
    + '</table>'
    + '<p style="margin:18px 0 0;color:#668195;font-size:13px;">Il dettaglio completo resta salvato nel gestionale NEACEA.</p>'
    + '</div></div></div>';
}

function escapeModuloPT_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
