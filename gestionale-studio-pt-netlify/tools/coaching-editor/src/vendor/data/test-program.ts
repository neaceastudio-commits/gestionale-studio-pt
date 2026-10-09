import {
  heelElevatedSquatDynamic,
  hipHingeWithStick,
  kneeToWallDynamic,
  type PreparationExercise,
} from './preparation-library';

export type ProgramWeek = number;

export type ExercisePrescription = {
  sets: number;
  reps: string;
  rir: string;
  rest: string;
  note?: string;
  structuredPrescription?: PrescriptionStructure;
  /** Compatibilita transitoria con le proposte generate prima del contratto v1. */
  structure?: PrescriptionStructure;
};

export type PrescriptionSetGroup = {
  kind: 'working' | 'top_set' | 'back_off' | 'accessory';
  sets: number;
  reps: string;
  intensity?: string;
};

export type PrescriptionStructure = {
  setGroups: PrescriptionSetGroup[];
  adjustableDimensions: Array<'working_sets' | 'accessory_sets' | 'recovery'>;
};

export function realSetCount(prescription: ExercisePrescription): number {
  const structured = prescription.structuredPrescription ?? prescription.structure;
  return structured
    ? structured.setGroups.reduce((total, group) => total + group.sets, 0)
    : prescription.sets;
}

export type WeeklyProgression = readonly [
  ExercisePrescription,
  ExercisePrescription,
  ExercisePrescription,
  ExercisePrescription,
  ExercisePrescription,
  ExercisePrescription,
];

export type ProgramExercise = {
  name: string;
  progression: WeeklyProgression;
  note?: string;
  canonicalExerciseId?: string;
  progressionId?: string;
  role?: 'anchor' | 'primary' | 'secondary' | 'complementary' | 'isolation' | 'core';
};

export type SpecificWarmup = {
  exercise: string;
  steps: readonly string[];
};

export type ProgramDay = {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  name: string;
  generalWarmup: string[];
  preparation: PreparationExercise[];
  specificWarmup: SpecificWarmup[];
  exercises: ProgramExercise[];
  notes: string[];
};

export type StaticTrainingProgram = {
  id: string;
  athleteId: string;
  title: string;
  weeks: readonly ProgramWeek[];
  days: ProgramDay[];
};

const mainTenRepProgression: WeeklyProgression = [
  { sets: 3, reps: '10', rir: '3', rest: '120 sec' },
  { sets: 3, reps: '10', rir: '2', rest: '120 sec' },
  { sets: 3, reps: '11', rir: '2', rest: '120 sec' },
  { sets: 3, reps: '12', rir: '2', rest: '120 sec' },
  { sets: 4, reps: '10', rir: '1–2', rest: '120 sec' },
  { sets: 3, reps: '10', rir: '3', rest: '120 sec', note: 'Settimana di scarico' },
];

const mainEightRepProgression: WeeklyProgression = [
  { sets: 3, reps: '8', rir: '3', rest: '120 sec' },
  { sets: 3, reps: '8', rir: '2', rest: '120 sec' },
  { sets: 3, reps: '9', rir: '2', rest: '120 sec' },
  { sets: 3, reps: '10', rir: '2', rest: '120 sec' },
  { sets: 4, reps: '8', rir: '1–2', rest: '120 sec' },
  { sets: 2, reps: '8', rir: '3', rest: '120 sec', note: 'Settimana di scarico' },
];

const secondaryProgression: WeeklyProgression = [
  { sets: 3, reps: '10', rir: '3', rest: '90 sec' },
  { sets: 3, reps: '10', rir: '2', rest: '90 sec' },
  { sets: 3, reps: '11', rir: '2', rest: '90 sec' },
  { sets: 3, reps: '12', rir: '2', rest: '90 sec' },
  { sets: 3, reps: '10', rir: '1–2', rest: '90 sec', note: 'Carico leggermente maggiore' },
  { sets: 2, reps: '10', rir: '3', rest: '90 sec', note: 'Settimana di scarico' },
];

const accessoryProgression: WeeklyProgression = [
  { sets: 2, reps: '12', rir: '3', rest: '60 sec' },
  { sets: 2, reps: '12', rir: '2', rest: '60 sec' },
  { sets: 3, reps: '12', rir: '2', rest: '60 sec' },
  { sets: 3, reps: '13', rir: '2', rest: '60 sec' },
  { sets: 3, reps: '12', rir: '1–2', rest: '60 sec' },
  { sets: 2, reps: '12', rir: '3', rest: '60 sec', note: 'Settimana di scarico' },
];

