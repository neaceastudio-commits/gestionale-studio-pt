export const progressionCategories = [
  'technical',
  'strength',
  'hypertrophy',
  'volume',
  'intensity',
  'density',
  'advanced',
  'reset',
  'other',
] as const;

export const progressionSuitableFor = [
  'fundamental',
  'complementary',
  'isolation',
  'technical',
  'power',
  'other',
] as const;

export type ProgressionCategory = (typeof progressionCategories)[number];
export type ProgressionSuitableFor = (typeof progressionSuitableFor)[number];

export type ProgressionWeek = {
  sets: string;
  reps: string;
  rirRpe: string;
  recovery: string;
  note: string;
};

export type ProgressionRecord = {
  id: string;
  name: string;
  category: ProgressionCategory;
  description: string;
  suitableFor: ProgressionSuitableFor[];
  weeks: [ProgressionWeek, ProgressionWeek, ProgressionWeek, ProgressionWeek, ProgressionWeek, ProgressionWeek];
};

export type ProgressionLibraryReviewItem = {
  name: string;
  reason: string;
};

type SourceGroup = 'Tecnica' | 'Forza' | 'Ipertrofia' | 'Densita' | 'Core' | 'Power' | 'Circuiti' | 'Scarico';

type SourceProgression = {
  name: string;
  sessions: readonly [string, string, string, string, string, string];
};

