// ══════════════════════════════════════════════════════════════════
//  GOOGLE APPS SCRIPT — Neacea Studio
//  Versione 5.5 — Portale cliente integrato nel GAS principale
//
//  MODIFICHE v5.5 rispetto a v5.4:
//  - Aggiunti SH_PORTALE / HDR_PORTALE
//  - Aggiunti case switch: attivaPortale, generaConsenso, inviaReminderPortale
//  - Aggiunte funzioni: handleAttivaPortale, handleGeneraConsenso, handleInviaReminderPortale
// ══════════════════════════════════════════════════════════════════

const EMAIL_PROFESSIONISTA = 'nutrizione@neacea.com';
const FOTO_FOLDER_NAME     = 'Neacea_Foto_Clienti';
const SECRET_TOKEN         = 'neacea2026studio';
const SHEET_ID             = '1B2jbiqCpzOo-WJub8UJY1bWmpGTA-rtfimPWHUZ3rOA';
const PORTALE_SHEET_ID     = '1q7GBrDEEFZZRsIzgv0yJhDdk4avj4iadEbliUuuO_AE';

const CHECK_PERCORSO_URL = 'https://check-percorso.netlify.app';
const PORTALE_URL        = 'https://portale-nutrizione.netlify.app/';
const CONSENSO_URL       = 'https://neacea-consenso.netlify.app/';
const PORTALE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby9mCz2G1PsRsT43FxCCCmXP2OWJCAemkxaB2KicwC4iquH17RQBj8ol4VlWldsV_o/exec';

const SH_ANAMNESI     = 'Anamnesi';
const SH_SCANSIONI    = 'Scansioni';
const SH_MISURE       = 'Misure';
const SH_VISITE       = 'Visite';
const SH_PAGAMENTI    = 'Pagamenti';
const SH_FOLLOWUP_LOG = 'FollowupInviati';
const SH_NOTE_NUTRI   = 'NoteNutrizionista';
const SH_PORTALE      = 'Token_Clienti';
const HDR_PORTALE     = ['email', 'token', 'data_creazione', 'attivo', 'password', 'ultimo_accesso', 'ultimo_checkin'];
const SH_CONSENSI     = 'Consensi';
const HDR_CONSENSI    = ['email', 'token_consenso', 'data_generazione', 'firmato', 'data_firma', 'consenso_foto', 'firma_url'];

const HDR_ANAMNESI = [
  'Timestamp', 'ID_Paziente', 'Fonte',
  'Nome', 'Cognome', 'Data di nascita', 'Sesso', 'Email', 'Telefono',
  'Codice Fiscale', 'Professione', 'Altezza (cm)', 'Peso attuale (kg)', 'Peso obiettivo (kg)',
  'Fa sport?', 'Tipo di sport', 'Ore sport/settimana', 'Tipo lavoro',
  'Ore di sonno', 'Qualita sonno', 'Risvegli notturni', 'Passi giornalieri',
  'Livello sedentarieta', 'Livello stress (1-10)',
  'Chi cucina', 'Pasti fuori casa/settimana', 'Orari pasti', 'Lavoro a turni?', 'Weekend diverso?',
  'Pasti al giorno', 'Acqua giornaliera', 'Colazione?', 'Regime alimentare',
  'Alimenti avversioni', 'Alimenti preferiti', 'Consumo alcol',
  'Celiachia', 'Allergie alimentari', 'Allergie (altro)', 'Intolleranze', 'Intolleranze (altro)',
  'Diete precedenti', 'Cosa ha funzionato', 'Cosa non ha funzionato',
  'Motivo abbandono', 'Aderenza passata',
  'Fame mattino', 'Fame sera', 'Attacchi di fame', 'Fame nervosa',
  'Perdita di controllo', 'Rapporto con i dolci', 'Situazioni trigger',
  'Gonfiore', 'Pesantezza post-prandiale', 'Reflusso', 'Alvo regolare?',
  'Frequenza evacuazioni', 'Consistenza feci (Bristol)',
  'Patologie diagnosticate', 'Patologie (altro)', 'Sintomi riferiti', 'Sintomi (altro)',
  'Condizioni sospette', 'Farmaci attuali', 'Integratori attuali',
  'Peso massimo (kg)', 'Peso minimo (kg)', 'Durata problema peso', 'Variazioni recenti',
  'Obiettivo principale', 'Obiettivi secondari', 'Motivazione (1-10)',
  'Problema principale percepito', 'Tempo disponibile', 'Disponibilita al cambiamento',
  'GI: sintomi', 'GI: diagnosi', 'GI: trigger alimentari', 'GI: dieta terapeutica',
  'Ormoni: diagnosi', 'Ormoni: terapia', 'Ormoni: note',
  'Metabolico: diagnosi', 'Metabolico: monitoraggio', 'Metabolico: farmaci',
  'Metabolico: HbA1c', 'Metabolico: note',
  'Cel/Nichel: tipo', 'Cel/Nichel: data diagnosi', 'Cel/Nichel: dieta', 'Cel/Nichel: note',
  'File analisi allegato', 'Privacy accettata', 'Note libere',
  'Note Nutrizionista',
];

const HDR_SCANSIONI = [
  'Timestamp', 'Email', 'Data scansione', 'Tipo',
  'Peso (kg)', 'Massa grassa (kg)', 'Massa muscolare (kg)', '% Grasso (PGC)',
  'BMI', 'Score', 'Eta metabolica', 'Tasso metabolico (kcal)',
  'FFM (kg)', 'BCM (kg)', 'ECM (kg)',
  'TBW (lt)', 'TBW (%)', 'ECW (lt)', 'ICW (lt)',
  'Idratazione FFM (%)', 'Rapporto E/I', 'Angolo fase (gradi)',
  'Indice salute', 'Fatty Liver',
  'Vita (cm)', 'Fianchi (cm)',
  'Note scansione',
];

const HDR_MISURE = [
  'Timestamp', 'Email', 'Data', 'Tipo', 'Valore', 'Unita', 'Note',
];

const HDR_VISITE = [
  'Timestamp', 'Email', 'Data visita', 'ID visita', 'Peso (kg)', 'Note', 'Foto URLs', 'Durata (settimane)', 'Tipo visita'
];

const HDR_PAGAMENTI = [
  'Timestamp', 'ID', 'Email', 'Data', 'Importo (EUR)', 'Servizio', 'Note',
];

const HDR_FOLLOWUP_LOG = ['Timestamp', 'Email', 'Nome', 'Tipo', 'Canale'];

const HDR_NOTE_NUTRI = ['Timestamp', 'ID', 'Email', 'Data', 'Testo', 'Modificata'];

const HDR_CHECK6 = [
  'timestamp','client_code','nome','cognome','email','data_check',
  'aderenza_percentuale','pasti_fuori_schema','modifica_porzioni',
  'regolarita_pasti','difficolta_rispettare_piano','giorni_fuori_piano','note_aderenza',
  'fame_generale','fame_serale','energia_quotidiana','performance_allenamento',
  'recupero','digestione','gonfiore','transito_intestinale','sonno',
  'ritenzione_idrica','note_risposta_corporea',
  'facilita_seguire_piano','compatibilita_vita_reale','stress_percepito',
  'impatto_mentale','voglia_di_mollare','note_sostenibilita',
  'aderenza_integratori','frequenza_assunzione_integratori',
  'effetti_collaterali_integratori','utilita_integratori',
  'gestione_pratica_integratori','dubbi_integratori',
  'integratore_piu_utile','integratore_meno_utile','note_integratori',
  'soddisfazione_generale','miglioramento_percepito',
  'risultato_non_ottenuto','proseguiresti_percorso',
  'nutrizionista_cosa_ha_funzionato','nutrizionista_cosa_non_ha_funzionato',
  'nutrizionista_criticita_principale','nutrizionista_modifiche_da_apportare',
  'nutrizionista_decisione_finale',
  'aderenza_score','risposta_score','sostenibilita_score',
  'integratori_score','success_score','classification',
  'trend_vs_previous','auto_summary','pdf_generated',
  'note_visita_nutrizionista',
];


// ══════════════════════════════════════════════════════════════════
//  ENTRY POINTS
// ══════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || '';
    if (data._token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: 'Non autorizzato' });
    }
    switch (action) {
      case 'addAnamnesNutrizionale': return handleNewAnamnesi(data);
      case 'addClienteManuale':      return handleClienteManuale(data);
      case 'getCliente':             return handleGetCliente(data);
      case 'getClienti':             return handleGetClienti();
      case 'addScansione':           return handleAddScansione(data);
      case 'addMisura':              return handleAddMisura(data);
      case 'getScansioni':           return handleGetScansioni(data);
      case 'getMisure':              return handleGetMisure(data);
      case 'uploadFoto':             return handleUploadFoto(data);
      case 'updateNote':             return handleUpdateNote(data);
      case 'addVisita':              return handleAddVisita(data);
      case 'salvaReportEsami':       return handleSalvaReportEsami(data);
      case 'eliminaVisita':          return handleEliminaVisita(data);
      case 'getVisite':              return handleGetVisite(data);
      case 'inviaFollowup':          return handleInviaFollowup(data);
      case 'addFollowupRisposta':    return handleAddFollowupRisposta(data);
      case 'getFollowupRisposte':    return handleGetFollowupRisposte();
      case 'getFollowupInviati':     return handleGetFollowupInviati();
      case 'eliminaCliente':         return handleEliminaCliente(data);
      case 'modificaCliente':        return handleModificaCliente(data);
      case 'addSifaPiano':           return handleAddSifaPiano(data);
      case 'getSifaPiani':           return handleGetSifaPiani(data);
      case 'addAnamnesCoaching':     return handleNewAnamnesCoaching(data);
      case 'addFollowupCoachingMeta':return handleFollowupCoachingMeta(data);
      case 'addFollowupCoachingFine':return handleFollowupCoachingFine(data);
      case 'inviaFollowupCoaching':  return handleInviaFollowupCoaching(data);
      case 'getCoachingRisposte':    return handleGetCoachingRisposte();
      case 'addCheck6':              return handleAddCheck6(data);
      case 'addPagamento':           return handleAddPagamento(data);
      case 'deletePagamento':        return handleDeletePagamento(data);
      case 'getPagamenti':           return handleGetPagamenti(data.email);
      case 'inviaCheckPercorso':     return handleInviaCheckPercorso(data);
      case 'saveNoteVisita':         return handleSaveNoteVisita(data);
      case 'getNoteVisita':          return handleGetNoteVisita(data);
      case 'addNotaNutri':           return handleAddNotaNutri(data);
      case 'deleteNotaNutri':        return handleDeleteNotaNutri(data);
      case 'getNoteNutri':           return handleGetNoteNutri(data);
      case 'attivaPortale':          return handleAttivaPortale(data);
      case 'generaConsenso':         return handleGeneraConsenso(data);
      case 'getConsenso':            return handleGetConsenso(data);
      case 'firmaConsenso':          return handleFirmaConsenso(data);
      case 'getConsensoCliente':     return handleGetConsensoCliente(data);
      case 'salvaConsenso':          return handleSalvaConsenso(data);
      case 'inviaReminderPortale':   return handleInviaReminderPortale(data);
      case 'sendPortaleAccessMail':  return handleSendPortaleAccessMail(data);
      case 'sendPortaleReminderMail':return handleSendPortaleReminderMail(data);
      case 'sendConsensoMail':       return handleSendConsensoMail(data);
      case 'notifyModuloPT':         return handleNotifyModuloPT(data);
      case 'saveMessaggio':          return handleSaveMessaggio(data);
      case 'getNotifiche':           return handleGetNotifiche(data);
      case 'segnaVisto':             return handleSegnaVisto(data);
      case 'authPassword':          return handleAuthPassword(data);
      case 'authToken':             return handleAuthToken(data);
      case 'getInfoCliente':        return handleGetInfoClientePortale(data);
      case 'getCheckins':           return handleGetCheckinsPortale(data);
      case 'saveCheckin':           return handleSaveCheckinPortale(data);
      case 'getMessaggi':           return handleGetMessaggiPortale(data);
      case 'getFotoCliente':        return handleGetFotoClientePortale(data);
      case 'diagnosticaPortaleCliente': return handleDiagnosticaPortaleCliente(data);
      case 'getCheckinAdmin':        return handleGetCheckinAdmin(data);
      case 'aggiornaGestioneScadenze': return handleAggiornaGestioneScadenze();
      case 'inviaGestioneScadenze':    return handleInviaGestioneScadenze(data);
      case 'getGestioneScadenze':       return handleGetGestioneScadenze();
      case 'inviaAzioneGestione':       return handleInviaAzioneGestione(data);
      default: return jsonResponse({ success: false, error: 'Azione non riconosciuta: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet(e) {
  try {
    const token = e.parameter._token || '';
    if (token !== SECRET_TOKEN) {
      return ContentService.createTextOutput('Unauthorized')
        .setMimeType(ContentService.MimeType.TEXT);
    }
    const action = e.parameter.action || '';
    if (action === 'getClienti')  return handleGetClienti();
    if (action === 'getCliente' && e.parameter.email) return handleGetCliente({ email: e.parameter.email });
    if (action === 'getPagamenti' && e.parameter.email) return handleGetPagamenti(e.parameter.email);
    if (action === 'getCheck6'   && e.parameter.email) return handleGetCheck6(e.parameter.email);
    if (action === 'getNoteVisita' && e.parameter.email) return handleGetNoteVisita({ email: e.parameter.email });
    if (action === 'getNoteNutri' && e.parameter.email) return handleGetNoteNutri({ email: e.parameter.email });
    if (action === 'getFollowupRisposte') return handleGetFollowupRisposte();
    if (action === 'getFollowupInviati') return handleGetFollowupInviati();
  } catch(err) {}
  return ContentService.createTextOutput('Neacea Apps Script v5.5')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ══════════════════════════════════════════════════════════════════
//  PORTALE CLIENTE
// ══════════════════════════════════════════════════════════════════
function handleAttivaPortale(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });

  const email = data.email.toLowerCase().trim();
  const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);

  let nome = data.nome || email;
  if (rowIdx > 0) {
    const vals = shA.getRange(rowIdx, 1, 1, 5).getValues()[0];
    nome = ((vals[3] || '') + ' ' + (vals[4] || '')).trim() || nome;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);

  let password = '';
  let token = '';
  let existing = false;

  try {
    const sheet = getOrCreatePortaleSheet();
    const last = sheet.getLastRow();
    let rowPortale = -1;

    if (last >= 2) {
      const emails = sheet.getRange(2, 1, last - 1, 1).getValues(); // A = email
      for (let i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).toLowerCase().trim() === email) {
          rowPortale = i + 2;
          break;
        }
      }
    }

    if (rowPortale > 0) {
      existing = true;
      token = String(sheet.getRange(rowPortale, 2).getValue() || '').trim(); // B = token
      const oldPassword = sheet.getRange(rowPortale, 5).getValue(); // E = password

      if (!token) {
        token = Utilities.getUuid().replace(/-/g, '');
        sheet.getRange(rowPortale, 2).setValue(token);
        sheet.getRange(rowPortale, 3).setValue(new Date());
      }

      if (oldPassword) {
        password = oldPassword;
      } else {
        password = 'NEACEA-' + Math.floor(1000 + Math.random() * 9000);
        sheet.getRange(rowPortale, 5).setValue(password);
      }

      sheet.getRange(rowPortale, 4).setValue(true); // D = attivo
    } else {
      password = 'NEACEA-' + Math.floor(1000 + Math.random() * 9000);
      token = Utilities.getUuid().replace(/-/g, '');
      sheet.appendRow([email, token, new Date(), true, password, '', '']);
    }
  } finally {
    lock.releaseLock();
  }

  const nomeBreve = escapeHtml(nome.split(' ')[0]);

  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Ciao ' + nomeBreve + ' — il tuo portale è pronto!</div>'
    +   '<div style="font-size:13px;color:rgba(255,255,255,.6);">Puoi accedere in qualsiasi momento per vedere i tuoi progressi.</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;margin:0 0 20px;">Ecco la tua password di accesso:</p>'
    +   '<div style="background:#f0f7f2;border-radius:10px;padding:20px 24px;margin-bottom:24px;">'
    +     '<div style="font-size:12px;font-weight:700;color:#5a7a68;text-transform:uppercase;margin-bottom:4px;">Password</div>'
    +     '<div style="font-size:22px;font-weight:800;color:#1a3a2a;letter-spacing:.1em;">' + escapeHtml(password) + '</div>'
    +   '</div>'
    +   '<div style="text-align:center;margin:24px 0;">'
    +     '<a href="' + PORTALE_URL + '" style="display:inline-block;background:#1a3a2a;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Accedi al portale →</a>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';

  MailApp.sendEmail(email, 'Accesso al tuo portale Neacea Studio', '', {
    htmlBody: html,
    name: 'Neacea Studio'
  });

  return jsonResponse({ success: true, existing: existing, token: token, password: password });
}

function handleGeneraConsenso(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });

  const email = data.email.toLowerCase().trim();
  const nome = data.nome || email;
  const token = Utilities.getUuid().replace(/-/g, '').substring(0, 16).toUpperCase();
  const linkConsenso = CONSENSO_URL + '?consenso=' + encodeURIComponent(token);

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);

  let existing = false;

  try {
    const sheet = getOrCreatePortaleNamedSheet(SH_CONSENSI, HDR_CONSENSI);
    const last = sheet.getLastRow();
    let rowConsenso = -1;

    if (last >= 2) {
      const emails = sheet.getRange(2, 1, last - 1, 1).getValues(); // A = email
      for (let i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).toLowerCase().trim() === email) {
          rowConsenso = i + 2;
          break;
        }
      }
    }

    if (rowConsenso > 0) {
      existing = true;
      sheet.getRange(rowConsenso, 2).setValue(token);      // B = token_consenso
      sheet.getRange(rowConsenso, 3).setValue(new Date()); // C = data_generazione
      sheet.getRange(rowConsenso, 4).setValue(false);      // D = firmato
      sheet.getRange(rowConsenso, 5).setValue('');         // E = data_firma
    } else {
      sheet.appendRow([email, token, new Date(), false, '', '', '']);
    }
  } finally {
    lock.releaseLock();
  }

  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#8a6210;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Consenso informato — ' + nomeBreve + '</div>'
    +   '<div style="font-size:13px;color:rgba(255,255,255,.7);">Firma digitale richiesta prima dell\'inizio del percorso.</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 20px;">Ti chiedo di leggere e firmare digitalmente il consenso informato per il trattamento nutrizionale.</p>'
    +   '<div style="text-align:center;margin:28px 0;">'
    +     '<a href="' + linkConsenso + '" style="display:inline-block;background:#8a6210;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Leggi e firma il consenso →</a>'
    +   '</div>'
    +   '<p style="font-size:12px;color:#aaa;text-align:center;">Link: ' + linkConsenso + '</p>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';

  MailApp.sendEmail(email, 'Consenso informato — Neacea Studio', '', {
    htmlBody: html,
    name: 'Neacea Studio'
  });

  return jsonResponse({ success: true, existing: existing, link: linkConsenso });
}

