/* Birthday display is independent of appointments, capacity and package counters. */
const Birthdays = (() => {
  let rows = [], loadedAt = 0, unavailable = false, pending;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const leap = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  function onDate(items, date) {
    const [year, month, day] = date.split('-').map(Number);
    return items.filter(b => b.month === month && (b.month === 2 && b.day === 29 && !leap(year) ? 28 : b.day) === day);
  }
  async function refresh(force = false) {
    if (pending) return pending;
    if (!force && Date.now() - loadedAt < 300000) return false;
    pending = (async () => {
      try {
        const result = await window.NeaceaPrivateData.read('calendar_birthdays');
        if (!Array.isArray(result)) throw Error('Invalid birthdays');
        const changed = unavailable || JSON.stringify(rows) !== JSON.stringify(result);
        rows = result; unavailable = false; loadedAt = Date.now(); return changed;
      } catch (_) {
        const changed = !unavailable; unavailable = true; rows = []; loadedAt = 0; return changed;
      } finally { pending = null; }
    })();
    return pending;
  }
  function render(date, compact = false) {
    if (unavailable) return compact ? '' : '<p class="birthday-status" role="status">Compleanni non disponibili. Il calendario riproverà al prossimo aggiornamento.</p>';
    const items = onDate(rows, date);
    if (!items.length) return '';
    return `<section class="birthday-strip${compact ? ' birthday-compact' : ''}" aria-label="Compleanni del giorno"><strong>🎂 Compleanni · tutto il giorno</strong>${items.map(b => `<span class="birthday-person">${esc(b.name)}${b.kind === 'operator' ? ' <small>Staff</small>' : ''}</span>`).join('')}</section>`;
  }
  return { refresh, render, onDate };
})();
if (typeof module !== 'undefined') module.exports = Birthdays;
