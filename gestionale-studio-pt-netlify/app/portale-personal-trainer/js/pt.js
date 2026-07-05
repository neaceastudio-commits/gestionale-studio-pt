const SUPABASE_URL = 'https://cdywqyqqmjhgkzwrrixc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x55VTWLsaSYprArqVIluDQ_oUg3RO24';

const NEACEA_BLOCKS = [
  ['N0', 'Tecnico'],
  ['N1', 'Forza'],
  ['N2', 'Ipertrofia'],
  ['N3', 'Carenze'],
  ['N4', 'Neurale'],
  ['N5', 'Overload'],
  ['N6', 'Reset'],
  ['N7', 'Definizione'],
  ['N8', 'Neurale/peak'],
  ['N9', 'Neurale/peak avanzato'],
  ['N10', 'Metabolico/specifico'],
  ['N11', 'Core/controllo'],
];

const EXERCISE_LIBRARY = {
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
};

const PROGRESSION_LIBRARY = {
  Tecnica: [
    { name: 'Circuito Tecnico Base', tut: '2/1/1/1', sessions: ['2x10', '2x10', '3x10', '3x10', '3x12', '3x12'] },
    { name: 'Ladder Tecnico', tut: '2/1/1/1', sessions: ['2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)', '2x5 (4-3-2)'] },
    { name: 'Progressione Lineare Tecnica', tut: '1/1/1/1', sessions: ['3x8', '3x9', '3x10', '4x8', '4x9', '4x10'] },
    { name: 'Apprendimento Pattern', tut: '3/1/1/1', sessions: ['4x6 lente', '4x7 lente', '4x8', '5x6', '5x7', '5x8'] },
    { name: 'Isometria + Dinamica', tut: '3/2/1/1', sessions: ['3x6 iso 2"', '3x7 iso 2"', '4x6 iso 2"', '4x7', '4x8', '5x6'] },
    { name: 'Tecnica con Fermo', tut: '3/2/1/1', sessions: ['3x6 fermo 2"', '4x5 fermo 2"', '4x6 fermo 2"', '5x5 fermo 1"', '5x6 fermo 1"', '4x8 fluide'] },
    { name: 'Eccentrica Controllata', tut: '4/1/1/1', sessions: ['3x8 ecc 4"', '3x9 ecc 4"', '4x8 ecc 3"', '4x9 ecc 3"', '5x8 ecc 3"', '4x10 fluide'] },
    { name: 'ROM Progressivo', tut: '3/1/1/1', sessions: ['3x8 ROM parziale', '3x10 ROM parziale', '4x8 ROM medio', '4x10 ROM medio', '4x8 ROM completo', '4x10 ROM completo'] },
    { name: 'Ramp Tecnico', tut: '2/1/1/1', sessions: ['5x5 RPE6', '5x5 RPE6.5', '5x4 RPE7', '6x4 RPE7', '5x3 RPE7.5', '4x5 RPE6'] },
    { name: 'Contrasto Tecnico', tut: '2/2/1/1', sessions: ['3x6 lento + 6 fluide', '3x7 lento + 7 fluide', '4x6 lento + 6 fluide', '4x7 lento + 7 fluide', '5x6 fluide', '5x8 fluide'] },
  ],
  Forza: [
    { name: 'Forza 5x5 Progressiva', tut: '2/1/1/1', sessions: ['5x5 @70%', '5x5 @72%', '5x5 @74%', '5x5 @76%', '5x5 @80%', '5x5 @82%'] },
    { name: 'Cluster Tecnico Forza', tut: '1/1/1/1', sessions: ['4x(2+2+2) @72%', '4x(2+2+2) @75%', '4x(2+2+2) @75%', '4x(2+2+2) @77%', '4x(2+2+2) @77%', '4x(2+2+2) @78%'] },
    { name: 'Top Set + Back Off', tut: '2/1/1/1', sessions: ['1x5@75%+2x6@65%', '1x5@77%+2x6@65%', '1x4@80%+3x6@68%', '1x4@82%+3x6@68%', '1x3@85%+3x5@70%', '1x3@85%+3x5@70%'] },
    { name: 'Doppia Progressione Forza', tut: '2/1/1/1', sessions: ['4x4 RIR2', '4x5 RIR2', '5x4 RIR2', '5x5 RIR1', '6x4 RIR1', '6x5 RIR1'] },
    { name: 'Wave Loading', tut: '1/1/1/1', sessions: ['6/4/2 x2', '5/3/2 x2', '6/4/2 x3', '5/3/1 x3', '4/3/2 x3', '3/2/1 x3'] },
    { name: 'Forza 3x5 Lineare', tut: '2/1/1/1', sessions: ['3x5 RIR3', '3x5 RIR2', '4x5 RIR2', '4x5 RIR1', '5x5 RIR1', '3x5 RIR3'] },
    { name: '5/3/1 Base', tut: '2/1/1/1', sessions: ['5x65/75/85%', '3x70/80/90%', '5/3/1 75/85/95%', '5x40/50/60%', '5x70/80/90%', '3x75/85/95%'] },
    { name: 'Heavy Single + Volume', tut: '1/1/1/1', sessions: ['1x1 RPE7 + 4x5', '1x1 RPE7.5 + 4x4', '1x1 RPE8 + 5x3', '1x1 RPE8 + 4x3', '1x1 RPE8.5 + 3x3', '3x5 RPE6'] },
    { name: 'Cluster Forza Massimale', tut: '1/1/1/1', sessions: ['5x(1+1+1) @80%', '5x(1+1+1) @82%', '6x(1+1+1) @82%', '5x(1+1) @85%', '6x(1+1) @85%', '4x3 @75%'] },
    { name: 'Rest Pause Forza', tut: '1/1/1/1', sessions: ['4x3+1 RIR2', '4x3+1 RIR1', '5x3+1 RIR1', '4x2+2 RIR1', '5x2+2 RIR1', '3x5 RIR3'] },
    { name: 'Progressione RPE', tut: '2/1/1/1', sessions: ['4x6 RPE6', '4x6 RPE7', '5x5 RPE7', '5x4 RPE8', '6x3 RPE8', '3x6 RPE6'] },
    { name: 'Piramidale Forza', tut: '2/1/1/1', sessions: ['8/6/4/4', '8/6/4/3', '6/5/4/3', '5/4/3/2', '4/3/2/2', '3x6 back off'] },
    { name: 'Tripla Progressione Forza', tut: '2/1/1/1', sessions: ['4x3 RIR2', '4x4 RIR2', '4x5 RIR2', '5x3 RIR1', '5x4 RIR1', '5x5 RIR1'] },
  ],
  Ipertrofia: [
    { name: 'Ipertrofia Lineare', tut: '2/1/1/1', sessions: ['4x8 @65%', '4x9 @67%', '4x10 @70%', '5x8 @72%', '5x9 @72%', '5x10 @74%'] },
    { name: 'Complementare Progressiva', tut: '1/1/1/1', sessions: ['3x10', '3x11', '3x12', '4x10', '4x11', '4x12'] },
    { name: 'Rest Pause Ipertrofia', tut: '1/1/1/1', sessions: ['3x10 (4-3)', '3x11 (4-3)', '3x12 (4-3)', '4x10 (4-3)', '4x11 (4-3)', '4x12 (4-3)'] },
    { name: 'Doppia Progressione 8-12', tut: '2/1/1/1', sessions: ['3x8 RIR2', '3x10 RIR2', '3x12 RIR2', '4x8 RIR1', '4x10 RIR1', '4x12 RIR1'] },
    { name: 'Accumulo Volume', tut: '2/1/1/1', sessions: ['3x10', '4x10', '4x12', '5x10', '5x12', '6x10'] },
    { name: 'Doppia Progressione 6-10', tut: '2/1/1/1', sessions: ['3x6 RIR2', '3x8 RIR2', '3x10 RIR2', '4x6 RIR1', '4x8 RIR1', '4x10 RIR1'] },
    { name: 'Doppia Progressione 10-15', tut: '2/1/1/1', sessions: ['3x10 RIR2', '3x12 RIR2', '3x15 RIR2', '4x10 RIR1', '4x12 RIR1', '4x15 RIR1'] },
    { name: 'Reverse Pyramid Hypertrophy', tut: '2/1/1/1', sessions: ['8/10/12', '8/10/12 +kg', '7/9/11 +kg', '8/10/12 +kg', '6/8/10 +kg', '3x12 scarico'] },
    { name: 'Top Set + Back Off Ipertrofia', tut: '2/1/1/1', sessions: ['1x8 + 2x10', '1x8 + 3x10', '1x7 + 3x10', '1x6 + 3x12', '1x6 + 4x10', '3x10 facile'] },
    { name: 'Myo Reps Ipertrofia', tut: '2/1/1/1', sessions: ['1x15+3x5', '1x16+3x5', '1x17+4x5', '1x18+4x5', '1x20+5x5', '2x12 pulite'] },
    { name: 'Drop Set Finale', tut: '2/1/1/1', sessions: ['3x10 + drop', '3x11 + drop', '4x10 + drop', '4x12 + drop', '5x10 + drop', '3x12 no drop'] },
    { name: 'Mechanical Drop Set', tut: '2/1/1/1', sessions: ['3 sequenze', '3 sequenze +rip', '4 sequenze', '4 sequenze +rip', '5 sequenze', '3 sequenze pulite'] },
    { name: 'Pre Exhaust', tut: '2/1/1/1', sessions: ['Iso 2x15 + base 3x8', 'Iso 3x15 + base 3x8', 'Iso 3x12 + base 4x8', 'Iso 3x15 + base 4x10', 'Iso 4x12 + base 4x10', 'Base 3x10'] },
    { name: 'Giant Set Ipertrofia', tut: '2/1/1/1', sessions: ['3 giri x 3 ex', '3 giri +rip', '4 giri x 3 ex', '4 giri +rip', '5 giri densita', '3 giri scarico'] },
    { name: 'Specializzazione Pump', tut: '2/1/1/1', sessions: ['4x15 60"', '4x18 60"', '5x15 60"', '5x18 45"', '6x15 45"', '3x15 75"'] },
  ],
  Densita: [
    { name: 'Densita Progressiva', tut: '2/1/1/1', sessions: ['5x8 (120")', '5x8 (105")', '6x8 (90")', '6x8 (75")', '7x8 (75")', '8x8 (60")'] },
    { name: 'Myo Reps', tut: '2/1/1/1', sessions: ['1x15+3x5', '1x16+3x5', '1x17+4x5', '1x18+4x5', '1x19+5x5', '1x20+5x5'] },
    { name: 'EMOM Tecnico', tut: '1/1/1/1', sessions: ['8x5 EMOM', '10x5 EMOM', '10x6 EMOM', '12x5 EMOM', '12x6 EMOM', '14x5 EMOM'] },
    { name: 'Tempo Density', tut: '3/1/1/1', sessions: ['4x8 90"', '4x8 75"', '5x8 75"', '5x8 60"', '6x8 60"', '6x10 60"'] },
    { name: 'AMRAP Controllato', tut: '2/1/1/1', sessions: ['3xAMRAP RIR3', '3xAMRAP RIR2', '4xAMRAP RIR2', '4xAMRAP RIR1', '5xAMRAP RIR1', '3x10 RIR3'] },
    { name: 'EDT 10 Minuti', tut: '2/1/1/1', sessions: ['10 min coppia ex', '10 min +rip', '12 min coppia ex', '12 min +rip', '15 min coppia ex', '10 min facile'] },
    { name: 'Circuito Metabolico', tut: '2/1/1/1', sessions: ['3 giri 40/20', '3 giri 45/15', '4 giri 40/20', '4 giri 45/15', '5 giri 40/20', '3 giri 30/30'] },
    { name: 'Density Ladder', tut: '2/1/1/1', sessions: ['1-2-3 x10 min', '1-2-3 x12 min', '2-3-4 x10 min', '2-3-4 x12 min', '3-4-5 x10 min', '1-2-3 x8 min'] },
    { name: 'Rest Reduction', tut: '2/1/1/1', sessions: ['4x12 90"', '4x12 75"', '4x12 60"', '5x12 60"', '5x12 45"', '3x12 90"'] },
    { name: 'Metabolic Finisher', tut: '1/1/1/1', sessions: ['6 min easy', '8 min easy', '10 min medio', '12 min medio', '12 min forte', '6 min easy'] },
  ],
  Core: [
    { name: 'Core Stabilita', tut: '2/1/2/1', sessions: ['3x25"', '3x30"', '2x25"/lat', '2x30"/lat', '3x20"', '3x25"'] },
    { name: 'Core Circuito', tut: '2/1/2/1', sessions: ['2 giri x 3 ex', '2 giri (rip+)', '3 giri', '3 giri (rip+)', '3 giri', '3-4 giri'] },
    { name: 'Anti Rotazione', tut: '2/1/2/1', sessions: ['3x10/lat', '3x12/lat', '4x10/lat', '4x12/lat', '5x10/lat', '5x12/lat'] },
    { name: 'Core Anti Estensione', tut: '2/1/2/1', sessions: ['3x20"', '3x25"', '3x30"', '4x25"', '4x30"', '3x20"'] },
    { name: 'Core Carry', tut: '1/1/1/1', sessions: ['4x20m', '4x25m', '5x20m', '5x25m', '6x20m', '4x20m facile'] },
    { name: 'Core Rotazionale', tut: '2/1/1/1', sessions: ['3x8/lat', '3x10/lat', '4x8/lat', '4x10/lat', '5x8/lat', '3x8/lat facile'] },
    { name: 'Core Bracing Forza', tut: '2/2/1/1', sessions: ['5x10"', '6x10"', '5x15"', '6x15"', '8x10"', '4x10"'] },
    { name: 'Core Dinamico', tut: '2/1/1/1', sessions: ['3x10', '3x12', '4x10', '4x12', '5x10', '3x10 facile'] },
  ],
  Power: [
    { name: 'Power Bassa Ripetizione', tut: '1/1/1/1', sessions: ['6x3 esplosive', '7x3 esplosive', '8x2 esplosive', '8x3 esplosive', '10x2 esplosive', '5x3 facili'] },
    { name: 'Pliometria Progressiva', tut: '1/1/1/1', sessions: ['4x3 basso impatto', '5x3', '5x4', '6x3', '6x4', '4x3 controllo'] },
    { name: 'Contrasto Forza Power', tut: '1/1/1/1', sessions: ['3x3 forza + 3 jump', '4x3 + 3 jump', '4x2 + 4 jump', '5x2 + 4 jump', '5x1 + 5 jump', '3x3 controllo'] },
    { name: 'Med Ball Power', tut: '1/1/1/1', sessions: ['5x4', '6x4', '6x5', '8x4', '8x5', '5x4 easy'] },
    { name: 'Speed Strength', tut: '1/1/1/1', sessions: ['8x3 @50%', '8x3 @55%', '10x2 @60%', '10x2 @65%', '12x2 @60%', '6x3 @50%'] },
  ],
  Circuiti: [
    { name: 'Circuito Base 3 Stazioni', tut: '2/1/1/1', sessions: ['3 giri 10-10-10', '3 giri 12-12-12', '4 giri 10-10-10', '4 giri 12-12-12', '5 giri 10-10-10', '3 giri easy'] },
    { name: 'Circuito Upper Lower Core', tut: '2/1/1/1', sessions: ['3 giri', '3 giri +rip', '4 giri', '4 giri +rip', '5 giri', '3 giri scarico'] },
    { name: 'Circuito A Tempo', tut: '2/1/1/1', sessions: ['30/30 x3', '35/25 x3', '40/20 x3', '40/20 x4', '45/15 x4', '30/30 x3'] },
    { name: 'Circuito Forza Resistente', tut: '2/1/1/1', sessions: ['4x8 + 60"', '4x10 + 60"', '5x8 + 60"', '5x10 + 45"', '6x8 + 45"', '3x8 + 75"'] },
    { name: 'Circuito Dimagrimento', tut: '2/1/1/1', sessions: ['20 min RPE6', '22 min RPE6', '24 min RPE7', '26 min RPE7', '28 min RPE7', '20 min RPE6'] },
  ],
  Scarico: [
    { name: 'Volume Minimo', tut: '2/1/1/1', sessions: ['3x8', '3x8', '3x8', '3x8', '3x8', '3x8'] },
    { name: 'Buffer Alto Costante', tut: '3/1/1/1', sessions: ['3x8@65%', '3x8', '3x8', '3x8', '3x8', '3x8'] },
    { name: 'Deload Tecnico', tut: '3/1/1/1', sessions: ['2x8 RIR4', '2x10 RIR4', '3x8 RIR4', '3x10 RIR4', '2x8 RIR5', '2x10 RIR5'] },
    { name: 'Scarico Volume 50%', tut: '2/1/1/1', sessions: ['2x8 RIR4', '2x8 RIR4', '2x10 RIR4', '3x8 RIR4', '2x8 RIR5', '2x10 RIR5'] },
    { name: 'Scarico Intensita', tut: '3/1/1/1', sessions: ['3x8 @55%', '3x8 @60%', '3x10 @55%', '3x10 @60%', '2x12 @50%', '3x8 @55%'] },
    { name: 'Reset Tecnico', tut: '4/1/1/1', sessions: ['3x6 lente', '3x8 lente', '4x6 lente', '4x8 lente', '3x10 fluide', '3x6 lente'] },
    { name: 'Recupero Attivo', tut: '2/1/1/1', sessions: ['2 giri easy', '2 giri +mob', '3 giri easy', '3 giri +mob', '20 min easy', '2 giri easy'] },
  ],
};