function handleGetConsenso(data) {
  const email = (data.email || '').toLowerCase().trim();
  const token = String(data.token || '').trim();
  if (!email || !token) return jsonResponse({ success: false, error: 'Link consenso non valido' });

  const sheet = getOrCreatePortaleNamedSheet(SH_CONSENSI, HDR_CONSENSI);
  const last = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: false, error: 'Consenso non trovato' });

  const rows = sheet.getRange(2, 1, last - 1, HDR_CONSENSI.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[0]).toLowerCase().trim() === email && String(r[1]).trim() === token) {
      return jsonResponse({
        success: true,
        email: email,
        firmato: r[3] === true || String(r[3]).toLowerCase() === 'true',
        data_firma: r[4] instanceof Date ? r[4].toISOString() : String(r[4] || ''),
        consenso_foto: r[5] || '',
        firma_url: r[6] || '',
      });
    }
  }
  return jsonResponse({ success: false, error: 'Consenso non trovato o token non valido' });
}

function handleFirmaConsenso(data) {
  const email = (data.email || '').toLowerCase().trim();
  const token = String(data.token || '').trim();
  const nomeFirma = String(data.nome_firma || '').trim();
  const consensoFoto = data.consenso_foto ? 'Autorizzato' : 'Non autorizzato';
  if (!email || !token) return jsonResponse({ success: false, error: 'Link consenso non valido' });
  if (!nomeFirma) return jsonResponse({ success: false, error: 'Nome e cognome obbligatori' });

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getOrCreatePortaleNamedSheet(SH_CONSENSI, HDR_CONSENSI);
    const last = sheet.getLastRow();
    if (last < 2) return jsonResponse({ success: false, error: 'Consenso non trovato' });

    const rows = sheet.getRange(2, 1, last - 1, 2).getValues();
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]).toLowerCase().trim() === email && String(rows[i][1]).trim() === token) {
        const row = i + 2;
        const now = new Date();
        sheet.getRange(row, 4).setValue(true);          // firmato
        sheet.getRange(row, 5).setValue(now);           // data_firma
        sheet.getRange(row, 6).setValue(consensoFoto);  // consenso_foto
        sheet.getRange(row, 7).setValue('Firma testuale: ' + nomeFirma);
        return jsonResponse({ success: true, data_firma: now.toISOString() });
      }
    }
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ success: false, error: 'Consenso non trovato o token non valido' });
}

function findConsensoByToken_(token) {
  token = String(token || '').trim();
  if (!token) return null;
  const sheet = getOrCreatePortaleNamedSheet(SH_CONSENSI, HDR_CONSENSI);
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, HDR_CONSENSI.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === token) {
      return { sheet: sheet, row: i + 2, values: rows[i] };
    }
  }
  return null;
}

function handleGetConsensoCliente(data) {
  const token = String(data.token || '').trim();
  const found = findConsensoByToken_(token);
  if (!found) return jsonResponse({ success: false, error: 'Consenso non trovato' });
  const email = String(found.values[0] || '').toLowerCase().trim();

  let cliente = null;
  try {
    const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
    const rowIdx = findRowByEmail(shA, email);
    if (rowIdx > 0) {
      const vals = shA.getRange(rowIdx, 1, 1, HDR_ANAMNESI.length).getValues()[0];
      cliente = {
        nome: ((vals[3] || '') + ' ' + (vals[4] || '')).trim(),
        data_nascita: vals[5] ? formatDate(vals[5]) : '',
        email: email,
        sesso: vals[6] || '',
      };
    }
  } catch(e) {}

  return jsonResponse({
    success: true,
    nome: cliente ? cliente.nome : email,
    data_nascita: cliente ? cliente.data_nascita : '',
    email: email,
    sesso: cliente ? cliente.sesso : '',
    firmato: found.values[3] === true || String(found.values[3]).toLowerCase() === 'true',
    data_firma: found.values[4] instanceof Date ? found.values[4].toISOString() : String(found.values[4] || ''),
    consenso_foto: found.values[5] || '',
    firma_url: found.values[6] || '',
  });
}

function handleSalvaConsenso(data) {
  const token = String(data.token || '').trim();
  const found = findConsensoByToken_(token);
  if (!found) return jsonResponse({ success: false, error: 'Consenso non trovato' });
  if (!data.firma) return jsonResponse({ success: false, error: 'Firma mancante' });

  const email = String(found.values[0] || '').toLowerCase().trim();
  const consensoFoto = data.consensoFoto === 'si' ? 'Autorizzato' : 'Non autorizzato';
  const now = data.timestamp ? new Date(data.timestamp) : new Date();

  let firmaUrl = '';
  try {
    const rootFolder = getOrCreateFolder(FOTO_FOLDER_NAME);
    const clientFolder = getOrCreateSubfolder(rootFolder, email || 'consensi');
    const consensiFolder = getOrCreateSubfolder(clientFolder, 'consensi');
    const blob = Utilities.newBlob(Utilities.base64Decode(data.firma), 'image/png', 'firma_consenso_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') + '.png');
    const file = consensiFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    firmaUrl = file.getUrl();
  } catch(e) {
    firmaUrl = 'Firma ricevuta - errore salvataggio file: ' + e.message;
  }

  const sheet = found.sheet;
  sheet.getRange(found.row, 4).setValue(true);         // firmato
  sheet.getRange(found.row, 5).setValue(now);          // data_firma
  sheet.getRange(found.row, 6).setValue(consensoFoto); // consenso_foto
  sheet.getRange(found.row, 7).setValue(firmaUrl);     // firma_url

  return jsonResponse({ success: true, firma_url: firmaUrl, data_firma: now.toISOString() });
}

function handleInviaReminderPortale(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const email = data.email.toLowerCase().trim();
  const shA    = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);
  let nome = email;
  if (rowIdx > 0) {
    const vals = shA.getRange(rowIdx, 1, 1, 5).getValues()[0];
    nome = ((vals[3]||'') + ' ' + (vals[4]||'')).trim() || nome;
  }
  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Ciao ' + nomeBreve + ' — ti aspettiamo sul portale!</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 20px;">Ricordati di inserire il tuo check-in settimanale sul portale: peso, note e come ti senti.</p>'
    +   '<div style="text-align:center;margin:28px 0;">'
    +     '<a href="' + PORTALE_URL + '" style="display:inline-block;background:#1a3a2a;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Vai al portale →</a>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';
  MailApp.sendEmail(email, 'Check-in settimanale — Neacea Studio', '', { htmlBody: html, name: 'Neacea Studio' });
  logFollowupInviato(email, nome, 'reminder_portale', 'portale');
  return jsonResponse({ success: true });
}

function handleSendPortaleAccessMail(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.password) return jsonResponse({ success: false, error: 'Password mancante' });

  const email = String(data.email || '').toLowerCase().trim();
  const nome = String(data.nome || email).trim() || email;
  const password = String(data.password || '').trim();
  const url = String(data.url || PORTALE_URL || 'https://portale-nutrizione.netlify.app/').trim();
  const nomeBreve = escapeHtml(nome.split(' ')[0]);

  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Ciao ' + nomeBreve + ' — il tuo portale è pronto!</div>'
    +   '<div style="font-size:13px;color:rgba(255,255,255,.6);">Puoi accedere in qualsiasi momento per vedere i tuoi progressi.</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;margin:0 0 20px;">Ecco la tua password di accesso:</p>'
    +   '<div style="background:#f0f7f2;border-radius:10px;padding:20px 24px;margin-bottom:24px;">'
    +     '<div style="font-size:12px;font-weight:700;color:#5a7a68;text-transform:uppercase;margin-bottom:4px;">Password</div>'
    +     '<div style="font-size:22px;font-weight:800;color:#1a3a2a;letter-spacing:.1em;">' + escapeHtml(password) + '</div>'
    +   '</div>'
    +   '<div style="text-align:center;margin:24px 0;">'
    +     '<a href="' + escapeHtml(url) + '" style="display:inline-block;background:#1a3a2a;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Accedi al portale →</a>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';

  MailApp.sendEmail(email, 'Accesso al tuo portale Neacea Studio', '', {
    htmlBody: html,
    name: 'Neacea Studio'
  });

  return jsonResponse({ success: true, email_sent: true });
}

function handleSendPortaleReminderMail(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });

  const email = String(data.email || '').toLowerCase().trim();
  const nome = String(data.nome || email).trim() || email;
  const url = String(data.url || PORTALE_URL || 'https://portale-nutrizione.netlify.app/').trim();
  const nomeBreve = escapeHtml(nome.split(' ')[0]);

  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Ciao ' + nomeBreve + ' — ti aspettiamo sul portale!</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 20px;">Ricordati di inserire il tuo check-in settimanale sul portale: peso, note e come ti senti.</p>'
    +   '<div style="text-align:center;margin:28px 0;">'
    +     '<a href="' + escapeHtml(url) + '" style="display:inline-block;background:#1a3a2a;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Vai al portale →</a>'
    +   '</div>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';

  MailApp.sendEmail(email, 'Check-in settimanale — Neacea Studio', '', {
    htmlBody: html,
    name: 'Neacea Studio'
  });

  return jsonResponse({ success: true, email_sent: true });
}

// ══════════════════════════════════════════════════════════════════
//  PORTALE — MESSAGGI COACH, NOTIFICHE, CHECKIN ADMIN
// ══════════════════════════════════════════════════════════════════
const SH_MESSAGGI_COACH  = 'Messaggi_Percorso';
const HDR_MESSAGGI_COACH = ['email', 'data', 'messaggio', 'autore', 'letto'];

const SH_CHECKIN_PORTALE  = 'Checkin_Settimanali';
const HDR_CHECKIN_PORTALE = ['email', 'data', 'peso', 'energia', 'sonno_ore', 'piano_pct', 'stress', 'nota', 'timestamp', 'visto'];

function handleSaveMessaggio(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.messaggio || !String(data.messaggio).trim()) {
    return jsonResponse({ success: false, error: 'Messaggio mancante' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getOrCreatePortaleNamedSheet(SH_MESSAGGI_COACH, HDR_MESSAGGI_COACH);
    sheet.appendRow([
      data.email.toLowerCase().trim(),
      new Date(),
      String(data.messaggio).trim(),
      'coach',
      false,
    ]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleGetNotifiche(data) {
  const emails = (data.emails || []).map(e => String(e).toLowerCase().trim()).filter(Boolean);
  if (!emails.length) return jsonResponse({ success: true, notifiche: {} });

  const sheet = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  ensureColumn(sheet, 'visto');
  const last = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, notifiche: {} });

  const rows = sheet.getRange(2, 1, last - 1, Math.max(HDR_CHECKIN_PORTALE.length, sheet.getLastColumn())).getValues();
  const notifiche = {};
  rows.forEach(r => {
    const email = String(r[0]).toLowerCase().trim(); // A = email
    const visto = r[9]; // J = visto
    if (emails.includes(email) && visto !== true && String(visto).toLowerCase() !== 'true') {
      notifiche[email] = (notifiche[email] || 0) + 1;
    }
  });

  return jsonResponse({ success: true, notifiche });
}

function handleSegnaVisto(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const email = data.email.toLowerCase().trim();
  const sheet = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  const vistoCol = ensureColumn(sheet, 'visto');
  const last = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true });

  const rows = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase().trim() === email) {
      sheet.getRange(i + 2, vistoCol).setValue(true);
    }
  }
  return jsonResponse({ success: true });
}

function handleGetCheckinAdmin(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const email = data.email.toLowerCase().trim();

  let password = '—';
  let attivo = false;
  const shP = getOrCreatePortaleSheet();
  const lastP = shP.getLastRow();

  if (lastP >= 2) {
    const rowsP = shP.getRange(2, 1, lastP - 1, 5).getValues();
    for (let i = 0; i < rowsP.length; i++) {
      if (String(rowsP[i][0]).toLowerCase().trim() === email) {
        attivo = !!rowsP[i][3];       // D = attivo
        password = rowsP[i][4] || '—'; // E = password
        break;
      }
    }
  }

  const shC = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  const lastC = shC.getLastRow();
  const checkins = [];

  if (lastC >= 2) {
    const rowsC = shC.getRange(2, 1, lastC - 1, HDR_CHECKIN_PORTALE.length).getValues();
    rowsC
      .filter(r => String(r[0]).toLowerCase().trim() === email)
      .forEach(r => {
        checkins.push({
          data: r[1] instanceof Date ? normDate(r[1]) : String(r[1] || ''),
          peso: r[2] || null,
          energia: r[3] || null,
          sonno_ore: r[4] || null,
          piano_pct: r[5] || '',
          stress: r[6] || '',
          nota: r[7] || '',
        });
      });
    checkins.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }

  return jsonResponse({ success: true, password, attivo, checkins, fotoPerData: {} });
}


// ══════════════════════════════════════════════════════════════════
//  PORTALE CLIENTE — AUTH E DATI CLIENTE
// ══════════════════════════════════════════════════════════════════
function findPortaleRowByToken_(token) {
  token = String(token || '').trim();
  if (!token) return null;
  const sheet = getOrCreatePortaleSheet();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, Math.max(7, sheet.getLastColumn())).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][1] || '').trim() === token) {
      return { sheet, row: i + 2, values: rows[i] };
    }
  }
  return null;
}

function findPortaleRowByEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  const sheet = getOrCreatePortaleSheet();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, Math.max(7, sheet.getLastColumn())).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim().toLowerCase() === email) {
      return { sheet, row: i + 2, values: rows[i] };
    }
  }
  return null;
}

function findPortaleRowByPassword_(password, email) {
  password = String(password || '').trim().toUpperCase();
  if (!password) return null;
  email = String(email || '').trim().toLowerCase();
  const sheet = getOrCreatePortaleSheet();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const rows = sheet.getRange(2, 1, last - 1, Math.max(7, sheet.getLastColumn())).getValues();
  for (let i = 0; i < rows.length; i++) {
    const active = rows[i][3] === true || String(rows[i][3]).toUpperCase() === 'TRUE';
    const savedEmail = String(rows[i][0] || '').trim().toLowerCase();
    const savedPassword = String(rows[i][4] || '').trim().toUpperCase();
    if (active && savedPassword === password && (!email || savedEmail === email)) {
      return { sheet, row: i + 2, values: rows[i] };
    }
  }
  return null;
}

function getEmailFromPortaleToken_(token) {
  const found = findPortaleRowByToken_(token);
  if (!found) return '';
  const active = found.values[3] === true || String(found.values[3]).toUpperCase() === 'TRUE';
  if (!active) return '';
  return String(found.values[0] || '').toLowerCase().trim();
}

function handleAuthPassword(data) {
  const email = String(data.email || '').trim().toLowerCase();
  const found = findPortaleRowByPassword_(data.password, email);
  if (!found) return jsonResponse({ success: false, error: email ? 'Email o password non validi' : 'Password non valida' });

  const token = String(found.values[1] || '').trim();
  if (!token) return jsonResponse({ success: false, error: 'Accesso non configurato: token mancante' });
  found.sheet.getRange(found.row, 6).setValue(new Date()); // ultimo_accesso
  return jsonResponse({
    success: true,
    token: token,
    email: String(found.values[0] || '').toLowerCase().trim(),
  });
}

function handleAuthToken(data) {
  const found = findPortaleRowByToken_(data.token);
  if (!found) return jsonResponse({ success: false, error: 'Token non valido' });
  const active = found.values[3] === true || String(found.values[3]).toUpperCase() === 'TRUE';
  if (!active) return jsonResponse({ success: false, error: 'Portale non attivo' });

  found.sheet.getRange(found.row, 6).setValue(new Date()); // ultimo_accesso
  return jsonResponse({
    success: true,
    token: String(found.values[1] || '').trim(),
    email: String(found.values[0] || '').toLowerCase().trim(),
  });
}

function handleGetInfoClientePortale(data) {
  const email = getEmailFromPortaleToken_(data.token);
  if (!email) return jsonResponse({ success: false, error: 'Accesso non valido' });

  let nome = email;
  let obiettivo = '';
  let pesoIniziale = '';
  let hasAnamnesi = false;
  const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);
  if (rowIdx > 0) {
    hasAnamnesi = true;
    const vals = shA.getRange(rowIdx, 1, 1, HDR_ANAMNESI.length).getValues()[0];
    nome = ((vals[3] || '') + ' ' + (vals[4] || '')).trim() || email;
    pesoIniziale = vals[12] || '';
    obiettivo = vals[70] || '';
  }

  const shV = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastV = shV.getLastRow();
  let dataVisita = null;
  let durataTotale = 6;
  if (lastV >= 2) {
    const rows = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    const visite = rows
      .filter(r => String(r[1]).toLowerCase().trim() === email)
      .sort((a, b) => new Date(b[2]) - new Date(a[2]));
    if (visite.length) {
      dataVisita = visite[0][2];
      durataTotale = visite[0][7] ? parseInt(visite[0][7], 10) || 6 : 6;
      if (visite[0][4]) pesoIniziale = visite[0][4];
    }
  }

  let scadenza = '';
  let settimanaAttuale = '';
  let giorniRimanenti = '';
  if (dataVisita) {
    const start = new Date(dataVisita);
    const end = new Date(start);
    end.setDate(end.getDate() + durataTotale * 7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    giorniRimanenti = Math.round((end.getTime() - today.getTime()) / 86400000);
    settimanaAttuale = Math.max(1, Math.min(durataTotale, Math.ceil(((today.getTime() - start.getTime()) / 86400000 + 1) / 7)));
    scadenza = normDate(end);
  }

  return jsonResponse({
    success: true,
    email,
    nome,
    hasAnamnesi,
    hasVisite: !!dataVisita,
    hasDatiPercorso: hasAnamnesi || !!dataVisita,
    obiettivo,
    pesoIniziale,
    durataTotale,
    settimanaAttuale,
    giorniRimanenti,
    scadenza,
  });
}

function handleGetCheckinsPortale(data) {
  const email = getEmailFromPortaleToken_(data.token);
  if (!email) return jsonResponse({ success: false, error: 'Accesso non valido' });

  const sheet = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  const last = sheet.getLastRow();
  const checkins = [];

  if (last >= 2) {
    const rows = sheet.getRange(2, 1, last - 1, HDR_CHECKIN_PORTALE.length).getValues();
    rows
      .filter(r => String(r[0]).toLowerCase().trim() === email)
      .forEach(r => checkins.push({
        data: r[1] instanceof Date ? normDate(r[1]) : String(r[1] || ''),
        peso: r[2] || null,
        energia: r[3] || null,
        sonno_ore: r[4] || null,
        piano_pct: r[5] || '',
        stress: r[6] || '',
        nota: r[7] || '',
        timestamp: r[8] instanceof Date ? r[8].toISOString() : String(r[8] || ''),
      }));
  }
  checkins.sort((a, b) => String(a.data).localeCompare(String(b.data)));

  const shV = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastV = shV.getLastRow();
  const pesiVisite = [];
  if (lastV >= 2) {
    const rowsV = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    rowsV
      .filter(r => String(r[1]).toLowerCase().trim() === email && r[4])
      .forEach(r => pesiVisite.push({
        data: r[2] instanceof Date ? normDate(r[2]) : String(r[2] || ''),
        peso: r[4],
      }));
  }
  pesiVisite.sort((a, b) => String(a.data).localeCompare(String(b.data)));

  return jsonResponse({ success: true, checkins, pesiVisite });
}

