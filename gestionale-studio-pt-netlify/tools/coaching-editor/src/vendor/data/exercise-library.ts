export const exercisePatterns = [
  'squat',
  'hinge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
  'core',
  'carry',
  'power',
  'conditioning',
  'mobility',
  'isolation',
  'other',
] as const;

export const exerciseMuscleGroups = [
  'chest',
  'lats_back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
  'mobility',
  'other',
] as const;

export const exerciseEquipment = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'smith_machine',
  'rack',
  'bench',
  'pullup_bar',
  'bands',
  'trx',
  'landmine',
  'medicine_ball',
  'sled',
  'cardio_machine',
  'club',
  'fitball',
  'other',
] as const;

export const exerciseContexts = [
  'technical',
  'fundamental',
  'complementary',
  'isolation',
  'hypertrophy',
  'strength',
  'weak_point',
  'reset',
  'conditioning',
  'power',
] as const;

export type ExercisePattern = (typeof exercisePatterns)[number];
export type ExerciseMuscleGroup = (typeof exerciseMuscleGroups)[number];
export type ExerciseEquipment = (typeof exerciseEquipment)[number];
export type ExerciseContext = (typeof exerciseContexts)[number];

export type ExerciseVideoMetadata = {
  videoProvider: string | null;
  videoUrl: string | null;
  videoLabel: string | null;
  videoVisibility: string | null;
  videoExternalId: string | null;
};

export type ExerciseLibraryRecord = {
  id: string;
  name: string;
  aliases: string[];
  sourceCategories: string[];
  pattern: ExercisePattern;
  primaryMuscleGroup: ExerciseMuscleGroup;
  equipment: ExerciseEquipment[];
  contexts: ExerciseContext[];
  video?: ExerciseVideoMetadata;
};

export type ExerciseLibraryReviewItem = {
  name: string;
  reason: string;
};

