// Collegamento privato del gestionale ai calendari in abbonamento (Apple Calendar).

(() => {
  const TOKEN_KEY = 'neacea_apple_calendar_token';
  const OPERATOR_KEY = 'neacea_apple_calendar_operator';
  const FUNCTION_PATH = '/.netlify/functions/apple-calendar';

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }

  function savedToken() {
    return String(localStorage.getItem(TOKEN_KEY) || '').trim();
  }

  function selectedOperator() {
    return String(document.getElementById('apple-calendar-operator')?.value || '').trim();
  }

  function currentToken() {
    return String(document.getElementById('apple-calendar-token')?.value || savedToken()).trim();
  }

  function subscriptionUrl({ webcal = false } = {}) {
    const token = currentToken();
    if (!token) return '';
    const url = new URL(FUNCTION_PATH, window.location.origin);
    url.searchParams.set('token', token);
    const operatorId = selectedOperator();
    if (operatorId) url.searchParams.set('operatorId', operatorId);
    return webcal ? url.toString().replace(/^https:/i, 'webcal:') : url.toString();
  }

  function renderLinkState() {
    const token = currentToken();
    const url = subscriptionUrl();
    const preview = document.getElementById('apple-calendar-link-preview');
    const actions = document.getElementById('apple-calendar-actions');
    if (preview) {
      preview.value = url;
      preview.placeholder = token ? '' : 'Inserisci prima il codice privato';
    }
    if (actions) actions.hidden = !token;
    const result = document.getElementById('apple-calendar-result');
    if (result) result.textContent = '';
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    return Promise.resolve();
  }

  App.openAppleCalendar = function () {
    const operators = State.getOperators()
      .filter(operator => operator.active !== false)
      .sort((a, b) => `${a.cognome || ''} ${a.nome || ''}`.localeCompare(`${b.cognome || ''} ${b.nome || ''}`, 'it'));
    const storedOperator = String(localStorage.getItem(OPERATOR_KEY) || '');
    const options = [
      '<option value="">Tutto lo studio</option>',
      ...operators.map(operator => {
        const id = String(operator.id || '');
        const name = [operator.nome, operator.cognome].filter(Boolean).join(' ') || 'PT';
        return `<option value="${esc(id)}" ${id === storedOperator ? 'selected' : ''}>Solo ${esc(name)}</option>`;
      }),
    ].join('');
    const token = savedToken();

    UI.openModal(`
      <div class="modal-header">
        <div>
          <h3> Collega Apple Calendar</h3>
          <p class="modal-subtitle">Abbonamento gratuito e in sola lettura al calendario NEACEA</p>
        </div>
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
      </div>
      <div class="modal-body apple-calendar-modal">
        <div class="apple-calendar-steps">
          <div><strong>1</strong><span>Scegli se vedere tutto lo studio o un solo PT.</span></div>
          <div><strong>2</strong><span>Inserisci il codice privato una sola volta su questo dispositivo.</span></div>
          <div><strong>3</strong><span>Verifica il feed, poi premi “Apri in Apple Calendar”.</span></div>
        </div>

        <div class="form-group">
          <label>Calendario da collegare</label>
          <select id="apple-calendar-operator" class="form-input" onchange="App.appleCalendarSelectionChanged()">
            ${options}
          </select>
        </div>

        <div class="form-group">
          <label>Codice calendario privato</label>
          <div class="apple-calendar-token-row">
            <input id="apple-calendar-token" class="form-input" type="password" autocomplete="off"
                   value="${esc(token)}" placeholder="Incolla il codice fornito dal gestionale"
                   oninput="App.appleCalendarRefreshLink()">
            <button class="btn" type="button" onclick="App.saveAppleCalendarCode()">Salva codice</button>
          </div>
          <div class="form-hint">Il codice resta solo su questo dispositivo. Non inviarlo ai clienti.</div>
        </div>

        <div class="form-group">
          <label>Link di sottoscrizione</label>
          <input id="apple-calendar-link-preview" class="form-input apple-calendar-link" readonly>
        </div>

        <div id="apple-calendar-actions" class="apple-calendar-actions" ${token ? '' : 'hidden'}>
          <button class="btn" type="button" onclick="App.verifyAppleCalendarFeed()">Verifica feed</button>
          <button class="btn" type="button" onclick="App.copyAppleCalendarLink()">Copia link</button>
          <button class="btn-primary" type="button" onclick="App.connectAppleCalendar()">Apri in Apple Calendar</button>
        </div>
        <div id="apple-calendar-result" class="apple-calendar-result" aria-live="polite"></div>

        <div class="apple-calendar-note">
          <strong>Come si aggiorna</strong>
          <span>Spostamenti e modifiche aggiornano lo stesso evento. Appuntamenti annullati o eliminati spariscono al successivo aggiornamento deciso da Apple.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" onclick="App.clearAppleCalendarCode()">Rimuovi codice da questo dispositivo</button>
        <button class="btn-primary" onclick="UI.closeModal()">Chiudi</button>
      </div>
    `);
    renderLinkState();
  };

  App.appleCalendarRefreshLink = renderLinkState;

  App.appleCalendarSelectionChanged = function () {
    localStorage.setItem(OPERATOR_KEY, selectedOperator());
    renderLinkState();
  };

  App.saveAppleCalendarCode = function () {
    const token = currentToken();
    if (!token) {
      UI.showToast('Inserisci il codice calendario privato', 'error');
      return false;
    }
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(OPERATOR_KEY, selectedOperator());
    renderLinkState();
    UI.showToast('Codice calendario salvato su questo dispositivo', 'success');
    return true;
  };

  App.verifyAppleCalendarFeed = async function () {
    if (!App.saveAppleCalendarCode()) return;
    const result = document.getElementById('apple-calendar-result');
    if (result) {
      result.className = 'apple-calendar-result loading';
      result.textContent = 'Verifica in corso…';
    }
    try {
      const response = await fetch(subscriptionUrl(), { headers: { Accept: 'text/calendar' }, cache: 'no-store' });
      const body = await response.text();
      if (!response.ok || !body.includes('BEGIN:VCALENDAR')) {
        throw new Error(response.status === 401 ? 'Codice privato non valido.' : 'Feed non disponibile.');
      }
      const count = Number(response.headers.get('X-NEACEA-Event-Count') || (body.match(/BEGIN:VEVENT/g) || []).length);
      if (result) {
        result.className = 'apple-calendar-result success';
        result.textContent = `Feed valido: ${count} appuntamenti sincronizzabili.`;
      }
    } catch (error) {
      if (result) {
        result.className = 'apple-calendar-result error';
        result.textContent = error.message || 'Impossibile verificare il feed.';
      }
    }
  };

  App.copyAppleCalendarLink = async function () {
    if (!App.saveAppleCalendarCode()) return;
    await copyText(subscriptionUrl());
    UI.showToast('Link Apple Calendar copiato', 'success');
  };

  App.connectAppleCalendar = function () {
    if (!App.saveAppleCalendarCode()) return;
    const link = document.createElement('a');
    link.href = subscriptionUrl({ webcal: true });
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  App.clearAppleCalendarCode = function () {
    localStorage.removeItem(TOKEN_KEY);
    const input = document.getElementById('apple-calendar-token');
    if (input) input.value = '';
    renderLinkState();
    UI.showToast('Codice calendario rimosso da questo dispositivo', 'success');
  };
})();
