// Entry point Scheda Cliente.

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

  try {
    const [clientiRes, staffRes] = await Promise.all([
      apiGet('getClienti'),
      apiGet('getStaff'),
    ]);

    if (clientiRes.error) throw new Error(clientiRes.error);
    if (staffRes.error) throw new Error(staffRes.error);

    clientiAll = (clientiRes.clienti || []).map(normalizzaCliente);
    staffAll = (staffRes.staff || []).map(normalizzaStaff);

    if (warn) warn.style.display = 'none';
    aggiornaKPI();
    renderLista();
  } catch (err) {
    console.warn('[Scheda Cliente] Supabase non disponibile:', err);
    if (warn) {
      warn.style.display = '';
      warn.textContent = 'Connessione Supabase non disponibile — verifica URL, key e policy.';
    }
    clientiAll = [];
    staffAll = [];
    aggiornaKPI();
    renderLista();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  caricaClienti();
});
