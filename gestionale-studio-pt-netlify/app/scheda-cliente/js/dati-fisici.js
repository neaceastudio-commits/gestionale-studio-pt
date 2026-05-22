
// ═══════════════════════════════════════════════════════
//  DATI FISICI
// ═══════════════════════════════════════════════════════
function renderDatiFisici() {
  const ultimo = datiFisiciAtt[0];
  if (!ultimo) {
    document.getElementById('fisici-data-label').textContent = 'Nessun rilevamento';
    document.getElementById('mis-peso').textContent    = '—';
    document.getElementById('mis-altezza').textContent = '—';
    document.getElementById('mis-bmi').textContent     = '—';
    document.getElementById('mis-pgc').textContent     = '—';
    document.getElementById('visbody-dati').innerHTML  = '<div class="dati-item"><div class="dati-val empty">Nessun dato</div></div>';
    document.getElementById('baiobit-tests').innerHTML = BAIOBIT_TESTS.map(t => `
      <div class="test-item"><span class="test-nome">${t}</span><span class="test-empty">—</span></div>`).join('');
    return;
  }

  document.getElementById('fisici-data-label').textContent = 'Ultimo: ' + fmtData(ultimo.data);
  document.getElementById('mis-peso').textContent    = ultimo.peso || '—';
  document.getElementById('mis-altezza').textContent = ultimo.altezza || '—';
  const bmi = (ultimo.v_bmi || (ultimo.peso && ultimo.altezza ? (ultimo.peso / Math.pow(ultimo.altezza/100,2)).toFixed(1) : null));
  document.getElementById('mis-bmi').textContent     = bmi || '—';
  document.getElementById('mis-pgc').textContent     = ultimo.v_pgc || '—';

  // Visbody
  const vCampi = [
    ['Massa Grassa', ultimo.v_grassa, 'kg'],
    ['Massa Muscolare', ultimo.v_muscolare, 'kg'],
    ['% PGC', ultimo.v_pgc, '%'],
    ['Metabolismo', ultimo.v_metabolismo, 'kcal'],
    ['FFM', ultimo.v_ffm, 'kg'],
    ['Acqua Totale', ultimo.v_tbw, 'lt'],
    ['Vita', ultimo.v_vita, 'cm'],
    ['Fianchi', ultimo.v_fianchi, 'cm'],
    ['Score', ultimo.v_score, ''],
    ['Età Metabolica', ultimo.v_eta_met, 'anni'],
    ['Indice Salute', ultimo.v_indice, ''],
  ].filter(([,v]) => v);
  document.getElementById('visbody-dati').innerHTML = vCampi.map(([l,v,u]) => `
    <div class="dati-item"><div class="dati-label">${l}</div><div class="dati-val">${v} <small style="color:var(--text3)">${u}</small></div></div>`).join('');

  // Baiobit
  const bKeys = ['b_cammino','b_spalla','b_squat_jump','b_caduta','b_tronco','b_cervicale','b_drop_jump','b_jump_mono','b_stiffness'];
  document.getElementById('baiobit-tests').innerHTML = BAIOBIT_TESTS.map((t, i) => {
    const val = ultimo[bKeys[i]];
    return `<div class="test-item"><span class="test-nome">${t}</span>${val ? `<span class="test-val">${val}</span>` : '<span class="test-empty">—</span>'}</div>`;
  }).join('');

  // Grafici
  renderChartComposizione(ultimo);
  renderChartPeso();
}

function renderChartComposizione(d) {
  const ctx = document.getElementById('chart-composizione');
  if (!ctx) return;
  if (chartComp) chartComp.destroy();
  if (!d.v_grassa && !d.v_muscolare) return;
  chartComp = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Massa Grassa', 'Massa Muscolare', 'Altro'],
      datasets: [{ data: [
        parseFloat(d.v_grassa || 0),
        parseFloat(d.v_muscolare || 0),
        Math.max(0, (parseFloat(d.peso || 0) - parseFloat(d.v_grassa || 0) - parseFloat(d.v_muscolare || 0)))
      ], backgroundColor: ['#c0392b','#2d6a4f','#d4ccc0'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 10 } } } }
  });
}