function handleSaveCheckinPortale(data) {
  const email = getEmailFromPortaleToken_(data.token);
  if (!email) return jsonResponse({ success: false, error: 'Accesso non valido' });

  const sheet = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  sheet.appendRow([
    email,
    data.data ? new Date(data.data) : new Date(),
    v(data.peso),
    v(data.energia),
    v(data.sonno),
    v(data.piano_pct),
    v(data.stress),
    data.nota || '',
    new Date(),
    false,
  ]);

  const found = findPortaleRowByToken_(data.token);
  if (found) found.sheet.getRange(found.row, 7).setValue(new Date()); // ultimo_checkin

  return jsonResponse({ success: true });
}

function handleGetMessaggiPortale(data) {
  const email = getEmailFromPortaleToken_(data.token);
  if (!email) return jsonResponse({ success: false, error: 'Accesso non valido' });

  const sheet = getOrCreatePortaleNamedSheet(SH_MESSAGGI_COACH, HDR_MESSAGGI_COACH);
  const last = sheet.getLastRow();
  const messaggi = [];

  if (last >= 2) {
    const rows = sheet.getRange(2, 1, last - 1, Math.max(5, sheet.getLastColumn())).getValues();
    rows
      .filter(r => String(r[0]).toLowerCase().trim() === email)
      .forEach(r => messaggi.push({
        data: r[1] instanceof Date ? r[1].toISOString() : String(r[1] || ''),
        messaggio: r[2] || '',
        autore: r[3] || 'coach',
        visto: r[4] === true || String(r[4]).toUpperCase() === 'TRUE',
      }));
  }

  messaggi.sort((a, b) => new Date(b.data) - new Date(a.data));
  return jsonResponse({ success: true, messaggi });
}

function handleGetFotoClientePortale(data) {
  const email = getEmailFromPortaleToken_(data.token);
  if (!email) return jsonResponse({ success: false, error: 'Accesso non valido' });

  const res = JSON.parse(handleGetVisite({ email }).getContent());
  const visite = res.visite || [];
  const foto = [];
  visite.forEach(vv => {
    (vv.fotos || []).forEach((url, idx) => {
      foto.push({
        id: url,
        url: url,
        dataVisita: vv.date || '',
        numero: idx + 1,
        fonte: 'visita',
      });
    });
  });
  return jsonResponse({ success: true, visite, foto });
}

function handleDiagnosticaPortaleCliente(data) {
  const email = String(data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });

  const porta = findPortaleRowByEmail_(email);
  const portaleAttivo = !!porta && (porta.values[3] === true || String(porta.values[3]).toUpperCase() === 'TRUE');
  const token = porta ? String(porta.values[1] || '').trim() : '';
  const password = porta ? String(porta.values[4] || '').trim() : '';

  const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const anamnesiRow = findRowByEmail(shA, email);

  const shV = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastV = shV.getLastRow();
  let visiteCount = 0;
  if (lastV >= 2) {
    const rows = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    visiteCount = rows.filter(r => String(r[1]).toLowerCase().trim() === email).length;
  }

  const shC = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE);
  const lastC = shC.getLastRow();
  let checkinCount = 0;
  if (lastC >= 2) {
    const rowsC = shC.getRange(2, 1, lastC - 1, HDR_CHECKIN_PORTALE.length).getValues();
    checkinCount = rowsC.filter(r => String(r[0]).toLowerCase().trim() === email).length;
  }

  let fotoCount = 0;
  try {
    const visiteRes = JSON.parse(handleGetVisite({ email: email }).getContent());
    (visiteRes.visite || []).forEach(vv => { fotoCount += (vv.fotos || []).length; });
  } catch(e) {}

  const problemi = [];
  if (!porta) problemi.push('Cliente assente in Token_Clienti');
  if (porta && !portaleAttivo) problemi.push('Portale non attivo');
  if (porta && !token) problemi.push('Token mancante');
  if (porta && !password) problemi.push('Password mancante');
  if (anamnesiRow < 0) problemi.push('Email non trovata in Anamnesi');
  if (visiteCount === 0) problemi.push('Nessuna visita salvata');
  if (checkinCount === 0) problemi.push('Nessun check-in portale');
  if (fotoCount === 0) problemi.push('Nessuna foto visibile');

  return jsonResponse({
    success: true,
    email,
    portale: {
      presente: !!porta,
      attivo: portaleAttivo,
      tokenPresente: !!token,
      passwordPresente: !!password,
      ultimoAccesso: porta && porta.values[5] instanceof Date ? porta.values[5].toISOString() : String(porta ? porta.values[5] || '' : ''),
      ultimoCheckin: porta && porta.values[6] instanceof Date ? porta.values[6].toISOString() : String(porta ? porta.values[6] || '' : ''),
    },
    dati: {
      anamnesiPresente: anamnesiRow > 0,
      visite: visiteCount,
      checkin: checkinCount,
      foto: fotoCount,
    },
    problemi,
  });
}


// ══════════════════════════════════════════════════════════════════
//  NOTE NUTRIZIONISTA
// ══════════════════════════════════════════════════════════════════
function handleAddNotaNutri(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.testo || !String(data.testo).trim()) return jsonResponse({ success: false, error: 'Testo mancante' });
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getOrCreateSheet(SH_NOTE_NUTRI, HDR_NOTE_NUTRI);
    const id    = data.id || 'N-' + Utilities.getUuid().replace(/-/g,'').substring(0, 10).toUpperCase();
    sheet.appendRow([new Date(), id, data.email.toLowerCase().trim(), data.data ? new Date(data.data) : new Date(), data.testo.trim(), '']);
    return jsonResponse({ success: true, id: id });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteNotaNutri(data) {
  if (!data.email || !data.id) return jsonResponse({ success: false, error: 'Parametri mancanti' });
  const sheet = getOrCreateSheet(SH_NOTE_NUTRI, HDR_NOTE_NUTRI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: false, error: 'Nessuna nota' });
  const rows = sheet.getRange(2, 1, last - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === String(data.id) &&
        String(rows[i][2]).toLowerCase().trim() === data.email.toLowerCase().trim()) {
      sheet.deleteRow(i + 2);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Nota non trovata' });
}

function handleGetNoteNutri(data) {
  const email = (data.email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_NOTE_NUTRI, HDR_NOTE_NUTRI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, note: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_NOTE_NUTRI.length).getValues();
  const note = rows
    .filter(r => String(r[2]).toLowerCase().trim() === email)
    .map(r => ({
      id:         String(r[1]),
      email:      String(r[2]).toLowerCase(),
      data:       r[3] instanceof Date ? r[3].toISOString() : String(r[3]),
      testo:      r[4] || '',
      modificata: r[5] instanceof Date ? r[5].toISOString() : (r[5] || ''),
    }))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  return jsonResponse({ success: true, note: note });
}

// ══════════════════════════════════════════════════════════════════
//  FOLLOW-UP LOG
// ══════════════════════════════════════════════════════════════════
function logFollowupInviato(email, nome, tipo, canale) {
  try {
    const sheet = getOrCreateSheet(SH_FOLLOWUP_LOG, HDR_FOLLOWUP_LOG);
    sheet.appendRow([new Date(), email, nome || '', tipo || '', canale || 'nutrizione']);
  } catch(e) { console.error('logFollowupInviato:', e.message); }
}

function followupGiaInviatoOggi(email, tipo, canale) {
  const sheet = getOrCreateSheet(SH_FOLLOWUP_LOG, HDR_FOLLOWUP_LOG);
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const rows = sheet.getRange(2, 1, last - 1, HDR_FOLLOWUP_LOG.length).getValues();
  return rows.some(r => {
    const ts = r[0] ? new Date(r[0]) : null;
    if (!ts || isNaN(ts.getTime())) return false;
    ts.setHours(0,0,0,0);
    return ts.getTime() === oggi.getTime()
      && String(r[1]).toLowerCase().trim() === String(email).toLowerCase().trim()
      && String(r[3]).trim() === String(tipo).trim()
      && String(r[4]).trim() === String(canale).trim();
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureColumn(sheet, headerName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  if (idx >= 0) return idx + 1;
  const col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(headerName);
  return col;
}

function handleGetFollowupInviati() {
  const sheet = getOrCreateSheet(SH_FOLLOWUP_LOG, HDR_FOLLOWUP_LOG);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, inviati: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_FOLLOWUP_LOG.length).getValues();
  const inviati = rows
    .filter(r => r[1])
    .map(r => ({
      timestamp: r[0] ? new Date(r[0]).toISOString() : '',
      email:     String(r[1]).toLowerCase(),
      nome:      r[2] || '',
      tipo:      r[3] || '',
      canale:    r[4] || '',
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return jsonResponse({ success: true, inviati });
}

// ══════════════════════════════════════════════════════════════════
//  PAGAMENTI
// ══════════════════════════════════════════════════════════════════
function handleAddPagamento(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.importo || isNaN(parseFloat(data.importo))) return jsonResponse({ success: false, error: 'Importo non valido' });
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getOrCreateSheet(SH_PAGAMENTI, HDR_PAGAMENTI);
    sheet.appendRow([new Date(), data.id || Date.now(), data.email.toLowerCase().trim(), data.data || new Date().toISOString().split('T')[0], parseFloat(data.importo), data.servizio || '', data.note || '']);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeletePagamento(data) {
  if (!data.email || !data.id) return jsonResponse({ success: false, error: 'Parametri mancanti' });
  const sheet = getOrCreateSheet(SH_PAGAMENTI, HDR_PAGAMENTI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: false, error: 'Nessun pagamento' });
  const rows = sheet.getRange(2, 1, last - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (String(rows[i][1]) === String(data.id) && String(rows[i][2]).toLowerCase().trim() === data.email.toLowerCase().trim()) {
      sheet.deleteRow(i + 2);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Pagamento non trovato' });
}

function handleGetPagamenti(email) {
  email = (email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_PAGAMENTI, HDR_PAGAMENTI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, pagamenti: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_PAGAMENTI.length).getValues();
  const pagamenti = rows
    .filter(r => String(r[2]).toLowerCase().trim() === email)
    .map(r => ({ id: String(r[1]), email: String(r[2]), data: r[3] ? (r[3] instanceof Date ? r[3].toISOString().split('T')[0] : String(r[3])) : '', importo: parseFloat(r[4]) || 0, servizio: r[5] || '', note: r[6] || '' }))
    .sort((a, b) => b.data.localeCompare(a.data));
  return jsonResponse({ success: true, pagamenti });
}

// ══════════════════════════════════════════════════════════════════
//  GESTIONE SCADENZE — compatibilità pulsanti dashboard
// ══════════════════════════════════════════════════════════════════
function handleAggiornaGestioneScadenze() {
  const res = JSON.parse(handleGetGestioneScadenze().getContent());
  res.aggiornato_il = new Date().toISOString();
  return jsonResponse(res);
}

function handleGetGestioneScadenze() {
  const clientiRes = JSON.parse(handleGetClienti().getContent());
  if (!clientiRes.success) return jsonResponse(clientiRes);

  const visiteRes = JSON.parse(handleGetVisite({ email: '__all__' }).getContent());
  const clienti = clientiRes.clienti || [];
  const visite = visiteRes.visite || [];
  const visiteByEmail = {};

  visite.forEach(vv => {
    const email = String(vv.email || '').toLowerCase().trim();
    if (!email || !vv.date) return;
    const tipo = String(vv.tipo_visita || 'nutrizione').toLowerCase();
    if (!visiteByEmail[email]) visiteByEmail[email] = {};
    if (!visiteByEmail[email][tipo] || new Date(vv.date) > new Date(visiteByEmail[email][tipo].date)) {
      visiteByEmail[email][tipo] = vv;
    }
  });

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const scadenze = clienti.map(cliente => {
    const email = String(cliente.email || '').toLowerCase().trim();
    const fonte = String(cliente.fonte || '');
    const tipoCliente = fonte === 'Form coaching' || fonte === 'Manuale allenamento'
      ? 'allenamento'
      : (fonte === 'Entrambi' ? 'entrambi' : 'nutrizione');
    const map = visiteByEmail[email] || {};
    const visita = map.nutrizione || map.coaching || null;

    let giorni_dalla_visita = '';
    let giorni_a_scadenza = '';
    let scadenza = '';

    if (visita && visita.date) {
      const dataVisita = new Date(visita.date);
      dataVisita.setHours(0, 0, 0, 0);
      const durata = visita.durata_settimane ? parseInt(visita.durata_settimane, 10) || 6 : 6;
      const fine = new Date(dataVisita);
      fine.setDate(fine.getDate() + durata * 7);
      fine.setHours(0, 0, 0, 0);
      giorni_dalla_visita = Math.round((oggi.getTime() - dataVisita.getTime()) / 86400000);
      giorni_a_scadenza = Math.round((fine.getTime() - oggi.getTime()) / 86400000);
      scadenza = normDate(fine);
    }

    return {
      email: email,
      nome: ((cliente.nome || '') + ' ' + (cliente.cognome || '')).trim() || email,
      tipo_cliente: tipoCliente,
      ultima_visita: visita ? visita.date : '',
      scadenza: scadenza,
      giorni_dalla_visita: giorni_dalla_visita,
      giorni_a_scadenza: giorni_a_scadenza,
    };
  });

  return jsonResponse({ success: true, scadenze: scadenze });
}

function handleInviaGestioneScadenze(data) {
  return handleInviaAzioneGestione(data);
}

function handleInviaAzioneGestione(data) {
  const email = String(data.email || '').toLowerCase().trim();
  const azione = String(data.azione || data.tipo || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!azione) return jsonResponse({ success: false, error: 'Azione mancante' });

  if (azione === 'reminder_portale' || azione === 'portale') {
    return handleInviaReminderPortale({ email: email });
  }
  if (azione === 'followup' || azione === 'followup_3_settimane' || azione === '3_settimane') {
    return handleInviaFollowup({ email: email, tipo: 'followup' });
  }
  if (azione === 'check_percorso' || azione === 'check') {
    return handleInviaCheckPercorso({ email: email });
  }
  if (azione === 'coaching_meta' || azione === 'meta') {
    return handleInviaFollowupCoaching({ email: email, tipo: 'meta' });
  }
  if (azione === 'coaching_fine' || azione === 'fine') {
    return handleInviaFollowupCoaching({ email: email, tipo: 'fine' });
  }

  return jsonResponse({ success: false, error: 'Azione gestione non riconosciuta: ' + azione });
}

// ══════════════════════════════════════════════════════════════════
//  CHECK 6 SETTIMANE — lettura
// ══════════════════════════════════════════════════════════════════
function handleGetCheck6(email) {
  email = (email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Check_6_settimane');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, checks: [] });
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const checks  = rows
    .filter(r => String(r[4]).toLowerCase().trim() === email)
    .map(r => { const obj = {}; headers.forEach((h, i) => { obj[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return obj; })
    .sort((a, b) => String(b.data_check).localeCompare(String(a.data_check)));
  return jsonResponse({ success: true, checks });
}

// ══════════════════════════════════════════════════════════════════
//  1. NUOVO CLIENTE DA FORM ANAMNESI
// ══════════════════════════════════════════════════════════════════
function handleNewAnamnesi(data) {
  if (!data.email || !data.email.includes('@')) return jsonResponse({ success: false, error: 'Email non valida' });
  if (!data.nome || !data.cognome) return jsonResponse({ success: false, error: 'Nome e cognome obbligatori' });
  if (data.altezza && (isNaN(data.altezza) || data.altezza < 50 || data.altezza > 280)) return jsonResponse({ success: false, error: 'Altezza non valida' });
  if (data.peso_attuale && (isNaN(data.peso_attuale) || data.peso_attuale < 20 || data.peso_attuale > 500)) return jsonResponse({ success: false, error: 'Peso non valido' });
  let idDaUsare;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet    = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
    const existing = findRowByEmail(sheet, data.email);
    if (existing > 0) {
      const existingRow = sheet.getRange(existing, 1, 1, HDR_ANAMNESI.length).getValues()[0];
      idDaUsare = existingRow[1] || generateId();
      updateRowAnamnesi(sheet, existing, data, idDaUsare, 'Form anamnesi (aggiornamento)');
    } else {
      idDaUsare = generateId();
      sheet.appendRow(buildRowAnamnesi(data, idDaUsare, 'Form anamnesi'));
    }
  } finally {
    lock.releaseLock();
  }
  try { inviaEmailProfessionista(data, idDaUsare); } catch(e) { console.error('ERRORE email professionista: ' + e.message); }
  if (data.email) { try { inviaEmailPaziente(data); } catch(e) { console.error('ERRORE email paziente: ' + e.message); } }
  return jsonResponse({ success: true, id: idDaUsare });
}

// ══════════════════════════════════════════════════════════════════
//  2. NUOVO CLIENTE MANUALE
// ══════════════════════════════════════════════════════════════════
function handleClienteManuale(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
    if (data.email && findRowByEmail(sheet, data.email) > 0) {
      return jsonResponse({ success: false, error: 'Cliente con questa email gia\' esistente.' });
    }
    const id    = generateId();
    const fonte = data.tipo === 'Allenamento' ? 'Manuale allenamento' : (data.tipo === 'Entrambi' ? 'Entrambi' : 'Manuale nutrizionista');
    sheet.appendRow(buildRowAnamnesi(data, id, fonte));
    return jsonResponse({ success: true, id: id });
  } finally {
    lock.releaseLock();
  }
}

// ══════════════════════════════════════════════════════════════════
//  3. LEGGI CLIENTE PER EMAIL
// ══════════════════════════════════════════════════════════════════
function handleGetCliente(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet  = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(sheet, email);
  if (rowIdx < 0) return jsonResponse({ success: false, error: 'Cliente non trovato' });
  const values = sheet.getRange(rowIdx, 1, 1, HDR_ANAMNESI.length).getValues()[0];
  const cliente = {
    id: values[1] || '', fonte: values[2] || '', nome: values[3] || '', cognome: values[4] || '',
    data_nascita: values[5] ? formatDate(values[5]) : '', sesso: values[6] || '',
    email: values[7] || email, telefono: formatTelefono(values[8]),
    codice_fiscale: values[9] || '', professione: values[10] || '',
    altezza: values[11] || '', peso_attuale: values[12] || '', peso_obiettivo: values[13] || '',
    sport: values[14] || '', sport_tipo: values[15] || '', ore_sport: values[16] || '',
    tipo_lavoro: values[17] || '', ore_sonno: values[18] || '', qualita_sonno: values[19] || '',
    risvegli_notturni: values[20] || '', passi_giornalieri: values[21] || '',
    sedentarieta: values[22] || '', stress: values[23] || '', chi_cucina: values[24] || '',
    pasti_fuori: values[25] || '', orari_pasti: values[26] || '', pasti_giorno: values[29] || '',
    acqua: values[30] || '', colazione: values[31] || '', regime_alimentare: values[32] || '',
    alimenti_avversioni: values[33] || '', alimenti_preferiti: values[34] || '',
    consumo_alcol: values[35] || '', celiachia: values[36] || '', allergie: values[37] || '',
    allergie_altro: values[38] || '', intolleranze: values[39] || '', intolleranze_altro: values[40] || '',
    diete_precedenti: values[41] || '', cosa_funzionato: values[42] || '',
    cosa_non_funzionato: values[43] || '', aderenza_passata: values[45] || '',
    fame_mattino: values[46] || '', fame_sera: values[47] || '', attacchi_fame: values[48] || '',
    fame_nervosa: values[49] || '', perdita_controllo: values[50] || '',
    rapporto_dolci: values[51] || '', situazioni_trigger: values[52] || '',
    gonfiore: values[53] || '', pesantezza: values[54] || '', reflusso: values[55] || '',
    alvo_regolare: values[56] || '', freq_evacuazioni: values[57] || '', bristol: values[58] || '',
    patologie: values[59] || '', patologie_altro: values[60] || '', sintomi: values[61] || '',
    sintomi_altro: values[62] || '', condizioni_sospette: values[63] || '',
    farmaci: values[64] || '', integratori: values[65] || '',
    peso_massimo: values[66] || '', peso_minimo: values[67] || '',
    durata_problema: values[68] || '', variazioni_recenti: values[69] || '',
    obiettivo_principale: values[70] || '', obiettivo_secondario: values[71] || '',
    motivazione: values[72] || '', problema_percepito: values[73] || '',
    tempo_disponibile: values[74] || '', disponibilita: values[75] || '',
    note_libere: values[values.length - 2] || '', note_nutrizionista: values[values.length - 1] || '',
  };
  return jsonResponse({ success: true, cliente: cliente });
}

// ══════════════════════════════════════════════════════════════════
//  4. LISTA TUTTI I CLIENTI
// ══════════════════════════════════════════════════════════════════
function handleGetClienti() {
  const sheet = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, clienti: [] });
  const values  = sheet.getRange(2, 1, last - 1, HDR_ANAMNESI.length).getValues();
  const clienti = values
    .filter(r => r[7])
    .map(r => ({
      id: r[1], nome: r[3], cognome: r[4], data_nascita: r[5], sesso: r[6],
      email: r[7], telefono: r[8], altezza: r[11], peso_attuale: r[12], peso_obiettivo: r[13],
      obiettivo: r[70],
      tipo: r[2] === 'Form coaching' ? 'Allenamento' : (r[2] === 'Entrambi' ? 'Entrambi' : (r[2] === 'Manuale allenamento' ? 'Allenamento' : 'Nutrizione')),
      fonte: r[2], timestamp: r[0],
    }));
  return jsonResponse({ success: true, clienti: clienti });
}

// ══════════════════════════════════════════════════════════════════
//  5–8. SCANSIONI, MISURE
// ══════════════════════════════════════════════════════════════════
function handleAddScansione(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_SCANSIONI, HDR_SCANSIONI);
  sheet.appendRow([new Date(), data.email.toLowerCase(), data.data_scansione ? new Date(data.data_scansione) : new Date(), data.tipo || 'Visbody', v(data.peso), v(data.grassa), v(data.muscolare), v(data.pgc), v(data.bmi), v(data.score), v(data.eta_metabolica), v(data.tasso_metabolico), v(data.ffm), v(data.bcm), v(data.ecm), v(data.tbw_lt), v(data.tbw_pct), v(data.ecw_lt), v(data.icw_lt), v(data.idratazione_ffm), v(data.rapporto_ei), v(data.angolo_fase), v(data.indice_salute), v(data.fatty_liver), v(data.vita), v(data.fianchi), data.note || '']);
  return jsonResponse({ success: true });
}

function handleAddMisura(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_MISURE, HDR_MISURE);
  sheet.appendRow([new Date(), data.email.toLowerCase(), data.data ? new Date(data.data) : new Date(), data.tipo || '', v(data.valore), data.unita || '', data.note || '']);
  return jsonResponse({ success: true });
}

function handleGetScansioni(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_SCANSIONI, HDR_SCANSIONI);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, scansioni: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_SCANSIONI.length).getValues();
  const scansioni = rows.filter(r => String(r[1]).toLowerCase() === email).map(r => { const obj = {}; HDR_SCANSIONI.forEach((h, i) => { obj[h] = r[i]; }); return obj; }).sort((a, b) => new Date(a['Data scansione']) - new Date(b['Data scansione']));
  return jsonResponse({ success: true, scansioni: scansioni });
}

function handleGetMisure(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_MISURE, HDR_MISURE);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, misure: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_MISURE.length).getValues();
  const misure = rows.filter(r => String(r[1]).toLowerCase() === email).map(r => ({ data: r[2], tipo: r[3], valore: r[4], unita: r[5], note: r[6] })).sort((a, b) => new Date(a.data) - new Date(b.data));
  return jsonResponse({ success: true, misure: misure });
}

