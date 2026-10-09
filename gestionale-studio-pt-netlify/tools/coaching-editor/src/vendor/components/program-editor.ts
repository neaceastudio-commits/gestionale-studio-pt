import { propagateForward } from '../../forward-weeks';
import { rememberEditorScroll, disableContactAutofill } from '../../ui-state';
import {
  realSetCount as countRealSets,
  type PrescriptionStructure,
  type ProgramExercise,
  type ProgramWeek,
  type StaticTrainingProgram,
} from '../data/test-program';
import {
  exerciseLibrary,
  type ExerciseEquipment,
  type ExerciseLibraryRecord,
  type ExerciseMuscleGroup,
  type ExercisePattern,
} from '../data/exercise-library';
import {
  progressionLibrary,
  type ProgressionCategory,
  type ProgressionRecord,
  type ProgressionSuitableFor,
} from '../data/progression-library';
import {
  getCompatibleProgressions,
  getExerciseClasses,
  getExerciseRecord,
  getProgressionType,
  type ExerciseClass,
} from '../data/exercise-compatibility';
import {
  exerciseGroupingDefinitions,
  getCompatibleTechniques,
  trainingTechniques,
  type ExerciseGroupingType,
} from '../data/training-techniques';
import {
  getExerciseDisplayLabel,
  sessionStructureDisplayLabels,
  type DisplayLabel,
} from '../lib/display-labels';

export type EditableExercise = {
  key: string;
  name: string;
  sets: string;
  reps: string;
  rir: string;
  rest: string;
  note: string;
  progressionBase: string;
  techniqueId: string;
  techniqueName: string;
  techniqueNote: string;
  canonicalExerciseId?: string;
  role?: ProgramExercise['role'];
  progressionId?: string;
  progressionName?: string;
  structuredPrescription?: PrescriptionStructure;
  realSetCount?: number;
  prescriptionMode?: 'structured' | 'manual';
  exerciseOrder?: number;
  sessionId?: string;
};

export type EditableExerciseGroup = {
  key: string;
  type: ExerciseGroupingType;
  exerciseKeys: string[];
  restBetweenRounds: string;
  rounds: string;
  note: string;
};

export type EditablePreparation = {
  key: string;
  name: string;
  setsReps: string;
  cue: string;
};

export type EditableRampUp = {
  key: string;
  exercise: string;
  steps: string[];
};

export type EditableDay = {
  key: string;
  letter: string;
  name: string;
  generalWarmup: string[];
  preparation: EditablePreparation[];
  rampUp: EditableRampUp[];
  exercisesByWeek: Record<ProgramWeek, EditableExercise[]>;
  groupsByWeek: Record<ProgramWeek, EditableExerciseGroup[]>;
  notes: string[];
};

export type EditableProgram = {
  sourceId: string;
  title: string;
  settings?: { goal?: string; level?: string; frequency?: string; warmup?: string; studioNotes?: string };
  weeks?: ProgramWeek[];
  days: EditableDay[];
};

type ExercisePickerFilters = {
  muscleGroup: ExerciseMuscleGroup | '';
  pattern: ExercisePattern | '';
  equipment: ExerciseEquipment | '';
};

type ProgressionPanelState = {
  dayKey: string;
  exerciseKey: string;
  query: string;
  category: ProgressionCategory | '';
  suitableFor: ProgressionSuitableFor | '';
  selectedId: string;
  showAll: boolean;
};

type ExerciseActionPanelState = {
  dayKey: string;
  exerciseKey: string;
};

type TechniquePanelState = ExerciseActionPanelState & {
  selectedId: string;
  note: string;
};

export type ManualProgramEditor = {
  element: HTMLElement;
  setProgram: (program: StaticTrainingProgram) => void;
  getSnapshot: () => ProgramEditorSnapshot;
  setSnapshot: (snapshot: ProgramEditorSnapshot) => void;
  setReadOnly: (readOnly: boolean) => void;
  isDirty: () => boolean;
  markSaved: () => void;
  setWeek: (week: ProgramWeek) => void;
};

export type ProgramEditorSnapshot = {
  format: 'neacea-program-editor-v1';
  program: EditableProgram;
};

const programWeeks: readonly ProgramWeek[] = [1, 2, 3, 4, 5, 6];
const dayLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const exercisePickerResultLimit = 12;

const progressionCategoryOptions: ReadonlyArray<readonly [ProgressionCategory, string]> = [
  ['technical', 'Tecnica'],
  ['strength', 'Forza'],
  ['hypertrophy', 'Ipertrofia'],
  ['volume', 'Volume'],
  ['intensity', 'Intensità'],
  ['density', 'Densità'],
  ['advanced', 'Avanzate'],
  ['reset', 'Reset'],
];

const progressionSuitableOptions: ReadonlyArray<readonly [ProgressionSuitableFor, string]> = [
  ['fundamental', 'Fondamentale'],
  ['complementary', 'Complementare'],
  ['isolation', 'Isolamento'],
  ['technical', 'Tecnico'],
  ['power', 'Power'],
];

const progressionCategoryLabels: Record<ProgressionCategory, string> = {
  technical: 'Tecnica',
  strength: 'Forza',
  hypertrophy: 'Ipertrofia',
  volume: 'Volume',
  intensity: 'Intensità',
  density: 'Densità',
  advanced: 'Avanzate',
  reset: 'Reset',
  other: 'Altro',
};

const progressionSuitableLabels: Record<ProgressionSuitableFor, string> = {
  fundamental: 'Fondamentale',
  complementary: 'Complementare',
  isolation: 'Isolamento',
  technical: 'Tecnico',
  power: 'Power',
  other: 'Altro',
};

const exerciseClassLabels: Record<ExerciseClass, string> = {
  fundamental: 'Fondamentale',
  compound: 'Multiarticolare',
  complementary: 'Complementare',
  isolation: 'Isolamento',
  technical: 'Tecnico',
  power: 'Power',
  core: 'Core',
  conditioning: 'Conditioning',
  mobility: 'Mobilità',
  other: 'Altro',
};

const muscleFilterOptions: ReadonlyArray<readonly [ExerciseMuscleGroup, string]> = [
  ['chest', 'Petto'],
  ['lats_back', 'Dorsali'],
  ['shoulders', 'Spalle'],
  ['biceps', 'Bicipiti'],
  ['triceps', 'Tricipiti'],
  ['quadriceps', 'Quadricipiti'],
  ['hamstrings', 'Femorali'],
  ['glutes', 'Glutei'],
  ['calves', 'Polpacci'],
  ['core', 'Core'],
  ['full_body', 'Full body'],
];

const patternFilterOptions: ReadonlyArray<readonly [ExercisePattern, string]> = [
  ['squat', 'Accosciata'],
  ['hinge', 'Estensione d’anca'],
  ['horizontal_push', 'Spinta orizzontale'],
  ['vertical_push', 'Spinta verticale'],
  ['horizontal_pull', 'Tirata orizzontale'],
  ['vertical_pull', 'Tirata verticale'],
  ['isolation', 'Isolamento'],
  ['core', 'Core'],
  ['power', 'Power'],
  ['conditioning', 'Conditioning'],
  ['mobility', 'Mobilità'],
  ['carry', 'Carry'],
  ['other', 'Altro'],
];

const equipmentFilterOptions: ReadonlyArray<readonly [ExerciseEquipment, string]> = [
  ['bodyweight', 'Corpo libero'],
  ['barbell', 'Bilanciere'],
  ['dumbbell', 'Manubri'],
  ['kettlebell', 'Kettlebell'],
  ['cable', 'Cavi'],
  ['machine', 'Macchina'],
  ['smith_machine', 'Smith machine'],
  ['rack', 'Rack'],
  ['bench', 'Panca'],
  ['pullup_bar', 'Sbarra trazioni'],
  ['bands', 'Elastici'],
  ['trx', 'TRX'],
  ['landmine', 'Landmine'],
  ['medicine_ball', 'Medicine ball'],
  ['sled', 'Sled'],
  ['cardio_machine', 'Cardio machine'],
  ['other', 'Altro'],
];

const muscleLabels: Record<ExerciseMuscleGroup, string> = {
  chest: 'Petto',
  lats_back: 'Dorsali',
  shoulders: 'Spalle',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  quadriceps: 'Quadricipiti',
  hamstrings: 'Femorali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  core: 'Core',
  full_body: 'Full body',
  mobility: 'Mobilità',
  other: 'Altro',
};

const patternLabels = Object.fromEntries(patternFilterOptions) as Record<ExercisePattern, string>;

const equipmentLabels: Record<ExerciseEquipment, string> = {
  bodyweight: 'Corpo libero',
  barbell: 'Bilanciere',
  dumbbell: 'Manubri',
  kettlebell: 'Kettlebell',
  cable: 'Cavi',
  machine: 'Macchina',
  smith_machine: 'Smith machine',
  rack: 'Rack',
  bench: 'Panca',
  pullup_bar: 'Sbarra trazioni',
  bands: 'Elastici',
  trx: 'TRX',
  landmine: 'Landmine',
  medicine_ball: 'Medicine ball',
  sled: 'Sled',
  cardio_machine: 'Cardio machine',
  club: 'Clubbell',
  fitball: 'Fitball',
  other: 'Altro',
};

const alphabeticalExerciseLibrary = [...exerciseLibrary].sort((first, second) =>
  first.name.localeCompare(second.name, 'it'),
);

function normalizeExerciseSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .trim();
}

function matchesExerciseSearch(record: ExerciseLibraryRecord, query: string): boolean {
  if (!query) return true;
  return [record.name, ...record.aliases].some((value) =>
    normalizeExerciseSearch(value).includes(query),
  );
}

function getExerciseMatches(
  query: string,
  filters: ExercisePickerFilters,
): ExerciseLibraryRecord[] {
  const normalizedQuery = normalizeExerciseSearch(query);
  return alphabeticalExerciseLibrary.filter((record) =>
    matchesExerciseSearch(record, normalizedQuery) &&
    (!filters.muscleGroup || record.primaryMuscleGroup === filters.muscleGroup) &&
    (!filters.pattern || record.pattern === filters.pattern) &&
    (!filters.equipment || record.equipment.includes(filters.equipment)),
  );
}

