// =============================================
// NEACEA — state.js  v3.0
// Stato globale, localStorage, dati demo
// =============================================

const State = (() => {
  const DATA_VERSION = '3.2-empty';

  const KEYS = {
    operators:    'neacea_operators',
    clients:      'neacea_clients',
    appointments: 'neacea_appointments',
    initialized:  'neacea_initialized',
    version:      'neacea_version',
    sheetsSync:   'neacea_sheets_sync',
  };

  // I dati demo sono stati rimossi: Supabase e' la sorgente unica.

  // ── INIT ─────────────────────────────────────────────
  function purgeLegacyDemoData() {
    const demoClientIds = new Set(['c1','c2','c3','c4','c5','c6','c7','c8','c9']);
    const demoOperatorIds = new Set(['op1','op2','op3']);
    const clients = getClients();
    const appointments = getAppointments();
    const operators = getOperators();

    if (clients.some(c => demoClientIds.has(c.id))) {
      localStorage.setItem(KEYS.clients, JSON.stringify([]));
      localStorage.setItem(KEYS.appointments, JSON.stringify([]));
      console.log('[NEACEA] Clienti/appuntamenti demo rimossi dal browser');
    } else if (appointments.some(a => (a.clientIds || []).some(id => demoClientIds.has(id)))) {
      localStorage.setItem(KEYS.appointments, JSON.stringify([]));
      console.log('[NEACEA] Appuntamenti demo rimossi dal browser');
    }

    if (operators.length && operators.every(o => demoOperatorIds.has(o.id))) {
      localStorage.setItem(KEYS.operators, JSON.stringify([]));
      console.log('[NEACEA] Staff demo rimosso dal browser');
    }
  }

  function init() {
    const savedVersion = localStorage.getItem(KEYS.version);
    if (!localStorage.getItem(KEYS.initialized) || savedVersion !== DATA_VERSION) {
      localStorage.setItem(KEYS.operators,    JSON.stringify([]));
      localStorage.setItem(KEYS.clients,      JSON.stringify([]));
      localStorage.setItem(KEYS.appointments, JSON.stringify([]));
      localStorage.setItem(KEYS.initialized,  '1');
      localStorage.setItem(KEYS.version,      DATA_VERSION);
      console.log('[NEACEA] Archivio locale inizializzato vuoto (v' + DATA_VERSION + ')');
    }
    purgeLegacyDemoData();
  }

  // reset() — svuota i dati locali senza toccare Supabase
  // Se vuoi un reset completo usa resetHard()
  function reset() {
    // Salva backup dei dati attuali prima di resettare
    const backup = {
      operators:    localStorage.getItem(KEYS.operators),
      clients:      localStorage.getItem(KEYS.clients),
      appointments: localStorage.getItem(KEYS.appointments),
      ts:           Date.now(),
    };
    localStorage.setItem('neacea_backup', JSON.stringify(backup));

    localStorage.setItem(KEYS.operators,    JSON.stringify([]));
    localStorage.setItem(KEYS.clients,      JSON.stringify([]));
    localStorage.setItem(KEYS.appointments, JSON.stringify([]));
    localStorage.setItem(KEYS.initialized,  '1');
    localStorage.setItem(KEYS.version,      DATA_VERSION);
    console.log('[NEACEA] Reset locale vuoto — backup salvato in neacea_backup');
  }

  // resetHard() — cancella tutto compreso i dati reali
  function resetHard() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('neacea_backup');
    init();
  }

  // restoreBackup() — ripristina i dati dell'ultima sessione prima del reset
  function restoreBackup() {
    const raw = localStorage.getItem('neacea_backup');
    if (!raw) return false;
    const bk = JSON.parse(raw);
    if (bk.operators)    localStorage.setItem(KEYS.operators,    bk.operators);
    if (bk.clients)      localStorage.setItem(KEYS.clients,      bk.clients);
    if (bk.appointments) localStorage.setItem(KEYS.appointments, bk.appointments);
    localStorage.setItem(KEYS.initialized, '1');
    localStorage.setItem(KEYS.version, DATA_VERSION);
    return true;
  }

  // exportData() — scarica tutti i dati come file JSON
  function exportData() {
    const data = {
      version:      DATA_VERSION,
      exportedAt:   new Date().toISOString(),
      operators:    getOperators(),
      clients:      getClients(),
      appointments: getAppointments(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'neacea-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // importData(file) — importa dati da file JSON
  function importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.operators || !data.clients || !data.appointments)
            return reject(new Error('File non valido — mancano operators, clients o appointments'));
          localStorage.setItem(KEYS.operators,    JSON.stringify(data.operators));
          localStorage.setItem(KEYS.clients,      JSON.stringify(data.clients));
          localStorage.setItem(KEYS.appointments, JSON.stringify(data.appointments));
          localStorage.setItem(KEYS.initialized,  '1');
          localStorage.setItem(KEYS.version,      DATA_VERSION);
          resolve({ operators: data.operators.length, clients: data.clients.length, appointments: data.appointments.length });
        } catch(err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Errore lettura file'));
      reader.readAsText(file);
    });
  }

  function getOperators()    { return JSON.parse(localStorage.getItem(KEYS.operators)    || '[]'); }
  function getClients()      { return JSON.parse(localStorage.getItem(KEYS.clients)      || '[]'); }
  function getAppointments() { return JSON.parse(localStorage.getItem(KEYS.appointments) || '[]'); }

  function saveOperators(data)    { localStorage.setItem(KEYS.operators,    JSON.stringify(data)); }
  function saveClients(data)      { localStorage.setItem(KEYS.clients,      JSON.stringify(data)); }
  function saveAppointments(data) { localStorage.setItem(KEYS.appointments, JSON.stringify(data)); }

  function genId(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }

  return { init, reset, resetHard, restoreBackup, exportData, importData, getOperators, getClients, getAppointments, saveOperators, saveClients, saveAppointments, genId, KEYS };
})();
