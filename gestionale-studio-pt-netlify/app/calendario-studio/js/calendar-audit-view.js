/* Presentation only: consumes the existing read-only audit list. */
window.CalendarAuditView = (() => {
  const actions = {
    marked_done: ['✅', 'Seduta completata', 'done'],
    appointment_cancelled: ['✕', 'Seduta annullata', 'cancelled'],
    marked_noshow: ['⚠️', 'No-show', 'warning'],
    done_reverted: ['↩️', 'Seduta ripristinata', 'restored'],
    package_appointment_created: ['📦', 'Pacchetto programmato', 'package'],
    appointment_created: ['＋', 'Seduta creata', 'created'],
    appointment_moved: ['↔️', 'Seduta spostata', 'moved'],
    operator_changed: ['👤', 'Cambio PT', 'trainer'],
    trainer_assignment_changed: ['👤', 'Assegnazione PT', 'trainer'],
    service_changed: ['⇄', 'Cambio servizio', 'moved'],
    client_package_changed: ['📦', 'Pacchetto aggiornato', 'package'],
    availability_changed: ['◷', 'Disponibilità PT aggiornata', 'moved'],
    availability_noop: ['＝', 'Disponibilità invariata', 'neutral'],
    appointment_deleted: ['✕', 'Seduta eliminata', 'cancelled'],
    appointment_noop: ['＝', 'Nessuna modifica', 'neutral'],
    client_details_changed: ['✎', 'Dati cliente aggiornati', 'neutral'],
    operator_profile_changed: ['👤', 'Profilo operatore aggiornato', 'trainer'],
    status_changed: ['⇄', 'Stato aggiornato', 'neutral'],
    appointment_updated: ['✎', 'Seduta aggiornata', 'neutral']
  };
  const statusNames = {prenotato:'Prenotata', fatto:'Fatto', annullato:'Annullata', noshow:'No-show'};
  const node = (tag, text, className) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    return e;
  };
  const localDate = value => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const fullName = person => [person?.nome, person?.cognome].filter(Boolean).join(' ');
  const testMarker = value => /(?:^|[^a-z0-9])test(?:$|[^a-z0-9])/i.test(String(value || ''));
  function groups(rows) {
    const result = new Map();
    for (const row of rows) {
      const request = row.request_id || row.correlation_id || row.metadata?.correlation_id;
      const key = request ? `${row.source}:${row.actor_operator_id}:${request}` : `row:${row.id}`;
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(row);
    }
    return [...result.values()];
  }
  function describe(rows, state) {
    const clientName = id => fullName(state.getClients().find(c => c.id === id)) || 'Cliente non più disponibile';
    const operatorName = id => fullName(state.getOperators().find(o => o.id === id)) || (id ? 'Operatore non più disponibile' : 'Non assegnato');
    const ids = [...new Set(rows.flatMap(r => r.client_ids || []))];
    const isTest = rows.some(r => r.metadata?.test === true || r.metadata?.is_test === true ||
      [r.entity_id, r.actor_name, ...r.client_ids || [], r.before_data?.nome, r.after_data?.nome,
       r.before_data?.cognome, r.after_data?.cognome].some(testMarker)) || ids.some(id => testMarker(clientName(id)));
    const primary = Object.keys(actions).find(action => rows.some(r => r.action === action));
    const badge = actions[primary] || ['•', 'Attività registrata', 'neutral'];
    const results = new Set();
    // Rows with identical before/after can represent several labels for one mutation.
    const seen = new Set();
    for (const r of [...rows].reverse()) {
      const b = r.before_data || {}, a = r.after_data || {};
      const signature = JSON.stringify([r.entity_type,r.entity_id,b,a]);
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (Number.isFinite(b.sessions_remaining) && Number.isFinite(a.sessions_remaining) && b.sessions_remaining !== a.sessions_remaining) {
        const prefix = ids.length > 1 ? `${clientName(r.entity_id)}: ` : '';
        results.add(`${prefix}Residuo ${b.sessions_remaining} → ${a.sessions_remaining}`);
      }
      if ((b.date && a.date && b.date !== a.date) || (b.start_time && a.start_time && b.start_time !== a.start_time)) {
        const slot = value => `${b.date !== a.date ? value.date.split('-').reverse().join('/')+' ' : ''}${String(value.start_time || '').slice(0,5)}`;
        results.add(`${slot(b)} → ${slot(a)}`);
      }
      if ('operator_id' in b && 'operator_id' in a && b.operator_id !== a.operator_id) results.add(`${operatorName(b.operator_id)} → ${operatorName(a.operator_id)}`);
      if (b.status && a.status && b.status !== a.status && !rows.some(x => x.before_data?.sessions_remaining !== undefined && x.before_data.sessions_remaining !== x.after_data?.sessions_remaining)) results.add(`${statusNames[b.status] || 'Stato precedente'} → ${statusNames[a.status] || 'Stato aggiornato'}`);
    }
    if (rows.some(r => r.action === 'package_appointment_created')) results.add(`${new Set(rows.filter(r => r.action === 'package_appointment_created').map(r => r.entity_id)).size} sedute programmate`);
    if (!results.size) results.add(rows.every(r => r.metadata?.noop || r.action.endsWith('_noop')) ? 'Nessuna variazione' : 'Operazione registrata');
    return {isTest, badge, clients:ids.length ? ids.map(clientName).join(', ') : '—', result:[...results].join(' · ')};
  }
  function open({call, labels, state, ui}) {
    ui.openModal('<div class="modal-header"><h3>Registro attività</h3><button class="modal-close" onclick="UI.closeModal()">×</button></div><div class="modal-body" id="calendar-audit-view"></div>');
    const host = document.getElementById('calendar-audit-view');
    const form = node('form', undefined, 'audit-filters');host.append(form);
    const inputs = {};
    for (const [name, label] of [['from','Dal'],['to','Al']]) {
      const wrap = node('label', label), input = node('input');input.type='date';input.setAttribute('aria-label',label);wrap.append(input);form.append(wrap);inputs[name]=input;
    }
    for (const [name, label, values] of [
      ['actor','Utente',state.getOperators().map(o=>[o.id,fullName(o)])],
      ['client','Cliente',state.getClients().map(c=>[c.id,fullName(c)])],
      ['action','Azione',Object.entries(labels)],
      ['source','Origine',['calendar','acquisition','system','apple'].map(s=>[s,s])]
    ]) {
      const wrap=node('label',label),select=node('select');select.setAttribute('aria-label',label);select.append(new Option('Tutti',''));
      for(const [value,text] of values)select.append(new Option(text,value));
      wrap.append(select);form.append(wrap);inputs[name]=select;
    }
    const controls=node('div',undefined,'audit-controls'),toggle=node('input');toggle.type='checkbox';
    const toggleLabel=node('label',undefined,'audit-test-toggle');toggleLabel.append(toggle,document.createTextNode('Mostra eventi TEST'));controls.append(toggleLabel);
    const output=node('div',undefined,'audit-output'),message=node('p','', 'audit-message');message.setAttribute('role','status');
    const more=node('button','Carica altre');more.type='button';more.hidden=true;
    let rows=[],cursor='',generation=0,busy=false;
    function render() {
      output.replaceChildren();let hidden=0;
      const table=node('table',undefined,'audit-table'),head=node('thead'),titles=node('tr'),body=node('tbody');
      for(const text of ['Ora','Utente','Cliente','Azione','Risultato']){const th=node('th',text);th.scope='col';titles.append(th)}
      head.append(titles);table.append(head,body);
      for(const group of groups(rows)) {
        if(inputs.action.value && !group.some(r=>r.action===inputs.action.value))continue;
        const info=describe(group,state);if(info.isTest&&!toggle.checked){hidden++;continue}
        const first=group[0],tr=node('tr',undefined,'audit-entry'),date=new Date(first.created_at);
        const values=[date.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),first.actor_name || 'Sistema',info.clients];
        values.forEach((text,i)=>{const td=node('td',text);td.dataset.label=['Ora','Utente','Cliente'][i];if(i===0){td.append(node('small',date.toLocaleDateString('it-IT'), 'audit-date'))}tr.append(td)});
        const action=node('td');action.dataset.label='Azione';action.append(node('span',`${info.badge[0]} ${info.badge[1]}`,`audit-badge audit-${info.badge[2]}`));tr.append(action);
        const result=node('td');result.dataset.label='Risultato';result.append(node('span',info.result));
        const details=node('details'),summary=node('summary','Dettagli tecnici');details.append(summary,node('pre',JSON.stringify(group,null,2)));result.append(details);tr.append(result);body.append(tr);
      }
      if(body.children.length)output.append(table);else output.append(node('p',hidden?'Nessuna attività visibile: gli eventi TEST sono nascosti.':'Nessuna attività nel periodo.'));
      message.textContent=`${body.children.length} attività${hidden ? ` · ${hidden} eventi TEST nascosti` : ''}. Le richieste vengono raggruppate tra tutte le righe caricate.`;
    }
    async function load(append=false) {
      if(append&&busy)return;
      const version=++generation;busy=true;more.disabled=true;
      if(!append){rows=[];cursor='';output.replaceChildren();message.textContent='Caricamento…'}
      const filters=Object.fromEntries(Object.entries(inputs).map(([key,e])=>[key,e.value]));
      if(filters.from)filters.from=new Date(filters.from+'T00:00:00').toISOString();
      if(filters.to){const d=new Date(filters.to+'T00:00:00');d.setDate(d.getDate()+1);filters.to=d.toISOString()}
      // Filter complete requests, preserving companion residual rows.
      filters.action='';
      filters.beforeId=cursor;const page=await call('list',{},filters);
      if(version!==generation)return;
      busy=false;more.disabled=false;
      if(page.error){message.textContent=page.error;return}
      const seen=new Set(rows.map(r=>String(r.id)));rows.push(...page.filter(r=>!seen.has(String(r.id))));
      if(page.length)cursor=String(page[page.length-1].id);
      more.hidden=page.length<100;render();
    }
    for(const [label,days] of [['Oggi',0],['Ultimi 7 giorni',6]]) {
      const button=node('button',label);button.type='button';button.onclick=()=>{const now=new Date();inputs.to.value=localDate(now);now.setDate(now.getDate()-days);inputs.from.value=localDate(now);load()};controls.append(button);
    }
    const submit=node('button','Filtra');submit.type='submit';controls.append(submit);form.append(controls);
    toggle.onchange=render;form.onsubmit=e=>{e.preventDefault();load()};more.onclick=()=>load(true);
    host.append(message,output,more);inputs.from.value=inputs.to.value=localDate(new Date());load();
  }
  return {open};
})();