const ptExerciseLibrary = {
  'Mobilita / Prehab': ['90/90 anche', '90/90 switch', 'CARs anca', 'CARs spalla', 'CARs caviglia', 'Frog stretch', 'World greatest stretch', 'Allungamento flessori anca', 'Couch stretch', 'Tenuta squat profondo', 'Prying squat', 'Rockback aduttori', 'Mobilita toracica quadrupedia', 'Open book toracico', 'Cat cow', 'Scapular push up', 'Wall slide', 'Wall angel', 'Extrarotazioni elastico', 'Intrarotazioni elastico', 'Band pull apart', 'Face pull elastico', 'Dislocazioni bastone', 'Tibialis raise', 'Mobilita caviglia muro', 'Jefferson curl leggero', 'Shoulder tap plank', 'Bear crawl lento'],
  'Attivazione / Core': ['Dead bug', 'Dead bug con elastico', 'Dead bug contralaterale', 'Bird dog', 'Bird dog row', 'Tenuta hollow', 'Hollow rock', 'Pallof press isometrico', 'Pallof press dinamico', 'Pallof press in affondo', 'Side plank breve', 'Side plank abduzione', 'Plank', 'Plank reach', 'RKC plank', 'Ab wheel', 'Crunch al cavo', 'Sollevamento gambe alla sbarra', 'Glute bridge attivazione', 'Monster walk elastico', 'Lateral band walk', 'Clamshell elastico', 'Scapular pull up', 'Push up plus', 'Y-T-W prone'],
  'Petto - Bilanciere / Multipower': ['Panca piana bilanciere', 'Panca inclinata bilanciere', 'Panca declinata bilanciere', 'Panca presa stretta', 'Panca presa larga', 'Panca con fermo al petto', 'Panca Spoto press', 'Panca floor press bilanciere', 'Panca pin press', 'Panca board press', 'Panca tempo 3-1-1', 'Panca Smith machine piana', 'Panca Smith machine inclinata', 'Panca Smith machine declinata', 'JM press bilanciere'],
  'Petto - Manubri / Macchine': ['Spinte manubri panca piana', 'Spinte manubri panca inclinata', 'Spinte manubri panca declinata', 'Spinte manubri presa neutra', 'Spinte manubri alternate', 'Floor press manubri', 'Chest press', 'Chest press convergente', 'Chest press monolaterale', 'Chest press inclinata', 'Chest press declinata', 'Pec deck', 'Croci manubri panca piana', 'Croci manubri panca inclinata', 'Pullover manubrio', 'Squeeze press manubri'],
  'Petto - Cavi / Corpo libero': ['Croci cavi alti', 'Croci cavi bassi', 'Croci cavi medi', 'Croci cavi monolaterali', 'Cable press monolaterale', 'Piegamenti', 'Piegamenti inclinati', 'Piegamenti declinati', 'Piegamenti presa stretta', 'Piegamenti con pausa', 'Piegamenti zavorrati', 'Dip alle parallele', 'Dip assistite', 'Dip chest focus', 'Ring push up', 'TRX chest press'],
  'Schiena - Trazioni / Lat': ['Lat machine presa larga', 'Lat machine presa stretta', 'Lat machine presa neutra', 'Lat machine inversa', 'Lat machine monolaterale', 'Lat machine kneeling monolaterale', 'Trazioni prone', 'Trazioni supine', 'Trazioni neutre', 'Trazioni assistite', 'Trazioni elastico', 'Trazioni negative', 'Trazioni zavorrate', 'Scapular pull up', 'Pulldown braccia tese al cavo', 'Pulldown corda', 'Pullover macchina', 'Pullover cavo alto'],
  'Schiena - Rematori / Pulley': ['Pulley basso presa larga', 'Pulley basso presa stretta', 'Pulley basso presa neutra', 'Pulley alto', 'Pulley monolaterale', 'Rematore cavo monolaterale', 'Rematore bilanciere', 'Rematore pendlay', 'Rematore T-bar', 'Rematore landmine', 'Rematore Smith machine', 'Rematore manubrio', 'Rematore manubri panca inclinata', 'Rematore chest supported', 'Rematore macchina convergente', 'Rematore macchina monolaterale', 'Seal row', 'Inverted row', 'TRX row', 'Meadows row'],
  'Schiena - Deltoidi posteriori / Trapezi': ['Face pull', 'Face pull alto', 'Face pull con extrarotazione', 'Rematore alto al cavo', 'Rematore alto macchina', 'Croci inverse al cavo', 'Croci inverse manubri', 'Reverse pec deck', 'Alzate posteriori busto flesso', 'Alzate posteriori panca inclinata', 'Y raise al cavo', 'Y raise panca inclinata', 'Trap 3 raise', 'Scrollate manubri', 'Scrollate bilanciere', 'Scrollate Smith machine', 'Farmer shrug', 'Prone cobra'],
  'Spalle - Press': ['Military press', 'Military press seduto', 'Military press Smith machine', 'Push press', 'Strict press manubri', 'Spinte manubri spalle', 'Spinte manubri seduto', 'Shoulder press macchina', 'Shoulder press convergente', 'Arnold press', 'Landmine press', 'Landmine press mezzo inginocchio', 'Z press', 'Pike push up', 'Handstand push up assistito'],
  'Spalle - Alzate / Isolamento': ['Alzate laterali manubri', 'Alzate laterali al cavo', 'Alzate laterali monolaterali', 'Alzate laterali macchina', 'Alzate laterali busto inclinato', 'Alzate laterali parziali', 'Alzate frontali manubri', 'Alzate frontali al cavo', 'Alzate frontali disco', 'Tirate al mento', 'Tirate al mento cavo', 'Cuban press', 'Extrarotazioni spalla cavo', 'Intrarotazioni spalla cavo', 'L raise', 'Scaption raise'],
  Bicipiti: ['Curl bilanciere', 'Curl bilanciere presa larga', 'Curl bilanciere presa stretta', 'Curl barra EZ', 'Curl manubri', 'Curl alternato', 'Curl martello', 'Curl martello cross body', 'Curl inclinato manubri', 'Curl spider manubri', 'Curl spider EZ', 'Curl concentrato', 'Curl panca Scott', 'Curl panca Scott al cavo', 'Curl macchina', 'Curl cavo basso', 'Curl cavo alto', 'Curl bayesian', 'Curl drag', 'Curl Zottman', 'Curl reverse EZ', 'Curl 21'],
  Tricipiti: ['Panca presa stretta', 'Dip alle parallele', 'Dip panchetta', 'Dip assistite', 'Pushdown corda', 'Pushdown barra', 'Pushdown V bar', 'Pushdown monolaterale', 'Pushdown reverse grip', 'Estensioni tricipiti sopra testa al cavo', 'Estensioni tricipiti sopra testa manubrio', 'Estensioni tricipiti corda alto', 'French press bilanciere', 'French press manubri', 'Skull crusher', 'JM press', 'Kickback manubrio', 'Kickback cavo', 'Tate press', 'Estensioni tricipiti macchina'],
  'Gambe - Squat / Quadricipiti': ['Squat', 'Back squat high bar', 'Back squat low bar', 'Front squat', 'Box squat', 'Squat con pausa', 'Tempo squat', 'Pin squat', 'Anderson squat', 'Squat Smith machine', 'Hack squat macchina', 'Hack squat bilanciere', 'Belt squat', 'Goblet squat', 'Landmine squat', 'Sissy squat', 'Spanish squat', 'Cyclist squat', 'Leg press 45', 'Leg press orizzontale', 'Leg press singola', 'Leg extension', 'Leg extension monolaterale', 'Leg extension tempo', 'Wall sit'],
  'Gambe - Affondi / Unilaterali': ['Bulgarian split squat', 'Split squat', 'Split squat Smith machine', 'Affondi manubri', 'Affondi bilanciere', 'Affondi camminati', 'Affondi indietro', 'Affondi laterali', 'Affondi curtsy', 'Step up', 'Step down', 'Pistol squat assistito', 'Skater squat assistito', 'Cossack squat', 'Single leg box squat', 'Leg press monolaterale'],
  'Posteriori Coscia': ['Stacco rumeno', 'Stacco rumeno manubri', 'Stacco rumeno monopodalico', 'Stacco rumeno B-stance', 'Stacco da terra', 'Stacco sumo', 'Stacco trap bar', 'Stacco deficit', 'Rack pull', 'Good morning', 'Good morning safety bar', 'Leg curl sdraiato', 'Leg curl seduto', 'Leg curl in piedi', 'Leg curl monolaterale', 'Nordic curl', 'Nordic curl assistito', 'Glute ham raise', 'Sliding leg curl', 'Fitball leg curl', 'Pull through al cavo', 'Back extension ham focus'],
  'Glutei / Abduttori / Adduttori': ['Hip thrust bilanciere', 'Hip thrust Smith machine', 'Hip thrust manubrio', 'Hip thrust macchina', 'Hip thrust monolaterale', 'Glute bridge', 'Glute bridge bilanciere', 'Glute bridge monolaterale', 'Cable kickback', 'Kickback macchina', 'Abductor machine', 'Adductor machine', 'Abduzioni cavo', 'Adduzioni cavo', 'Frog pump', 'Frog pump elastico', 'Pull through glute focus', 'Step up glute focus', 'Reverse hyper', 'Back extension glute focus', 'Monster walk elastico', 'Lateral band walk'],
  Polpacci: ['Calf raise bilanciere', 'Calf raise manubri', 'Calf raise alla pressa', 'Calf raise in piedi macchina', 'Calf raise Smith machine', 'Calf raise al cavo', 'Calf raise seduto', 'Calf raise seduto manubrio', 'Calf raise monolaterale', 'Donkey calf raise', 'Tibialis raise', 'Tibialis machine', 'Pogo jump', 'Seated calf tempo', 'Standing calf pausa in allungamento'],
  Core: ['Plank', 'RKC plank', 'Side plank', 'Side plank abduzione', 'Dead bug', 'Bird dog', 'Pallof press', 'Pallof press walkout', 'Crunch al cavo', 'Crunch macchina', 'Crunch su fitball', 'Reverse crunch', 'Sollevamento gambe alla sbarra', 'Knee raise alla sbarra', 'Captain chair knee raise', 'Ab wheel', 'Ab wheel ginocchia', 'Rotazioni landmine', 'Hollow body', 'Hollow rock', 'Russian twist kettlebell', 'Woodchopper alto basso', 'Woodchopper basso alto', 'Farmer carry', 'Suitcase carry', 'Overhead carry', 'Front rack carry', 'Bear crawl', 'Mountain climber', 'Dragon flag assistita', 'Stir the pot fitball'],
  'Kettlebell / Clubbell': ['Swing kettlebell', 'Swing kettlebell one arm', 'Clean kettlebell', 'Clean and press kettlebell', 'Snatch kettlebell', 'Press kettlebell', 'Push press kettlebell', 'Turkish get up', 'Windmill', 'Halo', 'Goblet squat kettlebell', 'Front squat doppio kettlebell', 'Rack carry kettlebell', 'Suitcase carry kettlebell', 'Bottom up press', 'Kettlebell row', 'Kettlebell deadlift', 'Kettlebell complex', 'Clubbell shield cast', 'Clubbell swipe'],
  'Power / Pliometria': ['Box jump', 'Broad jump', 'Vertical jump', 'Squat jump', 'Split jump', 'Skater jump', 'Depth jump basso', 'Med ball slam', 'Med ball chest pass', 'Med ball rotational throw', 'Med ball scoop throw', 'Landmine clean', 'Landmine clean and press', 'Hang power clean tecnico', 'High pull bilanciere', 'Jump shrug', 'Sled sprint', 'Prowler push power'],
  'Conditioning / Full Body': ['Air bike', 'Row erg', 'Ski erg', 'Tapis roulant inclinato', 'Assault runner', 'Sled push', 'Sled pull', 'Battle rope', 'Burpee', 'Burpee step back', 'Wall ball', 'Clean landmine', 'Thruster landmine', 'Thruster manubri', 'Thruster kettlebell', 'Man maker', 'Renegade row', 'Devil press', 'Camminata del contadino', 'Complex kettlebell', 'Complex bilanciere', 'TRX squat row', 'TRX atomic push up', 'Step mill', 'Jump rope', 'Bear crawl conditioning'],
} as const;

