
// ═══════════════════════════════════════════════════════
//  CARICHI ALLENAMENTO — helpers per UI inline
//  La UI è dentro le card esercizio (vedi programma.js).
// ═══════════════════════════════════════════════════════

// ─── CARICA TUTTI I CARICHI DEL CLIENTE APERTO ──────────
async function caricaCarichi() {
  if (!clienteAtt) return;
  if (API_CONFIGURATA) {
    const res = await apiGet('getCarichi', { clienteId: clienteAtt.id });
    if (res && res.carichi) {
      carichiAtt = res.carichi;
      salvaStorage(clienteAtt.id, 'carichi', carichiAtt);
      return;
    }
  }
  carichiAtt = leggiStorage(clienteAtt.id, 'carichi') || [];
}

// ─── PARSING PRESCRIZIONE → N° SERIE ─────────────────────
// Esempi: "3×8" → 3, "4×6 @65%" → 4, "2×(4–3–2)" → 2, "5×1@70%+2×5@60%" → 5
function parseSeriePrescrizione(prescr) {
  if (!prescr) return 3;
  const m = String(prescr).match(/(\d+)\s*[×x]/);
  if (m) return Math.min(Math.max(parseInt(m[1], 10), 1), 12);
  return 3;
}

// ─── È ESERCIZIO DI MOBILITÀ / ATTIVAZIONE? ──────────────
function isMobilita(categoria) {
  if (!categoria) return false;
  const c = String(categoria).toLowerCase();
  return c.startsWith('mobilità') || c.startsWith('attivazione') || c.startsWith('warm-up');
}

// ─── SEDUTE DI UN ESERCIZIO (raggruppate per data+seduta) ─
function sedutePerEsercizio(nomeEsercizio) {
  if (!Array.isArray(carichiAtt)) return [];
  const righe = [];
  carichiAtt.forEach(c => {
    if (String(c.esercizio).toLowerCase() !== String(nomeEsercizio).toLowerCase()) return;
    if (Array.isArray(c.righe)) {
      c.righe.forEach((r, i) => {
        righe.push({
          ...c,
          serie: r.serie || i + 1,
          kg: r.kg,
          rip: r.rip,
          note: r.note || c.note || '',
        });
      });
      return;
    }
    if (c.serie == null && c.kg == null && c.rip == null) return;
    righe.push(c);
  });
  const gruppi = {};
  righe.forEach(r => {
    const key = `${r.data}__${r.seduta || ''}`;
    if (!gruppi[key]) {
      gruppi[key] = { data: r.data, seduta: r.seduta, giorno: r.giorno, note: '', serie: [] };
    }
    // Decodifico "unita:sec|note_reale" o "unita:rip|note_seduta:xxx"
    let unita = 'rip';
    let noteSerie = r.note || '';
    const m = String(noteSerie).match(/^unita:(\w+)(?:\|(.*))?$/);
    if (m) {
      unita = m[1];
      const rest = m[2] || '';
      if (rest.startsWith('note_seduta:')) {
        gruppi[key].note = rest.slice('note_seduta:'.length);
        noteSerie = '';
      } else {
        noteSerie = rest;
      }
    }
    gruppi[key].serie.push({
      n: Number(r.serie) || gruppi[key].serie.length + 1,
      kg: r.kg, rip: r.rip, unita, noteSerie
    });
  });
  Object.values(gruppi).forEach(g => {
    g.serie.sort((a, b) => (a.n || 0) - (b.n || 0));
    const seen = new Set();
    g.serie.forEach((s, i) => {
      const n = Number(s.n) || 0;
      if (!n || seen.has(n)) s.n = i + 1;
      seen.add(Number(s.n));
    });
  });
  return Object.values(gruppi).sort((a, b) => String(b.data).localeCompare(String(a.data)));
}

// ─── ULTIMA SEDUTA / PROSSIMO NUMERO ────────────────────
function ultimaSedutaEsercizio(nomeEsercizio) {
  const sed = sedutePerEsercizio(nomeEsercizio);
  return sed.length ? sed[0] : null;
}

function prossimaSedutaNumero(nomeEsercizio) {
  const ult = ultimaSedutaEsercizio(nomeEsercizio);
  if (!ult || !ult.seduta) return 1;
  const n = Number(ult.seduta) || 0;
  return n + 1;
}