// Copia locale autonoma di PROGRESSION_LIBRARY dal Portale Personal Trainer.
// Le stringhe delle sei sessioni sono mantenute senza aggiungere prescrizioni mancanti.
const sourceProgressions: Record<SourceGroup, readonly SourceProgression[]> = {
  Tecnica: [
    { name: 'Circuito Tecnico Base', sessions: ['2x10', '2x10', '3x10', '3x10', '3x12', '3x12'] },
    { name: 'Ladder Tecnico', sessions: ['2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)'] },
    { name: 'Progressione Lineare Tecnica', sessions: ['3x8', '3x9', '3x10', '4x8', '4x9', '4x10'] },
    { name: 'Apprendimento Pattern', sessions: ['4x6 lente', '4x7 lente', '4x8', '5x6', '5x7', '5x8'] },
    { name: 'Isometria + Dinamica', sessions: ['3x6 iso 2"', '3x7 iso 2"', '4x6 iso 2"', '4x7', '4x8', '5x6'] },
    { name: 'Tecnica con Fermo', sessions: ['3x6 fermo 2"', '4x5 fermo 2"', '4x6 fermo 2"', '5x5 fermo 1"', '5x6 fermo 1"', '4x8 fluide'] },
    { name: 'Eccentrica Controllata', sessions: ['3x8 ecc 4"', '3x9 ecc 4"', '4x8 ecc 3"', '4x9 ecc 3"', '5x8 ecc 3"', '4x10 fluide'] },
    { name: 'ROM Progressivo', sessions: ['3x8 ROM parziale', '3x10 ROM parziale', '4x8 ROM medio', '4x10 ROM medio', '4x8 ROM completo', '4x10 ROM completo'] },
    { name: 'Ramp Tecnico', sessions: ['5x5 RPE6', '5x5 RPE6.5', '5x4 RPE7', '6x4 RPE7', '5x3 RPE7.5', '4x5 RPE6'] },
    { name: 'Contrasto Tecnico', sessions: ['3x6 lento + 6 fluide', '3x7 lento + 7 fluide', '4x6 lento + 6 fluide', '4x7 lento + 7 fluide', '5x6 fluide', '5x8 fluide'] },
  ],
  Forza: [
    { name: 'Forza 5x5 Progressiva', sessions: ['5x5 @70%', '5x5 @72%', '5x5 @74%', '5x5 @76%', '5x5 @80%', '5x5 @82%'] },
    { name: 'Cluster Tecnico Forza', sessions: ['4x(2+2+2) @72%', '4x(2+2+2) @75%', '4x(2+2+2) @75%', '4x(2+2+2) @77%', '4x(2+2+2) @77%', '4x(2+2+2) @78%'] },
    { name: 'Top Set + Back Off', sessions: ['1x5@75%+2x6@65%', '1x5@77%+2x6@65%', '1x4@80%+3x6@68%', '1x4@82%+3x6@68%', '1x3@85%+3x5@70%', '1x3@85%+3x5@70%'] },
    { name: 'Doppia Progressione Forza', sessions: ['4x4 RIR2', '4x5 RIR2', '5x4 RIR2', '5x5 RIR1', '6x4 RIR1', '6x5 RIR1'] },
    { name: 'Wave Loading', sessions: ['6/4/2 x2', '5/3/2 x2', '6/4/2 x3', '5/3/1 x3', '4/3/2 x3', '3/2/1 x3'] },
    { name: 'Forza 3x5 Lineare', sessions: ['3x5 RIR3', '3x5 RIR2', '4x5 RIR2', '4x5 RIR1', '5x5 RIR1', '3x5 RIR3'] },
    { name: '5/3/1 Base', sessions: ['5x65/75/85%', '3x70/80/90%', '5/3/1 75/85/95%', '5x40/50/60%', '5x70/80/90%', '3x75/85/95%'] },
    { name: 'Heavy Single + Volume', sessions: ['1x1 RPE7 + 4x5', '1x1 RPE7.5 + 4x4', '1x1 RPE8 + 5x3', '1x1 RPE8 + 4x3', '1x1 RPE8.5 + 3x3', '3x5 RPE6'] },
    { name: 'Cluster Forza Massimale', sessions: ['5x(1+1+1) @80%', '5x(1+1+1) @82%', '6x(1+1+1) @82%', '5x(1+1) @85%', '6x(1+1) @85%', '4x3 @75%'] },
    { name: 'Rest Pause Forza', sessions: ['4x3+1 RIR2', '4x3+1 RIR1', '5x3+1 RIR1', '4x2+2 RIR1', '5x2+2 RIR1', '3x5 RIR3'] },
    { name: 'Progressione RPE', sessions: ['4x6 RPE6', '4x6 RPE7', '5x5 RPE7', '5x4 RPE8', '6x3 RPE8', '3x6 RPE6'] },
    { name: 'Piramidale Forza', sessions: ['8/6/4/4', '8/6/4/3', '6/5/4/3', '5/4/3/2', '4/3/2/2', '3x6 back off'] },
    { name: 'Tripla Progressione Forza', sessions: ['4x3 RIR2', '4x4 RIR2', '4x5 RIR2', '5x3 RIR1', '5x4 RIR1', '5x5 RIR1'] },
  ],
  Ipertrofia: [
    { name: 'Ipertrofia Lineare', sessions: ['4x8 @65%', '4x9 @67%', '4x10 @70%', '5x8 @72%', '5x9 @72%', '5x10 @74%'] },
    { name: 'Complementare Progressiva', sessions: ['3x10', '3x11', '3x12', '4x10', '4x11', '4x12'] },
    { name: 'Rest Pause Ipertrofia', sessions: ['3x10 (4-3)', '3x11 (4-3)', '3x12 (4-3)', '4x10 (4-3)', '4x11 (4-3)', '4x12 (4-3)'] },
    { name: 'Doppia Progressione 8-12', sessions: ['3x8 RIR2', '3x10 RIR2', '3x12 RIR2', '4x8 RIR1', '4x10 RIR1', '4x12 RIR1'] },
    { name: 'Accumulo Volume', sessions: ['3x10', '4x10', '4x12', '5x10', '5x12', '6x10'] },
    { name: 'Doppia Progressione 6-10', sessions: ['3x6 RIR2', '3x8 RIR2', '3x10 RIR2', '4x6 RIR1', '4x8 RIR1', '4x10 RIR1'] },
    { name: 'Doppia Progressione 10-15', sessions: ['3x10 RIR2', '3x12 RIR2', '3x15 RIR2', '4x10 RIR1', '4x12 RIR1', '4x15 RIR1'] },
    { name: 'Reverse Pyramid Hypertrophy', sessions: ['8/10/12', '8/10/12 +kg', '7/9/11 +kg', '8/10/12 +kg', '6/8/10 +kg', '3x12 scarico'] },
    { name: 'Top Set + Back Off Ipertrofia', sessions: ['1x8 + 2x10', '1x8 + 3x10', '1x7 + 3x10', '1x6 + 3x12', '1x6 + 4x10', '3x10 facile'] },
    { name: 'Myo Reps Ipertrofia', sessions: ['1x15+3x5', '1x16+3x5', '1x17+4x5', '1x18+4x5', '1x20+5x5', '2x12 pulite'] },
    { name: 'Drop Set Finale', sessions: ['3x10 + drop', '3x11 + drop', '4x10 + drop', '4x12 + drop', '5x10 + drop', '3x12 no drop'] },
    { name: 'Mechanical Drop Set', sessions: ['3 sequenze', '3 sequenze +rip', '4 sequenze', '4 sequenze +rip', '5 sequenze', '3 sequenze pulite'] },
    { name: 'Pre Exhaust', sessions: ['Iso 2x15 + base 3x8', 'Iso 3x15 + base 3x8', 'Iso 3x12 + base 4x8', 'Iso 3x15 + base 4x10', 'Iso 4x12 + base 4x10', 'Base 3x10'] },
    { name: 'Giant Set Ipertrofia', sessions: ['3 giri x 3 ex', '3 giri +rip', '4 giri x 3 ex', '4 giri +rip', '5 giri densita', '3 giri scarico'] },
    { name: 'Specializzazione Pump', sessions: ['4x15 60"', '4x18 60"', '5x15 60"', '5x18 45"', '6x15 45"', '3x15 75"'] },
  ],
  Densita: [
    { name: 'Densita Progressiva', sessions: ['5x8 (120")', '5x8 (105")', '6x8 (90")', '6x8 (75")', '7x8 (75")', '8x8 (60")'] },
    { name: 'Myo Reps', sessions: ['1x15+3x5', '1x16+3x5', '1x17+4x5', '1x18+4x5', '1x19+5x5', '1x20+5x5'] },
    { name: 'EMOM Tecnico', sessions: ['8x5 EMOM', '10x5 EMOM', '10x6 EMOM', '12x5 EMOM', '12x6 EMOM', '14x5 EMOM'] },
    { name: 'Tempo Density', sessions: ['4x8 90"', '4x8 75"', '5x8 75"', '5x8 60"', '6x8 60"', '6x10 60"'] },
    { name: 'AMRAP Controllato', sessions: ['3xAMRAP RIR3', '3xAMRAP RIR2', '4xAMRAP RIR2', '4xAMRAP RIR1', '5xAMRAP RIR1', '3x10 RIR3'] },
    { name: 'EDT 10 Minuti', sessions: ['10 min coppia ex', '10 min +rip', '12 min coppia ex', '12 min +rip', '15 min coppia ex', '10 min facile'] },
    { name: 'Circuito Metabolico', sessions: ['3 giri 40/20', '3 giri 45/15', '4 giri 40/20', '4 giri 45/15', '5 giri 40/20', '3 giri 30/30'] },
    { name: 'Density Ladder', sessions: ['1-2-3 x10 min', '1-2-3 x12 min', '2-3-4 x10 min', '2-3-4 x12 min', '3-4-5 x10 min', '1-2-3 x8 min'] },
    { name: 'Rest Reduction', sessions: ['4x12 90"', '4x12 75"', '4x12 60"', '5x12 60"', '5x12 45"', '3x12 90"'] },
    { name: 'Metabolic Finisher', sessions: ['6 min easy', '8 min easy', '10 min medio', '12 min medio', '12 min forte', '6 min easy'] },
  ],
  Core: [
    { name: 'Core Stabilita', sessions: ['3x25"', '3x30"', '2x25"/lat', '2x30"/lat', '3x20"', '3x25"'] },
    { name: 'Core Circuito', sessions: ['2 giri x 3 ex', '2 giri (rip+)', '3 giri', '3 giri (rip+)', '3 giri', '3-4 giri'] },
    { name: 'Anti Rotazione', sessions: ['3x10/lat', '3x12/lat', '4x10/lat', '4x12/lat', '5x10/lat', '5x12/lat'] },
    { name: 'Core Anti Estensione', sessions: ['3x20"', '3x25"', '3x30"', '4x25"', '4x30"', '3x20"'] },
    { name: 'Core Carry', sessions: ['4x20m', '4x25m', '5x20m', '5x25m', '6x20m', '4x20m facile'] },
    { name: 'Core Rotazionale', sessions: ['3x8/lat', '3x10/lat', '4x8/lat', '4x10/lat', '5x8/lat', '3x8/lat facile'] },
    { name: 'Core Bracing Forza', sessions: ['5x10"', '6x10"', '5x15"', '6x15"', '8x10"', '4x10"'] },
    { name: 'Core Dinamico', sessions: ['3x10', '3x12', '4x10', '4x12', '5x10', '3x10 facile'] },
  ],
  Power: [
    { name: 'Power Bassa Ripetizione', sessions: ['6x3 esplosive', '7x3 esplosive', '8x2 esplosive', '8x3 esplosive', '10x2 esplosive', '5x3 facili'] },
    { name: 'Pliometria Progressiva', sessions: ['4x3 basso impatto', '5x3', '5x4', '6x3', '6x4', '4x3 controllo'] },
    { name: 'Contrasto Forza Power', sessions: ['3x3 forza + 3 jump', '4x3 + 3 jump', '4x2 + 4 jump', '5x2 + 4 jump', '5x1 + 5 jump', '3x3 controllo'] },
    { name: 'Med Ball Power', sessions: ['5x4', '6x4', '6x5', '8x4', '8x5', '5x4 easy'] },
    { name: 'Speed Strength', sessions: ['8x3 @50%', '8x3 @55%', '10x2 @60%', '10x2 @65%', '12x2 @60%', '6x3 @50%'] },
  ],
  Circuiti: [
    { name: 'Circuito Base 3 Stazioni', sessions: ['3 giri 10-10-10', '3 giri 12-12-12', '4 giri 10-10-10', '4 giri 12-12-12', '5 giri 10-10-10', '3 giri easy'] },
    { name: 'Circuito Upper Lower Core', sessions: ['3 giri', '3 giri +rip', '4 giri', '4 giri +rip', '5 giri', '3 giri scarico'] },
    { name: 'Circuito A Tempo', sessions: ['30/30 x3', '35/25 x3', '40/20 x3', '40/20 x4', '45/15 x4', '30/30 x3'] },
    { name: 'Circuito Forza Resistente', sessions: ['4x8 + 60"', '4x10 + 60"', '5x8 + 60"', '5x10 + 45"', '6x8 + 45"', '3x8 + 75"'] },
    { name: 'Circuito Dimagrimento', sessions: ['20 min RPE6', '22 min RPE6', '24 min RPE7', '26 min RPE7', '28 min RPE7', '20 min RPE6'] },
  ],
  Scarico: [
    { name: 'Volume Minimo', sessions: ['3x8', '3x8', '3x8', '3x8', '3x8', '3x8'] },
    { name: 'Buffer Alto Costante', sessions: ['3x8@65%', '3x8', '3x8', '3x8', '3x8', '3x8'] },
    { name: 'Deload Tecnico', sessions: ['2x8 RIR4', '2x10 RIR4', '3x8 RIR4', '3x10 RIR4', '2x8 RIR5', '2x10 RIR5'] },
    { name: 'Scarico Volume 50%', sessions: ['2x8 RIR4', '2x8 RIR4', '2x10 RIR4', '3x8 RIR4', '2x8 RIR5', '2x10 RIR5'] },
    { name: 'Scarico Intensita', sessions: ['3x8 @55%', '3x8 @60%', '3x10 @55%', '3x10 @60%', '2x12 @50%', '3x8 @55%'] },
    { name: 'Reset Tecnico', sessions: ['3x6 lente', '3x8 lente', '4x6 lente', '4x8 lente', '3x10 fluide', '3x6 lente'] },
    { name: 'Recupero Attivo', sessions: ['2 giri easy', '2 giri +mob', '3 giri easy', '3 giri +mob', '20 min easy', '2 giri easy'] },
  ],
};