export const exerciseLibrarySourceCategories = Object.keys(ptExerciseLibrary);

const canonicalNameBySourceName: Record<string, string> = {
  'Push up plus': 'Scapular push up',
  'JM press': 'JM press bilanciere',
  'Leg press monolaterale': 'Leg press singola',
  'Hollow body': 'Tenuta hollow',
  'Camminata del contadino': 'Farmer carry',
  'Clean landmine': 'Landmine clean',
  'Complex kettlebell': 'Kettlebell complex',
};

const additionalAliases: Record<string, string[]> = {
  Piegamenti: ['Push-up'],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase('it');
}

function includesCategory(categories: string[], category: string): boolean {
  return categories.includes(category);
}

function getPattern(name: string, categories: string[]): ExercisePattern {
  const value = normalize(name);

  if (/farmer carry|suitcase carry|overhead carry|front rack carry|rack carry/.test(value)) return 'carry';
  if (/pogo jump/.test(value)) return 'power';
  if (/tibialis/.test(value) && includesCategory(categories, 'Polpacci')) return 'isolation';
  if (/scapular pull up/.test(value) && includesCategory(categories, 'Schiena - Trazioni / Lat')) return 'vertical_pull';
  if (/monster walk|lateral band walk/.test(value) && includesCategory(categories, 'Glutei / Abduttori / Adduttori')) return 'isolation';
  if (includesCategory(categories, 'Power / Pliometria')) return 'power';
  if (includesCategory(categories, 'Conditioning / Full Body')) return 'conditioning';
  if (/pullover/.test(value)) return 'other';
  if (includesCategory(categories, 'Mobilita / Prehab')) return 'mobility';
  if (includesCategory(categories, 'Attivazione / Core') || includesCategory(categories, 'Core')) return 'core';
  if (includesCategory(categories, 'Petto - Bilanciere / Multipower') || includesCategory(categories, 'Petto - Manubri / Macchine') || includesCategory(categories, 'Petto - Cavi / Corpo libero')) {
    return /croci|pec deck/.test(value) ? 'isolation' : 'horizontal_push';
  }
  if (includesCategory(categories, 'Schiena - Trazioni / Lat')) return 'vertical_pull';
  if (includesCategory(categories, 'Schiena - Rematori / Pulley')) return 'horizontal_pull';
  if (includesCategory(categories, 'Schiena - Deltoidi posteriori / Trapezi')) {
    return /rematore|face pull/.test(value) ? 'horizontal_pull' : 'isolation';
  }
  if (includesCategory(categories, 'Spalle - Press')) return 'vertical_push';
  if (includesCategory(categories, 'Spalle - Alzate / Isolamento') || includesCategory(categories, 'Bicipiti')) return 'isolation';
  if (includesCategory(categories, 'Tricipiti')) {
    return /panca presa stretta|dip/.test(value) ? 'horizontal_push' : 'isolation';
  }
  if (includesCategory(categories, 'Gambe - Squat / Quadricipiti')) return /leg extension/.test(value) ? 'isolation' : 'squat';
  if (includesCategory(categories, 'Gambe - Affondi / Unilaterali')) return 'squat';
  if (includesCategory(categories, 'Posteriori Coscia')) {
    return /leg curl|nordic curl|glute ham raise|sliding leg curl|fitball leg curl/.test(value) ? 'isolation' : 'hinge';
  }
  if (includesCategory(categories, 'Glutei / Abduttori / Adduttori')) {
    if (/step up/.test(value)) return 'squat';
    if (/kickback|abductor|adductor|abduzioni|adduzioni|frog pump|monster walk|lateral band walk/.test(value)) return 'isolation';
    return 'hinge';
  }
  if (includesCategory(categories, 'Polpacci')) return 'isolation';
  if (includesCategory(categories, 'Kettlebell / Clubbell')) {
    if (/swing|deadlift/.test(value)) return 'hinge';
    if (/clean|snatch|complex|clubbell/.test(value)) return 'power';
    if (/goblet squat|front squat/.test(value)) return 'squat';
    if (/carry/.test(value)) return 'carry';
    if (/row/.test(value)) return 'horizontal_pull';
    if (/press/.test(value)) return 'vertical_push';
  }
  return 'other';
}

