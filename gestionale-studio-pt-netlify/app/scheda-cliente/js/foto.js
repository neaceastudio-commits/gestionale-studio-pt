
// ═══════════════════════════════════════════════════════
//  FOTO
// ═══════════════════════════════════════════════════════
function renderFoto() {
  // Popola filtro visite
  const filtro = document.getElementById('foto-visita-filter');
  filtro.innerHTML = '<option value="">Tutte le visite</option>';
  visiteAtt.forEach(v => {
    const o = document.createElement('option');
    o.value = v.id; o.textContent = fmtData(v.data);
    filtro.appendChild(o);
  });

  const visitaFiltro = filtro.value;
  const foto = visitaFiltro ? fotoAtt.filter(f => f.visitaId === visitaFiltro) : fotoAtt;
  const grid = document.getElementById('foto-grid');

  if (!foto.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-title">Nessuna foto</div><div class="empty-sub">Carica le foto della visita</div></div>';
    return;
  }

  grid.innerHTML = foto.map(f => `
    <div class="foto-item" onclick="apriLightbox('${f.url}')">
      <img src="${f.url}" alt="${f.filename || ''}" loading="lazy">
      <div class="foto-meta">${fmtData(f.data)}</div>
      <button class="foto-del" onclick="event.stopPropagation();eliminaFoto('${f.id}')">✕</button>
    </div>`).join('');
}

async function uploadFotoVisita(files) {
  if (!files || !files.length) return;
  const prog = document.getElementById('prog-foto');
  const bar  = document.getElementById('bar-foto');
  prog.classList.add('show');

  for (let i = 0; i < files.length; i++) {
    bar.style.width = Math.round((i / files.length) * 100) + '%';
    const file = files[i];
    try {
      const b64 = await fileToBase64Resized(file, 1200, 0.8);
      const filename = clienteAtt.id + '_' + Date.now() + '_' + file.name;
      const r = await apiPost({
        action: 'uploadFoto',
        clienteId: clienteAtt.id,
        base64: b64.split(',')[1],
        filename,
        mimeType: 'image/jpeg',
        data: oggi(),
      });
      if (r.success) {
        const nuova = { id: r.id, clienteId: clienteAtt.id, url: r.url, filename, data: oggi() };
        fotoAtt.unshift(nuova);
        salvaStorage(clienteAtt.id, 'foto', fotoAtt);
      }
    } catch(e) { console.error(e); }
  }

  bar.style.width = '100%';
  setTimeout(() => { prog.classList.remove('show'); bar.style.width = '0'; }, 600);
  renderFoto();
  toast('Foto caricate', 'ok');
}

async function handleFotoDrop(e) {
  e.preventDefault();
  document.getElementById('foto-drop-area').classList.remove('drag');
  await uploadFotoVisita(e.dataTransfer.files);
}

async function eliminaFoto(id) {
  if (!confirm('Eliminare questa foto?')) return;
  await apiPost({ action: 'deleteFoto', id });
  fotoAtt = fotoAtt.filter(f => f.id !== id);
  salvaStorage(clienteAtt.id, 'foto', fotoAtt);
  renderFoto();
  toast('Foto eliminata');
}

function apriLightbox(url) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox').classList.add('open');
}


// ═══════════════════════════════════════════════════════
//  UPLOAD FILE DISPOSITIVI
// ═══════════════════════════════════════════════════════
async function handleFileChange(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  const prog = document.getElementById('prog-' + tipo);
  const bar  = document.getElementById('bar-' + tipo);
  prog.classList.add('show');
  bar.style.width = '30%';

  try {
    let b64, mime, ext;
    if (file.type.startsWith('image/')) {
      b64  = await fileToBase64Resized(file, 1200, 0.8);
      mime = 'image/jpeg';
      ext  = '.jpg';
    } else {
      b64  = await fileToBase64(file);
      mime = file.type;
      ext  = '.' + file.name.split('.').pop();
    }
    bar.style.width = '60%';
    const filename = clienteAtt.id + '_' + tipo + '_' + Date.now() + ext;
    const r = await apiPost({ action: 'uploadFoto', clienteId: clienteAtt.id, base64: b64.split(',')[1], filename, mimeType: mime, data: oggi() });
    bar.style.width = '100%';
    if (r.success) {
      aggiungiFileInLista(tipo, file.name, r.url);
      toast('File caricato', 'ok');
    } else toast(r.error || 'Errore caricamento', 'err');
  } catch(e) { toast('Errore: ' + e.message, 'err'); }

  setTimeout(() => { prog.classList.remove('show'); bar.style.width = '0'; }, 600);
}

async function handleDrop(e, tipo) {
  e.preventDefault();
  document.getElementById('ua-' + tipo).classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById('file-' + tipo).files = dt.files;
    await handleFileChange(document.getElementById('file-' + tipo), tipo);
  }
}

function aggiungiFileInLista(tipo, nome, url) {
  const lista = document.getElementById('file-lista');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--gb);border-radius:var(--r);margin-top:6px;font-size:12px';
  div.innerHTML = `<span style="color:var(--green)">✓</span><span style="font-weight:600;color:var(--green)">${tipo.toUpperCase()}</span><span style="color:var(--text2)">${nome}</span><a href="${url}" target="_blank" style="margin-left:auto;color:var(--accent);font-size:11px">Apri →</a>`;
  lista.appendChild(div);
}
