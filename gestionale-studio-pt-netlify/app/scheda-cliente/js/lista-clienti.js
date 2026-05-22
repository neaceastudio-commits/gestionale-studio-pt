
// ═══════════════════════════════════════════════════════
//  LISTA CLIENTI
// ═══════════════════════════════════════════════════════
function aggiornaKPI() {
  const tot  = clientiAll.length;
  const att  = clientiAll.filter(c => c.statoAbbonamento === 'Attivo').length;
  const sch  = clientiAll.filter(c => leggiStorage(c.id, 'schede')?.length).length;
  const incomp = clientiAll.filter(c => !leggiStorage(c.id, 'datiFisici')?.length).length;
  document.getElementById('kpi-tot').textContent    = tot;
  document.getElementById('kpi-att').textContent    = att;
  document.getElementById('kpi-sch').textContent    = sch;
  document.getElementById('kpi-incomp').textContent = incomp;
  document.getElementById('lista-sub').textContent  = tot + ' clienti totali';
}

function setFiltro(f, btn) {
  filtroLista = f;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLista();
}

function renderLista() {
  const q = document.getElementById('search-input').value.toLowerCase();
  let lista = clientiAll.filter(c => {
    const nome = (c.nome + ' ' + c.cognome + ' ' + (c.email || '')).toLowerCase();
    if (q && !nome.includes(q)) return false;
    if (filtroLista === 'attivi') return c.statoAbbonamento === 'Attivo';
    if (filtroLista === 'senza_scheda') return !leggiStorage(c.id, 'schede')?.length;
    return true;
  });

  const body = document.getElementById('lista-body');
  if (!lista.length) {
    body.innerHTML = '<div class="empty"><div class="empty-title">Nessun cliente</div></div>'; return;
  }

  body.innerHTML = lista.map(c => {
    const pt = staffAll.find(s => s.id === c.ptAssegnato);
    const ptNome = pt ? pt.nome + ' ' + pt.cognome : '—';
    const stato = c.statoAbbonamento === 'Attivo'
      ? '<span class="badge b-att">Attivo</span>'
      : '<span class="badge b-no">' + (c.statoAbbonamento || 'Non assegnato') + '</span>';
    const schede = leggiStorage(c.id, 'schede') || [];
    const schedaBadge = schede.length
      ? '<span class="badge b-acc">' + schede.length + ' ' + (schede.length === 1 ? 'scheda' : 'schede') + '</span>'
      : '<span class="badge b-no">Nessuna</span>';
    return `<div class="trow cols-cli" onclick="apriScheda('${c.id}')">
      <div class="td"><div class="client-name">${c.nome} ${c.cognome}</div><div class="client-sub">${c.email || ''}</div></div>
      <div class="td" style="font-size:12px;color:var(--text2)">${ptNome}</div>
      <div class="td">${stato}</div>
      <div class="td">${schedaBadge}</div>
      <div class="td"><div class="acts">
        <button class="act ar" onclick="event.stopPropagation();apriScheda('${c.id}')">Apri</button>
        <button class="act ae" onclick="event.stopPropagation();apriImpostazioni('${c.id}')">⚙</button>
      </div></div>
    </div>`;
  }).join('');
}
