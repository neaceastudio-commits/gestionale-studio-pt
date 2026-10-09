// The full coaching snapshot is retained alongside the existing PT operational model.
// Loads, session notes and historical feedback belong to PT and survive editor changes.
import type { ProgramEditorSnapshot, EditableExercise } from './vendor/components/program-editor';
import { getExerciseRecord } from './vendor/data/exercise-compatibility';
const copy = <T>(value: T): T => structuredClone(value);
const weeksFor = (state: any): number[] => state.sessions.map((_: any, i: number) => i + 1);
const setSignature = (sets: any[]) => JSON.stringify((sets || []).map(s => [s.reps, s.rir, s.note]));

// Only the prescription is copied. Applying it to a fresh client state leaves execution history empty.
export function copyProgramSnapshot(source: ProgramEditorSnapshot, name: string, makeId: (prefix: string) => string): ProgramEditorSnapshot {
  const snapshot = copy(source);
  snapshot.program.sourceId = makeId('program-copy');
  snapshot.program.title = name.trim().slice(0, 120);
  snapshot.program.days.forEach(day => {
    const keys = new Map<string, string>();
    day.key = makeId('day');
    Object.values(day.exercisesByWeek).flat().forEach(exercise => {
      if (!keys.has(exercise.key)) keys.set(exercise.key, makeId('exercise'));
      exercise.key = keys.get(exercise.key)!;
      if (exercise.sessionId) exercise.sessionId = day.key;
    });
    Object.values(day.groupsByWeek).flat().forEach(group => {
      group.key = makeId('group');
      group.exerciseKeys = group.exerciseKeys.map(key => keys.get(key)!).filter(Boolean);
    });
    day.preparation.forEach(item => { item.key = makeId('preparation'); });
    day.rampUp.forEach(item => { item.key = makeId('ramp'); });
  });
  return snapshot;
}

// Copy the full prescription, using new identities so session records stay on the source day.
export function duplicateDaySnapshot(state: any, letter: string, makeId: (prefix: string) => string): ProgramEditorSnapshot {
  const snapshot = toSnapshot(state);
  const source = snapshot.program.days.find(day => day.letter === state.currentSheet);
  if (!source) throw new Error('Seleziona un allenamento da duplicare.');
  const day = copy(source);
  const exerciseIds = new Map<string, string>();
  day.key = makeId('day');
  day.letter = letter;
  day.name = `${source.name} · copia`;
  Object.values(day.exercisesByWeek).flat().forEach(exercise => {
    if (!exerciseIds.has(exercise.key)) exerciseIds.set(exercise.key, makeId('exercise'));
    exercise.key = exerciseIds.get(exercise.key)!;
  });
  Object.values(day.groupsByWeek).flat().forEach(group => {
    group.key = makeId('group');
    group.exerciseKeys = group.exerciseKeys.map(key => exerciseIds.get(key)!).filter(Boolean);
  });
  day.preparation.forEach(item => { item.key = makeId('preparation'); });
  day.rampUp.forEach(item => { item.key = makeId('ramp'); });
  snapshot.program.days.push(day);
  return snapshot;
}

function fromExercise(exercise: any, index: number): EditableExercise {
  const sets = exercise.weekSets?.[index] || [];
  const same = sets.length && sets.every((s: any) => s.reps === sets[0].reps);
  return {
    key: exercise.id, name: exercise.name || '', canonicalExerciseId: getExerciseRecord(exercise.name || '')?.id, sets: String(sets.length || ''),
    reps: same ? sets[0].reps : sets.map((s: any) => s.reps).join(' / '),
    rir: sets[0]?.rir || '', rest: exercise.recovery || '', note: exercise.notes || '',
    progressionBase: exercise.progressionName || '', techniqueId: '', techniqueName: '', techniqueNote: '',
    prescriptionMode: 'manual',
  };
}

export function toSnapshot(state: any): ProgramEditorSnapshot {
  const stored = state.coachingEditorSnapshot;
  const weeks = weeksFor(state);
  return {
    format: 'neacea-program-editor-v1',
    program: {
      sourceId: state.draftProgramId || 'pt-manual', title: state.meta.name || 'Scheda di allenamento', weeks,
      settings: { ...Object.fromEntries(['goal', 'level', 'frequency', 'warmup'].map(key => [key, String(state.meta[key] || '')])),
        ...(state.meta.studioNotes !== undefined ? { studioNotes: String(state.meta.studioNotes || '') } : {}) },
      days: state.sheetOrder.map((letter: string) => {
        const saved = stored?.program?.days.find((d: any) => d.letter === letter);
        const exercises = state.sheets[letter] || [];
        const day = saved ? copy(saved) : {
          key: `pt-day-${letter}`, letter, name: `Allenamento ${letter}`,
          generalWarmup: [], preparation: [], rampUp: [], notes: [],
          exercisesByWeek: {}, groupsByWeek: {},
        };
        day.exercisesByWeek = Object.fromEntries(weeks.map(week => {
          const existing = day.exercisesByWeek[week] || [];
          const order = existing.map((e: any) => e.key);
          const active = exercises.filter((e: any) => !e.coachingActiveWeeks || e.coachingActiveWeeks.includes(week));
          active.sort((a: any, b: any) => {
            const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
            return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
          });
          return [week, active.map((exercise: any) => {
            const prev = existing.find((e: any) => e.key === exercise.id);
            if (!prev) return fromExercise(exercise, week - 1);
            const result = copy(prev);
            const projection = exercise.coachingProjection;
            if (projection && projection.name !== exercise.name) result.name = exercise.name;
            if (projection && projection.notes !== exercise.notes) result.note = exercise.notes;
            if (projection && projection.recovery !== exercise.recovery) result.rest = exercise.recovery;
            // The coaching snapshot is the prescription. Operational set values
            // are actual performances and must not silently rewrite a template.
            return result;
          })];
        }));
        day.groupsByWeek = Object.fromEntries(weeks.map(week => [week,
          (day.groupsByWeek[week] || []).map((g: any) => ({ ...g,
            exerciseKeys: g.exerciseKeys.filter((key: string) => day.exercisesByWeek[week].some((e: any) => e.key === key))
          })).filter((g: any) => g.exerciseKeys.length > 1)
        ]));
        return day;
      }),
    },
  };
}