const SERVICES = {
  pt11: { id: 'pt11', label: 'PT 1:1', durationMin: 60, maxClients: 1 },
  pt12: { id: 'pt12', label: 'PT 1:2', durationMin: 60, maxClients: 2 },
  nutrizione: { id: 'nutrizione', label: 'Nutrizione - 1a visita', durationMin: 60, maxClients: 1 },
  check: { id: 'check', label: 'Check nutrizionale', durationMin: 30, maxClients: 1 },
  visbody: { id: 'visbody', label: 'Visbody', durationMin: 30, maxClients: 1 },
  baiobit: { id: 'baiobit', label: 'Baiobit', durationMin: 30, maxClients: 1 },
  circuit: { id: 'circuit', label: 'Circuit Training', durationMin: 60, maxClients: 6 },
  blocco: { id: 'blocco', label: 'Blocco agenda', durationMin: 60, maxClients: 0 },
};

const STATUS_LABELS = {
  prenotato: 'Prenotato',
  fatto: 'Fatto',
  annullato: 'Annullato',
  noshow: 'No-show',
};

const SERVICE_ALIASES = {
  'pt 1:1': 'pt11',
  'pt 1-1': 'pt11',
  'pt_1_1': 'pt11',
  'pt11': 'pt11',
  'pt 1:2': 'pt12',
  'pt 1-2': 'pt12',
  'pt_1_2': 'pt12',
  'pt12': 'pt12',
  'nutrizione': 'nutrizione',
  'check nutrizionale': 'check',
  'check': 'check',
  'visbody': 'visbody',
  'baiobit': 'baiobit',
  'circuit': 'circuit',
  'circuit training': 'circuit',
  'blocco': 'blocco',
  'blocco agenda': 'blocco',
};

const state = {
  operators: [],
  clients: [],
  sessions: [],
  programs: [],
  currentPt: null,
  loginOperatorId: '',
  selectedClientId: '',
  selectedProgramId: '',
  calendarView: 'week',
  calendarReference: todayIso(),
  myReference: todayIso(),
  programSessions: [],
  editingSessionId: '',
  builderExercise: null,
  builderProgressionGroup: 'Tecnica',
  builderProgression: null,
  builderSessionIndex: 0,
  lastAddedExerciseId: '',
};

const els = {};