function getPrimaryMuscleGroup(name: string, categories: string[]): ExerciseMuscleGroup {
  const value = normalize(name);

  if (includesCategory(categories, 'Power / Pliometria') || includesCategory(categories, 'Conditioning / Full Body')) return 'full_body';
  if (includesCategory(categories, 'Polpacci')) return 'calves';
  if (includesCategory(categories, 'Schiena - Trazioni / Lat') || includesCategory(categories, 'Schiena - Rematori / Pulley')) return 'lats_back';
  if (includesCategory(categories, 'Mobilita / Prehab')) return 'mobility';
  if (includesCategory(categories, 'Attivazione / Core')) {
    if (/glute|monster walk|lateral band walk|clamshell/.test(value)) return 'glutes';
    if (/scapular|push up plus|y-t-w/.test(value)) return 'shoulders';
    return 'core';
  }
  if (includesCategory(categories, 'Core')) return 'core';
  if (includesCategory(categories, 'Petto - Bilanciere / Multipower') || includesCategory(categories, 'Petto - Manubri / Macchine') || includesCategory(categories, 'Petto - Cavi / Corpo libero')) {
    if (/panca presa stretta|jm press/.test(value)) return 'triceps';
    if (/pullover/.test(value)) return 'other';
    return 'chest';
  }
  if (includesCategory(categories, 'Schiena - Deltoidi posteriori / Trapezi')) return /scrollate|shrug|rematore alto/.test(value) ? 'lats_back' : 'shoulders';
  if (includesCategory(categories, 'Spalle - Press') || includesCategory(categories, 'Spalle - Alzate / Isolamento')) return 'shoulders';
  if (includesCategory(categories, 'Bicipiti')) return 'biceps';
  if (includesCategory(categories, 'Tricipiti')) return 'triceps';
  if (includesCategory(categories, 'Gambe - Squat / Quadricipiti') || includesCategory(categories, 'Gambe - Affondi / Unilaterali')) return 'quadriceps';
  if (includesCategory(categories, 'Posteriori Coscia')) return 'hamstrings';
  if (includesCategory(categories, 'Glutei / Abduttori / Adduttori')) return 'glutes';
  if (includesCategory(categories, 'Kettlebell / Clubbell')) return 'full_body';
  return 'other';
}