const sourceGroupCategory: Record<SourceGroup, ProgressionCategory> = {
  Tecnica: 'technical',
  Forza: 'strength',
  Ipertrofia: 'hypertrophy',
  Densita: 'density',
  Core: 'other',
  Power: 'other',
  Circuiti: 'other',
  Scarico: 'reset',
};

const isolationProgressions = new Set([
  'Rest Pause Ipertrofia',
  'Myo Reps Ipertrofia',
  'Drop Set Finale',
  'Mechanical Drop Set',
  'Pre Exhaust',
  'Specializzazione Pump',
  'Myo Reps',
]);

const fundamentalProgressions = new Set(['Top Set + Back Off Ipertrofia']);
const technicalProgressions = new Set(['EMOM Tecnico']);
const recoveryProgressions = new Set([
  'Specializzazione Pump',
  'Densita Progressiva',
  'Tempo Density',
  'Rest Reduction',
  'Circuito Forza Resistente',
]);

function getSuitableFor(group: SourceGroup, name: string): ProgressionSuitableFor[] {
  if (group === 'Tecnica' || technicalProgressions.has(name)) return ['technical'];
  if (group === 'Forza' || fundamentalProgressions.has(name)) return ['fundamental'];
  if (group === 'Power') return ['power'];
  if (isolationProgressions.has(name)) return ['isolation'];
  if (group === 'Ipertrofia') return ['complementary'];
  return ['other'];
}