function endpoint(table, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query}`;
}

async function sb(table, query = '', options = {}) {
  const res = await fetch(endpoint(table, query), {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIso(value) {
  const [y, m, d] = String(value || todayIso()).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(value, days) {
  const d = parseIso(value);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

function addMonths(value, months) {
  const d = parseIso(value);
  d.setMonth(d.getMonth() + months);
  return dateKey(d);
}

function weekStart(value) {
  const d = parseIso(value);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function sameWeek(value, reference = todayIso()) {
  const d = parseIso(value);
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function sameMonth(value, reference = todayIso()) {
  const a = parseIso(value);
  const b = parseIso(reference);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDate(value) {
  if (!value) return '-';
  return parseIso(value).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatTime(value) {
  return String(value || '').slice(0, 5) || '--:--';
}

function fullName(item) {
  return [item?.nome, item?.cognome].filter(Boolean).join(' ') || item?.email || '-';
}

function operatorRoles(op) {
  return Array.from(new Set([
    ...(Array.isArray(op?.system_roles) ? op.system_roles : []),
    ...(Array.isArray(op?.legacy_roles) ? op.legacy_roles : []),
    ...(Array.isArray(op?.roles) ? op.roles : []),
  ].filter(Boolean)));
}

function isPersonalTrainer(op) {
  return operatorRoles(op).some((role) => ['pt', 'personal_trainer', 'personal trainer'].includes(String(role).toLowerCase()));
}

function operatorFromAny(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const key = raw.toLowerCase();
  return state.operators.find((op) =>
    String(op.id || '').toLowerCase() === key ||
    String(op.email || '').toLowerCase() === key ||
    fullName(op).toLowerCase() === key
  ) || null;
}

function operatorIdFromAny(value) {
  return operatorFromAny(value)?.id || String(value || '').trim();
}

function clientTrainerId(client) {
  return operatorIdFromAny(client?.trainer_id || client?.pt_assegnato || client?.operator_id);
}

function sessionTrainerId(session) {
  return operatorIdFromAny(session?.trainer_id || session?.operator_id);
}

function canManageSession(session) {
  return !!session?.appointment_id && sessionTrainerId(session) === state.currentPt?.id;
}

function normalizeServiceId(serviceId) {
  const raw = String(serviceId || '').trim();
  if (SERVICES[raw]) return raw;
  return SERVICE_ALIASES[raw.toLowerCase()] || raw;
}

function serviceLabel(serviceId) {
  const normalized = normalizeServiceId(serviceId);
  return SERVICES[normalized]?.label || serviceId || 'Seduta';
}

function serviceDuration(serviceId, fallback = 60) {
  const normalized = normalizeServiceId(serviceId);
  return Number(fallback || SERVICES[normalized]?.durationMin || 60);
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || 'Prenotato';
}

function sessionClientIds(session) {
  if (Array.isArray(session?.client_ids)) return session.client_ids;
  if (Array.isArray(session?.clientIds)) return session.clientIds;
  return session?.client_id ? [session.client_id] : [];
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function flattenExercises() {
  return Object.entries(EXERCISE_LIBRARY).flatMap(([category, names]) => names.map((name) => ({ category, name })));
}

function exerciseMode(item) {
  const text = `${item?.name || ''} ${item?.category || ''}`.toLowerCase();
  if (/cavo|cavi|cable|pulley|pushdown|pulldown|woodchopper/.test(text)) return 'Cavi';
  if (/bilanciere|barbell|ez|landmine|smith|multipower|rack pull/.test(text)) return 'Bilanciere / Multipower';
  if (/manubri|manubrio|dumbbell/.test(text)) return 'Manubri';
  if (/macchina|machine|pressa|leg press|leg extension|leg curl|lat machine|chest press|shoulder press|pec deck|abductor|adductor|tibialis machine|hack squat/.test(text)) return 'Macchine';
  if (/corpo libero|piegamenti|push up|dip|trazioni|plank|hollow|bird dog|dead bug|burpee|bear crawl|mountain climber|pistol|skater|cossack|nordic|handstand|pike/.test(text)) return 'Corpo libero';
  if (/kettlebell|club/.test(text)) return 'Kettlebell / Clubbell';
  if (/elastico|band/.test(text)) return 'Elastici';
  if (/trx|ring/.test(text)) return 'TRX / Anelli';
  if (/med ball|wall ball|slam|throw/.test(text)) return 'Med ball';
  if (/sled|air bike|row erg|ski erg|tapis|runner|battle rope|jump rope|step mill/.test(text)) return 'Conditioning';
  return 'Altro';
}

function exerciseModeOptions() {
  return ['Tutte le modalita', ...Array.from(new Set(flattenExercises().map(exerciseMode))).sort()];
}

function exerciseCategory(name) {
  const found = flattenExercises().find((item) => item.name.toLowerCase() === String(name || '').toLowerCase());
  return found?.category || '';
}

function flattenProgressions() {
  return Object.entries(PROGRESSION_LIBRARY).flatMap(([group, progressions]) =>
    progressions.map((progression) => ({ group, ...progression }))
  );
}

function progressionByName(name) {
  return flattenProgressions().find((item) => item.name === name) || null;
}

function normalizeProgression(value) {
  if (!value) return null;
  if (typeof value === 'string') return progressionByName(value);
  return {
    name: value.name || value.nome || '',
    tut: value.tut || '',
    sessions: value.sessions || value.sedute || [],
  };
}

function sessionName(index) {
  return `Seduta ${String.fromCharCode(65 + index)}`;
}

function defaultSessions() {
  return [0, 1].map((index) => ({
    id: id('session'),
    name: sessionName(index),
    weekDay: String(index + 1),
    focus: index === 0 ? 'Seduta principale' : 'Seduta complementare',
    duration: '60',
    warmup: '',
    cooldown: '',
    notes: '',
    blocks: [{ id: id('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [] }],
  }));
}

function ensureProgramSessions() {
  if (!Array.isArray(state.programSessions) || !state.programSessions.length) {
    state.programSessions = defaultSessions();
    state.builderSessionIndex = 0;
  }
  return state.programSessions;
}

function normalizeLegacyExercises(data) {
  const esercizi = data?.esercizi || {};
  const days = Object.keys(esercizi);
  if (!days.length) return defaultSessions();
  return days.map((day, index) => ({
    id: id('session'),
    name: day,
    weekDay: String(index + 1),
    focus: data?.split || '',
    duration: '',
    warmup: '',
    cooldown: '',
    notes: '',
    blocks: [{
      id: id('block'),
      code: 'N0',
      line: '',
      mode: 'Singolo',
      exercises: (esercizi[day] || []).map((exercise, exerciseIndex) => ({
        id: exercise.id || id('exercise'),
        order: exerciseIndex + 1,
        name: exercise.nome || '',
        category: exercise.categoria || exerciseCategory(exercise.nome),
        progression: normalizeProgression(exercise.progressione),
        sets: '',
        reps: Array.isArray(exercise.progressione?.sedute) ? exercise.progressione.sedute.join(' / ') : '',
        rest: exercise.recupero || '',
        tut: exercise.progressione?.tut || '',
        load: '',
        notes: exercise.note || exercise.categoria || '',
      })),
    }],
  }));
}

function cleanProgramName(value) {
  return String(value || 'Scheda PT')
    .replace(/(\s*-\s*copia)+$/gi, '')
    .replace(/\s*[·-]\s*(N\d{1,2}\s+[A-Za-zÀ-ÿ/ ]+|N\d{1,2}|CC)\b/gi, '')
    .replace(/\b(N\d{1,2}|CC)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Scheda PT';
}

function buildNeaceaString(program) {
  const split = program.split ? ` · ${program.split}` : '';
  return `${cleanProgramName(program.name || 'Scheda PT')}${split}`;
}

function compactProgramList(programs) {
  const grouped = new Map();
  programs.forEach((program) => {
    const key = [
      program.client_id,
      cleanProgramName(program.name).toLowerCase(),
      String(program.goal || '').toLowerCase(),
      program.status,
    ].join('|');
    const current = grouped.get(key);
    if (!current || String(program.updated_at || '').localeCompare(String(current.updated_at || '')) > 0) {
      grouped.set(key, program);
    }
  });
  return Array.from(grouped.values())
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function showError(message) {
  els.errorBox.textContent = message;
  els.errorBox.classList.remove('hidden');
}

function clearError() {
  els.errorBox.textContent = '';
  els.errorBox.classList.add('hidden');
}

let toastTimer;
function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

async function loadData() {
  clearError();
  try {
    await loadPhaseViews();
  } catch (error) {
    await loadFallback();
  }
  await loadPrograms();
}

async function loadPhaseViews() {
  const [operators, clients, sessions, acquisitions] = await Promise.all([
    sb('operator_effective_roles', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('clients', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('pt_calendar_sessions', '?select=*&order=date.asc,start_time.asc'),
    sb('acquisizioni', '?select=*&order=data_acquisizione.desc'),
  ]);
  state.operators = (operators || []).map((op) => ({
    id: op.operator_id,
    nome: op.nome,
    cognome: op.cognome,
    email: op.email,
    roles: operatorRoles(op),
    active: op.active !== false,
  })).filter((op) => isPersonalTrainer(op));
  state.sessions = (sessions || []).map((session) => ({
    ...session,
    trainer_id: sessionTrainerId(session),
  }));
  const inferredTrainerByClient = state.sessions.reduce((acc, session) => {
    const trainerId = sessionTrainerId(session);
    if (!trainerId) return acc;
    clientIdsFromSession(session).forEach((clientId) => {
      acc[clientId] = acc[clientId] || {};
      acc[clientId][trainerId] = (acc[clientId][trainerId] || 0) + 1;
    });
    return acc;
  }, {});
  const inferredTrainerId = (clientId) => Object.entries(inferredTrainerByClient[clientId] || {})
    .sort((a, b) => b[1] - a[1])
    .map(([trainerId]) => trainerId)[0] || '';
  state.clients = (clients || []).map((client) => {
    const acq = (acquisitions || []).find((item) => {
      const email = client.email && item.email && client.email.toLowerCase() === item.email.toLowerCase();
      const phone = client.telefono && item.telefono && client.telefono === item.telefono;
      return email || phone;
    });
    return {
      assignment_id: `client_${client.id}`,
      trainer_id: operatorIdFromAny(client.pt_assegnato || client.trainer_id || inferredTrainerId(client.id)),
      client_id: client.id,
      nome: client.nome,
      cognome: client.cognome,
      telefono: client.telefono,
      email: client.email,
      professione: client.professione,
      obiettivo: client.obiettivo || acq?.obiettivo,
      esperienza: acq?.esperienza,
      livello_attivita_fisica: acq?.livello_attivita_fisica || acq?.inattivo,
      sport: acq?.sport,
      patologie: acq?.patologie,
      farmaci: acq?.farmaci,
      infortuni: acq?.infortuni,
      limitazioni: acq?.limitazioni,
      stress: acq?.stress,
      sonno: acq?.sonno,
      note_operative: acq?.impressioni || client.notes,
      alerts: [],
      alert_count: 0,
    };
  });
}

async function loadFallback() {
  const [operators, clients, appointments, acquisitions] = await Promise.all([
    sb('operators', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('clients', '?select=*&active=eq.true&order=cognome.asc,nome.asc'),
    sb('appointments', '?select=*&order=date.asc,start_time.asc'),
    sb('acquisizioni', '?select=*&order=data_acquisizione.desc'),
  ]);
  state.operators = (operators || [])
    .map((op) => ({ ...op, roles: operatorRoles(op) }))
    .filter((op) => isPersonalTrainer(op));

  const inferredTrainerByClient = (appointments || []).reduce((acc, appt) => {
    const trainerId = operatorIdFromAny(appt.operator_id);
    if (!trainerId) return acc;
    const clientIds = Array.isArray(appt.client_ids) ? appt.client_ids : [];
    clientIds.forEach((clientId) => {
      acc[clientId] = acc[clientId] || {};
      acc[clientId][trainerId] = (acc[clientId][trainerId] || 0) + 1;
    });
    return acc;
  }, {});

  function inferredTrainerId(clientId) {
    const counts = inferredTrainerByClient[clientId] || {};
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([trainerId]) => trainerId)[0] || '';
  }

  state.clients = (clients || []).map((client) => {
    const acq = (acquisitions || []).find((item) => {
      const email = client.email && item.email && client.email.toLowerCase() === item.email.toLowerCase();
      const phone = client.telefono && item.telefono && client.telefono === item.telefono;
      return email || phone;
    });
    return {
      assignment_id: `legacy_${client.id}`,
      trainer_id: operatorIdFromAny(client.pt_assegnato || client.trainer_id || inferredTrainerId(client.id)),
      client_id: client.id,
      nome: client.nome,
      cognome: client.cognome,
      telefono: client.telefono,
      email: client.email,
      professione: client.professione,
      obiettivo: client.obiettivo || acq?.obiettivo,
      esperienza: acq?.esperienza,
      livello_attivita_fisica: acq?.livello_attivita_fisica || acq?.inattivo,
      sport: acq?.sport,
      patologie: acq?.patologie,
      farmaci: acq?.farmaci,
      infortuni: acq?.infortuni,
      limitazioni: acq?.limitazioni,
      stress: acq?.stress,
      sonno: acq?.sonno,
      note_operative: acq?.impressioni || client.notes,
      alerts: [],
      alert_count: 0,
    };
  });
  state.sessions = (appointments || []).flatMap((appt) => {
    const ids = Array.isArray(appt.client_ids) ? appt.client_ids : [];
    return ids.map((clientId) => {
      const client = (clients || []).find((item) => item.id === clientId) || {};
      const trainerId = operatorIdFromAny(appt.operator_id);
      const trainer = operatorFromAny(appt.operator_id) || {};
      return {
        appointment_id: appt.id,
        trainer_id: trainerId,
        trainer_nome: trainer.nome,
        trainer_cognome: trainer.cognome,
        client_id: clientId,
        client_ids: ids,
        nome: client.nome,
        cognome: client.cognome,
        service_id: appt.service_id,
        date: appt.date,
        start_time: appt.start_time,
        duration_min: appt.duration_min,
        status: appt.status,
        notes: appt.notes,
      };
    });
  });
}

function normalizeProgram(row) {
  const data = row.data || {};
  const clientId = row.cliente_id || data.client_id || data.clienteId || data.cliente_id || '';
  const rawSessions = Array.isArray(data.sessions) && data.sessions.length
    ? data.sessions
    : normalizeLegacyExercises(data);
  const sessions = rawSessions.map((session) => ({
    ...session,
    blocks: (session.blocks || [{
      id: id('block'),
      code: 'N0',
      line: '',
      mode: 'Singolo',
      exercises: session.exercises || [],
    }]).map((block) => ({
      ...block,
      exercises: (block.exercises || []).filter((exercise) =>
        exercise?.name || exercise?.progression || exercise?.notes || exercise?.load
      ),
    })),
  }));
  return {
    rowId: row.id,
    id: data.id || row.id,
    client_id: clientId,
    trainer_id: operatorIdFromAny(data.trainer_id || data.created_by || ''),
    created_by: operatorIdFromAny(data.created_by || data.createdBy || data.trainer_id || ''),
    name: cleanProgramName(data.name || data.nome || 'Scheda PT'),
    goal: data.goal || data.obiettivo || '',
    level: data.level || data.livello || 'base',
    weeks: Number(data.weeks || data.settimane || 4),
    frequency: Number(data.frequency || data.frequenza || data.frequenza_settimanale || 2),
    split: data.split || '',
    start_date: data.start_date || data.inizio || '',
    end_date: data.end_date || '',
    status: data.status || data.stato || 'bozza',
    notes: data.notes || data.note || data.note_generali || '',
    neacea_string: data.neacea_string || '',
    sessions,
    updated_at: row.updated_at || row.created_at || '',
  };
}

async function loadPrograms() {
  try {
    const rows = await sb('schede_allenamento', '?select=id,cliente_id,data,created_at,updated_at&order=updated_at.desc');
    state.programs = (rows || []).map(normalizeProgram);
  } catch (error) {
    state.programs = [];
  }
}

function myClients() {
  return state.clients.filter((client) => clientTrainerId(client) === state.currentPt?.id);
}

function myClientIds() {
  return new Set(myClients().map((client) => client.client_id));
}

function mySessions() {
  return state.sessions
    .filter((session) => sessionTrainerId(session) === state.currentPt?.id)
    .filter((session) => session.status !== 'annullato')
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

function myPrograms() {
  const allowed = myClientIds();
  const clientFilter = els.programClientFilter.value;
  const statusFilter = els.programStatusFilter.value;
  return state.programs
    .filter((program) => allowed.has(program.client_id) || operatorIdFromAny(program.trainer_id) === state.currentPt?.id)
    .filter((program) => !clientFilter || program.client_id === clientFilter)
    .filter((program) => !statusFilter || program.status === statusFilter)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

function clientById(clientId) {
  return state.clients.find((client) => client.client_id === clientId) || null;
}

async function verifyAccess(email, code, operatorId = '') {
  const response = await fetch('https://neacea-portale-personal-trainer.netlify.app/.netlify/functions/pt-access-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', email, code, operatorId }),
  });
  const text = await response.text();
  let result = {};
  try { result = JSON.parse(text); } catch (_) { result = { raw: text }; }
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.raw || 'Codice accesso non valido.');
  }
  return result;
}

async function loginByEmail() {
  const email = els.loginEmail.value.trim().toLowerCase();
  const code = String(els.loginCode.value || '').trim();
  els.loginError.classList.add('hidden');
  const matches = state.operators.filter((op) => String(op.email || '').toLowerCase() === email);
  const pt = state.loginOperatorId
    ? matches.find((op) => String(op.id) === String(state.loginOperatorId))
    : (matches.length === 1 ? matches[0] : null);
  if (!pt) {
    els.loginError.textContent = matches.length > 1
      ? 'Questa email e collegata a piu operatori. Apri il link ricevuto via mail o usa una email unica per ogni PT.'
      : 'Email non trovata tra i Personal Trainer configurati.';
    els.loginError.classList.remove('hidden');
    return;
  }
  if (!code) {
    els.loginError.textContent = 'Inserisci il codice ricevuto via mail.';
    els.loginError.classList.remove('hidden');
    return;
  }
  try {
    els.loginButton.disabled = true;
    els.loginButton.textContent = 'Verifica...';
    await verifyAccess(email, code, pt.id);
    state.currentPt = pt;
    els.loginCode.value = '';
    els.loginScreen.classList.add('hidden');
    els.app.classList.remove('hidden');
    renderAll();
  } catch (error) {
    state.currentPt = null;
    els.loginError.textContent = error.message || 'Accesso non riuscito.';
    els.loginError.classList.remove('hidden');
  } finally {
    els.loginButton.disabled = false;
    els.loginButton.textContent = 'Entra nel portale';
  }
}

function logout() {
  state.currentPt = null;
  els.loginCode.value = '';
  els.app.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
}

function renderAll() {
  if (!state.currentPt) return;
  els.currentPtName.textContent = fullName(state.currentPt);
  els.heroTitle.textContent = `Ciao ${state.currentPt.nome || 'PT'}`;
  els.heroSub.textContent = 'Qui trovi clienti, prenotazioni, schede e calendario studio.';
  renderDashboard();
  renderClients();
  renderProgramOptions();
  renderPrograms();
  renderMyAgenda();
  renderStudioCalendar();
}

function renderDashboard() {
  const mine = mySessions();
  const today = todayIso();
  els.kpiClienti.textContent = myClients().length;
  els.kpiOggi.textContent = mine.filter((session) => session.date === today).length;
  els.kpiSettimana.textContent = mine.filter((session) => sameWeek(session.date)).length;
  els.kpiStudio.textContent = state.sessions.filter((session) => session.date === today && session.status !== 'annullato').length;

  const next = mine.filter((session) => session.date >= today).slice(0, 7);
  els.mySessionCount.textContent = next.length;
  els.myNextSessions.innerHTML = next.length ? next.map(renderSessionCard).join('') : '<div class="empty">Nessuna prenotazione futura</div>';

  const alerts = myClients().filter((client) => Number(client.alert_count || 0) > 0 || (client.alerts || []).length);
  els.alertCount.textContent = alerts.length;
  els.alertClients.innerHTML = alerts.length ? alerts.map((client) => `
    <article class="row-card">
      <div class="row-title"><span>${esc(fullName(client))}</span><span class="pill alert">Alert</span></div>
      <div class="row-sub">${esc((client.alerts || [])[0]?.title || 'Controllare anamnesi e note operative')}</div>
    </article>
  `).join('') : '<div class="empty">Nessun alert sui tuoi clienti</div>';
}

function renderClients() {
  const q = els.clientSearch.value.trim().toLowerCase();
  const clients = myClients().filter((client) => !q || `${fullName(client)} ${client.email || ''} ${client.telefono || ''}`.toLowerCase().includes(q));
  els.clientCount.textContent = clients.length;
  if (!clients.some((client) => client.client_id === state.selectedClientId)) {
    state.selectedClientId = clients[0]?.client_id || '';
  }
  els.clientList.innerHTML = clients.length ? clients.map((client) => `
    <article class="client-card${client.client_id === state.selectedClientId ? ' active' : ''}" data-client-id="${esc(client.client_id)}">
      <div class="row-title"><span>${esc(fullName(client))}</span><span class="pill">${Number(client.alert_count || 0) ? 'Alert' : 'OK'}</span></div>
      <div class="row-sub">${esc(client.telefono || '-')} · ${esc(client.email || '-')}</div>
    </article>
  `).join('') : '<div class="empty">Nessun cliente assegnato</div>';
  renderClientDetail();
}

function field(label, value) {
  return `<div class="field"><span>${esc(label)}</span><strong>${esc(value || '-')}</strong></div>`;
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value ?? '').trim() !== '';
}

function renderAvailableFields(items, emptyText) {
  const fields = items.filter((item) => hasValue(item.value));
  if (!fields.length) return `<div class="empty compact-empty">${esc(emptyText)}</div>`;
  return `<div class="info-grid">${fields.map((item) => field(item.label, item.value)).join('')}</div>`;
}

function renderClientDetail() {
  const client = clientById(state.selectedClientId);
  if (!client) {
    els.clientDetail.innerHTML = '<div class="empty-state">Seleziona un cliente</div>';
    return;
  }
  const programs = state.programs.filter((program) => program.client_id === client.client_id);
  const sessions = mySessions().filter((session) => session.client_id === client.client_id && session.date >= todayIso()).slice(0, 5);
  els.clientDetail.innerHTML = `
    <div class="client-hero">
      <div>
        <h2>${esc(fullName(client))}</h2>
        <p>${esc(client.obiettivo || 'Cliente PT')}</p>
      </div>
      <div class="hero-actions">
        <span class="pill mine">${programs.length} schede</span>
        <button class="ghost-btn" type="button" data-new-program-for="${esc(client.client_id)}">Nuova scheda</button>
      </div>
    </div>
    <div class="client-sections">
      <div class="section-card"><span>Telefono</span><strong>${esc(client.telefono || '-')}</strong></div>
      <div class="section-card"><span>Email</span><strong>${esc(client.email || '-')}</strong></div>
      <div class="section-card"><span>Professione</span><strong>${esc(client.professione || '-')}</strong></div>
      <div class="section-card"><span>Obiettivo</span><strong>${esc(client.obiettivo || '-')}</strong></div>
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Anamnesi e riferimenti</h3>
      ${renderAvailableFields([
        { label: 'Attivita fisica', value: client.livello_attivita_fisica },
        { label: 'Patologie', value: client.patologie },
        { label: 'Farmaci', value: client.farmaci },
        { label: 'Infortuni', value: client.infortuni },
        { label: 'Limitazioni', value: client.limitazioni },
        { label: 'Stress', value: client.stress },
        { label: 'Sonno', value: client.sonno },
        { label: 'Note operative', value: client.note_operative },
      ], 'Nessuna anamnesi PT collegata o compilata per questo cliente.')}
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Prossime prenotazioni</h3>
      <div class="stack">${sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna prenotazione futura per questo cliente</div>'}</div>
    </div>
    <div class="detail-block">
      <h3 class="detail-block-title">Schede cliente</h3>
      <div class="stack">${programs.length ? programs.map(renderProgramMini).join('') : '<div class="empty">Nessuna scheda ancora</div>'}</div>
    </div>
  `;
}

function renderSessionCard(session) {
  const mine = sessionTrainerId(session) === state.currentPt?.id;
  const isDone = session.status === 'fatto';
  const clientIds = sessionClientIds(session);
  const normalizedServiceId = normalizeServiceId(session.service_id);
  const service = SERVICES[normalizedServiceId] || {};
  const serviceExtra = service.maxClients > 1 && clientIds.length
    ? ` · ${clientIds.length}/${service.maxClients} clienti`
    : '';
  return `
    <article class="session-card ${mine ? 'mine' : 'locked'}">
      <div class="session-title">
        <span>${esc(formatDate(session.date))} · ${esc(formatTime(session.start_time))}</span>
        <span class="pill ${mine ? 'mine' : 'locked'}">${mine ? 'Mia' : esc([session.trainer_nome, session.trainer_cognome].filter(Boolean).join(' ') || 'Studio')}</span>
      </div>
      <div class="session-sub">${esc(fullName(session))} · ${esc(serviceLabel(normalizedServiceId))} · ${esc(serviceDuration(normalizedServiceId, session.duration_min))} min · ${esc(statusLabel(session.status))}${esc(serviceExtra)}</div>
      ${mine ? `
        <div class="session-actions">
          <button class="ghost-btn slim" type="button" data-edit-session="${esc(session.appointment_id || '')}">Modifica</button>
          <button class="ghost-btn slim ${isDone ? 'done-btn' : ''}" type="button" data-session-done="${esc(session.appointment_id || '')}" ${isDone ? 'disabled aria-disabled="true"' : ''}>${isDone ? 'Fatta' : 'Segna fatta'}</button>
        </div>
      ` : ''}
    </article>
  `;
}

function renderProgramOptions() {
  const clients = myClients();
  const options = clients.map((client) => `<option value="${esc(client.client_id)}">${esc(fullName(client))}</option>`).join('');
  els.programClient.innerHTML = options || '<option value="">Nessun cliente assegnato</option>';
  els.programClientFilter.innerHTML = `<option value="">Tutti i miei clienti</option>${options}`;
}

function renderPrograms() {
  const programs = compactProgramList(myPrograms());
  els.programCount.textContent = programs.length;
  els.programList.innerHTML = programs.length ? programs.map(renderProgramRow).join('') : '<div class="empty">Nessuna scheda per i tuoi clienti</div>';

  if (state.selectedProgramId && !programs.some((program) => program.id === state.selectedProgramId)) {
    state.selectedProgramId = '';
  }
  if (!state.selectedProgramId && programs.length) {
    state.selectedProgramId = programs[0].id;
  }

  const current = state.programs.find((program) => program.id === state.selectedProgramId);
  if (current) fillProgramForm(current);
  else newProgramDraft();
}

function renderProgramRow(program) {
  const client = clientById(program.client_id);
  const selected = program.id === state.selectedProgramId ? ' selected' : '';
  const activeClass = program.status === 'attiva' ? ' info' : program.status === 'archiviata' ? ' warning' : '';
  return `
    <article class="program-row clickable${selected}" data-program-id="${esc(program.id)}">
      <strong>${esc(cleanProgramName(program.name))}</strong>
      <span>${esc(client ? fullName(client) : 'Cliente')}</span>
      <span>${esc(program.goal || 'Obiettivo non indicato')}</span>
      <span>${esc(program.weeks)} sett. · ${esc(program.frequency)} sed./sett.</span>
      <span class="alert-pill${activeClass}">${esc(program.status)}</span>
    </article>
  `;
}

function renderProgramMini(program) {
  return `
    <article class="row-card">
      <div class="row-title"><span>${esc(program.name)}</span><button class="ghost-btn slim" type="button" data-open-program="${esc(program.id)}">Apri</button></div>
      <div class="row-sub">${esc(program.status)} · ${program.sessions.length} sedute · ${esc(program.goal || '-')}</div>
    </article>
  `;
}

function emptyExercise(order = 1) {
  return {
    id: id('exercise'),
    order,
    name: '',
    category: '',
    progression: null,
    sets: '',
    reps: '',
    rest: '',
    tut: '',
    load: '',
    notes: '',
  };
}

function newProgramDraft(clientId = '') {
  const client = clientId ? clientById(clientId) : myClients()[0];
  const draft = {
    id: '',
    client_id: client?.client_id || '',
    trainer_id: state.currentPt?.id || '',
    created_by: state.currentPt?.id || '',
    name: '',
    goal: client?.obiettivo || '',
    level: 'base',
    weeks: 4,
    frequency: 2,
    split: '',
    start_date: todayIso(),
    end_date: '',
    status: 'bozza',
    notes: '',
    neacea_string: '',
    sessions: defaultSessions(),
  };
  fillProgramForm(draft);
}

function newProgram(clientId = '') {
  state.selectedProgramId = '';
  newProgramDraft(clientId || els.programClientFilter.value || state.selectedClientId);
  activateView('schede');
}

function fillProgramForm(program) {
  if (!program) return;
  state.programSessions = JSON.parse(JSON.stringify(program.sessions?.length ? program.sessions : defaultSessions()));
  els.programId.value = program.id || '';
  els.programClient.value = program.client_id || myClients()[0]?.client_id || '';
  els.programStatus.value = program.status || 'bozza';
  els.programName.value = cleanProgramName(program.name);
  els.programGoal.value = program.goal || '';
  els.programLevel.value = program.level || 'base';
  els.programWeeks.value = program.weeks || 4;
  els.programFrequency.value = program.frequency || 2;
  els.programSplit.value = program.split || '';
  els.programStart.value = program.start_date || '';
  els.programEnd.value = program.end_date || '';
  els.programNotes.value = program.notes || '';
  els.programEditorTitle.textContent = program.id ? 'Modifica scheda' : 'Nuova scheda';
  els.programEditorStatus.textContent = program.status || 'bozza';
  renderSessionEditor();
  updateNeaceaPreview();
}

function renderSessionEditor() {
  ensureProgramSessions();
  renderExerciseBuilder();
  if (!state.programSessions.length) {
    els.sessionEditor.innerHTML = '<div class="empty compact-empty">Nessuna seduta inserita. Premi "Aggiungi seduta" quando vuoi iniziare.</div>';
    renderBuilderSessionPreview();
    return;
  }
  if (state.builderSessionIndex >= state.programSessions.length) state.builderSessionIndex = 0;
  els.sessionEditor.innerHTML = state.programSessions.map((session, sessionIndex) => `
    <article class="session-card ${sessionIndex === state.builderSessionIndex ? 'active-builder-session' : ''}" data-session-index="${sessionIndex}">
      <div class="session-head">
        <label class="session-name-field">
          <span>Nome seduta</span>
          <input data-session-field="name" value="${esc(session.name || sessionName(sessionIndex))}">
        </label>
        <button class="danger-btn slim" type="button" data-remove-session="${sessionIndex}">Rimuovi seduta</button>
      </div>
      <div class="program-form-grid compact">
        <label><span>Giorno scheda</span><input data-session-field="weekDay" value="${esc(session.weekDay || '')}" placeholder="1, 2, 3..."></label>
        <label><span>Focus</span><input data-session-field="focus" value="${esc(session.focus || '')}"></label>
        <label><span>Durata min</span><input data-session-field="duration" value="${esc(session.duration || '60')}"></label>
      </div>
      <div class="program-form-grid compact">
        <label><span>Riscaldamento</span><input data-session-field="warmup" value="${esc(session.warmup || '')}"></label>
        <label><span>Defaticamento</span><input data-session-field="cooldown" value="${esc(session.cooldown || '')}"></label>
        <label class="span-2"><span>Note trainer</span><input data-session-field="notes" value="${esc(session.notes || '')}"></label>
      </div>
      <div class="block-list">
        ${(session.blocks || []).map((block, blockIndex) => renderBlockEditor(block, sessionIndex, blockIndex)).join('')}
      </div>
    </article>
  `).join('');
  renderBuilderSessionPreview();
}

function renderBlockEditor(block, sessionIndex, blockIndex) {
  const exercises = block.exercises || [];
  return `
    <div class="block-card" data-block-index="${blockIndex}">
      <div class="exercise-list">
        ${exercises.length
          ? exercises.map((exercise, exerciseIndex) => renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex)).join('')
          : '<div class="empty compact-empty">Nessun esercizio inserito</div>'}
      </div>
    </div>
  `;
}

function renderExerciseEditor(exercise, sessionIndex, blockIndex, exerciseIndex) {
  const progression = normalizeProgression(exercise.progression);
  const sedute = progression?.sessions || [];
  const loadKey = `${sessionIndex}:${blockIndex}:${exerciseIndex}`;
  const justAdded = exercise.id && exercise.id === state.lastAddedExerciseId ? ' just-added' : '';
  const lastLoad = Array.isArray(exercise.loads) && exercise.loads.length ? exercise.loads[exercise.loads.length - 1] : null;
  const savedRows = lastLoad?.serie || [];
  return `
    <div class="exercise-card-compact${justAdded}" data-exercise-index="${exerciseIndex}" data-exercise-id="${esc(exercise.id || '')}">
      <div class="exercise-display-head">
        <div class="exercise-order">${esc(exercise.order || exerciseIndex + 1)}</div>
        <div class="exercise-display-main">
          <strong>${esc(exercise.name || 'Esercizio')}</strong>
          <span>${esc(exercise.category || exerciseCategory(exercise.name) || 'Manuale')} · Recupero ${esc(exercise.rest || '-')}</span>
        </div>
        <span class="exercise-prog-badge ${progression ? '' : 'muted'}">${esc(progression?.name || 'Manuale')}</span>
        <button class="danger-btn slim" type="button" data-remove-exercise="${sessionIndex}:${blockIndex}:${exerciseIndex}">X</button>
      </div>
      <div class="exercise-progression-strip">
        <span class="tut-badge">TUT ${esc(progression?.tut || exercise.tut || '-')}</span>
        ${sedute.length
          ? sedute.map((item, index) => `<span class="seduta-pill"><b>Sed.${index + 1}</b>${esc(item)}</span>`).join('')
          : '<span class="seduta-empty">Progressione manuale</span>'}
      </div>
      ${exercise.notes ? `<div class="exercise-note-display">${esc(exercise.notes)}</div>` : ''}
      <div class="load-box" data-load-exercise="${esc(loadKey)}">
        <div class="load-head">
          <span>Carichi seduta</span>
          <input class="load-date" type="date" data-load-date value="${esc(lastLoad?.data || todayIso())}">
        </div>
        ${[1, 2, 3, 4].map((setNumber) => `
          <div class="load-row" data-load-row="${setNumber}">
            <span>S${setNumber}</span>
            <input data-load-field="kg" placeholder="kg" value="${esc(savedRows[setNumber - 1]?.kg || '')}">
            <input data-load-field="reps" placeholder="rip" value="${esc(savedRows[setNumber - 1]?.ripetizioni || '')}">
            <input data-load-field="note" placeholder="note" value="${esc(savedRows[setNumber - 1]?.note || '')}">
          </div>
        `).join('')}
        ${lastLoad ? `<div class="load-last">Ultimo salvataggio: ${esc(formatDate(lastLoad.data))} · ${savedRows.length} serie</div>` : ''}
        <button class="secondary-btn slim load-save" type="button" data-save-load="${esc(loadKey)}">Salva carichi</button>
      </div>
    </div>
  `;
}

function renderExerciseBuilder() {
  if (!els.exercisePickList) return;
  const selectedGroup = els.exerciseGroupFilter?.value || '';
  const selectedMode = els.exerciseModeFilter?.value || '';
  const q = (els.exerciseSearch?.value || '').trim().toLowerCase();
  const exercises = flattenExercises()
    .filter((item) => !selectedGroup || item.category === selectedGroup)
    .filter((item) => !selectedMode || exerciseMode(item) === selectedMode)
    .filter((item) => !q || `${item.name} ${item.category} ${exerciseMode(item)}`.toLowerCase().includes(q));
  if (els.exerciseGroupFilter && !els.exerciseGroupFilter.options.length) {
    els.exerciseGroupFilter.innerHTML = '<option value="">Tutti i gruppi</option>' +
      Object.keys(EXERCISE_LIBRARY).map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
  }
  if (els.exerciseModeFilter && !els.exerciseModeFilter.options.length) {
    els.exerciseModeFilter.innerHTML = exerciseModeOptions().map((mode, index) =>
      `<option value="${index === 0 ? '' : esc(mode)}">${esc(mode)}</option>`
    ).join('');
  }
  let currentCategory = '';
  els.exercisePickList.innerHTML = exercises.length
    ? exercises.map((item) => {
        const category = item.category !== currentCategory ? `<div class="pick-category">${esc(item.category)}</div>` : '';
        currentCategory = item.category;
        const selected = state.builderExercise?.name === item.name ? ' selected' : '';
        return `${category}
          <button class="pick-item${selected}" type="button" data-pick-exercise="${esc(item.name)}" data-pick-category="${esc(item.category)}">
            <span>${esc(item.name)}</span>
            <em>${esc(item.category)} · ${esc(exerciseMode(item))}</em>
          </button>`;
      }).join('')
    : '<div class="empty small">Nessun esercizio trovato</div>';

  const groups = Object.keys(PROGRESSION_LIBRARY);
  if (!groups.includes(state.builderProgressionGroup)) state.builderProgressionGroup = groups[0];
  els.progressionTabs.innerHTML = groups.map((group, index) => {
    const active = group === state.builderProgressionGroup ? ' active' : '';
    return `<button class="progression-tab dot-${index % 6}${active}" type="button" data-progression-group="${esc(group)}"><span></span>${esc(group)}</button>`;
  }).join('');

  const progressions = PROGRESSION_LIBRARY[state.builderProgressionGroup] || [];
  els.progressionPickList.innerHTML = `
    <button class="progression-item manual${state.builderProgression === 'manual' ? ' selected' : ''}" type="button" data-pick-progression="manual">
      <strong>Manuale</strong>
      <span>Compili liberamente, senza progressione predefinita</span>
    </button>
    ${progressions.map((item, index) => {
      const selected = state.builderProgression?.name === item.name ? ' selected' : '';
      return `
        <button class="progression-item${selected}" type="button" data-pick-progression="${esc(item.name)}">
          <strong>${esc(item.name)}</strong>
          <span>${esc(item.sessions.length)} sedute · TUT ${esc(item.tut)}</span>
          <i class="progression-dot dot-${index % 6}"></i>
        </button>`;
    }).join('')}`;
  renderBuilderProgressionPreview();

  if (state.builderSessionIndex >= state.programSessions.length) state.builderSessionIndex = 0;
  els.builderSession.innerHTML = state.programSessions.map((session, index) =>
    `<option value="${index}">${esc(session.name || `Seduta ${index + 1}`)}</option>`
  ).join('');
  els.builderSession.value = String(state.builderSessionIndex || 0);
  renderBuilderCurrent();
  renderBuilderSessionPreview();
}

function builderSelectedExerciseName() {
  return state.builderExercise?.name || els.manualExerciseName?.value.trim() || els.exerciseSearch?.value.trim() || '';
}

function renderBuilderCurrent() {
  if (!els.builderCurrent) return;
  const session = state.programSessions[state.builderSessionIndex] || state.programSessions[0];
  const progression = state.builderProgression === 'manual'
    ? 'Manuale'
    : (state.builderProgression?.name || 'Progressione non selezionata');
  const exerciseName = builderSelectedExerciseName() || 'Seleziona o scrivi esercizio';
  els.builderCurrent.innerHTML = `
    <span>Pronto per</span>
    <strong>${esc(session?.name || 'Seduta')}</strong>
    <em>${esc(exerciseName)} · ${esc(progression)} · recupero ${esc(els.builderRest?.value || '-')}</em>
  `;
}

function renderBuilderSessionPreview() {
  if (!els.builderSessionPreview) return;
  const session = state.programSessions[state.builderSessionIndex] || state.programSessions[0];
  if (!session) {
    els.builderSessionPreview.innerHTML = '<div class="empty compact-empty">Aggiungi una seduta per iniziare la scheda.</div>';
    return;
  }
  const exercises = (session.blocks || []).flatMap((block) => block.exercises || []);
  els.builderSessionPreview.innerHTML = `
    <div class="builder-preview-head">
      <div>
        <span>Anteprima seduta destinazione</span>
        <strong>${esc(session.name || 'Seduta')}</strong>
      </div>
      <em>${exercises.length} esercizi inseriti</em>
    </div>
    <div class="builder-preview-list">
      ${exercises.length
        ? exercises.map((exercise, index) => `
          <button class="builder-preview-item${exercise.id === state.lastAddedExerciseId ? ' just-added' : ''}" type="button" data-jump-exercise="${esc(exercise.id || '')}">
            <b>${index + 1}</b>
            <span>${esc(exercise.name || 'Esercizio')}</span>
            <em>${esc(normalizeProgression(exercise.progression)?.name || 'Manuale')}</em>
          </button>
        `).join('')
        : '<div class="empty compact-empty">Questa seduta e vuota: il prossimo esercizio comparira qui subito.</div>'}
    </div>
  `;
}

function renderBuilderProgressionPreview() {
  if (!els.progressionPreview) return;
  const progression = state.builderProgression;
  if (!progression || progression === 'manual') {
    els.progressionPreview.innerHTML = '<div class="progression-preview-empty">Progressione manuale: aggiungi l esercizio e compila liberamente.</div>';
    return;
  }
  els.progressionPreview.innerHTML = `
    <div class="progression-preview-head">
      <strong>${esc(progression.name)}</strong>
      <span>TUT ${esc(progression.tut)}</span>
    </div>
    <div class="progression-preview-grid">
      ${progression.sessions.map((item, index) => `
        <div><span>Sed.${index + 1}</span><strong>${esc(item)}</strong></div>
      `).join('')}
    </div>`;
}

function syncProgramEditor() {
  els.sessionEditor.querySelectorAll('[data-session-index]').forEach((sessionEl) => {
    const session = state.programSessions[Number(sessionEl.dataset.sessionIndex)];
    sessionEl.querySelectorAll('[data-session-field]').forEach((input) => {
      session[input.dataset.sessionField] = input.value;
    });
  });
}

function readProgramForm() {
  syncProgramEditor();
  const program = {
    id: els.programId.value || id('pt_program'),
    client_id: els.programClient.value,
    trainer_id: state.currentPt.id,
    created_by: state.currentPt.id,
    name: els.programName.value.trim() || 'Scheda PT',
    goal: els.programGoal.value.trim(),
    level: els.programLevel.value,
    weeks: Number(els.programWeeks.value || 4),
    frequency: Number(els.programFrequency.value || 1),
    split: els.programSplit.value.trim(),
    start_date: els.programStart.value,
    end_date: els.programEnd.value,
    status: els.programStatus.value || 'bozza',
    notes: els.programNotes.value.trim(),
    sessions: state.programSessions,
  };
  program.neacea_string = buildNeaceaString(program);
  return program;
}

function updateNeaceaPreview() {
  const program = readProgramForm();
  els.neaceaString.textContent = buildNeaceaString(program);
}

function renderSessionEditorAtSamePoint() {
  const scrollY = window.scrollY;
  renderSessionEditor();
  window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0 }));
}

function addPickedExercise() {
  syncProgramEditor();
  ensureProgramSessions();
  const manualName = els.manualExerciseName.value.trim();
  const typedName = els.exerciseSearch.value.trim();
  const picked = state.builderExercise;
  const name = picked?.name || manualName || typedName;
  if (!name) throw new Error('Seleziona o scrivi un esercizio');
  const sessionIndex = Number(els.builderSession.value || state.builderSessionIndex || 0);
  state.builderSessionIndex = sessionIndex;
  const session = state.programSessions[sessionIndex];
  if (!session) throw new Error('Seleziona una seduta');
  if (!Array.isArray(session.blocks) || !session.blocks.length) {
    session.blocks = [{ id: id('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [] }];
  }
  const block = session.blocks[0];
  const progression = state.builderProgression === 'manual' ? null : normalizeProgression(state.builderProgression);
  const exercises = block.exercises || [];
  const exerciseId = id('exercise');
  exercises.push({
    id: exerciseId,
    order: exercises.length + 1,
    name,
    category: picked?.category || exerciseCategory(name) || 'Manuale',
    progression,
    sets: '',
    reps: progression?.sessions?.join(' / ') || '',
    rest: els.builderRest.value || "2'",
    tut: progression?.tut || '',
    load: '',
    notes: els.builderNotes.value.trim(),
  });
  block.exercises = exercises;
  state.lastAddedExerciseId = exerciseId;
  els.manualExerciseName.value = '';
  els.exerciseSearch.value = '';
  els.builderNotes.value = '';
  state.builderExercise = null;
  renderSessionEditorAtSamePoint();
  updateNeaceaPreview();
  toast(`${name} aggiunto a ${session.name || sessionName(sessionIndex)}`);
}

function programPayload(program) {
  return {
    ...program,
    name: cleanProgramName(program.name),
    schema_version: 3,
  };
}

async function saveProgram(event) {
  event?.preventDefault();
  const program = readProgramForm();
  if (!myClientIds().has(program.client_id)) {
    toast('Puoi salvare schede solo per i tuoi clienti assegnati', true);
    return;
  }
  await sb('schede_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: program.id,
      cliente_id: program.client_id,
      data: programPayload(program),
      updated_at: new Date().toISOString(),
    },
  });
  state.selectedProgramId = program.id;
  await loadPrograms();
  renderPrograms();
  renderClientDetail();
  toast('Scheda salvata');
}

async function archiveProgram() {
  if (!els.programId.value) return;
  els.programStatus.value = 'archiviata';
  await saveProgram();
}

async function saveExerciseLoad(sessionIndex, blockIndex, exerciseIndex) {
  syncProgramEditor();
  const session = state.programSessions[sessionIndex];
  const block = session?.blocks?.[blockIndex];
  const exercise = block?.exercises?.[exerciseIndex];
  if (!exercise) throw new Error('Esercizio non trovato');
  if (!els.programClient.value) throw new Error('Seleziona un cliente');

  const loadKey = `${sessionIndex}:${blockIndex}:${exerciseIndex}`;
  const box = els.sessionEditor.querySelector(`[data-load-exercise="${loadKey}"]`);
  if (!box) throw new Error('Box carichi non trovato');

  const date = box.querySelector('[data-load-date]')?.value || todayIso();
  const rows = Array.from(box.querySelectorAll('[data-load-row]')).map((row, index) => {
    const read = (field) => row.querySelector(`[data-load-field="${field}"]`)?.value.trim() || '';
    return {
      serie: index + 1,
      kg: read('kg'),
      ripetizioni: read('reps'),
      note: read('note'),
    };
  }).filter((row) => row.kg || row.ripetizioni || row.note);

  if (!rows.length) throw new Error('Inserisci almeno una serie');
  let programId = els.programId.value || state.selectedProgramId;
  if (!programId) {
    programId = id('pt_program');
    els.programId.value = programId;
    await saveProgram();
  }
  const rowId = `load_${els.programClient.value}_${programId}_${exercise.id}_${date}`.replace(/[^a-zA-Z0-9_]/g, '_');
  await sb('carichi_allenamento', '?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      id: rowId,
      cliente_id: els.programClient.value,
      data: {
        client_id: els.programClient.value,
        program_id: programId,
        program_name: els.programName.value,
        session_id: session.id,
        session_name: session.name,
        block_id: block.id,
        block_code: block.code,
        exercise_id: exercise.id,
        esercizio: exercise.name,
        progressione: normalizeProgression(exercise.progression)?.name || 'Manuale',
        data: date,
        serie: rows,
        created_by: state.currentPt.id,
      },
      updated_at: new Date().toISOString(),
    },
  });
  exercise.loads = [
    ...(Array.isArray(exercise.loads) ? exercise.loads.filter((item) => item.data !== date) : []),
    { data: date, serie: rows, updated_at: new Date().toISOString() },
  ].sort((a, b) => String(a.data).localeCompare(String(b.data)));
  await saveProgram();
  renderSessionEditorAtSamePoint();
}

function sessionsForRange(reference, view, onlyMine = false) {
  return state.sessions
    .filter((session) => !onlyMine || sessionTrainerId(session) === state.currentPt?.id)
    .filter((session) => session.status !== 'annullato')
    .filter((session) => {
      if (view === 'day') return session.date === reference;
      if (view === 'month') return sameMonth(session.date, reference);
      return sameWeek(session.date, reference);
    })
    .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
}

function rangeLabel(reference, view) {
  if (view === 'day') return formatDate(reference);
  if (view === 'month') return parseIso(reference).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const start = weekStart(reference);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatDate(dateKey(start))} - ${formatDate(dateKey(end))}`;
}

