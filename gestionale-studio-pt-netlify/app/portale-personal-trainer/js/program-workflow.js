/* Named, independent program copies. Uses the existing authenticated save API. */
(() => {
  const $ = id => document.getElementById(id);
  let busy = false, loading = false, entries = [], context = null, request = 0, autoName = '', dayContext = null;
  const nameFor = value => String(value?.meta?.name || `Programma ${periodLabel(value?.meta?.period)}`).trim();
  const currentEntry = () => ({ id: 'current', name: nameFor(state), label: `${nameFor(state)} · programma aperto`, state });
  const editableClients = () => (appState.clients || []).filter(client => canEditClient(client)).sort((a, b) => fullName(a).localeCompare(fullName(b), 'it'));
  const targetClient = () => (appState.clients || []).find(client => client.client_id === context?.clientId) || null;
  function sync() {
    const copied = $('newProgramSource').value !== 'empty';
    $('newProgramSourceField').classList.toggle('hidden', !copied);
    $('newProgramWorkouts').closest('.field').classList.toggle('hidden', copied);
    $('newProgramWeeks').closest('.field').classList.toggle('hidden', copied);
    $('newProgramModal').querySelectorAll('input, select, textarea, button').forEach(e => { e.disabled = busy; });
    $('newProgramSourceId').disabled = busy || loading;
    const destination = $('newProgramDestination')?.value || 'client';
    $('newProgramClientSelect').closest('.field')?.classList.toggle('hidden', destination !== 'client');
    $('createNewProgramBtn').disabled = busy || loading || (destination === 'client' && !canEditClient(targetClient())) || (copied && !entries.some(e => e.id === $('newProgramSourceId').value));
    $('createNewProgramBtn').textContent = busy ? 'Creazione in corso…' : copied ? 'Crea programma dalla copia' : 'Crea programma';
  }
  function selectionChanged() {
    const entry = entries.find(e => e.id === $('newProgramSourceId').value);
    const nextName = entry ? `${entry.name} · copia` : `Programma ${periodLabel($('newProgramPeriod').value)}`;
    if (!$('newProgramName').value.trim() || $('newProgramName').value === autoName) $('newProgramName').value = nextName.slice(0, 120);
    autoName = nextName.slice(0, 120);
    if (entry) {
      const source = entry.state;
      const snapshot = entry.snapshot || window.NeaceaPTEditor?.toSnapshot(source);
      $('newProgramSourceHelp').textContent = snapshot
        ? `${snapshot.program.days.length} allenamenti · ${snapshot.program.weeks.length} settimane. Copia di esercizi e progressioni, senza carichi, note interne o date delle sedute.`
        : 'L’editor non è disponibile. Ricarica la pagina prima di duplicare.';
      if (source) {
        $('newProgramGoal').value = '';
        $('newProgramLevel').value = source.meta.level || 'Intermedio';
        $('newProgramFrequency').value = source.meta.frequency || '';
        $('newProgramWarmup').value = source.meta.warmup || '';
      } else if (snapshot) {
        const settings = snapshot.program.settings || {};
        $('newProgramGoal').value = '';
        $('newProgramLevel').value = settings.level || 'Intermedio';
        $('newProgramFrequency').value = settings.frequency || `${snapshot.program.days.length} allenamenti / settimana`;
        $('newProgramWarmup').value = settings.warmup || '';
      }
    }
    sync();
  }
  async function loadSources(preferred = '') {
    const ticket = ++request, kind = $('newProgramSource').value;
    entries = []; loading = kind === 'template';
    $('newProgramError').textContent = '';
    $('retryProgramSourcesBtn').classList.add('hidden');
    $('newProgramSourceId').replaceChildren();
    $('newProgramSourceHelp').textContent = loading ? 'Caricamento archivio generale…' : '';
    sync();
    try {
      let available = [];
      if (kind === 'program') {
        available = [...(canEditClient() && (appState.selectedProgramId || stateExerciseCount(state)) ? [currentEntry()] : []), ...appState.programs.filter(p => p.id !== appState.selectedProgramId &&
          canEditClient(appState.clients.find(c => c.client_id === p.client_id))).map(p => {
          const value = stateFromProgram(p);
          return value && { id: p.id, programId: p.id, state: value, name: nameFor(value),
            label: `${nameFor(value)} · ${periodLabel(p.period)} · ${fullName(appState.clients.find(c => c.client_id === p.client_id))}${p.archived ? ' · archiviato' : ''}` };
        }).filter(Boolean)];
      } else if (kind === 'template') {
        const models = await window.PTTemplates.list();
        available = models.map(t => ({ id: t.id, name: t.title, label: `${window.PTTemplates.folderPath(t.folder_id)} / ${t.title}`, snapshot: t.snapshot }));
      }
      if (ticket !== request || !context) return;
      entries = available;
      $('newProgramSourceId').innerHTML = entries.map(e => `<option value="${escapeAttr(e.id)}">${escapeHtml(e.label)}</option>`).join('');
      if (preferred && entries.some(e => e.id === preferred)) $('newProgramSourceId').value = preferred;
      if (kind === 'template' && !entries.length) $('newProgramSourceHelp').textContent = 'Nessun modello disponibile. Salva prima una scheda nell’archivio generale oppure scegli un programma salvato.';
      if (kind === 'program' && !entries.length) $('newProgramSourceHelp').textContent = 'Nessuna scheda da duplicare. Parti da un programma vuoto oppure da un modello dell’archivio generale.';
    } catch (error) {
      if (ticket !== request) return;
      $('newProgramError').textContent = error.message || 'Archivio non disponibile. Riprova.';
      $('newProgramSourceHelp').textContent = 'Impossibile caricare i modelli.';
      $('retryProgramSourcesBtn').classList.remove('hidden');
    } finally {
      if (ticket === request) { loading = false; selectionChanged(); }
    }
  }
  function open(options = {}) {
    if (busy || !appState.currentPt) { showToast('Accedi come PT per creare un programma'); return; }
    const clients = editableClients();
    // Un programma può essere creato come bozza d'archivio anche senza cliente.
    const preferredClientId = options.clientId || (canEditClient() ? appState.selectedClientId : '') || clients[0]?.client_id || '';
    context = { clientId: clients.some(client => client.client_id === preferredClientId) ? preferredClientId : (clients[0]?.client_id || '') };
    const clientSelect = $('newProgramClientSelect');
    clientSelect.innerHTML = clients.map(client => `<option value="${escapeAttr(client.client_id)}">${escapeHtml(fullName(client))}</option>`).join('');
    clientSelect.value = context.clientId;
    autoName = ''; $('newProgramName').value = '';
    $('newProgramClient').textContent = 'La destinazione viene scelta al salvataggio';
    $('newProgramPeriod').value = currentPeriodKey();
    $('newProgramWorkouts').value = '1'; $('newProgramWeeks').value = '4';
    $('newProgramGoal').value = ''; $('newProgramNotes').value = '';
    $('newProgramLevel').value = 'Intermedio'; $('newProgramFrequency').value = '2 allenamenti / settimana'; $('newProgramWarmup').value = '';
    $('newProgramSource').value = ['program', 'template'].includes(options.source) ? options.source : 'empty';
    $('newProgramDestination').value = 'archive';
    const preferred = options.templateId || (options.current || options.programId === appState.selectedProgramId ? 'current' : options.programId) || '';
    $('newProgramModal').classList.add('open');
    loadSources(preferred); $('newProgramName').focus();
  }
  async function create() {
    if (busy || loading || !context) return;
    const requestedClientId = $('newProgramClientSelect').value;
    const destination = $('newProgramDestination')?.value || 'client';
    if (destination === 'client' && (!requestedClientId || !canEditClient(appState.clients.find(client => client.client_id === requestedClientId)))) {
      $('newProgramError').textContent = 'Scegli un cliente assegnato a te.'; return;
    }
    if (destination === 'client') context.clientId = requestedClientId;
    const name = $('newProgramName').value.trim();
    if (!name) { $('newProgramError').textContent = 'Inserisci il nome del programma.'; $('newProgramName').focus(); return; }
    const kind = $('newProgramSource').value, sourceId = $('newProgramSourceId').value;
    const clientId = context.clientId;
    busy = true; sync(); $('newProgramError').textContent = '';
    try {
      if (destination === 'client' && appState.selectedClientId !== clientId) {
        if (!await selectClient(clientId)) throw Error('Non riesco a selezionare il cliente destinatario.');
      }
      const original = state;
      if (appState.saveConflict) throw Error('Risolvi il conflitto del programma aperto prima di creare una copia.');
      if ((state.localDirty || cloudSaveRunning) && !await window.PTTemplates.ensureSaved()) throw Error('Completa il salvataggio del programma aperto e riprova.');
      if (destination === 'client' && (clientId !== appState.selectedClientId || original !== state || !canEditClient(targetClient()))) throw Error('La selezione è cambiata. Riapri Nuovo programma.');
      const next = clientDefaultState(destination === 'client' ? targetClient() : null);
      if (kind !== 'empty') {
        if (!window.NeaceaPTEditor?.copyProgramSnapshot) throw Error('Editor non disponibile. Ricarica la pagina prima di duplicare.');
        let entry = entries.find(e => e.id === sourceId);
        if (kind === 'template') {
          const template = (await window.PTTemplates.list()).find(t => t.id === sourceId);
          if (!template) throw Error('Questo modello è stato eliminato dall’archivio. Scegline un altro.');
          entry = { snapshot: template.snapshot };
        } else if (sourceId === 'current') entry = currentEntry();
        else {
          const program = appState.programs.find(p => p.id === sourceId);
          if (!program || !canEditClient(appState.clients.find(c => c.client_id === program.client_id))) throw Error('Programma sorgente non disponibile.');
          entry = { state: stateFromProgram(program), programId: program.id };
        }
        if (!entry || (!entry.state && !entry.snapshot)) throw Error('Seleziona una scheda da duplicare.');
        const snapshot = window.NeaceaPTEditor.copyProgramSnapshot(entry.snapshot || window.NeaceaPTEditor.toSnapshot(entry.state), name, id);
        next.sessions = snapshot.program.weeks.map(w => `Settimana ${w}`);
        next.sheets = {}; next.sheetOrder = []; next.workoutDates = {}; next.activeWeekIndex = 0;
        window.NeaceaPTEditor.applySnapshot(next, snapshot);
        if (kind === 'program') next.sourceProgramId = entry.programId || appState.selectedProgramId;
        if (kind === 'template') next.sourceTemplateId = sourceId;
      } else {
        const workouts = Math.max(1, Math.min(6, Number($('newProgramWorkouts').value) || 1));
        const weeks = Math.max(1, Math.min(12, Number($('newProgramWeeks').value) || 4));
        next.sheetOrder = 'ABCDEF'.slice(0, workouts).split('');
        next.sheets = Object.fromEntries(next.sheetOrder.map(key => [key, []]));
        next.sessions = Array.from({ length: weeks }, (_, i) => `Settimana ${i + 1}`);
      }
      if (destination === 'client' && (clientId !== appState.selectedClientId || original !== state || !canEditClient(targetClient()))) throw Error('Il cliente è cambiato. Riapri Nuovo programma.');
      next.currentSheet = next.sheetOrder[0] || 'A';
      next.workoutDates = Object.fromEntries(next.sheetOrder.map(key => [key, next.sessions.map(() => '')]));
      Object.assign(next.meta, { name: name.slice(0, 120), period: $('newProgramPeriod').value || currentPeriodKey(),
        goal: $('newProgramGoal').value.trim(), generalNotes: destination === 'client' ? $('newProgramNotes').value.trim() : '',
        ...(destination === 'archive' ? {studioNotes:$('newProgramNotes').value.trim()} : {}), level: $('newProgramLevel').value,
        frequency: $('newProgramFrequency').value.trim(), warmup: $('newProgramWarmup').value.trim(), assignedAt: next.meta.assignedAt || currentLocalDate() });
      $('newProgramModal').classList.remove('open');
      if (destination === 'archive') {
        window.PTTemplates.openDraft(next);
      } else {
        await createAndPersistProgram(next, `“${next.meta.name}” creato e salvato`);
      }
    } catch (error) {
      $('newProgramError').textContent = error.message || 'Creazione non riuscita. Riprova.';
      if (!$('newProgramModal').classList.contains('open')) showToast($('newProgramError').textContent);
    }
    finally { busy = false; sync(); }
  }
  async function assignTemplate(templateId, clientId) {
    if (busy) return;
    const client = (appState.clients || []).find(item => item.client_id === clientId);
    if (!client || !canEditClient(client)) { showToast('Cliente non disponibile per questo PT'); return; }
    busy = true;
    try {
      if (appState.selectedClientId !== clientId && !await selectClient(clientId)) throw Error('Non riesco a selezionare il cliente.');
      const template = (await window.PTTemplates.list()).find(item => item.id === templateId);
      if (!template) throw Error('Programma non disponibile nell’Archivio.');
      const next = clientDefaultState(client);
      const snapshot = window.NeaceaPTEditor.copyProgramSnapshot(template.snapshot, template.title, id);
      next.sessions = snapshot.program.weeks.map(week => `Settimana ${week}`);
      next.sheets = {}; next.sheetOrder = []; next.activeWeekIndex = 0;
      window.NeaceaPTEditor.applySnapshot(next, snapshot);
      Object.assign(next.meta, {
        name: template.title,
        period: currentPeriodKey(),
        goal: snapshot.program.settings?.goal || '',
        level: snapshot.program.settings?.level || 'Intermedio',
        frequency: snapshot.program.settings?.frequency || '',
        warmup: snapshot.program.settings?.warmup || '',
        assignedAt: currentLocalDate()
      });
      next.sourceTemplateId = templateId;
      await createAndPersistProgram(next, `Scheda assegnata a ${fullName(client)}`, "programsView");
    } catch (error) { showToast(error.message || 'Assegnazione non riuscita'); }
    finally { busy = false; sync(); }
  }
  function openDay() {
    if (!window.NeaceaPTEditor) { showToast('Ricarica la pagina per duplicare l’allenamento completo.'); return; }
    if (!canEditClient() || state.sheetOrder.length >= 26 || !state.sheetOrder.includes(state.currentSheet)) return;
    dayContext = { state, clientId: appState.selectedClientId, sheet: state.currentSheet };
    const day = state.coachingEditorSnapshot?.program.days.find(d => d.letter === state.currentSheet);
    $('duplicateDayName').value = `${day?.name || `Allenamento ${state.currentSheet}`} · copia`.slice(0, 120);
    $('duplicateDayDialog').showModal(); $('duplicateDayName').focus();
  }
  $('duplicateDayForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('duplicateDayName').value.trim();
    if (!name || !$('duplicateDayForm').reportValidity()) return;
    if (!dayContext || dayContext.state !== state || dayContext.clientId !== appState.selectedClientId || dayContext.sheet !== state.currentSheet || !canEditClient()) {
      $('duplicateDayDialog').close(); showToast('La selezione è cambiata. Riapri la duplicazione.'); return;
    }
    $('duplicateDayDialog').close(); duplicateSheet(name); dayContext = null;
  });
  $('cancelDuplicateDayBtn').addEventListener('click', () => { $('duplicateDayDialog').close(); dayContext = null; });
  $('newProgramSource').addEventListener('change', () => loadSources());
  $('newProgramDestination')?.addEventListener('change', sync);
  $('newProgramClientSelect').addEventListener('change', () => {
    context && (context.clientId = $('newProgramClientSelect').value);
    const client = targetClient();
    $('newProgramClient').textContent = client ? `Destinazione: ${fullName(client)}` : 'Scegli il cliente destinatario';
    // Changing a recipient never imports or overwrites program notes and goals.
    sync();
  });
  $('newProgramSourceId').addEventListener('change', selectionChanged);
  $('retryProgramSourcesBtn').addEventListener('click', () => loadSources());
  window.PTProgramFlow = { open, create, assignTemplate, openDay, sync, busy: () => busy };
})();