// ══════════════════════════════════════════════════════════════════
//  8b. VISITE
// ══════════════════════════════════════════════════════════════════
function handleAddVisita(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const sheet = getOrCreateSheet(SH_VISITE, HDR_VISITE);
    if (sheet.getLastColumn() < 8) sheet.getRange(1, 8).setValue('Durata (settimane)');
    if (sheet.getLastColumn() < 9) sheet.getRange(1, 9).setValue('Tipo visita');
    sheet.appendRow([new Date(), data.email.toLowerCase(), data.data_visita ? new Date(data.data_visita) : new Date(), data.id_visita || 'v-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase(), v(data.peso), data.note || '', JSON.stringify(data.foto_urls || []), data.durata_settimane ? parseInt(data.durata_settimane) : 6, (data.tipo_visita || 'nutrizione').toLowerCase()]);
    return jsonResponse({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function handleEliminaVisita(data) {
  if (!data.email || !data.id_visita) return jsonResponse({ success: false, error: 'Parametri mancanti' });
  const sheet = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: false, error: 'Nessuna visita' });
  const rows = sheet.getRange(2, 1, last - 1, 4).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][3]) === String(data.id_visita) && String(rows[i][1]).toLowerCase().trim() === String(data.email).toLowerCase().trim()) {
      sheet.deleteRow(i + 2);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Visita non trovata' });
}

function handleGetVisite(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const last  = sheet.getLastRow();
  const rows = last >= 2 ? sheet.getRange(2, 1, last - 1, Math.min(9, sheet.getLastColumn())).getValues() : [];
  const filtered = email !== '__all__' ? rows.filter(r => String(r[1]).toLowerCase() === email) : rows.filter(r => r[1]);
  let visite = filtered.map(r => ({ email: String(r[1]).toLowerCase(), id: r[3], date: r[2] ? new Date(r[2]).toISOString().split('T')[0] : '', peso: r[4] || null, note: r[5] || '', fotos: parseFotoUrls_(r[6]), durata_settimane: r[7] ? parseInt(r[7]) : 6, tipo_visita: (r[8] || 'nutrizione').toString().toLowerCase() }));
  if (email !== '__all__') visite = mergeDriveFotoVisite_(email, visite);
  visite.sort((a, b) => new Date(b.date) - new Date(a.date));
  return jsonResponse({ success: true, visite: visite });
}

function parseFotoUrls_(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) {
    return String(value).split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
  }
}

function mergeDriveFotoVisite_(email, visite) {
  const driveVisite = getDriveFotoVisite_(email, visite);
  driveVisite.forEach(dv => {
    let existing = visite.find(v => String(v.date || '') === String(dv.date || ''));
    if (!existing) {
      visite.push(dv);
      return;
    }
    const existingIds = {};
    (existing.fotos || []).forEach(url => {
      const id = getDriveFileIdFromUrl_(typeof url === 'string' ? url : (url && url.url));
      if (id) existingIds[id] = true;
    });
    dv.fotos.forEach(url => {
      const id = getDriveFileIdFromUrl_(url);
      if (id && !existingIds[id]) {
        existing.fotos.push(url);
        existingIds[id] = true;
      }
    });
  });
  return visite.filter(v => v.fotos && v.fotos.length);
}

function getDriveFotoVisite_(email, visite) {
  const existingIds = {};
  (visite || []).forEach(vv => (vv.fotos || []).forEach(url => {
    const id = getDriveFileIdFromUrl_(typeof url === 'string' ? url : (url && url.url));
    if (id) existingIds[id] = true;
  }));

  const grouped = {};
  try {
    const rootIt = DriveApp.getFoldersByName(FOTO_FOLDER_NAME);
    if (!rootIt.hasNext()) return [];
    const root = rootIt.next();
    const clientIt = root.getFoldersByName(email);
    if (!clientIt.hasNext()) return [];
    const folder = clientIt.next();
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const mime = String(file.getMimeType() || '').toLowerCase();
      const name = String(file.getName() || '').toLowerCase();
      const isPhoto = mime.indexOf('image/') === 0 || /\.(jpe?g|png|heic|heif|webp)$/i.test(name);
      if (!isPhoto) continue;
      if (existingIds[file.getId()]) continue;
      const date = getDateFromFotoFile_(file);
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push('https://lh3.googleusercontent.com/d/' + file.getId());
    }
  } catch(e) {
    console.error('getDriveFotoVisite_:', e.message);
  }

  return Object.keys(grouped).map(date => ({
    email: email,
    id: 'drive-' + date,
    date: date,
    peso: null,
    note: 'Recuperata automaticamente da Drive',
    fotos: grouped[date],
    durata_settimane: 6,
    tipo_visita: 'nutrizione',
  }));
}

function getDateFromFotoFile_(file) {
  const name = file.getName() || '';
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  return normDate(file.getDateCreated());
}

function getDriveFileIdFromUrl_(url) {
  url = String(url || '');
  let m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

function handleUploadFoto(data) {
  let email = (data.email || '').toLowerCase().trim();
  if (!email && data.token) email = getEmailFromPortaleToken_(data.token);

  if (!email || !data.base64) return jsonResponse({ success: false, error: 'Parametri mancanti' });

  try {
    const rootFolder = getOrCreateFolder(FOTO_FOLDER_NAME);
    const clientFolder = getOrCreateSubfolder(rootFolder, email);
    const contentType = data.mimeType || 'image/jpeg';
    const decoded = Utilities.base64Decode(data.base64);
    const filename = data.filename || ('foto_' + new Date().toISOString().replace(/[:.]/g, '-') + '.jpg');
    const blob = Utilities.newBlob(decoded, contentType, filename);
    const file = clientFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      success: true,
      url: 'https://lh3.googleusercontent.com/d/' + file.getId(),
      fileId: file.getId()
    });
  } catch(err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function handleUpdateNote(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet  = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(sheet, data.email);
  if (rowIdx < 0) return jsonResponse({ success: false, error: 'Cliente non trovato' });
  const headers = sheet.getRange(1, 1, 1, HDR_ANAMNESI.length).getValues()[0];
  const colIdx  = headers.indexOf('Note Nutrizionista') + 1;
  if (colIdx > 0) sheet.getRange(rowIdx, colIdx).setValue(data.note || '');
  return jsonResponse({ success: true });
}

// ══════════════════════════════════════════════════════════════════
//  11. SALVA CHECK 6 SETTIMANE
// ══════════════════════════════════════════════════════════════════
function handleAddCheck6(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const shCheck = ss.getSheetByName('Check_6_settimane');
    if (shCheck && shCheck.getLastRow() >= 2) {
      const oggi = new Date();
      const inizioSettimana = new Date(oggi);
      inizioSettimana.setDate(oggi.getDate() - oggi.getDay() + (oggi.getDay() === 0 ? -6 : 1));
      inizioSettimana.setHours(0,0,0,0);
      const rows = shCheck.getRange(2, 1, shCheck.getLastRow() - 1, 6).getValues();
      const giaCompilato = rows.some(r => {
        const emailCheck = String(r[4]).toLowerCase().trim();
        const dataCheck  = r[5] ? new Date(r[5]) : null;
        return emailCheck === data.email.toLowerCase().trim() && dataCheck && dataCheck >= inizioSettimana;
      });
      if (giaCompilato) return jsonResponse({ success: false, error: 'Hai già compilato il check questa settimana.' });
    }
  } catch(e) { console.error('Controllo duplicato:', e.message); }
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Check_6_settimane');
    if (!sheet) {
      sheet = ss.insertSheet('Check_6_settimane');
      sheet.appendRow(HDR_CHECK6);
      const r = sheet.getRange(1, 1, 1, HDR_CHECK6.length);
      r.setBackground('#1a3a2a').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10).setWrap(false);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 150); sheet.setColumnWidth(2, 150);
      for (let c = 3; c <= HDR_CHECK6.length; c++) sheet.setColumnWidth(c, 140);
      sheet.getRange(1, 1, 1, HDR_CHECK6.length).createFilter();
    }
    sheet.appendRow([data.timestamp || new Date().toISOString(), data.client_code || '', data.nome || '', data.cognome || '', data.email.toLowerCase(), data.data_check || '', v(data.aderenza_percentuale), data.pasti_fuori_schema || '', data.modifica_porzioni || '', data.regolarita_pasti || '', data.difficolta_rispettare_piano || '', v(data.giorni_fuori_piano), data.note_aderenza || '', data.fame_generale || '', data.fame_serale || '', data.energia_quotidiana || '', data.performance_allenamento || '', data.recupero || '', data.digestione || '', data.gonfiore || '', data.transito_intestinale || '', data.sonno || '', data.ritenzione_idrica || '', data.note_risposta_corporea || '', data.facilita_seguire_piano || '', data.compatibilita_vita_reale || '', data.stress_percepito || '', data.impatto_mentale || '', data.voglia_di_mollare || '', data.note_sostenibilita || '', data.aderenza_integratori || '', data.frequenza_assunzione_integratori || '', data.effetti_collaterali_integratori || '', data.utilita_integratori || '', data.gestione_pratica_integratori || '', data.dubbi_integratori || '', data.integratore_piu_utile || '', data.integratore_meno_utile || '', data.note_integratori || '', data.soddisfazione_generale || '', data.miglioramento_percepito || '', data.risultato_non_ottenuto || '', data.proseguiresti_percorso || '', data.nutrizionista_cosa_ha_funzionato || '', data.nutrizionista_cosa_non_ha_funzionato || '', data.nutrizionista_criticita_principale || '', data.nutrizionista_modifiche_da_apportare || '', data.nutrizionista_decisione_finale || '', v(data.aderenza_score), v(data.risposta_score), v(data.sostenibilita_score), v(data.integratori_score), v(data.success_score), data.classification || '', data.trend_vs_previous || '', data.auto_summary || '', data.pdf_generated || '', data.note_visita_nutrizionista || '']);
  } finally {
    lock.releaseLock();
  }
  if (data.peso_attuale && !isNaN(parseFloat(data.peso_attuale))) {
    try { handleAddMisura({ email: data.email, tipo: 'peso', valore: parseFloat(data.peso_attuale), unita: 'kg', data: data.data_check || new Date().toISOString().split('T')[0], note: 'Da check percorso' }); } catch(e) { console.error('Salvataggio peso in Misure:', e.message); }
  }
  try { inviaNotificaCheckCompilato(data); } catch(e) { console.error('Notifica check:', e.message); }
  return jsonResponse({ success: true });
}

// ══════════════════════════════════════════════════════════════════
//  NOTE VISITA SUL CHECK
// ══════════════════════════════════════════════════════════════════
function normDate(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v || '').slice(0, 10);
}

function handleSaveNoteVisita(data) {
  if (!data.email || !data.data_check) return jsonResponse({ success: false, error: 'Parametri mancanti' });
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Check_6_settimane');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: false, error: 'Nessun check trovato' });
  const noteColIdx = ensureColumn(sheet, 'note_visita_nutrizionista') - 1;
  const last = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, last - 1, 6).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][4]).toLowerCase().trim() === data.email.toLowerCase().trim() && normDate(rows[i][5]) === normDate(data.data_check)) {
      sheet.getRange(i + 2, noteColIdx + 1).setValue(data.note || '');
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ success: false, error: 'Check non trovato' });
}

function handleGetNoteVisita(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Check_6_settimane');
  if (!sheet || sheet.getLastRow() < 2) return jsonResponse({ success: true, note_map: {} });
  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const noteIdx  = headers.indexOf('note_visita_nutrizionista');
  if (noteIdx < 0) return jsonResponse({ success: true, note_map: {} });
  const last = sheet.getLastRow();
  const rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  const note_map = {};
  rows.filter(r => String(r[4]).toLowerCase().trim() === data.email.toLowerCase().trim()).forEach(r => { note_map[normDate(r[5])] = r[noteIdx] || ''; });
  return jsonResponse({ success: true, note_map });
}

// ══════════════════════════════════════════════════════════════════
//  INVIA CHECK PERCORSO
// ══════════════════════════════════════════════════════════════════
function handleInviaCheckPercorso(data) {
  const email = (data.email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const shA    = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);
  let nome = email;
  if (rowIdx > 0) { const vals = shA.getRange(rowIdx, 1, 1, 5).getValues()[0]; nome = ((vals[3]||'') + ' ' + (vals[4]||'')).trim() || email; }
  const shV   = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastV = shV.getLastRow();
  let settimana = 6;
  if (lastV >= 2) {
    const visteRows = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    const visteCliente = visteRows
      .filter(r => String(r[1]).toLowerCase() === email && String(r[8]||'nutrizione').toLowerCase() === 'nutrizione')
      .sort((a,b) => new Date(b[2]) - new Date(a[2]));
    if (visteCliente.length > 0 && visteCliente[0][7]) settimana = parseInt(visteCliente[0][7]) || 6;
  }
  const emailSafe = email.replace('@', '--at--');
  const checkUrl  = CHECK_PERCORSO_URL + '?e=' + emailSafe + '&n=' + encodeURIComponent(nome) + '&s=' + settimana;
  MailApp.sendEmail(email, 'Prima della visita \u2014 compila il tuo check percorso', '', { htmlBody: buildMailCheckPercorso(nome, checkUrl), name: 'Neacea Studio' });
  logFollowupInviato(email, nome, 'check_percorso', 'nutrizione');
  return jsonResponse({ success: true, checkUrl: checkUrl });
}

function buildMailCheckPercorso(nome, checkUrl) {
  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:white;margin-bottom:8px;">Ciao ' + nomeBreve + ' &mdash; domani ci vediamo!</div>'
    +   '<div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">Il tuo piano sta per concludersi. Prima della visita, prenditi qualche minuto.</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;line-height:1.8;color:#555;margin:0 0 16px;">Ho preparato un breve check del percorso &mdash; le tue risposte mi aiuteranno a prepararmi al meglio.</p>'
    +   '<div style="background:#f0f7f2;border-left:3px solid #1a3a2a;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#2a5c40;margin-bottom:24px;">Ci vogliono circa 5 minuti.</div>'
    +   '<div style="text-align:center;margin:24px 0;"><a href="' + checkUrl + '" style="display:inline-block;background:#1a3a2a;color:white;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Compila il check percorso &rarr;</a></div>'
    +   '<p style="font-size:12px;color:#aaa;text-align:center;margin-top:20px;">Se il pulsante non funziona: <span style="color:#2a5c40;">' + checkUrl + '</span></p>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio &mdash; nutrizione@neacea.com</div>'
    + '</div>';
}

