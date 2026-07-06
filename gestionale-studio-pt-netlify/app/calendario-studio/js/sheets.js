// =============================================
// NEACEA — sheets.js  v8.0
// Sheet è MASTER. Lettura e scrittura via iframe
// trick per bypassare CORS su Apps Script GET.
// =============================================

const Sheets = (() => {

  const BASE = 'https://script.google.com/macros/s/AKfycbyZNMYjmkVBNDz2ufh8T4QsjCaG9MKz60_8_y7Kb_h3FpXx8JBS6Kpeth3cFwAjIjU/exec';

  // ── CHIAMATA via fetch con mode no-cors per scritture ──
  // Per le LETTURE usiamo JSONP trick (script tag)

  function write(payload) {
    return new Promise(resolve => {
      fetch(BASE, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload),
      })
      .then(() => resolve(true))
      .catch(() => resolve(false));
    });
  }

  // ── LETTURA via JSONP (script tag — bypassa CORS) ──────
  let _cbCounter = 0;

  function read(action, params) {
    return new Promise((resolve, reject) => {
      const cbName = '__sheets_cb_' + (++_cbCounter);
      const timeout = setTimeout(() => {
        delete window[cbName];
        document.getElementById('_sheets_script_' + _cbCounter)?.remove();
        reject(new Error('timeout'));
      }, 10000);

      window[cbName] = function(data) {
        clearTimeout(timeout);
        delete window[cbName];
        document.getElementById('_sheets_script_' + _cbCounter)?.remove();
        resolve(data);
      };

      const payload = JSON.stringify({ action, ...params, callback: cbName });
      const src = BASE + '?' + new URLSearchParams({ data: payload, callback: cbName });
      const s = document.createElement('script');
      s.id = '_sheets_script_' + _cbCounter;
      s.src = src;
      s.onerror = () => { clearTimeout(timeout); reject(new Error('script load error')); };
      document.head.appendChild(s);
    });
  }

  // ── PUSH SINGOLI ──────────────────────────────────────
  function pushAppointment(appt) { if (appt) write({ action: 'writeAppointment', appointment: appt }); }
  function pushClient(client)     { if (client) write({ action: 'writeClient', client }); }
  function pushOperator(op)       { if (op) write({ action: 'writeOperator', operator: op }); }

  // ── SYNC COMPLETA: legge dal foglio, poi aggiorna UI ──
  async function fullSync() {
    console.log('[Sheets] reading from sheet (master)…');
    try {
      const res = await read('readAll', {});
      if (!res || res.error) {
        console.warn('[Sheets] readAll failed:', res?.error || 'no data');
        return;
      }

      // Sheet è master: salva direttamente senza merge
      if (res.operators && res.operators.length) {
        const ops = {};
        res.operators.forEach(o => { if (o.id) ops[o.id] = o; });
        State.saveOperators(Object.values(ops));
      }
      if (res.clients && res.clients.length) {
        const cls = {};
        normalizeClients(res.clients).forEach(c => { if (c.id) cls[c.id] = c; });
        State.saveClients(Object.values(cls));
      }
      if (res.appointments && res.appointments.length) {
        // 1. Deduplica per id (vince updatedAt più recente)
        const seen = {};
        res.appointments
          .filter(a => a.id && a.serviceId && a.date)
          .map(a => ({ ...a, date: String(a.date).slice(0, 10) }))
          .forEach(a => {
            if (!seen[a.id] || (a.updatedAt||0) > (seen[a.id].updatedAt||0)) seen[a.id] = a;
          });

        // 2. Ordina per data+ora e rimuovi conflitti reali
        // (stesso operatore stesso slot, o stesso cliente stesso slot)
        const sorted = Object.values(seen).sort((a, b) =>
          (a.date + a.startTime).localeCompare(b.date + b.startTime)
        );

        const valid = [];
        sorted.forEach(appt => {
          if (appt.status === 'annullato') { valid.push(appt); return; }
          const svc = Services.getService(appt.serviceId);
          if (!svc) { valid.push(appt); return; }

          // Controlla conflitto operatore con gli appuntamenti già accettati
          const opConflict = appt.operatorId && valid.some(v =>
            v.id !== appt.id &&
            v.date === appt.date &&
            v.operatorId === appt.operatorId &&
            v.status !== 'annullato' &&
            Services.overlaps(appt, v, true)
          );

          // Controlla conflitto cliente (stesso cliente stessa ora)
          const clientConflict = appt.clientIds?.some(cid =>
            valid.some(v =>
              v.id !== appt.id &&
              v.date === appt.date &&
              v.status !== 'annullato' &&
              v.clientIds?.includes(cid) &&
              Services.overlaps(appt, v, false)
            )
          );

          if (opConflict) {
            console.warn('[Sheets] Scartato duplicato operatore:', appt.id, appt.startTime);
          } else if (clientConflict) {
            console.warn('[Sheets] Scartato duplicato cliente:', appt.id, appt.startTime);
          } else {
            valid.push(appt);
          }
        });

        if (valid.length) State.saveAppointments(valid);
      }

      localStorage.setItem('neacea_last_sync', new Date().toISOString());
      console.log('[Sheets] ✓ loaded', new Date().toLocaleTimeString('it-IT'));
      Calendar.render();
    } catch(e) {
      console.warn('[Sheets] fullSync error:', e.message);
      // Se la lettura fallisce, scrivi i dati locali sul foglio
      write({
        action: 'writeAll',
        appointments: State.getAppointments(),
        clients:      State.getClients(),
        operators:    State.getOperators(),
      });
    }
  }

  function normalizeClients(clients) {
    return clients.map(c => {
      if (!Array.isArray(c.packageTypes) && c.packageType) c.packageTypes = [c.packageType];
      return c;
    });
  }

  return { fullSync, pushAppointment, pushClient, pushOperator };
})();
