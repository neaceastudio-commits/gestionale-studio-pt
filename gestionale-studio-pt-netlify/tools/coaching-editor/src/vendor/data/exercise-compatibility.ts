import {
  exerciseLibrary,
  exerciseLibraryReview,
  type ExerciseLibraryRecord,
  type ExerciseMuscleGroup,
  type ExercisePattern,
} from './exercise-library';
import { progressionLibrary, type ProgressionRecord } from './progression-library';

export const exerciseClasses = [
  'fundamental',
  'compound',
  'complementary',
  'isolation',
  'technical',
  'power',
  'core',
  'conditioning',
  'mobility',
  'other',
] as const;

export const progressionTypes = [
  'progression',
  'intensity_technique',
  'exercise_grouping',
  'review',
] as const;

export type ExerciseClass = (typeof exerciseClasses)[number];
export type ProgressionType = (typeof progressionTypes)[number];

export type ExerciseClassification = {
  exerciseId: string;
  exerciseClasses: ExerciseClass[];
};

export type ProgressionTypeClassification = {
  progressionId: string;
  type: ProgressionType;
};

export type ProgressionCompatibilityRecord = {
  progressionId: string;
  exerciseClasses: ExerciseClass[];
  patterns?: ExercisePattern[];
  muscleGroups?: ExerciseMuscleGroup[];
};

export type CompatibilityReviewItem = {
  item: string;
  type: 'progression' | 'technique' | 'exercise_classification' | 'grouping';
  reason: string;
};

const compoundPatterns: ExercisePattern[] = [
  'squat',
  'hinge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
];

const intensityTechniqueNames = new Set([
  'Isometria + Dinamica',
  'Tecnica con Fermo',
  'Eccentrica Controllata',
  'Contrasto Tecnico',
  'Cluster Tecnico Forza',
  'Cluster Forza Massimale',
  'Rest Pause Forza',
  'Rest Pause Ipertrofia',
  'Myo Reps Ipertrofia',
  'Drop Set Finale',
  'Mechanical Drop Set',
  'Pre Exhaust',
  'Specializzazione Pump',
  'Myo Reps',
  'AMRAP Controllato',
]);

const exerciseGroupingNames = new Set([
  'Circuito Tecnico Base',
  'Giant Set Ipertrofia',
  'Circuito Metabolico',
  'Core Circuito',
  'Contrasto Forza Power',
  'Circuito Base 3 Stazioni',
  'Circuito Upper Lower Core',
  'Circuito A Tempo',
  'Circuito Forza Resistente',
  'Circuito Dimagrimento',
]);

const progressionReviewNames = new Set([
  'Tempo Density',
  'Metabolic Finisher',
  'Recupero Attivo',
]);

const coreProgressionNames = new Set([
  'Core Stabilita',
  'Anti Rotazione',
  'Core Anti Estensione',
  'Core Carry',
  'Core Rotazionale',
  'Core Bracing Forza',
  'Core Dinamico',
]);

const powerProgressionNames = new Set([
  'Power Bassa Ripetizione',
  'Pliometria Progressiva',
  'Med Ball Power',
  'Speed Strength',
]);

const isolationFocusedProgressions = new Set([
  'Complementare Progressiva',
  'Doppia Progressione 10-15',
]);

const compoundFocusedProgressions = new Set([
  'Doppia Progressione 6-10',
  'Reverse Pyramid Hypertrophy',
  'Top Set + Back Off Ipertrofia',
]);

function deriveExerciseClasses(record: ExerciseLibraryRecord): ExerciseClass[] {
  const classes: ExerciseClass[] = [];
  const add = (...values: ExerciseClass[]): void => {
    values.forEach((value) => {
      if (!classes.includes(value)) classes.push(value);
    });
  };

  if (record.contexts.includes('fundamental')) add('fundamental', 'compound');
  if (record.pattern === 'isolation' || record.contexts.includes('isolation')) add('isolation');
  if (record.pattern === 'power' || record.contexts.includes('power')) add('power');
  if (record.pattern === 'conditioning' || record.contexts.includes('conditioning')) add('conditioning');
  if (record.pattern === 'mobility') add('mobility');
  if (record.pattern === 'core' || record.pattern === 'carry') add('core');
  if (record.contexts.includes('technical')) add('technical');

  if (compoundPatterns.includes(record.pattern)) {
    add('compound');
    if (!record.contexts.includes('fundamental')) add('complementary');
  }

  if (classes.length === 0) add('other');
  return classes;
}

export const exerciseClassifications: ExerciseClassification[] = exerciseLibrary.map((record) => ({
  exerciseId: record.id,
  exerciseClasses: deriveExerciseClasses(record),
}));

export const exerciseClassCounts: Record<ExerciseClass, number> = Object.fromEntries(
  exerciseClasses.map((exerciseClass) => [
    exerciseClass,
    exerciseClassifications.filter((record) => record.exerciseClasses.includes(exerciseClass)).length,
  ]),
) as Record<ExerciseClass, number>;

export function getExerciseRecord(name: string): ExerciseLibraryRecord | undefined {
  const normalizedName = name.trim().toLocaleLowerCase('it');
  return exerciseLibrary.find((record) =>
    record.name.toLocaleLowerCase('it') === normalizedName ||
    record.aliases.some((alias) => alias.toLocaleLowerCase('it') === normalizedName),
  );
}

