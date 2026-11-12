/* Direction-only settings and preview; this UI never invokes a real send. */
window.WhatsAppAgenda = (() => {
  let owner = false;
  const messages = { invalid_phone: 'Inserisci un numero WhatsApp in formato +39…; è obbligatorio per abilitare l’agenda.', migration_required: 'Migrazione WhatsApp non ancora applicata.', direction_only: 'Funzione riservata alla Direzione.', whatsapp_agenda_unavailable: 'Agenda non disponibile. Riprova.' };
  const element = (tag, text) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
  async function call(input) {
    const accessToken = new URLSearchParams(location.search).get('access') || sessionStorage.getItem('neacea-calendar-audit-session') || '';
    const r = await fetch('/.netlify/functions/whatsapp-agenda', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, accessToken, dryRun: true }) });
    const result = await r.json(); if (!r.ok) throw Error(messages[result.error] || 'Operazione non riuscita. Riprova.'); return result;
  }
  function mount(panel) {
    if (!owner || !panel || panel.querySelector('#whatsapp-agenda-open')) return;
    const button = element('button', 'WhatsApp Agenda PT'); button.id = 'whatsapp-agenda-open'; button.className = 'btn-ghost'; button.onclick = open;
    panel.querySelector('.view-header')?.append(button);
  }

  function renderAgendaMessage(container, agenda) {
    const message = element('pre', agenda.count ? agenda.text : 'Nessuna seduta: nessun messaggio.');
    message.className = 'agenda-message';
    container.replaceChildren(message);
    if (agenda.issues.length) {
      container.append(element('p', 'Dati incompleti: invio bloccato per questa agenda.'));
    }
  }

  function mountDirectionPreview() {
    const tab = document.getElementById('whatsapp-direction-tab');
    const section = document.getElementById('direction-whatsapp');
    if (!tab || !section) return;
    const refresh = document.getElementById('agenda-direction-refresh');
    const status = document.getElementById('agenda-direction-status');
    const content = document.getElementById('agenda-direction-content');
    let selectedOperator = '';

    async function loadPreview() {
      if (!section.open || refresh.disabled) return;
      refresh.disabled = true;
      content.replaceChildren();
      status.textContent = 'Caricamento delle agende…';
      try {
        const { day, agendas } = await call({ action: 'agenda' });
        const date = new Date(day + 'T12:00:00Z').toLocaleDateString('it-IT', {
          dateStyle: 'full', timeZone: 'Europe/Rome'
        });
        if (!agendas.length) {
          status.textContent = date + ' · Nessun PT attivo.';
          return;
        }
        status.textContent = date + ' · Solo anteprima.';
        const select = element('select');
        select.className = 'form-input';
        for (const agenda of agendas) {
          select.add(new Option(agenda.operatorName, agenda.operatorId));
        }
        const initial = agendas.find(a => a.operatorId === selectedOperator)
          || agendas.find(a => a.count > 0) || agendas[0];
        select.value = initial.operatorId;
        const label = element('label', 'Personal trainer');
        label.className = 'agenda-operator-label';
        label.append(select);
        const result = element('div');
        result.setAttribute('aria-live', 'polite');
        content.append(label, result);
        function showSelected() {
          const agenda = agendas[select.selectedIndex];
          selectedOperator = agenda.operatorId;
          renderAgendaMessage(result, agenda);
        }
        select.addEventListener('change', showSelected);
        showSelected();
      } catch (error) {
        status.textContent = error.message + ' Usa «Aggiorna anteprima» per riprovare.';
      } finally {
        refresh.disabled = false;
      }
    }

    section.addEventListener('toggle', loadPreview);
    tab.addEventListener('click', loadPreview);
    refresh.addEventListener('click', loadPreview);
    section.hidden = false;
    tab.hidden = false;
  }

  async function open() {
    if (!owner) return;
    UI.openModal('<div class="modal-header"><h3>WhatsApp Agenda PT</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body" id="whatsapp-agenda-panel"><p role="status">Caricamento…</p></div>');
    const panel = document.getElementById('whatsapp-agenda-panel');
    try {
      const settings = await call({ action: 'settings' }); if (!panel.isConnected) return; panel.replaceChildren();
      panel.append(element('p', 'Agenda alle 06:30, ora di Roma. Abilita solo i PT che hanno accettato di riceverla sul numero indicato.'));
      if (!settings.migrationReady) panel.append(element('p', 'Migrazione non ancora applicata: puoi consultare l’anteprima, ma non salvare le impostazioni.'));
      for (const op of settings.operators) {
        const row = element('fieldset'); row.className = 'form-group'; row.append(element('legend', op.name + (op.active ? '' : ' · non attivo')));
        const phoneLabel = element('label', 'Numero WhatsApp (E.164)');
        const phone = element('input'); phone.type = 'tel'; phone.className = 'form-input'; phone.placeholder = '+39…'; phone.value = op.whatsapp_phone; phone.setAttribute('aria-label', 'WhatsApp ' + op.name); phone.disabled = !settings.migrationReady; phoneLabel.append(phone);
        const enabledLabel = element('label'); enabledLabel.className = 'checkbox-label'; const enabled = element('input'); enabled.type = 'checkbox'; enabled.checked = op.whatsapp_agenda_enabled; enabled.disabled = !settings.migrationReady; enabled.setAttribute('aria-label', 'Abilita agenda ' + op.name); enabledLabel.append(enabled, document.createTextNode(' Agenda WhatsApp abilitata'));
        const status = element('p'); status.setAttribute('role', 'status');
        const save = element('button', 'Salva impostazioni'); save.className = 'btn-primary'; save.disabled = !settings.migrationReady;
        save.onclick = async () => { save.disabled = true; status.textContent = 'Salvataggio…'; try { await call({ action: 'configure', operatorId: op.id, whatsapp_phone: phone.value.trim(), whatsapp_agenda_enabled: enabled.checked }); status.textContent = 'Impostazioni salvate'; } catch (e) { status.textContent = e.message; } finally { save.disabled = false; } };
        row.append(phoneLabel, enabledLabel, save, status); panel.append(row);
      }
      const preview = element('button', 'Anteprima agende di oggi'); preview.id = 'whatsapp-agenda-preview'; preview.className = 'btn-primary';
      const result = element('div'); result.id = 'whatsapp-agenda-results';
      preview.onclick = async () => { preview.disabled = true; result.replaceChildren(element('p', 'Generazione…')); try {
        const data = await call({ action: 'agenda' }); result.replaceChildren(element('p', `${data.day} · Anteprima soltanto: nessun messaggio inviato.`));
        if (!data.sendingEnabled || !data.providerReady) result.append(element('p', 'Invio reale disabilitato o provider non configurato.'));
        for (const a of data.agendas) {
          result.append(element('h4', a.operatorName + (a.enabled ? '' : ' · invio non abilitato')));
          const message = element('div');
          renderAgendaMessage(message, a);
          result.append(message);
        }
      } catch (e) { result.replaceChildren(element('p', e.message)); } finally { preview.disabled = false; } };
      panel.append(preview, result);
    } catch (e) { panel.replaceChildren(element('p', e.message)); }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const session = await call({ action: 'session' });
      owner = session.role === 'owner';
      if (owner) {
        mount(document.getElementById('view-operators'));
        mountDirectionPreview();
      }
    } catch { /* No new access or permission is granted by the browser. */ }
  });
  return { mount, open };
})();