export function applySnapshot(state: any, snapshot: ProgramEditorSnapshot, options: { resetPrescription?: boolean } = {}): void {
  state.forwardWeeksVersion = 1;
  const weeks = weeksFor(state);
  const sheets: Record<string, any[]> = {};
  for (const day of snapshot.program.days) {
    const previous = state.sheets[day.letter] || [];
    const keys = Array.from(new Set(weeks.flatMap(w => (day.exercisesByWeek[w] || []).map(e => e.key))));
    sheets[day.letter] = keys.map(key => {
      const original = previous.find((e: any) => e.id === key);
      const base = weeks.map(w => day.exercisesByWeek[w]?.find(e => e.key === key)).find(Boolean)!;
      const exercise = original ? copy(original) : {
        id: key, type: 'Single', group: 'Full body', feedback: [], previousFeedback: [], previousPlan: [],
        previousPeriod: '', effort: '', recoveryNote: '', effortNote: '', weekSets: [],
      };
      exercise.name = base.name;
      exercise.notes = base.note;
      exercise.recovery = base.rest;
      exercise.progressionName = base.progressionName || base.progressionBase;
      exercise.coachingActiveWeeks = weeks.filter(w => day.exercisesByWeek[w]?.some(e => e.key === key));
      exercise.coachingRetiredSets = exercise.coachingRetiredSets || {};
      exercise.weekSets = weeks.map((week, index) => {
        const prescription = day.exercisesByWeek[week]?.find(e => e.key === key);
        const old = exercise.weekSets[index] || exercise.coachingRetiredSets[week] || [];
        if (!prescription) { if (old.length) exercise.coachingRetiredSets[week] = old; return []; }
        const oldPrescription = state.coachingEditorSnapshot?.program.days.find((d: any) => d.key === day.key)
          ?.exercisesByWeek[week]?.find((e: any) => e.key === key) || (original ? fromExercise(original, index) : undefined);
        // An unrelated edit must never rewrite existing individual set prescriptions or actual RIR.
        if (!options.resetPrescription && oldPrescription && JSON.stringify([oldPrescription.sets, oldPrescription.reps, oldPrescription.rir, oldPrescription.structuredPrescription]) ===
          JSON.stringify([prescription.sets, prescription.reps, prescription.rir, prescription.structuredPrescription])) return old;
        const groups = prescription.structuredPrescription?.setGroups;
        const count = Math.min(100, Math.max(0, parseInt(prescription.sets, 10) || 0));
        const reps = groups?.length ? groups.flatMap(g => Array.from({ length: Math.min(100, g.sets) }, () => g.reps)) :
          Array.from({ length: count }, (_, i) => {
            const sequence = prescription.reps.split(/\s*\/\s*/);
            return sequence.length === count ? sequence[i] : prescription.reps;
          });
        if (old.length > reps.length) exercise.coachingRetiredSets[week] = old;
        return reps.map((rep, i) => {
          const prior = old[i] || exercise.coachingRetiredSets[week]?.[i] || {};
          const recorded = prior.recorded || prior.load || prior.sessionNote || state.workoutDates?.[day.letter]?.[index];
          return { ...prior, id: prior.id || `${key}-${week}-${i}`, reps: recorded ? prior.reps ?? rep : rep,
            load: prior.load || '', rir: recorded ? prior.rir ?? prescription.rir : prescription.rir, note: prior.note || '',
            sessionNote: prior.sessionNote || '', previousLoad: prior.previousLoad || '' };
        });
      });
      exercise.plan = weeks.map((_, i) => exercise.weekSets[i].map((s: any) => s.reps).join(' / '));
      exercise.feedback = weeks.map((_, i) => exercise.feedback[i] || '');
      exercise.coachingProjection = { name: exercise.name, notes: exercise.notes, recovery: exercise.recovery,
        sets: exercise.weekSets.map(setSignature) };
      return exercise;
    });
  }
  state.coachingEditorSnapshot = copy(snapshot);
  state.sheets = sheets;
  state.sheetOrder = snapshot.program.days.map(d => d.letter);
  if (!state.sheetOrder.includes(state.currentSheet)) state.currentSheet = state.sheetOrder[0] || '';
}


export function inheritLegacyWeeks(state: any): void {
  if (state.forwardWeeksVersion === 1) return;
  const snapshot = toSnapshot(state);
  for (const day of snapshot.program.days) {
    for (let i = 1; i < snapshot.program.weeks.length; i++) {
      const prev = snapshot.program.weeks[i - 1], week = snapshot.program.weeks[i];
      const target = day.exercisesByWeek[week];
      for (const [index, exercise] of day.exercisesByWeek[prev].entries()) {
        if (!target.some(e => e.key === exercise.key)) target.splice(Math.min(index, target.length), 0, copy(exercise));
      }
      for (const group of day.groupsByWeek[prev] || []) {
        if (!day.groupsByWeek[week].some(g => g.key === group.key)) day.groupsByWeek[week].push(copy(group));
      }
    }
  }
  applySnapshot(state, snapshot);
  state.forwardWeeksVersion = 1;
}