// ─── RIGA SERIE HTML (per form nuova seduta) ─────────────
function rigaSerieHtml(esercizioIdx, n, precompile, esercizio, ultimaSed) {
  const isMob = isMobilita(esercizio.categoria);
  const unita = (precompile && precompile.unita) || (isMob ? 'sec' : 'rip');
  const kg    = precompile && precompile.kg != null ? precompile.kg : '';
  const rip   = precompile && precompile.rip != null ? precompile.rip : '';

  let hint = '';
  if (ultimaSed) {
    const ult = (ultimaSed.serie || []).find(s => Number(s.n) === Number(n));
    if (ult) {
      const ripLabel = ult.unita === 'sec' ? 'sec' : 'rip';
      hint = `<span class="ns-hint">ult: ${ult.kg || '0'}kg × ${ult.rip || '?'} ${ripLabel}</span>`;
    }
  }

  const unitaSelect = isMob
    ? `<select class="ns-unita"><option value="rip" ${unita === 'rip' ? 'selected' : ''}>rip</option><option value="sec" ${unita === 'sec' ? 'selected' : ''}>sec</option></select>`
    : `<input type="hidden" class="ns-unita" value="rip">`;

  return `
    <div class="ns-row" data-n="${n}">
      <div class="ns-label">Serie ${n}</div>
      <input type="number" step="0.5" class="ns-kg" placeholder="kg" value="${kg}">
      <span class="ns-x">×</span>
      <input type="number" step="1" class="ns-rip" placeholder="${isMob ? 'valore' : 'rip'}" value="${rip}">
      ${unitaSelect}
      <button class="ns-btn-rm" onclick="rimuoviSerie(${esercizioIdx}, this)" title="Rimuovi">✕</button>
      ${hint}
    </div>`;
}

function aggiungiSerie(esercizioIdx) {
  const esercizio = (schedaAtt.esercizi[giornoAtt] || [])[esercizioIdx];
  if (!esercizio) return;
  const cont = document.querySelector(`[data-ns-eserc="${esercizioIdx}"] .ns-rows`);
  if (!cont) return;
  const n = cont.querySelectorAll('.ns-row').length + 1;
  const ult = ultimaSedutaEsercizio(esercizio.nome);
  cont.insertAdjacentHTML('beforeend', rigaSerieHtml(esercizioIdx, n, null, esercizio, ult));
}

function rimuoviSerie(esercizioIdx, btn) {
  const row = btn.closest('.ns-row');
  if (!row) return;
  row.remove();
  const cont = document.querySelector(`[data-ns-eserc="${esercizioIdx}"] .ns-rows`);
  if (!cont) return;
  cont.querySelectorAll('.ns-row').forEach((r, i) => {
    r.dataset.n = i + 1;
    r.querySelector('.ns-label').textContent = 'Serie ' + (i + 1);
  });
}

