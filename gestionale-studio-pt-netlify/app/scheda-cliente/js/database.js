
// ═══════════════════════════════════════════════════════
//  DATABASE ESERCIZI
// ═══════════════════════════════════════════════════════
const BAIOBIT_TESTS = ['Test Cammino','Test Spalla','Squat Jump','Rischio Caduta','Test Tronco','Test Cervicale','Drop Jump','Jump Monopodalico','Stiffness Test'];

const ESERCIZI = {
  'Mobilità Anca':['Hip 90/90','Hip CARs','Frog Stretch','Pigeon Stretch','Couch Stretch','Half Kneeling Hip Flexor','Deep Squat Hold','Lateral Lunge Stretch'],
  'Mobilità Toracica':['Thoracic Rotation','Open Book','Quadruped Thoracic Extension','Cat Cow','Thread the Needle','Foam Roller T-Spine'],
  'Mobilità Spalla / Scapola':['Shoulder CARs','Band Pull Apart','Wall Slide','Scapular Push Up','Prone Y-T-W','Bear Crawl Reach','Sleeper Stretch'],
  'Mobilità Caviglia':['Ankle CARs','Wall Ankle Mobilization','Half Kneeling Dorsiflexion','Banded Ankle Distraction'],
  'Attivazione Glutei':['Glute Bridge','Single Leg Glute Bridge','Clamshell','Banded Lateral Walk','Banded Monster Walk','Fire Hydrant','Donkey Kick'],
  'Attivazione Core':['Dead Bug','Bird Dog','Hollow Body Hold','Pallof Press Isometrico','McGill Curl Up','Side Plank Breve'],
  'Attivazione Scapolare':['Scapular Pull Up','Band Pull Apart','Face Pull Leggero','Prone Cobra','Wall Angel'],
  'Warm-Up Dinamico':['Leg Swing Frontale','Leg Swing Laterale','Hip Circle','Inchworm','World Greatest Stretch','Squat to Stand','Lunge with Rotation','High Knee','Butt Kick','Lateral Shuffle'],
  'Petto':['Bench Press','Incline Bench Press','Close Grip Bench Press','Smith Bench Press','Smith Incline Press','Dumbbell Press','Dumbbell Incline Press','Dumbbell Fly','Cable Fly Alto','Cable Fly Basso','Cable Fly Medio','Push Up','Dip'],
  'Schiena — Dorsali':['Lat Pulldown Presa Larga','Lat Pulldown Presa Stretta','Lat Pulldown Presa Neutra','Pull Up','Chin Up','Pulley Basso Presa Larga','Pulley Basso Presa Stretta','Pulley Basso Presa Neutra','Single Arm Cable Row','Bent Over Row','Smith Row','Dumbbell Row','Cable Straight Arm Pulldown'],
  'Schiena — Romboidi / Trapezio':['Face Pull','Cable Row Alta','Rear Delt Cable Fly','Dumbbell Rear Delt Fly','Bent Over Lateral Raise','Seated Cable Row Presa Larga'],
  'Spalle':['Overhead Press','Smith Overhead Press','Dumbbell Shoulder Press','Arnold Press','Lateral Raise DB','Lateral Raise Cavo','Front Raise DB','Front Raise Cavo','Upright Row','Cable Y-Raise','Landmine Press'],
  'Bicipiti':['Curl Bilanciere','Curl Manubri','Hammer Curl','Curl Cavo Basso','Curl Cavo Alto','Curl Barra EZ','Concentration Curl','Preacher Curl Cavo','Cable Drag Curl'],
  'Tricipiti':['Close Grip Bench Press','Dip','Tricep Pushdown Corda','Tricep Pushdown Barra','Overhead Tricep Extension Cavo','Overhead Tricep Extension DB','Skullcrusher','Single Arm Pushdown','Landmine Tricep Extension'],
  'Quadricipiti':['Squat','Front Squat','Squat Pausa','Pin Squat','Smith Squat','Hack Squat Bilanciere','Bulgarian Split Squat','Split Squat Smith','Goblet Squat','Landmine Squat','Dumbbell Lunge','Walking Lunge','Step Up'],
  'Posteriori Coscia / Glutei':['Romanian Deadlift','Deadlift','Good Morning','Hip Thrust Bilanciere','Hip Thrust Smith','Hip Thrust DB','Cable Pull Through','KB Swing','Nordic Curl','Reverse Hyperextension','Romanian Deadlift DB','Single Leg RDL'],
  'Polpacci':['Calf Raise Bilanciere','Calf Raise DB','Calf Raise Cavo','Seated Calf Raise'],
  'Core':['Plank','Side Plank','Dead Bug','Bird Dog','Pallof Press','Cable Crunch','Hanging Leg Raise','Ab Wheel','Landmine Rotation','Hollow Body','Russian Twist KB'],
  'Kettlebell — Balistici':['KB Swing','KB Clean','KB Snatch','KB Press','Turkish Get Up','Windmill','Halo','Dead Clean','Goblet Squat KB'],
  'Compound / Full Body':['Deadlift','Landmine Clean','Landmine Thruster','Farmer Walk','KB Complex'],

};

