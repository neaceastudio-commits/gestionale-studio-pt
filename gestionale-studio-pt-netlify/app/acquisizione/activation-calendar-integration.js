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

  const PENDING_KEY = 'neacea-package-pending-v1';
  let busy = false;
  let previewed = null;
  let previewEpoch = 0;
  function ownerId() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}').operatorId || ''; } catch (_) { return ''; } }
  function pendingPlans() { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}'); }
  function remember(plan) {
    const plans = pendingPlans(); plans[plan.leadId] = plan;
    localStorage.setItem(PENDING_KEY, JSON.stringify(plans));
    renderPending();
  }
  function forget(leadId) {
    const plans = pendingPlans(); delete plans[leadId];
    localStorage.setItem(PENDING_KEY, JSON.stringify(plans)); renderPending();
  }
  function renderPending() {
    let panel = document.getElementById('calendar-pending');
    if (!panel) { panel = document.createElement('div'); panel.id = 'calendar-pending'; panel.style.cssText = 'position:fixed;bottom:50px;right:16px;z-index:10000;background:white;padding:12px;max-width:320px;max-height:75vh;overflow:auto;border:1px solid #c9a84c;border-radius:12px'; document.body.appendChild(panel); }
    panel.replaceChildren();
    let plans;
    try { plans = Object.values(pendingPlans()).filter(p => p.ownerId === ownerId()); } catch (_) { panel.textContent = 'Pianificazione sospesa: archivio locale non leggibile.'; return; }
    panel.hidden = !plans.length;
    for (const plan of plans) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = plan.reviewRequired ? 'Rivedi le sedute' : 'Completa le sedute'; button.disabled = busy;
      button.onclick = async () => {
        if (busy) return; busy = true; renderPending();
        try { if (plan.reviewRequired) { const result = await scheduleClientPackage(plan, true); plan.confirmation = result.confirmation; plan.reviewSummary = result.plan; plan.reviewRequired = false; plan.reviewReady = true; remember(plan); return; } await finishPlan(plan); showToast('Sedute programmate · residuo invariato', 'success'); await carica(); }
        catch (e) { showToast('Sedute da completare: ' + e.message, 'error'); }
        finally { busy = false; renderPending(); }
      };
      const text = document.createElement('p'); text.textContent = 'Attivazione in sospeso · ' + plan.schedule.map(s => s.weekday + ' ' + s.time).join(' / ');
      panel.append(text);
      if (plan.reviewReady) { const review = document.createElement('div'); renderPreview(review, { confirmation: plan.confirmation, plan: plan.reviewSummary || { created: plan.confirmation.slots.length } }); panel.append(review); button.textContent = 'Conferma queste sedute'; }
      panel.append(button);
    }
  }
  async function finishPlan(plan) {
    if (plan.ownerId !== ownerId()) throw new Error('Accedi con il profilo che ha avviato la pianificazione');
    if (!plan.clientId) {
      // Reconcile an activation whose response was lost before repeating it.
      const lead = acquisizioni.find(a => a.id === plan.leadId);
      if (!lead) throw new Error('Ricarica le acquisizioni per recuperare il cliente');
      const existing = await findClientForAcquisition(lead);
      if (existing) plan.clientId = existing.id;
      else {
        if (plan.confirmation) {
          const fresh = await scheduleClientPackage(plan, true);
          if (JSON.stringify(fresh.confirmation) !== JSON.stringify(plan.confirmation)) {
            plan.reviewRequired = true; remember(plan);
            throw new Error('Le sedute sono cambiate: rivedi l’anteprima prima di attivare il cliente.');
          }
        }
        const activation = await apiFetch(plan.activation);
        if (!activation?.success || !activation.clientId) throw new Error(activation?.error || 'Attivazione non confermata');
        plan.clientId = activation.clientId;
      }
      remember(plan);
    }
    let scheduled;
    try { scheduled = await scheduleClientPackage(plan); } catch (e) { if (e.code === 'preview_changed') { plan.reviewRequired = true; plan.reviewReady = false; remember(plan); } throw e; }
    // Archiving is idempotent and is retried if its response was lost.
    const archived = await sb('acquisizioni', { method: 'PATCH', query: '?id=eq.' + encodeURIComponent(plan.leadId), headers: { Prefer: 'return=representation' }, body: { stato: 'Convertito', updated_at: new Date().toISOString() } });
    if (archived?.error || !Array.isArray(archived) || !archived.some(a => a.id === plan.leadId && a.stato === 'Convertito')) throw new Error('Sedute salvate, archiviazione da confermare');
    forget(plan.leadId);
    return scheduled;
  }
  const originalLoad = carica;
  carica = async function () { try { return await originalLoad(); } finally { renderPending(); } };

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
        return { label, checkbox, timeInput, durationInput: label.querySelector('select[data-neacea-day-duration]') };
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
      #conf-days label{display:grid!important;grid-template-columns:22px 1fr 90px 92px;align-items:center;gap:7px!important;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 9px;background:var(--bg2)}
      #conf-days select[data-neacea-day-duration]{min-width:0;padding:6px;font-size:12px}
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
      const duration = document.createElement('select');
      duration.setAttribute('data-neacea-day-duration', '1');
      duration.setAttribute('aria-label', `Durata ${checkbox.value}`);
      for (let n = 15; n <= 240; n += 15) { const option = document.createElement('option'); option.value = String(n); option.textContent = `${n} min`; duration.appendChild(option); }
      duration.value = '60'; duration.disabled = !checkbox.checked;
      duration.addEventListener('click', e => e.stopPropagation());
      duration.addEventListener('change', () => { refreshScheduleSummary(); refreshPtMirror(); });
      checkbox.addEventListener('change', () => { duration.disabled = !checkbox.checked; });
      label.appendChild(duration);
    });

    const help = document.createElement('div');
    help.id = 'conf-schedule-help';
    help.textContent = 'Ogni giorno può avere orario e durata diversi. Prima della conferma vedrai tutte le date. NEACEA creerà solo le sedute del pacchetto: niente ricorrenze infinite.';
    dayBox.after(help);

    const summary = document.createElement('div');
    summary.id = 'conf-schedule-summary';
    help.after(summary);
    const preview = document.createElement('div'); preview.id = 'conf-plan-preview'; preview.hidden = true; preview.setAttribute('aria-live', 'polite'); summary.after(preview);
    const fields = document.getElementById('conf-new-client-fields');
    for (const event of ['input', 'change']) fields.addEventListener(event, invalidatePreview);


    const note = document.querySelector('#conf-new-client-fields .conf-note');
    if (note) {
      note.textContent = 'Dopo la conferma il cliente viene attivato e le sedute del pacchetto vengono già create nel calendario. Gli appuntamenti restano modificabili; il residuo scala soltanto quando una seduta viene segnata come Fatto.';
    }
  }

  function resetDayTimes() {
    const fallback = defaultTimeForCurrentLead();
    scheduleRows().forEach(({ checkbox, timeInput, durationInput }) => {
      checkbox.checked = false;
      if (durationInput) { durationInput.value = '60'; durationInput.disabled = true; }
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
      .map(({ checkbox, timeInput, durationInput }) => ({
        weekday: checkbox.value,
        time: String(timeInput?.value || '').trim(),
        durationMin: Number(durationInput?.value || 60),
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
    summary.textContent = schedule.map(item => `${item.weekday} ${item.time || '—'} · ${item.durationMin} min`).join(' · ');
    summary.style.display = 'block';
  }

  async function scheduleClientPackage({ clientId, packageType, ptId, startDate, schedule, activation, confirmation }, dryRun = false) {
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
        dryRun,
        confirmation,
        ...(!clientId && dryRun ? { preview: { sessionsTotal: Number(activation.sessioni_totali), sessionsUsed: Number(activation.sessioni_usate) } } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) { const error = new Error(result.error || 'Pianificazione sedute non riuscita'); error.code = result.code; throw error; }
    if (result.sessionsRemainingChanged !== false) throw new Error('Protezione residuo sedute non confermata');
    return result;
  }

  function invalidatePreview() {
    previewed = null; previewEpoch++;
    const box = document.getElementById('conf-plan-preview'); if (box) box.hidden = true;
    if (!busy && !clienteEsistenteConferma && PT_PACKAGES.has(document.getElementById('conf-package')?.value)) document.getElementById('btn-conf').textContent = 'Mostra le sedute';
  }
  function previewKey(plan) { return JSON.stringify({ leadId: plan.leadId, packageType: plan.packageType, ptId: plan.ptId, startDate: plan.startDate, schedule: plan.schedule, activation: plan.activation }); }
  function renderPreview(box, result) {
    box.replaceChildren(); box.hidden = false;
    const slots = result.confirmation.slots;
    const heading = document.createElement('p'); heading.style.cssText = 'font-weight:800;margin:16px 0 8px';
    const dateLabel = date => date ? new Date(date + 'T12:00:00').toLocaleDateString('it-IT') : '—';
    heading.textContent = `${slots.length} sedute da creare · ${dateLabel(slots[0]?.date)} → ${dateLabel(slots.at(-1)?.date)}`;
    box.appendChild(heading);
    const table = document.createElement('table'); table.style.cssText = 'width:100%;font-size:12px;border-collapse:collapse';
    const header = document.createElement('tr'); for (const text of ['Data e ora', 'Durata', 'Avvisi']) { const th = document.createElement('th'); th.style.textAlign = 'left'; th.textContent = text; header.appendChild(th); } table.appendChild(header);
    const labels = { operator: 'PT occupato', client: 'Cliente occupato', room_capacity: 'Capienza sala', operator_unavailable: 'Fuori disponibilità / apertura' };
    for (const slot of slots) {
      const row = document.createElement('tr');
      const reasons = (result.plan.warnings || []).filter(w => w.date === slot.date && w.time === slot.startTime).flatMap(w => w.reasons).map(r => labels[r] || r);
      for (const value of [confSlotLabel(slot.date, slot.startTime), `${slot.durationMin} min`, reasons.length ? `⚠ ${reasons.join(' · ')}` : '']) { const cell = document.createElement('td'); cell.style.cssText = 'padding:6px 3px;border-bottom:1px solid var(--border)'; cell.textContent = value; row.appendChild(cell); }
      table.appendChild(row);
    }
    box.appendChild(table);
    const note = document.createElement('p'); note.style.cssText = 'font-size:12px;line-height:1.5';
    note.textContent = result.plan.flexMode ? 'Modalità flessibile: i conflitti sono informativi. Verranno create queste date e questi orari, senza scalare il residuo.' : 'Verranno create soltanto le sedute mostrate. Il residuo non cambia.';
    if (result.plan.skipped?.length) note.textContent += ` ${result.plan.skipped.length} date non disponibili escluse: verifica l’elenco prima di confermare.`;
    box.appendChild(note);
  }
  async function ensurePreview(plan) {
    const key = previewKey(plan);
    if (previewed?.key === key) { plan.confirmation = previewed.result.confirmation; return true; }
    const epoch = previewEpoch;
    const result = await scheduleClientPackage(plan, true);
    if (epoch !== previewEpoch || plan.leadId !== idConferma) throw new Error('Impostazioni cambiate: aggiorna l’anteprima.');
    previewed = { key, result }; renderPreview(document.getElementById('conf-plan-preview'), result);
    document.getElementById('conf-plan-preview').scrollIntoView({ block: 'start', behavior: 'instant' });
    return false;
  }

  // The PT overview uses the same weekday/time/duration pairs, never their cross product.
  const originalMirrorSlots = confMirrorSlotsForOperator;
  confMirrorSlotsForOperator = function integratedMirrorSlots(op, dates, times, meta) {
    const schedule = selectedSchedule();
    if (!PT_PACKAGES.has(document.getElementById('conf-package')?.value) || !schedule.length) return originalMirrorSlots(op, dates, times, meta);
    return dates.flatMap(date => schedule.filter(s => s.weekday === weekdayFromDate(date)).flatMap(s => originalMirrorSlots(op, [date], [s.time], { ...meta, duration: s.durationMin })));
  };

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
    invalidatePreview();
  }

  const originalOpenConfirmation = apriConfermaById;
  apriConfermaById = function integratedOpenConfirmation(id) {
    originalOpenConfirmation(id);
    setTimeout(() => {
      ensureScheduleUi();
      resetDayTimes();
      invalidatePreview();
    }, 0);
  };

  const originalToggle = toggleConfSess;
  toggleConfSess = function integratedToggleConfSess() {
    originalToggle();
    ensureScheduleUi();
    scheduleRows().forEach(({ checkbox, timeInput, durationInput }) => {
      if (timeInput) timeInput.disabled = !checkbox.checked;
      if (durationInput) durationInput.disabled = !checkbox.checked;
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
    if (busy) return;
    const pending = pendingPlans()[idConferma];
    if (pending) {
      busy = true;
      try { if (pending.reviewRequired) { const result = await scheduleClientPackage(pending, true); pending.confirmation = result.confirmation; pending.reviewSummary = result.plan; pending.reviewRequired = false; pending.reviewReady = true; remember(pending); closeMo('mo-conferma'); return; } await finishPlan(pending); closeMo('mo-conferma'); await carica(); }
      catch (e) { showToast('Sedute da completare: ' + e.message, 'error'); }
      finally { busy = false; renderPending(); }
      return;
    }

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

    busy = true;
    try {
      const activationInput = {
        action: 'confermaCliente', id: idConferma, packageType, ptId, tipoAbbonamento,
        dataInizio: startDate, sessioni_totali: sessioniTotali,
        sessioni_usate: document.getElementById('conf-sess-used').value || 0,
        giorniSettimana, importo: document.getElementById('conf-importo').value || 0,
        statoPagamento: document.getElementById('conf-pagamento').value,
      };
      let scheduled = { plan: { created: 0 } };
      if (needsPlan) {
        const plan = { leadId: idConferma, ownerId: ownerId(), clientId: null, packageType, ptId, startDate, schedule, activation: activationInput };
        if (!await ensurePreview(plan)) return;
        // Persist before the first remote side effect; storage failure blocks activation.
        remember(plan);
        try { scheduled = await finishPlan(plan); }
        catch (scheduleError) {
          if (plan.clientId) showToast(`Cliente attivato · sedute da completare: ${scheduleError.message}`, 'error');
          else showToast(`Attivazione da completare: ${scheduleError.message}`, 'error');
          renderPending(); return;
        }
      } else {
        const activation = await apiFetch(activationInput);
        if (!activation?.success) throw new Error(activation?.error || 'Attivazione non riuscita');
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
      busy = false; renderPending();
      btn.textContent = needsPlan && !clienteEsistenteConferma ? (previewed ? `Attiva e programma ${previewed.result.confirmation.slots.length} sedute` : 'Mostra le sedute') : confermaButtonLabel();
      btn.disabled = false;
    }
  };

  ensureScheduleUi();
  renderPending();
})();