function renderMyAgenda() {
  const sessions = sessionsForRange(state.myReference, 'week', true);
  els.myRange.textContent = rangeLabel(state.myReference, 'week');
  els.myAgenda.innerHTML = sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna seduta per questa settimana</div>';
}

function renderStudioCalendar() {
  const sessions = sessionsForRange(state.calendarReference, state.calendarView, false);
  els.calRange.textContent = rangeLabel(state.calendarReference, state.calendarView);
  document.querySelectorAll('[data-cal-view]').forEach((button) => button.classList.toggle('active', button.dataset.calView === state.calendarView));
  if (state.calendarView === 'month') {
    renderMonth(sessions);
    return;
  }
  els.studioCalendar.className = 'calendar-list';
  els.studioCalendar.innerHTML = sessions.length ? sessions.map(renderSessionCard).join('') : '<div class="empty">Nessuna seduta nel periodo</div>';
}

function renderMonth(sessions) {
  const ref = parseIso(state.calendarReference);
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  const byDate = sessions.reduce((acc, session) => {
    acc[session.date] = acc[session.date] || [];
    acc[session.date].push(session);
    return acc;
  }, {});
  const cells = [];
  for (let i = 0; i < blanks; i++) cells.push('<div class="month-day empty"></div>');
  for (let day = 1; day <= last.getDate(); day++) {
    const key = dateKey(new Date(ref.getFullYear(), ref.getMonth(), day));
    const items = byDate[key] || [];
    cells.push(`
      <div class="month-day">
        <div class="month-number">${day}</div>
        ${items.map((item) => `<div class="month-item">${esc(formatTime(item.start_time))} ${esc(fullName(item))}</div>`).join('')}
      </div>
    `);
  }
  els.studioCalendar.className = 'calendar-list month';
  els.studioCalendar.innerHTML = cells.join('');
}

