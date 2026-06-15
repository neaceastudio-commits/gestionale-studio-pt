
// ═══════════════════════════════════════════════════════
//  NOTE PT
// ═══════════════════════════════════════════════════════
function salvaNoteCliente() {
  salvaStorage(clienteAtt.id, 'note_pt', document.getElementById('note-pt-area').value);
  toast('Note salvate', 'ok');
}


// ═══════════════════════════════════════════════════════
//  IMPOSTAZIONI / PT
// ═══════════════════════════════════════════════════════
function apriImpostazioni(id) {
  clienteAtt = clientiAll.find(c => c.id === id);
  // Popola select PT
  const opts = staffAll.map(s => `<option value="${s.id}" ${clienteAtt.ptAssegnato===s.id?'selected':''}>${s.nome} ${s.cognome} (${s.ruolo})</option>`).join('');
  document.getElementById('imp-pt').innerHTML = '<option value="">— Nessun PT —</option>' + opts;
  document.getElementById('imp-sposta').innerHTML = '<option value="">— Stesso PT —</option>' + opts;
  document.getElementById('imp-tipo-abb').value = clienteAtt.tipoAbbonamento || '';
  document.getElementById('imp-data-inizio').value = clienteAtt.dataInizio || oggi();
  openMo('mo-impostazioni');
}

async function salvaImpostazioni() {
  const ptId      = document.getElementById('imp-pt').value;
  const spostaId  = document.getElementById('imp-sposta').value;
  const tipoAbb   = document.getElementById('imp-tipo-abb').value;
  const dataInizio= document.getElementById('imp-data-inizio').value;

  const target = spostaId || ptId;
  await apiPost({ action: 'assegnaPT', clienteId: clienteAtt.id, ptId: target });
  if (tipoAbb) await apiPost({ action: 'rinnovaAbbonamento', id: clienteAtt.id, tipoAbbonamento: tipoAbb, dataInizio });

  const c = clientiAll.find(x => x.id === clienteAtt.id);
  if (c) { c.ptAssegnato = target; c.tipoAbbonamento = tipoAbb; }
  closeMo('mo-impostazioni');
  renderLista();
  toast('Impostazioni salvate', 'ok');
}


// ═══════════════════════════════════════════════════════
//  MODIFICA CLIENTE
// ═══════════════════════════════════════════════════════
async function salvaModifica() {
  const dati = {
    id: clienteAtt.id,
    nome: gv('mod-nome'), cognome: gv('mod-cognome'),
    telefono: gv('mod-tel'), email: gv('mod-email'),
    obiettivo: gv('mod-obiettivo'), servizi: gv('mod-servizi'),
  };
  await apiPost({ action: 'modificaCliente', ...dati });
  Object.assign(clienteAtt, dati);
  const c = clientiAll.find(x => x.id === clienteAtt.id);
  if (c) Object.assign(c, dati);
  closeMo('mo-modifica');
  apriScheda(clienteAtt.id);
  toast('Cliente aggiornato', 'ok');
}


// ═══════════════════════════════════════════════════════
//  DOPPIO CLIENTE 1:2
// ═══════════════════════════════════════════════════════
function apriDoppio() {
  document.getElementById('dual-nome-1').textContent = clienteAtt.nome + ' ' + clienteAtt.cognome;
  const schede1 = schedeAtt;
  document.getElementById('dual-prog-1').innerHTML = schede1.length
    ? renderDualScheda(schede1[0])
    : '<div class="empty"><div class="empty-title">Nessuna scheda</div></div>';

  // Popola select secondo cliente
  const sel = document.getElementById('doppio-select');
  sel.innerHTML = '<option value="">— Seleziona cliente 2 —</option>';
  clientiAll.filter(c => c.id !== clienteAtt.id).forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.nome + ' ' + c.cognome;
    sel.appendChild(o);
  });

  showView('view-doppio');
}

function caricaSecondoCliente() {
  const id = document.getElementById('doppio-select').value;
  if (!id) { document.getElementById('dual-prog-2').innerHTML = '<div class="empty"><div class="empty-title">Seleziona un cliente</div></div>'; return; }
  const c2 = clientiAll.find(c => c.id === id);
  document.getElementById('dual-nome-2').textContent = c2.nome + ' ' + c2.cognome;
  const schede2 = leggiStorage(id, 'schede') || [];
  document.getElementById('dual-prog-2').innerHTML = schede2.length
    ? renderDualScheda(schede2[0])
    : '<div class="empty"><div class="empty-title">Nessuna scheda</div></div>';
}

function renderDualScheda(s) {
  if (!s) return '<div class="empty"><div class="empty-title">Nessuna scheda</div></div>';
  let datiJSON = s.datiJSON || null;
  if (typeof datiJSON === 'string') {
    try { datiJSON = JSON.parse(datiJSON); } catch (e) { datiJSON = null; }
  }
  let giorni = Array.isArray(s.giorni) ? s.giorni : (Array.isArray(datiJSON?.giorni) ? datiJSON.giorni : []);
  let eserciziByDay = s.esercizi && typeof s.esercizi === 'object' && !Array.isArray(s.esercizi)
    ? s.esercizi
    : (datiJSON?.esercizi && typeof datiJSON.esercizi === 'object' ? datiJSON.esercizi : {});
  if (!giorni.length) giorni = Object.keys(eserciziByDay);
  return `<div style="font-size:13px;font-weight:600;margin-bottom:10px">${s.nome}</div>
    ${giorni.map(g => {
      const esercizi = eserciziByDay[g] || [];
      return `<div style="margin-bottom:12px">
        <div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;padding:4px 8px;background:var(--ab);border-radius:var(--r)">${g}</div>
        ${esercizi.length ? esercizi.map((e,i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--border);font-size:12px">
            <span style="width:20px;height:20px;background:var(--accent);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">${i+1}</span>
            <span style="font-weight:600">${e.nome}</span>
            ${e.progressione ? `<span style="margin-left:auto;font-size:10px;color:var(--text3)">${e.progressione.nome}</span>` : ''}
          </div>`).join('') : '<div style="font-size:12px;color:var(--text3);padding:6px 8px">Nessun esercizio</div>'}
      </div>`;
    }).join('')}`;
}