function normalizeSession(name: string, source: string): ProgressionWeek {
  let remaining = source.trim();
  let rirRpe = '';
  let recovery = '';
  let sets = '';
  let reps = '';

  const effort = remaining.match(/\b(?:RIR|RPE)\s?\d+(?:\.\d+)?\b/i);
  if (effort) {
    rirRpe = effort[0].replace(/\s+/g, '').toUpperCase();
    remaining = remaining.replace(effort[0], ' ').replace(/\s+/g, ' ').trim();
  }

  if (recoveryProgressions.has(name)) {
    const recoveryMatch = remaining.match(/(?:\(|\+\s*)?(\d+)"\)?$/);
    if (recoveryMatch) {
      recovery = `${recoveryMatch[1]} sec`;
      remaining = remaining.slice(0, recoveryMatch.index).replace(/[\s+(]+$/, '').trim();
    }
  }

  const simplePrescription = remaining.match(/^(\d+)x([A-Za-z0-9]+(?:\/lat)?)/);
  if (simplePrescription) {
    sets = simplePrescription[1];
    reps = simplePrescription[2];
    remaining = remaining.slice(simplePrescription[0].length).trim();
  }

  return { sets, reps, rirRpe, recovery, note: remaining };
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const progressionLibrary: ProgressionRecord[] = Object.entries(sourceProgressions).flatMap(
  ([groupValue, records]) => {
    const group = groupValue as SourceGroup;
    return records.map((record) => ({
      id: `prog-${slugify(record.name)}`,
      name: record.name,
      category: sourceGroupCategory[group],
      description: `Preset PT di sei settimane (${group}): ${record.sessions[0]} → ${record.sessions[5]}.`,
      suitableFor: getSuitableFor(group, record.name),
      weeks: record.sessions.map((session) => normalizeSession(record.name, session)) as ProgressionRecord['weeks'],
    }));
  },
);

export const progressionLibraryReview: ProgressionLibraryReviewItem[] = [];
