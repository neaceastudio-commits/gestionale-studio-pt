export type ExerciseGoal = 'hypertrophy';

export type MusclePriority = 'lats_back' | 'quadriceps';

export type SelectionPattern =
  | 'vertical_pull'
  | 'horizontal_pull'
  | 'squat'
  | 'knee_extension';

export type EquipmentProfile = 'full_gym' | 'home_gym' | 'minimal_equipment';

export type ExerciseSelectionRecord = {
  id: string;
  goal: ExerciseGoal;
  musclePriority: MusclePriority;
  pattern: SelectionPattern;
  workLine: string;
  equipmentProfile: EquipmentProfile;
  exercise: string;
  equivalentAlternatives: string[];
};

export const exerciseSelectionMatrix: ExerciseSelectionRecord[] = [
  {
    id: 'ESM-LB-FG-VP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'vertical_pull',
    workLine: 'Tirata verticale',
    equipmentProfile: 'full_gym',
    exercise: 'Lat Machine',
    equivalentAlternatives: ['Assisted Pull-Up', 'Pull-Up'],
  },
  {
    id: 'ESM-LB-FG-HP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'horizontal_pull',
    workLine: 'Tirata orizzontale',
    equipmentProfile: 'full_gym',
    exercise: 'Seated Cable Row',
    equivalentAlternatives: ['Chest Supported Row Machine', 'One Arm Cable Row'],
  },
  {
    id: 'ESM-LB-HG-VP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'vertical_pull',
    workLine: 'Lavoro dorsale funzionalmente vicino alla tirata verticale',
    equipmentProfile: 'home_gym',
    exercise: 'Dumbbell Pullover',
    equivalentAlternatives: [],
  },
  {
    id: 'ESM-LB-HG-HP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'horizontal_pull',
    workLine: 'Tirata orizzontale',
    equipmentProfile: 'home_gym',
    exercise: 'One Arm Dumbbell Row',
    equivalentAlternatives: ['Barbell Row', 'Chest Supported Dumbbell Row'],
  },
  {
    id: 'ESM-LB-ME-VP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'vertical_pull',
    workLine: 'Tirata verticale con elastico',
    equipmentProfile: 'minimal_equipment',
    exercise: 'Band Lat Pulldown',
    equivalentAlternatives: [
      'Kneeling Band Lat Pulldown',
      'Straight Arm Band Pulldown',
    ],
  },
  {
    id: 'ESM-LB-ME-HP',
    goal: 'hypertrophy',
    musclePriority: 'lats_back',
    pattern: 'horizontal_pull',
    workLine: 'Tirata orizzontale con elastico o corpo libero',
    equipmentProfile: 'minimal_equipment',
    exercise: 'Band Row',
    equivalentAlternatives: [
      'One Arm Band Row',
      'Bodyweight Row (solo con struttura sicura)',
    ],
  },
  {
    id: 'ESM-QU-FG-SQ',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'squat',
    workLine: 'Squat a enfasi quadricipiti',
    equipmentProfile: 'full_gym',
    exercise: 'Hack Squat',
    equivalentAlternatives: ['Leg Press', 'Heel Elevated Squat'],
  },
  {
    id: 'ESM-QU-FG-KE',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'knee_extension',
    workLine: 'Estensione di ginocchio',
    equipmentProfile: 'full_gym',
    exercise: 'Leg Extension',
    equivalentAlternatives: ['Single Leg Extension'],
  },
  {
    id: 'ESM-QU-HG-SQ',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'squat',
    workLine: 'Squat a enfasi quadricipiti',
    equipmentProfile: 'home_gym',
    exercise: 'Heel Elevated Squat',
    equivalentAlternatives: ['Front Squat', 'Goblet Squat'],
  },
  {
    id: 'ESM-QU-HG-KE',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'knee_extension',
    workLine: 'Enfasi quadricipiti funzionalmente vicina alla knee extension',
    equipmentProfile: 'home_gym',
    exercise: 'Rear Foot Elevated Split Squat',
    equivalentAlternatives: [],
  },
  {
    id: 'ESM-QU-ME-SQ',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'squat',
    workLine: 'Squat a enfasi quadricipiti a corpo libero',
    equipmentProfile: 'minimal_equipment',
    exercise: 'Bodyweight Heel Elevated Squat',
    equivalentAlternatives: ['Assisted Squat', 'Tempo Squat'],
  },
  {
    id: 'ESM-QU-ME-KE',
    goal: 'hypertrophy',
    musclePriority: 'quadriceps',
    pattern: 'knee_extension',
    workLine: 'Enfasi quadricipiti con attrezzatura minima',
    equipmentProfile: 'minimal_equipment',
    exercise: 'Supported Split Squat',
    equivalentAlternatives: [
      'Reverse Nordic (alternativa avanzata)',
      'Band Squat (se configurabile in sicurezza)',
    ],
  },
];
