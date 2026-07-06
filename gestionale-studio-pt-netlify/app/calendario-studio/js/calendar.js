// =============================================
// NEACEA — calendar.js
// Viste: Dashboard, Giorno, Settimana, Sala
// =============================================

const Calendar = (() => {

  let currentDate = new Date();
  let currentView = 'dashboard';

  function fmt(d) { return d.toISOString().slice(0, 10); }
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

  function todayStr() { return fmt(new Date()); }

  function italianDate(d) {
    return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function weekDays(date) {
    const day = date.getDay() === 0 ? 6 : date.getDay() - 1; // monday=0
    const monday = new Date(date);
    monday.setDate(date.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  function switchView(view, dateStr = null) {
    currentView = view;
    if (dateStr) currentDate = parseDate(dateStr);
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`view-${view}`);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.topbar-tab').forEach(l => {
      l.classList.toggle('active', l.dataset.view === view);
    });

    render();
  }

  function render() {
    switch (currentView) {
      case 'dashboard': renderDashboard(); break;
      case 'day': renderDay(); break;
      case 'week': renderWeek(); break;
      case 'room': renderRoom(); break;
      case 'operators': Operators.render(); break;
      case 'clients': Clients.render(); break;
    }
  }

  // ─────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────

  function renderDashboard() {
    const today = todayStr();
    const kpi = Services.getKPIForDate(today);
    const appts = Services.getAppointmentsForDate(today)
      .filter(a => a.status !== 'annullato')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const panel = document.getElementById('view-dashboard');
    if (!panel) return;

    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    panel.innerHTML = `
      <div class="view-header">
        <div>
          <div class="eyebrow">Neacea · Calendario</div>
          <div class="page-title">Buongiorno, <em>Gianluca</em></div>
          <div class="page-sub">${italianDate(new Date())}</div>
        </div>
        <button class="btn-primary" onclick="App.openNewAppointment()">+ Appuntamento</button>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:var(--blue)">
          <div class="kpi-label">Appuntamenti oggi</div>
          <div class="kpi-value">${kpi.totalAppts}</div>
          <div class="kpi-sub-text">sessioni programmate</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--blue-light)">
          <div class="kpi-label">In Sala PT ora</div>
          <div class="kpi-value">${kpi.inSalaNow}</div>
          <div class="kpi-sub-text">persone presenti</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--green)">
          <div class="kpi-label">Nutrizione oggi</div>
          <div class="kpi-value">${kpi.nutriAppts}</div>
          <div class="kpi-sub-text">visite + check</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--svc-visbody)">
          <div class="kpi-label">Valutazioni oggi</div>
          <div class="kpi-value">${kpi.valAppts}</div>
          <div class="kpi-sub-text">Visbody + Baiobit</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--red)">
          <div class="kpi-label">Circuit Training</div>
          <div class="kpi-value">${kpi.circuitiCount}</div>
          <div class="kpi-sub-text">${kpi.circuitFreeSlots} posti liberi</div>
        </div>
        <div class="kpi-card" style="--kpi-color:var(--gold)">
          <div class="kpi-label">Operatori attivi</div>
          <div class="kpi-value">${kpi.occupiedOps}</div>
          <div class="kpi-sub-text">con sessioni oggi</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 Prossimi appuntamenti oggi</span>
        </div>
        <div class="appt-list">
          ${appts.length === 0 ? '<p class="empty-state">Nessun appuntamento oggi</p>' :
            appts.map(a => {
              const svc = Services.getService(a.serviceId);
              const startMin = Services.timeToMin(a.startTime);
              const isPast = startMin + a.durationMin < nowMin;
              const isNow = startMin <= nowMin && nowMin < startMin + a.durationMin;
              return `
                <div class="appt-row ${isPast ? 'appt-past' : ''} ${isNow ? 'appt-now' : ''}"
                     onclick="App.openDetail('${a.id}')">
                  <div class="appt-color-bar" style="background:${svc?.color}"></div>
                  <div class="appt-time">
                    <span class="appt-start">${a.startTime}</span>
                    <span class="appt-dur">${a.durationMin}min</span>
                  </div>
                  <div class="appt-info">
                    <div class="appt-service" style="color:${svc?.color}">${svc?.label}</div>
                    <div class="appt-clients">${a.clientIds.map(id => Services.clientFullName(id)).join(', ')}</div>
                  </div>
                  <div class="appt-op">${Services.operatorFullName(a.operatorId)}</div>
                  <div class="appt-status">
                    <span class="status-pill status-${a.status}">${CONFIG.STATUS[a.status]?.label || a.status}</span>
                    ${svc?.isGroup ? `<span class="circuit-badge">${a.clientIds.length}/${svc.maxClients}</span>` : ''}
                  </div>
                </div>`;
            }).join('')}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────
  // VISTA GIORNO
  // ─────────────────────────────────────────────────────

  function renderDay() {
    const dateStr = fmt(currentDate);
    const appts = Services.getAppointmentsForDate(dateStr).filter(a => a.status !== 'annullato');
    const sat = Services.getSaturationTimeline(dateStr);
    const panel = document.getElementById('view-day');
    if (!panel) return;

    const startH = 7, endH = 21;
    const totalMin = (endH - startH) * 60;
    const pxPerMin = 1.1;

    function posStyle(appt) {
      const top = (Services.timeToMin(appt.startTime) - startH * 60) * pxPerMin;
      const height = Math.max(appt.durationMin * pxPerMin, 32);
      return `top:${top}px;height:${height}px`;
    }

    // Raggruppa appuntamenti per colonna (evita overlap visivo)
    function assignColumns(appts) {
      const cols = [];
      appts.forEach(a => {
        let placed = false;
        for (let c = 0; c < cols.length; c++) {
          const last = cols[c][cols[c].length - 1];
          if (Services.timeToMin(a.startTime) >= Services.timeToMin(last.startTime) + last.durationMin) {
            cols[c].push(a); placed = true; break;
          }
        }
        if (!placed) cols.push([a]);
      });
      return cols;
    }

    const sorted = [...appts].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const columns = assignColumns(sorted);
    const totalCols = Math.max(1, columns.length);

    let eventsHtml = '';
    columns.forEach((col, ci) => {
      const w = Math.floor(90 / totalCols);
      const left = 70 + ci * (w + 2);
      col.forEach(a => {
        const svc = Services.getService(a.serviceId);
        eventsHtml += `
          <div class="cal-event" style="${posStyle(a)};left:${left}px;width:${w}%;background:${svc?.colorLight};border-left:3px solid ${svc?.color};cursor:pointer"
               onclick="App.openDetail('${a.id}')">
            <div class="event-time">${a.startTime}</div>
            <div class="event-svc" style="color:${svc?.color}">${svc?.label}</div>
            <div class="event-client">${a.clientIds.map(id => Services.clientFullName(id)).join(', ')}</div>
            <div class="event-op">${Services.operatorFullName(a.operatorId)}</div>
            ${svc?.isGroup ? `<div class="event-circuit">${a.clientIds.length}/${svc.maxClients} posti</div>` : ''}
          </div>`;
      });
    });

    const hoursHtml = Array.from({ length: endH - startH }, (_, i) => {
      const h = startH + i;
      const top = i * 60 * pxPerMin;
      return `<div class="hour-line" style="top:${top}px"><span>${String(h).padStart(2,'0')}:00</span></div>`;
    }).join('');

    const satHtml = sat.map(s => {
      const pt = s.rooms.pt || { load: 0, max: CONFIG.maxRoomCapacity, pct: 0 };
      const nutri = s.rooms.nutri || { load: 0, max: CONFIG.maxRoomNutri, pct: 0 };
      const color = pt.pct > 80 ? 'var(--red)' : pt.pct > 50 ? 'var(--gold)' : 'var(--green)';
      return `
      <div class="sat-slot">
        <span class="sat-label">${s.time}</span>
        <div class="sat-bar-wrap">
          <div class="sat-bar" style="width:${pt.pct}%;background:${color}"></div>
        </div>
        <span class="sat-pct">${pt.load}/${pt.max}${nutri.load > 0 ? ' <span style="color:var(--green);font-size:9px">N:' + nutri.load + '</span>' : ''}</span>
      </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="view-header">
        <div class="nav-arrows">
          <button class="act-btn primary" onclick="Calendar.prevDay()">‹</button>
          <h2 class="view-title">${italianDate(currentDate)}</h2>
          <button class="act-btn primary" onclick="Calendar.nextDay()">›</button>
          <button class="act-btn primary" onclick="Calendar.goToday()">Oggi</button>
        </div>
        <button class="btn-primary" onclick="App.openNewAppointment('${dateStr}')">+ Nuovo</button>
      </div>
      <div class="day-layout">
        <div class="day-timeline-wrap">
          <div class="day-timeline" style="height:${totalMin * pxPerMin}px">
            ${hoursHtml}
            ${eventsHtml}
          </div>
        </div>
        <div class="day-sidebar">
          <div class="card">
            <div class="card-header"><h4 class="card-title">Saturazione sala</h4></div>
            <div class="sat-list">${satHtml}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────
  // VISTA SETTIMANA
  // ─────────────────────────────────────────────────────

  function renderWeek() {
    const days = weekDays(currentDate);
    const panel = document.getElementById('view-week');
    if (!panel) return;
    const todayS = todayStr();

    const cols = days.map(d => {
      const dateStr = fmt(d);
      const appts = Services.getAppointmentsForDate(dateStr).filter(a => a.status !== 'annullato')
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      const isToday = dateStr === todayS;
      const dayName = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d);
      const dayNum = d.getDate();

      return `
        <div class="week-col ${isToday ? 'week-today' : ''}">
          <div class="week-col-header" onclick="Calendar.switchView('day','${dateStr}')">
            <span class="week-dayname">${dayName}</span>
            <span class="week-daynum">${dayNum}</span>
          </div>
          <div class="week-events">
            ${appts.length === 0 ? '<div class="week-empty">—</div>' :
              appts.map(a => {
                const svc = Services.getService(a.serviceId);
                return `
                  <div class="week-event" style="background:${svc?.colorLight};border-left:3px solid ${svc?.color}"
                       onclick="App.openDetail('${a.id}')">
                    <span class="week-event-time">${a.startTime}</span>
                    <span class="week-event-svc" style="color:${svc?.color}">${svc?.label}</span>
                    <span class="week-event-client">${a.clientIds.map(id => Services.clientFullName(id)).join(', ')}</span>
                    ${svc?.isGroup ? `<span class="circuit-mini">${a.clientIds.length}/${svc.maxClients}</span>` : ''}
                  </div>`;
              }).join('')}
            <button class="week-add-btn" onclick="App.openNewAppointment('${dateStr}')">+</button>
          </div>
        </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="view-header">
        <div class="nav-arrows">
          <button class="act-btn primary" onclick="Calendar.prevWeek()">‹</button>
          <h2 class="view-title">Settimana ${days[0].getDate()} – ${days[6].getDate()} ${new Intl.DateTimeFormat('it-IT',{month:'long'}).format(days[6])}</h2>
          <button class="act-btn primary" onclick="Calendar.nextWeek()">›</button>
          <button class="act-btn primary" onclick="Calendar.goToday()">Oggi</button>
        </div>
        <button class="btn-primary" onclick="App.openNewAppointment()">+ Nuovo</button>
      </div>
      <div class="week-grid">${cols}</div>
    `;
  }

  // ─────────────────────────────────────────────────────
  // VISTA SALA / SATURAZIONE
  // ─────────────────────────────────────────────────────

  function renderRoom() {
    const dateStr = fmt(currentDate);
    const sat = Services.getSaturationTimeline(dateStr);
    const panel = document.getElementById('view-room');
    if (!panel) return;
    const rooms = Object.values(CONFIG.ROOMS);

    const roomHeaders = rooms.map(r =>
      `<th class="room-th">${r.label}<span class="room-th-max"> max ${r.max}</span></th>`
    ).join('');

    const rows = sat.map(s => {
      const allAppts = Services.getAppointmentsForDate(dateStr).filter(a => a.status !== 'annullato');
      const slot = { startTime: s.time, durationMin: 60, bufferMin: 0 };

      const roomCells = rooms.map(r => {
        const rd = s.rooms[r.id] || { load: 0, max: r.max, pct: 0 };
        const color = rd.pct >= 100 ? '#DC2626' : rd.pct > 60 ? '#F59E0B' : '#16A34A';
        const appts = allAppts.filter(a => {
          const svc = Services.getService(a.serviceId);
          return svc && svc.room === r.id && !svc.isBlock && Services.overlaps(slot, a, false);
        });
        return `<td class="room-cell">
          <div class="room-cell-bar">
            <div class="room-bar-mini" style="width:${rd.pct}%;background:${color}"></div>
          </div>
          <div class="room-cell-load ${rd.pct >= 100 ? 'room-full' : ''}">${rd.load}/${r.max}</div>
          <div class="room-cell-svcs">
            ${appts.map(a => {
              const svc = Services.getService(a.serviceId);
              return `<span class="room-svc-tag" style="background:${svc?.colorLight};color:${svc?.color};border:1px solid ${svc?.color}44"
                           onclick="App.openDetail('${a.id}')" title="${a.clientIds.map(id=>Services.clientFullName(id)).join(', ')}">
                ${svc?.label}${svc?.isGroup ? ` ${a.clientIds.length}/${svc.maxClients}` : ''}
              </span>`;
            }).join('')}
          </div>
        </td>`;
      }).join('');

      const blocks = allAppts.filter(a => {
        const svc = Services.getService(a.serviceId);
        return svc?.isBlock && Services.overlaps(slot, a, false);
      });
      const blockBadge = blocks.length
        ? `<span class="block-badge" title="${blocks.map(b => Services.operatorFullName(b.operatorId) + ': ' + (b.notes||'blocco')).join(', ')}">🚫 ${blocks.length}</span>`
        : '';

      return `<tr class="room-row">
        <td class="room-time">${s.time}<br><span class="room-time-end">${s.label.split('\u2013')[1] || ''}</span>${blockBadge}</td>
        ${roomCells}
      </tr>`;
    }).join('');

    panel.innerHTML = `
      <div class="view-header">
        <div class="nav-arrows">
          <button class="btn btn-ghost btn-sm" onclick="Calendar.prevDay()">\u2039</button>
          <h2 class="view-title">Sale \u2014 ${italianDate(currentDate)}</h2>
          <button class="btn btn-ghost btn-sm" onclick="Calendar.nextDay()">\u203a</button>
          <button class="btn btn-ghost btn-sm" onclick="Calendar.goToday()">Oggi</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Saturazione per sala e fascia oraria</h3>
          <span class="card-subtitle">3 risorse indipendenti</span>
        </div>
        <div style="overflow-x:auto">
          <table class="room-table">
            <thead><tr><th>Orario</th>${roomHeaders}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────
  // NAVIGAZIONE
  // ─────────────────────────────────────────────────────

  function prevDay() { currentDate.setDate(currentDate.getDate() - 1); render(); }
  function nextDay() { currentDate.setDate(currentDate.getDate() + 1); render(); }
  function prevWeek() { currentDate.setDate(currentDate.getDate() - 7); render(); }
  function nextWeek() { currentDate.setDate(currentDate.getDate() + 7); render(); }
  function goToday() { currentDate = new Date(); render(); }

  function getCurrentDateStr() { return fmt(currentDate); }

  return { switchView, render, prevDay, nextDay, prevWeek, nextWeek, goToday, getCurrentDateStr, fmt };
})();
