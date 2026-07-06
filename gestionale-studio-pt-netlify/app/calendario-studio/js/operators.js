// =============================================
// NEACEA — operators.js
// Gestione professionisti
// =============================================

const Operators = (() => {

  function render() {
    const ops = State.getOperators();
    const panel = document.getElementById('view-operators');
    if (!panel) return;

    panel.innerHTML = `
      <div class="view-header">
        <div>
          <div class="eyebrow">Gestione centro</div>
          <div class="page-title">Staff <em>e professionisti</em></div>
          
        </div>
        <button class="btn-primary" onclick="Operators.openModal()">
          <span class="btn-icon">+</span> Aggiungi
        </button>
      </div>
      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruoli</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${ops.map(op => `
              <tr class="${op.active ? '' : 'row-inactive'}">
                <td>
                  <div class="op-name-cell">
                    <span class="op-avatar" style="background:${op.color}">${op.nome[0]}${op.cognome[0]}</span>
                    <span>${op.nome} ${op.cognome}</span>
                  </div>
                </td>
                <td class="text-muted">${op.email}</td>
                <td>
                  <div class="role-tags">
                    ${op.roles.map(r => `<span class="role-tag">${r}</span>`).join('')}
                  </div>
                </td>
                <td>
                  <span class="status-badge ${op.active ? 'status-attivo' : 'status-inattivo'}">
                    ${op.active ? 'Attivo' : 'Non attivo'}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" title="Modifica" onclick="Operators.openModal('${op.id}')">✏️</button>
                    <button class="btn-icon-sm" title="${op.active ? 'Disattiva' : 'Attiva'}" onclick="Operators.toggleActive('${op.id}')">
                      ${op.active ? '🔴' : '🟢'}
                    </button>
                    <button class="btn-icon-sm" title="Elimina" onclick="Operators.confirmDelete('${op.id}')">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function openModal(opId = null) {
    const op = opId ? State.getOperators().find(o => o.id === opId) : null;
    const isEdit = !!op;

    const rolesHtml = CONFIG.ROLES.map(r => `
      <label class="checkbox-label">
        <input type="checkbox" name="role" value="${r}" ${op?.roles.includes(r) ? 'checked' : ''}>
        <span>${r}</span>
      </label>
    `).join('');

    const html = `
      <div class="modal-header">
        <h3>${isEdit ? 'Modifica Professionista' : 'Nuovo Professionista'}</h3>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Nome *</label>
            <input type="text" id="op-nome" class="form-input" value="${op?.nome || ''}">
          </div>
          <div class="form-group">
            <label>Cognome *</label>
            <input type="text" id="op-cognome" class="form-input" value="${op?.cognome || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="op-email" class="form-input" value="${op?.email || ''}">
        </div>
        <div class="form-group">
          <label>Ruoli</label>
          <div class="checkbox-grid">${rolesHtml}</div>
        </div>
        <div class="form-group">
          <label>Colore</label>
          <input type="color" id="op-color" class="form-input color-input" value="${op?.color || '#2563EB'}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="UI.closeModal()">Annulla</button>
        <button class="btn-primary" onclick="Operators.save('${opId || ''}')">
          ${isEdit ? 'Salva modifiche' : 'Aggiungi'}
        </button>
      </div>
    `;

    UI.openModal(html);
  }

  function save(opId) {
    const nome = document.getElementById('op-nome').value.trim();
    const cognome = document.getElementById('op-cognome').value.trim();
    const email = document.getElementById('op-email').value.trim();
    const color = document.getElementById('op-color').value;
    const roles = [...document.querySelectorAll('input[name="role"]:checked')].map(el => el.value);

    if (!nome || !cognome) { UI.showToast('Nome e cognome obbligatori', 'error'); return; }

    const ops = State.getOperators();
    if (opId) {
      const idx = ops.findIndex(o => o.id === opId);
      if (idx !== -1) ops[idx] = { ...ops[idx], nome, cognome, email, roles, color };
    } else {
      ops.push({ id: State.genId('op'), nome, cognome, email, roles, color, active: true });
    }
    State.saveOperators(ops);
    UI.closeModal();
    render();
    Calendar.render();
    const savedOp = ops.find(o => o.id === (opId || ops[ops.length-1].id));
    SupabaseSync.pushOperator(savedOp);
    if (CONFIG.SHEETS.enabled) Sheets.pushOperator(savedOp);
    UI.showToast(opId ? 'Professionista aggiornato' : 'Professionista aggiunto', 'success');
  }

  function toggleActive(opId) {
    const ops = State.getOperators();
    const idx = ops.findIndex(o => o.id === opId);
    if (idx !== -1) {
      ops[idx].active = !ops[idx].active;
      State.saveOperators(ops);
      render();
      Calendar.render();
    }
  }

  function confirmDelete(opId) {
    const op = State.getOperators().find(o => o.id === opId);
    if (!op) return;
    if (confirm('Eliminare ' + op.nome + ' ' + op.cognome + '?\nQuesta azione non può essere annullata.')) {
      State.saveOperators(State.getOperators().filter(o => o.id !== opId));
      render();
      Calendar.render();
      UI.showToast('Professionista eliminato', 'success');
    }
  }

  return { render, openModal, save, toggleActive, confirmDelete };
})();