function renderChartPeso() {
  const ctx = document.getElementById('chart-peso');
  if (!ctx || datiFisiciAtt.length < 2) return;
  if (chartPeso) chartPeso.destroy();
  const sorted = [...datiFisiciAtt].filter(d => d.peso).sort((a,b) => a.data.localeCompare(b.data));
  chartPeso = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(d => fmtData(d.data)),
      datasets: [{ label: 'Peso (kg)', data: sorted.map(d => parseFloat(d.peso)), borderColor: '#1c3144', backgroundColor: 'rgba(28,49,68,.05)', tension: .3, pointRadius: 4, borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }
  });
}


// ═══════════════════════════════════════════════════════
//  SALVA VISITA
// ═══════════════════════════════════════════════════════
async function salvaVisita() {
  const data = gv('v-data');
  if (!data) { toast('Data obbligatoria', 'err'); return; }
  const id = 'vis_' + Date.now();
  const visita = { id, clienteId: clienteAtt.id, data, peso: gv('v-peso'), note: gv('v-note') };

  const r = await apiPost({ action: 'saveVisitaAlle', ...visita });
  if (r.error && API_CONFIGURATA) { toast(r.error, 'err'); return; }

  visiteAtt.unshift(visita);
  salvaStorage(clienteAtt.id, 'visite', visiteAtt);
  closeMo('mo-visita');
  renderRiepilogo();
  toast('Visita salvata', 'ok');
}

async function eliminaVisita(id) {
  if (!confirm('Eliminare questa visita?')) return;
  await apiPost({ action: 'deleteVisitaAlle', id });
  visiteAtt = visiteAtt.filter(v => v.id !== id);
  salvaStorage(clienteAtt.id, 'visite', visiteAtt);
  renderRiepilogo();
  toast('Visita eliminata');
}


// ═══════════════════════════════════════════════════════
//  SALVA DATI FISICI
// ═══════════════════════════════════════════════════════
async function salvaDatiFisici() {
  const data = gv('df-data');
  if (!data) { toast('Data obbligatoria', 'err'); return; }
  const id = 'df_' + Date.now();
  const df = {
    id, clienteId: clienteAtt.id, data,
    peso: gv('df-peso'), altezza: gv('df-altezza'),
    v_grassa: gv('df-v-grassa'), v_muscolare: gv('df-v-muscolare'),
    v_pgc: gv('df-v-pgc'), v_bmi: gv('df-v-bmi'),
    v_metabolismo: gv('df-v-metabolismo'), v_eta_met: gv('df-v-eta-met'),
    v_ffm: gv('df-v-ffm'), v_tbw: gv('df-v-tbw'),
    v_vita: gv('df-v-vita'), v_fianchi: gv('df-v-fianchi'),
    v_score: gv('df-v-score'), v_indice: gv('df-v-indice'),
    b_cammino: gv('df-b-cammino'), b_spalla: gv('df-b-spalla'),
    b_squat_jump: gv('df-b-squat-jump'), b_caduta: gv('df-b-caduta'),
    b_tronco: gv('df-b-tronco'), b_cervicale: gv('df-b-cervicale'),
    b_drop_jump: gv('df-b-drop-jump'), b_jump_mono: gv('df-b-jump-mono'),
    b_stiffness: gv('df-b-stiffness'), note: gv('df-note'),
  };

  const r = await apiPost({ action: 'saveDatiFisici', ...df });
  if (r.error && API_CONFIGURATA) { toast(r.error, 'err'); return; }

  datiFisiciAtt.unshift(df);
  salvaStorage(clienteAtt.id, 'datiFisici', datiFisiciAtt);
  closeMo('mo-dati-fisici');
  renderDatiFisici();
  toast('Dati fisici salvati', 'ok');
}
