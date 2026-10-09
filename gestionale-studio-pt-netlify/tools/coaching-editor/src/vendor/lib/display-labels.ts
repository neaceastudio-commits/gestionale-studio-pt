import type {
  EquipmentProfile,
  ExerciseGoal,
  MusclePriority,
  SelectionPattern,
} from '../data/exercise-selection-matrix';
import type { PreparationPattern } from '../data/preparation-library';

export type DisplayLabel = {
  primary: string;
  secondary?: string;
};

const patternDisplayLabels: Record<SelectionPattern | PreparationPattern, DisplayLabel> = {
  squat: { primary: 'Accosciata', secondary: 'Squat pattern' },
  hinge: { primary: "Estensione d'anca", secondary: 'Hip hinge' },
  horizontal_push: { primary: 'Spinta orizzontale', secondary: 'Horizontal push' },
  horizontal_pull: { primary: 'Tirata orizzontale', secondary: 'Horizontal pull' },
  vertical_pull: { primary: 'Tirata verticale', secondary: 'Vertical pull' },
  knee_extension: { primary: 'Estensione del ginocchio', secondary: 'Knee extension' },
};

const equipmentDisplayLabels: Record<EquipmentProfile, DisplayLabel> = {
  full_gym: { primary: 'Palestra completa', secondary: 'Full gym' },
  home_gym: { primary: 'Home gym' },
  minimal_equipment: { primary: 'Attrezzatura minima', secondary: 'Minimal equipment' },
};

const musclePriorityDisplayLabels: Record<MusclePriority, DisplayLabel> = {
  lats_back: { primary: 'Dorsali', secondary: 'Lats / back' },
  quadriceps: { primary: 'Quadricipiti', secondary: 'Quadriceps' },
};

const goalDisplayLabels: Record<ExerciseGoal, DisplayLabel> = {
  hypertrophy: { primary: 'Ipertrofia', secondary: 'Hypertrophy' },
};

const exerciseDisplayLabels: Record<string, DisplayLabel> = {
  'Assisted Pull-Up': { primary: 'Trazioni assistite', secondary: 'Assisted pull-up' },
  'Pull-Up': { primary: 'Trazioni', secondary: 'Pull-up' },
  'Seated Cable Row': {
    primary: 'Rematore al cavo da seduto',
    secondary: 'Seated cable row',
  },
  'Chest Supported Row Machine': {
    primary: 'Rematore alla macchina con supporto al petto',
    secondary: 'Chest-supported row machine',
  },
  'One Arm Cable Row': {
    primary: 'Rematore al cavo a un braccio',
    secondary: 'One-arm cable row',
  },
  'Dumbbell Pullover': { primary: 'Pullover con manubrio', secondary: 'Dumbbell pullover' },
  'One Arm Dumbbell Row': {
    primary: 'Rematore con manubrio a un braccio',
    secondary: 'One-arm dumbbell row',
  },
  'Barbell Row': { primary: 'Rematore con bilanciere', secondary: 'Barbell row' },
  'Chest Supported Dumbbell Row': {
    primary: 'Rematore con manubri su panca inclinata',
    secondary: 'Chest-supported dumbbell row',
  },
  'Band Lat Pulldown': {
    primary: 'Lat pulldown con elastico',
    secondary: 'Band lat pulldown',
  },
  'Kneeling Band Lat Pulldown': {
    primary: 'Lat pulldown in ginocchio con elastico',
    secondary: 'Kneeling band lat pulldown',
  },
  'Straight Arm Band Pulldown': {
    primary: 'Pulldown a braccia tese con elastico',
    secondary: 'Straight-arm band pulldown',
  },
  'Band Row': { primary: 'Rematore con elastico', secondary: 'Band row' },
  'One Arm Band Row': {
    primary: 'Rematore a un braccio con elastico',
    secondary: 'One-arm band row',
  },
  'Bodyweight Row (solo con struttura sicura)': {
    primary: 'Rematore a corpo libero (solo con struttura sicura)',
    secondary: 'Bodyweight row',
  },
  'Heel Elevated Squat': {
    primary: 'Squat con talloni rialzati',
    secondary: 'Heel-elevated squat',
  },
  'Single Leg Extension': {
    primary: 'Leg extension a una gamba',
    secondary: 'Single-leg extension',
  },
  'Rear Foot Elevated Split Squat': {
    primary: 'Split squat con piede posteriore rialzato',
    secondary: 'Rear-foot-elevated split squat',
  },
  'Bodyweight Heel Elevated Squat': {
    primary: 'Squat a corpo libero con talloni rialzati',
    secondary: 'Bodyweight heel-elevated squat',
  },
  'Assisted Squat': { primary: 'Squat assistito', secondary: 'Assisted squat' },
  'Tempo Squat': { primary: 'Squat a tempo', secondary: 'Tempo squat' },
  'Supported Split Squat': {
    primary: 'Split squat assistito',
    secondary: 'Supported split squat',
  },
  'Band Squat (se configurabile in sicurezza)': {
    primary: 'Squat con elastico (se configurabile in sicurezza)',
    secondary: 'Band squat',
  },
  'Goblet Squat dinamico': {
    primary: 'Goblet Squat dinamico',
    secondary: 'Dynamic goblet squat',
  },
  'Knee-to-Wall dinamico': {
    primary: 'Mobilità dinamica caviglia al muro',
    secondary: 'Knee-to-wall',
  },
  'Squat dinamico con rialzo talloni': {
    primary: 'Squat dinamico con talloni rialzati',
    secondary: 'Heel-elevated dynamic squat',
  },
  'Hip Hinge con bastone': {
    primary: 'Hip hinge con bastone',
    secondary: 'Dowel hip hinge',
  },
  'Hamstring Sweep dinamico': {
    primary: 'Mobilità dinamica femorali',
    secondary: 'Dynamic hamstring sweep',
  },
  'Scapular Push-up': { primary: 'Push-up scapolare', secondary: 'Scapular push-up' },
  'Wall Slide': { primary: 'Scivolamento al muro', secondary: 'Wall slide' },
  'Row tecnico leggero': {
    primary: 'Rematore tecnico leggero',
    secondary: 'Light technical row',
  },
  'Scapular Row': { primary: 'Rematore scapolare', secondary: 'Scapular row' },
  'Pulldown tecnico leggero': {
    primary: 'Pulldown tecnico leggero',
    secondary: 'Light technical pulldown',
  },
  'Scapular Pulldown': {
    primary: 'Pulldown scapolare',
    secondary: 'Scapular pulldown',
  },
  'Squat con rialzo talloni': {
    primary: 'Squat con talloni rialzati',
    secondary: 'Heel-elevated squat',
  },
  'Panca piana con manubri': {
    primary: 'Panca piana con manubri',
    secondary: 'Dumbbell bench press',
  },
  'Rematore su panca inclinata': {
    primary: 'Rematore su panca inclinata',
    secondary: 'Chest-supported dumbbell row',
  },
  'Alzate laterali': { primary: 'Alzate laterali', secondary: 'Lateral raises' },
  'Stacco rumeno con manubri': {
    primary: 'Stacco rumeno con manubri',
    secondary: 'Dumbbell Romanian deadlift',
  },
  'Lat machine presa neutra': {
    primary: 'Lat machine presa neutra',
    secondary: 'Neutral-grip lat machine',
  },
  'Affondi indietro': { primary: 'Affondi indietro', secondary: 'Reverse lunges' },
  'Curl con manubri': { primary: 'Curl con manubri', secondary: 'Dumbbell curl' },
  'Shoulder press con manubri': {
    primary: 'Shoulder press con manubri',
    secondary: 'Dumbbell shoulder press',
  },
  'Pulley basso': { primary: 'Rematore al cavo basso', secondary: 'Seated cable row' },
  'Pushdown ai cavi': { primary: 'Pushdown ai cavi', secondary: 'Cable pushdown' },
};