async function markSessionDone(appointmentId) {
  if (!appointmentId) return;
  const session = state.sessions.find((item) => item.appointment_id === appointmentId);
  if (!canManageSession(session)) {
    toast('Puoi aggiornare solo le sedute collegate alla tua mail', true);
    return;
  }
  if (session?.status === 'fatto') {
    toast('Seduta gia segnata come fatta');
    return;
  }
  await sb('appointments', `?id=eq.${encodeURIComponent(appointmentId)}&operator_id=eq.${encodeURIComponent(state.currentPt.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { status: 'fatto', updated_at: new Date().toISOString() },
  });
  await loadData();
  renderAll();
  toast('Seduta aggiornata');
}

async function editOwnSession(appointmentId) {
  if (!appointmentId) return;
  const session = state.sessions.find((item) => item.appointment_id === appointmentId);
  if (!canManageSession(session)) {
    toast('Puoi modificare solo le sedute collegate alla tua mail', true);
    return;
  }
  openSessionEditor(session);
}

function serviceOptions(selected = '') {
  return Object.values(SERVICES).map((service) =>
    `<option value="${esc(service.id)}" ${service.id === selected ? 'selected' : ''}>${esc(service.label)}</option>`
  ).join('');
}

function statusOptions(selected = '') {
  return Object.entries(STATUS_LABELS).map(([value, label]) =>
    `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`
  ).join('');
}

function clientOptions(selectedIds = [], serviceId = 'pt11') {
  const max = SERVICES[serviceId]?.maxClients || 1;
  return myClients().map((client) => {
    const selected = selectedIds.includes(client.client_id);
    return `<option value="${esc(client.client_id)}" ${selected ? 'selected' : ''}>${esc(fullName(client))}</option>`;
  }).join('') || '<option value="">Nessun cliente assegnato</option>';
}

function ensureSessionModal() {
  let modal = document.getElementById('sessionModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sessionModal';
  modal.className = 'modal-overlay hidden';
  modal.innerHTML = '<div class="modal-card" id="sessionModalCard"></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeSessionEditor();
  });
  return modal;
}

function closeSessionEditor() {
  state.editingSessionId = '';
  document.getElementById('sessionModal')?.classList.add('hidden');
}

function openSessionEditor(session) {
  state.editingSessionId = session.appointment_id;
  const modal = ensureSessionModal();
  const card = document.getElementById('sessionModalCard');
  const selectedIds = sessionClientIds(session);
  const serviceId = normalizeServiceId(session.service_id) || 'pt11';
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  card.innerHTML = `
    <div class="modal-head">
      <div>
        <h2>Modifica seduta</h2>
        <p>${esc(fullName(session))} · ${esc(serviceLabel(serviceId))}</p>
      </div>
      <button class="icon-btn" type="button" data-close-session-modal>×</button>
    </div>
    <div class="modal-body">
      <input id="editSessionId" type="hidden" value="${esc(session.appointment_id || '')}">
      <div class="form-grid modal-grid">
        <label><span>Servizio</span><select id="editSessionService">${serviceOptions(serviceId)}</select></label>
        <label><span>Stato</span><select id="editSessionStatus">${statusOptions(session.status || 'prenotato')}</select></label>
        <label><span>Data</span><input id="editSessionDate" type="date" value="${esc(session.date || todayIso())}"></label>
        <label><span>Ora</span><input id="editSessionTime" type="time" value="${esc(formatTime(session.start_time))}" step="900"></label>
        <label><span>Durata minuti</span><input id="editSessionDuration" type="number" min="15" step="15" value="${esc(serviceDuration(serviceId, session.duration_min))}"></label>
        <label><span>Operatore</span><input type="text" value="${esc(fullName(state.currentPt))}" disabled></label>
      </div>
      <label class="wide-label session-client-select">
        <span>Cliente${maxClients > 1 ? '/i' : ''}</span>
        <select id="editSessionClients" ${maxClients > 1 ? 'multiple size="5"' : ''}>
          ${clientOptions(selectedIds, serviceId)}
        </select>
      </label>
      <label class="wide-label">
        <span>Note</span>
        <textarea id="editSessionNotes" rows="3">${esc(session.notes || '')}</textarea>
      </label>
      <div id="editSessionHint" class="edit-hint"></div>
    </div>
    <div class="modal-foot">
      <button class="ghost-btn" type="button" data-close-session-modal>Annulla</button>
      <button class="primary-btn" type="button" data-save-session-modal>Salva modifiche</button>
    </div>
  `;
  modal.classList.remove('hidden');
  refreshSessionEditorClientMode();
}

function refreshSessionEditorClientMode() {
  const serviceId = document.getElementById('editSessionService')?.value || 'pt11';
  const clients = document.getElementById('editSessionClients');
  const duration = document.getElementById('editSessionDuration');
  const hint = document.getElementById('editSessionHint');
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  const selected = Array.from(clients?.selectedOptions || []).map((item) => item.value);
  if (duration && SERVICES[serviceId]) duration.value = SERVICES[serviceId].durationMin;
  if (clients) {
    clients.multiple = maxClients > 1;
    clients.size = maxClients > 1 ? 5 : 1;
    clients.innerHTML = clientOptions(selected, serviceId);
  }
  if (hint) {
    hint.textContent = maxClients > 1
      ? `Puoi selezionare fino a ${maxClients} clienti per ${serviceLabel(serviceId)}.`
      : 'Seduta individuale: seleziona un solo cliente.';
  }
}

async function saveSessionEditor() {
  const appointmentId = document.getElementById('editSessionId')?.value || state.editingSessionId;
  const original = state.sessions.find((item) => item.appointment_id === appointmentId);
  if (!canManageSession(original)) {
    toast('Puoi modificare solo le sedute collegate alla tua mail', true);
    return;
  }
  const serviceId = normalizeServiceId(document.getElementById('editSessionService')?.value || original.service_id || 'pt11');
  const maxClients = SERVICES[serviceId]?.maxClients || 1;
  const clientIds = Array.from(document.getElementById('editSessionClients')?.selectedOptions || [])
    .map((item) => item.value)
    .filter(Boolean)
    .slice(0, maxClients);
  if (!SERVICES[serviceId]?.maxClients && serviceId !== 'blocco') {
    toast('Servizio non valido', true);
    return;
  }
  if (serviceId !== 'blocco' && !clientIds.length) {
    toast('Seleziona almeno un cliente', true);
    return;
  }
  await sb('appointments', `?id=eq.${encodeURIComponent(appointmentId)}&operator_id=eq.${encodeURIComponent(state.currentPt.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      service_id: serviceId,
      client_ids: serviceId === 'blocco' ? [] : clientIds,
      operator_id: state.currentPt.id,
      date: document.getElementById('editSessionDate')?.value || original.date,
      start_time: document.getElementById('editSessionTime')?.value || original.start_time,
      duration_min: Number(document.getElementById('editSessionDuration')?.value || serviceDuration(serviceId, original.duration_min)),
      status: document.getElementById('editSessionStatus')?.value || original.status || 'prenotato',
      notes: document.getElementById('editSessionNotes')?.value || '',
      updated_at: new Date().toISOString(),
    },
  });
  closeSessionEditor();
  await loadData();
  renderAll();
  toast('Seduta modificata');
}

