
// ═══════════════════════════════════════════════════════
//  APRI SCHEDA CLIENTE
// ═══════════════════════════════════════════════════════
async function apriScheda(id) {
  clienteAtt = clientiAll.find(c => c.id === id);
  if (!clienteAtt) return;

  // Carica dati
  datiFisiciAtt = leggiStorage(id, 'datiFisici') || [];
  visiteAtt     = leggiStorage(id, 'visite')     || [];
  schedeAtt     = leggiStorage(id, 'schede')     || [];
  fotoAtt       = leggiStorage(id, 'foto')       || [];
  carichiAtt    = leggiStorage(id, 'carichi')    || [];
  schedaAtt     = schedeAtt.length ? schedeAtt[schedeAtt.length - 1] : null;
  giornoAtt     = schedaAtt ? schedaAtt.giorni[0] : null;

  // Prova a caricare da API
  if (API_CONFIGURATA) {
    const [rDf, rV, rS, rF, rC] = await Promise.all([
      apiGet('getDatiFisici', { clienteId: id }),
      apiGet('getVisiteAlle', { clienteId: id }),
      apiGet('getSchede', { clienteId: id }),
      apiGet('getFoto', { clienteId: id }),
      apiGet('getCarichi', { clienteId: id }),
    ]);
    if (rDf.datiFisici) { datiFisiciAtt = rDf.datiFisici; salvaStorage(id, 'datiFisici', datiFisiciAtt); }
    if (rV.visite)      { visiteAtt = rV.visite;           salvaStorage(id, 'visite', visiteAtt); }
    if (rS.schede)      { schedeAtt = rS.schede;           salvaStorage(id, 'schede', schedeAtt); schedaAtt = schedeAtt[0] || null; }
    if (rF.foto)        { fotoAtt = rF.foto;               salvaStorage(id, 'foto', fotoAtt); }
    if (rC && rC.carichi) { carichiAtt = rC.carichi;       salvaStorage(id, 'carichi', carichiAtt); }
  }

  // Topbar
  document.getElementById('nav-cliente-nome').textContent = clienteAtt.nome + ' ' + clienteAtt.cognome;
  document.getElementById('nav-cliente-wrap').style.display = 'flex';
  document.getElementById('nav-sezioni').style.display = 'flex';
  document.getElementById('btn-back').style.display = '';

  // Hero
  document.getElementById('ch-nome').textContent = clienteAtt.nome + ' ' + clienteAtt.cognome;
  const eta = clienteAtt.nascita ? Math.floor((Date.now() - new Date(clienteAtt.nascita)) / 3.15576e10) : null;
  document.getElementById('ch-meta').innerHTML = [
    clienteAtt.email    ? `<span>✉ ${clienteAtt.email}</span>` : '',
    clienteAtt.telefono ? `<span>📞 ${clienteAtt.telefono}</span>` : '',
    eta                 ? `<span>🎂 ${eta} anni</span>` : '',
    clienteAtt.sessioni_pref ? `<span>📅 ${clienteAtt.sessioni_pref}/sett</span>` : '',
  ].filter(Boolean).join('');

  setSezione('home');
  showView('view-scheda');
}


// ═══════════════════════════════════════════════════════
//  SEZIONI
// ═══════════════════════════════════════════════════════
function setSezione(sez) {
  if (sez === 'impostazioni') {
    if (clienteAtt && typeof apriImpostazioni === 'function') apriImpostazioni(clienteAtt.id);
    return;
  }

  sezioneAtt = sez;
  ['home','fisici','programma','foto'].forEach(s => {
    const body = document.getElementById('sez-' + s + '-body');
    if (body) body.style.display = s === sez ? '' : 'none';
    document.getElementById('sez-' + s)?.classList.toggle('active', s === sez);
    const navBtn = document.getElementById('snav-' + s);
    if (navBtn) navBtn.classList.toggle('active', s === sez);
  });
  if (sez === 'home')      renderRiepilogo();
  if (sez === 'fisici')    renderDatiFisici();
  if (sez === 'programma') renderProgramma();
  if (sez === 'foto')      renderFoto();
}


// ═══════════════════════════════════════════════════════
//  RIEPILOGO
// ═══════════════════════════════════════════════════════
function renderRiepilogo() {
  const c = clienteAtt;
  const campi = [
    ['Obiettivo', c.obiettivo || c.obiettivoLibero],
    ['Esperienza', c.esperienza],
    ['Sessioni/sett', c.sessioni_pref],
    ['Orari pref.', c.orari],
    ['Sport', c.sport],
    ['Abbonamento', c.tipoAbbonamento],
    ['Scadenza', c.dataScadenza],
    ['PT assegnato', staffAll.find(s => s.id === c.ptAssegnato)?.nome || '—'],
    ['Motivazione', c.motivazione ? c.motivazione + '/10' : null],
    ['Impressioni', c.impressioni],
  ].filter(([,v]) => v);

  document.getElementById('riep-dati').innerHTML = campi.map(([l,v]) => `
    <div class="dati-item">
      <div class="dati-label">${l}</div>
      <div class="dati-val">${v}</div>
    </div>`).join('') || '<div class="dati-item"><div class="dati-val empty">Nessun dato disponibile</div></div>';

  // Storico visite
  const visteEl = document.getElementById('riep-visite');
  if (!visiteAtt.length) {
    visteEl.innerHTML = '<div class="empty"><div class="empty-title">Nessuna visita</div></div>'; return;
  }
  visteEl.innerHTML = [...visiteAtt].sort((a,b) => b.data.localeCompare(a.data)).map(v => `
    <div class="visita-item">
      <div>
        <div class="visita-data">${fmtData(v.data)}</div>
        <div class="visita-meta">${v.peso ? v.peso + ' kg · ' : ''}${v.note || ''}</div>
      </div>
      <button class="act ad btn-sm" onclick="eliminaVisita('${v.id}')">✕</button>
    </div>`).join('');

  // Note PT
  const note = leggiStorage(clienteAtt.id, 'note_pt') || '';
  document.getElementById('note-pt-area').value = note;
}
