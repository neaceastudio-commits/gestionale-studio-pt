export type PreparationPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_pull';

export type PreparationExercise = {
  id: string;
  name: string;
  pattern: PreparationPattern;
  function: string;
  targetLimitations: string[];
  setsReps: string;
  cue: string;
  equipment: string;
  videoUrl: null;
};

export const gobletSquatDynamic: PreparationExercise = {
  id: 'PREP-SQ-01',
  name: 'Goblet Squat dinamico',
  pattern: 'squat',
  function: 'Preparazione dinamica e tecnica del pattern squat.',
  targetLimitations: [],
  setsReps: '1 × 6-8',
  cue: 'Scendi in controllo mantenendo appoggio stabile del piede e traiettoria fluida. Non cercare affaticamento.',
  equipment: 'kettlebell/manubrio',
  videoUrl: null,
};

export const kneeToWallDynamic: PreparationExercise = {
  id: 'PREP-SQ-02',
  name: 'Knee-to-Wall dinamico',
  pattern: 'squat',
  function: 'Mobilità dinamica specifica della caviglia.',
  targetLimitations: ['reduced_ankle_dorsiflexion'],
  setsReps: '1 × 8/lato',
  cue: 'Porta il ginocchio in avanti in controllo mantenendo il tallone a terra.',
  equipment: 'parete',
  videoUrl: null,
};

export const heelElevatedSquatDynamic: PreparationExercise = {
  id: 'PREP-SQ-03',
  name: 'Squat dinamico con rialzo talloni',
  pattern: 'squat',
  function: 'Preparazione dinamica e tecnica del pattern squat con la variante tollerata.',
  targetLimitations: ['reduced_ankle_dorsiflexion'],
  setsReps: '1 × 6',
  cue: 'Utilizza il rialzo previsto e ricerca un movimento controllato e tollerabile.',
  equipment: 'rialzo/dischi',
  videoUrl: null,
};

export const hipHingeWithStick: PreparationExercise = {
  id: 'PREP-HI-01',
  name: 'Hip Hinge con bastone',
  pattern: 'hinge',
  function: "Richiamo tecnico del pattern di flessione/estensione d'anca.",
  targetLimitations: [],
  setsReps: '1 × 6-8',
  cue: 'Porta il bacino indietro mantenendo il controllo del tronco e i punti di contatto con il bastone.',
  equipment: 'bastone',
  videoUrl: null,
};

export const hamstringSweepDynamic: PreparationExercise = {
  id: 'PREP-HI-02',
  name: 'Hamstring Sweep dinamico',
  pattern: 'hinge',
  function: 'Preparazione dinamica della catena posteriore.',
  targetLimitations: ['maggiore preparazione dinamica della catena posteriore'],
  setsReps: '1 × 6-8/lato',
  cue: 'Movimento dinamico e controllato, senza mantenere una posizione di stretching statico.',
  equipment: 'corpo libero',
  videoUrl: null,
};

export const scapularPushUp: PreparationExercise = {
  id: 'PREP-HP-01',
  name: 'Scapular Push-up',
  pattern: 'horizontal_push',
  function: 'Preparazione dinamica al pattern di spinta orizzontale.',
  targetLimitations: [],
  setsReps: '1 × 8',
  cue: "Mantieni i gomiti estesi e lascia muovere le scapole in controllo senza perdere l'assetto del tronco.",
  equipment: 'corpo libero',
  videoUrl: null,
};

export const wallSlide: PreparationExercise = {
  id: 'PREP-HP-02',
  name: 'Wall Slide',
  pattern: 'horizontal_push',
  function: 'Richiamo dinamico del controllo scapolare.',
  targetLimitations: ['necessità di controllo scapolare', 'overhead_restriction'],
  setsReps: '1 × 8',
  cue: 'Esegui il movimento in controllo senza forzare il range disponibile.',
  equipment: 'parete',
  videoUrl: null,
};

export const lightTechnicalRow: PreparationExercise = {
  id: 'PREP-HR-01',
  name: 'Row tecnico leggero',
  pattern: 'horizontal_pull',
  function: 'Richiamo tecnico del pattern di tirata orizzontale.',
  targetLimitations: [],
  setsReps: '1 × 8',
  cue: 'Utilizza un carico molto leggero e ricerca traiettoria e controllo senza affaticamento.',
  equipment: 'cavo/macchina/elastico',
  videoUrl: null,
};

export const scapularRow: PreparationExercise = {
  id: 'PREP-HR-02',
  name: 'Scapular Row',
  pattern: 'horizontal_pull',
  function: 'Richiamo del controllo scapolare nella tirata orizzontale.',
  targetLimitations: ['deficit di controllo scapolare'],
  setsReps: '1 × 8-10',
  cue: 'Muovi le scapole in controllo evitando di trasformare il movimento in una tirata pesante.',
  equipment: 'cavo/elastico',
  videoUrl: null,
};

export const lightTechnicalPulldown: PreparationExercise = {
  id: 'PREP-VP-01',
  name: 'Pulldown tecnico leggero',
  pattern: 'vertical_pull',
  function: 'Richiamo tecnico del pattern di tirata verticale.',
  targetLimitations: [],
  setsReps: '1 × 8',
  cue: 'Utilizza un carico molto leggero e prepara il gesto senza arrivare vicino alla fatica.',
  equipment: 'lat machine/cavo',
  videoUrl: null,
};

export const scapularPulldown: PreparationExercise = {
  id: 'PREP-VP-02',
  name: 'Scapular Pulldown',
  pattern: 'vertical_pull',
  function: 'Richiamo del controllo scapolare nella tirata verticale.',
  targetLimitations: ['necessità di controllo scapolare'],
  setsReps: '1 × 8',
  cue: 'Esegui il movimento scapolare in controllo senza trasformarlo in una serie allenante.',
  equipment: 'lat machine/cavo',
  videoUrl: null,
};

export const preparationLibrary: PreparationExercise[] = [
  gobletSquatDynamic,
  kneeToWallDynamic,
  heelElevatedSquatDynamic,
  hipHingeWithStick,
  hamstringSweepDynamic,
  scapularPushUp,
  wallSlide,
  lightTechnicalRow,
  scapularRow,
  lightTechnicalPulldown,
  scapularPulldown,
];
