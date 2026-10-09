/* Shared prescriptions. All authorization and sanitization are repeated by pt-data. */
(() => {
  const $ = id => document.getElementById(id);
  let templates = [], folders = [], folderId = '', loading = false, busy = false, pending = null, error = '';
  let folderPending = null, folderBusy = false, editState = null, editRecord = null, libraryEditor = null, editDirty = false, editRequest = null;
  let previewState = null, previewEditor = null;
  const dialog = $('templateDialog');
  let renamePending = null, movePending = null;
  const selectedTemplates = new Set();
  const own = row => row && (row.created_by === appState.currentPt?.id || isAdministrator(appState.currentPt));
  function folderPath(value) {
    const parts = [], seen = new Set();
    while(value && !seen.has(value)) { seen.add(value); const item=folders.find(f=>f.id===value);if(!item)break;parts.unshift(item.name);value=item.parent_id; }
    return parts.join(' / ') || 'Archivio Programmi';
  }
  function folderOptions(select, value = '') {
    select.innerHTML = '<option value="">Archivio generale</option>' + [...folders].sort((a,b)=>folderPath(a.id).localeCompare(folderPath(b.id),'it')).map(f=>`<option value="${escapeAttr(f.id)}">${escapeHtml(folderPath(f.id))}</option>`).join('');
    select.value = value || '';
  }

  function sync() {
    const hasAssignableClient = (appState.clients || []).some(client => canEditClient(client));
    $('saveTemplateBtn').disabled = !canEditClient() || busy;
    $('refreshTemplatesBtn').disabled = loading || busy;
    document.querySelectorAll('[data-use-template]').forEach(button => { button.disabled = !hasAssignableClient || busy; });
    document.querySelectorAll('[data-retire-template]').forEach(button => { button.disabled = busy; });
    for(const name of ['newLibraryProgramBtn','newTemplateFolderBtn']) $(name).disabled=busy || loading;
    const currentFolder=folders.find(f=>f.id===folderId);
    for(const name of ['renameTemplateFolderBtn','deleteTemplateFolderBtn']) { $(name).hidden=!own(currentFolder);$(name).disabled=busy || loading; }
    for(const name of ['saveLibraryProgramBtn','saveLibraryCopyBtn','closeLibraryEditorBtn','libraryAddWeekBtn','libraryRemoveWeekBtn','libraryNewFolderBtn']) $(name).disabled=busy;
    if(editState) { $('libraryAddWeekBtn').disabled=busy || editState.sessions.length>=12; $('libraryRemoveWeekBtn').disabled=busy || editState.sessions.length<=1; }
    $('moveSelectedTemplatesBtn').disabled=busy || loading || !selectedTemplates.size;
    $('moveSelectedTemplatesBtn').textContent=`Sposta selezionati (${selectedTemplates.size})`;
    for (const name of ['selectVisibleTemplatesBtn','clearTemplateSelectionBtn','templateAllFolders']) $(name).disabled=busy || loading;
    document.querySelectorAll('[data-select-template]').forEach(input=>input.disabled=busy || loading);
    $('librarySaveStatus').textContent=busy ? 'Salvataggio…' : editDirty ? 'Modifiche da salvare' : 'Nessuna modifica in attesa';
  }

  function render() {
    for (const id of selectedTemplates) if (!templates.some(t=>t.id===id && own(t))) selectedTemplates.delete(id);
    const term = $('templateSearch').value.trim().toLocaleLowerCase('it');
    if(folderId && !folders.some(f=>f.id===folderId))folderId='';
    const visible = templates.filter(t => term ? [t.title, t.description, t.created_by_name, folderPath(t.folder_id)].join(' ').toLocaleLowerCase('it').includes(term) : ($('templateAllFolders').checked || (t.folder_id || '')===folderId));
    const ancestors=[];let pointer=folderId;const seen=new Set();
    while(pointer && !seen.has(pointer)){seen.add(pointer);const f=folders.find(f=>f.id===pointer);if(!f)break;ancestors.unshift(f);pointer=f.parent_id;}
    $('templateBreadcrumb').innerHTML=`<button class="btn" data-open-folder="" type="button">Archivio Programmi</button>`+ancestors.map(f=>`<span aria-hidden="true"> / </span><button class="btn" data-open-folder="${escapeAttr(f.id)}" type="button">${escapeHtml(f.name)}</button>`).join('');
    $('templateFolders').innerHTML=folders.filter(f=>term ? folderPath(f.id).toLocaleLowerCase('it').includes(term) : (f.parent_id || '')===folderId).map(f=>`<button class="btn library-folder" data-open-folder="${escapeAttr(f.id)}" type="button"><span aria-hidden="true">▣</span> ${escapeHtml(term ? folderPath(f.id) : f.name)}</button>`).join('');
    $('templateStatus').textContent = error || (loading ? 'Caricamento archivio…' : `${visible.length} ${visible.length === 1 ? 'modello disponibile' : 'modelli disponibili'}${templates.length ? '' : ' · Salva il primo programma nell’archivio generale.'}`);
    $('templateCards').innerHTML = visible.map(t => {
      const days = t.snapshot.program.days;
      const canRetire = t.created_by === appState.currentPt?.id || isAdministrator(appState.currentPt);
      const assignableClients = (appState.clients || []).filter(client => canEditClient(client)).sort((a,b) => fullName(a).localeCompare(fullName(b),'it'));
      const assignControl = assignableClients.length ? `<div class="template-assign"><label for="assign-${escapeAttr(t.id)}">Assegna a un cliente</label><select id="assign-${escapeAttr(t.id)}" data-template-client="${escapeAttr(t.id)}"><option value="">Seleziona cliente</option>${assignableClients.map(client => `<option value="${escapeAttr(client.client_id)}">${escapeHtml(fullName(client))}</option>`).join('')}</select><button class="btn primary" type="button" data-assign-template="${escapeAttr(t.id)}">Assegna scheda</button></div>` : '';
      return `<article class="template-card" data-template-card="${escapeAttr(t.id)}">${own(t) ? `<label class="template-select"><input type="checkbox" data-select-template="${escapeAttr(t.id)}" ${selectedTemplates.has(t.id) ? 'checked' : ''} ${busy ? 'disabled' : ''}>Seleziona ${escapeHtml(t.title)}</label>` : ""}<h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.description || 'Modello condiviso dello studio')}</p>
        <p>${escapeHtml(folderPath(t.folder_id))}<br>${days.length} allenamenti · ${t.snapshot.program.weeks.length} settimane<br>Creato da ${escapeHtml(t.created_by_name || 'PT studio')}</p>
        <details><summary>Visualizza allenamenti ed esercizi</summary>${days.map(d => `<h3>${escapeHtml(d.name || `Allenamento ${d.letter}`)}</h3><ul>${[...new Set(Object.values(d.exercisesByWeek).flat().map(e => e.name).filter(Boolean))].map(name => `<li>${escapeHtml(name)}</li>`).join('')}</ul>`).join('')}</details>
        ${assignControl}<div class="actions"><button class="btn" type="button" data-preview-template="${escapeAttr(t.id)}">Visualizza scheda completa</button><button class="btn" type="button" data-copy-template="${escapeAttr(t.id)}">Duplica in archivio</button>${canRetire ? `<button class="btn" type="button" data-edit-template="${escapeAttr(t.id)}">Modifica programma</button><button class="btn" type="button" data-quick-rename-template="${escapeAttr(t.id)}">Rinomina</button><button class="btn" type="button" data-move-template="${escapeAttr(t.id)}">Sposta in…</button>${t.folder_id ? `<button class="btn" type="button" data-unfile-template="${escapeAttr(t.id)}">Togli dalla cartella</button>` : ""}<button class="btn danger" type="button" data-retire-template="${escapeAttr(t.id)}">Sposta nel Cestino</button>` : ''}</div></article>`;
    }).join('');
    sync();
  }

  async function show() {
    if (loading) return;
    loading = true; error = ''; render();
    try {
      const result = await ptData('list_templates');
      templates = result.templates || [];
      for (const id of selectedTemplates) if (!templates.some(t=>t.id===id && own(t))) selectedTemplates.delete(id);
      folders = result.folders || [];
    } catch (e) { error = `Archivio non aggiornato: ${e.message || 'riprova con Aggiorna archivio.'}`; }
    finally { loading = false; render(); }
  }

  async function list() {
    const result = await ptData('list_templates');
    templates = result.templates || [];
    folders = result.folders || [];
    return templates;
  }

  async function showTrash() {
    const container = $('trashCards');
    if (!container) return;
    container.innerHTML = '<div class="empty-focus">Caricamento cestino…</div>';
    try {
      const result = await ptData('list_template_trash');
      const templatesTrash = result.templates || [];
      const clientTrash = (appState.programs || []).filter(program => program.archived);
      const cards = [
        ...templatesTrash.map(template => { const allowed = own(template); return `<article class="program-card"><div><span class="program-state">Cestino · Archivio Programmi</span><h3>${escapeHtml(template.title)}</h3><p>Eliminato ${escapeHtml(new Date(template.archived_at || template.updated_at || Date.now()).toLocaleString('it-IT'))}</p></div><div class="actions">${allowed ? `<button class="btn" type="button" data-restore-template="${escapeAttr(template.id)}">Ripristina nell’Archivio</button>` : '<span class="program-state">Sola lettura</span>'}</div></article>`; }),
        ...clientTrash.map(program => { const client = appState.clients.find(item => item.client_id === program.client_id); const allowed = canEditClient(client); return `<article class="program-card"><div><span class="program-state">Cestino · Programma cliente</span><h3>${escapeHtml(program.name || 'Programma cliente')} · ${escapeHtml(periodLabel(program.period))}</h3><p>${escapeHtml(client ? fullName(client) : 'Cliente')} · eliminata ${escapeHtml(new Date(program.data?.archived_at || program.updated_at || Date.now()).toLocaleString('it-IT'))}</p></div><div class="actions">${allowed ? `<button class="btn" type="button" data-restore-program="${escapeAttr(program.id)}" data-restore-client="${escapeAttr(program.client_id)}">Ripristina scheda</button>` : '<span class="program-state">Sola lettura</span>'}</div></article>`; })
      ];
      container.innerHTML = cards.length ? cards.join('') : '<div class="empty-focus"><strong>Cestino vuoto</strong>I programmi eliminati compariranno qui.</div>';
      container.querySelectorAll('[data-restore-template]').forEach(button => button.onclick = async () => {
        if (busy || !await confirmAction('Ripristinare questo programma nell’Archivio Programmi?')) return;
        busy = true; sync();
        try { await ptData('archive_template', { templateId: button.dataset.restoreTemplate, restore: true }); showToast('Programma ripristinato nell’archivio'); await showTrash(); }
        catch (error) { showToast(error.message || 'Ripristino non riuscito'); }
        finally { busy = false; sync(); }
      });
      container.querySelectorAll('[data-restore-program]').forEach(button => button.onclick = async () => {
        if (button.dataset.restoreClient && button.dataset.restoreClient !== appState.selectedClientId && !await selectClient(button.dataset.restoreClient)) return;
        restoreProgram(button.dataset.restoreProgram);
      });
    } catch (error) { container.innerHTML = `<div class="empty-focus"><strong>Cestino non disponibile</strong>${escapeHtml(error.message || 'Riprova più tardi.')}</div>`; }
  }

  // Wait for an ongoing autosave; never abandon an unsynced draft to import a template.
  async function ensureSaved() {
    const original = state, clientId = appState.selectedClientId;
    const deadline = Date.now() + 20000;
    while (cloudSaveRunning && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    if (state !== original || appState.selectedClientId !== clientId || !canEditClient()) return false;
    if (cloudSaveRunning || appState.saveConflict) { showToast('Attendi il salvataggio o risolvi il conflitto prima di continuare'); return false; }
    if ((state.localDirty || !appState.selectedProgramId) && !await flushCloudSave()) {
      showToast('Prima di continuare, completa il salvataggio del programma'); return false;
    }
    return state === original && appState.selectedClientId === clientId && !state.localDirty;
  }

  async function openSave(programId) {
    if (busy || !canEditClient()) return;
    busy = true; sync();
    try {
      if (typeof programId === 'string' && programId !== appState.selectedProgramId && !await selectProgram(programId)) return;
      coachingProgramEditor?.capture();
      if (!state.sheetOrder.some(key => state.sheets[key]?.some(e => e.name?.trim()))) { showToast('Aggiungi almeno un esercizio prima di salvare un modello'); return; }
      if (!await ensureSaved()) return;
      pending = { templateId: id('template'), programId: appState.selectedProgramId, snapshot: window.NeaceaPTEditor.toSnapshot(state) };
      await list();
      $('templateForm').reset(); $('templateSaveError').textContent = '';
      $('templateDialogTitle').textContent='Salva in archivio';
      $('templatePrivacy').required=true;$('templatePrivacy').closest('label').hidden=false;
      folderOptions($('templateFolder'),'');
      $('templateTitle').value = state.meta.name || '';
      $('templateSourceSummary').textContent = `Copia in archivio: ${state.meta.name || periodLabel(state.meta.period)} · ${state.sheetOrder.length} allenamenti · ${state.sessions.length} settimane. Esercizi, parametri e impostazioni del programma verranno copiati. La scheda del cliente resta al suo posto.`;
      dialog.showModal(); $('templateTitle').focus();
    } catch (e) { showToast(e.message || 'Non riesco ad aprire il salvataggio'); }
    finally { busy = false; sync(); }
  }

  function close() { if (!busy) { dialog.close(); pending = null; } }
  function preview(template) {
    if (!window.NeaceaPTEditor) { showToast('Editor non disponibile: ricarica la pagina'); return; }
    const snapshot = template.snapshot, settings = snapshot.program.settings || {};
    previewState = { meta: { ...settings, name: template.title }, sessions: snapshot.program.weeks.map(w => `Settimana ${w}`), sheets: {}, sheetOrder: [], workoutDates: {}, currentSheet: snapshot.program.days[0]?.letter || 'A', activeWeekIndex: 0 };
    window.NeaceaPTEditor.applySnapshot(previewState, snapshot);
    $('templatePreviewTitle').textContent = template.title;
    $('templatePreviewMeta').textContent = [template.description, settings.goal, settings.level, settings.frequency, settings.warmup && `Riscaldamento generale: ${settings.warmup}`].filter(Boolean).join(' · ');
    if (!previewEditor) previewEditor = window.NeaceaPTEditor.mount($('templatePreviewEditor'), { getState: () => previewState, canEdit: () => false, onChange: () => {} });
    else previewEditor.sync();
    $('templatePreviewDialog').showModal();
  }
  $('closeTemplatePreviewBtn').addEventListener('click', () => $('templatePreviewDialog').close());
  $('templateForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !pending || !$('templateForm').reportValidity()) return;
    busy = true; $('confirmTemplateBtn').disabled = true; $('templateSaveError').textContent = ''; sync();
    try {
      await ptData(pending.mode === 'rename' ? 'update_template' : pending.mode === 'copy' ? 'create_template' : 'save_template', { ...pending, title: $('templateTitle').value.trim(), description: $('templateDescription').value.trim(), folderId:$('templateFolder').value });
      folderId=$('templateFolder').value;$('templateSearch').value='';
      dialog.close(); pending = null; showToast('Modello salvato nell’archivio generale per tutti i PT');
      showView('templatesView'); await show();
    } catch (e) { $('templateSaveError').textContent = e.message || 'Salvataggio non riuscito. Riprova: non verranno create copie duplicate.'; }
    finally { busy = false; $('confirmTemplateBtn').disabled = false; sync(); }
  });
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); else pending = null; });
  for (const name of ['closeTemplateBtn', 'cancelTemplateBtn']) $(name).addEventListener('click', close);
  $('saveTemplateBtn').addEventListener('click', openSave);
  $('refreshTemplatesBtn').addEventListener('click', show);
  $('templateSearch').addEventListener('input', render);
  $('renameTemplateForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !renamePending || !$('renameTemplateForm').reportValidity()) return;
    const title = $('renameTemplateName').value.trim();
    if (!title) { $('renameTemplateError').textContent = 'Inserisci un nome per la scheda.'; $('renameTemplateName').focus(); return; }
    busy = true; sync(); $('renameTemplateError').textContent = '';
    for (const name of ['renameTemplateName','saveRenameTemplateBtn','cancelRenameTemplateBtn']) $(name).disabled = true;
    try {
      await ptData('update_template', { ...renamePending, title });
      $('renameTemplateDialog').close(); renamePending = null;
      await show(); showToast('Nome della scheda aggiornato');
    } catch (e) { $('renameTemplateError').textContent = e.message || 'Nome non salvato. Riprova.'; }
    finally {
      busy = false; sync();
      for (const name of ['renameTemplateName','saveRenameTemplateBtn','cancelRenameTemplateBtn']) $(name).disabled = false;
    }
  });
  $('renameTemplateName').addEventListener('input', () => { if (renamePending) renamePending.requestId = id('rename'); });
  $('cancelRenameTemplateBtn').onclick = () => { if (!busy) { $('renameTemplateDialog').close(); renamePending = null; } };
  $('renameTemplateDialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); else renamePending = null; });
  $('templateCards').addEventListener('click', async event => {
    const button = event.target.closest('[data-assign-template], [data-retire-template], [data-preview-template], [data-edit-template], [data-copy-template], [data-rename-template], [data-quick-rename-template], [data-move-template], [data-unfile-template]');
    if (!button || busy) return;
    const template = templates.find(t => t.id === Object.values(button.dataset)[0]);
    if (!template) return;
    if (button.dataset.moveTemplate || button.dataset.unfileTemplate) { openMove([template], button.dataset.unfileTemplate ? '' : undefined); return; }
    if (button.dataset.quickRenameTemplate) {
      if (!own(template)) return;
      renamePending = { templateId: template.id, expectedUpdatedAt: template.updated_at, folderId: template.folder_id || '', requestId: id('rename') };
      $('renameTemplateName').value = template.title;
      $('renameTemplateError').textContent = '';
      $('renameTemplateDialog').showModal();
      $('renameTemplateName').focus(); $('renameTemplateName').select();
      return;
    }
    if (button.dataset.assignTemplate) {
      const clientId = button.closest('.template-card')?.querySelector('[data-template-client]')?.value;
      if (!clientId) { showToast('Seleziona prima un cliente'); return; }
      if (window.PTProgramFlow?.assignTemplate) await window.PTProgramFlow.assignTemplate(template.id, clientId);
      return;
    }
    if (button.dataset.previewTemplate) { preview(template); return; }
    if (button.dataset.editTemplate) { openEditor(template); return; }
    if (button.dataset.copyTemplate || button.dataset.renameTemplate) {
      const copy=Boolean(button.dataset.copyTemplate);
      pending={mode:copy?'copy':'rename',templateId:copy?id('template'):template.id,snapshot:structuredClone(template.snapshot),expectedUpdatedAt:template.updated_at,requestId:id('edit')};
      $('templateForm').reset();$('templateSaveError').textContent='';
      $('templateDialogTitle').textContent=copy?'Duplica programma nell’archivio':'Rinomina / sposta programma';
      $('templateSourceSummary').textContent=copy?'Verrà creato un nuovo programma indipendente.':'Modifica solo nome, descrizione e cartella. Le copie cliente non cambiano.';
      $('templateTitle').value=copy?`${template.title} · copia`.slice(0,120):template.title;
      $('templateDescription').value=template.description || '';
      $('templatePrivacy').required=false;$('templatePrivacy').closest('label').hidden=true;
      folderOptions($('templateFolder'),template.folder_id);dialog.showModal();$('templateTitle').focus();return;
    }
    if (button.dataset.retireTemplate) {
      if (!await confirmAction(`Spostare “${template.title}” nel Cestino? Le copie già assegnate ai clienti resteranno intatte.`)) return;
      busy = true; sync();
      try { await ptData('archive_template', {templateId: template.id,expectedUpdatedAt:template.updated_at}); templates = templates.filter(t => t.id !== template.id); render(); showToast('Programma spostato nel Cestino.'); }
      catch (e) { showToast(e.message || 'Eliminazione non riuscita'); }
      finally { busy = false; sync(); }
      return;
    }
    if (!window.PTProgramFlow) { showToast('Ricarica la pagina per usare la duplicazione guidata.'); return; }
  });
  function openFolderForm(select = null, rename = false) {
    if(busy || folderBusy)return;
    const current=folders.find(f=>f.id===folderId);
    folderPending={folderId:rename?current.id:id('folder'),parentId:select?select.value:folderId,expectedUpdatedAt:rename?current.updated_at:undefined,select};
    $('templateFolderDialogTitle').textContent=rename?'Rinomina cartella':'Nuova cartella';
    $('templateFolderName').value=rename?current.name:'';
    $('templateFolderParent').textContent=rename?folderPath(current.id):`Dentro: ${folderPath(folderPending.parentId)}`;
    $('templateFolderError').textContent='';$('templateFolderDialog').showModal();$('templateFolderName').focus();
  }
  $('templateFolderForm').addEventListener('submit',async event=>{
    event.preventDefault();if(folderBusy || !folderPending || !$('templateFolderForm').reportValidity())return;
    folderBusy=true;$('saveTemplateFolderBtn').disabled=true;
    try {
      const {select,...payload}=folderPending;
      const result=await ptData('save_template_folder',{...payload,name:$('templateFolderName').value.trim()});
      folders=folders.filter(f=>f.id!==result.folder.id);folders.push(result.folder);
      if(select) {folderOptions(select,result.folder.id);if(select.id==='libraryFolder')markEditDirty();}
      $('templateFolderDialog').close();folderPending=null;render();
    }catch(e){$('templateFolderError').textContent=e.message;}
    finally{folderBusy=false;$('saveTemplateFolderBtn').disabled=false;}
  });
  $('templateFolderDialog').addEventListener('cancel',e=>{if(folderBusy)e.preventDefault();});
  $('cancelTemplateFolderBtn').onclick=()=>{if(!folderBusy){$('templateFolderDialog').close();folderPending=null;}};
  $('newTemplateFolderBtn').onclick=()=>openFolderForm();
  $('renameTemplateFolderBtn').onclick=()=>openFolderForm(null,true);
  $('inlineTemplateFolderBtn').onclick=()=>openFolderForm($('templateFolder'));
  $('libraryNewFolderBtn').onclick=()=>openFolderForm($('libraryFolder'));
  $('deleteTemplateFolderBtn').onclick=async()=>{
    const folder=folders.find(f=>f.id===folderId);if(busy || !own(folder))return;
    if(!await confirmAction(`Eliminare la cartella “${folder.name}”? I programmi e le sottocartelle contenuti torneranno al livello principale dell’archivio. Nessun programma verrà cancellato.`))return;
    busy=true;sync();
    try {await ptData('delete_template_folder',{folderId:folder.id,expectedUpdatedAt:folder.updated_at});folderId=folder.parent_id || '';await show();}
    catch(e){showToast(e.message);}finally{busy=false;sync();}
  };
  for(const name of ['templateFolders','templateBreadcrumb']) $(name).onclick=event=>{
    const button=event.target.closest('[data-open-folder]');if(!button || busy)return;
    folderId=button.dataset.openFolder;$('templateSearch').value='';$('templateAllFolders').checked=false;render();
  };
  function openMove(items, destination) {
    if(busy)return;
    const movable=items.filter(own);if(!movable.length)return;
    movePending=movable.map(t=>({templateId:t.id,title:t.title,expectedUpdatedAt:t.updated_at,requestId:id('move')}));
    folderOptions($('moveTemplateFolder'),destination === undefined ? movable[0].folder_id : destination);
    $('moveTemplateSummary').textContent=movable.map(t=>`${t.title} · ${folderPath(t.folder_id)}`).join('\n');
    $('moveTemplateError').textContent='';$('moveTemplateDialog').showModal();
  }
  $('templateCards').addEventListener('change',event=>{
    const input=event.target.closest('[data-select-template]');if(!input || busy)return;
    if(input.checked)selectedTemplates.add(input.dataset.selectTemplate);else selectedTemplates.delete(input.dataset.selectTemplate);
    sync();
  });
  $('templateAllFolders').addEventListener('change',render);
  $('selectVisibleTemplatesBtn').onclick=()=>{if(busy)return;$('templateCards').querySelectorAll('[data-select-template]').forEach(el=>selectedTemplates.add(el.dataset.selectTemplate));render();};
  $('clearTemplateSelectionBtn').onclick=()=>{if(busy)return;selectedTemplates.clear();render();};
  $('moveSelectedTemplatesBtn').onclick=()=>openMove(templates.filter(t=>selectedTemplates.has(t.id)));
  $('moveTemplateFolder').addEventListener('change',()=>{movePending?.forEach(item=>item.requestId=id('move'));});
  $('cancelMoveTemplateBtn').onclick=()=>{if(!busy){movePending=null;$('moveTemplateDialog').close();}};
  $('moveTemplateDialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();else movePending=null;});
  $('moveTemplateForm').addEventListener('submit',async event=>{
    event.preventDefault();if(busy || !movePending?.length)return;
    busy=true;sync();$('moveTemplateError').textContent='';
    for(const name of ['moveTemplateFolder','confirmMoveTemplateBtn','cancelMoveTemplateBtn'])$(name).disabled=true;
    let moved=0;
    try{
      // Each confirmed move is removed from the retry queue. A failed response
      // keeps its request ID so retry cannot duplicate or overwrite a newer move.
      while(movePending.length){
        const item=movePending[0];
        const result=await ptData('move_template',{...item,folderId:$('moveTemplateFolder').value});
        if(!result.template)throw Error('Conferma dello spostamento mancante. Riprova.');
        templates=templates.map(t=>t.id===item.templateId?result.template:t);
        selectedTemplates.delete(item.templateId);movePending.shift();moved++;
      }
      folderId=$('moveTemplateFolder').value;$('templateSearch').value='';$('templateAllFolders').checked=false;
      $('moveTemplateDialog').close();movePending=null;showToast(`${moved} ${moved===1?'programma spostato':'programmi spostati'}`);
    }catch(e){$('moveTemplateError').textContent=`${moved ? `${moved} programmi già spostati. ` : ''}${e.message} Restano ${movePending.length} programmi: riprova oppure annulla e aggiorna l’archivio.`;}
    finally{busy=false;for(const name of ['moveTemplateFolder','confirmMoveTemplateBtn','cancelMoveTemplateBtn'])$(name).disabled=false;render();}
  });

  function markEditDirty(){editDirty=true;editRequest=null;sync();}
  function openEditor(template = null, draft = null) {
    if(busy || !window.NeaceaPTEditor){showToast('Editor non disponibile: ricarica la pagina');return;}
    editRecord=template?structuredClone(template):{id:id('template'),folder_id:folderId,title:'',description:''};
    const settings=draft?.meta || template?.snapshot.program.settings || {};
    if(draft)editRecord.title=draft.meta.name || '';
    editState={meta:{...settings,name:editRecord.title,studioNotes:settings.studioNotes || ''},sessions:['Settimana 1','Settimana 2','Settimana 3','Settimana 4'],sheetOrder:['A'],sheets:{A:[]},workoutDates:{},currentSheet:'A',activeWeekIndex:0};
    if(draft)editState={...structuredClone(draft),meta:{...structuredClone(draft.meta),studioNotes:draft.meta.studioNotes || ''}};
    if(template){editState.sessions=template.snapshot.program.weeks.map(w=>`Settimana ${w}`);window.NeaceaPTEditor.applySnapshot(editState,structuredClone(template.snapshot));}
    $('libraryEditorTitle').textContent=template?'Modifica programma dell’archivio':'Nuovo programma nell’archivio';
    $('libraryStudioNotes').value=settings.studioNotes || '';
    $('libraryName').value=editRecord.title;$('libraryDescription').value=editRecord.description || '';
    for(const key of ['Goal','Level','Frequency','Warmup']) $('library'+key).value=settings[key.toLowerCase()] || '';
    folderOptions($('libraryFolder'),editRecord.folder_id);$('librarySaveError').textContent='';
    editDirty=false;editRequest=null;
    if(!libraryEditor)libraryEditor=window.NeaceaPTEditor.mount($('libraryProgramEditor'),{getState:()=>editState,canEdit:()=>!busy,onChange:markEditDirty,confirm:confirmAction});
    else libraryEditor.sync();
    $('libraryEditorDialog').showModal();sync();$('libraryName').focus();
  }
  async function closeEditor(){
    if(busy)return;libraryEditor?.capture();
    if(editDirty && !await confirmAction('Chiudere senza salvare le modifiche al programma dell’archivio?'))return;
    $('libraryEditorDialog').close();editDirty=false;editState=null;editRequest=null;
  }
  $('newLibraryProgramBtn').onclick=()=>openEditor();
  $('closeLibraryEditorBtn').onclick=closeEditor;
  $('libraryEditorDialog').addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
  for(const name of ['libraryName','libraryDescription','libraryGoal','libraryStudioNotes','libraryLevel','libraryFrequency','libraryWarmup','libraryFolder']) $(name).addEventListener('input',markEditDirty);
  window.addEventListener('beforeunload',event=>{if(editDirty){event.preventDefault();event.returnValue='';}});
  async function saveEditor(asCopy = false) {
    if(busy || !editState || !$('libraryName').reportValidity())return;
    libraryEditor.capture();
    Object.assign(editState.meta,{name:$('libraryName').value.trim(),studioNotes:$('libraryStudioNotes').value.trim(),...Object.fromEntries(['Goal','Level','Frequency','Warmup'].map(key=>[key.toLowerCase(),$('library'+key).value.trim()]))});
    if(!editState.meta.name){$('libraryName').focus();return;}
    // Retain the entire immutable request on retry, including a copy's generated ID.
    if(!editRequest || editRequest.asCopy!==asCopy)editRequest={asCopy,action:editRecord.updated_at&&!asCopy?'update_template':'create_template',body:{templateId:asCopy?id('template'):editRecord.id,requestId:id('edit'),expectedUpdatedAt:editRecord.updated_at,title:editState.meta.name,description:$('libraryDescription').value.trim(),folderId:$('libraryFolder').value,snapshot:window.NeaceaPTEditor.toSnapshot(editState)}};
    busy=true;sync();libraryEditor.sync();$('libraryEditorDialog').querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=true;});$('librarySaveError').textContent='';
    try {
      const result=await ptData(editRequest.action,editRequest.body);editRecord=result.template;editDirty=false;editRequest=null;
      folderId=editRecord.folder_id || '';$('templateSearch').value='';
      showToast('Programma salvato nell’archivio. Le schede cliente non sono cambiate.');
      $('libraryEditorDialog').close();editState=null;await show();
    }catch(e){$('librarySaveError').textContent=e.message;}
    finally{busy=false;$('libraryEditorDialog').querySelectorAll('input,select,textarea').forEach(el=>{el.disabled=false;});if(editState)libraryEditor.sync();sync();}
  }
  $('saveLibraryProgramBtn').onclick=()=>saveEditor(false);
  $('saveLibraryCopyBtn').onclick=()=>saveEditor(true);
  async function changeWeeks(delta){
    if(busy || !editState)return;
    if(delta<0 && !await confirmAction('Rimuovere l’ultima settimana da questo programma dell’archivio? Le copie cliente non cambiano.'))return;
    libraryEditor.capture();const snapshot=window.NeaceaPTEditor.toSnapshot(editState),count=snapshot.program.weeks.length;
    if(count+delta<1 || count+delta>12)return;
    if(delta>0){snapshot.program.weeks.push(count+1);for(const day of snapshot.program.days){day.exercisesByWeek[count+1]=structuredClone(day.exercisesByWeek[count] || []);day.groupsByWeek[count+1]=structuredClone(day.groupsByWeek[count] || []);}}
    else{snapshot.program.weeks.pop();for(const day of snapshot.program.days){delete day.exercisesByWeek[count];delete day.groupsByWeek[count];}}
    editState.sessions=snapshot.program.weeks.map(w=>`Settimana ${w}`);editState.activeWeekIndex=Math.min(editState.activeWeekIndex,editState.sessions.length-1);
    window.NeaceaPTEditor.applySnapshot(editState,snapshot);markEditDirty();libraryEditor.sync();
  }
  $('libraryAddWeekBtn').onclick=()=>changeWeeks(1);$('libraryRemoveWeekBtn').onclick=()=>changeWeeks(-1);
  for(const name of ['templateTitle','templateDescription','templateFolder']) $(name).addEventListener('input',()=>{if(pending?.mode==='rename')pending.requestId=id('edit');});
  $('refreshTrashBtn')?.addEventListener('click', showTrash);
  $('emptyTrashBtn')?.addEventListener('click', async () => {
    if (busy || !await confirmAction('Svuotare definitivamente il Cestino? I programmi eliminati non potranno essere recuperati.')) return;
    busy = true; sync();
    try {
      const result = await ptData('empty_trash');
      showToast(`Cestino svuotato: ${result.total || 0} elementi eliminati.`);
      await showTrash();
    } catch (error) { showToast(error.message || 'Svuotamento non riuscito'); }
    finally { busy = false; sync(); }
  });
  window.PTTemplates = { openDraft: draft => { showView('templatesView'); openEditor(null,draft); }, openSave, show, showTrash, sync, list, ensureSaved, folderPath };
  sync();
})();