function getEquipment(name: string, categories: string[]): ExerciseEquipment[] {
  const value = normalize(name);
  const result: ExerciseEquipment[] = [];
  const add = (...items: ExerciseEquipment[]): void => {
    items.forEach((item) => {
      if (!result.includes(item)) result.push(item);
    });
  };

  if (includesCategory(categories, 'Petto - Bilanciere / Multipower') && !/smith machine/.test(value)) add('barbell');
  if (includesCategory(categories, 'Spalle - Press') && /military press|z press/.test(value) && !/smith machine/.test(value)) add('barbell', 'rack');
  if (includesCategory(categories, 'Gambe - Squat / Quadricipiti') && /back squat|front squat|box squat|squat con pausa|tempo squat|pin squat|anderson squat/.test(value)) add('barbell', 'rack');
  if (/air bike|row erg|ski erg|tapis roulant|assault runner|step mill/.test(value)) add('cardio_machine');
  if (/sled|prowler/.test(value)) add('sled');
  if (/med ball|wall ball/.test(value)) add('medicine_ball');
  if (/kettlebell/.test(value)) add('kettlebell');
  if (/clubbell/.test(value)) add('club');
  if (/landmine/.test(value)) add('landmine');
  if (/trx/.test(value)) add('trx');
  if (/elastico|band pull|band walk/.test(value)) add('bands');
  if (/cavo|cavi|cable|pulley|pushdown|pulldown|woodchopper/.test(value)) add('cable');
  if (/smith machine/.test(value)) add('smith_machine');
  if (/manubri|manubrio/.test(value)) add('dumbbell');
  if (/bilanciere|barra ez|reverse ez|spider ez|safety bar|complex bilanciere|high pull|jump shrug/.test(value)) add('barbell');
  if (/macchina|machine|pressa|leg press|leg extension|leg curl|lat machine|chest press|shoulder press|pec deck|hack squat/.test(value)) add('machine');
  if (/fitball/.test(value)) add('fitball');
  if (/trazioni|sbarra|scapular pull up/.test(value)) add('pullup_bar');
  if (/panca|bench|floor press|seal row|dip panchetta/.test(value)) add('bench');

  if (includesCategory(categories, 'Kettlebell / Clubbell') && result.length === 0) add('kettlebell');
  if ((includesCategory(categories, 'Mobilita / Prehab') || includesCategory(categories, 'Attivazione / Core') || includesCategory(categories, 'Core')) && result.length === 0) add('bodyweight');
  if (includesCategory(categories, 'Petto - Cavi / Corpo libero') && result.length === 0) add('bodyweight');
  if (includesCategory(categories, 'Conditioning / Full Body') && result.length === 0) add('bodyweight');
  if (/pike push up|handstand push up|pistol squat|skater squat|cossack squat|nordic curl|pogo jump/.test(value) && result.length === 0) add('bodyweight');
  if (result.length === 0) add('other');

  if (result.includes('barbell') && /panca|bench/.test(value)) {
    add('bench', 'rack');
  }
  return result;
}

