(() => {
  'use strict';

  const SCHEDULER_URL = '/.netlify/functions/schedule-client-package';
  const SESSION_KEY = 'neacea-acquisition-session-v1';
  const PT_PACKAGES = new Set(['PT 1:1', 'PT 1:2', 'Circuit']);
  const SERVICE_IDS = { 'PT 1:1': 'pt11', 'PT 1:2': 'pt12', Circuit: 'circuit' };
  const DAY_TO_INDEX = { Domenica: 0, Lunedì: 1, Martedì: 2, Mercoledì: 3, Giovedì: 4, Venerdì: 5, Sabato: 6 };

  function sessionToken() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}').token || '';
    } catch (_) {
      return '';
    }
  }

  function currentLead() {
    return acquisizioni.find(item => item.id === idConferma) || null;
  }

  function defaultTimeForCurrentLead() {
    const lead = currentLead();
    return lead ? confStartTime(lead) : '17:00';
  }

  function scheduleRows() {
    return [...document.querySelectorAll('#conf-days label')]
      .map(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (!checkbox) return null;
        const timeInput = label.querySelector('input[data-neacea-day-time]');
        return { label, checkbox, timeInput };
      })
      .filter(Boolean);
  }

  function ensureScheduleUi() {
    if (document.getElementById('conf-schedule-help')) return;
    const dayBox = document.getElementById('conf-days');
    if (!dayBox) return;

    const style = document.createElement('style');
    style.textContent = `
      #conf-days{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}
      #conf-days label{display:grid!important;grid-template-columns:22px 1fr 94px;align-items:center;gap:7px!important;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 9px;background:var(--bg2)}
      #conf-days input[data-neacea-day-time]{min-width:0;padding:6px 7px;font-size:12px}
      #conf-days input[data-neacea-day-time]:disabled{opacity:.45;background:var(--bg)}
      #conf-schedule-help{font-size:11px;color:var(--text3);font-weight:700;line-height:1.45;margin-top:8px}
      #conf-schedule-summary{margin-top:10px;background:var(--green-pale);border:1px solid rgba(45,106,79,.22);border-radius:var(--radius-sm);padding:9px 11px;font-size:11px;color:var(--green);font-weight:800;display:none}
      @media(max-width:620px){#conf-days{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);

    scheduleRows().forEach(({ label, checkbox }) => {
      const input = document.createElement('input');
      input.type = 'time';
      input.step = '900';
      input.value = defaultTimeForCurrentLead();
      input.disabled = !checkbox.checked;
      input.setAttribute('data-neacea-day-time', '1');
      input.setAttribute('aria-label', `Orario ${checkbox.value}`);
      input.addEventListener('click', event => event.stopPropagation());
      input.addEventListener('change', () => {
        refreshScheduleSummary();
        refreshPtMirror();
      });
      checkbox.addEventListener('change', () => {
        input.disabled = !checkbox.checked;
        if (checkbox.checked && !input.value) input.value = defaultTimeForCurrentLead();
        refreshScheduleSummary();
      });
      label.appendChild(input);
    });

    const help = document.createElement('div');
    help.id = 'conf-schedule-help';
    help.textContent = 'Ogni giorno può avere un orario diverso. NEACEA creerà solo le sedute del pacchetto: niente ricorrenze infinite.';
    dayBox.after(help);

    const summary = document.createElement('div');
    summary.id = 'conf-schedule-summary';
    help.after(summary);

    const note = document.querySelector('#conf-new-client-fields .conf-note');
    if (note) {
      note.textContent = 'Dopo la conferma il cliente viene attivato e le sedute del pacchetto vengono già create nel calendario. Gli appuntamenti restano modificabili; il residuo scala soltanto quando una seduta viene segnata come Fatto.';
    }
  }

  function resetDayTimes() {
    const fallback = defaultTimeForCurrentLead();
    scheduleRows().forEach(({ checkbox, timeInput }) => {
      checkbox.checked = false;
      if (timeInput) {
        timeInput.value = fallback;
        timeInput.disabled = true;
      }
    });
    refreshScheduleSummary();
  }

  function selectedSchedule() {
    return scheduleRows()
      .filter(({ checkbox }) => checkbox.checked)
      .map(({ checkbox, timeInput }) => ({
        weekday: checkbox.value,
        time: String(timeInput?.value || '').trim(),
      }));
  }

  function refreshScheduleSummary() {
    const summary = document.getElementById('conf-schedule-summary');
    if (!summary) return;
    const schedule = selectedSchedule();
    if (!schedule.length) {
      summary.style.display = 'none';
      summary.textContent = '';
      return;
    }
    summary.textContent = schedule.map(item => `${item.weekday} ${item.time || '—'}`).join(' · ');
    summary.style.display = 'block';
  }

  async function scheduleClientPackage({ clientId, packageType, ptId, startDate, schedule }) {
    const token = sessionToken();
    if (!token) throw new Error('Sessione Direzione non disponibile per la pianificazione');
    const serviceId = SERVICE_IDS[packageType];
    if (!serviceId) return { success: true, skipped: true, plan: { created: 0 } };

    const response = await fetch(SCHEDULER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: token,
        clientId,
        serviceId,
        operatorId: ptId,
        startDate,
        schedule,
        dryRun: false,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || 'Pianificazione sedute non riuscita');
    if (result.sessionsRemainingChanged !== false) throw new Error('Protezione residuo sedute non confermata');
    return result;
  }

  function weekdayFromDate(dateValue) {
    const parts = String(dateValue || '').slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return '';
    const index = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    return Object.keys(DAY_TO_INDEX).find(day => DAY_TO_INDEX[day] === index) || '';
  }

  function setTimeForWeekday(weekday, time) {
    const row = scheduleRows().find(({ checkbox }) => checkbox.value === weekday);
    if (!row) return;
    row.checkbox.checked = true;
    if (row.timeInput) {
      row.timeInput.disabled = false;
      row.timeInput.value = time;
    }
    refreshScheduleSummary();
  }

  const originalOpenConfirmation = apriConfermaById;
  apriConfermaById = function integratedOpenConfirmation(id) {
    originalOpenConfirmation(id);
    setTimeout(() => {
      ensureScheduleUi();
      resetDayTimes();
    }, 0);
  };

  const originalToggle = toggleConfSess;
  toggleConfSess = function integratedToggleConfSess() {
    originalToggle();
    ensureScheduleUi();
    scheduleRows().forEach(({ checkbox, timeInput }) => {
      if (timeInput) timeInput.disabled = !checkbox.checked;
    });
    refreshScheduleSummary();
  };

  const originalSelectMirror = selectPtFromMirror;
  selectPtFromMirror = function integratedSelectPtFromMirror(ptId, date, time) {
    originalSelectMirror(ptId, date, time);
    const weekday = weekdayFromDate(date);
    if (weekday) setTimeForWeekday(weekday, time);
  };

  const originalPreferredTimes = confPreferredTimes;
  confPreferredTimes = function integratedPreferredTimes(acq) {
    const selected = selectedSchedule().map(item => item.time).filter(Boolean);
    return selected.length ? [...new Set(selected)].sort() : originalPreferredTimes(acq);
  };

  const originalExecute = eseguiConferma;
  eseguiConferma = async function integratedExecuteConfirmation() {
    ensureScheduleUi();

    if (clienteEsistenteConferma) {
      return originalExecute();
    }

    const btn = document.getElementById('btn-conf');
    btn.innerHTML = '<span class="spin"></span>';
    btn.disabled = true;

    if (!limitConfDays()) {
      btn.innerHTML = confermaButtonLabel();
      btn.disabled = false;
      return;
    }

    const packageType = document.getElementById('conf-package').value;
    const needsPlan = PT_PACKAGES.has(packageType);
    const tipoAbbonamento = document.getElementById('conf-tipo').value;
    const sessioniTotali = parseInt(document.getElementById('conf-sess-tot').value, 10) || 0;
    const ptId = document.getElementById('conf-pt').value;
    const startDate = document.getElementById('conf-data').value;
    const schedule = selectedSchedule();
    const giorniSettimana = schedule.map(item => item.weekday);

    if (needsPlan && !tipoAbbonamento) {
      showToast('Seleziona il tipo di abbonamento', 'error');
      btn.innerHTML = confermaButtonLabel(); btn.disabled = false; return;
    }
    if (needsPlan && sessioniTotali <= 0) {
      showToast('Inserisci le sessioni totali acquistate', 'error');
      btn.innerHTML = confermaButtonLabel(); btn.disabled = false; return;
    }
    if (needsPlan && !ptId) {
      showToast('Seleziona il PT assegnato', 'error');
      btn.innerHTML = confermaButtonLabel(); btn.disabled = false; return;
    }
    if (needsPlan && !schedule.length) {
      showToast('Seleziona almeno un giorno e il relativo orario', 'error');
      btn.innerHTML = confermaButtonLabel(); btn.disabled = false; return;
    }
    if (needsPlan && schedule.some(item => !/^\d{2}:\d{2}$/.test(item.time))) {
      showToast('Completa l’orario di ogni giorno selezionato', 'error');
      btn.innerHTML = confermaButtonLabel(); btn.disabled = false; return;
    }

    try {
      const activation = await apiFetch({
        action: 'confermaCliente',
        id: idConferma,
        packageType,
        ptId,
        tipoAbbonamento,
        dataInizio: startDate,
        sessioni_totali: sessioniTotali,
        sessioni_usate: document.getElementById('conf-sess-used').value || 0,
        giorniSettimana,
        importo: document.getElementById('conf-importo').value || 0,
        statoPagamento: document.getElementById('conf-pagamento').value,
      });

      if (!activation?.success) throw new Error(activation?.error || 'Attivazione cliente non riuscita');

      let scheduled = { success: true, skipped: true, plan: { created: 0 } };
      if (needsPlan) {
        try {
          scheduled = await scheduleClientPackage({
            clientId: activation.clientId,
            packageType,
            ptId,
            startDate,
            schedule,
          });
        } catch (scheduleError) {
          showToast(`Cliente attivato · sedute da completare: ${scheduleError.message}`, 'error');
          const idx = acquisizioni.findIndex(item => item.id === idConferma);
          if (idx >= 0) acquisizioni[idx] = { ...acquisizioni[idx], stato: 'Convertito' };
          renderStats();
          btn.innerHTML = confermaButtonLabel();
          btn.disabled = false;
          return;
        }
      }

      const created = Number(scheduled?.plan?.created || 0);
      const endDate = scheduled?.plan?.endDate || '';
      const scheduleCopy = needsPlan
        ? `Cliente attivato · ${created} sedute programmate${endDate ? ` fino al ${endDate}` : ''} · residuo invariato`
        : 'Cliente trasferito e acquisizione archiviata';
      showToast(scheduleCopy, 'success');
      closeMo('mo-conferma');
      const idx = acquisizioni.findIndex(item => item.id === idConferma);
      if (idx >= 0) acquisizioni[idx] = { ...acquisizioni[idx], stato: 'Convertito' };
      renderStats();
      apriScheda(idConferma);
    } catch (error) {
      showToast(`Errore: ${error.message || error}`, 'error');
    } finally {
      btn.innerHTML = confermaButtonLabel();
      btn.disabled = false;
    }
  };

  ensureScheduleUi();
})();