// ══════════════════════════════════════════════════════════════════
//  NOTIFICA AL PROFESSIONISTA dopo compilazione check
// ══════════════════════════════════════════════════════════════════
function inviaNotificaCheckCompilato(data) {
  const dest    = EMAIL_PROFESSIONISTA;
  const nome    = ((data.nome||'') + ' ' + (data.cognome||'')).trim() || (data.email||'');
  const score   = data.success_score       || '—';
  const classif = data.classification      || '—';
  const scoreAd = data.aderenza_score      || '—';
  const scoreRi = data.risposta_score      || '—';
  const scoreSo = data.sostenibilita_score || '—';
  const scoreIn = data.integratori_score   || '—';
  const MAP_ADERENZA_PCT = {'5':'Ottima (90%+)','4':'Buona (80-89%)','3':'Discreta (65-79%)','2':'Scarsa (50-64%)','1':'Molto scarsa (<50%)'};
  const MAP_FREQUENZA    = {'5':'Mai','4':'Raramente (1x/sett)','3':'A volte (2-3x)','2':'Spesso (4-5x)','1':'Quotidianamente'};
  const MAP_PORZIONI     = {'5':'Mai','4':'Raramente','3':'A volte','2':'Spesso','1':'Sempre'};
  const MAP_REGOLARITA   = {'5':'Molto regolare','4':'Regolare','3':'Abbastanza','2':'Irregolare','1':'Molto irregolare'};
  const MAP_DIFFICOLTA   = {'5':'Nessuna','4':'Minima','3':'Moderata','2':'Abbastanza difficile','1':'Molto difficile'};
  const MAP_GIORNI       = {'5':'0 giorni','4':'1 giorno','3':'2-3 giorni','2':'4-5 giorni','1':'6-7 giorni'};
  const MAP_FAME         = {'5':'Assente','4':'Minima','3':'Moderata','2':'Frequente','1':'Intensa'};
  const MAP_ENERGIA      = {'5':'Ottima','4':'Buona','3':'Discreta','2':'Scarsa','1':'Pessima'};
  const MAP_GONFIORE     = {'5':'Assente','4':'Minimo','3':'Moderato','2':'Frequente','1':'Forte e continuo'};
  const MAP_TRANSITO     = {'5':'Regolare','4':'Abbastanza','3':'Variabile','2':'Irregolare','1':'Molto irregolare'};
  const MAP_SONNO        = {'5':'Ottimo','4':'Buono','3':'Discreto','2':'Scarso','1':'Molto scarso'};
  const MAP_RITENZIONE   = {'5':'Assente','4':'Minima','3':'Moderata','2':'Frequente','1':'Forte'};
  const MAP_FACILITA     = {'5':'Molto facile','4':'Facile','3':'Moderata','2':'Difficile','1':'Molto difficile'};
  const MAP_COMPATIBILITA= {'5':'Molto compatibile','4':'Compatibile','3':'Abbastanza','2':'Poco compatibile','1':'Incompatibile'};
  const MAP_STRESS       = {'5':'Per niente','4':'Poco','3':'Moderato','2':'Abbastanza','1':'Molto stressante'};
  const MAP_IMPATTO      = {'5':'Molto positivo','4':'Positivo','3':'Neutro','2':'Negativo','1':'Molto negativo'};
  const MAP_VOGLIA       = {'5':'Mai','4':'Raramente','3':'A volte','2':'Spesso','1':'Sempre'};
  const MAP_INTEGRATORI  = {'5':'Sempre','4':'Quasi sempre','3':'A volte','2':'Raramente','1':'Mai'};
  const MAP_EFFETTI      = {'5':'Nessuno','4':'Trascurabili','3':'Lievi','2':'Moderati','1':'Forti - ha interrotto'};
  const MAP_UTILITA      = {'5':'Molto utili','4':'Utili','3':'Abbastanza','2':'Poco utili','1':'Inutili'};
  const MAP_SODDISFAZIONE= {'5':'Molto soddisfatto','4':'Soddisfatto','3':'Abbastanza','2':'Poco soddisfatto','1':'Per niente'};
  const MAP_MIGLIORAMENTO= {'5':'Netto miglioramento','4':'Buon miglioramento','3':'Lieve','2':'Nessuno','1':'Peggioramento'};
  function dec(map, val) { return (val && map[String(val)]) ? map[String(val)] : (val || ''); }
  function bar(pct) { const n = Math.min(100, Math.max(0, parseInt(pct)||0)); return '<div style="height:6px;background:#e0ece6;border-radius:3px;overflow:hidden;margin-top:4px;"><div style="width:' + n + '%;height:100%;background:#1a3a2a;border-radius:3px;"></div></div>'; }
  function sezione(titolo, colore, righe) { if (!righe.trim()) return ''; return '<div style="margin-bottom:18px;"><div style="font-size:10px;font-weight:800;color:' + colore + ';text-transform:uppercase;letter-spacing:.1em;padding:8px 12px;background:' + colore + '15;border-left:3px solid ' + colore + ';margin-bottom:0;">' + titolo + '</div><table style="width:100%;border-collapse:collapse;border:1px solid #e8f0eb;border-top:none;">' + righe + '</table></div>'; }
  function r(label, val) { if (!val && val !== 0) return ''; return '<tr style="border-bottom:1px solid #f0f5f2;"><td style="padding:6px 12px;font-size:11px;font-weight:700;color:#5a7a68;text-transform:uppercase;letter-spacing:.04em;width:44%;vertical-align:top;">' + label + '</td><td style="padding:6px 12px;font-size:13px;color:#1a2820;line-height:1.5;">' + escapeHtml(String(val)).replace(/\n/g,'<br>') + '</td></tr>'; }
  const schedaUrl = 'https://scheda-nutrizionale.netlify.app?cliente=' + encodeURIComponent(data.email||'') + '&nutri=1&admin=NEACEA2026ADMIN';
  const sAderenza = sezione('1 · Aderenza al Piano', '#1a7a4a', r('Aderenza complessiva', dec(MAP_ADERENZA_PCT, data.aderenza_percentuale)) + r('Pasti fuori schema', dec(MAP_FREQUENZA, data.pasti_fuori_schema)) + r('Modifica porzioni', dec(MAP_PORZIONI, data.modifica_porzioni)) + r('Regolarità pasti', dec(MAP_REGOLARITA, data.regolarita_pasti)) + r('Difficoltà piano', dec(MAP_DIFFICOLTA, data.difficolta_rispettare_piano)) + r('Giorni fuori piano/sett', dec(MAP_GIORNI, data.giorni_fuori_piano)) + r('Note aderenza', data.note_aderenza));
  const sRisposta = sezione('2 · Risposta Corporea', '#2a7c8a', r('Fame generale', dec(MAP_FAME, data.fame_generale)) + r('Fame serale', dec(MAP_FAME, data.fame_serale)) + r('Energia quotidiana', dec(MAP_ENERGIA, data.energia_quotidiana)) + r('Performance allenamento', dec(MAP_ENERGIA, data.performance_allenamento)) + r('Recupero', dec(MAP_ENERGIA, data.recupero)) + r('Digestione', dec(MAP_ENERGIA, data.digestione)) + r('Gonfiore addominale', dec(MAP_GONFIORE, data.gonfiore)) + r('Transito intestinale', dec(MAP_TRANSITO, data.transito_intestinale)) + r('Qualità sonno', dec(MAP_SONNO, data.sonno)) + r('Ritenzione idrica', dec(MAP_RITENZIONE, data.ritenzione_idrica)) + r('Note risposta', data.note_risposta_corporea));
  const sSostenibilita = sezione('3 · Sostenibilità', '#8a6210', r('Facilità seguire piano', dec(MAP_FACILITA, data.facilita_seguire_piano)) + r('Compatibilità vita reale', dec(MAP_COMPATIBILITA, data.compatibilita_vita_reale)) + r('Stress percepito', dec(MAP_STRESS, data.stress_percepito)) + r('Impatto mentale', dec(MAP_IMPATTO, data.impatto_mentale)) + r('Voglia di mollare', dec(MAP_VOGLIA, data.voglia_di_mollare)) + r('Note sostenibilità', data.note_sostenibilita));
  const sIntegratori = sezione('4 · Integratori', '#5a3a8a', r('Aderenza integratori', dec(MAP_INTEGRATORI, data.aderenza_integratori)) + r('Frequenza assunzione', dec(MAP_INTEGRATORI, data.frequenza_assunzione_integratori)) + r('Effetti collaterali', dec(MAP_EFFETTI, data.effetti_collaterali_integratori)) + r('Utilità percepita', dec(MAP_UTILITA, data.utilita_integratori)) + r('Integratore più utile', data.integratore_piu_utile) + r('Integratore meno utile', data.integratore_meno_utile) + r('Dubbi', data.dubbi_integratori) + r('Note integratori', data.note_integratori));
  const sRisultato = sezione('5 · Risultato Percepito', '#c0392b', r('Soddisfazione generale', dec(MAP_SODDISFAZIONE, data.soddisfazione_generale)) + r('Miglioramento percepito', dec(MAP_MIGLIORAMENTO, data.miglioramento_percepito)) + r('Risultato non ottenuto', data.risultato_non_ottenuto) + r('Proseguirebbe percorso', data.proseguiresti_percorso));
  const sNutrizione = (data.nutrizionista_decisione_finale || data.nutrizionista_cosa_ha_funzionato) ? sezione('6 · Note Nutrizionista', '#1a3a2a', r('Cosa ha funzionato', data.nutrizionista_cosa_ha_funzionato) + r('Cosa non ha funzionato', data.nutrizionista_cosa_non_ha_funzionato) + r('Criticità principale', data.nutrizionista_criticita_principale) + r('Modifiche da apportare', data.nutrizionista_modifiche_da_apportare) + r('Decisione finale', data.nutrizionista_decisione_finale)) : '';
  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:640px;margin:0 auto;background:#f4f8f5;padding:16px;">'
    + '<div style="background:#1a3a2a;border-radius:10px 10px 0 0;padding:20px 24px;">'
    +   '<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Neacea Studio — Check percorso compilato</div>'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;">' + escapeHtml(nome) + '</div>'
    +   '<div style="font-size:12px;color:rgba(255,255,255,.5);">' + escapeHtml(data.email||'') + ' &nbsp;·&nbsp; ' + escapeHtml(data.data_check||'') + (data.peso_attuale ? ' &nbsp;·&nbsp; ' + escapeHtml(String(data.peso_attuale)) + ' kg' : '') + '</div>'
    + '</div>'
    + '<div style="background:#fff;border-radius:0 0 10px 10px;padding:20px 24px;">'
    + '<div style="display:flex;align-items:center;gap:20px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e8f0eb;">'
    +   '<div><div style="font-size:44px;font-weight:800;color:#1a3a2a;line-height:1;">' + score + '<span style="font-size:18px;color:#98b4a5;">/100</span></div>'
    +   '<div style="font-size:13px;font-weight:700;color:#5a7a68;margin-top:4px;">' + classif + '</div></div>'
    +   '<div style="flex:1;"><div style="font-size:11px;font-weight:700;color:#5a7a68;margin-bottom:2px;">Aderenza (35%)</div>'
    +   '<div style="font-size:20px;font-weight:800;color:#1a3a2a;">' + scoreAd + '</div>' + bar(scoreAd) + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px;">'
    +   '<div style="background:#f0f7f2;border-radius:8px;padding:10px 12px;"><div style="font-size:10px;font-weight:700;color:#5a7a68;text-transform:uppercase;">Risposta 30%</div><div style="font-size:22px;font-weight:800;color:#1a3a2a;">' + scoreRi + '</div>' + bar(scoreRi) + '</div>'
    +   '<div style="background:#f0f7f2;border-radius:8px;padding:10px 12px;"><div style="font-size:10px;font-weight:700;color:#5a7a68;text-transform:uppercase;">Sostenibilit&agrave; 20%</div><div style="font-size:22px;font-weight:800;color:#1a3a2a;">' + scoreSo + '</div>' + bar(scoreSo) + '</div>'
    +   '<div style="background:#f0f7f2;border-radius:8px;padding:10px 12px;"><div style="font-size:10px;font-weight:700;color:#5a7a68;text-transform:uppercase;">Integratori 15%</div><div style="font-size:22px;font-weight:800;color:#1a3a2a;">' + scoreIn + '</div>' + bar(scoreIn) + '</div>'
    + '</div>'
    + sAderenza + sRisposta + sSostenibilita + sIntegratori + sRisultato + sNutrizione
    + '<div style="margin-top:20px;text-align:center;"><a href="' + schedaUrl + '" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-size:13px;font-weight:700;">Apri scheda cliente &rarr;</a></div>'
    + '</div>'
    + '<div style="text-align:center;font-size:11px;color:#8fa89a;padding:10px 0;">Neacea Studio &mdash; nutrizione@neacea.com</div>'
    + '</div>';
  MailApp.sendEmail(dest, '[Neacea] Check compilato - ' + nome + ' - Score: ' + score + '/100', '', { htmlBody: html, name: 'Neacea Studio' });
}

// ══════════════════════════════════════════════════════════════════
//  FOLLOW-UP NUTRIZIONALE
// ══════════════════════════════════════════════════════════════════
const FOLLOWUP_BASE_URL = 'https://check-3-settimane.netlify.app';
const SH_FOLLOWUP       = 'FollowupRisposte';
const HDR_FOLLOWUP = ['Timestamp', 'Email', 'Nome', 'Token', 'Aderenza (1-10)', 'Come Va', 'Difficolta', 'Domanda', 'Peso (kg)'];

function handleInviaFollowup(data) {
  const email = (data.email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const tipo      = data.tipo || 'followup';
  const msgCustom = data.messaggio_custom || '';
  const shA    = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);
  let nome = email;
  if (rowIdx > 0) { const vals = shA.getRange(rowIdx, 1, 1, 5).getValues()[0]; nome = ((vals[3]||'') + ' ' + (vals[4]||'')).trim() || email; }
  const token      = Utilities.getUuid();
  const emailSafe  = email.replace('@', '--at--');
  const checkInUrl = FOLLOWUP_BASE_URL + '?e=' + emailSafe + '&t=' + token + '&n=' + encodeURIComponent(nome) + (msgCustom ? '&m=' + encodeURIComponent(msgCustom) : '');
  let subject, html;
  if (tipo === 'followup') { subject = 'Come stai andando? Check-in Neacea Studio'; html = buildMailFollowup(nome, email, checkInUrl, msgCustom); }
  else                     { subject = 'Rinnova il tuo percorso - Neacea Studio'; html = buildMailRinnovo(nome, email, checkInUrl, msgCustom); }
  MailApp.sendEmail(email, subject, '', { htmlBody: html, name: 'Neacea Studio' });
  logFollowupInviato(email, nome, tipo, 'nutrizione');
  return jsonResponse({ success: true, checkInUrl: checkInUrl });
}

function handleAddFollowupRisposta(data) {
  const email = (data.email || '').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_FOLLOWUP, HDR_FOLLOWUP);
  sheet.appendRow([new Date(), email, data.nome||'', data.token||'', v(data.punteggio), data.come_va||'', data.difficolta||'', data.domanda||'', v(data.peso)]);
  if (data.peso) handleAddMisura({ email, tipo:'peso', valore:data.peso, unita:'kg', data:new Date().toISOString(), note:'Da check-in follow-up' });
  try { const dest = EMAIL_PROFESSIONISTA || Session.getActiveUser().getEmail(); MailApp.sendEmail(dest, '[Neacea] Check-in ricevuto da ' + (data.nome||email), '', { htmlBody: buildMailNotificaRisposta(data.nome||email, email, data), name: 'Neacea Studio' }); } catch(e) { console.error('Notifica professionista:', e.message); }
  return jsonResponse({ success: true });
}

function handleGetFollowupRisposte() {
  const sheet = getOrCreateSheet(SH_FOLLOWUP, HDR_FOLLOWUP);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, risposte: [] });
  const rows = sheet.getRange(2, 1, last - 1, HDR_FOLLOWUP.length).getValues();
  const risposte = rows.filter(r => r[1]).map(r => ({ timestamp: r[0]?new Date(r[0]).toISOString():'', email:r[1], nome:r[2], token:r[3], punteggio:r[4], come_va:r[5], difficolta:r[6], domanda:r[7], peso:r[8] })).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
  return jsonResponse({ success: true, risposte });
}

// ══════════════════════════════════════════════════════════════════
//  TEMPLATE EMAIL
// ══════════════════════════════════════════════════════════════════
function buildMailFollowup(nome, email, checkInUrl, msgCustom) {
  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  const msgSafe   = escapeHtml(msgCustom).replace(/\n/g, '<br>');
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;"><div style="font-size:22px;font-weight:700;color:white;margin-bottom:8px;">Ciao ' + nomeBreve + ' &mdash; come stai andando?</div><div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">Sono passate circa 3 settimane dall\'inizio del tuo percorso.</div></div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    + (msgCustom ? '<div style="background:#fffbf2;border-left:3px solid #c9a84c;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#7a5a10;line-height:1.7;margin-bottom:20px;"><strong>Dal tuo nutrizionista</strong><br>' + msgSafe + '</div>' : '')
    + '<p style="font-size:14px;line-height:1.8;color:#555;margin:0 0 20px;">Prenditi 2 minuti per raccontarmi com\'&egrave; andata.</p>'
    + '<div style="text-align:center;margin:28px 0;"><a href="' + checkInUrl + '" style="display:inline-block;background:#1a3a2a;color:white;padding:16px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Compila il check-in</a></div>'
    + '</div><div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio &mdash; nutrizione@neacea.com</div></div>';
}

function buildMailRinnovo(nome, email, checkInUrl, msgCustom) {
  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  const msgSafe   = escapeHtml(msgCustom).replace(/\n/g, '<br>');
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">'
    + '<div style="background:#1a3a2a;padding:32px 28px;border-radius:10px 10px 0 0;"><div style="font-size:22px;font-weight:700;color:white;">Pronti per il passo successivo, ' + nomeBreve + '?</div></div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    + (msgCustom ? '<div style="background:#fffbf2;border-left:3px solid #c9a84c;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#7a5a10;">' + msgSafe + '</div>' : '')
    + '<p style="font-size:14px;color:#555;margin:0 0 20px;">Hai fatto un ottimo lavoro. Vuoi continuare?</p>'
    + '<div style="text-align:center;margin:28px 0;"><a href="' + checkInUrl + '" style="display:inline-block;background:#1a3a2a;color:white;padding:16px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Dimmi come &egrave; andata</a></div>'
    + '</div><div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio &mdash; nutrizione@neacea.com</div></div>';
}