// ═══════════════════════════════════════════════════════
//  DATABASE PROGRESSIONI (completo)
// ═══════════════════════════════════════════════════════
const PROGRESSIONI = {
  '🔵 Tecnica':[
    {nome:'Circuito Tecnico Base',tut:'2/1/1/1',sedute:['2×10','2×10','3×10','3×10','3×12','3×12']},
    {nome:'Ladder Tecnico',tut:'2/1/1/1',sedute:['2×5 (4–3–2)','2×5 (4–3–2)','2×5 (4–3–2)','2×5 (4–3–2)','2×5 (4–3–2)','2×5 (4–3–2)']},
    {nome:'Progressione Lineare Tecnica',tut:'1/1/1/1',sedute:['3×8','3×9','3×10','4×8','4×9','4×10']},
    {nome:'Autoregolazione (Buffer)',tut:'1/1/1/1',sedute:['3×8 BUF3','3×8 BUF3','3×9 BUF3','3×9 BUF3','4×8 BUF4','4×8 BUF4']},
    {nome:'Progressione Volume Tecnico',tut:'1/1/1/1',sedute:['2×10','3×10','3×10','4×10','4×10','5×10']},
  ],
  '🟢 Forza Base':[
    {nome:'Forza 5×5 Progressiva',tut:'2/1/1/1',sedute:['5×5 @70%','5×5 @72%','5×5 @74%','5×5 @76%','5×5 @80%','5×5 @82%']},
    {nome:'Cluster Tecnico Forza',tut:'1/1/1/1',sedute:['4×(2+2+2) @72%','4×(2+2+2) @75%','4×(2+2+2) @75%','4×(2+2+2) @77%','4×(2+2+2) @77%','4×(2+2+2) @78%']},
    {nome:'Forza Ondulata DUP',tut:'1/1/1/1',sedute:['4×6 @65%','5×5 @70%','6×4 @75%','4×6 @67%','5×5 @72%','6×4 @76%']},
    {nome:'Forza Lineare Base',tut:'2/1/1/1',sedute:['4×6 @65%','4×5 @70%','5×5 @72%','4×4 @75%','5×4 @77%','3×3 @80%']},
    {nome:'MAV + Back Off',tut:'2/1/1/1',sedute:['5×1@70%+2×5@60%','5×1@70%+2×5@60%','5×1@70%+2×5@60%','5×1@75%+2×5@60%','5×1@75%+2×5@60%','5×1@80%+2×5@60%']},
    {nome:'Forza a Ramp',tut:'1/1/1/1',sedute:['3×3 (70–72–74%)','3×3 (72–74–76%)','3×3 (74–76–78%)','3×3 (75–77–79%)','3×3 (76–78–80%)','3×3 (77–79–81%)']},
    {nome:'Buffer Costante',tut:'0/0/0/0',sedute:['4×6 BUF2','4×7 BUF2','4×8 BUF2','4×6 BUF2','4×7 BUF2','4×8 BUF2']},
    {nome:'Top Set + Back Off',tut:'2/1/1/1',sedute:['1×5@75%+2×6@65%','1×5@77%+2×6@65%','1×4@80%+3×6@68%','1×4@82%+3×6@68%','1×3@85%+3×5@70%','1×3@85%+3×5@70%']},
  ],
  '🟡 Ipertrofia':[
    {nome:'Ipertrofia Lineare',tut:'2/1/1/1',sedute:['4×8 @65%','4×9 @67%','4×10 @70%','5×8 @72%','5×9 @72%','5×10 @74%']},
    {nome:'Ipertrofia Ondulata',tut:'1/1/1/1',sedute:['4×10 @65%','4×8 @70%','5×6 @75%','4×10 @67%','4×8 @72%','5×6 @77%']},
    {nome:'Complementare Progressiva',tut:'1/1/1/1',sedute:['3×10','3×11','3×12','4×10','4×11','4×12']},
    {nome:'Isolamento Progressivo',tut:'1/1/1/1',sedute:['2×12','2×15','3×12','3×15','3×15','3×15']},
    {nome:'Rest Pause Ipertrofia',tut:'1/1/1/1',sedute:['3×10 (4–3)','3×11 (4–3)','3×12 (4–3)','4×10 (4–3)','4×11 (4–3)','4×12 (4–3)']},
    {nome:'Buffer Progressivo',tut:'2/1/1/1',sedute:['3×8 BUF2','3×9 BUF2','3×10 BUF2','4×8 BUF1','4×9 BUF1','4×10 BUF1']},
    {nome:'Superset Antagonista',tut:'1/1/1/1',sedute:['3×10','3×11','3×12','4×10','4×11','4×12']},
  ],
  '🟠 Densità':[
    {nome:'Densità Progressiva',tut:'2/1/1/1',sedute:['5×8 (120")', '5×8 (105")', '6×8 (90")', '6×8 (75")', '7×8 (75")', '8×8 (60")']},
    {nome:'Cluster Volume',tut:'2/1/1/1',sedute:['4×4 @75%','5×4 @75%','5×5 @80%','6×4 @80%','6×5 @82%','6×6 @82%']},
    {nome:'Myo Reps',tut:'2/1/1/1',sedute:['1×15+3×5','1×16+3×5','1×17+4×5','1×18+4×5','1×19+5×5','1×20+5×5']},
    {nome:'Rest Pause Volume',tut:'2/1/1/1',sedute:['3×12 (4–3)','3×13 (4–3)','3×14 (4–3)','4×12 (4–3)','4×13 (4–3)','4×14 (4–3)']},
    {nome:'Superset Volume',tut:'2/1/1/1',sedute:['3×12','3×12','4×12','4×12','4×15','4×15']},
  ],
  '🔴 Forza Avanzata':[
    {nome:'MAV Avanzata',tut:'2/1/1/1',sedute:['6×1@80%+3×3@70%','7×1@80%+4×3@70%','7×1@85%+4×2@75%','8×1@85%+5×2@75%','8×1@90%+5×2@80%','8×1@90%+5×2@80%']},
    {nome:'Cluster Alta Intensità',tut:'2/1/1/1',sedute:['4×2 @80%','4×2 @82%','5×2 @84%','5×2 @86%','5×2 @88%','6×2 @88%']},
    {nome:'DUP Avanzato',tut:'2/1/1/1',sedute:['4×6 @70%','5×4 @80%','4×5 @75%','5×6 @72%','5×3 @82%','4×4 @77%']},
    {nome:'Forza Dinamica Speed',tut:'2/1/1/1',sedute:['6×3 @60%','7×3 @65%','8×3 @65%','6×3 @70%','7×3 @70%','8×3 @75%']},
    {nome:'Top Set Avanzato',tut:'2/1/1/1',sedute:['1×5@80%+2×6@70%','1×4@82%+3×6@72%','1×4@84%+3×5@74%','1×3@86%+3×5@76%','1×3@88%+3×4@78%','1×2@90%+3×4@80%']},
    {nome:'Forza a Onde Wave',tut:'2/1/1/1',sedute:['3×3@80%+2×2@85%+1×1@88%','3×3@82%+2×2@85%+1×1@89%','3×3@83%+2×2@87%+1×1@90%','3×3@84%+2×2@88%+1×1@90%','3×3@86%+2×2@86%+1×1@90%','3×3@86%+2×2@88%+1×1@92%']},
  ],
  '⚫ Intensità':[
    {nome:'Cluster Massimale',tut:'1/0/1/1',sedute:['4×(1+1+1)@85%','4×(1+1+1)@87%','5×(1+1+1)@87%','5×(1+1+1)@90%','6×(1+1+1)@90%','6×(1+1+1)@92%']},
    {nome:'Ramp Intensità',tut:'2/1/1/1',sedute:['1×1@85%+3×3@70%','1×1@87%+3×3@73%','1×1@87%+3×2@75%','1×1@90%+3×2@77%','1×1@93%+3×1@80%','1×1@93%+2×1@80%']},
    {nome:'Top Set Massimale',tut:'1/1/1/1',sedute:['1×3@85%+2×4@75%','1×2@87%+3×4@75%','1×2@89%+3×3@77%','1×1@90%+3×3@77%','1×1@92%+3×2@80%','1×1@94%+2×2@80%']},
  ],
  '⚡ Peak':[
    {nome:'Peak + Back Off',tut:'2/1/1/1',sedute:['3×1@85%+3×6@70%','3×1@87%+3×6@70%','3×1@90%+4×6@72%','3×1@92%+4×6@72%','3×1@93%+4×6@73%','3×1@95%+5×5@75%']},
    {nome:'Peak a Onde',tut:'2/1/1/1',sedute:['3×3@80%–2×2@85%–1×1@90%','3×3@82%–2×2@86%–1×1@91%','3×3@82%–2×2@87%–1×1@92%','3×3@83%–2×2@88%–1×1@93%','3×3@84%–2×2@89%–1×1@94%','3×3@85%–2×2@90%–1×1@95%']},
    {nome:'Test Massimale Progressivo',tut:'1/0/1/1',sedute:['5×3@80%','4×2@85%','3×1@90%','3×1@92%','2×1@94%','1×1@97–100%']},
  ],
  '⚪ Scarico':[
    {nome:'Volume Minimo',tut:'2/1/1/1',sedute:['3×8','3×8','3×8','3×8','3×8','3×8']},
    {nome:'Linear Light',tut:'2/1/1/1',sedute:['3×6–8','3×6–8','3×6–8','3×6–8','3×6–8','3×6–8']},
    {nome:'Buffer Alto Costante',tut:'3/1/1/1',sedute:['3×8@65%','3×8','3×8','3×8','3×8','3×8']},
  ],
  '🟣 Core':[
    {nome:'Core Stabilità',tut:'2/1/2/1',sedute:['3×25"','3×30"','2×25"/lat','2×30"/lat','3×20"','3×25"']},
    {nome:'Core Ipertrofia',tut:'2/1/2/1',sedute:['3×12','3×13','3×10–12','4×12–14','4×12–14','4×12–15']},
    {nome:'Core Circuito',tut:'2/1/2/1',sedute:['2 giri×3 ex','2 giri (rip+)','3 giri','3 giri (rip+)','3 giri','3–4 giri']},
  ],
  '🟢 Trazioni':[
    {nome:'Negative + Isometria',tut:'3/0/1/0',sedute:['3×5" neg','3×6" neg','3×8"+iso','4×8"+iso','4×10"+iso','4×12"+iso']},
    {nome:'Con Elastico',tut:'2/1/1/1',sedute:['3×6','3×7','4×6','4×7','5×6','5×8']},
    {nome:'Ladder Trazioni',tut:'2/1/1/1',sedute:['2×(4–3–2)','2×(5–4–3)','2×(6–5–4)','3×(5–4–3)','3×(6–5–4)','3×(7–6–5)']},
  ],
};