function getAvailablePatternOptions(
  muscleGroup: ExerciseMuscleGroup | '',
): ReadonlyArray<readonly [ExercisePattern, string]> {
  const availablePatterns = new Set(
    exerciseLibrary
      .filter((record) => !muscleGroup || record.primaryMuscleGroup === muscleGroup)
      .map((record) => record.pattern),
  );
  return patternFilterOptions.filter(([pattern]) => availablePatterns.has(pattern));
}

function getAvailableEquipmentOptions(
  muscleGroup: ExerciseMuscleGroup | '',
  pattern: ExercisePattern | '',
): ReadonlyArray<readonly [ExerciseEquipment, string]> {
  const availableEquipment = new Set(
    exerciseLibrary
      .filter((record) =>
        (!muscleGroup || record.primaryMuscleGroup === muscleGroup) &&
        (!pattern || record.pattern === pattern),
      )
      .flatMap((record) => record.equipment),
  );
  return equipmentFilterOptions.filter(([equipment]) => availableEquipment.has(equipment));
}

function resetIncompatibleExerciseFilters(filters: ExercisePickerFilters): void {
  const availablePatterns = getAvailablePatternOptions(filters.muscleGroup);
  if (filters.pattern && !availablePatterns.some(([pattern]) => pattern === filters.pattern)) {
    filters.pattern = '';
  }

  const availableEquipment = getAvailableEquipmentOptions(filters.muscleGroup, filters.pattern);
  if (filters.equipment && !availableEquipment.some(([equipment]) => equipment === filters.equipment)) {
    filters.equipment = '';
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#039;',
        '"': '&quot;',
      })[character] ?? character,
  );
}

function displayLabelMarkup(label: DisplayLabel, modifier?: string): string {
  const modifierClass = modifier ? ` localized-term--${modifier}` : '';
  return `
    <span class="localized-term${modifierClass}">
      <span class="localized-term__primary">${escapeHtml(label.primary)}</span>
      ${label.secondary ? `<span class="localized-term__secondary">${escapeHtml(label.secondary)}</span>` : ''}
    </span>
  `;
}

function parseEditableSetCount(value: string): number {
  const match = value.trim().match(/^\d+/);
  return match ? Math.max(0, Number.parseInt(match[0], 10)) : 0;
}

function cloneProgram(program: StaticTrainingProgram): EditableProgram {
  return {
    sourceId: program.id,
    title: program.title,
    weeks: [...program.weeks],
    days: program.days.map((day, dayIndex) => ({
      key: `day-${day.id}-${dayIndex}`,
      letter: day.id,
      name: day.name,
      generalWarmup: [...day.generalWarmup],
      preparation: day.preparation.map((item, itemIndex) => ({
        key: `preparation-${day.id}-${itemIndex}`,
        name: item.name,
        setsReps: item.setsReps,
        cue: item.cue,
      })),
      rampUp: day.specificWarmup.map((item, itemIndex) => ({
        key: `ramp-${day.id}-${itemIndex}`,
        exercise: item.exercise,
        steps: [...item.steps],
      })),
      exercisesByWeek: Object.fromEntries(
        program.weeks.map((week) => [
          week,
          day.exercises.map((exercise, exerciseIndex) => {
            const prescription = exercise.progression[week - 1];
            const structuredPrescription = prescription.structuredPrescription ?? prescription.structure;
            const progressionName = progressionLibrary.find((record) => record.id === exercise.progressionId)?.name;
            return {
              key: `exercise-${day.id}-${exerciseIndex}`,
              name: exercise.name,
              sets: String(prescription.sets),
              reps: prescription.reps,
              rir: prescription.rir,
              rest: prescription.rest,
              note: [exercise.note, prescription.note].filter(Boolean).join('\n'),
              progressionBase: progressionName ?? '',
              techniqueId: '',
              techniqueName: '',
              techniqueNote: '',
              exerciseOrder: exerciseIndex,
              sessionId: `day-${day.id}-${dayIndex}`,
              ...(exercise.canonicalExerciseId ? { canonicalExerciseId: exercise.canonicalExerciseId } : {}),
              ...(exercise.role ? { role: exercise.role } : {}),
              ...(exercise.progressionId ? { progressionId: exercise.progressionId } : {}),
              ...(progressionName ? { progressionName } : {}),
              ...(structuredPrescription ? {
                structuredPrescription: structuredClone(structuredPrescription),
                realSetCount: countRealSets(prescription),
                prescriptionMode: 'structured' as const,
              } : {
                realSetCount: countRealSets(prescription),
                prescriptionMode: 'manual' as const,
              }),
            };
          }),
        ]),
      ) as Record<ProgramWeek, EditableExercise[]>,
      groupsByWeek: program.weeks.reduce((weeks, week) => {
        weeks[week] = [];
        return weeks;
      }, {} as Record<ProgramWeek, EditableExerciseGroup[]>),
      notes: [...day.notes],
    })),
  };
}

function serializeEditableProgram(program: EditableProgram): EditableProgram {
  const serialized = structuredClone(program);
  serialized.weeks = [...(program.weeks ?? programWeeks)];
  serialized.days.forEach((day) => {
    serialized.weeks!.forEach((week) => {
      day.exercisesByWeek[week].forEach((exercise, exerciseOrder) => {
        exercise.exerciseOrder = exerciseOrder;
        exercise.sessionId = day.key;
      });
    });
  });
  return serialized;
}

export function createProgramEditorSnapshot(program: StaticTrainingProgram): ProgramEditorSnapshot {
  return {
    format: 'neacea-program-editor-v1',
    program: serializeEditableProgram(cloneProgram(program)),
  };
}

export function convertStructuredExerciseToManual(exercise: EditableExercise): EditableExercise {
  const manual = structuredClone(exercise);
  manual.sets = String(manual.realSetCount
    ?? manual.structuredPrescription?.setGroups.reduce((total, group) => total + group.sets, 0)
    ?? parseEditableSetCount(manual.sets));
  manual.structuredPrescription = undefined;
  manual.realSetCount = parseEditableSetCount(manual.sets);
  manual.prescriptionMode = 'manual';
  return manual;
}

function visibleLines(lines: string[]): string[] {
  return lines.filter((line) => line.trim().length > 0);
}