const coreProgression: WeeklyProgression = [
  { sets: 3, reps: '30 sec', rir: '3', rest: '45 sec' },
  { sets: 3, reps: '35 sec', rir: '3', rest: '45 sec' },
  { sets: 3, reps: '40 sec', rir: '2', rest: '45 sec' },
  { sets: 3, reps: '45 sec', rir: '2', rest: '45 sec' },
  { sets: 3, reps: '45 sec', rir: '1–2', rest: '45 sec' },
  { sets: 2, reps: '30 sec', rir: '3', rest: '45 sec', note: 'Settimana di scarico' },
];

const controlledCoreProgression: WeeklyProgression = [
  { sets: 3, reps: '8 per lato', rir: '3', rest: '45 sec' },
  { sets: 3, reps: '9 per lato', rir: '3', rest: '45 sec' },
  { sets: 3, reps: '10 per lato', rir: '2', rest: '45 sec' },
  { sets: 3, reps: '10 per lato', rir: '2', rest: '45 sec' },
  { sets: 3, reps: '12 per lato', rir: '2', rest: '45 sec' },
  { sets: 2, reps: '8 per lato', rir: '3', rest: '45 sec', note: 'Settimana di scarico' },
];

const relativeRampUp = [
  'Carico molto leggero × 6-8',
  'Carico medio × 3-5',
  'Carico vicino al lavoro × 1-3',
] as const;

export const staticTestProgram: StaticTrainingProgram = {
  id: 'PROGRAM-TEST-001',
  athleteId: 'TEST-001',
  title: 'Prototipo scheda 6 settimane',
  weeks: [1, 2, 3, 4, 5, 6],
  days: [
    {
      id: 'A',
      name: 'Giorno A',
      generalWarmup: [
        '3 minuti · Bike a bassa intensità.',
        'Aumentare progressivamente il ritmo senza generare fatica significativa.',
      ],
      preparation: [
        kneeToWallDynamic,
        heelElevatedSquatDynamic,
      ],
      specificWarmup: [
        { exercise: 'Squat con rialzo talloni', steps: relativeRampUp },
        { exercise: 'Panca piana con manubri', steps: relativeRampUp },
      ],
      exercises: [
        {
          name: 'Squat con rialzo talloni',
          progression: mainTenRepProgression,
          note: 'Utilizzare la variante già indicata come tollerata nel profilo test.',
        },
        { name: 'Panca piana con manubri', progression: mainEightRepProgression },
        { name: 'Rematore su panca inclinata', progression: secondaryProgression },
        { name: 'Leg curl', progression: secondaryProgression },
        { name: 'Alzate laterali', progression: accessoryProgression },
        { name: 'Plank', progression: coreProgression },
      ],
      notes: [
        'Mantenere un’esecuzione controllata e rispettare il RIR indicato.',
        'Le serie di avvicinamento non sono conteggiate nelle serie allenanti.',
      ],
    },
    {
      id: 'B',
      name: 'Giorno B',
      generalWarmup: [
        '3 minuti · Treadmill a bassa intensità.',
        'Prepararsi gradualmente alla seduta senza creare affaticamento.',
      ],
      preparation: [hipHingeWithStick],
      specificWarmup: [
        { exercise: 'Stacco rumeno con manubri', steps: relativeRampUp },
        { exercise: 'Lat machine presa neutra', steps: relativeRampUp },
      ],
      exercises: [
        { name: 'Stacco rumeno con manubri', progression: mainEightRepProgression },
        { name: 'Lat machine presa neutra', progression: mainTenRepProgression },
        { name: 'Affondi indietro', progression: secondaryProgression },
        { name: 'Chest press', progression: secondaryProgression },
        { name: 'Curl con manubri', progression: accessoryProgression },
        { name: 'Dead bug', progression: controlledCoreProgression },
      ],
      notes: [
        'Interrompere la serie quando viene raggiunto il RIR previsto.',
        'La qualità del movimento resta prioritaria rispetto all’aumento del carico.',
      ],
    },
    {
      id: 'C',
      name: 'Giorno C',
      generalWarmup: [
        '3 minuti · Rower a bassa intensità.',
        'Aumentare progressivamente il ritmo senza generare fatica significativa.',
      ],
      preparation: [
        kneeToWallDynamic,
        heelElevatedSquatDynamic,
      ],
      specificWarmup: [
        { exercise: 'Leg press', steps: relativeRampUp },
        { exercise: 'Shoulder press con manubri', steps: relativeRampUp },
      ],
      exercises: [
        { name: 'Leg press', progression: mainTenRepProgression },
        { name: 'Shoulder press con manubri', progression: mainEightRepProgression },
        { name: 'Pulley basso', progression: secondaryProgression },
        { name: 'Hip thrust', progression: secondaryProgression },
        { name: 'Pushdown ai cavi', progression: accessoryProgression },
        { name: 'Calf raise', progression: accessoryProgression },
      ],
      notes: [
        'Usare carichi che consentano di rispettare tecnica e RIR programmati.',
        'La settimana 6 è una settimana di scarico.',
      ],
    },
  ],
};