function buildMailNotificaRisposta(nome, email, data) {
  const punteggio = data.punteggio || '?';
  const baraPct   = Math.min(100, Math.max(0, parseInt(punteggio) * 10));
  function riga(label, val) { if (!val) return ''; return '<tr><td style="padding:8px 12px;font-size:12px;font-weight:700;color:#666;width:35%;">' + label + '</td><td style="padding:8px 12px;font-size:13px;color:#1a2820;">' + escapeHtml(String(val)) + '</td></tr>'; }
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#1a3a2a;padding:20px 24px;border-radius:10px 10px 0 0;"><div style="font-size:18px;font-weight:700;color:#fff;">Check-in ricevuto da ' + escapeHtml(nome) + '</div><div style="font-size:12px;color:rgba(255,255,255,.5);">' + escapeHtml(email) + '</div></div>'
    + '<div style="padding:20px 24px;border:1px solid #e8e8e8;border-top:none;"><div style="margin-bottom:16px;"><div style="font-size:24px;font-weight:800;color:#1a3a2a;">' + escapeHtml(String(punteggio)) + ' / 10</div><div style="height:8px;background:#eee;border-radius:4px;overflow:hidden;"><div style="height:100%;background:#1a3a2a;width:' + baraPct + '%;"></div></div></div>'
    + '<table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">' + riga('Come va', data.come_va) + riga('Difficolt&agrave;', data.difficolta) + riga('Domanda', data.domanda) + riga('Peso', data.peso ? data.peso + ' kg' : null) + '</table></div></div>';
}

// ══════════════════════════════════════════════════════════════════
//  MODIFICA / ELIMINA CLIENTE
// ══════════════════════════════════════════════════════════════════
function handleModificaCliente(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet  = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(sheet, email);
  if (rowIdx < 0) return jsonResponse({ success: false, error: 'Cliente non trovato' });
  const row = sheet.getRange(rowIdx, 1, 1, HDR_ANAMNESI.length).getValues()[0];
  if (data.nome)    row[3] = data.nome;
  if (data.cognome) row[4] = data.cognome;
  if (data.telefono !== undefined) row[8] = data.telefono;
  if (data.tipo) {
    if (data.tipo === 'Entrambi') row[2] = 'Entrambi';
    else if (data.tipo === 'Allenamento') row[2] = 'Manuale allenamento';
    else row[2] = 'Manuale nutrizionista';
  }
  if (data.obiettivo) row[70] = data.obiettivo;
  sheet.getRange(rowIdx, 1, 1, HDR_ANAMNESI.length).setValues([row]);
  return jsonResponse({ success: true });
}

function handleEliminaCliente(data) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const results = {};
  try { const sh = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI); const row = findRowByEmail(sh, email); if (row > 0) { sh.deleteRow(row); results.anamnesi = 'OK'; } else results.anamnesi = 'non trovato'; } catch(e) { results.anamnesi = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_MISURE, HDR_MISURE); eliminaRighePerEmail(sh, email, 1); results.misure = 'OK'; } catch(e) { results.misure = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_SCANSIONI, HDR_SCANSIONI); eliminaRighePerEmail(sh, email, 1); results.scansioni = 'OK'; } catch(e) { results.scansioni = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_VISITE, HDR_VISITE); eliminaRighePerEmail(sh, email, 1); results.visite = 'OK'; } catch(e) { results.visite = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_PAGAMENTI, HDR_PAGAMENTI); eliminaRighePerEmail(sh, email, 2); results.pagamenti = 'OK'; } catch(e) { results.pagamenti = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_FOLLOWUP_LOG, HDR_FOLLOWUP_LOG); eliminaRighePerEmail(sh, email, 1); results.followup_log = 'OK'; } catch(e) { results.followup_log = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_FOLLOWUP, HDR_FOLLOWUP); eliminaRighePerEmail(sh, email, 1); results.followup_risposte = 'OK'; } catch(e) { results.followup_risposte = 'errore: ' + e.message; }
  try { const ss = SpreadsheetApp.openById(SHEET_ID); const sh = ss.getSheetByName('Check_6_settimane'); if (sh) { eliminaRighePerEmail(sh, email, 4); results.check6 = 'OK'; } else results.check6 = 'foglio non trovato'; } catch(e) { results.check6 = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_COACHING, HDR_COACHING); eliminaRighePerEmail(sh, email, 1); results.coaching = 'OK'; } catch(e) { results.coaching = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_COACHING_RISPOSTE, HDR_COACHING_RISPOSTE); eliminaRighePerEmail(sh, email, 1); results.coaching_risposte = 'OK'; } catch(e) { results.coaching_risposte = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_SIFA, HDR_SIFA); eliminaRighePerEmail(sh, email, 1); results.sifa = 'OK'; } catch(e) { results.sifa = 'errore: ' + e.message; }
  try { const sh = getOrCreateSheet(SH_NOTE_NUTRI, HDR_NOTE_NUTRI); eliminaRighePerEmail(sh, email, 2); results.note_nutri = 'OK'; } catch(e) { results.note_nutri = 'errore: ' + e.message; }
  try { const sh = getOrCreatePortaleSheet(); eliminaRighePerEmail(sh, email, 0); results.portale = 'OK'; } catch(e) { results.portale = 'errore: ' + e.message; }
  try { const sh = getOrCreatePortaleNamedSheet(SH_CONSENSI, HDR_CONSENSI); eliminaRighePerEmail(sh, email, 0); results.consensi = 'OK'; } catch(e) { results.consensi = 'errore: ' + e.message; }
  try { const sh = getOrCreatePortaleNamedSheet(SH_MESSAGGI_COACH, HDR_MESSAGGI_COACH); eliminaRighePerEmail(sh, email, 0); results.messaggi_coach = 'OK'; } catch(e) { results.messaggi_coach = 'errore: ' + e.message; }
  try { const sh = getOrCreatePortaleNamedSheet(SH_CHECKIN_PORTALE, HDR_CHECKIN_PORTALE); eliminaRighePerEmail(sh, email, 0); results.checkin_portale = 'OK'; } catch(e) { results.checkin_portale = 'errore: ' + e.message; }
  console.log('Eliminazione ' + email + ': ' + JSON.stringify(results));
  return jsonResponse({ success: true, results: results });
}

function eliminaRighePerEmail(sheet, email, colIdx) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const vals = sheet.getRange(2, colIdx + 1, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).toLowerCase().trim() === email) sheet.deleteRow(i + 2);
  }
}

// ══════════════════════════════════════════════════════════════════
//  COACHING
// ══════════════════════════════════════════════════════════════════
const EMAIL_COACHING             = 'allenamento@neacea.com';
const FOLLOWUP_COACHING_META_URL = 'https://follow-up-m-coaching.netlify.app';
const FOLLOWUP_COACHING_FINE_URL = 'https://follow-up-f-coaching.netlify.app';
const SH_COACHING                = 'AtletiCoaching';
const SH_COACHING_RISPOSTE       = 'CoachingRisposte';
const HDR_COACHING = ['Timestamp','Email','Nome','Cognome','Telefono','Data nascita','Sesso','Obiettivo primario','Obiettivo secondario','Tempo obiettivo','Motivazione','Patologie','Condizioni','Farmaci','Allergie','Infortuni','Zone critiche','Esperienza','Frequenza','Tipologia allenamento','Esercizi preferiti','Livello','Aderenza allenamento','Massimali','Zone carenti','Tecniche','Autonomia','Max sedute','Tempo allenamento','Luogo','Split','Modalita alimentare','Calorie','Pasti','Aderenza alimentare','Preferenze alimentari','Gusto','Cucina','Pasto libero','Varieta','Avversioni','Integratori','Approccio','Digestione','Energia','Sonno','Stress','Malesseri','Disbiosi','Note','Privacy'];
const HDR_COACHING_RISPOSTE = ['Timestamp','Email','Nome','Token','Tipo','Aderenza','Stato generale','Energia','Sonno','Motivazione','Difficolta','Domanda','Peso inizio','Peso fine','Sedute preferite','Macros','Progressi','Esercizi migliorati','Esercizi deboli','Composizione','Fatica','Dolori','Energia allenamento','Energia giorno','Recupero','RPE','Sedute completate','Tempo sostenibile','Valuta progresso','Alim coerente','Sgarri','Quantita rispettate','Diff nutrizionali','Parte utile','Parte difficile','Suggerimenti'];

function handleNewAnamnesCoaching(data) {
  if (!data.email || !data.email.includes('@')) return jsonResponse({ success: false, error: 'Email non valida' });
  if (!data.nome || !data.cognome) return jsonResponse({ success: false, error: 'Nome e cognome obbligatori' });
  let id;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getOrCreateSheet(SH_COACHING, HDR_COACHING);
    id = 'ATL-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();
    const row = [new Date(),(data.email||'').toLowerCase(),data.nome||'',data.cognome||'',data.telefono||'',data.data_nascita||'',data.sesso||'',data.obiettivo_primario||'',data.obiettivo_secondario||'',data.tempo_obiettivo||'',data.motivazione||'',data.patologie||'',data.condizioni||'',data.farmaci||'',data.allergie||'',data.infortuni||'',data.zone_critiche||'',data.esperienza||'',data.frequenza||'',data.tipologia_allenamento||'',data.esercizi_preferiti||'',data.livello||'',data.aderenza_allenamento||'',data.massimali||'',data.zone_carenti||'',data.tecniche||'',data.autonomia||'',data.max_sedute||'',data.tempo_allenamento||'',data.luogo||'',data.split||'',data.modalita_alimentare||'',data.calorie||'',data.pasti||'',data.aderenza_alimentare||'',data.preferenze_alimentari||'',data.gusto||'',data.cucina||'',data.pasto_libero||'',data.varieta||'',data.avversioni||'',data.integratori||'',data.approccio||'',data.digestione||'',data.energia||'',data.sonno||'',data.stress||'',data.malesseri||'',data.disbiosi||'',data.note||'',data.privacy||''];
    sheet.appendRow(row);
    const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
    if (findRowByEmail(shA, data.email) < 0) shA.appendRow(buildRowAnamnesi({...data, tipo:'Allenamento'}, id, 'Form coaching'));
  } finally { lock.releaseLock(); }
  try { inviaEmailCoachingAnamnesi(data, id); } catch(e) { console.error('Email coaching:', e.message); }
  return jsonResponse({ success: true, id });
}

function handleFollowupCoachingMeta(data) {
  const email = (data.email||'').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_COACHING_RISPOSTE, HDR_COACHING_RISPOSTE);
  sheet.appendRow([new Date(),email,data.nome||'',data.token||'','meta',v(data.aderenza),data.stato_generale||'',data.energia||'',data.sonno||'',v(data.motivazione),data.difficolta||'',data.domanda||'','','','','','','','','','','','','','','','','','','','','','','','','']);
  try { MailApp.sendEmail(EMAIL_COACHING, '[Neacea Coaching] Check-in meta piano - '+(data.nome||email), '', { htmlBody: buildMailCoachingMeta(data), name: 'Neacea Studio' }); } catch(e) { console.error(e.message); }
  return jsonResponse({ success: true });
}

function handleFollowupCoachingFine(data) {
  const email = (data.email||'').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_COACHING_RISPOSTE, HDR_COACHING_RISPOSTE);
  sheet.appendRow([new Date(),email,data.nome||'',data.token||'','fine_blocco','','','','','','','',v(data.peso_inizio),v(data.peso_fine),v(data.sedute_preferite),data.macros||'',data.progressi||'',data.esercizi_migliorati||'',data.esercizi_deboli||'',data.composizione||'',v(data.fatica),data.dolori||'',data.energia_allenamento||'',data.energia_giorno||'',data.recupero||'',data.rpe||'',data.sedute_completate||'',data.tempo_sostenibile||'',v(data.valuta_progresso),data.alim_coerente||'',data.sgarri||'',data.quantita_rispettate||'',data.diff_nutrizionali||'',data.parte_utile||'',data.parte_difficile||'',data.suggerimenti||'']);
  try { MailApp.sendEmail(EMAIL_COACHING, '[Neacea Coaching] Fine piano - '+(data.nome||email), '', { htmlBody: buildMailCoachingFine(data), name: 'Neacea Studio' }); } catch(e) { console.error(e.message); }
  return jsonResponse({ success: true });
}

function handleInviaFollowupCoaching(data) {
  const email = (data.email||'').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const tipo = data.tipo || 'meta';
  const msgCustom = data.messaggio_custom || '';
  const shA = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const rowIdx = findRowByEmail(shA, email);
  let nome = email;
  if (rowIdx > 0) { const vals = shA.getRange(rowIdx,1,1,5).getValues()[0]; nome = ((vals[3]||'') + ' ' + (vals[4]||'')).trim()||email; }
  const token     = Utilities.getUuid();
  const emailSafe = email.replace('@','--at--');
  const baseUrl   = tipo==='fine' ? FOLLOWUP_COACHING_FINE_URL : FOLLOWUP_COACHING_META_URL;
  const checkInUrl = baseUrl+'?e='+emailSafe+'&t='+token+'&n='+encodeURIComponent(nome)+(msgCustom?'&m='+encodeURIComponent(msgCustom):'');
  const subject = tipo==='fine' ? 'Questionario di fine piano - Neacea Studio' : 'Check-in di meta percorso - Neacea Studio';
  MailApp.sendEmail(email, subject, '', { htmlBody: buildMailFollowupCoaching(nome, checkInUrl, tipo, msgCustom), name: 'Neacea Studio' });
  logFollowupInviato(email, nome, tipo, 'coaching');
  return jsonResponse({ success: true, checkInUrl });
}

function handleGetCoachingRisposte() {
  const sheet = getOrCreateSheet(SH_COACHING_RISPOSTE, HDR_COACHING_RISPOSTE);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, risposte: [] });
  const rows = sheet.getRange(2, 1, last-1, HDR_COACHING_RISPOSTE.length).getValues();
  const risposte = rows.filter(r=>r[1]).map(r=>({timestamp:r[0]?new Date(r[0]).toISOString():'',email:r[1],nome:r[2],tipo:r[4],aderenza:r[5],stato:r[6],energia:r[7],sonno:r[8],motivazione:r[9],difficolta:r[10],domanda:r[11],peso_inizio:r[12],peso_fine:r[13],progressi:r[16],fatica:r[20],valuta:r[28],parte_utile:r[33],suggerimenti:r[35]})).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  return jsonResponse({ success: true, risposte });
}

function inviaEmailCoachingAnamnesi(data, id) {
  const nome = ((data.nome||'')+ ' ' +(data.cognome||'')).trim();
  function r(label, val) { if (!val||!String(val).trim()) return ''; return '<tr style="border-bottom:1px solid #f5e8e8;"><td style="padding:9px 14px;font-size:13px;font-weight:700;color:#3a0f0f;width:42%;">'+label+'</td><td style="padding:9px 14px;font-size:13px;color:#444;">'+escapeHtml(String(val)).replace(/\n/g,'<br>')+'</td></tr>'; }
  function sez(titolo, righe) { if (!righe.trim()) return ''; return '<div style="margin-bottom:22px;"><div style="font-size:11px;font-weight:700;color:#6b1f1f;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #f5e8e8;">'+titolo+'</div><table style="width:100%;border-collapse:collapse;">'+righe+'</table></div>'; }
  const corpo = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;background:#fff;">'
    + '<div style="background:#3a0f0f;padding:24px 28px;border-radius:10px 10px 0 0;"><div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:10px;">Neacea Studio &mdash; Coaching</div><div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px;">'+escapeHtml(nome)+'</div><div style="font-size:12px;color:rgba(255,255,255,.5);">'+escapeHtml(data.email||'')+'</div></div>'
    + '<div style="padding:24px 28px;">'+sez('Obiettivo', r('Obiettivo primario',data.obiettivo_primario)+r('Motivazione',data.motivazione?data.motivazione+'/10':''))+sez('Allenamento', r('Esperienza',data.esperienza)+r('Livello',data.livello)+r('Split',data.split)+r('Luogo',data.luogo))+sez('Alimentazione', r('Modalit&agrave;',data.modalita_alimentare)+r('Integratori',data.integratori))+'</div>'
    + '<div style="background:#fdf2f2;padding:12px 28px;border-radius:0 0 10px 10px;font-size:11px;color:#999;text-align:center;">Neacea Studio Coaching &mdash; allenamento@neacea.com</div></div>';
  MailApp.sendEmail(EMAIL_COACHING, '[Neacea Coaching] Nuova anamnesi - '+nome, '', { htmlBody: corpo, name: 'Neacea Studio' });
  if (data.email) {
    const htmlAtleta = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;"><div style="background:#3a0f0f;padding:32px 28px;border-radius:10px 10px 0 0;"><div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Ciao '+(data.nome||'')+', la tua scheda &egrave; arrivata!</div></div><div style="padding:28px;border:1px solid #f0e0e0;border-top:none;border-radius:0 0 10px 10px;"><div style="border-left:3px solid #c9a84c;padding:12px 16px;background:#fffbf2;font-size:13px;color:#6b4f10;"><strong>Cosa succede adesso?</strong> Il tuo coach esaminer&agrave; le tue risposte.</div></div><div style="padding:14px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio &mdash; allenamento@neacea.com</div></div>';
    MailApp.sendEmail(data.email, 'Protocollo ricevuto - Neacea Studio', '', { htmlBody: htmlAtleta, name: 'Neacea Studio' });
  }
}

function buildMailCoachingMeta(data) {
  const aderenza = data.aderenza || '?';
  const barPct = Math.min(100, parseInt(aderenza)*10);
  function r(label, val) { if (!val) return ''; return '<tr><td style="padding:7px 12px;font-size:12px;font-weight:700;color:#666;width:38%;">'+label+'</td><td style="padding:7px 12px;font-size:13px;color:#3a0f0f;">'+escapeHtml(String(val))+'</td></tr>'; }
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;"><div style="background:#3a0f0f;padding:20px 24px;border-radius:10px 10px 0 0;"><div style="font-size:18px;font-weight:700;color:#fff;">Check-in met&agrave; piano &mdash; '+escapeHtml(data.nome||data.email)+'</div><div style="font-size:12px;color:rgba(255,255,255,.5);">'+escapeHtml(data.email)+'</div></div><div style="padding:20px 24px;border:1px solid #f0e0e0;border-top:none;"><div style="font-size:24px;font-weight:800;color:#3a0f0f;margin-bottom:6px;">'+escapeHtml(String(aderenza))+' / 10</div><div style="height:8px;background:#f5e8e8;border-radius:4px;overflow:hidden;"><div style="height:100%;background:#3a0f0f;width:'+barPct+'%;"></div></div><table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #f5e8e8;">'+r('Stato',data.stato_generale)+r('Energia',data.energia)+r('Sonno',data.sonno)+r('Motivazione',data.motivazione?data.motivazione+'/10':null)+r('Difficolt&agrave;',data.difficolta)+r('Domanda',data.domanda)+'</table></div></div>';
}