export function createManualProgramEditor(
  initialProgram: StaticTrainingProgram,
  initialWeek: ProgramWeek = 1,
  onEditingChange?: (editing: boolean) => void,
  onDirtyChange?: (dirty: boolean) => void,
  requestConfirmation: (message: string) => Promise<boolean> = async message => window.confirm(message),
): ManualProgramEditor {
  let programWeeks = [...initialProgram.weeks];
  let program = cloneProgram(initialProgram);
  let sourceSnapshot = structuredClone(program);
  let activeWeek = initialWeek;
  let activeDayKey = program.days[0]?.key ?? '';
  let nextDayLetterIndex = program.days.reduce(
    (nextIndex, day) => Math.max(nextIndex, dayLetters.indexOf(day.letter as typeof dayLetters[number]) + 1),
    0,
  );
  let editing = false;
  let dirty = false;
  let readOnly = false;
  let keySequence = 0;
  const openDisclosures = new Set<string>();
  const exercisePickerFilters = new Map<string, ExercisePickerFilters>();
  const exercisePickerQueries = new Map<string, string>();
  let progressionPanelState: ProgressionPanelState | null = null;
  let techniquePanelState: TechniquePanelState | null = null;
  let groupingPanelState: ExerciseActionPanelState | null = null;

  const root = document.createElement('section');
  root.className = 'manual-program-editor';

  const nextKey = (prefix: string): string => {
    keySequence += 1;
    return `${prefix}-${Date.now()}-${keySequence}`;
  };

  const getDay = (dayKey: string): EditableDay | undefined =>
    program.days.find((day) => day.key === dayKey);

  const disclosureOpen = (key: string): string =>
    openDisclosures.has(key) ? ' open' : '';

  let forwardBaseline = structuredClone(program);
  const markDirty = (): void => {
    propagateForward(forwardBaseline, program, activeWeek);
    forwardBaseline = structuredClone(program);
    dirty = true;
    onDirtyChange?.(true);
    const state = root.querySelector<HTMLElement>('[data-editor-local-state]');
    if (state) state.hidden = false;
    const toolbarState = root.querySelector<HTMLElement>('[data-editor-toolbar-state]');
    if (toolbarState) toolbarState.textContent = 'Modifiche alla scheda';
  };

  const getExercisePickerFilters = (exerciseKey: string): ExercisePickerFilters => {
    const filters = exercisePickerFilters.get(exerciseKey) ?? {
      muscleGroup: '',
      pattern: '',
      equipment: '',
    };
    exercisePickerFilters.set(exerciseKey, filters);
    return filters;
  };

  const renderFilterOptions = <T extends string>(
    options: ReadonlyArray<readonly [T, string]>,
    selectedValue: string,
    allLabel: string,
  ): string => `
    <option value="">${escapeHtml(allLabel)}</option>
    ${options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selectedValue ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  `;

  const getProgressionMatches = (): ProgressionRecord[] => {
    if (!progressionPanelState) return [];
    const query = normalizeExerciseSearch(progressionPanelState.query);
    const day = getDay(progressionPanelState.dayKey);
    const exercise = day?.exercisesByWeek[activeWeek].find((item) => item.key === progressionPanelState?.exerciseKey);
    const exerciseRecord = getExerciseRecord(exercise?.name ?? '');
    const availableRecords = progressionPanelState.showAll
      ? progressionLibrary.filter((record) => getProgressionType(record.id) === 'progression')
      : getCompatibleProgressions(exerciseRecord);
    return availableRecords.filter((record) =>
      (!query || normalizeExerciseSearch(record.name).includes(query)) &&
      (!progressionPanelState?.category || record.category === progressionPanelState.category) &&
      (!progressionPanelState?.suitableFor || record.suitableFor.includes(progressionPanelState.suitableFor)),
    );
  };

  const renderProgressionWeekPreview = (record: ProgressionRecord): string => `
    <div class="progression-week-grid">
      ${record.weeks.map((week, index) => `
        <article class="progression-week-card">
          <strong>W${index + 1}</strong>
          <dl>
            ${week.sets ? `<div><dt>Serie</dt><dd>${escapeHtml(week.sets)}</dd></div>` : ''}
            ${week.reps ? `<div><dt>Reps</dt><dd>${escapeHtml(week.reps)}</dd></div>` : ''}
            ${week.rirRpe ? `<div><dt>RIR/RPE</dt><dd>${escapeHtml(week.rirRpe)}</dd></div>` : ''}
            ${week.recovery ? `<div><dt>Recupero</dt><dd>${escapeHtml(week.recovery)}</dd></div>` : ''}
            ${week.note ? `<div class="progression-week-card__note"><dt>Nota</dt><dd>${escapeHtml(week.note)}</dd></div>` : ''}
          </dl>
        </article>
      `).join('')}
    </div>
  `;

  const renderProgressionResults = (records: ProgressionRecord[]): string => records.length > 0
    ? records.map((record) => `
        <button class="progression-picker-result${progressionPanelState?.selectedId === record.id ? ' progression-picker-result--selected' : ''}" type="button" data-progression-library-id="${escapeHtml(record.id)}" aria-pressed="${progressionPanelState?.selectedId === record.id}">
          <strong>${escapeHtml(record.name)}</strong>
          <span>${escapeHtml(progressionCategoryLabels[record.category])} · ${escapeHtml(record.suitableFor.map((item) => progressionSuitableLabels[item]).join(', '))}</span>
          <small>${escapeHtml(record.description)}</small>
        </button>
      `).join('')
    : '<p class="progression-picker__empty">Nessuna progressione corrisponde ai filtri selezionati.</p>';

  const renderSelectedProgression = (): string => {
    const selected = progressionLibrary.find((record) => record.id === progressionPanelState?.selectedId);
    if (!selected) {
      return '<p class="progression-picker__empty">Seleziona una progressione per vedere l’anteprima W1-W6.</p>';
    }
    return `
      <div class="progression-picker__preview-heading">
        <div><span>Anteprima 6 settimane</span><strong>${escapeHtml(selected.name)}</strong></div>
        <button type="button" data-editor-action="apply-progression" data-day-key="${escapeHtml(progressionPanelState?.dayKey ?? '')}" data-item-key="${escapeHtml(progressionPanelState?.exerciseKey ?? '')}">Applica questa progressione</button>
      </div>
      ${renderProgressionWeekPreview(selected)}
    `;
  };

  const renderProgressionPanel = (): string => {
    const records = getProgressionMatches();
    const day = getDay(progressionPanelState?.dayKey ?? '');
    const exercise = day?.exercisesByWeek[activeWeek].find((item) => item.key === progressionPanelState?.exerciseKey);
    const classes = getExerciseClasses(getExerciseRecord(exercise?.name ?? ''));
    return `
      <section class="progression-picker" data-progression-panel>
        <header class="progression-picker__header">
          <div><span>Progression Library</span><strong>${progressionPanelState?.showAll ? 'Tutte le progressioni' : 'Compatibili con questo esercizio'}</strong></div>
          <button type="button" data-editor-action="close-progression" aria-label="Chiudi Progression Library">×</button>
        </header>
        <p class="progression-picker__compatibility">Classe: ${escapeHtml(classes.map((item) => exerciseClassLabels[item]).join(' · '))}</p>
        <label class="progression-picker__show-all"><input type="checkbox" data-progression-show-all${progressionPanelState?.showAll ? ' checked' : ''}> <span>Mostra tutte le progressioni</span></label>
        <div class="progression-picker__filters">
          <label><span>Ricerca</span><input type="search" data-progression-search value="${escapeHtml(progressionPanelState?.query ?? '')}" placeholder="Nome progressione"></label>
          <label><span>Categoria</span><select data-progression-filter="category">${renderFilterOptions(progressionCategoryOptions, progressionPanelState?.category ?? '', 'Tutte')}</select></label>
          <label><span>Adatta a</span><select data-progression-filter="suitableFor">${renderFilterOptions(progressionSuitableOptions, progressionPanelState?.suitableFor ?? '', 'Tutti')}</select></label>
        </div>
        <p class="progression-picker__count" data-progression-count>${records.length} ${records.length === 1 ? 'progressione' : 'progressioni'}</p>
        <div class="progression-picker__results" data-progression-results>${renderProgressionResults(records)}</div>
        <div class="progression-picker__preview" data-progression-preview>${renderSelectedProgression()}</div>
        <p class="progression-picker__freedom">Il preset non è un vincolo: dopo l’applicazione ogni settimana resta modificabile.</p>
      </section>
    `;
  };

  const renderTechniquePanel = (day: EditableDay, exercise: EditableExercise): string => {
    const compatibleTechniques = getCompatibleTechniques(getExerciseRecord(exercise.name));
    const selectedTechnique = trainingTechniques.find((item) => item.id === techniquePanelState?.selectedId);
    return `
      <section class="technique-picker" data-technique-panel>
        <header class="progression-picker__header">
          <div><span>Tecniche d’intensità</span><strong>Compatibili con questo esercizio</strong></div>
          <button type="button" data-editor-action="close-technique" aria-label="Chiudi tecniche">×</button>
        </header>
        <div class="technique-picker__results">
          ${compatibleTechniques.length > 0 ? compatibleTechniques.map((technique) => `
            <button class="progression-picker-result${selectedTechnique?.id === technique.id ? ' progression-picker-result--selected' : ''}" type="button" data-technique-id="${escapeHtml(technique.id)}" aria-pressed="${selectedTechnique?.id === technique.id}">
              <strong>${escapeHtml(technique.name)}</strong>
              <small>${technique.sourceProgressionIds.length} ${technique.sourceProgressionIds.length === 1 ? 'record sorgente' : 'record sorgente'}</small>
            </button>
          `).join('') : '<p class="progression-picker__empty">Nessuna tecnica compatibile classificata per questo esercizio.</p>'}
        </div>
        ${selectedTechnique ? `
          <div class="technique-picker__apply">
            <label><span>Nota facoltativa</span><textarea rows="2" data-technique-note placeholder="Indicazione del coach">${escapeHtml(techniquePanelState?.note ?? '')}</textarea></label>
            <button type="button" data-editor-action="apply-technique" data-day-key="${escapeHtml(day.key)}" data-item-key="${escapeHtml(exercise.key)}">Applica ${escapeHtml(selectedTechnique.name)}</button>
          </div>
        ` : ''}
      </section>
    `;
  };

  const renderGroupingPanel = (day: EditableDay, exercise: EditableExercise): string => `
    <section class="grouping-picker" data-grouping-panel>
      <header class="progression-picker__header">
        <div><span>Raggruppamento</span><strong>Scegli il tipo di blocco</strong></div>
        <button type="button" data-editor-action="close-grouping" aria-label="Chiudi raggruppamenti">×</button>
      </header>
      <div class="grouping-picker__options">
        ${exerciseGroupingDefinitions.map((definition) => `
          <button type="button" data-editor-action="create-group" data-group-type="${definition.type}" data-day-key="${escapeHtml(day.key)}" data-item-key="${escapeHtml(exercise.key)}">
            <strong>${escapeHtml(definition.name)}</strong>
            <span>${definition.maximumExerciseCount === definition.minimumExerciseCount ? `${definition.minimumExerciseCount} esercizi` : `minimo ${definition.minimumExerciseCount}${definition.maximumExerciseCount ? ` · massimo ${definition.maximumExerciseCount}` : ''}`}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;

  const structuredPrescriptionMarkup = (exercise: EditableExercise): string => {
    if (!exercise.structuredPrescription) return '';
    const groupLabels = {
      working: 'Working set',
      top_set: 'Top Set',
      back_off: 'Back-off',
      accessory: 'Accessory set',
    } as const;
    return `
      <div class="structured-prescription" data-structured-prescription>
        <div class="structured-prescription__heading"><strong>Prescrizione strutturata</strong><span>${exercise.realSetCount ?? exercise.structuredPrescription.setGroups.reduce((total, group) => total + group.sets, 0)} set reali</span></div>
        <dl>
          ${exercise.structuredPrescription.setGroups.map((group) => {
            const reps = group.intensity ? group.reps.replace(group.intensity, '').trim() : group.reps;
            return `<div><dt>${groupLabels[group.kind]}</dt><dd>${group.sets}×${escapeHtml(reps || group.reps)}${group.intensity ? ` ${escapeHtml(group.intensity)}` : ''}</dd></div>`;
          }).join('')}
          <div><dt>RIR / RPE</dt><dd>${escapeHtml(exercise.rir || '—')}</dd></div>
          <div><dt>Recupero</dt><dd>${escapeHtml(exercise.rest || '—')}</dd></div>
        </dl>
      </div>
    `;
  };

  const renderExerciseView = (exercise: EditableExercise, group?: EditableExerciseGroup): string => `
    <tr>
      <th scope="row">
        ${displayLabelMarkup(getExerciseDisplayLabel(exercise.name), 'exercise')}
        ${group ? `<small class="exercise-technique-label">${escapeHtml(exerciseGroupingDefinitions.find(item => item.type === group.type)?.name || group.type)}${group.rounds ? ` · ${escapeHtml(group.rounds)} giri` : ''}${group.restBetweenRounds ? ` · recupero ${escapeHtml(group.restBetweenRounds)}` : ''}${group.note ? ` · ${escapeHtml(group.note)}` : ''}</small>` : ''}
        ${exercise.progressionBase ? `<small class="exercise-progression-base">Base: ${escapeHtml(exercise.progressionBase)}</small>` : ''}
        ${exercise.techniqueName ? `<small class="exercise-technique-label">Tecnica: ${escapeHtml(exercise.techniqueName)}${exercise.techniqueNote ? ` · ${escapeHtml(exercise.techniqueNote)}` : ''}</small>` : ''}
        ${structuredPrescriptionMarkup(exercise)}
        ${exercise.note ? `<small>${escapeHtml(exercise.note).replaceAll('\n', '<br>')}</small>` : ''}
      </th>
      <td data-label="Serie">${exercise.structuredPrescription ? String(exercise.realSetCount ?? exercise.structuredPrescription.setGroups.reduce((total, group) => total + group.sets, 0)) : escapeHtml(exercise.sets)}</td>
      <td data-label="Ripetizioni">${escapeHtml(exercise.reps)}</td>
      <td data-label="RIR / RPE">${escapeHtml(exercise.rir)}</td>
      <td data-label="Recupero">${escapeHtml(exercise.rest)}</td>
    </tr>
  `;

  const renderExerciseEditor = (
    day: EditableDay,
    exercise: EditableExercise,
    exerciseIndex: number,
    exerciseCount: number,
    positionLabel?: string,
    grouped = false,
  ): string => {
    const pickerFilters = getExercisePickerFilters(exercise.key);
    resetIncompatibleExerciseFilters(pickerFilters);
    const availablePatterns = getAvailablePatternOptions(pickerFilters.muscleGroup);
    const availableEquipment = getAvailableEquipmentOptions(
      pickerFilters.muscleGroup,
      pickerFilters.pattern,
    );
    const inputId = `pt-movement-${exercise.key}`;
    const resultsId = `exercise-results-${exercise.key}`;
    return `
    <article class="exercise-editor-card" data-exercise-card="${escapeHtml(exercise.key)}">
      <header class="exercise-editor-card__header">
        <span class="exercise-editor-card__number">${escapeHtml(positionLabel ?? String(exerciseIndex + 1))}</span>
        <div class="exercise-editor-card__identity"><strong>${escapeHtml(exercise.name || 'Nuovo esercizio')}</strong>${exercise.progressionBase ? `<small>Base: ${escapeHtml(exercise.progressionBase)}</small>` : ''}${exercise.techniqueName ? `<small class="exercise-editor-card__technique">Tecnica: ${escapeHtml(exercise.techniqueName)}</small>` : ''}</div>
        <div class="exercise-editor-card__mini-actions">
          <span class="exercise-editor-card__state">Locale</span>
          <button type="button" title="Sposta su" data-editor-action="move-exercise-up" data-day-key="${day.key}" data-item-key="${exercise.key}" aria-label="Sposta ${escapeHtml(exercise.name || 'esercizio')} in alto"${exerciseIndex === 0 ? ' disabled' : ''}>↑</button>
          <button type="button" title="Sposta giù" data-editor-action="move-exercise-down" data-day-key="${day.key}" data-item-key="${exercise.key}" aria-label="Sposta ${escapeHtml(exercise.name || 'esercizio')} in basso"${exerciseIndex === exerciseCount - 1 ? ' disabled' : ''}>↓</button>
          <button type="button" title="Duplica" data-editor-action="duplicate-exercise" data-day-key="${day.key}" data-item-key="${exercise.key}" aria-label="Duplica ${escapeHtml(exercise.name || 'esercizio')}">Duplica</button>
          <button type="button" title="Rimuovi" data-editor-action="remove-exercise" data-day-key="${day.key}" data-item-key="${exercise.key}" aria-label="Rimuovi ${escapeHtml(exercise.name || 'esercizio')}">×</button>
        </div>
      </header>
      <div class="exercise-editor-card__body">
        <div class="exercise-editor-card__fields">
          <div class="exercise-editor-field exercise-editor-field--name exercise-picker" data-exercise-picker="${escapeHtml(exercise.key)}">
            <label for="${escapeHtml(inputId)}">Esercizio</label>
            <input id="${escapeHtml(inputId)}" data-editor-field="exercise" data-field="name" data-day-key="${day.key}" data-item-key="${exercise.key}" data-exercise-library-input value="${escapeHtml(exercise.name)}" placeholder="Cerca nella Library o scrivi un nome libero" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${escapeHtml(resultsId)}">
            <div class="exercise-picker__panel" data-exercise-picker-panel hidden>
              <div class="exercise-picker__filters" aria-label="Filtri Exercise Library">
                <label><span>Gruppo muscolare</span><select data-exercise-picker-filter="muscleGroup" data-item-key="${exercise.key}">${renderFilterOptions(muscleFilterOptions, pickerFilters.muscleGroup, 'Tutti')}</select></label>
                <label><span>Pattern</span><select data-exercise-picker-filter="pattern" data-item-key="${exercise.key}">${renderFilterOptions(availablePatterns, pickerFilters.pattern, 'Tutti')}</select></label>
                <label><span>Attrezzatura</span><select data-exercise-picker-filter="equipment" data-item-key="${exercise.key}">${renderFilterOptions(availableEquipment, pickerFilters.equipment, 'Tutte')}</select></label>
              </div>
              <div class="exercise-picker__summary">
                <span data-exercise-picker-count></span>
                <span data-exercise-picker-status></span>
              </div>
              <div class="exercise-picker__results" id="${escapeHtml(resultsId)}" data-exercise-picker-results role="listbox" aria-label="Risultati Exercise Library"></div>
              <p class="exercise-picker__freedom">Puoi sempre mantenere o scrivere un nome libero.</p>
            </div>
          </div>
          ${structuredPrescriptionMarkup(exercise)}
          ${exercise.structuredPrescription ? '<p class="structured-prescription__notice">Serie e ripetizioni appartengono alla struttura. Per cambiarle, converti esplicitamente questa settimana in prescrizione manuale.</p>' : ''}
          <label class="exercise-editor-field"><span>Serie</span><input data-editor-field="exercise" data-field="sets" data-day-key="${day.key}" data-item-key="${exercise.key}" value="${escapeHtml(exercise.sets)}" inputmode="numeric"${exercise.structuredPrescription ? ' readonly aria-readonly="true"' : ''}></label>
          <label class="exercise-editor-field"><span>Ripetizioni</span><input data-editor-field="exercise" data-field="reps" data-day-key="${day.key}" data-item-key="${exercise.key}" value="${escapeHtml(exercise.reps)}"${exercise.structuredPrescription ? ' readonly aria-readonly="true"' : ''}></label>
          <label class="exercise-editor-field"><span>RIR / RPE</span><input data-editor-field="exercise" data-field="rir" data-day-key="${day.key}" data-item-key="${exercise.key}" value="${escapeHtml(exercise.rir)}"></label>
          <label class="exercise-editor-field"><span>Recupero</span><input data-editor-field="exercise" data-field="rest" data-day-key="${day.key}" data-item-key="${exercise.key}" value="${escapeHtml(exercise.rest)}"></label>
          <label class="exercise-editor-field exercise-editor-field--note"><span>Nota</span><textarea data-editor-field="exercise" data-field="note" data-day-key="${day.key}" data-item-key="${exercise.key}" rows="1">${escapeHtml(exercise.note)}</textarea></label>
          ${exercise.techniqueName ? `<label class="exercise-editor-field exercise-editor-field--note"><span>Nota tecnica · ${escapeHtml(exercise.techniqueName)}</span><textarea data-editor-field="exercise" data-field="techniqueNote" data-day-key="${day.key}" data-item-key="${exercise.key}" rows="2" placeholder="Nota facoltativa">${escapeHtml(exercise.techniqueNote)}</textarea></label>` : ''}
        </div>
        <div class="exercise-editor-card__apply-actions">
          ${exercise.structuredPrescription ? `<button type="button" data-editor-action="convert-structured-to-manual" data-day-key="${day.key}" data-item-key="${exercise.key}">Converti in manuale</button>` : ''}
          <button class="exercise-editor-card__apply" type="button" data-editor-action="apply-future" data-day-key="${day.key}" data-item-key="${exercise.key}"${activeWeek === programWeeks.at(-1) ? ' disabled' : ''}>Applica alle settimane successive</button>
          <button class="exercise-editor-card__progression" type="button" data-editor-action="open-progression" data-day-key="${day.key}" data-item-key="${exercise.key}">Applica progressione</button>
          <button type="button" data-editor-action="open-technique" data-day-key="${day.key}" data-item-key="${exercise.key}">Tecnica</button>
          ${exercise.techniqueName ? `<button type="button" data-editor-action="remove-technique" data-day-key="${day.key}" data-item-key="${exercise.key}">Rimuovi tecnica</button>` : ''}
          ${grouped ? '' : `<button type="button" data-editor-action="open-grouping" data-day-key="${day.key}" data-item-key="${exercise.key}">Raggruppa esercizi</button>`}
        </div>
        ${progressionPanelState?.dayKey === day.key && progressionPanelState.exerciseKey === exercise.key ? renderProgressionPanel() : ''}
        ${techniquePanelState?.dayKey === day.key && techniquePanelState.exerciseKey === exercise.key ? renderTechniquePanel(day, exercise) : ''}
        ${groupingPanelState?.dayKey === day.key && groupingPanelState.exerciseKey === exercise.key ? renderGroupingPanel(day, exercise) : ''}
      </div>
    </article>
  `;
  };

  const renderExerciseGroup = (
    day: EditableDay,
    group: EditableExerciseGroup,
    exercises: EditableExercise[],
    groupIndex: number,
  ): string => {
    const definition = exerciseGroupingDefinitions.find((item) => item.type === group.type);
    const groupExercises = group.exerciseKeys
      .map((key) => exercises.find((exercise) => exercise.key === key))
      .filter((exercise): exercise is EditableExercise => Boolean(exercise));
    const groupLetter = String.fromCharCode(65 + groupIndex);
    const canAdd = definition?.maximumExerciseCount === undefined || groupExercises.length < definition.maximumExerciseCount;
    return `
      <section class="exercise-group-card" data-exercise-group="${escapeHtml(group.key)}">
        <header class="exercise-group-card__header">
          <div><span>Blocco ${groupLetter}</span><strong>${escapeHtml(definition?.name ?? group.type)}</strong></div>
          <div><span>${groupExercises.length} esercizi</span><button type="button" data-editor-action="break-group" data-day-key="${escapeHtml(day.key)}" data-group-key="${escapeHtml(group.key)}">Rompi gruppo</button></div>
        </header>
        <div class="exercise-group-card__settings">
          <label><span>Numero round</span><input data-editor-field="group" data-field="rounds" data-day-key="${escapeHtml(day.key)}" data-group-key="${escapeHtml(group.key)}" value="${escapeHtml(group.rounds)}"></label>
          <label><span>Recupero tra round</span><input data-editor-field="group" data-field="restBetweenRounds" data-day-key="${escapeHtml(day.key)}" data-group-key="${escapeHtml(group.key)}" value="${escapeHtml(group.restBetweenRounds)}"></label>
          <label class="exercise-group-card__note"><span>Nota</span><input data-editor-field="group" data-field="note" data-day-key="${escapeHtml(day.key)}" data-group-key="${escapeHtml(group.key)}" value="${escapeHtml(group.note)}"></label>
        </div>
        <div class="exercise-group-card__exercises">
          ${groupExercises.map((exercise, index) => renderExerciseEditor(
            day,
            exercise,
            exercises.indexOf(exercise),
            exercises.length,
            `${groupLetter}${index + 1}`,
            true,
          )).join('')}
        </div>
        ${canAdd ? `<button class="editor-add-action" type="button" data-editor-action="add-group-exercise" data-day-key="${escapeHtml(day.key)}" data-group-key="${escapeHtml(group.key)}">+ Aggiungi esercizio al gruppo</button>` : ''}
      </section>
    `;
  };

  const renderExerciseEditorList = (day: EditableDay, exercises: EditableExercise[]): string => {
    const groups = day.groupsByWeek[activeWeek];
    const renderedGroups = new Set<string>();
    return exercises.map((exercise, exerciseIndex) => {
      const group = groups.find((item) => item.exerciseKeys.includes(exercise.key));
      if (!group) return renderExerciseEditor(day, exercise, exerciseIndex, exercises.length);
      if (renderedGroups.has(group.key)) return '';
      renderedGroups.add(group.key);
      return renderExerciseGroup(day, group, exercises, groups.indexOf(group));
    }).join('');
  };

  const refreshProgressionPanel = (): void => {
    const panel = root.querySelector<HTMLElement>('[data-progression-panel]');
    if (!panel || !progressionPanelState) return;
    const records = getProgressionMatches();
    const count = panel.querySelector<HTMLElement>('[data-progression-count]');
    const results = panel.querySelector<HTMLElement>('[data-progression-results]');
    const preview = panel.querySelector<HTMLElement>('[data-progression-preview]');
    if (count) count.textContent = `${records.length} ${records.length === 1 ? 'progressione' : 'progressioni'}`;
    if (results) results.innerHTML = renderProgressionResults(records);
    if (preview) preview.innerHTML = renderSelectedProgression();
  };

  const closeExercisePicker = (picker: HTMLElement): void => {
    const panel = picker.querySelector<HTMLElement>('[data-exercise-picker-panel]');
    const input = picker.querySelector<HTMLInputElement>('[data-exercise-library-input]');
    if (panel) panel.hidden = true;
    input?.setAttribute('aria-expanded', 'false');
  };

  const closeOtherExercisePickers = (activePicker?: HTMLElement): void => {
    root.querySelectorAll<HTMLElement>('[data-exercise-picker]').forEach((picker) => {
      if (picker !== activePicker) closeExercisePicker(picker);
    });
  };

  const renderExercisePickerResults = (input: HTMLInputElement): void => {
    const picker = input.closest<HTMLElement>('[data-exercise-picker]');
    const exerciseKey = input.dataset.itemKey ?? '';
    if (!picker || !exerciseKey) return;
    const panel = picker.querySelector<HTMLElement>('[data-exercise-picker-panel]');
    const count = picker.querySelector<HTMLElement>('[data-exercise-picker-count]');
    const status = picker.querySelector<HTMLElement>('[data-exercise-picker-status]');
    const results = picker.querySelector<HTMLElement>('[data-exercise-picker-results]');
    const muscleSelect = picker.querySelector<HTMLSelectElement>('[data-exercise-picker-filter="muscleGroup"]');
    const patternSelect = picker.querySelector<HTMLSelectElement>('[data-exercise-picker-filter="pattern"]');
    const equipmentSelect = picker.querySelector<HTMLSelectElement>('[data-exercise-picker-filter="equipment"]');
    if (!panel || !count || !status || !results || !muscleSelect || !patternSelect || !equipmentSelect) return;

    const filters = getExercisePickerFilters(exerciseKey);
    resetIncompatibleExerciseFilters(filters);
    const availablePatterns = getAvailablePatternOptions(filters.muscleGroup);
    const availableEquipment = getAvailableEquipmentOptions(filters.muscleGroup, filters.pattern);
    muscleSelect.innerHTML = renderFilterOptions(muscleFilterOptions, filters.muscleGroup, 'Tutti');
    patternSelect.innerHTML = renderFilterOptions(availablePatterns, filters.pattern, 'Tutti');
    equipmentSelect.innerHTML = renderFilterOptions(availableEquipment, filters.equipment, 'Tutte');

    const matches = getExerciseMatches(exercisePickerQueries.get(exerciseKey) ?? '', filters);
    const visibleMatches = matches.slice(0, exercisePickerResultLimit);
    const normalizedValue = normalizeExerciseSearch(input.value);
    const isLibraryExercise = normalizedValue.length > 0 && exerciseLibrary.some((record) =>
      [record.name, ...record.aliases].some((value) => normalizeExerciseSearch(value) === normalizedValue),
    );

    count.textContent = matches.length > visibleMatches.length
      ? `${visibleMatches.length} di ${matches.length} risultati`
      : `${matches.length} ${matches.length === 1 ? 'risultato' : 'risultati'}`;
    status.textContent = normalizedValue && !isLibraryExercise ? 'Esercizio personalizzato' : '';
    results.innerHTML = visibleMatches.length > 0
      ? visibleMatches.map((record) => `
          <button class="exercise-picker-result" type="button" data-exercise-library-id="${escapeHtml(record.id)}" data-day-key="${escapeHtml(input.dataset.dayKey ?? '')}" data-item-key="${escapeHtml(exerciseKey)}" role="option">
            <strong>${escapeHtml(record.name)}</strong>
            <span>${escapeHtml(patternLabels[record.pattern])} · ${escapeHtml(muscleLabels[record.primaryMuscleGroup])} · ${escapeHtml(record.equipment.map((item) => equipmentLabels[item]).join(', '))}</span>
          </button>
        `).join('')
      : `
          <p class="exercise-picker__empty">
            <strong>Nessun esercizio della Library corrisponde ai filtri selezionati.</strong>
            <span>Puoi modificare i filtri oppure inserire liberamente il nome dell'esercizio.</span>
          </p>
        `;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const selectLibraryExercise = (libraryResult: HTMLButtonElement): void => {
    const record = exerciseLibrary.find((item) => item.id === libraryResult.dataset.exerciseLibraryId);
    const day = getDay(libraryResult.dataset.dayKey ?? '');
    const exercise = day?.exercisesByWeek[activeWeek].find((item) => item.key === libraryResult.dataset.itemKey);
    const picker = libraryResult.closest<HTMLElement>('[data-exercise-picker]');
    const input = picker?.querySelector<HTMLInputElement>('[data-exercise-library-input]');
    if (!record || !exercise || !picker || !input) return;

    exercise.name = record.name;
    exercise.canonicalExerciseId = record.id;
    input.value = record.name;
    exercisePickerQueries.set(exercise.key, '');
    const heading = input.closest<HTMLElement>('[data-exercise-card]')?.querySelector<HTMLElement>('.exercise-editor-card__header > strong');
    if (heading) heading.textContent = record.name;
    markDirty();
    input.focus();
    closeExercisePicker(picker);
  };

  const renderPreparationEditor = (day: EditableDay): string => `
    <p class="editor-guidance">Indicazione NEACEA: preparation essenziale, generalmente massimo 2 esercizi.</p>
    <div class="support-editor-list">
      ${day.preparation.map((item, index) => `
        <article class="support-editor-card">
          <div class="support-editor-card__heading"><strong>Preparation ${index + 1}</strong><button type="button" data-editor-action="remove-preparation" data-day-key="${day.key}" data-item-key="${item.key}">Rimuovi</button></div>
          <div class="support-editor-grid support-editor-grid--preparation">
            <label><span>Esercizio</span><input data-editor-field="preparation" data-field="name" data-day-key="${day.key}" data-item-key="${item.key}" value="${escapeHtml(item.name)}"></label>
            <label><span>Serie / reps</span><input data-editor-field="preparation" data-field="setsReps" data-day-key="${day.key}" data-item-key="${item.key}" value="${escapeHtml(item.setsReps)}"></label>
            <label class="support-editor-grid__wide"><span>Cue</span><textarea rows="2" data-editor-field="preparation" data-field="cue" data-day-key="${day.key}" data-item-key="${item.key}">${escapeHtml(item.cue)}</textarea></label>
          </div>
        </article>
      `).join('')}
      ${day.preparation.length === 0 ? '<p class="editor-empty-state">Nessun esercizio di preparation.</p>' : ''}
      <button class="editor-add-action" type="button" data-editor-action="add-preparation" data-day-key="${day.key}">+ Aggiungi esercizio</button>
    </div>
  `;

  const renderRampUpEditor = (day: EditableDay): string => `
    <div class="support-editor-list">
      ${day.rampUp.map((item, rampIndex) => `
        <article class="support-editor-card">
          <div class="support-editor-card__heading"><strong>Ramp-up ${rampIndex + 1}</strong><button type="button" data-editor-action="remove-ramp" data-day-key="${day.key}" data-item-key="${item.key}">Rimuovi ramp-up</button></div>
          <label class="support-editor-single"><span>Esercizio</span><input data-editor-field="ramp" data-field="exercise" data-day-key="${day.key}" data-item-key="${item.key}" value="${escapeHtml(item.exercise)}"></label>
          <div class="ramp-step-editor-list">
            ${item.steps.map((step, stepIndex) => `
              <label class="ramp-step-editor"><span>Serie ${stepIndex + 1}</span><input data-editor-field="ramp-step" data-day-key="${day.key}" data-item-key="${item.key}" data-step-index="${stepIndex}" value="${escapeHtml(step)}"><button type="button" data-editor-action="remove-ramp-step" data-day-key="${day.key}" data-item-key="${item.key}" data-step-index="${stepIndex}" aria-label="Elimina serie di avvicinamento ${stepIndex + 1}">−</button></label>
            `).join('')}
            ${item.steps.length === 0 ? '<p class="editor-empty-state">Nessuna serie di avvicinamento.</p>' : ''}
          </div>
          <button class="editor-add-action" type="button" data-editor-action="add-ramp-step" data-day-key="${day.key}" data-item-key="${item.key}">+ Aggiungi serie</button>
        </article>
      `).join('')}
      ${day.rampUp.length === 0 ? '<p class="editor-empty-state">Nessun ramp-up configurato.</p>' : ''}
      <button class="editor-add-action" type="button" data-editor-action="add-ramp" data-day-key="${day.key}">+ Aggiungi ramp-up</button>
    </div>
  `;

  const renderDay = (day: EditableDay): string => {
    const exercises = day.exercisesByWeek[activeWeek];
    return `
      <article class="program-day${editing ? ' program-day--editing' : ''}">
        <header class="program-day__header">
          <span>${escapeHtml(day.letter)}</span>
          <div class="program-day__identity">
            <p>Sessione ${escapeHtml(day.letter)} · Settimana ${activeWeek}</p>
            ${editing ? `<label><span>Nome seduta</span><input data-editor-field="day" data-field="name" data-day-key="${day.key}" value="${escapeHtml(day.name)}"></label>` : `<h2>${escapeHtml(day.name)}</h2>`}
          </div>
        </header>
        <details class="session-disclosure" data-editor-disclosure="warmup-${day.key}"${disclosureOpen(`warmup-${day.key}`)}>
          <summary>${displayLabelMarkup(sessionStructureDisplayLabels.generalWarmup, 'section')}</summary>
          <div class="session-disclosure__content">
            ${editing ? `<label class="support-editor-single"><span>Indicazioni</span><textarea rows="4" data-editor-field="day" data-field="generalWarmup" data-day-key="${day.key}" placeholder="Una indicazione per riga">${escapeHtml(day.generalWarmup.join('\n'))}</textarea></label>` : `<ul>${visibleLines(day.generalWarmup).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`}
          </div>
        </details>
        ${!editing ? `
        <details class="session-disclosure session-disclosure--preparation" data-editor-disclosure="preparation-${day.key}"${disclosureOpen(`preparation-${day.key}`)}>
          <summary>${displayLabelMarkup(sessionStructureDisplayLabels.movementPreparation, 'section')}</summary>
          <div class="session-disclosure__content">
            ${editing ? renderPreparationEditor(day) : `<p class="preparation-meta">${day.preparation.length} ${day.preparation.length === 1 ? 'esercizio' : 'esercizi'}</p><ul class="preparation-list">${day.preparation.map((item) => `<li><div><strong>${displayLabelMarkup(getExerciseDisplayLabel(item.name), 'exercise')}</strong><span class="preparation-prescription">${escapeHtml(item.setsReps)}</span></div><p>${escapeHtml(item.cue)}</p></li>`).join('')}</ul>`}
          </div>
        </details>
        <details class="session-disclosure" data-editor-disclosure="ramp-${day.key}"${disclosureOpen(`ramp-${day.key}`)}>
          <summary>${displayLabelMarkup(sessionStructureDisplayLabels.rampUp, 'section')}</summary>
          <div class="session-disclosure__content">
            ${editing ? renderRampUpEditor(day) : `<div class="rampup-list">${day.rampUp.map((item) => `<article><h4>${displayLabelMarkup(getExerciseDisplayLabel(item.exercise), 'exercise')}</h4><ol>${item.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p>Poi ${displayLabelMarkup(sessionStructureDisplayLabels.workingSets, 'compact')}</p></article>`).join('')}</div>`}
          </div>
        </details>
        ` : ''}
        <div class="session-block session-block--workout">
          <h3>${displayLabelMarkup(sessionStructureDisplayLabels.workingSets, 'section')}</h3>
          ${editing ? `<div class="exercise-editor-list">${renderExerciseEditorList(day, exercises)}${exercises.length === 0 ? '<p class="editor-empty-state">Nessun esercizio in questa seduta.</p>' : ''}<button class="editor-add-action" type="button" data-editor-action="add-exercise" data-day-key="${day.key}">+ Aggiungi esercizio</button></div>` : `<div class="exercise-table-wrap"><table class="exercise-table"><thead><tr><th scope="col">Esercizio</th><th scope="col">Serie</th><th scope="col">Ripetizioni</th><th scope="col">RIR / RPE</th><th scope="col">Recupero</th></tr></thead><tbody>${exercises.map(exercise => renderExerciseView(exercise, day.groupsByWeek[activeWeek]?.find(group => group.exerciseKeys.includes(exercise.key)))).join('')}</tbody></table></div>`}
        </div>
        <details class="session-disclosure" data-editor-disclosure="notes-${day.key}"${disclosureOpen(`notes-${day.key}`)}>
          <summary>Note della seduta</summary>
          <div class="session-disclosure__content">${editing ? `<label class="support-editor-single"><span>Note</span><textarea rows="4" data-editor-field="day" data-field="notes" data-day-key="${day.key}" placeholder="Una nota per riga">${escapeHtml(day.notes.join('\n'))}</textarea></label>` : `<ul>${visibleLines(day.notes).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`}</div>
        </details>
      </article>
    `;
  };

  const render = (): void => {
    const restoreScroll = rememberEditorScroll(root);
    exercisePickerQueries.clear();
    const activeDay = getDay(activeDayKey) ?? program.days[0];
    if (activeDay) activeDayKey = activeDay.key;
    root.classList.toggle('manual-program-editor--active', editing);
    root.innerHTML = `
      <div class="program-editor-toolbar">
        <div><p class="eyebrow">Editor programma</p><strong data-editor-toolbar-state>${dirty || editing ? 'Modifiche alla scheda' : 'Il coach mantiene il controllo finale'}</strong></div>
        <div class="program-editor-toolbar__actions">
          <span class="program-editor-future-action"><button type="button" disabled aria-describedby="brain-placeholder-help" title="Disponibile in una fase successiva.">Consulta Cervello</button><small id="brain-placeholder-help">Disponibile in una fase successiva.</small></span>
          ${editing ? '<button class="program-editor-toolbar__danger" type="button" data-editor-action="clear-program">Svuota programma</button><button type="button" data-editor-action="reset-program">Ripristina programma</button>' : ''}
          ${readOnly ? '<span class="program-editor-readonly">Sola lettura</span>' : `<button class="program-editor-toolbar__primary" type="button" data-editor-action="toggle-edit">${editing ? 'Termina modifica' : 'Modifica programma'}</button>`}
        </div>
      </div>
      <p class="program-editor-local-state" data-editor-local-state role="status"${dirty ? '' : ' hidden'}>Modifiche alla scheda</p>
      ${editing ? `<div class="program-editor-sheet-toolbar"><div class="program-editor-tabs" aria-label="Sedute">${program.days.map((day) => `<button class="program-editor-tab${day.key === activeDayKey ? ' program-editor-tab--active' : ''}" type="button" data-editor-action="select-day" data-day-key="${day.key}" aria-pressed="${day.key === activeDayKey}">Allenamento ${escapeHtml(day.letter)}</button>`).join('')}</div><div class="program-editor-sheet-actions">${activeDay ? `<button type="button" data-editor-action="add-day"${program.days.length >= 6 ? ' disabled' : ''}>+ Aggiungi seduta</button><button class="program-editor-sheet-actions__danger" type="button" data-editor-action="remove-day" data-day-key="${activeDayKey}">Elimina seduta</button><button class="program-editor-sheet-actions__primary" type="button" data-editor-action="add-exercise" data-day-key="${activeDayKey}">+ Aggiungi esercizio</button>` : ''}</div></div>` : ''}
      ${program.days.length === 0
        ? `<div class="program-editor-empty"><strong>Nessuna seduta presente.</strong>${editing ? '<button type="button" data-editor-action="add-day">+ Aggiungi seduta</button>' : ''}</div>`
        : `<div class="program-days">${(editing ? (activeDay ? [activeDay] : []) : program.days).map(renderDay).join('')}</div>`}
    `;
    disableContactAutofill(root);
    restoreScroll();
  };

  const updateEditableField = (target: HTMLInputElement | HTMLTextAreaElement): void => {
    const day = getDay(target.dataset.dayKey ?? '');
    if (!day) return;
    const kind = target.dataset.editorField;

    if (kind === 'day') {
      if (target.dataset.field === 'name') day.name = target.value;
      if (target.dataset.field === 'generalWarmup') day.generalWarmup = target.value.split('\n');
      if (target.dataset.field === 'notes') day.notes = target.value.split('\n');
      markDirty();
      return;
    }
    if (kind === 'exercise') {
      const item = day.exercisesByWeek[activeWeek].find((entry) => entry.key === target.dataset.itemKey);
      const field = target.dataset.field as keyof Pick<EditableExercise,
        'name' | 'sets' | 'reps' | 'rir' | 'rest' | 'note' | 'progressionBase' |
        'techniqueId' | 'techniqueName' | 'techniqueNote'> | undefined;
      if (item && field) {
        item[field] = target.value;
        if (field === 'sets') item.realSetCount = parseEditableSetCount(target.value);
        if (field === 'name') item.canonicalExerciseId = getExerciseRecord(target.value)?.id;
        markDirty();
      }
      return;
    }
    if (kind === 'group') {
      const group = day.groupsByWeek[activeWeek].find((entry) => entry.key === target.dataset.groupKey);
      const field = target.dataset.field as keyof Pick<EditableExerciseGroup, 'rounds' | 'restBetweenRounds' | 'note'> | undefined;
      if (group && field) {
        group[field] = target.value;
        markDirty();
      }
      return;
    }
    if (kind === 'preparation') {
      const item = day.preparation.find((entry) => entry.key === target.dataset.itemKey);
      const field = target.dataset.field as keyof Omit<EditablePreparation, 'key'> | undefined;
      if (item && field) {
        item[field] = target.value;
        markDirty();
      }
      return;
    }
    if (kind === 'ramp') {
      const item = day.rampUp.find((entry) => entry.key === target.dataset.itemKey);
      if (item && target.dataset.field === 'exercise') {
        item.exercise = target.value;
        markDirty();
      }
      return;
    }
    if (kind === 'ramp-step') {
      const item = day.rampUp.find((entry) => entry.key === target.dataset.itemKey);
      const stepIndex = Number(target.dataset.stepIndex);
      if (item && Number.isInteger(stepIndex) && item.steps[stepIndex] !== undefined) {
        item.steps[stepIndex] = target.value;
        markDirty();
      }
    }
  };

  root.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.dataset.editorDisclosure) return;
    if (details.open) openDisclosures.add(details.dataset.editorDisclosure);
    else openDisclosures.delete(details.dataset.editorDisclosure);
  }, true);

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (editing && target instanceof HTMLTextAreaElement && target.hasAttribute('data-technique-note')) {
      if (techniquePanelState) techniquePanelState.note = target.value;
      return;
    }
    if (editing && target instanceof HTMLInputElement && target.hasAttribute('data-progression-search')) {
      if (progressionPanelState) {
        progressionPanelState.query = target.value;
        refreshProgressionPanel();
      }
      return;
    }
    if (editing && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && target.dataset.editorField) {
      updateEditableField(target);
      if (target instanceof HTMLInputElement && target.hasAttribute('data-exercise-library-input')) {
        exercisePickerQueries.set(target.dataset.itemKey ?? '', target.value);
        const heading = target.closest<HTMLElement>('[data-exercise-card]')?.querySelector<HTMLElement>('.exercise-editor-card__identity > strong');
        if (heading) heading.textContent = target.value || 'Nuovo esercizio';
        renderExercisePickerResults(target);
      }
    }
  });

  root.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!editing || !(target instanceof HTMLInputElement) || !target.hasAttribute('data-exercise-library-input')) return;
    const picker = target.closest<HTMLElement>('[data-exercise-picker]');
    if (!picker) return;
    if (!exercisePickerQueries.has(target.dataset.itemKey ?? '')) {
      exercisePickerQueries.set(target.dataset.itemKey ?? '', '');
    }
    closeOtherExercisePickers(picker);
    renderExercisePickerResults(target);
  });

  root.addEventListener('focusout', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const picker = target.closest<HTMLElement>('[data-exercise-picker]');
    const nextTarget = event.relatedTarget;
    if (!picker || nextTarget === null || (nextTarget instanceof Node && picker.contains(nextTarget))) return;
    closeExercisePicker(picker);
  });

  root.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.hasAttribute('data-exercise-library-input')) return;
    const picker = target.closest<HTMLElement>('[data-exercise-picker]');
    if (!picker) return;
    if (event.key === 'Escape') {
      closeExercisePicker(picker);
      return;
    }
    if (event.key === 'ArrowDown') {
      const firstResult = picker.querySelector<HTMLButtonElement>('[data-exercise-library-id]');
      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }
  });

  root.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.hasAttribute('data-progression-show-all') && progressionPanelState) {
      progressionPanelState.showAll = target.checked;
      progressionPanelState.selectedId = '';
      render();
      root.querySelector<HTMLInputElement>('[data-progression-show-all]')?.focus();
      return;
    }
    if (target instanceof HTMLSelectElement && target.dataset.progressionFilter && progressionPanelState) {
      if (target.dataset.progressionFilter === 'category') {
        progressionPanelState.category = target.value as ProgressionCategory | '';
      }
      if (target.dataset.progressionFilter === 'suitableFor') {
        progressionPanelState.suitableFor = target.value as ProgressionSuitableFor | '';
      }
      refreshProgressionPanel();
      return;
    }
    if (!(target instanceof HTMLSelectElement) || !target.dataset.exercisePickerFilter) return;
    const exerciseKey = target.dataset.itemKey ?? '';
    const filters = getExercisePickerFilters(exerciseKey);
    if (target.dataset.exercisePickerFilter === 'muscleGroup') {
      filters.muscleGroup = target.value as ExerciseMuscleGroup | '';
    }
    if (target.dataset.exercisePickerFilter === 'pattern') {
      filters.pattern = target.value as ExercisePattern | '';
    }
    if (target.dataset.exercisePickerFilter === 'equipment') {
      filters.equipment = target.value as ExerciseEquipment | '';
    }
    resetIncompatibleExerciseFilters(filters);
    const input = target.closest<HTMLElement>('[data-exercise-picker]')?.querySelector<HTMLInputElement>('[data-exercise-library-input]');
    if (input) renderExercisePickerResults(input);
  });

  root.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest<HTMLButtonElement>('[data-editor-action="open-progression"], [data-editor-action="open-technique"], [data-editor-action="open-grouping"]')) {
      // Mantiene stabile il layout mentre il picker esercizi aperto viene chiuso dal click.
      event.preventDefault();
      return;
    }
    const libraryResult = target.closest<HTMLButtonElement>('[data-exercise-library-id]');
    if (!libraryResult) return;
    event.preventDefault();
    selectLibraryExercise(libraryResult);
  });

  root.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const picker = target.closest<HTMLElement>('[data-exercise-picker]');
    closeOtherExercisePickers(picker ?? undefined);

    const libraryInput = target.closest<HTMLInputElement>('[data-exercise-library-input]');
    const libraryPanel = picker?.querySelector<HTMLElement>('[data-exercise-picker-panel]');
    if (libraryInput && libraryPanel?.hidden) {
      exercisePickerQueries.set(libraryInput.dataset.itemKey ?? '', '');
      renderExercisePickerResults(libraryInput);
      return;
    }

    const progressionResult = target.closest<HTMLButtonElement>('[data-progression-library-id]');
    if (progressionResult && progressionPanelState) {
      progressionPanelState.selectedId = progressionResult.dataset.progressionLibraryId ?? '';
      refreshProgressionPanel();
      return;
    }

    const techniqueResult = target.closest<HTMLButtonElement>('[data-technique-id]');
    if (techniqueResult && techniquePanelState) {
      techniquePanelState.selectedId = techniqueResult.dataset.techniqueId ?? '';
      render();
      return;
    }

    const libraryResult = target.closest<HTMLButtonElement>('[data-exercise-library-id]');
    if (libraryResult) {
      if (event.detail === 0) selectLibraryExercise(libraryResult);
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-editor-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.editorAction;

    if (action === 'toggle-edit') {
      if (readOnly) return;
      editing = !editing;
      onEditingChange?.(editing);
      render();
      return;
    }
    if (action === 'reset-program') {
      if (await requestConfirmation('Ripristinare il programma originale? Tutte le modifiche locali verranno perse.')) {
        program = structuredClone(sourceSnapshot);
        activeDayKey = program.days[0]?.key ?? '';
        nextDayLetterIndex = program.days.reduce(
          (nextIndex, day) => Math.max(nextIndex, dayLetters.indexOf(day.letter as typeof dayLetters[number]) + 1),
          0,
        );
        dirty = false;
        onDirtyChange?.(false);
        openDisclosures.clear();
        exercisePickerFilters.clear();
        exercisePickerQueries.clear();
        progressionPanelState = null;
        techniquePanelState = null;
        groupingPanelState = null;
        render();
      }
      return;
    }
    if (action === 'clear-program') {
      if (await requestConfirmation('Svuotare il programma? Tutte le sedute e il loro contenuto verranno eliminate.')) {
        program.days = [];
        activeDayKey = '';
        nextDayLetterIndex = 0;
        dirty = true;
        openDisclosures.clear();
        exercisePickerFilters.clear();
        exercisePickerQueries.clear();
        progressionPanelState = null;
        techniquePanelState = null;
        groupingPanelState = null;
        render();
      }
      return;
    }
    if (action === 'close-progression') {
      progressionPanelState = null;
      render();
      return;
    }
    if (action === 'close-technique') {
      techniquePanelState = null;
      render();
      return;
    }
    if (action === 'close-grouping') {
      groupingPanelState = null;
      render();
      return;
    }
    if (!editing || readOnly) return;
    if (action === 'select-day') {
      activeDayKey = button.dataset.dayKey ?? activeDayKey;
      progressionPanelState = null;
      techniquePanelState = null;
      groupingPanelState = null;
      render();
      return;
    }
    if (action === 'add-day') {
      if (program.days.length >= 6) return;
      const usedLetters = new Set(program.days.map((day) => day.letter));
      const letter = dayLetters[nextDayLetterIndex] ?? dayLetters.find((candidate) => !usedLetters.has(candidate));
      if (!letter) return;
      nextDayLetterIndex = Math.max(nextDayLetterIndex + 1, dayLetters.indexOf(letter) + 1);
      const day: EditableDay = {
        key: nextKey('day'), letter, name: `Allenamento ${letter}`, generalWarmup: [], preparation: [], rampUp: [],
        exercisesByWeek: programWeeks.reduce((weeks, week) => {
          weeks[week] = [];
          return weeks;
        }, {} as Record<ProgramWeek, EditableExercise[]>),
        groupsByWeek: programWeeks.reduce((weeks, week) => {
          weeks[week] = [];
          return weeks;
        }, {} as Record<ProgramWeek, EditableExerciseGroup[]>),
        notes: [],
      };
      program.days.push(day);
      activeDayKey = day.key;
      markDirty();
      render();
      return;
    }
    if (action === 'remove-day') {
      const dayIndex = program.days.findIndex((day) => day.key === button.dataset.dayKey);
      if (dayIndex >= 0 && await requestConfirmation(`Eliminare l'allenamento ${program.days[dayIndex].letter} con tutto il suo contenuto?`)) {
        program.days.splice(dayIndex, 1);
        if (program.days.length === 0) nextDayLetterIndex = 0;
        activeDayKey = program.days[Math.min(dayIndex, program.days.length - 1)]?.key ?? '';
        markDirty();
        render();
      }
      return;
    }

    const day = getDay(button.dataset.dayKey ?? '');
    if (!day) return;
    const exercises = day.exercisesByWeek[activeWeek];
    const exerciseIndex = exercises.findIndex((item) => item.key === button.dataset.itemKey);
    const groups = day.groupsByWeek[activeWeek];

    if (action === 'add-exercise') {
      exercises.push({ key: nextKey('exercise'), name: '', sets: '', reps: '', rir: '', rest: '', note: '', progressionBase: '', techniqueId: '', techniqueName: '', techniqueNote: '', realSetCount: 0, prescriptionMode: 'manual' });
      markDirty();
      render();
      const input = root.querySelector<HTMLInputElement>(`[data-exercise-library-input][data-item-key="${exercises.at(-1)?.key}"]`);
      input?.focus({preventScroll:true});
      input?.scrollIntoView({block:'nearest',inline:'nearest'});
      return;
    }
    if (action === 'add-preparation') {
      day.preparation.push({ key: nextKey('preparation'), name: '', setsReps: '', cue: '' });
      markDirty();
      render();
      return;
    }
    if (action === 'break-group') {
      const groupIndex = groups.findIndex((group) => group.key === button.dataset.groupKey);
      if (groupIndex >= 0) {
        groups.splice(groupIndex, 1);
        markDirty();
        render();
      }
      return;
    }
    if (action === 'add-group-exercise') {
      const group = groups.find((item) => item.key === button.dataset.groupKey);
      const definition = exerciseGroupingDefinitions.find((item) => item.type === group?.type);
      if (!group || (definition?.maximumExerciseCount !== undefined && group.exerciseKeys.length >= definition.maximumExerciseCount)) return;
      const newExercise: EditableExercise = { key: nextKey('exercise'), name: '', sets: '', reps: '', rir: '', rest: '', note: '', progressionBase: '', techniqueId: '', techniqueName: '', techniqueNote: '', realSetCount: 0, prescriptionMode: 'manual' };
      const lastGroupIndex = Math.max(...group.exerciseKeys.map((key) => exercises.findIndex((exercise) => exercise.key === key)));
      exercises.splice(Math.max(0, lastGroupIndex + 1), 0, newExercise);
      group.exerciseKeys.push(newExercise.key);
      markDirty();
      render();
      return;
    }
    if (action === 'remove-preparation') {
      const index = day.preparation.findIndex((item) => item.key === button.dataset.itemKey);
      if (index >= 0) {
        day.preparation.splice(index, 1);
        markDirty();
        render();
      }
      return;
    }
    if (action === 'add-ramp') {
      day.rampUp.push({ key: nextKey('ramp'), exercise: '', steps: [] });
      markDirty();
      render();
      return;
    }
    const ramp = day.rampUp.find((item) => item.key === button.dataset.itemKey);
    if (action === 'remove-ramp' && ramp) {
      day.rampUp = day.rampUp.filter((item) => item.key !== ramp.key);
      markDirty();
      render();
      return;
    }
    if (action === 'add-ramp-step' && ramp) {
      ramp.steps.push('');
      markDirty();
      render();
      return;
    }
    if (action === 'remove-ramp-step' && ramp) {
      const stepIndex = Number(button.dataset.stepIndex);
      if (Number.isInteger(stepIndex) && ramp.steps[stepIndex] !== undefined) {
        ramp.steps.splice(stepIndex, 1);
        markDirty();
        render();
      }
      return;
    }
    if (exerciseIndex < 0) return;
    if (action === 'open-progression') {
      progressionPanelState = {
        dayKey: day.key,
        exerciseKey: exercises[exerciseIndex].key,
        query: '',
        category: '',
        suitableFor: '',
        selectedId: '',
        showAll: false,
      };
      techniquePanelState = null;
      groupingPanelState = null;
      render();
      root.querySelector<HTMLInputElement>('[data-progression-search]')?.focus();
      return;
    }
    if (action === 'open-technique') {
      techniquePanelState = {
        dayKey: day.key,
        exerciseKey: exercises[exerciseIndex].key,
        selectedId: '',
        note: exercises[exerciseIndex].techniqueNote,
      };
      progressionPanelState = null;
      groupingPanelState = null;
      render();
      return;
    }
    if (action === 'apply-technique') {
      const technique = trainingTechniques.find((item) => item.id === techniquePanelState?.selectedId);
      const currentExercise = exercises[exerciseIndex];
      if (!technique || techniquePanelState?.dayKey !== day.key || techniquePanelState.exerciseKey !== currentExercise.key) return;
      currentExercise.techniqueId = technique.id;
      currentExercise.techniqueName = technique.name;
      currentExercise.techniqueNote = techniquePanelState.note;
      techniquePanelState = null;
      markDirty();
      render();
      return;
    }
    if (action === 'remove-technique') {
      exercises[exerciseIndex].techniqueId = '';
      exercises[exerciseIndex].techniqueName = '';
      exercises[exerciseIndex].techniqueNote = '';
      markDirty();
      render();
      return;
    }
    if (action === 'open-grouping') {
      groupingPanelState = { dayKey: day.key, exerciseKey: exercises[exerciseIndex].key };
      progressionPanelState = null;
      techniquePanelState = null;
      render();
      return;
    }
    if (action === 'create-group') {
      const definition = exerciseGroupingDefinitions.find((item) => item.type === button.dataset.groupType);
      const currentExercise = exercises[exerciseIndex];
      if (!definition || groups.some((group) => group.exerciseKeys.includes(currentExercise.key))) return;
      const newExercises = Array.from({ length: definition.initialExerciseCount - 1 }, () => ({
        key: nextKey('exercise'), name: '', sets: '', reps: '', rir: '', rest: '', note: '', progressionBase: '', techniqueId: '', techniqueName: '', techniqueNote: '', realSetCount: 0, prescriptionMode: 'manual' as const,
      } satisfies EditableExercise));
      exercises.splice(exerciseIndex + 1, 0, ...newExercises);
      groups.push({
        key: nextKey('group'),
        type: definition.type,
        exerciseKeys: [currentExercise.key, ...newExercises.map((exercise) => exercise.key)],
        restBetweenRounds: '',
        rounds: '',
        note: '',
      });
      groupingPanelState = null;
      markDirty();
      render();
      return;
    }
    if (action === 'apply-progression') {
      const progression = progressionLibrary.find((record) => record.id === progressionPanelState?.selectedId);
      const currentExercise = exercises[exerciseIndex];
      if (!progression || progressionPanelState?.dayKey !== day.key || progressionPanelState.exerciseKey !== currentExercise.key) return;

      programWeeks.filter(week => week >= activeWeek).forEach((week, weekIndex) => {
        const weekExercises = day.exercisesByWeek[week];
        let targetExercise = weekExercises.find((item) => item.key === currentExercise.key);
        if (!targetExercise) {
          targetExercise = { ...currentExercise };
          weekExercises.splice(Math.min(exerciseIndex, weekExercises.length), 0, targetExercise);
        }
        const prescription = progression.weeks[Math.min(weekIndex, progression.weeks.length - 1)];
        if (prescription.sets) targetExercise.sets = prescription.sets;
        if (prescription.reps) targetExercise.reps = prescription.reps;
        if (prescription.rirRpe) targetExercise.rir = prescription.rirRpe;
        if (prescription.recovery) targetExercise.rest = prescription.recovery;
        if (prescription.note) targetExercise.note = prescription.note;
        targetExercise.progressionBase = progression.name;
        targetExercise.progressionId = progression.id;
        targetExercise.progressionName = progression.name;
        targetExercise.structuredPrescription = undefined;
        targetExercise.realSetCount = parseEditableSetCount(targetExercise.sets);
        targetExercise.prescriptionMode = 'manual';
      });
      progressionPanelState = null;
      markDirty();
      render();
      return;
    }
    if (action === 'convert-structured-to-manual') {
      const currentExercise = exercises[exerciseIndex];
      Object.assign(currentExercise, convertStructuredExerciseToManual(currentExercise));
      markDirty();
      render();
      return;
    }
    if (action === 'remove-exercise') {
      if (await requestConfirmation('Rimuovere questo esercizio?')) {
        const group = groups.find((item) => item.exerciseKeys.includes(exercises[exerciseIndex].key));
        if (group) {
          group.exerciseKeys = group.exerciseKeys.filter((key) => key !== exercises[exerciseIndex].key);
          if (group.exerciseKeys.length === 0) groups.splice(groups.indexOf(group), 1);
        }
        exercises.splice(exerciseIndex, 1);
        markDirty();
        render();
      }
      return;
    }
    if (action === 'move-exercise-up' && exerciseIndex > 0) {
      [exercises[exerciseIndex - 1], exercises[exerciseIndex]] = [exercises[exerciseIndex], exercises[exerciseIndex - 1]];
      markDirty();
      render();
      return;
    }
    if (action === 'move-exercise-down' && exerciseIndex < exercises.length - 1) {
      [exercises[exerciseIndex], exercises[exerciseIndex + 1]] = [exercises[exerciseIndex + 1], exercises[exerciseIndex]];
      markDirty();
      render();
      return;
    }
    if (action === 'duplicate-exercise') {
      exercises.splice(exerciseIndex + 1, 0, { ...structuredClone(exercises[exerciseIndex]), key: nextKey('exercise'), name: `${exercises[exerciseIndex].name} copia`.trim() });
      markDirty();
      render();
      return;
    }
    if (action === 'apply-future' && await requestConfirmation('Applicare questa prescrizione alle settimane successive?')) {
      const currentExercise = exercises[exerciseIndex];
      programWeeks.filter((week) => week > activeWeek).forEach((week) => {
        const futureExercises = day.exercisesByWeek[week];
        const futureIndex = futureExercises.findIndex((item) => item.key === currentExercise.key);
        const copy = structuredClone(currentExercise);
        if (futureIndex >= 0) futureExercises[futureIndex] = copy;
        else futureExercises.splice(Math.min(exerciseIndex, futureExercises.length), 0, copy);
      });
      markDirty();
      render();
    }
  });

  render();

  return {
    element: root,
    setProgram: (nextProgram) => {
      programWeeks = [...nextProgram.weeks];
      program = cloneProgram(nextProgram);
      sourceSnapshot = structuredClone(program);
      activeWeek = 1;
      activeDayKey = program.days[0]?.key ?? '';
      nextDayLetterIndex = program.days.reduce(
        (nextIndex, day) => Math.max(nextIndex, dayLetters.indexOf(day.letter as typeof dayLetters[number]) + 1),
        0,
      );
      editing = false;
      dirty = false;
      readOnly = false;
      onDirtyChange?.(false);
      openDisclosures.clear();
      exercisePickerFilters.clear();
      exercisePickerQueries.clear();
      progressionPanelState = null;
      techniquePanelState = null;
      groupingPanelState = null;
      onEditingChange?.(false);
      render();
    },
    getSnapshot: () => ({
      format: 'neacea-program-editor-v1',
      program: serializeEditableProgram(program),
    }),
    setSnapshot: (snapshot) => {
      programWeeks = [...(snapshot.program.weeks ?? [1, 2, 3, 4, 5, 6])];
      program = structuredClone(snapshot.program);
      forwardBaseline = structuredClone(program);
      sourceSnapshot = structuredClone(program);
      activeWeek = 1;
      activeDayKey = program.days[0]?.key ?? '';
      nextDayLetterIndex = program.days.reduce(
        (nextIndex, day) => Math.max(nextIndex, dayLetters.indexOf(day.letter as typeof dayLetters[number]) + 1),
        0,
      );
      editing = false;
      dirty = false;
      readOnly = false;
      openDisclosures.clear();
      exercisePickerFilters.clear();
      exercisePickerQueries.clear();
      progressionPanelState = null;
      techniquePanelState = null;
      groupingPanelState = null;
      onEditingChange?.(false);
      onDirtyChange?.(false);
      render();
    },
    setReadOnly: (nextReadOnly) => {
      readOnly = nextReadOnly;
      if (readOnly) {
        editing = false;
        onEditingChange?.(false);
      }
      render();
    },
    isDirty: () => dirty,
    markSaved: () => {
      dirty = false;
      sourceSnapshot = structuredClone(program);
      onDirtyChange?.(false);
      render();
    },
    setWeek: (week) => {
      activeWeek = week;
      render();
    },
  };
}