const workLineDisplayLabels: Record<string, DisplayLabel> = {
  'Tirata verticale': { primary: 'Tirata verticale', secondary: 'Vertical pull' },
  'Tirata orizzontale': { primary: 'Tirata orizzontale', secondary: 'Horizontal pull' },
  'Lavoro dorsale funzionalmente vicino alla tirata verticale': {
    primary: 'Lavoro dorsale funzionalmente vicino alla tirata verticale',
    secondary: 'Vertical-pull equivalent',
  },
  'Tirata verticale con elastico': {
    primary: 'Tirata verticale con elastico',
    secondary: 'Band vertical pull',
  },
  'Tirata orizzontale con elastico o corpo libero': {
    primary: 'Tirata orizzontale con elastico o corpo libero',
    secondary: 'Band / bodyweight horizontal pull',
  },
  'Squat a enfasi quadricipiti': {
    primary: 'Accosciata a enfasi quadricipiti',
    secondary: 'Quad-dominant squat pattern',
  },
  'Estensione di ginocchio': {
    primary: 'Estensione del ginocchio',
    secondary: 'Knee extension',
  },
  'Enfasi quadricipiti funzionalmente vicina alla knee extension': {
    primary: "Enfasi quadricipiti funzionalmente vicina all'estensione del ginocchio",
    secondary: 'Knee-extension equivalent',
  },
  'Squat a enfasi quadricipiti a corpo libero': {
    primary: 'Accosciata a enfasi quadricipiti a corpo libero',
    secondary: 'Bodyweight squat pattern',
  },
  'Enfasi quadricipiti con attrezzatura minima': {
    primary: 'Enfasi quadricipiti con attrezzatura minima',
    secondary: 'Minimal-equipment quadriceps emphasis',
  },
};

export const sessionStructureDisplayLabels = {
  generalWarmup: { primary: 'Riscaldamento generale', secondary: 'General warm-up' },
  movementPreparation: {
    primary: 'Preparazione al movimento',
    secondary: 'Movement preparation',
  },
  rampUp: {
    primary: 'Serie di avvicinamento',
    secondary: 'Specific warm-up / ramp-up',
  },
  workingSets: { primary: 'Serie allenanti', secondary: 'Working sets' },
  deloadWeek: { primary: 'Settimana di scarico', secondary: 'Deload week' },
} satisfies Record<string, DisplayLabel>;

export function getPatternDisplayLabel(
  pattern: SelectionPattern | PreparationPattern,
): DisplayLabel {
  return patternDisplayLabels[pattern];
}

export function getEquipmentDisplayLabel(profile: EquipmentProfile): DisplayLabel {
  return equipmentDisplayLabels[profile];
}

export function getMusclePriorityDisplayLabel(priority: MusclePriority): DisplayLabel {
  return musclePriorityDisplayLabels[priority];
}

export function getGoalDisplayLabel(goal: ExerciseGoal): DisplayLabel {
  return goalDisplayLabels[goal];
}

export function getExerciseDisplayLabel(name: string): DisplayLabel {
  return exerciseDisplayLabels[name] ?? { primary: name };
}

export function getWorkLineDisplayLabel(workLine: string): DisplayLabel {
  return workLineDisplayLabels[workLine] ?? { primary: workLine };
}
