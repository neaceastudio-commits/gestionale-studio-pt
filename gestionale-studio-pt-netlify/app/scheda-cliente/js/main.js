// Entry point Scheda Cliente.

let schedaClienteAvviata = false;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizzaCliente(c) {
  return {
    id: c.id,
    nome: c.nome || '',
    cognome: c.cognome || '',
    telefono: c.telefono || '',
    email: c.email || '',
    obiettivo: c.obiettivo || '',
    ptAssegnato: c.ptAssegnato || c.pt_assegnato || '',
    tipoServizio: c.tipoServizio || c.tipo_servizio || '',
    tipoAbbonamento: c.tipoAbbonamento || c.tipo_abbonamento || '',
    packageTypes: Array.isArray(c.packageTypes) ? c.packageTypes : (Array.isArray(c.package_types) ? c.package_types : []),
    dataInizio: c.dataInizio || c.data_inizio || '',
    dataScadenza: c.dataScadenza || c.data_scadenza || '',
    statoAbbonamento: c.statoAbbonamento || c.stato_abbonamento || (c.active === false ? 'Non attivo' : 'Attivo'),
    sessionsTotal: c.sessionsTotal || c.sessions_total || 0,
    sessionsRemaining: c.sessionsRemaining || c.sessions_remaining || 0,
    giorniSettimana: Array.isArray(c.giorniSettimana) ? c.giorniSettimana : (Array.isArray(c.giorni_settimana) ? c.giorni_settimana : []),
    sessioni_pref: c.sessioni_pref || c.package_frequency || '',
    note: c.note || c.notes || '',
    nascita: c.nascita || '',
    esperienza: c.esperienza || '',
    orari: c.orari || '',
    sport: c.sport || '',
    motivazione: c.motivazione || '',
    impressioni: c.impressioni || '',
  };
}

function normalizzaStaff(s) {
  return {
    id: s.id,
    nome: s.nome || '',
    cognome: s.cognome || '',
    ruolo: s.ruolo || (Array.isArray(s.roles) ? s.roles.join(', ') : ''),
    email: s.email || '',
  };
}

async function caricaClienti() {
  const warn = document.getElementById('api-warn');
  const body = document.getElementById('lista-body');
  if (body) body.innerHTML = '<div class="loading-state"><div class="spin"></div></div>';
  if (warn) {
    warn.style.display = 'none';
    warn.textContent = '';
  }

  try {
    if (typeof apiGet !== 'function') throw new Error('Modulo API non caricato');
    if (typeof renderLista !== 'function') throw new Error('Modulo lista clienti non caricato');
    if (typeof aggiornaKPI !== 'function') throw new Error('Modulo KPI non caricato');

    const [clientiRes, staffRes] = await Promise.all([
      apiGet('getClienti'),
      apiGet('getStaff'),
    ]);

    if (clientiRes && clientiRes.error) throw new Error('Clienti: ' + clientiRes.error);
    if (staffRes && staffRes.error) throw new Error('Staff: ' + staffRes.error);

    clientiAll = (clientiRes.clienti || []).map(normalizzaCliente);
    staffAll = (staffRes.staff || []).map(normalizzaStaff);

    aggiornaKPI();
    renderLista();
    return { clienti: clientiAll.length, staff: staffAll.length };
  } catch (err) {
    console.error('[Scheda Cliente] caricamento non riuscito:', err);
    if (warn) {
      warn.style.display = '';
      warn.textContent = 'Errore caricamento dati: ' + (err.message || String(err));
    }
    clientiAll = [];
    staffAll = [];
    if (body) {
      body.innerHTML = '<div class="empty"><div class="empty-title">Errore caricamento clienti</div><div class="empty-sub">' +
        escapeHtml(err.message || String(err)) +
        '</div></div>';
    }
    throw err;
  }
}

function avviaSchedaCliente() {
  if (schedaClienteAvviata) return;
  schedaClienteAvviata = true;
  caricaClienti().catch(err => {
    console.error('[Scheda Cliente] Avvio non riuscito:', err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', avviaSchedaCliente);
} else {
  avviaSchedaCliente();
}

window.addEventListener('error', event => {
  const warn = document.getElementById('api-warn');
  if (warn) {
    warn.style.display = '';
    warn.textContent = 'Errore JavaScript: ' + (event.message || 'errore sconosciuto');
  }
});
