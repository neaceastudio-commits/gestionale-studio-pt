import type { ExercisePattern } from './exercise-library';
import {
  getExerciseClasses,
  type ExerciseClass,
} from './exercise-compatibility';
import type { ExerciseLibraryRecord } from './exercise-library';

export type TrainingTechnique = {
  id: string;
  name: string;
  sourceProgressionIds: string[];
  exerciseClasses: ExerciseClass[];
  patterns?: ExercisePattern[];
};

export const trainingTechniques: TrainingTechnique[] = [
  { id: 'tech-isometry', name: 'Isometria', sourceProgressionIds: ['prog-isometria-dinamica'], exerciseClasses: ['compound', 'complementary', 'isolation', 'technical'] },
  { id: 'tech-pause', name: 'Fermo', sourceProgressionIds: ['prog-tecnica-con-fermo'], exerciseClasses: ['fundamental', 'compound', 'complementary', 'technical'] },
  { id: 'tech-eccentric', name: 'Eccentrica controllata', sourceProgressionIds: ['prog-eccentrica-controllata'], exerciseClasses: ['compound', 'complementary', 'isolation', 'technical'] },
  { id: 'tech-contrast', name: 'Contrasto tecnico', sourceProgressionIds: ['prog-contrasto-tecnico'], exerciseClasses: ['fundamental', 'compound', 'technical'] },
  { id: 'tech-cluster', name: 'Cluster', sourceProgressionIds: ['prog-cluster-tecnico-forza', 'prog-cluster-forza-massimale'], exerciseClasses: ['fundamental', 'compound', 'power'], patterns: ['squat', 'hinge', 'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'power'] },
  { id: 'tech-rest-pause', name: 'Rest-Pause', sourceProgressionIds: ['prog-rest-pause-forza', 'prog-rest-pause-ipertrofia'], exerciseClasses: ['compound', 'complementary', 'isolation'] },
  { id: 'tech-myo-reps', name: 'Myo-Reps', sourceProgressionIds: ['prog-myo-reps-ipertrofia', 'prog-myo-reps'], exerciseClasses: ['complementary', 'isolation'] },
  { id: 'tech-drop-set', name: 'Drop Set', sourceProgressionIds: ['prog-drop-set-finale'], exerciseClasses: ['complementary', 'isolation'] },
  { id: 'tech-mechanical-drop-set', name: 'Mechanical Drop Set', sourceProgressionIds: ['prog-mechanical-drop-set'], exerciseClasses: ['complementary', 'isolation'] },
  { id: 'tech-pre-exhaust', name: 'Pre-Exhaust', sourceProgressionIds: ['prog-pre-exhaust'], exerciseClasses: ['compound', 'complementary', 'isolation'] },
  { id: 'tech-pump', name: 'Pump', sourceProgressionIds: ['prog-specializzazione-pump'], exerciseClasses: ['complementary', 'isolation'] },
  { id: 'tech-amrap', name: 'AMRAP controllato', sourceProgressionIds: ['prog-amrap-controllato'], exerciseClasses: ['compound', 'complementary', 'isolation', 'conditioning'] },
];

export function getCompatibleTechniques(exercise?: ExerciseLibraryRecord): TrainingTechnique[] {
  const classes = getExerciseClasses(exercise);
  return trainingTechniques.filter((technique) =>
    classes.some((exerciseClass) => technique.exerciseClasses.includes(exerciseClass)) &&
    (!technique.patterns || Boolean(exercise && technique.patterns.includes(exercise.pattern))),
  );
}

export const exerciseGroupingTypes = ['superset', 'triple_set', 'giant_set', 'circuit'] as const;
export type ExerciseGroupingType = (typeof exerciseGroupingTypes)[number];

export type ExerciseGroupingDefinition = {
  type: ExerciseGroupingType;
  name: string;
  initialExerciseCount: number;
  minimumExerciseCount: number;
  maximumExerciseCount?: number;
};

export const exerciseGroupingDefinitions: ExerciseGroupingDefinition[] = [
  { type: 'superset', name: 'Superset', initialExerciseCount: 2, minimumExerciseCount: 2, maximumExerciseCount: 2 },
  { type: 'triple_set', name: 'Triple Set', initialExerciseCount: 3, minimumExerciseCount: 3, maximumExerciseCount: 3 },
  { type: 'giant_set', name: 'Giant Set', initialExerciseCount: 4, minimumExerciseCount: 4 },
  { type: 'circuit', name: 'Circuito', initialExerciseCount: 3, minimumExerciseCount: 3, maximumExerciseCount: 8 },
];