function buildMailCoachingFine(data) {
  const nome = data.nome || data.email;
  function r(label, val) { if (!val && val!==0) return ''; return '<tr><td style="padding:7px 12px;font-size:12px;font-weight:700;color:#666;width:38%;">'+label+'</td><td style="padding:7px 12px;font-size:13px;color:#3a0f0f;">'+escapeHtml(String(val)).replace(/\n/g,'<br>')+'</td></tr>'; }
  function sez(titolo, righe) { if (!righe.trim()) return ''; return '<div style="margin-bottom:18px;"><div style="font-size:11px;font-weight:700;color:#6b1f1f;text-transform:uppercase;margin-bottom:6px;padding-bottom:5px;border-bottom:1px solid #f5e8e8;">'+titolo+'</div><table style="width:100%;border-collapse:collapse;">'+righe+'</table></div>'; }
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;"><div style="background:#3a0f0f;padding:20px 24px;border-radius:10px 10px 0 0;"><div style="font-size:18px;font-weight:700;color:#fff;">Fine piano &mdash; '+escapeHtml(nome)+'</div><div style="font-size:12px;color:rgba(255,255,255,.5);">'+escapeHtml(data.email)+'</div></div><div style="padding:20px 24px;border:1px solid #f0e0e0;border-top:none;">'+sez('Dati corporei', r('Peso inizio',data.peso_inizio?data.peso_inizio+' kg':null)+r('Peso fine',data.peso_fine?data.peso_fine+' kg':null)+r('Composizione',data.composizione))+sez('Performance', r('Progressi',data.progressi)+r('Esercizi migliorati',data.esercizi_migliorati))+sez('Feedback', r('Parte utile',data.parte_utile)+r('Suggerimenti',data.suggerimenti))+'</div></div>';
}

function buildMailFollowupCoaching(nome, url, tipo, msgCustom) {
  const nomeBreve = escapeHtml(nome.split(' ')[0]);
  const msgSafe   = escapeHtml(msgCustom).replace(/\n/g, '<br>');
  const isFine = tipo === 'fine';
  const titolo = isFine ? 'Il tuo piano &egrave; finito, '+nomeBreve+' &mdash; raccontami com\'&egrave; andata' : 'Ciao '+nomeBreve+' &mdash; siamo a met&agrave; strada';
  const cta    = isFine ? 'Compila il questionario' : 'Invia il check-in';
  const btnCol = isFine ? '#c9a84c' : '#3a0f0f';
  const txtCol = isFine ? '#1a2000' : 'white';
  return '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;"><div style="background:#3a0f0f;padding:32px 28px;border-radius:10px 10px 0 0;"><div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">'+titolo+'</div></div><div style="padding:28px;border:1px solid #f0e0e0;border-top:none;">'+(msgCustom ? '<div style="background:#fffbf2;border-left:3px solid #c9a84c;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px;color:#7a5a10;line-height:1.7;margin-bottom:20px;"><strong>Dal tuo coach</strong><br>'+msgSafe+'</div>' : '')+'<div style="text-align:center;margin:28px 0;"><a href="'+url+'" style="display:inline-block;background:'+btnCol+';color:'+txtCol+';padding:16px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">'+cta+'</a></div></div><div style="padding:14px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio &mdash; allenamento@neacea.com</div></div>';
}

// ══════════════════════════════════════════════════════════════════
//  TRIGGER GIORNALIERO — solo check pre-visita (giorniAScad === 1)
// ══════════════════════════════════════════════════════════════════
function triggerGiornaliero() {
  console.log('=== Trigger giornaliero: ' + new Date().toLocaleString('it-IT') + ' ===');
  const shA   = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const shV   = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastA = shA.getLastRow();
  if (lastA < 2) { console.log('Nessun cliente.'); return; }
  const clienti   = shA.getRange(2, 1, lastA - 1, 9).getValues();
  const visitaMap = {};
  const lastV = shV.getLastRow();
  if (lastV >= 2) {
    const visite = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    visite.forEach(vv => { const em = String(vv[1]).toLowerCase(); const tipo = String(vv[8]||'nutrizione').toLowerCase(); if (!visitaMap[em]) visitaMap[em] = {}; if (!visitaMap[em][tipo] || new Date(vv[2]) > new Date(visitaMap[em][tipo].data)) visitaMap[em][tipo] = { data: vv[2], durata: vv[7] ? parseInt(vv[7]) : 6 }; });
  }
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  clienti.forEach(row => {
    const email = String(row[7]||'').toLowerCase().trim();
    if (!email) return;
    const fonte       = String(row[2]||'');
    const tipoCliente = fonte==='Form coaching'||fonte==='Manuale allenamento' ? 'allenamento' : fonte==='Entrambi' ? 'entrambi' : 'nutrizione';
    const map = visitaMap[email] || {};
    if (tipoCliente === 'nutrizione' || tipoCliente === 'entrambi') {
      const vN = map['nutrizione'];
      if (vN && vN.data) {
        const dataV = new Date(vN.data); dataV.setHours(0,0,0,0);
        const durata = vN.durata || 6;
        const giorniAScad = Math.round((dataV.getTime() + durata*7*86400000 - oggi.getTime()) / 86400000);
        if (giorniAScad === 1 && !followupGiaInviatoOggi(email, 'check_percorso', 'nutrizione')) {
          try { handleInviaCheckPercorso({ email }); } catch(e) { console.error(e.message); }
        }
      }
    }
  });
  console.log('=== Trigger giornaliero completato ===');
}

// ══════════════════════════════════════════════════════════════════
//  TRIGGER LUNEDÌ — check 3 settimane nutrizione + metà piano coaching
// ══════════════════════════════════════════════════════════════════
function triggerLunedi() {
  console.log('=== Trigger lunedì: ' + new Date().toLocaleString('it-IT') + ' ===');
  const shA   = getOrCreateSheet(SH_ANAMNESI, HDR_ANAMNESI);
  const shV   = getOrCreateSheet(SH_VISITE, HDR_VISITE);
  const lastA = shA.getLastRow();
  if (lastA < 2) { console.log('Nessun cliente.'); return; }
  const clienti   = shA.getRange(2, 1, lastA - 1, 9).getValues();
  const visitaMap = {};
  const lastV = shV.getLastRow();
  if (lastV >= 2) {
    const visite = shV.getRange(2, 1, lastV - 1, Math.min(9, shV.getLastColumn())).getValues();
    visite.forEach(vv => { const em = String(vv[1]).toLowerCase(); const tipo = String(vv[8]||'nutrizione').toLowerCase(); if (!visitaMap[em]) visitaMap[em] = {}; if (!visitaMap[em][tipo] || new Date(vv[2]) > new Date(visitaMap[em][tipo].data)) visitaMap[em][tipo] = { data: vv[2], durata: vv[7] ? parseInt(vv[7]) : 6 }; });
  }
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  clienti.forEach(row => {
    const email = String(row[7]||'').toLowerCase().trim();
    if (!email) return;
    const fonte       = String(row[2]||'');
    const tipoCliente = fonte==='Form coaching'||fonte==='Manuale allenamento' ? 'allenamento' : fonte==='Entrambi' ? 'entrambi' : 'nutrizione';
    const map = visitaMap[email] || {};
    if (tipoCliente === 'nutrizione' || tipoCliente === 'entrambi') {
      const vN = map['nutrizione'];
      if (vN && vN.data) {
        const dataV = new Date(vN.data); dataV.setHours(0,0,0,0);
        const giorniDalla = Math.round((oggi - dataV) / 86400000);
        if (giorniDalla >= 19 && giorniDalla <= 23 && !followupGiaInviatoOggi(email, 'followup', 'nutrizione')) {
          try { handleInviaFollowup({ email, tipo:'followup' }); } catch(e) { console.error(e.message); }
        }
      }
    }
    if (tipoCliente === 'allenamento' || tipoCliente === 'entrambi') {
      const vC = map['coaching'] || map['nutrizione'];
      if (vC && vC.data) {
        const dataV = new Date(vC.data); dataV.setHours(0,0,0,0);
        const durata = vC.durata || 6;
        const giorniDalla = Math.round((oggi - dataV) / 86400000);
        const metaPiano = Math.round(durata * 7 / 2);
        if (giorniDalla >= metaPiano - 2 && giorniDalla <= metaPiano + 2 && !followupGiaInviatoOggi(email, 'meta', 'coaching')) {
          try { handleInviaFollowupCoaching({ email, tipo:'meta' }); } catch(e) { console.error(e.message); }
        }
      }
    }
  });
  console.log('=== Trigger lunedì completato ===');
}

// ══════════════════════════════════════════════════════════════════
//  TRIGGER LUNEDÌ — reminder portale a tutti i clienti attivi
// ══════════════════════════════════════════════════════════════════
function triggerReminderPortaleLunedi() {
  console.log('=== Trigger reminder portale lunedì: ' + new Date().toLocaleString('it-IT') + ' ===');
  const shP = getOrCreatePortaleSheet();
  const last = shP.getLastRow();
  if (last < 2) {
    console.log('Nessun cliente con portale.');
    return;
  }

  const rows = shP.getRange(2, 1, last - 1, Math.max(5, shP.getLastColumn())).getValues();
  let inviati = 0;
  let saltati = 0;
  let errori = 0;

  rows.forEach(r => {
    const email = String(r[0] || '').toLowerCase().trim();
    const attivo = r[3] === true || String(r[3]).toUpperCase() === 'TRUE';
    if (!email || !attivo) return;

    if (followupGiaInviatoOggi(email, 'reminder_portale', 'portale')) {
      saltati++;
      return;
    }

    try {
      handleInviaReminderPortale({ email: email });
      inviati++;
    } catch(e) {
      errori++;
      console.error('Reminder portale non inviato a ' + email + ': ' + e.message);
    }
  });

  console.log('Reminder portale lunedì completato. Inviati: ' + inviati + ', saltati: ' + saltati + ', errori: ' + errori);
}

// ══════════════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════════════
function getOrCreatePortaleNamedSheet(name, headers) {
  const ss = SpreadsheetApp.openById(PORTALE_SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    setupHeaders(sheet, headers);
  } else if (sheet.getLastRow() === 0) {
    setupHeaders(sheet, headers);
  }
  return sheet;
}

function getOrCreatePortaleSheet() {
  const ss = SpreadsheetApp.openById(PORTALE_SHEET_ID);
  let sheet = ss.getSheetByName(SH_PORTALE);
  if (!sheet) {
    sheet = ss.insertSheet(SH_PORTALE);
    setupHeaders(sheet, HDR_PORTALE);
  } else if (sheet.getLastRow() === 0) {
    setupHeaders(sheet, HDR_PORTALE);
  }
  return sheet;
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); setupHeaders(sheet, headers); }
  else if (sheet.getLastRow() === 0) { setupHeaders(sheet, headers); }
  return sheet;
}

function setupHeaders(sheet, headers) {
  sheet.appendRow(headers);
  const r = sheet.getRange(1, 1, 1, headers.length);
  r.setBackground('#1a3a2a').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10).setWrap(false);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(Math.min(2, headers.length));
  sheet.setColumnWidth(1, 150);
  if (headers.length > 1) sheet.setColumnWidth(2, 200);
  for (let c = 3; c <= headers.length; c++) sheet.setColumnWidth(c, 150);
  sheet.getRange(1, 1, 1, headers.length).createFilter();
}

function findRowByEmail(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const emails = sheet.getRange(2, 8, last - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).toLowerCase().trim() === String(email).toLowerCase().trim()) return i + 2;
  }
  return -1;
}

function generateId() { return 'PAZ-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase(); }

function buildRowAnamnesi(data, id, fonte) {
  return [new Date(data.timestamp || new Date()), id, fonte, data.nome||'', data.cognome||'', data.data_nascita||'', data.sesso||'', (data.email||'').toLowerCase(), data.telefono||'', data.codice_fiscale||'', data.professione||'', data.altezza||'', data.peso_attuale||'', data.peso_obiettivo||'', data.sport||'', data.sport_tipo||'', data.ore_sport_settimana||'', data.tipo_lavoro||'', data.ore_sonno||'', data.qualita_sonno||'', data.risvegli_notturni||'', data.passi_giornalieri||'', data.livello_sedentario||'', data.stress||'', data.chi_cucina||'', data.pasti_fuori||'', data.orari_pasti||'', data.lavoro_turni||'', data.weekend_diverso||'', data.pasti_giorno||'', data.acqua_giornaliera||'', data.colazione||'', data.regime_alimentare||'', data.alimenti_avversioni||'', data.alimenti_preferiti||'', data.consumo_alcol||'', data.celiachia||'', data.allergia_alimentare||'', data.allergia_alimentare_altro||'', data.intolleranza||'', data.intolleranza_altro||'', data.diete_precedenti||'', data.cosa_ha_funzionato||'', data.cosa_non_ha_funzionato||'', data.motivo_abbandono||'', data.aderenza_passata||'', data.fame_mattino||'', data.fame_sera||'', data.attacchi_fame||'', data.fame_nervosa||'', data.perdita_controllo||'', data.rapporto_dolci||'', data.situazioni_trigger||'', data.gonfiore||'', data.pesantezza_post_prandiale||'', data.reflusso||'', data.alvo_regolare||'', data.frequenza_evacuazioni||'', data.consistenza_feci||'', data.patologie_diagnosticate||'', data.patologie_diagnosticate_altro||'', data.sintomi_riferiti||'', data.sintomi_riferiti_altro||'', data.condizioni_sospette||'', data.farmaci_attuali||'', data.integratori_attuali||'', data.peso_massimo||'', data.peso_minimo||'', data.durata_problema_peso||'', data.variazioni_recenti||'', data.obiettivo_principale||'', data.obiettivo_secondario||'', data.motivazione||'', data.problema_principale_percepito||'', data.tempo_disponibile||'', data.disponibilita_cambiamento||'', data.gi_sintomi||'', data.gi_diagnosi||'', data.gi_trigger_alimentari||'', data.gi_dieta_terapeutica||'', data.ormoni_diagnosi||'', data.ormoni_terapia||'', data.ormoni_note||'', data.met_diagnosi||'', data.met_monitoraggio||'', data.met_farmaci||'', data.met_hba1c||'', data.met_note||'', data.cel_tipo||'', data.cel_data||'', data.cel_dieta||'', data.cel_note||'', (data.analisi_file && data.analisi_file.length > 100 ? '[allegato]' : ''), data.privacy||'', data.note||'', data.note_nutrizionista||''];
}

function updateRowAnamnesi(sheet, rowIdx, data, id, fonte) {
  const row = buildRowAnamnesi(data, id, fonte);
  sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
}

function testDiagnosticaPortaleCliente() {
  const email = 'INSERISCI_EMAIL_CLIENTE';
  const res = handleDiagnosticaPortaleCliente({ email: email });
  Logger.log(res.getContent());
}

function getOrCreateFolder(name) { const f = DriveApp.getFoldersByName(name); return f.hasNext() ? f.next() : DriveApp.createFolder(name); }
function getOrCreateSubfolder(parent, name) { const f = parent.getFoldersByName(name); return f.hasNext() ? f.next() : parent.createFolder(name); }
function v(val) { if (val === null || val === undefined || val === '') return ''; const n = parseFloat(val); return isNaN(n) ? val : n; }
function formatDate(val) { if (!val) return ''; try { const d = new Date(val); if (isNaN(d.getTime())) return String(val); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); } catch(e) { return String(val); } }
function formatTelefono(val) { if (!val) return ''; const s = String(val); if (s.includes('ERROR') || s.includes('#')) return ''; return s; }
function jsonResponse(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function formatDataRow(sheet, rowNum, numCols) { const r = sheet.getRange(rowNum, 1, 1, numCols); r.setWrap(true).setVerticalAlignment('top'); r.setBackground(rowNum % 2 === 0 ? '#f2f6f3' : '#ffffff'); }
function riformattaFoglio(sheetName) { const ss = SpreadsheetApp.openById(SHEET_ID); const sheet = ss.getSheetByName(sheetName); if (!sheet || sheet.getLastRow() < 2) return; const last = sheet.getLastRow(); const numCols = sheet.getLastColumn(); sheet.getRange(2, 1, last - 1, numCols).setWrap(true).setVerticalAlignment('top'); for (let i = 2; i <= last; i += 2) { sheet.getRange(i, 1, 1, numCols).setBackground('#f2f6f3'); } for (let i = 3; i <= last; i += 2) { sheet.getRange(i, 1, 1, numCols).setBackground('#ffffff'); } }
// ensureColumn e escapeHtml definite sopra nella sezione FOLLOW-UP LOG

// ══════════════════════════════════════════════════════════════════
//  SIFA
// ══════════════════════════════════════════════════════════════════
const SH_SIFA  = 'SifaPiani';
const HDR_SIFA = ['Timestamp','Email','Data piano','Kcal','Proteine (g)','Proteine (%)','Carboidrati (g)','Carboidrati (%)','Lipidi (g)','Lipidi (%)','Fibre (g)','Fibre (%)','Nome file'];

function handleAddSifaPiano(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_SIFA, HDR_SIFA);
  sheet.appendRow([new Date(),data.email.toLowerCase(),data.data_piano?new Date(data.data_piano):new Date(),v(data.kcal),v(data.proteine_g),v(data.proteine_pct),v(data.carboidrati_g),v(data.carboidrati_pct),v(data.lipidi_g),v(data.lipidi_pct),v(data.fibre_g),v(data.fibre_pct),data.nome_file||'']);
  return jsonResponse({ success: true });
}

function handleGetSifaPiani(data) {
  const email = (data.email||'').toLowerCase().trim();
  if (!email) return jsonResponse({ success: false, error: 'Email mancante' });
  const sheet = getOrCreateSheet(SH_SIFA, HDR_SIFA);
  const last  = sheet.getLastRow();
  if (last < 2) return jsonResponse({ success: true, piani: [] });
  const rows  = sheet.getRange(2, 1, last-1, HDR_SIFA.length).getValues();
  const piani = rows.filter(r=>String(r[1]).toLowerCase()===email).map(r=>({timestamp:r[0]?new Date(r[0]).toISOString():'',data_piano:r[2]?new Date(r[2]).toISOString().split('T')[0]:'',kcal:r[3],proteine_g:r[4],proteine_pct:r[5],carboidrati_g:r[6],carboidrati_pct:r[7],lipidi_g:r[8],lipidi_pct:r[9],fibre_g:r[10],fibre_pct:r[11],nome_file:r[12]})).sort((a,b)=>new Date(b.data_piano)-new Date(a.data_piano));
  return jsonResponse({ success: true, piani });
}