function bindEvents() {
  els.loginButton.addEventListener('click', loginByEmail);
  [els.loginEmail, els.loginCode].forEach((input) => input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loginByEmail();
  }));
  els.logoutButton.addEventListener('click', logout);
  els.refreshButton.addEventListener('click', async () => {
    await loadData();
    renderAll();
    toast('Dati aggiornati');
  });
  els.openCalendarButton.addEventListener('click', () => activateView('calendario'));
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.view).classList.add('active');
    });
  });
  els.clientSearch.addEventListener('input', renderClients);
  els.clientList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-client-id]');
    if (!card) return;
    state.selectedClientId = card.dataset.clientId;
    renderClients();
  });
  els.clientDetail.addEventListener('click', (event) => {
    const newFor = event.target.closest('[data-new-program-for]');
    const open = event.target.closest('[data-open-program]');
    if (newFor) {
      newProgram(newFor.dataset.newProgramFor);
    }
    if (open) {
      const program = state.programs.find((item) => item.id === open.dataset.openProgram);
      if (program) {
        state.selectedProgramId = program.id;
        activateView('schede');
        renderPrograms();
      }
    }
  });
  els.programClientFilter.addEventListener('change', () => {
    state.selectedProgramId = '';
    renderPrograms();
  });
  els.programStatusFilter.addEventListener('change', () => {
    state.selectedProgramId = '';
    renderPrograms();
  });
  els.programList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-program-id]');
    if (!card) return;
    state.selectedProgramId = card.dataset.programId;
    renderPrograms();
  });
  els.newProgramButton.addEventListener('click', () => newProgram());
  els.programForm.addEventListener('input', () => {
    syncProgramEditor();
    updateNeaceaPreview();
  });
  els.programForm.addEventListener('change', () => {
    syncProgramEditor();
    updateNeaceaPreview();
  });
  els.programForm.addEventListener('submit', async (event) => {
    try {
      clearError();
      await saveProgram(event);
    } catch (error) {
      showError(`Salvataggio scheda non riuscito: ${error.message}`);
    }
  });
  els.addSessionButton.addEventListener('click', () => {
    syncProgramEditor();
    const index = state.programSessions.length;
    state.programSessions.push({
      id: id('session'),
      name: sessionName(index),
      weekDay: String(index + 1),
      focus: '',
      duration: '60',
      warmup: '',
      cooldown: '',
      notes: '',
      blocks: [{ id: id('block'), code: 'N0', line: '', mode: 'Singolo', exercises: [] }],
    });
    renderSessionEditorAtSamePoint();
    updateNeaceaPreview();
  });
  els.archiveProgramButton.addEventListener('click', async () => {
    try {
      clearError();
      await archiveProgram();
    } catch (error) {
      showError(`Archiviazione non riuscita: ${error.message}`);
    }
  });
  els.exerciseSearch.addEventListener('input', renderExerciseBuilder);
  els.exerciseGroupFilter.addEventListener('change', renderExerciseBuilder);
  els.exerciseModeFilter.addEventListener('change', renderExerciseBuilder);
  els.builderRest.addEventListener('change', renderBuilderCurrent);
  els.builderSession.addEventListener('change', () => {
    syncProgramEditor();
    state.builderSessionIndex = Number(els.builderSession.value || 0);
    renderSessionEditorAtSamePoint();
  });
  els.exercisePickList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick-exercise]');
    if (!item) return;
    state.builderExercise = {
      name: item.dataset.pickExercise,
      category: item.dataset.pickCategory,
    };
    els.manualExerciseName.value = '';
    renderExerciseBuilder();
  });
  els.manualExerciseName.addEventListener('input', () => {
    if (els.manualExerciseName.value.trim()) {
      state.builderExercise = null;
      renderExerciseBuilder();
    }
    renderBuilderCurrent();
  });
  els.progressionTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-progression-group]');
    if (!tab) return;
    state.builderProgressionGroup = tab.dataset.progressionGroup;
    state.builderProgression = null;
    renderExerciseBuilder();
  });
  els.progressionPickList.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick-progression]');
    if (!item) return;
    state.builderProgression = item.dataset.pickProgression === 'manual'
      ? 'manual'
      : progressionByName(item.dataset.pickProgression);
    renderExerciseBuilder();
  });
  els.addPickedExerciseButton.addEventListener('click', () => {
    try {
      clearError();
      addPickedExercise();
    } catch (error) {
      showError(`Esercizio non aggiunto: ${error.message}`);
    }
  });
  els.builderSessionPreview.addEventListener('click', (event) => {
    const item = event.target.closest('[data-jump-exercise]');
    if (!item) return;
    const escapedId = window.CSS?.escape ? CSS.escape(item.dataset.jumpExercise) : String(item.dataset.jumpExercise).replaceAll('"', '\\"');
    const target = els.sessionEditor.querySelector(`[data-exercise-id="${escapedId}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  els.sessionEditor.addEventListener('click', async (event) => {
    const saveLoad = event.target.closest('[data-save-load]');
    if (saveLoad) {
      const [sessionIndex, blockIndex, exerciseIndex] = saveLoad.dataset.saveLoad.split(':').map(Number);
      try {
        clearError();
        await saveExerciseLoad(sessionIndex, blockIndex, exerciseIndex);
        saveLoad.textContent = 'Salvato';
        setTimeout(() => {
          saveLoad.textContent = 'Salva carichi';
        }, 1200);
      } catch (error) {
        showError(`Carichi non salvati: ${error.message}`);
      }
      return;
    }

    const addExercise = event.target.closest('[data-add-exercise]');
    const removeSession = event.target.closest('[data-remove-session]');
    const removeExercise = event.target.closest('[data-remove-exercise]');
    syncProgramEditor();

    if (addExercise) {
      const [sessionIndex, blockIndex] = addExercise.dataset.addExercise.split(':').map(Number);
      const exercises = state.programSessions[sessionIndex].blocks[blockIndex].exercises;
      const exercise = emptyExercise(exercises.length + 1);
      exercises.push(exercise);
      state.builderSessionIndex = sessionIndex;
      state.lastAddedExerciseId = exercise.id;
    }
    if (removeSession) {
      state.programSessions.splice(Number(removeSession.dataset.removeSession), 1);
    }
    if (removeExercise) {
      const [sessionIndex, blockIndex, exerciseIndex] = removeExercise.dataset.removeExercise.split(':').map(Number);
      state.programSessions[sessionIndex].blocks[blockIndex].exercises.splice(exerciseIndex, 1);
      state.programSessions[sessionIndex].blocks[blockIndex].exercises.forEach((exercise, index) => { exercise.order = index + 1; });
    }
    renderSessionEditorAtSamePoint();
    updateNeaceaPreview();
  });
  document.body.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-edit-session]');
    const done = event.target.closest('[data-session-done]');
    const closeModal = event.target.closest('[data-close-session-modal]');
    const saveModal = event.target.closest('[data-save-session-modal]');
    if (edit) editOwnSession(edit.dataset.editSession).catch((error) => toast(error.message, true));
    if (done) markSessionDone(done.dataset.sessionDone).catch((error) => toast(error.message, true));
    if (closeModal) closeSessionEditor();
    if (saveModal) saveSessionEditor().catch((error) => toast(error.message, true));
  });
  document.body.addEventListener('change', (event) => {
    if (event.target?.id === 'editSessionService') refreshSessionEditorClientMode();
  });
  document.querySelectorAll('[data-my-move]').forEach((button) => {
    button.addEventListener('click', () => {
      state.myReference = addDays(state.myReference, Number(button.dataset.myMove) * 7);
      renderMyAgenda();
    });
  });
  els.myTodayButton.addEventListener('click', () => {
    state.myReference = todayIso();
    renderMyAgenda();
  });
  document.querySelectorAll('[data-cal-move]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.calMove);
      state.calendarReference = state.calendarView === 'month'
        ? addMonths(state.calendarReference, step)
        : addDays(state.calendarReference, step * (state.calendarView === 'week' ? 7 : 1));
      renderStudioCalendar();
    });
  });
  els.calTodayButton.addEventListener('click', () => {
    state.calendarReference = todayIso();
    renderStudioCalendar();
  });
  document.querySelectorAll('[data-cal-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.calendarView = button.dataset.calView;
      renderStudioCalendar();
    });
  });
}

function activateView(name) {
  document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  document.querySelectorAll('.view').forEach((item) => item.classList.toggle('active', item.id === name));
}

function cacheEls() {
  [
    'loginScreen', 'app', 'loginEmail', 'loginCode', 'loginButton', 'loginError', 'currentPtName', 'logoutButton',
    'refreshButton', 'openCalendarButton', 'heroTitle', 'heroSub', 'errorBox', 'toast', 'kpiClienti', 'kpiOggi',
    'kpiSettimana', 'kpiStudio', 'mySessionCount', 'myNextSessions', 'alertCount', 'alertClients',
    'clientCount', 'clientSearch', 'clientList', 'clientDetail', 'programClientFilter',
    'programStatusFilter', 'programList', 'programCount', 'newProgramButton', 'programEditorTitle', 'programEditorStatus',
    'programForm', 'programId', 'programClient', 'programStatus', 'programName', 'programGoal',
    'programLevel', 'programWeeks', 'programFrequency', 'programSplit', 'programStart', 'programEnd',
    'programNotes', 'neaceaString', 'exerciseGroupFilter', 'exerciseModeFilter', 'exerciseSearch', 'manualExerciseName', 'builderRest', 'builderCurrent',
    'builderSession', 'addPickedExerciseButton', 'exercisePickList', 'progressionTabs',
    'progressionPickList', 'progressionPreview', 'builderNotes', 'addSessionButton', 'builderSessionPreview',
    'archiveProgramButton', 'sessionEditor',
    'myRange', 'myAgenda', 'myTodayButton', 'calRange', 'calTodayButton', 'studioCalendar',
  ].forEach((key) => { els[key] = document.getElementById(key); });
}

async function init() {
  cacheEls();
  bindEvents();
  try {
    await loadData();
    const urlEmail = new URLSearchParams(window.location.search).get('email');
    state.loginOperatorId = new URLSearchParams(window.location.search).get('op') || '';
    els.loginEmail.value = urlEmail || '';
    els.loginCode.focus();
  } catch (error) {
    els.loginError.textContent = `Caricamento non riuscito: ${error.message}`;
    els.loginError.classList.remove('hidden');
  }
}

init();