// ─── SALVA SEDUTA ────────────────────────────────────────
async function salvaSedutaEsercizio(esercizioIdx) {
  if (!schedaAtt || !clienteAtt) return;
  const esercizio = (schedaAtt.esercizi[giornoAtt] || [])[esercizioIdx];
  if (!esercizio) return;

  const prefix = 'ns-' + esercizioIdx + '-';
  const dataSed  = gv(prefix + 'data') || oggi();
  const sedutaN  = gv(prefix + 'seduta');
  const noteEs   = gv(prefix + 'note') || '';

  const rows = document.querySelectorAll(`[data-ns-eserc="${esercizioIdx}"] .ns-row`);
  const righe = [];
  rows.forEach((r, i) => {
    const kg    = r.querySelector('.ns-kg').value.trim();
    const valR  = r.querySelector('.ns-rip').value.trim();
    const unita = r.querySelector('.ns-unita')?.value || 'rip';
    if (!kg && !valR) return;
    let noteCombinata = `unita:${unita}`;
    if (i === 0 && noteEs) noteCombinata += '|note_seduta:' + noteEs;
    righe.push({
      serie: i + 1,
      kg:    kg   ? Number(kg)   : '',
      rip:   valR ? Number(valR) : '',
      note:  noteCombinata
    });
  });

  if (!righe.length) { toast('Inserisci almeno una serie', 'error'); return; }

  toast('Salvataggio…');
  const payload = {
    action:       'saveCarichiBulk',
    clienteId:    clienteAtt.id,
    schedaId:     schedaAtt.id,
    esercizio:    esercizio.nome,
    progressione: esercizio.progressione ? esercizio.progressione.nome : '',
    giorno:       giornoAtt,
    seduta:       sedutaN,
    data:         dataSed,
    righe,
    sovrascriviSeduta: true
  };

  if (API_CONFIGURATA) {
    const res = await apiPost(payload);
    if (res && res.success) {
      toast('Seduta salvata ✓', 'success');
      await caricaCarichi();
      renderProgramma();
      return;
    }
    toast('Errore salvataggio', 'error');
    return;
  }

  // Fallback localStorage
  const now = Date.now();
  // Rimuovi eventuali righe pre-esistenti della stessa seduta
  carichiAtt = (carichiAtt || []).filter(c => !(
    String(c.clienteId) === String(clienteAtt.id) &&
    String(c.data) === String(dataSed) &&
    String(c.esercizio).toLowerCase() === esercizio.nome.toLowerCase() &&
    String(c.seduta) === String(sedutaN)
  ));
  righe.forEach((r, i) => {
    carichiAtt.push({
      id: 'car_' + now + '_' + i,
      clienteId: clienteAtt.id,
      schedaId: schedaAtt.id,
      data: dataSed, giorno: giornoAtt,
      esercizio: esercizio.nome,
      progressione: esercizio.progressione ? esercizio.progressione.nome : '',
      seduta: sedutaN, serie: r.serie,
      kg: r.kg, rip: r.rip, note: r.note,
      dataCreazione: oggi()
    });
  });
  salvaStorage(clienteAtt.id, 'carichi', carichiAtt);
  toast('Seduta salvata (locale)', 'success');
  renderProgramma();
}

// ─── ELIMINA SEDUTA ──────────────────────────────────────
async function eliminaSedutaEsercizio(nomeEsercizio, data, seduta) {
  if (!clienteAtt) return;
  if (!confirm(`Eliminare la seduta del ${fmtData(data)}?`)) return;

  toast('Eliminazione…');
  if (API_CONFIGURATA) {
    const res = await apiPost({
      action: 'deleteCarichiSeduta',
      clienteId: clienteAtt.id,
      esercizio: nomeEsercizio,
      data, seduta
    });
    if (res && res.success) {
      toast('Eliminata ✓', 'success');
      await caricaCarichi();
      renderProgramma();
      return;
    }
    toast('Errore', 'error');
    return;
  }
  carichiAtt = (carichiAtt || []).filter(c => !(
    String(c.clienteId) === String(clienteAtt.id) &&
    String(c.data) === String(data) &&
    String(c.esercizio).toLowerCase() === nomeEsercizio.toLowerCase() &&
    String(c.seduta) === String(seduta)
  ));
  salvaStorage(clienteAtt.id, 'carichi', carichiAtt);
  toast('Eliminata (locale)', 'success');
  renderProgramma();
}

// ─── MODIFICA SEDUTA (pop dati nel form nuova seduta) ────
function modificaSeduta(esercizioIdx, data, seduta) {
  const esercizio = (schedaAtt.esercizi[giornoAtt] || [])[esercizioIdx];
  if (!esercizio) return;
  const tutte = sedutePerEsercizio(esercizio.nome);
  const sed = tutte.find(s => s.data === data && String(s.seduta) === String(seduta));
  if (!sed) return;

  const prefix = 'ns-' + esercizioIdx + '-';
  const setVal = (id, v) => { const el = document.getElementById(id); if (el != null) el.value = v; };
  setVal(prefix + 'data', data);
  setVal(prefix + 'seduta', seduta);
  setVal(prefix + 'note', sed.note || '');

  const cont = document.querySelector(`[data-ns-eserc="${esercizioIdx}"] .ns-rows`);
  if (cont) {
    const ult = ultimaSedutaEsercizio(esercizio.nome);
    cont.innerHTML = sed.serie.map((s, i) =>
      rigaSerieHtml(esercizioIdx, i + 1, s, esercizio, ult)
    ).join('');
  }

  document.querySelector(`[data-eserc-card="${esercizioIdx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Dati caricati — modifica e salva');
}

// ─── TOGGLE STORICO ──────────────────────────────────────
function toggleStoricoEserc(esercizioIdx) {
  const el = document.querySelector(`[data-storico-eserc="${esercizioIdx}"]`);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
