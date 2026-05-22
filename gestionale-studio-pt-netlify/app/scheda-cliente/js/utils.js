
// ═══════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function tornaLista() {
  clienteAtt = null;
  document.getElementById('nav-cliente-wrap').style.display = 'none';
  document.getElementById('nav-sezioni').style.display = 'none';
  document.getElementById('btn-back').style.display = 'none';
  showView('view-lista');
}

function openMo(id)  { document.getElementById(id).classList.add('open'); }
function closeMo(id) { document.getElementById(id).classList.remove('open'); }
function gv(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function oggi()      { return new Date().toISOString().split('T')[0]; }
function fmtData(d)  { if (!d) return '—'; try { return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' }); } catch(e) { return d; } }

function salvaStorage(clienteId, key, val) {
  const s = JSON.parse(localStorage.getItem('nc_' + clienteId) || '{}');
  s[key] = val;
  localStorage.setItem('nc_' + clienteId, JSON.stringify(s));
}
function leggiStorage(clienteId, key) {
  const s = JSON.parse(localStorage.getItem('nc_' + clienteId) || '{}');
  return s[key];
}

let toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// Converti file in base64
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Converti e ridimensiona immagine a maxW px, qualità q
function fileToBase64Resized(file, maxW, quality) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', quality || 0.8));
      };
      img.onerror = rej;
      img.src = ev.target.result;
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
