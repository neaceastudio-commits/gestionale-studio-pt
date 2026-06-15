
// ═══════════════════════════════════════════════════════
//  PROGRAMMA ALLENAMENTO
// ═══════════════════════════════════════════════════════
function renderProgramma() {
  const sel = document.getElementById('scheda-select');
  sel.innerHTML = '<option value="">— Nessuna scheda —</option>';
  schedeAtt.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = s.nome;
    sel.appendChild(o);
  });
  if (schedeAtt.length) {
    sel.value = 0;
    schedaAtt = schedeAtt[0];
    giornoAtt = schedaAtt.giorni[0];
    renderSchedaBody();
  } else {
    document.getElementById('prog-body').innerHTML = '<div class="empty"><div class="empty-title">Nessuna scheda</div><div class="empty-sub">Crea la prima scheda di allenamento</div></div>';
  }
}

function switchScheda() {
  const idx = document.getElementById('scheda-select').value;
  if (idx === '') { schedaAtt = null; document.getElementById('prog-body').innerHTML = '<div class="empty"><div class="empty-title">Nessuna scheda</div></div>'; return; }
  schedaAtt = schedeAtt[parseInt(idx)];
  giornoAtt = schedaAtt.giorni[0];
  renderSchedaBody();
}

function renderSchedaBody() {
  if (!schedaAtt) return;
  const s = schedaAtt;

  // ── Normalizzazione difensiva di s.giorni ──
  // Può arrivare come: array (ok), stringa JSON, stringa corrotta "[Ljava...", undefined
  if (!Array.isArray(s.giorni)) {
    let parsed = null;
    if (typeof s.giorni === 'string') {
      const txt = s.giorni.trim();
      if (txt.startsWith('[')) {
        try { parsed = JSON.parse(txt); } catch (e) { parsed = null; }
      }
    }
    // Fallback: prova a pescare da datiJSON.giorni
    if (!Array.isArray(parsed) && s.datiJSON && Array.isArray(s.datiJSON.giorni)) {
      parsed = s.datiJSON.giorni;
    }
    // Fallback finale: default sensato
    if (!Array.isArray(parsed) || !parsed.length) {
      parsed = ['Lunedì', 'Mercoledì', 'Venerdì'];
    }
    s.giorni = parsed;
  }

  if (!s.giorni.includes(giornoAtt)) giornoAtt = s.giorni[0];

  if (!s.esercizi || typeof s.esercizi !== 'object' || Array.isArray(s.esercizi)) {
    // Prova a recuperare da datiJSON
    if (s.datiJSON && s.datiJSON.esercizi && typeof s.datiJSON.esercizi === 'object') {
      s.esercizi = s.datiJSON.esercizi;
    } else {
      s.esercizi = {};
    }
  }

  const esercizi = s.esercizi[giornoAtt] || [];

  const tabsHtml = s.giorni.map(g => `
    <button class="giorno-tab ${g === giornoAtt ? 'active' : ''}" onclick="switchGiorno('${g}')">${g}</button>`).join('');

  const eserciziHtml = esercizi.length
    ? esercizi.map((e, i) => renderEsercizioCard(e, i)).join('')
    : '';

  document.getElementById('prog-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <div style="font-weight:600;font-size:15px">${s.nome}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${s.inizio ? fmtData(s.inizio) + ' · ' : ''}${s.settimane} settimane</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="eliminaScheda('${s.id}')">Elimina scheda</button>
    </div>
    ${renderRiepilogoProgrammazione(s)}
    <div class="giorni-tabs">${tabsHtml}</div>
    <div id="eserc-list">
      ${eserciziHtml}
      <button class="add-esercizio-btn" onclick="openMoEsercizio()">
        <span>+</span> Aggiungi esercizio — ${giornoAtt}
      </button>
    </div>
    ${esercizi.length ? renderConfrontoCarichi(esercizi) : ''}
    ${renderStoricoCarichiCliente()}
  `;
}

function addMonthsToDate(dateValue, months) {
  const base = dateValue ? new Date(dateValue + 'T00:00:00') : new Date();
  if (Number.isNaN(base.getTime())) return oggi();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function nomeMese(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function prossimoNomeScheda(s) {
  const nextStart = addMonthsToDate(s.inizio || oggi(), 1);
  const mese = nomeMese(nextStart);
  const base = (s.nome || 'Scheda').replace(/\s+·\s+[a-zàèéìòù]+\s+\d{4}$/i, '');
  return mese ? `${base} · ${mese}` : `${base} · copia`;
}

async function duplicaSchedaMese() {
  if (!clienteAtt || !schedaAtt) {
    toast('Seleziona prima una scheda da replicare', 'err');
    return;
  }
  const nome = prompt('Nome della nuova scheda', prossimoNomeScheda(schedaAtt));
  if (!nome) return;
  const clone = JSON.parse(JSON.stringify(schedaAtt));
  clone.id = 'sch_' + Date.now();
  clone.clienteId = clienteAtt.id;
  clone.nome = nome.trim();
  clone.inizio = addMonthsToDate(schedaAtt.inizio || oggi(), 1);
  clone.duplicataDa = schedaAtt.id;
  clone.duplicataIl = new Date().toISOString();
  clone.note = [clone.note, 'Replicata da: ' + (schedaAtt.nome || schedaAtt.id)].filter(Boolean).join('\n');

  const res = await apiPost({ action: 'saveScheda', ...clone, datiJSON: clone });
  if (!res || res.error || res.success === false) {
    toast((res && res.error) || 'Errore replica scheda', 'err');
    return;
  }
  schedeAtt.unshift(clone);
  schedaAtt = clone;
  giornoAtt = clone.giorni[0];
  renderProgramma();
  toast('Scheda replicata su Supabase', 'ok');
}

function renderRiepilogoProgrammazione(s) {
  const giorni = Array.isArray(s.giorni) ? s.giorni : [];
  const eserciziByDay = s.esercizi && typeof s.esercizi === 'object' ? s.esercizi : {};
  const totale = giorni.reduce((sum, g) => sum + ((eserciziByDay[g] || []).length), 0);
  const giorniHtml = giorni.map(g => {
    const esercizi = eserciziByDay[g] || [];
    const body = esercizi.length
      ? esercizi.map((e, i) => {
          const prog = e.progressione;
          const primaSeduta = prog && prog.sedute && prog.sedute.length ? prog.sedute[0] : '';
          return `
            <div class="prog-overview-ex">
              <div class="prog-overview-n">${i + 1}</div>
              <div>
                <div class="prog-overview-name">${e.nome || 'Esercizio'}</div>
                <div class="prog-overview-meta">
                  ${(e.categoria || '—')}${prog ? ' · ' + prog.nome : ' · libera'}${primaSeduta ? ' · Sed.1 ' + primaSeduta : ''}
                </div>
              </div>
            </div>`;
        }).join('')
      : '<div class="prog-overview-empty">Nessun esercizio inserito</div>';
    return `
      <div class="prog-overview-day">
        <div class="prog-overview-dayhead">
          <span>${g}</span>
          <em>${esercizi.length} esercizi</em>
        </div>
        ${body}
      </div>`;
  }).join('');

  return `
    <details class="prog-overview" open>
      <summary>
        <span>Vista completa programmazione</span>
        <em>${giorni.length} giorni · ${totale} esercizi</em>
      </summary>
      <div class="prog-overview-grid">${giorniHtml || '<div class="prog-overview-empty">Nessun giorno configurato</div>'}</div>
    </details>`;
}

function renderEsercizioCard(e, idx) {
  const prog = e.progressione;

  // ── 1. HEAD CARD ──
  const progTag = prog
    ? `<span class="esercizio-prog-badge">${prog.nome}</span>`
    : `<span class="esercizio-prog-badge muted">Senza progressione</span>`;

  const headHtml = `
    <div class="esercizio-head">
      <div class="esercizio-num">${idx+1}</div>
      <div><div class="esercizio-nome">${e.nome}</div><div class="esercizio-muscolo">${e.categoria || ''} · Recupero: ${e.recupero || '—'}</div></div>
      ${progTag}
      <button class="act ae btn-sm" onclick="openModificaEsercizio(${idx})" style="margin-left:4px">Modifica</button>
      <button class="act ad btn-sm" onclick="eliminaEsercizio(${idx})" style="margin-left:4px">✕</button>
    </div>`;

  // ── 2. BLOCCO PROGRESSIONE (compatto, informativo) ──
  const progHtml = prog ? `
    <div class="eserc-progr-block">
      <div class="eserc-progr-title">Progressione · 6 sedute · TUT ${prog.tut}</div>
      <div class="eserc-progr-grid">
        ${prog.sedute.map((s, i) => `
          <div class="eserc-progr-item"><span class="eserc-progr-n">Sed.${i+1}</span><span class="eserc-progr-v">${s}</span></div>
        `).join('')}
      </div>
    </div>` : '';

  // ── 3. ULTIMA SEDUTA ESEGUITA ──
  const tutteSed = typeof sedutePerEsercizio === 'function' ? sedutePerEsercizio(e.nome) : [];
  const ultima   = tutteSed.length ? tutteSed[0] : null;
  const seriePillsHtml = serie => {
    const seen = new Set();
    return (serie || []).map((s, i) => {
      let numeroSerie = Number(s.n) || i + 1;
      if (seen.has(numeroSerie)) numeroSerie = i + 1;
      seen.add(numeroSerie);
      const u = s.unita === 'sec' ? 'sec' : 'rip';
      return `<span class="serie-pill"><b>S${numeroSerie}</b>&nbsp;${s.kg || '0'}kg × ${s.rip || '?'} ${u}</span>`;
    }).join('');
  };

  const ultimaHtml = ultima ? `
    <div class="eserc-ultima-block">
      <div class="eserc-ultima-head">
        <div>
          <span class="eserc-ultima-lbl">Ultima seduta eseguita</span>
          <strong>${fmtData(ultima.data)}</strong>
          ${ultima.seduta ? `· Sed.${ultima.seduta}` : ''}
          ${ultima.giorno ? `<span class="eserc-ultima-giorno">${ultima.giorno}</span>` : ''}
        </div>
        <div class="eserc-ultima-actions">
          <button class="btn-inline" onclick="modificaSeduta(${idx}, '${ultima.data}', '${ultima.seduta}')">Modifica</button>
          <button class="btn-inline danger" onclick="eliminaSedutaEsercizio('${e.nome.replace(/'/g, "\\'")}', '${ultima.data}', '${ultima.seduta}')">Elimina</button>
        </div>
      </div>
      <div class="eserc-ultima-serie">
        ${seriePillsHtml(ultima.serie)}
      </div>
      ${ultima.note ? `<div class="eserc-ultima-note">${ultima.note}</div>` : ''}
    </div>` : '';

  // ── 4. STORICO (nascosto di default, toggle on click) ──
  const storicoHtml = tutteSed.length > 1 ? `
    <div class="eserc-storico-toggle">
      <button class="btn-inline ghost" onclick="toggleStoricoEserc(${idx})">Storico completo (${tutteSed.length} sedute)</button>
    </div>
    <div class="eserc-storico" data-storico-eserc="${idx}" style="display:none">
      ${tutteSed.slice(1).map(s => `
        <div class="eserc-storico-item">
          <div class="eserc-storico-head">
            <strong>${fmtData(s.data)}</strong>
            ${s.seduta ? `· Sed.${s.seduta}` : ''}
            <div style="margin-left:auto;display:flex;gap:4px">
              <button class="btn-inline small" onclick="modificaSeduta(${idx}, '${s.data}', '${s.seduta}')">Modifica</button>
              <button class="btn-inline small danger" onclick="eliminaSedutaEsercizio('${e.nome.replace(/'/g, "\\'")}', '${s.data}', '${s.seduta}')">Elimina</button>
            </div>
          </div>
          <div class="eserc-storico-serie">
            ${seriePillsHtml(s.serie)}
          </div>
          ${s.note ? `<div class="eserc-ultima-note">${s.note}</div>` : ''}
        </div>
      `).join('')}
    </div>` : '';

  // ── 5. FORM NUOVA SEDUTA ──
  const prossimaN = typeof prossimaSedutaNumero === 'function' ? prossimaSedutaNumero(e.nome) : 1;
  const sedutaMax = prog ? prog.sedute.length : 12;
  const sedutaOptions = Array.from({length: sedutaMax}, (_, i) => i + 1)
    .map(n => `<option value="${n}" ${n === prossimaN ? 'selected' : ''}>${n}</option>`).join('');

  // Prescrizione della seduta selezionata (per n° serie precompilato)
  const prescrSedutaAttuale = prog ? (prog.sedute[prossimaN - 1] || '') : '';
  const nSerie = typeof parseSeriePrescrizione === 'function'
    ? parseSeriePrescrizione(prescrSedutaAttuale)
    : 3;

  const prefix = 'ns-' + idx + '-';
  const serieRighe = Array.from({length: nSerie}, (_, i) =>
    (typeof rigaSerieHtml === 'function')
      ? rigaSerieHtml(idx, i + 1, null, e, ultima)
      : ''
  ).join('');

  const nuovaHtml = `
    <div class="eserc-nuova-block" data-ns-eserc="${idx}">
      <div class="eserc-nuova-title">Nuova seduta</div>
      <div class="eserc-nuova-top">
        <div class="field" style="margin:0">
          <label>Data</label>
          <input type="date" id="${prefix}data" value="${oggi()}">
        </div>
        <div class="field" style="margin:0">
          <label>Sed. n°</label>
          <select id="${prefix}seduta">${sedutaOptions}</select>
        </div>
        ${prescrSedutaAttuale ? `<div class="eserc-nuova-prescr">Prescritto: <strong>${prescrSedutaAttuale}</strong></div>` : ''}
      </div>
      <div class="ns-rows">${serieRighe}</div>
      <div class="eserc-nuova-bottom">
        <button class="btn-inline ghost" onclick="aggiungiSerie(${idx})">+ Serie</button>
        <input type="text" class="ns-note-es" id="${prefix}note" placeholder="Note esercizio (opzionale)">
        <button class="btn btn-primary btn-sm" onclick="salvaSedutaEsercizio(${idx})">Salva seduta</button>
      </div>
    </div>`;

  // ── 6. NOTE ESERCIZIO (quelle del template scheda, non del log) ──
  const noteTemplateHtml = e.note
    ? `<div class="esercizio-note">${e.note}</div>`
    : '';

  return `
    <div class="esercizio-card" data-eserc-card="${idx}">
      ${headHtml}
      <div class="esercizio-body">
        ${progHtml}
        ${ultimaHtml}
        ${storicoHtml}
        ${nuovaHtml}
        ${noteTemplateHtml}
      </div>
    </div>`;
}

function renderConfrontoCarichi(esercizi) {
  // Solo esercizi con almeno una seduta manuale compilata con carico
  const conCarico = esercizi.filter(e => e.seduteManuale && e.seduteManuale.some(s => s.carico));
  if (!conCarico.length) return '';
  return `
    <div class="card" style="margin-top:16px">
      <div class="card-head"><span class="card-title">Progressione Carichi</span></div>
      <div class="card-body">
        ${conCarico.map(e => {
          const id = 'cc_' + e.id;
          setTimeout(() => renderChartCarico(id, e), 100);
          return `<div style="margin-bottom:20px">
            <div style="font-size:12px;font-weight:600;margin-bottom:6px">${e.nome}</div>
            <div class="chart-wrap" style="height:140px"><canvas id="${id}"></canvas></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function meseKey(data) {
  return String(data || '').slice(0, 7);
}

function meseLabel(key) {
  if (!key) return 'Senza data';
  const d = new Date(key + '-01T00:00:00');
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function carichiNormalizzatiCliente() {
  if (!Array.isArray(carichiAtt)) return [];
  const out = [];
  carichiAtt.forEach(c => {
    if (String(c.clienteId || '') !== String(clienteAtt?.id || '')) return;
    if (Array.isArray(c.righe)) {
      c.righe.forEach((r, i) => out.push({
        ...c,
        serie: r.serie || i + 1,
        kg: r.kg,
        rip: r.rip,
        note: r.note || c.note || '',
      }));
      return;
    }
    if (c.serie == null && c.kg == null && c.rip == null) return;
    out.push(c);
  });
  return out;
}

function renderStoricoCarichiCliente() {
  const righe = carichiNormalizzatiCliente()
    .filter(c => c.data && c.esercizio)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  if (!righe.length) return '';

  const mesi = [...new Set(righe.map(c => meseKey(c.data)).filter(Boolean))];
  const meseCorrente = meseKey(oggi());
  const defaultMese = mesi.find(m => m !== meseCorrente) || mesi[0];
  const meseScelto = window.storicoCarichiMese && mesi.includes(window.storicoCarichiMese)
    ? window.storicoCarichiMese
    : defaultMese;
  window.storicoCarichiMese = meseScelto;

  const gruppi = {};
  righe.filter(c => meseKey(c.data) === meseScelto).forEach(c => {
    const key = `${c.esercizio}__${c.data}__${c.seduta || ''}`;
    if (!gruppi[key]) {
      gruppi[key] = { esercizio: c.esercizio, data: c.data, seduta: c.seduta, giorno: c.giorno, serie: [] };
    }
    gruppi[key].serie.push(c);
  });

  const rows = Object.values(gruppi).map(g => {
    g.serie.sort((a, b) => (Number(a.serie) || 0) - (Number(b.serie) || 0));
    const seen = new Set();
    const serie = g.serie.map((s, i) => {
      let numeroSerie = Number(s.serie) || i + 1;
      if (seen.has(numeroSerie)) numeroSerie = i + 1;
      seen.add(numeroSerie);
      const unita = String(s.note || '').includes('unita:sec') ? 'sec' : 'rip';
      return `<span class="serie-pill"><b>S${numeroSerie}</b>&nbsp;${s.kg || '0'}kg × ${s.rip || '?'} ${unita}</span>`;
    }).join('');
    return `
      <div class="storico-cliente-row">
        <div>
          <strong>${escapeHtml(g.esercizio)}</strong>
          <span>${fmtData(g.data)}${g.seduta ? ' · Sed.' + escapeHtml(g.seduta) : ''}${g.giorno ? ' · ' + escapeHtml(g.giorno) : ''}</span>
        </div>
        <div class="storico-cliente-serie">${serie}</div>
      </div>`;
  }).join('');

  const options = mesi.map(m => `<option value="${m}" ${m === meseScelto ? 'selected' : ''}>${meseLabel(m)}</option>`).join('');
  return `
    <div class="storico-cliente card">
      <div class="card-head">
        <span class="card-title">Storico carichi cliente</span>
        <select class="storico-select" onchange="window.storicoCarichiMese=this.value;renderSchedaBody()">${options}</select>
      </div>
      <div class="card-body">${rows || '<div class="empty-title">Nessun carico nel mese selezionato</div>'}</div>
    </div>`;
}

function renderChartCarico(canvasId, e) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (chartsCarico[canvasId]) chartsCarico[canvasId].destroy();
  const sed = e.seduteManuale.filter(s => s.carico);
  chartsCarico[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sed.map((s, i) => 'Sed.' + (i+1)),
      datasets: [{ label: 'Carico', data: sed.map(s => parseFloat(s.carico) || 0), backgroundColor: 'rgba(28,49,68,.7)', borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function switchGiorno(g) {
  giornoAtt = g;
  renderSchedaBody();
}


// ═══════════════════════════════════════════════════════
//  SCHEDE ALLENAMENTO
// ═══════════════════════════════════════════════════════
function maxGiorniScheda() {
  const sessionsTotal = parseInt(clienteAtt?.sessionsTotal || clienteAtt?.sessions_total || 0, 10);
  if (clienteAtt?.tipoAbbonamento === 'Pacchetto 2' || sessionsTotal === 2) return 1;
  const raw = String(clienteAtt?.sessioni_pref || '').trim();
  const n = parseInt((raw.match(/\d+/) || ['0'])[0], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function giorniPacchettoCliente() {
  const giorni = clienteAtt?.giorniSettimana || clienteAtt?.giorni_settimana || [];
  return Array.isArray(giorni) ? giorni.filter(Boolean) : [];
}

function giorniSchedaChecked() {
  return [...document.querySelectorAll('#giorni-check input:checked')];
}

function applicaGiorniPacchettoScheda() {
  const allowed = giorniPacchettoCliente();
  const max = maxGiorniScheda();
  const inputs = [...document.querySelectorAll('#giorni-check input')];
  if (!inputs.length) return;

  inputs.forEach(input => {
    const label = input.closest('label');
    const isAllowed = !allowed.length || allowed.includes(input.value);
    input.disabled = !isAllowed;
    if (!isAllowed) input.checked = false;
    if (label) {
      label.style.opacity = isAllowed ? '1' : '.35';
      label.style.cursor = isAllowed ? 'pointer' : 'not-allowed';
    }
  });

  let checked = giorniSchedaChecked();
  if (allowed.length && checked.length === 0) {
    const first = inputs.find(input => allowed.includes(input.value) && !input.disabled);
    if (first) first.checked = true;
  }

  checked = giorniSchedaChecked();
  if (max && checked.length > max) {
    checked.slice(max).forEach(input => { input.checked = false; });
  }
}

function limitaGiorniScheda(changed) {
  const allowed = giorniPacchettoCliente();
  if (changed && allowed.length && !allowed.includes(changed.value)) {
    changed.checked = false;
    toast('Questo giorno non è previsto dal pacchetto del cliente', 'err');
    return false;
  }

  const max = maxGiorniScheda();
  if (!max) return true;
  const checked = giorniSchedaChecked();
  if (checked.length <= max) return true;
  if (changed) changed.checked = false;
  else checked.slice(max).forEach(c => { c.checked = false; });
  toast('Il pacchetto prevede massimo ' + max + ' giorni a settimana', 'err');
  return false;
}

function openNuovaScheda() {
  applicaGiorniPacchettoScheda();
  limitaGiorniScheda();
  openMo('mo-nuova-scheda');
}

async function creaScheda() {
  const nome = gv('ns-nome');
  if (!nome) { toast('Nome obbligatorio', 'err'); return; }
  if (!limitaGiorniScheda()) return;
  const giorni = [...document.querySelectorAll('#giorni-check input:checked')].map(c => c.value);
  if (!giorni.length) { toast('Seleziona almeno un giorno', 'err'); return; }
  const allowed = giorniPacchettoCliente();
  if (allowed.length && giorni.some(g => !allowed.includes(g))) {
    toast('Puoi selezionare solo i giorni scelti nel pacchetto', 'err');
    return;
  }

  const scheda = {
    id: 'sch_' + Date.now(),
    clienteId: clienteAtt.id,
    nome, inizio: gv('ns-inizio'),
    settimane: parseInt(gv('ns-sett')),
    giorni, note: gv('ns-note'),
    esercizi: {},
  };
  giorni.forEach(g => { scheda.esercizi[g] = []; });

  const res = await apiPost({ action: 'saveScheda', ...scheda, datiJSON: scheda });
  if (!res || res.error || res.success === false) {
    toast((res && res.error) || 'Errore salvataggio scheda', 'err');
    return;
  }
  schedeAtt.unshift(scheda);
  closeMo('mo-nuova-scheda');
  renderProgramma();
  toast('Scheda creata', 'ok');
}

async function eliminaScheda(id) {
  if (!confirm('Eliminare questa scheda?')) return;
  await apiPost({ action: 'deleteScheda', id });
  schedeAtt = schedeAtt.filter(s => s.id !== id);
  renderProgramma();
  toast('Scheda eliminata');
}


// ═══════════════════════════════════════════════════════
//  MODAL ESERCIZIO
// ═══════════════════════════════════════════════════════
function openMoEsercizio() {
  meEditIdx = null;
  meEserc = null; meProg = null;
  document.getElementById('me-title').textContent = 'Aggiungi Esercizio — ' + giornoAtt;
  document.getElementById('me-search').value = '';
  document.getElementById('me-custom').value = '';
  document.getElementById('me-note').value = '';
  document.getElementById('me-recupero').value = "2'";
  document.getElementById('me-sel-label').textContent = '—';
  document.getElementById('pb-preview').innerHTML = '';
  renderEserciziList();
  renderProgBloccoTabs();
  openMo('mo-esercizio');
}

function openModificaEsercizio(idx) {
  const e = schedaAtt?.esercizi?.[giornoAtt]?.[idx];
  if (!e) return;
  meEditIdx = idx;
  meEserc = { nome: e.nome, categoria: e.categoria || '' };
  meProg = e.progressione || 'NONE';
  document.getElementById('me-title').textContent = 'Modifica esercizio — ' + giornoAtt;
  document.getElementById('me-search').value = '';
  document.getElementById('me-custom').value = e.nome || '';
  document.getElementById('me-note').value = e.note || '';
  document.getElementById('me-recupero').value = e.recupero || "2'";
  document.getElementById('me-sel-label').textContent = e.nome || '—';
  renderEserciziList();
  renderProgBloccoTabs();
  openMo('mo-esercizio');
}

function renderEserciziList() {
  const q = document.getElementById('me-search').value.toLowerCase();
  const esc = v => String(v || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
  const js = v => String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let html = '';
  for (const [cat, list] of Object.entries(ESERCIZI)) {
    const filtered = list.filter(e => !q || e.toLowerCase().includes(q));
    if (!filtered.length) continue;
    html += `<div class="eserc-cat-label">${esc(cat)}</div>`;
    html += filtered.map(e => `
      <button type="button" class="eserc-item ${meEserc?.nome === e ? 'selected' : ''}" onclick="selEserc('${js(e)}','${js(cat)}')">
        <span class="eserc-item-name">${esc(e)}</span>
        <span class="eserc-item-cat">${esc(cat)}</span>
        <span class="eserc-item-pick">${meEserc?.nome === e ? 'Scelto' : 'Scegli'}</span>
      </button>`).join('');
  }
  document.getElementById('me-eserc-list').innerHTML = html || '<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Nessun risultato</div>';
}

function selEserc(nome, cat) {
  meEserc = { nome, categoria: cat };
  document.getElementById('me-sel-label').textContent = nome;
  renderEserciziList();
  // Ora che ho un esercizio, popola l'area progressioni
  renderProgBloccoTabs();
}

function renderProgBloccoTabs() {
  // Se non c'è ancora un esercizio scelto, placeholder
  if (!meEserc) {
    document.getElementById('pb-tabs').innerHTML = '';
    document.getElementById('pb-preview').innerHTML = '';
    document.getElementById('pb-list').innerHTML = `
      <div style="padding:30px 16px;text-align:center;color:var(--text3);font-size:13px;font-style:italic">
        ← Scegli prima un esercizio<br>per vedere le progressioni disponibili
      </div>`;
    return;
  }
  const blocchi = Object.keys(PROGRESSIONI);
  document.getElementById('pb-tabs').innerHTML = blocchi.map((b, i) => {
    const label = b.replace(/^[^\p{L}\p{N}]+/u, '').trim();
    return `<button class="pb-tab ${i===0?'active':''}" onclick="switchProgBlocco('${b}',this)">${label}</button>`;
  }).join('');
  renderProgList(blocchi[0]);
}

function switchProgBlocco(blocco, btn) {
  document.querySelectorAll('.pb-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProgList(blocco);
}

function renderProgList(blocco) {
  const progs = PROGRESSIONI[blocco] || [];
  const senzaProg = `
    <div class="prog-item ${meProg === 'NONE' ? 'sel' : ''}" onclick="selProg('__none__',0)" style="border-left:3px solid var(--gold)">
      <div class="prog-card-head">
        <div class="prog-nome">Senza progressione</div>
        <div class="prog-preview">Compila liberamente le serie seduta per seduta</div>
      </div>
    </div>`;
  const progHtml = progs.map((p, i) => `
    <div class="prog-item ${meProg?.nome === p.nome ? 'sel' : ''}" onclick="selProg('${blocco}',${i})">
      <div class="prog-card-head">
        <div>
          <div class="prog-nome">${p.nome}</div>
          <div class="prog-preview">${p.sedute.length} sedute · TUT ${p.tut}</div>
        </div>
        <span class="prog-pick">${meProg?.nome === p.nome ? 'Selezionata' : 'Scegli'}</span>
      </div>
      <div class="prog-card-sedute">
        ${p.sedute.map((sed, n) => `
          <div class="prog-card-seduta">
            <span>Sed.${n + 1}</span>
            <strong>${sed}</strong>
          </div>
        `).join('')}
      </div>
    </div>`).join('');
  document.getElementById('pb-list').innerHTML = senzaProg + progHtml;
  renderProgPreview();
}

function selProg(blocco, idx) {
  if (blocco === '__none__') {
    meProg = 'NONE';
  } else {
    meProg = PROGRESSIONI[blocco][idx];
  }
  renderProgList(blocco);
}

function renderProgPreview() {
  const el = document.getElementById('pb-preview');
  if (!el) return;
  if (!meProg || meProg === 'NONE') {
    el.innerHTML = meProg === 'NONE'
      ? '<div class="prog-preview-empty">Progressione manuale: compilerai le sedute liberamente.</div>'
      : '';
    return;
  }
  el.innerHTML = `
    <div class="prog-preview-title">
      <span>${meProg.nome}</span>
      <em>TUT ${meProg.tut}</em>
    </div>
    <div class="prog-preview-grid">
      ${meProg.sedute.map((s, i) => `
        <div class="prog-preview-step">
          <span>Sed.${i + 1}</span>
          <strong>${s}</strong>
        </div>
      `).join('')}
    </div>`;
}

async function salvaEsercizio() {
  const custom = document.getElementById('me-custom').value.trim();
  const nome = meEserc?.nome || custom;
  if (!nome) { toast('Seleziona o inserisci un esercizio', 'err'); return; }

  const eserc = {
    id: meEditIdx !== null ? (schedaAtt.esercizi[giornoAtt][meEditIdx].id || 'e_' + Date.now()) : 'e_' + Date.now(),
    nome, categoria: meEserc?.categoria || '',
    recupero: document.getElementById('me-recupero').value,
    note: document.getElementById('me-note').value,
    progressione: (meProg && meProg !== 'NONE') ? meProg : null,
    seduteManuale: meEditIdx !== null ? (schedaAtt.esercizi[giornoAtt][meEditIdx].seduteManuale || null) : null,
  };

  if (!schedaAtt.esercizi[giornoAtt]) schedaAtt.esercizi[giornoAtt] = [];
  let backup = null;
  if (meEditIdx !== null) {
    backup = schedaAtt.esercizi[giornoAtt][meEditIdx];
    schedaAtt.esercizi[giornoAtt][meEditIdx] = eserc;
  } else {
    schedaAtt.esercizi[giornoAtt].push(eserc);
  }
  const ok = await salvaSchedaAttuale();
  if (!ok) {
    if (meEditIdx !== null) schedaAtt.esercizi[giornoAtt][meEditIdx] = backup;
    else schedaAtt.esercizi[giornoAtt].pop();
    return;
  }
  closeMo('mo-esercizio');
  renderSchedaBody();
  toast(meEditIdx !== null ? 'Esercizio aggiornato' : 'Esercizio aggiunto', 'ok');
  meEditIdx = null;
}

async function eliminaEsercizio(idx) {
  if (!confirm('Rimuovere esercizio?')) return;
  const rimossi = schedaAtt.esercizi[giornoAtt].splice(idx, 1);
  const ok = await salvaSchedaAttuale();
  if (!ok) {
    schedaAtt.esercizi[giornoAtt].splice(idx, 0, ...rimossi);
    return;
  }
  renderSchedaBody();
}


// ═══════════════════════════════════════════════════════
//  SEDUTA MANUALE
// ═══════════════════════════════════════════════════════
function openSedutaManuale(idx) {
  meSedutaIdx = idx;
  const e = schedaAtt.esercizi[giornoAtt][idx];
  document.getElementById('msed-title').textContent = 'Compila Sedute — ' + e.nome;
  const sed = e.seduteManuale || Array(6).fill(null).map(() => ({prescrizione:'',carico:'',note:''}));
  document.getElementById('msed-body').innerHTML = sed.map((s, i) => `
    <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr;gap:8px;margin-bottom:10px;align-items:end">
      <div style="font-size:12px;font-weight:700;color:var(--accent);padding-bottom:8px">Sed.${i+1}</div>
      <div class="field" style="margin:0"><label>Serie×Reps</label><input type="text" id="s-p-${i}" value="${s?.prescrizione||''}" placeholder="4×8"></div>
      <div class="field" style="margin:0"><label>Carico</label><input type="text" id="s-c-${i}" value="${s?.carico||''}" placeholder="80kg"></div>
      <div class="field" style="margin:0"><label>Note</label><input type="text" id="s-n-${i}" value="${s?.note||''}" placeholder="—"></div>
    </div>`).join('');
  openMo('mo-seduta');
}

async function salvaSedutaManuale() {
  const e = schedaAtt.esercizi[giornoAtt][meSedutaIdx];
  e.seduteManuale = Array(6).fill(null).map((_,i) => ({ prescrizione: gv('s-p-'+i), carico: gv('s-c-'+i), note: gv('s-n-'+i) }));
  const ok = await salvaSchedaAttuale();
  if (!ok) return;
  closeMo('mo-seduta');
  renderSchedaBody();
  toast('Sedute salvate', 'ok');
}

async function salvaSchedaAttuale() {
  const idx = schedeAtt.findIndex(s => s.id === schedaAtt.id);
  if (idx >= 0) schedeAtt[idx] = schedaAtt;
  const res = await apiPost({ action: 'saveScheda', ...schedaAtt, datiJSON: schedaAtt });
  if (!res || res.error || res.success === false) {
    toast((res && res.error) || 'Errore salvataggio scheda', 'err');
    return false;
  }
  return true;
}
