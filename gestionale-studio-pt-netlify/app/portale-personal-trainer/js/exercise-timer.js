/* Stopwatch UI only: no training records, storage or network writes. */
(() => {
  function createClock(now = () => Date.now()) {
    const entries = new Map();
    const entry = key => {
      if (!entries.has(key)) entries.set(key, { elapsed: 0, startedAt: null });
      return entries.get(key);
    };
    const read = key => {
      const value = entry(key);
      return { running: value.startedAt !== null,
        elapsed: Math.max(0, value.elapsed + (value.startedAt === null ? 0 : now() - value.startedAt)) };
    };
    return {
      read,
      toggle(key) {
        const value = entry(key);
        if (value.startedAt === null) value.startedAt = now();
        else { value.elapsed = read(key).elapsed; value.startedAt = null; }
        return read(key);
      },
      reset(key) { entries.set(key, { elapsed: 0, startedAt: null }); },
      running: () => Array.from(entries.values()).some(value => value.startedAt !== null),
    };
  }
  function formatTime(milliseconds) {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const clock = createClock();
  const keyFor = context => JSON.stringify(context);
  function prescriptionFor(studio, sheet, week, exerciseName) {
    const nameKey = name => String(name ?? '').trim().toLocaleLowerCase('it');
    const day = studio.coachingEditorSnapshot?.program?.days?.find(item => item.letter === sheet);
    const planned = day?.exercisesByWeek?.[week + 1];
    const exercises = planned ?? (studio.sheets?.[sheet] || []).filter(item =>
      !item.coachingActiveWeeks || item.coachingActiveWeeks.includes(week + 1));
    const matches = exercises.filter(item => nameKey(item.name) === nameKey(exerciseName));
    // Session rows have names, not prescription IDs. Ambiguous/custom rows must
    // not inherit another exercise's timer or an arbitrary recovery prescription.
    if (matches.length !== 1) return { exerciseId: null, recovery: '', roundRecovery: '' };
    const exercise = matches[0], exerciseId = exercise.key ?? exercise.id ?? null;
    const group = (day?.groupsByWeek?.[week + 1] || []).find(item => item.exerciseKeys.includes(exerciseId));
    return { exerciseId, recovery: (planned ? exercise.rest : exercise.recovery) ?? '',
      roundRecovery: group?.restBetweenRounds ?? '' };
  }
  function markup(context, recovery = '', roundRecovery = '') {
    const key = keyFor(context), value = clock.read(key);
    return `<div class="exercise-timer" data-pt-timer-key="${escape(key)}">
      <div class="exercise-timer-recovery"><span>Recupero</span><strong>${escape(recovery || 'Non indicato')}</strong></div>
      ${roundRecovery ? `<div class="exercise-timer-recovery"><span>Tra i giri</span><strong>${escape(roundRecovery)}</strong></div>` : ''}
      <div class="exercise-timer-clock"><span>Tempo trascorso</span><output role="timer" aria-live="off" aria-label="Tempo trascorso">${formatTime(value.elapsed)}</output></div>
      <button class="btn" type="button" data-pt-timer-action="toggle" aria-pressed="${value.running}">${value.running ? 'Pausa' : 'Avvia'}</button>
      <button class="btn" type="button" data-pt-timer-action="reset">Azzera</button>
    </div>`;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createClock, formatTime, keyFor, markup, prescriptionFor };
  if (typeof window === 'undefined') return;
  let interval = null;
  function paint() {
    document.querySelectorAll('[data-pt-timer-key]').forEach(element => {
      const value = clock.read(element.dataset.ptTimerKey);
      const output = element.querySelector('output');
      const button = element.querySelector('[data-pt-timer-action="toggle"]');
      const time = formatTime(value.elapsed), label = value.running ? 'Pausa' : 'Avvia';
      if (output.textContent !== time) output.textContent = time;
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-pressed', String(value.running));
    });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-pt-timer-action]');
    if (!button) return;
    const key = button.closest('[data-pt-timer-key]')?.dataset.ptTimerKey;
    if (!key) return;
    if (button.dataset.ptTimerAction === 'reset') clock.reset(key);
    else clock.toggle(key);
    paint();
    if (clock.running() && interval === null) interval = setInterval(paint, 250);
    if (!clock.running() && interval !== null) { clearInterval(interval); interval = null; }
  });
  window.PTExerciseTimer = { markup, prescriptionFor };
})();