// ══════════════════════════════════════════════════════════════════
//  SALVA REPORT ESAMI SU DRIVE
// ══════════════════════════════════════════════════════════════════
function handleSalvaReportEsami(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.report) return jsonResponse({ success: false, error: 'Report mancante' });
  try {
    const email      = data.email.toLowerCase().trim();
    const filename   = data.filename || 'esami_' + new Date().toISOString().split('T')[0] + '.pdf';
    const dataReport = data.data || new Date().toISOString().split('T')[0];
    const nomeFile   = 'report_esami_' + dataReport + '_' + filename.replace(/[^a-zA-Z0-9._-]/g, '_') + '.html';
    const safeReport = escapeHtml(data.report)
      .replace(/## (.+)/g, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/↑/g, '<span class="up">↑</span>')
      .replace(/↓/g, '<span class="down">↓</span>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    const htmlContent = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Report Esami — ${escapeHtml(email)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#1a2820;background:#f4f8f5}.header{background:#1a3a2a;color:white;padding:24px 28px;border-radius:10px 10px 0 0}.content{background:white;padding:28px;border-radius:0 0 10px 10px;border:1px solid #e0ece6;border-top:none;line-height:1.8;font-size:14px}h3{font-size:13px;font-weight:800;color:#1a3a2a;text-transform:uppercase}.up{color:#c0392b;font-weight:700}.down{color:#2980b9;font-weight:700}.footer{text-align:center;font-size:11px;color:#8fa89a;padding:12px 0}</style></head><body><div class="header"><h1>Report Esami del Sangue</h1><p>${escapeHtml(email)} · ${dataReport} · ${escapeHtml(filename)}</p></div><div class="content">${safeReport}</div><div class="footer">Neacea Studio — nutrizione@neacea.com — Documento riservato</div></body></html>`;
    const rootFolder   = getOrCreateFolder(FOTO_FOLDER_NAME);
    const clientFolder = getOrCreateSubfolder(rootFolder, email);
    const esamiEx      = clientFolder.getFoldersByName('esami');
    const esamiFolder  = esamiEx.hasNext() ? esamiEx.next() : clientFolder.createFolder('esami');
    const blob = Utilities.newBlob(htmlContent, 'text/html', nomeFile);
    const file = esamiFolder.createFile(blob);
    return jsonResponse({ success: true, url: file.getUrl(), filename: nomeFile });
  } catch(err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ══════════════════════════════════════════════════════════════════
//  EMAIL AL PROFESSIONISTA (nuova anamnesi)
// ══════════════════════════════════════════════════════════════════
function inviaEmailProfessionista(data, id) {
  const dest = EMAIL_PROFESSIONISTA || Session.getActiveUser().getEmail();
  const nome = ((data.nome||'') + ' ' + (data.cognome||'')).trim();
  const ts   = new Date().toLocaleString('it-IT');
  function val(v) { return (v && String(v).trim()) ? String(v).trim() : null; }
  function riga2(l1, v1, l2, v2) {
    const c1 = val(v1) ? '<td style="width:25%;padding:7px 10px;font-size:11px;font-weight:700;color:#5a7a68;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;">'+l1+'</td><td style="width:25%;padding:7px 10px;font-size:13px;color:#1a2820;vertical-align:top;">'+escapeHtml(String(v1))+'</td>' : '<td colspan="2" style="width:50%;"></td>';
    const c2 = val(v2) ? '<td style="width:25%;padding:7px 10px;font-size:11px;font-weight:700;color:#5a7a68;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;">'+l2+'</td><td style="width:25%;padding:7px 10px;font-size:13px;color:#1a2820;vertical-align:top;">'+escapeHtml(String(v2))+'</td>' : '<td colspan="2" style="width:50%;"></td>';
    if (!val(v1) && !val(v2)) return '';
    return '<tr style="border-bottom:1px solid #f0f5f2;">'+c1+c2+'</tr>';
  }
  function rigaFull(label, valore) { if (!val(valore)) return ''; return '<tr style="border-bottom:1px solid #f0f5f2;"><td style="width:28%;padding:7px 10px;font-size:11px;font-weight:700;color:#5a7a68;text-transform:uppercase;letter-spacing:.05em;vertical-align:top;">'+label+'</td><td style="padding:7px 10px;font-size:13px;color:#1a2820;line-height:1.5;">'+escapeHtml(String(valore)).replace(/\n/g,'<br>')+'</td></tr>'; }
  function card(titolo, contenuto) { if (!contenuto || !contenuto.trim()) return ''; return '<div style="margin-bottom:20px;border:1px solid #e0ece6;border-radius:10px;overflow:hidden;"><div style="background:#f0f7f3;padding:10px 16px;border-bottom:1px solid #e0ece6;"><span style="font-size:11px;font-weight:700;color:#1a3a2a;text-transform:uppercase;letter-spacing:.1em;">'+titolo+'</span></div><table style="width:100%;border-collapse:collapse;background:#ffffff;">'+contenuto+'</table></div>'; }
  function cardRossa(titolo, contenuto) { if (!contenuto || !contenuto.trim()) return ''; return '<div style="margin-bottom:20px;border:1px solid #f0d8d8;border-radius:10px;overflow:hidden;"><div style="background:#fdf2f2;padding:10px 16px;border-bottom:1px solid #f0d8d8;"><span style="font-size:11px;font-weight:700;color:#8b2020;text-transform:uppercase;letter-spacing:.1em;">'+titolo+'</span></div><table style="width:100%;border-collapse:collapse;background:#ffffff;">'+contenuto+'</table></div>'; }
  function metrica(label, valore) { return '<td style="text-align:center;padding:14px 8px;background:#f0f7f3;border:1px solid #e0ece6;border-radius:8px;margin:4px;"><div style="font-size:20px;font-weight:800;color:#1a3a2a;">'+valore+'</div><div style="font-size:10px;font-weight:700;color:#5a7a68;text-transform:uppercase;letter-spacing:.08em;margin-top:4px;">'+label+'</div></td><td style="width:6px;"></td>'; }
  const altezza = val(data.altezza) ? data.altezza + ' cm' : '&mdash;';
  const pesoAtt = val(data.peso_attuale) ? data.peso_attuale + ' kg' : '&mdash;';
  const pesoOb  = val(data.peso_obiettivo) ? data.peso_obiettivo + ' kg' : '&mdash;';
  const motivaz = val(data.motivazione) ? data.motivazione + '/10' : '&mdash;';
  const bmi     = (val(data.altezza) && val(data.peso_attuale)) ? (parseFloat(data.peso_attuale) / Math.pow(parseFloat(data.altezza)/100, 2)).toFixed(1) : '&mdash;';
  const hero = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>'+metrica('Altezza',altezza)+metrica('Peso attuale',pesoAtt)+metrica('Peso obiettivo',pesoOb)+metrica('BMI stimato',bmi)+metrica('Motivazione',motivaz)+'</tr></table>';
  const sAnagrafica    = card('Anagrafica', riga2('Nome',nome,'Data nascita',data.data_nascita)+riga2('Sesso',data.sesso,'Email',data.email)+riga2('Telefono',data.telefono,'Professione',data.professione));
  const sObiettivo     = card('Obiettivo e Motivazione', rigaFull('Obiettivo principale',data.obiettivo_principale)+rigaFull('Obiettivo secondario',data.obiettivo_secondario)+rigaFull('Problema percepito',data.problema_principale_percepito)+riga2('Disponibilit&agrave;',data.disponibilita_cambiamento,'Tempo disponibile',data.tempo_disponibile));
  const sStile         = card('Stile di vita', riga2('Sport',data.sport,'Tipo sport',data.sport_tipo)+riga2('Ore sport/sett.',data.ore_sport_settimana,'Tipo lavoro',data.tipo_lavoro)+riga2('Ore sonno',data.ore_sonno,'Qualit&agrave; sonno',data.qualita_sonno)+riga2('Risvegli notturni',data.risvegli_notturni,'Passi/giorno',data.passi_giornalieri)+riga2('Sedentariet&agrave;',data.livello_sedentario,'Stress (1-10)',data.stress));
  const sAlimentazione = card('Alimentazione', riga2('Regime',data.regime_alimentare,'Colazione',data.colazione)+riga2('Pasti/giorno',data.pasti_giorno,'Acqua',data.acqua_giornaliera)+riga2('Pasti fuori',data.pasti_fuori,'Consumo alcol',data.consumo_alcol)+riga2('Chi cucina',data.chi_cucina,'Lavoro turni',data.lavoro_turni)+rigaFull('Alimenti preferiti',data.alimenti_preferiti)+rigaFull('Avversioni',data.alimenti_avversioni));
  const sComportamento = card('Comportamento alimentare', riga2('Fame mattino',data.fame_mattino,'Fame sera',data.fame_sera)+riga2('Attacchi fame',data.attacchi_fame,'Fame nervosa',data.fame_nervosa)+riga2('Perdita controllo',data.perdita_controllo,'Rapporto dolci',data.rapporto_dolci)+rigaFull('Situazioni trigger',data.situazioni_trigger));
  const sDigestione    = card('Digestione e Alvo', riga2('Gonfiore',data.gonfiore,'Pesantezza',data.pesantezza_post_prandiale)+riga2('Reflusso',data.reflusso,'Alvo regolare',data.alvo_regolare)+riga2('Freq. evacuazioni',data.frequenza_evacuazioni,'Scala Bristol',data.consistenza_feci));
  const sAllergie      = card('Allergie e Intolleranze', riga2('Celiachia',data.celiachia,'Allergie',data.allergia_alimentare)+riga2('Allergie (altro)',data.allergia_alimentare_altro,'Intolleranze',data.intolleranza)+rigaFull('Intolleranze (altro)',data.intolleranza_altro));
  const sCliniche      = cardRossa('Clinica', rigaFull('Patologie diagnosticate',data.patologie_diagnosticate||data.patologie_diagnosticate_altro)+rigaFull('Sintomi riferiti',data.sintomi_riferiti)+rigaFull('Condizioni sospette',data.condizioni_sospette)+rigaFull('Farmaci attuali',data.farmaci_attuali)+rigaFull('Integratori attuali',data.integratori_attuali));
  const sStoriaNutr    = card('Storia nutrizionale', rigaFull('Diete precedenti',data.diete_precedenti)+rigaFull('Cosa ha funzionato',data.cosa_ha_funzionato)+rigaFull('Cosa NON ha funzionato',data.cosa_non_ha_funzionato)+rigaFull('Motivo abbandono',data.motivo_abbandono)+rigaFull('Aderenza passata',data.aderenza_passata)+riga2('Peso massimo',val(data.peso_massimo)?data.peso_massimo+' kg':null,'Peso minimo',val(data.peso_minimo)?data.peso_minimo+' kg':null)+riga2('Durata problema',data.durata_problema_peso,'Variazioni recenti',data.variazioni_recenti));
  const sGI            = (val(data.gi_sintomi)||val(data.gi_diagnosi)) ? cardRossa('Sezione GI', rigaFull('Sintomi GI',data.gi_sintomi)+rigaFull('Diagnosi GI',data.gi_diagnosi)+rigaFull('Trigger alimentari',data.gi_trigger_alimentari)+rigaFull('Dieta terapeutica',data.gi_dieta_terapeutica)) : '';
  const sOrmoni        = val(data.ormoni_diagnosi) ? cardRossa('Sezione Ormonale', rigaFull('Diagnosi',data.ormoni_diagnosi)+rigaFull('Terapia',data.ormoni_terapia)+rigaFull('Note',data.ormoni_note)) : '';
  const sMetabolico    = val(data.met_diagnosi) ? cardRossa('Sezione Metabolica', rigaFull('Diagnosi',data.met_diagnosi)+rigaFull('Monitoraggio',data.met_monitoraggio)+rigaFull('Farmaci',data.met_farmaci)+rigaFull('HbA1c',data.met_hba1c)+rigaFull('Note',data.met_note)) : '';
  const sNote          = val(data.note) ? '<div style="margin-bottom:20px;background:#fffbf0;border:1px solid #e8d88a;border-left:4px solid #c9a84c;border-radius:0 8px 8px 0;padding:14px 16px;font-size:13px;color:#5a4a10;line-height:1.6;"><strong>Note libere</strong><br>'+escapeHtml(String(data.note)).replace(/\n/g,'<br>')+'</div>' : '';
  const corpo = ['<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:660px;margin:0 auto;background:#f4f8f5;padding:20px 12px;">','<div style="background:#1a3a2a;border-radius:12px 12px 0 0;padding:24px 28px;margin-bottom:0;">','<div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.45);text-transform:uppercase;margin-bottom:10px;">NEACEA STUDIO &mdash; Nuova anamnesi nutrizionale</div>','<div style="font-size:24px;font-weight:700;color:#ffffff;margin-bottom:6px;">'+escapeHtml(nome)+'</div>','<div style="font-size:12px;color:rgba(255,255,255,.55);"><a href="mailto:'+escapeHtml(data.email||'')+'" style="color:#7ab8f5;text-decoration:none;">'+escapeHtml(data.email||'&mdash;')+'</a> &nbsp;&middot;&nbsp; '+ts+' &nbsp;&middot;&nbsp; ID: '+escapeHtml(id)+'</div>','</div>','<div style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px 24px 8px;margin-bottom:16px;">',hero, sObiettivo, sAnagrafica, sStile, sAlimentazione, sComportamento, sDigestione, sAllergie, sCliniche, sStoriaNutr, sGI, sOrmoni, sMetabolico, sNote,'</div>','<div style="text-align:center;font-size:11px;color:#8fa89a;padding:8px 0 4px;">Neacea Studio &mdash; nutrizione@neacea.com &mdash; Documento riservato</div>','</div>'].join('');
  MailApp.sendEmail(dest, '[Neacea] Nuova anamnesi - '+nome, '', { htmlBody: corpo, name: 'Neacea Studio - Anamnesi' });
}

function inviaEmailPaziente(data) {
  const nome = escapeHtml(data.nome || 'Cliente');
  const html = '<html lang="it"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f0f4f2;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f2;padding:32px 16px;"><tr><td><table width="560" align="center" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;"><tr><td style="background:#1a3a2a;padding:36px 32px;"><div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.45);text-transform:uppercase;margin-bottom:14px;">NEACEA STUDIO</div><div style="font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">Benvenuto nel tuo percorso,<br>'+nome+'.</div><div style="font-size:13px;color:rgba(255,255,255,.55);margin-top:10px;line-height:1.6;">La tua anamnesi &egrave; arrivata &mdash; il primo passo &egrave; fatto.</div></td></tr><tr><td style="padding:36px 32px;text-align:center;"><p style="font-size:15px;line-height:1.8;color:#4a5e54;margin:0 0 28px;">Abbiamo ricevuto le tue informazioni.<br>Il tuo nutrizionista le esaminer&agrave; con cura.</p><a href="mailto:nutrizione@neacea.com" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Scrivici &rarr;</a></td></tr><tr><td style="background:#f0f4f2;border-top:1px solid #e8f0eb;padding:14px 32px;text-align:center;font-size:11px;color:#8fa89a;">Neacea Studio &mdash; <a href="mailto:nutrizione@neacea.com" style="color:#8fa89a;text-decoration:none;">nutrizione@neacea.com</a></td></tr></table></td></tr></table></body></html>';
  MailApp.sendEmail(data.email, 'Scheda ricevuta - il tuo percorso inizia qui', '', { htmlBody: html, name: 'Neacea Studio' });
}

// ══════════════════════════════════════════════════════════════════
//  TEST
// ══════════════════════════════════════════════════════════════════
function testConnessione() { const ss = SpreadsheetApp.openById(SHEET_ID); Logger.log('Connesso a: ' + ss.getName()); }
function testFollowup3Settimane() { handleInviaFollowup({ email: 'nutrizione@neacea.com', tipo: 'followup' }); }
function testFollowupRinnovo() { handleInviaFollowup({ email: 'nutrizione@neacea.com', tipo: 'rinnovo' }); }
function testCheckPercorso() { handleInviaCheckPercorso({ email: 'nutrizione@neacea.com' }); }
function testCoachingMetaPiano() { handleInviaFollowupCoaching({ email: 'nutrizione@neacea.com', tipo: 'meta' }); }
function testCoachingFinePiano() { handleInviaFollowupCoaching({ email: 'nutrizione@neacea.com', tipo: 'fine' }); }
function testTriggerGiornaliero() { triggerGiornaliero(); }
function testTriggerLunedi() { triggerLunedi(); }
function testTriggerReminderPortaleLunedi() { triggerReminderPortaleLunedi(); }
function testAttivaPortale() { handleAttivaPortale({ email: 'nutrizione@neacea.com' }); }
function testGeneraConsenso() { handleGeneraConsenso({ email: 'nutrizione@neacea.com', nome: 'Test Utente' }); }
function testReminderPortale() { handleInviaReminderPortale({ email: 'nutrizione@neacea.com' }); }
function testSaveMessaggio() { handleSaveMessaggio({ email: 'nutrizione@neacea.com', messaggio: 'Test messaggio coach' }); }
function testGetCheckinAdmin() { Logger.log(JSON.stringify(handleGetCheckinAdmin({ email: 'nutrizione@neacea.com' }).getContent())); }
function testGetNotifiche() { Logger.log(JSON.stringify(handleGetNotifiche({ emails: ['nutrizione@neacea.com'] }).getContent())); }
// PATCH MAIL CONSENSO DA INCOLLARE IN APPS SCRIPT
//
// 1. Nel doPost(e), dentro lo switch(action), aggiungi questa riga:
//      case 'sendConsensoMail': return handleSendConsensoMail(data);
//
// 2. Incolla questa funzione in fondo allo script.
//    Invia solo la mail: token e link arrivano da Supabase/Netlify.
//    Non scrive sul foglio Consensi e non genera un secondo token.

function handleSendConsensoMail(data) {
  if (!data.email) return jsonResponse({ success: false, error: 'Email mancante' });
  if (!data.link) return jsonResponse({ success: false, error: 'Link consenso mancante' });

  const email = String(data.email || '').toLowerCase().trim();
  const nome = String(data.nome || email).trim() || email;
  const linkConsenso = String(data.link || '').trim();
  const nomeBreve = escapeHtml(nome.split(' ')[0]);

  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;">'
    + '<div style="background:#8a6210;padding:32px 28px;border-radius:10px 10px 0 0;">'
    +   '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:8px;">Consenso informato — ' + nomeBreve + '</div>'
    +   '<div style="font-size:13px;color:rgba(255,255,255,.7);">Firma digitale richiesta prima dell&rsquo;inizio del percorso.</div>'
    + '</div>'
    + '<div style="padding:28px;border:1px solid #e8e8e8;border-top:none;">'
    +   '<p style="font-size:14px;color:#555;line-height:1.8;margin:0 0 20px;">Ti chiedo di leggere e firmare digitalmente il consenso informato per il trattamento nutrizionale.</p>'
    +   '<div style="text-align:center;margin:28px 0;">'
    +     '<a href="' + escapeHtml(linkConsenso) + '" style="display:inline-block;background:#8a6210;color:#fff;padding:16px 36px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Leggi e firma il consenso →</a>'
    +   '</div>'
    +   '<p style="font-size:12px;color:#aaa;text-align:center;">Link: ' + escapeHtml(linkConsenso) + '</p>'
    + '</div>'
    + '<div style="padding:14px 28px;font-size:11px;color:#aaa;text-align:center;">Neacea Studio — nutrizione@neacea.com</div>'
    + '</div>';

  MailApp.sendEmail(email, 'Consenso informato — Neacea Studio', '', {
    htmlBody: html,
    name: 'Neacea Studio'
  });

  return jsonResponse({ success: true, email_sent: true });
}
// Blocco notifiche moduli PT collegato nello switch doPost con action notifyModuloPT.

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