const fundamentalExercises = new Set([
  'Panca piana bilanciere',
  'Back squat high bar',
  'Back squat low bar',
  'Front squat',
  'Stacco da terra',
  'Stacco sumo',
  'Military press',
  'Trazioni prone',
  'Rematore bilanciere',
]);

function getContexts(name: string, pattern: ExercisePattern): ExerciseContext[] {
  const contexts: ExerciseContext[] = [];
  if (fundamentalExercises.has(name)) contexts.push('fundamental', 'strength');
  if (pattern === 'isolation') contexts.push('isolation');
  if (pattern === 'power') contexts.push('power');
  if (pattern === 'conditioning') contexts.push('conditioning');
  if (normalize(name).includes('tecnico') && !contexts.includes('technical')) contexts.push('technical');
  return contexts;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const sourceEntries = Object.entries(ptExerciseLibrary).flatMap(([category, names]) =>
  names.map((name) => ({ category, name })),
);

const canonicalDrafts = new Map<string, { name: string; aliases: Set<string>; sourceCategories: Set<string> }>();

sourceEntries.forEach(({ category, name }) => {
  const canonicalName = canonicalNameBySourceName[name] ?? name;
  const key = normalize(canonicalName);
  const draft = canonicalDrafts.get(key) ?? {
    name: canonicalName,
    aliases: new Set<string>(),
    sourceCategories: new Set<string>(),
  };
  if (name !== canonicalName) draft.aliases.add(name);
  draft.sourceCategories.add(category);
  canonicalDrafts.set(key, draft);
});

Object.entries(additionalAliases).forEach(([name, aliases]) => {
  const draft = canonicalDrafts.get(normalize(name));
  aliases.forEach((alias) => draft?.aliases.add(alias));
});

export const exerciseLibrary: ExerciseLibraryRecord[] = Array.from(canonicalDrafts.values()).map((draft) => {
  const sourceCategories = Array.from(draft.sourceCategories);
  const pattern = getPattern(draft.name, sourceCategories);
  return {
    id: `ex-${slugify(draft.name)}`,
    name: draft.name,
    aliases: Array.from(draft.aliases),
    sourceCategories,
    pattern,
    primaryMuscleGroup: getPrimaryMuscleGroup(draft.name, sourceCategories),
    equipment: getEquipment(draft.name, sourceCategories),
    contexts: getContexts(draft.name, pattern),
  };
});

export const exerciseLibraryReview: ExerciseLibraryReviewItem[] = [
  { name: 'Scapular push up', reason: 'Pattern scapolare non equivalente a un push orizzontale completo.' },
  { name: 'Bird dog row', reason: 'Componente core e tirata orizzontale entrambe rilevanti.' },
  { name: 'Panca presa stretta', reason: 'Gruppo primario dipendente dall’enfasi tecnica tra petto e tricipiti.' },
  { name: 'Dip alle parallele', reason: 'Gruppo primario dipendente dall’inclinazione e dall’esecuzione.' },
  { name: 'Pullover manubrio', reason: 'Pattern e gruppo primario non univoci tra petto e dorsali.' },
  { name: 'Pullover macchina', reason: 'Pattern non sovrapponibile con certezza alla tirata verticale.' },
  { name: 'Pullover cavo alto', reason: 'Pattern non sovrapponibile con certezza alla tirata verticale.' },
  { name: 'Tirate al mento', reason: 'Pattern non univoco nel vocabolario minimale disponibile.' },
  { name: 'Cuban press', reason: 'Movimento tecnico composito, classificato prudentemente come isolamento.' },
  { name: 'Nordic curl', reason: 'Pattern di flessione del ginocchio non rappresentato nel vocabolario corrente.' },
  { name: 'Turkish get up', reason: 'Movimento multi-pattern non riducibile a una sola categoria.' },
  { name: 'Windmill', reason: 'Movimento multi-pattern con componente di mobilità e controllo.' },
  { name: 'Kettlebell complex', reason: 'La composizione concreta può spostare il contesto tra power e conditioning.' },
  { name: 'Renegade row', reason: 'Tirata orizzontale inserita in un contesto full body/conditioning.' },
  { name: 'Bear crawl', reason: 'Può essere usato come core, locomozione o conditioning in base al protocollo.' },
];

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export const exerciseLibraryStats = {
  sourceCount: sourceEntries.length,
  canonicalCount: exerciseLibrary.length,
  mergedCount: sourceEntries.length - exerciseLibrary.length,
  bySourceCategory: Object.fromEntries(
    Object.entries(ptExerciseLibrary).map(([category, names]) => [category, names.length]),
  ),
  byPattern: countBy(exerciseLibrary.map((record) => record.pattern)),
  byPrimaryMuscleGroup: countBy(exerciseLibrary.map((record) => record.primaryMuscleGroup)),
  byPrimaryEquipment: countBy(exerciseLibrary.map((record) => record.equipment[0])),
};