export function getExerciseClasses(record?: ExerciseLibraryRecord): ExerciseClass[] {
  if (!record) return ['other'];
  return exerciseClassifications.find((item) => item.exerciseId === record.id)?.exerciseClasses ?? ['other'];
}

function classifyProgression(record: ProgressionRecord): ProgressionType {
  if (intensityTechniqueNames.has(record.name)) return 'intensity_technique';
  if (exerciseGroupingNames.has(record.name)) return 'exercise_grouping';
  if (progressionReviewNames.has(record.name)) return 'review';
  return 'progression';
}

export const progressionTypeClassifications: ProgressionTypeClassification[] = progressionLibrary.map((record) => ({
  progressionId: record.id,
  type: classifyProgression(record),
}));

export const progressionTypeCounts: Record<ProgressionType, number> = Object.fromEntries(
  progressionTypes.map((type) => [
    type,
    progressionTypeClassifications.filter((record) => record.type === type).length,
  ]),
) as Record<ProgressionType, number>;

export function getProgressionType(progressionId: string): ProgressionType {
  return progressionTypeClassifications.find((record) => record.progressionId === progressionId)?.type ?? 'review';
}

function getProgressionCompatibility(record: ProgressionRecord): ProgressionCompatibilityRecord {
  if (coreProgressionNames.has(record.name)) {
    return { progressionId: record.id, exerciseClasses: ['core'], patterns: ['core', 'carry'] };
  }
  if (powerProgressionNames.has(record.name)) {
    return { progressionId: record.id, exerciseClasses: ['power', 'technical'], patterns: ['power'] };
  }
  if (record.category === 'strength') {
    const exerciseClassSet: ExerciseClass[] = record.name === 'Doppia Progressione Forza'
      ? ['fundamental', 'compound', 'complementary']
      : ['fundamental', 'compound'];
    return { progressionId: record.id, exerciseClasses: exerciseClassSet, patterns: compoundPatterns };
  }
  if (record.category === 'technical') {
    return {
      progressionId: record.id,
      exerciseClasses: ['fundamental', 'compound', 'complementary', 'technical'],
      patterns: compoundPatterns,
    };
  }
  if (record.category === 'hypertrophy') {
    if (isolationFocusedProgressions.has(record.name)) {
      return { progressionId: record.id, exerciseClasses: ['complementary', 'isolation'] };
    }
    if (compoundFocusedProgressions.has(record.name)) {
      return { progressionId: record.id, exerciseClasses: ['fundamental', 'compound', 'complementary'] };
    }
    return {
      progressionId: record.id,
      exerciseClasses: ['fundamental', 'compound', 'complementary', 'isolation'],
    };
  }
  if (record.category === 'density') {
    return {
      progressionId: record.id,
      exerciseClasses: ['compound', 'complementary', 'isolation', 'conditioning'],
    };
  }
  if (record.category === 'reset') {
    return {
      progressionId: record.id,
      exerciseClasses: ['fundamental', 'compound', 'complementary', 'isolation', 'technical', 'power', 'core', 'conditioning', 'other'],
    };
  }
  return { progressionId: record.id, exerciseClasses: ['other'] };
}

export const progressionCompatibility: ProgressionCompatibilityRecord[] = progressionLibrary
  .filter((record) => getProgressionType(record.id) === 'progression')
  .map(getProgressionCompatibility);

function matchesCompatibility(
  exercise: ExerciseLibraryRecord | undefined,
  compatibility: ProgressionCompatibilityRecord,
): boolean {
  const classes = getExerciseClasses(exercise);
  if (!classes.some((exerciseClass) => compatibility.exerciseClasses.includes(exerciseClass))) return false;
  if (compatibility.patterns && (!exercise || !compatibility.patterns.includes(exercise.pattern))) return false;
  if (compatibility.muscleGroups && (!exercise || !compatibility.muscleGroups.includes(exercise.primaryMuscleGroup))) return false;
  return true;
}

export function getCompatibleProgressions(exercise?: ExerciseLibraryRecord): ProgressionRecord[] {
  return progressionLibrary.filter((record) => {
    if (getProgressionType(record.id) !== 'progression') return false;
    const compatibility = progressionCompatibility.find((item) => item.progressionId === record.id);
    return compatibility ? matchesCompatibility(exercise, compatibility) : false;
  });
}

export const compatibilityReview: CompatibilityReviewItem[] = [
  ...progressionLibrary
    .filter((record) => getProgressionType(record.id) === 'review')
    .map((record) => ({
      item: record.name,
      type: 'progression' as const,
      reason: 'Il nome descrive un formato di lavoro che non è univocamente una progressione, una tecnica o un raggruppamento.',
    })),
  ...exerciseLibraryReview.map((record) => ({
    item: record.name,
    type: 'exercise_classification' as const,
    reason: record.reason,
  })),
  {
    item: 'Jump Set',
    type: 'grouping',
    reason: 'Non è supportato esplicitamente dalle fonti NEACEA già presenti in questa fase.',
  },
];
