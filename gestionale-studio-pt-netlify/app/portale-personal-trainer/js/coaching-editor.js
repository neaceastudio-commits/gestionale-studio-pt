var NeaceaPTEditor=(()=>{var _e=Object.defineProperty;var ur=Object.getOwnPropertyDescriptor;var xr=Object.getOwnPropertyNames;var fr=Object.prototype.hasOwnProperty;var br=(r,i)=>{for(var a in i)_e(r,a,{get:i[a],enumerable:!0})},hr=(r,i,a,o)=>{if(i&&typeof i=="object"||typeof i=="function")for(let s of xr(i))!fr.call(r,s)&&s!==a&&_e(r,s,{get:()=>i[s],enumerable:!(o=ur(i,s))||o.enumerable});return r};var yr=r=>hr(_e({},"__esModule",{value:!0}),r);var bi={};br(bi,{applySnapshot:()=>he,copyProgramSnapshot:()=>Xe,duplicateDaySnapshot:()=>Ze,inheritLegacyWeeks:()=>er,mount:()=>fi,toSnapshot:()=>pe});function De(r,i,a){for(let o of i.days){let s=r.days.find(c=>c.key===o.key);if(!s){for(let c of i.weeks.filter(p=>p>a))o.exercisesByWeek[c]=structuredClone(o.exercisesByWeek[a]||[]),o.groupsByWeek[c]=structuredClone(o.groupsByWeek[a]||[]);continue}for(let c of["exercisesByWeek","groupsByWeek"]){let p=s[c][a]||[],b=o[c][a]||[];if(JSON.stringify(p)===JSON.stringify(b))continue;let x=new Set(p.filter(v=>!b.some(E=>E.key===v.key)).map(v=>v.key));for(let v of i.weeks.filter(E=>E>a)){let E=(o[c][v]||[]).filter(k=>!x.has(k.key));b.forEach((k,y)=>{let $=p.find(S=>S.key===k.key),M=E.find(S=>S.key===k.key);if(!M){E.splice(Math.min(y,E.length),0,structuredClone(k));return}for(let S of new Set([...Object.keys($||{}),...Object.keys(k)])){if(S==="key"||JSON.stringify($?.[S])===JSON.stringify(k[S]))continue;let f=s[c][v]?.find(L=>L.key===k.key);JSON.stringify(M[S])===JSON.stringify(f?.[S])&&(k[S]===void 0?delete M[S]:M[S]=structuredClone(k[S]))}});let m=p.map(k=>k.key).join("|"),z=b.map(k=>k.key);m!==z.join("|")&&E.sort((k,y)=>{let $=z.indexOf(k.key),M=z.indexOf(y.key);return($<0?9999:$)-(M<0?9999:M)}),o[c][v]=E}}}}function ge(r){let i=[],a=r;for(;a;)a instanceof Element&&i.push({node:a,top:a.scrollTop,left:a.scrollLeft}),a=a.parentNode||(a instanceof ShadowRoot?a.host:null);let o=r.ownerDocument.scrollingElement;return o&&!i.some(s=>s.node===o)&&i.push({node:o,top:o.scrollTop,left:o.scrollLeft}),()=>{for(let s of i)s.node.scrollTop=s.top,s.node.scrollLeft=s.left}}function je(r){r.querySelectorAll("input,textarea").forEach(i=>{i.setAttribute("autocomplete","off"),i.setAttribute("data-1p-ignore",""),i.setAttribute("data-lpignore","true"),i.setAttribute("data-form-type","other")})}function we(r){let i=r.structuredPrescription??r.structure;return i?i.setGroups.reduce((a,o)=>a+o.sets,0):r.sets}var Ee={"Mobilita / Prehab":["90/90 anche","90/90 switch","CARs anca","CARs spalla","CARs caviglia","Frog stretch","World greatest stretch","Allungamento flessori anca","Couch stretch","Tenuta squat profondo","Prying squat","Rockback aduttori","Mobilita toracica quadrupedia","Open book toracico","Cat cow","Scapular push up","Wall slide","Wall angel","Extrarotazioni elastico","Intrarotazioni elastico","Band pull apart","Face pull elastico","Dislocazioni bastone","Tibialis raise","Mobilita caviglia muro","Jefferson curl leggero","Shoulder tap plank","Bear crawl lento"],"Attivazione / Core":["Dead bug","Dead bug con elastico","Dead bug contralaterale","Bird dog","Bird dog row","Tenuta hollow","Hollow rock","Pallof press isometrico","Pallof press dinamico","Pallof press in affondo","Side plank breve","Side plank abduzione","Plank","Plank reach","RKC plank","Ab wheel","Crunch al cavo","Sollevamento gambe alla sbarra","Glute bridge attivazione","Monster walk elastico","Lateral band walk","Clamshell elastico","Scapular pull up","Push up plus","Y-T-W prone"],"Petto - Bilanciere / Multipower":["Panca piana bilanciere","Panca inclinata bilanciere","Panca declinata bilanciere","Panca presa stretta","Panca presa larga","Panca con fermo al petto","Panca Spoto press","Panca floor press bilanciere","Panca pin press","Panca board press","Panca tempo 3-1-1","Panca Smith machine piana","Panca Smith machine inclinata","Panca Smith machine declinata","JM press bilanciere"],"Petto - Manubri / Macchine":["Spinte manubri panca piana","Spinte manubri panca inclinata","Spinte manubri panca declinata","Spinte manubri presa neutra","Spinte manubri alternate","Floor press manubri","Chest press","Chest press convergente","Chest press monolaterale","Chest press inclinata","Chest press declinata","Pec deck","Croci manubri panca piana","Croci manubri panca inclinata","Pullover manubrio","Squeeze press manubri"],"Petto - Cavi / Corpo libero":["Croci cavi alti","Croci cavi bassi","Croci cavi medi","Croci cavi monolaterali","Cable press monolaterale","Piegamenti","Piegamenti inclinati","Piegamenti declinati","Piegamenti presa stretta","Piegamenti con pausa","Piegamenti zavorrati","Dip alle parallele","Dip assistite","Dip chest focus","Ring push up","TRX chest press"],"Schiena - Trazioni / Lat":["Lat machine presa larga","Lat machine presa stretta","Lat machine presa neutra","Lat machine inversa","Lat machine monolaterale","Lat machine kneeling monolaterale","Trazioni prone","Trazioni supine","Trazioni neutre","Trazioni assistite","Trazioni elastico","Trazioni negative","Trazioni zavorrate","Scapular pull up","Pulldown braccia tese al cavo","Pulldown corda","Pullover macchina","Pullover cavo alto"],"Schiena - Rematori / Pulley":["Pulley basso presa larga","Pulley basso presa stretta","Pulley basso presa neutra","Pulley alto","Pulley monolaterale","Rematore cavo monolaterale","Rematore bilanciere","Rematore pendlay","Rematore T-bar","Rematore landmine","Rematore Smith machine","Rematore manubrio","Rematore manubri panca inclinata","Rematore chest supported","Rematore macchina convergente","Rematore macchina monolaterale","Seal row","Inverted row","TRX row","Meadows row"],"Schiena - Deltoidi posteriori / Trapezi":["Face pull","Face pull alto","Face pull con extrarotazione","Rematore alto al cavo","Rematore alto macchina","Croci inverse al cavo","Croci inverse manubri","Reverse pec deck","Alzate posteriori busto flesso","Alzate posteriori panca inclinata","Y raise al cavo","Y raise panca inclinata","Trap 3 raise","Scrollate manubri","Scrollate bilanciere","Scrollate Smith machine","Farmer shrug","Prone cobra"],"Spalle - Press":["Military press","Military press seduto","Military press Smith machine","Push press","Strict press manubri","Spinte manubri spalle","Spinte manubri seduto","Shoulder press macchina","Shoulder press convergente","Arnold press","Landmine press","Landmine press mezzo inginocchio","Z press","Pike push up","Handstand push up assistito"],"Spalle - Alzate / Isolamento":["Alzate laterali manubri","Alzate laterali al cavo","Alzate laterali monolaterali","Alzate laterali macchina","Alzate laterali busto inclinato","Alzate laterali parziali","Alzate frontali manubri","Alzate frontali al cavo","Alzate frontali disco","Tirate al mento","Tirate al mento cavo","Cuban press","Extrarotazioni spalla cavo","Intrarotazioni spalla cavo","L raise","Scaption raise"],Bicipiti:["Curl bilanciere","Curl bilanciere presa larga","Curl bilanciere presa stretta","Curl barra EZ","Curl manubri","Curl alternato","Curl martello","Curl martello cross body","Curl inclinato manubri","Curl spider manubri","Curl spider EZ","Curl concentrato","Curl panca Scott","Curl panca Scott al cavo","Curl macchina","Curl cavo basso","Curl cavo alto","Curl bayesian","Curl drag","Curl Zottman","Curl reverse EZ","Curl 21"],Tricipiti:["Panca presa stretta","Dip alle parallele","Dip panchetta","Dip assistite","Pushdown corda","Pushdown barra","Pushdown V bar","Pushdown monolaterale","Pushdown reverse grip","Estensioni tricipiti sopra testa al cavo","Estensioni tricipiti sopra testa manubrio","Estensioni tricipiti corda alto","French press bilanciere","French press manubri","Skull crusher","JM press","Kickback manubrio","Kickback cavo","Tate press","Estensioni tricipiti macchina"],"Gambe - Squat / Quadricipiti":["Squat","Back squat high bar","Back squat low bar","Front squat","Box squat","Squat con pausa","Tempo squat","Pin squat","Anderson squat","Squat Smith machine","Hack squat macchina","Hack squat bilanciere","Belt squat","Goblet squat","Landmine squat","Sissy squat","Spanish squat","Cyclist squat","Leg press 45","Leg press orizzontale","Leg press singola","Leg extension","Leg extension monolaterale","Leg extension tempo","Wall sit"],"Gambe - Affondi / Unilaterali":["Bulgarian split squat","Split squat","Split squat Smith machine","Affondi manubri","Affondi bilanciere","Affondi camminati","Affondi indietro","Affondi laterali","Affondi curtsy","Step up","Step down","Pistol squat assistito","Skater squat assistito","Cossack squat","Single leg box squat","Leg press monolaterale"],"Posteriori Coscia":["Stacco rumeno","Stacco rumeno manubri","Stacco rumeno monopodalico","Stacco rumeno B-stance","Stacco da terra","Stacco sumo","Stacco trap bar","Stacco deficit","Rack pull","Good morning","Good morning safety bar","Leg curl sdraiato","Leg curl seduto","Leg curl in piedi","Leg curl monolaterale","Nordic curl","Nordic curl assistito","Glute ham raise","Sliding leg curl","Fitball leg curl","Pull through al cavo","Back extension ham focus"],"Glutei / Abduttori / Adduttori":["Hip thrust bilanciere","Hip thrust Smith machine","Hip thrust manubrio","Hip thrust macchina","Hip thrust monolaterale","Glute bridge","Glute bridge bilanciere","Glute bridge monolaterale","Cable kickback","Kickback macchina","Abductor machine","Adductor machine","Abduzioni cavo","Adduzioni cavo","Frog pump","Frog pump elastico","Pull through glute focus","Step up glute focus","Reverse hyper","Back extension glute focus","Monster walk elastico","Lateral band walk"],Polpacci:["Calf raise bilanciere","Calf raise manubri","Calf raise alla pressa","Calf raise in piedi macchina","Calf raise Smith machine","Calf raise al cavo","Calf raise seduto","Calf raise seduto manubrio","Calf raise monolaterale","Donkey calf raise","Tibialis raise","Tibialis machine","Pogo jump","Seated calf tempo","Standing calf pausa in allungamento"],Core:["Plank","RKC plank","Side plank","Side plank abduzione","Dead bug","Bird dog","Pallof press","Pallof press walkout","Crunch al cavo","Crunch macchina","Crunch su fitball","Reverse crunch","Sollevamento gambe alla sbarra","Knee raise alla sbarra","Captain chair knee raise","Ab wheel","Ab wheel ginocchia","Rotazioni landmine","Hollow body","Hollow rock","Russian twist kettlebell","Woodchopper alto basso","Woodchopper basso alto","Farmer carry","Suitcase carry","Overhead carry","Front rack carry","Bear crawl","Mountain climber","Dragon flag assistita","Stir the pot fitball"],"Kettlebell / Clubbell":["Swing kettlebell","Swing kettlebell one arm","Clean kettlebell","Clean and press kettlebell","Snatch kettlebell","Press kettlebell","Push press kettlebell","Turkish get up","Windmill","Halo","Goblet squat kettlebell","Front squat doppio kettlebell","Rack carry kettlebell","Suitcase carry kettlebell","Bottom up press","Kettlebell row","Kettlebell deadlift","Kettlebell complex","Clubbell shield cast","Clubbell swipe"],"Power / Pliometria":["Box jump","Broad jump","Vertical jump","Squat jump","Split jump","Skater jump","Depth jump basso","Med ball slam","Med ball chest pass","Med ball rotational throw","Med ball scoop throw","Landmine clean","Landmine clean and press","Hang power clean tecnico","High pull bilanciere","Jump shrug","Sled sprint","Prowler push power"],"Conditioning / Full Body":["Air bike","Row erg","Ski erg","Tapis roulant inclinato","Assault runner","Sled push","Sled pull","Battle rope","Burpee","Burpee step back","Wall ball","Clean landmine","Thruster landmine","Thruster manubri","Thruster kettlebell","Man maker","Renegade row","Devil press","Camminata del contadino","Complex kettlebell","Complex bilanciere","TRX squat row","TRX atomic push up","Step mill","Jump rope","Bear crawl conditioning"]},Si=Object.keys(Ee),vr={"Push up plus":"Scapular push up","JM press":"JM press bilanciere","Leg press monolaterale":"Leg press singola","Hollow body":"Tenuta hollow","Camminata del contadino":"Farmer carry","Clean landmine":"Landmine clean","Complex kettlebell":"Kettlebell complex"},kr={Piegamenti:["Push-up"]};function te(r){return r.toLocaleLowerCase("it")}function h(r,i){return r.includes(i)}function _r(r,i){let a=te(r);if(/farmer carry|suitcase carry|overhead carry|front rack carry|rack carry/.test(a))return"carry";if(/pogo jump/.test(a))return"power";if(/tibialis/.test(a)&&h(i,"Polpacci"))return"isolation";if(/scapular pull up/.test(a)&&h(i,"Schiena - Trazioni / Lat"))return"vertical_pull";if(/monster walk|lateral band walk/.test(a)&&h(i,"Glutei / Abduttori / Adduttori"))return"isolation";if(h(i,"Power / Pliometria"))return"power";if(h(i,"Conditioning / Full Body"))return"conditioning";if(/pullover/.test(a))return"other";if(h(i,"Mobilita / Prehab"))return"mobility";if(h(i,"Attivazione / Core")||h(i,"Core"))return"core";if(h(i,"Petto - Bilanciere / Multipower")||h(i,"Petto - Manubri / Macchine")||h(i,"Petto - Cavi / Corpo libero"))return/croci|pec deck/.test(a)?"isolation":"horizontal_push";if(h(i,"Schiena - Trazioni / Lat"))return"vertical_pull";if(h(i,"Schiena - Rematori / Pulley"))return"horizontal_pull";if(h(i,"Schiena - Deltoidi posteriori / Trapezi"))return/rematore|face pull/.test(a)?"horizontal_pull":"isolation";if(h(i,"Spalle - Press"))return"vertical_push";if(h(i,"Spalle - Alzate / Isolamento")||h(i,"Bicipiti"))return"isolation";if(h(i,"Tricipiti"))return/panca presa stretta|dip/.test(a)?"horizontal_push":"isolation";if(h(i,"Gambe - Squat / Quadricipiti"))return/leg extension/.test(a)?"isolation":"squat";if(h(i,"Gambe - Affondi / Unilaterali"))return"squat";if(h(i,"Posteriori Coscia"))return/leg curl|nordic curl|glute ham raise|sliding leg curl|fitball leg curl/.test(a)?"isolation":"hinge";if(h(i,"Glutei / Abduttori / Adduttori"))return/step up/.test(a)?"squat":/kickback|abductor|adductor|abduzioni|adduzioni|frog pump|monster walk|lateral band walk/.test(a)?"isolation":"hinge";if(h(i,"Polpacci"))return"isolation";if(h(i,"Kettlebell / Clubbell")){if(/swing|deadlift/.test(a))return"hinge";if(/clean|snatch|complex|clubbell/.test(a))return"power";if(/goblet squat|front squat/.test(a))return"squat";if(/carry/.test(a))return"carry";if(/row/.test(a))return"horizontal_pull";if(/press/.test(a))return"vertical_push"}return"other"}function wr(r,i){let a=te(r);return h(i,"Power / Pliometria")||h(i,"Conditioning / Full Body")?"full_body":h(i,"Polpacci")?"calves":h(i,"Schiena - Trazioni / Lat")||h(i,"Schiena - Rematori / Pulley")?"lats_back":h(i,"Mobilita / Prehab")?"mobility":h(i,"Attivazione / Core")?/glute|monster walk|lateral band walk|clamshell/.test(a)?"glutes":/scapular|push up plus|y-t-w/.test(a)?"shoulders":"core":h(i,"Core")?"core":h(i,"Petto - Bilanciere / Multipower")||h(i,"Petto - Manubri / Macchine")||h(i,"Petto - Cavi / Corpo libero")?/panca presa stretta|jm press/.test(a)?"triceps":/pullover/.test(a)?"other":"chest":h(i,"Schiena - Deltoidi posteriori / Trapezi")?/scrollate|shrug|rematore alto/.test(a)?"lats_back":"shoulders":h(i,"Spalle - Press")||h(i,"Spalle - Alzate / Isolamento")?"shoulders":h(i,"Bicipiti")?"biceps":h(i,"Tricipiti")?"triceps":h(i,"Gambe - Squat / Quadricipiti")||h(i,"Gambe - Affondi / Unilaterali")?"quadriceps":h(i,"Posteriori Coscia")?"hamstrings":h(i,"Glutei / Abduttori / Adduttori")?"glutes":h(i,"Kettlebell / Clubbell")?"full_body":"other"}function zr(r,i){let a=te(r),o=[],s=(...c)=>{c.forEach(p=>{o.includes(p)||o.push(p)})};return h(i,"Petto - Bilanciere / Multipower")&&!/smith machine/.test(a)&&s("barbell"),h(i,"Spalle - Press")&&/military press|z press/.test(a)&&!/smith machine/.test(a)&&s("barbell","rack"),h(i,"Gambe - Squat / Quadricipiti")&&/back squat|front squat|box squat|squat con pausa|tempo squat|pin squat|anderson squat/.test(a)&&s("barbell","rack"),/air bike|row erg|ski erg|tapis roulant|assault runner|step mill/.test(a)&&s("cardio_machine"),/sled|prowler/.test(a)&&s("sled"),/med ball|wall ball/.test(a)&&s("medicine_ball"),/kettlebell/.test(a)&&s("kettlebell"),/clubbell/.test(a)&&s("club"),/landmine/.test(a)&&s("landmine"),/trx/.test(a)&&s("trx"),/elastico|band pull|band walk/.test(a)&&s("bands"),/cavo|cavi|cable|pulley|pushdown|pulldown|woodchopper/.test(a)&&s("cable"),/smith machine/.test(a)&&s("smith_machine"),/manubri|manubrio/.test(a)&&s("dumbbell"),/bilanciere|barra ez|reverse ez|spider ez|safety bar|complex bilanciere|high pull|jump shrug/.test(a)&&s("barbell"),/macchina|machine|pressa|leg press|leg extension|leg curl|lat machine|chest press|shoulder press|pec deck|hack squat/.test(a)&&s("machine"),/fitball/.test(a)&&s("fitball"),/trazioni|sbarra|scapular pull up/.test(a)&&s("pullup_bar"),/panca|bench|floor press|seal row|dip panchetta/.test(a)&&s("bench"),h(i,"Kettlebell / Clubbell")&&o.length===0&&s("kettlebell"),(h(i,"Mobilita / Prehab")||h(i,"Attivazione / Core")||h(i,"Core"))&&o.length===0&&s("bodyweight"),h(i,"Petto - Cavi / Corpo libero")&&o.length===0&&s("bodyweight"),h(i,"Conditioning / Full Body")&&o.length===0&&s("bodyweight"),/pike push up|handstand push up|pistol squat|skater squat|cossack squat|nordic curl|pogo jump/.test(a)&&o.length===0&&s("bodyweight"),o.length===0&&s("other"),o.includes("barbell")&&/panca|bench/.test(a)&&s("bench","rack"),o}var Pr=new Set(["Panca piana bilanciere","Back squat high bar","Back squat low bar","Front squat","Stacco da terra","Stacco sumo","Military press","Trazioni prone","Rematore bilanciere"]);function Er(r,i){let a=[];return Pr.has(r)&&a.push("fundamental","strength"),i==="isolation"&&a.push("isolation"),i==="power"&&a.push("power"),i==="conditioning"&&a.push("conditioning"),te(r).includes("tecnico")&&!a.includes("technical")&&a.push("technical"),a}function Sr(r){return r.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}var Pe=Object.entries(Ee).flatMap(([r,i])=>i.map(a=>({category:r,name:a}))),ue=new Map;Pe.forEach(({category:r,name:i})=>{let a=vr[i]??i,o=te(a),s=ue.get(o)??{name:a,aliases:new Set,sourceCategories:new Set};i!==a&&s.aliases.add(i),s.sourceCategories.add(r),ue.set(o,s)});Object.entries(kr).forEach(([r,i])=>{let a=ue.get(te(r));i.forEach(o=>a?.aliases.add(o))});var U=Array.from(ue.values()).map(r=>{let i=Array.from(r.sourceCategories),a=_r(r.name,i);return{id:`ex-${Sr(r.name)}`,name:r.name,aliases:Array.from(r.aliases),sourceCategories:i,pattern:a,primaryMuscleGroup:wr(r.name,i),equipment:zr(r.name,i),contexts:Er(r.name,a)}}),We=[{name:"Scapular push up",reason:"Pattern scapolare non equivalente a un push orizzontale completo."},{name:"Bird dog row",reason:"Componente core e tirata orizzontale entrambe rilevanti."},{name:"Panca presa stretta",reason:"Gruppo primario dipendente dall\u2019enfasi tecnica tra petto e tricipiti."},{name:"Dip alle parallele",reason:"Gruppo primario dipendente dall\u2019inclinazione e dall\u2019esecuzione."},{name:"Pullover manubrio",reason:"Pattern e gruppo primario non univoci tra petto e dorsali."},{name:"Pullover macchina",reason:"Pattern non sovrapponibile con certezza alla tirata verticale."},{name:"Pullover cavo alto",reason:"Pattern non sovrapponibile con certezza alla tirata verticale."},{name:"Tirate al mento",reason:"Pattern non univoco nel vocabolario minimale disponibile."},{name:"Cuban press",reason:"Movimento tecnico composito, classificato prudentemente come isolamento."},{name:"Nordic curl",reason:"Pattern di flessione del ginocchio non rappresentato nel vocabolario corrente."},{name:"Turkish get up",reason:"Movimento multi-pattern non riducibile a una sola categoria."},{name:"Windmill",reason:"Movimento multi-pattern con componente di mobilit\xE0 e controllo."},{name:"Kettlebell complex",reason:"La composizione concreta pu\xF2 spostare il contesto tra power e conditioning."},{name:"Renegade row",reason:"Tirata orizzontale inserita in un contesto full body/conditioning."},{name:"Bear crawl",reason:"Pu\xF2 essere usato come core, locomozione o conditioning in base al protocollo."}];function ze(r){return r.reduce((i,a)=>(i[a]=(i[a]??0)+1,i),{})}var Ri={sourceCount:Pe.length,canonicalCount:U.length,mergedCount:Pe.length-U.length,bySourceCategory:Object.fromEntries(Object.entries(Ee).map(([r,i])=>[r,i.length])),byPattern:ze(U.map(r=>r.pattern)),byPrimaryMuscleGroup:ze(U.map(r=>r.primaryMuscleGroup)),byPrimaryEquipment:ze(U.map(r=>r.equipment[0]))};var Rr={Tecnica:[{name:"Circuito Tecnico Base",sessions:["2x10","2x10","3x10","3x10","3x12","3x12"]},{name:"Ladder Tecnico",sessions:["2x5 (4-3-2)","2x5 (4-3-2)","2x5 (4-3-2)","2x5 (4-3-2)","2x5 (4-3-2)","2x5 (4-3-2)"]},{name:"Progressione Lineare Tecnica",sessions:["3x8","3x9","3x10","4x8","4x9","4x10"]},{name:"Apprendimento Pattern",sessions:["4x6 lente","4x7 lente","4x8","5x6","5x7","5x8"]},{name:"Isometria + Dinamica",sessions:['3x6 iso 2"','3x7 iso 2"','4x6 iso 2"',"4x7","4x8","5x6"]},{name:"Tecnica con Fermo",sessions:['3x6 fermo 2"','4x5 fermo 2"','4x6 fermo 2"','5x5 fermo 1"','5x6 fermo 1"',"4x8 fluide"]},{name:"Eccentrica Controllata",sessions:['3x8 ecc 4"','3x9 ecc 4"','4x8 ecc 3"','4x9 ecc 3"','5x8 ecc 3"',"4x10 fluide"]},{name:"ROM Progressivo",sessions:["3x8 ROM parziale","3x10 ROM parziale","4x8 ROM medio","4x10 ROM medio","4x8 ROM completo","4x10 ROM completo"]},{name:"Ramp Tecnico",sessions:["5x5 RPE6","5x5 RPE6.5","5x4 RPE7","6x4 RPE7","5x3 RPE7.5","4x5 RPE6"]},{name:"Contrasto Tecnico",sessions:["3x6 lento + 6 fluide","3x7 lento + 7 fluide","4x6 lento + 6 fluide","4x7 lento + 7 fluide","5x6 fluide","5x8 fluide"]}],Forza:[{name:"Forza 5x5 Progressiva",sessions:["5x5 @70%","5x5 @72%","5x5 @74%","5x5 @76%","5x5 @80%","5x5 @82%"]},{name:"Cluster Tecnico Forza",sessions:["4x(2+2+2) @72%","4x(2+2+2) @75%","4x(2+2+2) @75%","4x(2+2+2) @77%","4x(2+2+2) @77%","4x(2+2+2) @78%"]},{name:"Top Set + Back Off",sessions:["1x5@75%+2x6@65%","1x5@77%+2x6@65%","1x4@80%+3x6@68%","1x4@82%+3x6@68%","1x3@85%+3x5@70%","1x3@85%+3x5@70%"]},{name:"Doppia Progressione Forza",sessions:["4x4 RIR2","4x5 RIR2","5x4 RIR2","5x5 RIR1","6x4 RIR1","6x5 RIR1"]},{name:"Wave Loading",sessions:["6/4/2 x2","5/3/2 x2","6/4/2 x3","5/3/1 x3","4/3/2 x3","3/2/1 x3"]},{name:"Forza 3x5 Lineare",sessions:["3x5 RIR3","3x5 RIR2","4x5 RIR2","4x5 RIR1","5x5 RIR1","3x5 RIR3"]},{name:"5/3/1 Base",sessions:["5x65/75/85%","3x70/80/90%","5/3/1 75/85/95%","5x40/50/60%","5x70/80/90%","3x75/85/95%"]},{name:"Heavy Single + Volume",sessions:["1x1 RPE7 + 4x5","1x1 RPE7.5 + 4x4","1x1 RPE8 + 5x3","1x1 RPE8 + 4x3","1x1 RPE8.5 + 3x3","3x5 RPE6"]},{name:"Cluster Forza Massimale",sessions:["5x(1+1+1) @80%","5x(1+1+1) @82%","6x(1+1+1) @82%","5x(1+1) @85%","6x(1+1) @85%","4x3 @75%"]},{name:"Rest Pause Forza",sessions:["4x3+1 RIR2","4x3+1 RIR1","5x3+1 RIR1","4x2+2 RIR1","5x2+2 RIR1","3x5 RIR3"]},{name:"Progressione RPE",sessions:["4x6 RPE6","4x6 RPE7","5x5 RPE7","5x4 RPE8","6x3 RPE8","3x6 RPE6"]},{name:"Piramidale Forza",sessions:["8/6/4/4","8/6/4/3","6/5/4/3","5/4/3/2","4/3/2/2","3x6 back off"]},{name:"Tripla Progressione Forza",sessions:["4x3 RIR2","4x4 RIR2","4x5 RIR2","5x3 RIR1","5x4 RIR1","5x5 RIR1"]}],Ipertrofia:[{name:"Ipertrofia Lineare",sessions:["4x8 @65%","4x9 @67%","4x10 @70%","5x8 @72%","5x9 @72%","5x10 @74%"]},{name:"Complementare Progressiva",sessions:["3x10","3x11","3x12","4x10","4x11","4x12"]},{name:"Rest Pause Ipertrofia",sessions:["3x10 (4-3)","3x11 (4-3)","3x12 (4-3)","4x10 (4-3)","4x11 (4-3)","4x12 (4-3)"]},{name:"Doppia Progressione 8-12",sessions:["3x8 RIR2","3x10 RIR2","3x12 RIR2","4x8 RIR1","4x10 RIR1","4x12 RIR1"]},{name:"Accumulo Volume",sessions:["3x10","4x10","4x12","5x10","5x12","6x10"]},{name:"Doppia Progressione 6-10",sessions:["3x6 RIR2","3x8 RIR2","3x10 RIR2","4x6 RIR1","4x8 RIR1","4x10 RIR1"]},{name:"Doppia Progressione 10-15",sessions:["3x10 RIR2","3x12 RIR2","3x15 RIR2","4x10 RIR1","4x12 RIR1","4x15 RIR1"]},{name:"Reverse Pyramid Hypertrophy",sessions:["8/10/12","8/10/12 +kg","7/9/11 +kg","8/10/12 +kg","6/8/10 +kg","3x12 scarico"]},{name:"Top Set + Back Off Ipertrofia",sessions:["1x8 + 2x10","1x8 + 3x10","1x7 + 3x10","1x6 + 3x12","1x6 + 4x10","3x10 facile"]},{name:"Myo Reps Ipertrofia",sessions:["1x15+3x5","1x16+3x5","1x17+4x5","1x18+4x5","1x20+5x5","2x12 pulite"]},{name:"Drop Set Finale",sessions:["3x10 + drop","3x11 + drop","4x10 + drop","4x12 + drop","5x10 + drop","3x12 no drop"]},{name:"Mechanical Drop Set",sessions:["3 sequenze","3 sequenze +rip","4 sequenze","4 sequenze +rip","5 sequenze","3 sequenze pulite"]},{name:"Pre Exhaust",sessions:["Iso 2x15 + base 3x8","Iso 3x15 + base 3x8","Iso 3x12 + base 4x8","Iso 3x15 + base 4x10","Iso 4x12 + base 4x10","Base 3x10"]},{name:"Giant Set Ipertrofia",sessions:["3 giri x 3 ex","3 giri +rip","4 giri x 3 ex","4 giri +rip","5 giri densita","3 giri scarico"]},{name:"Specializzazione Pump",sessions:['4x15 60"','4x18 60"','5x15 60"','5x18 45"','6x15 45"','3x15 75"']}],Densita:[{name:"Densita Progressiva",sessions:['5x8 (120")','5x8 (105")','6x8 (90")','6x8 (75")','7x8 (75")','8x8 (60")']},{name:"Myo Reps",sessions:["1x15+3x5","1x16+3x5","1x17+4x5","1x18+4x5","1x19+5x5","1x20+5x5"]},{name:"EMOM Tecnico",sessions:["8x5 EMOM","10x5 EMOM","10x6 EMOM","12x5 EMOM","12x6 EMOM","14x5 EMOM"]},{name:"Tempo Density",sessions:['4x8 90"','4x8 75"','5x8 75"','5x8 60"','6x8 60"','6x10 60"']},{name:"AMRAP Controllato",sessions:["3xAMRAP RIR3","3xAMRAP RIR2","4xAMRAP RIR2","4xAMRAP RIR1","5xAMRAP RIR1","3x10 RIR3"]},{name:"EDT 10 Minuti",sessions:["10 min coppia ex","10 min +rip","12 min coppia ex","12 min +rip","15 min coppia ex","10 min facile"]},{name:"Circuito Metabolico",sessions:["3 giri 40/20","3 giri 45/15","4 giri 40/20","4 giri 45/15","5 giri 40/20","3 giri 30/30"]},{name:"Density Ladder",sessions:["1-2-3 x10 min","1-2-3 x12 min","2-3-4 x10 min","2-3-4 x12 min","3-4-5 x10 min","1-2-3 x8 min"]},{name:"Rest Reduction",sessions:['4x12 90"','4x12 75"','4x12 60"','5x12 60"','5x12 45"','3x12 90"']},{name:"Metabolic Finisher",sessions:["6 min easy","8 min easy","10 min medio","12 min medio","12 min forte","6 min easy"]}],Core:[{name:"Core Stabilita",sessions:['3x25"','3x30"','2x25"/lat','2x30"/lat','3x20"','3x25"']},{name:"Core Circuito",sessions:["2 giri x 3 ex","2 giri (rip+)","3 giri","3 giri (rip+)","3 giri","3-4 giri"]},{name:"Anti Rotazione",sessions:["3x10/lat","3x12/lat","4x10/lat","4x12/lat","5x10/lat","5x12/lat"]},{name:"Core Anti Estensione",sessions:['3x20"','3x25"','3x30"','4x25"','4x30"','3x20"']},{name:"Core Carry",sessions:["4x20m","4x25m","5x20m","5x25m","6x20m","4x20m facile"]},{name:"Core Rotazionale",sessions:["3x8/lat","3x10/lat","4x8/lat","4x10/lat","5x8/lat","3x8/lat facile"]},{name:"Core Bracing Forza",sessions:['5x10"','6x10"','5x15"','6x15"','8x10"','4x10"']},{name:"Core Dinamico",sessions:["3x10","3x12","4x10","4x12","5x10","3x10 facile"]}],Power:[{name:"Power Bassa Ripetizione",sessions:["6x3 esplosive","7x3 esplosive","8x2 esplosive","8x3 esplosive","10x2 esplosive","5x3 facili"]},{name:"Pliometria Progressiva",sessions:["4x3 basso impatto","5x3","5x4","6x3","6x4","4x3 controllo"]},{name:"Contrasto Forza Power",sessions:["3x3 forza + 3 jump","4x3 + 3 jump","4x2 + 4 jump","5x2 + 4 jump","5x1 + 5 jump","3x3 controllo"]},{name:"Med Ball Power",sessions:["5x4","6x4","6x5","8x4","8x5","5x4 easy"]},{name:"Speed Strength",sessions:["8x3 @50%","8x3 @55%","10x2 @60%","10x2 @65%","12x2 @60%","6x3 @50%"]}],Circuiti:[{name:"Circuito Base 3 Stazioni",sessions:["3 giri 10-10-10","3 giri 12-12-12","4 giri 10-10-10","4 giri 12-12-12","5 giri 10-10-10","3 giri easy"]},{name:"Circuito Upper Lower Core",sessions:["3 giri","3 giri +rip","4 giri","4 giri +rip","5 giri","3 giri scarico"]},{name:"Circuito A Tempo",sessions:["30/30 x3","35/25 x3","40/20 x3","40/20 x4","45/15 x4","30/30 x3"]},{name:"Circuito Forza Resistente",sessions:['4x8 + 60"','4x10 + 60"','5x8 + 60"','5x10 + 45"','6x8 + 45"','3x8 + 75"']},{name:"Circuito Dimagrimento",sessions:["20 min RPE6","22 min RPE6","24 min RPE7","26 min RPE7","28 min RPE7","20 min RPE6"]}],Scarico:[{name:"Volume Minimo",sessions:["3x8","3x8","3x8","3x8","3x8","3x8"]},{name:"Buffer Alto Costante",sessions:["3x8@65%","3x8","3x8","3x8","3x8","3x8"]},{name:"Deload Tecnico",sessions:["2x8 RIR4","2x10 RIR4","3x8 RIR4","3x10 RIR4","2x8 RIR5","2x10 RIR5"]},{name:"Scarico Volume 50%",sessions:["2x8 RIR4","2x8 RIR4","2x10 RIR4","3x8 RIR4","2x8 RIR5","2x10 RIR5"]},{name:"Scarico Intensita",sessions:["3x8 @55%","3x8 @60%","3x10 @55%","3x10 @60%","2x12 @50%","3x8 @55%"]},{name:"Reset Tecnico",sessions:["3x6 lente","3x8 lente","4x6 lente","4x8 lente","3x10 fluide","3x6 lente"]},{name:"Recupero Attivo",sessions:["2 giri easy","2 giri +mob","3 giri easy","3 giri +mob","20 min easy","2 giri easy"]}]},Cr={Tecnica:"technical",Forza:"strength",Ipertrofia:"hypertrophy",Densita:"density",Core:"other",Power:"other",Circuiti:"other",Scarico:"reset"},qr=new Set(["Rest Pause Ipertrofia","Myo Reps Ipertrofia","Drop Set Finale","Mechanical Drop Set","Pre Exhaust","Specializzazione Pump","Myo Reps"]),$r=new Set(["Top Set + Back Off Ipertrofia"]),Mr=new Set(["EMOM Tecnico"]),Lr=new Set(["Specializzazione Pump","Densita Progressiva","Tempo Density","Rest Reduction","Circuito Forza Resistente"]);function Tr(r,i){return r==="Tecnica"||Mr.has(i)?["technical"]:r==="Forza"||$r.has(i)?["fundamental"]:r==="Power"?["power"]:qr.has(i)?["isolation"]:r==="Ipertrofia"?["complementary"]:["other"]}function Ir(r,i){let a=i.trim(),o="",s="",c="",p="",b=a.match(/\b(?:RIR|RPE)\s?\d+(?:\.\d+)?\b/i);if(b&&(o=b[0].replace(/\s+/g,"").toUpperCase(),a=a.replace(b[0]," ").replace(/\s+/g," ").trim()),Lr.has(r)){let v=a.match(/(?:\(|\+\s*)?(\d+)"\)?$/);v&&(s=`${v[1]} sec`,a=a.slice(0,v.index).replace(/[\s+(]+$/,"").trim())}let x=a.match(/^(\d+)x([A-Za-z0-9]+(?:\/lat)?)/);return x&&(c=x[1],p=x[2],a=a.slice(x[0].length).trim()),{sets:c,reps:p,rirRpe:o,recovery:s,note:a}}function Ar(r){return r.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}var Q=Object.entries(Rr).flatMap(([r,i])=>{let a=r;return i.map(o=>({id:`prog-${Ar(o.name)}`,name:o.name,category:Cr[a],description:`Preset PT di sei settimane (${a}): ${o.sessions[0]} \u2192 ${o.sessions[5]}.`,suitableFor:Tr(a,o.name),weeks:o.sessions.map(s=>Ir(o.name,s))}))});var Br=["fundamental","compound","complementary","isolation","technical","power","core","conditioning","mobility","other"],Dr=["progression","intensity_technique","exercise_grouping","review"],Se=["squat","hinge","horizontal_push","vertical_push","horizontal_pull","vertical_pull"],jr=new Set(["Isometria + Dinamica","Tecnica con Fermo","Eccentrica Controllata","Contrasto Tecnico","Cluster Tecnico Forza","Cluster Forza Massimale","Rest Pause Forza","Rest Pause Ipertrofia","Myo Reps Ipertrofia","Drop Set Finale","Mechanical Drop Set","Pre Exhaust","Specializzazione Pump","Myo Reps","AMRAP Controllato"]),Wr=new Set(["Circuito Tecnico Base","Giant Set Ipertrofia","Circuito Metabolico","Core Circuito","Contrasto Forza Power","Circuito Base 3 Stazioni","Circuito Upper Lower Core","Circuito A Tempo","Circuito Forza Resistente","Circuito Dimagrimento"]),Fr=new Set(["Tempo Density","Metabolic Finisher","Recupero Attivo"]),Hr=new Set(["Core Stabilita","Anti Rotazione","Core Anti Estensione","Core Carry","Core Rotazionale","Core Bracing Forza","Core Dinamico"]),Gr=new Set(["Power Bassa Ripetizione","Pliometria Progressiva","Med Ball Power","Speed Strength"]),Nr=new Set(["Complementare Progressiva","Doppia Progressione 10-15"]),Kr=new Set(["Doppia Progressione 6-10","Reverse Pyramid Hypertrophy","Top Set + Back Off Ipertrofia"]);function Or(r){let i=[],a=(...o)=>{o.forEach(s=>{i.includes(s)||i.push(s)})};return r.contexts.includes("fundamental")&&a("fundamental","compound"),(r.pattern==="isolation"||r.contexts.includes("isolation"))&&a("isolation"),(r.pattern==="power"||r.contexts.includes("power"))&&a("power"),(r.pattern==="conditioning"||r.contexts.includes("conditioning"))&&a("conditioning"),r.pattern==="mobility"&&a("mobility"),(r.pattern==="core"||r.pattern==="carry")&&a("core"),r.contexts.includes("technical")&&a("technical"),Se.includes(r.pattern)&&(a("compound"),r.contexts.includes("fundamental")||a("complementary")),i.length===0&&a("other"),i}var Fe=U.map(r=>({exerciseId:r.id,exerciseClasses:Or(r)})),Li=Object.fromEntries(Br.map(r=>[r,Fe.filter(i=>i.exerciseClasses.includes(r)).length]));function re(r){let i=r.trim().toLocaleLowerCase("it");return U.find(a=>a.name.toLocaleLowerCase("it")===i||a.aliases.some(o=>o.toLocaleLowerCase("it")===i))}function se(r){return r?Fe.find(i=>i.exerciseId===r.id)?.exerciseClasses??["other"]:["other"]}function Ur(r){return jr.has(r.name)?"intensity_technique":Wr.has(r.name)?"exercise_grouping":Fr.has(r.name)?"review":"progression"}var He=Q.map(r=>({progressionId:r.id,type:Ur(r)})),Ti=Object.fromEntries(Dr.map(r=>[r,He.filter(i=>i.type===r).length]));function le(r){return He.find(i=>i.progressionId===r)?.type??"review"}function Vr(r){if(Hr.has(r.name))return{progressionId:r.id,exerciseClasses:["core"],patterns:["core","carry"]};if(Gr.has(r.name))return{progressionId:r.id,exerciseClasses:["power","technical"],patterns:["power"]};if(r.category==="strength"){let i=r.name==="Doppia Progressione Forza"?["fundamental","compound","complementary"]:["fundamental","compound"];return{progressionId:r.id,exerciseClasses:i,patterns:Se}}return r.category==="technical"?{progressionId:r.id,exerciseClasses:["fundamental","compound","complementary","technical"],patterns:Se}:r.category==="hypertrophy"?Nr.has(r.name)?{progressionId:r.id,exerciseClasses:["complementary","isolation"]}:Kr.has(r.name)?{progressionId:r.id,exerciseClasses:["fundamental","compound","complementary"]}:{progressionId:r.id,exerciseClasses:["fundamental","compound","complementary","isolation"]}:r.category==="density"?{progressionId:r.id,exerciseClasses:["compound","complementary","isolation","conditioning"]}:r.category==="reset"?{progressionId:r.id,exerciseClasses:["fundamental","compound","complementary","isolation","technical","power","core","conditioning","other"]}:{progressionId:r.id,exerciseClasses:["other"]}}var Jr=Q.filter(r=>le(r.id)==="progression").map(Vr);function Qr(r,i){return!(!se(r).some(o=>i.exerciseClasses.includes(o))||i.patterns&&(!r||!i.patterns.includes(r.pattern))||i.muscleGroups&&(!r||!i.muscleGroups.includes(r.primaryMuscleGroup)))}function Ge(r){return Q.filter(i=>{if(le(i.id)!=="progression")return!1;let a=Jr.find(o=>o.progressionId===i.id);return a?Qr(r,a):!1})}var Ii=[...Q.filter(r=>le(r.id)==="review").map(r=>({item:r.name,type:"progression",reason:"Il nome descrive un formato di lavoro che non \xE8 univocamente una progressione, una tecnica o un raggruppamento."})),...We.map(r=>({item:r.name,type:"exercise_classification",reason:r.reason})),{item:"Jump Set",type:"grouping",reason:"Non \xE8 supportato esplicitamente dalle fonti NEACEA gi\xE0 presenti in questa fase."}];var xe=[{id:"tech-isometry",name:"Isometria",sourceProgressionIds:["prog-isometria-dinamica"],exerciseClasses:["compound","complementary","isolation","technical"]},{id:"tech-pause",name:"Fermo",sourceProgressionIds:["prog-tecnica-con-fermo"],exerciseClasses:["fundamental","compound","complementary","technical"]},{id:"tech-eccentric",name:"Eccentrica controllata",sourceProgressionIds:["prog-eccentrica-controllata"],exerciseClasses:["compound","complementary","isolation","technical"]},{id:"tech-contrast",name:"Contrasto tecnico",sourceProgressionIds:["prog-contrasto-tecnico"],exerciseClasses:["fundamental","compound","technical"]},{id:"tech-cluster",name:"Cluster",sourceProgressionIds:["prog-cluster-tecnico-forza","prog-cluster-forza-massimale"],exerciseClasses:["fundamental","compound","power"],patterns:["squat","hinge","horizontal_push","vertical_push","horizontal_pull","vertical_pull","power"]},{id:"tech-rest-pause",name:"Rest-Pause",sourceProgressionIds:["prog-rest-pause-forza","prog-rest-pause-ipertrofia"],exerciseClasses:["compound","complementary","isolation"]},{id:"tech-myo-reps",name:"Myo-Reps",sourceProgressionIds:["prog-myo-reps-ipertrofia","prog-myo-reps"],exerciseClasses:["complementary","isolation"]},{id:"tech-drop-set",name:"Drop Set",sourceProgressionIds:["prog-drop-set-finale"],exerciseClasses:["complementary","isolation"]},{id:"tech-mechanical-drop-set",name:"Mechanical Drop Set",sourceProgressionIds:["prog-mechanical-drop-set"],exerciseClasses:["complementary","isolation"]},{id:"tech-pre-exhaust",name:"Pre-Exhaust",sourceProgressionIds:["prog-pre-exhaust"],exerciseClasses:["compound","complementary","isolation"]},{id:"tech-pump",name:"Pump",sourceProgressionIds:["prog-specializzazione-pump"],exerciseClasses:["complementary","isolation"]},{id:"tech-amrap",name:"AMRAP controllato",sourceProgressionIds:["prog-amrap-controllato"],exerciseClasses:["compound","complementary","isolation","conditioning"]}];function Ne(r){let i=se(r);return xe.filter(a=>i.some(o=>a.exerciseClasses.includes(o))&&(!a.patterns||!!(r&&a.patterns.includes(r.pattern))))}var ae=[{type:"superset",name:"Superset",initialExerciseCount:2,minimumExerciseCount:2,maximumExerciseCount:2},{type:"triple_set",name:"Triple Set",initialExerciseCount:3,minimumExerciseCount:3,maximumExerciseCount:3},{type:"giant_set",name:"Giant Set",initialExerciseCount:4,minimumExerciseCount:4},{type:"circuit",name:"Circuito",initialExerciseCount:3,minimumExerciseCount:3,maximumExerciseCount:8}];var Xr={"Assisted Pull-Up":{primary:"Trazioni assistite",secondary:"Assisted pull-up"},"Pull-Up":{primary:"Trazioni",secondary:"Pull-up"},"Seated Cable Row":{primary:"Rematore al cavo da seduto",secondary:"Seated cable row"},"Chest Supported Row Machine":{primary:"Rematore alla macchina con supporto al petto",secondary:"Chest-supported row machine"},"One Arm Cable Row":{primary:"Rematore al cavo a un braccio",secondary:"One-arm cable row"},"Dumbbell Pullover":{primary:"Pullover con manubrio",secondary:"Dumbbell pullover"},"One Arm Dumbbell Row":{primary:"Rematore con manubrio a un braccio",secondary:"One-arm dumbbell row"},"Barbell Row":{primary:"Rematore con bilanciere",secondary:"Barbell row"},"Chest Supported Dumbbell Row":{primary:"Rematore con manubri su panca inclinata",secondary:"Chest-supported dumbbell row"},"Band Lat Pulldown":{primary:"Lat pulldown con elastico",secondary:"Band lat pulldown"},"Kneeling Band Lat Pulldown":{primary:"Lat pulldown in ginocchio con elastico",secondary:"Kneeling band lat pulldown"},"Straight Arm Band Pulldown":{primary:"Pulldown a braccia tese con elastico",secondary:"Straight-arm band pulldown"},"Band Row":{primary:"Rematore con elastico",secondary:"Band row"},"One Arm Band Row":{primary:"Rematore a un braccio con elastico",secondary:"One-arm band row"},"Bodyweight Row (solo con struttura sicura)":{primary:"Rematore a corpo libero (solo con struttura sicura)",secondary:"Bodyweight row"},"Heel Elevated Squat":{primary:"Squat con talloni rialzati",secondary:"Heel-elevated squat"},"Single Leg Extension":{primary:"Leg extension a una gamba",secondary:"Single-leg extension"},"Rear Foot Elevated Split Squat":{primary:"Split squat con piede posteriore rialzato",secondary:"Rear-foot-elevated split squat"},"Bodyweight Heel Elevated Squat":{primary:"Squat a corpo libero con talloni rialzati",secondary:"Bodyweight heel-elevated squat"},"Assisted Squat":{primary:"Squat assistito",secondary:"Assisted squat"},"Tempo Squat":{primary:"Squat a tempo",secondary:"Tempo squat"},"Supported Split Squat":{primary:"Split squat assistito",secondary:"Supported split squat"},"Band Squat (se configurabile in sicurezza)":{primary:"Squat con elastico (se configurabile in sicurezza)",secondary:"Band squat"},"Goblet Squat dinamico":{primary:"Goblet Squat dinamico",secondary:"Dynamic goblet squat"},"Knee-to-Wall dinamico":{primary:"Mobilit\xE0 dinamica caviglia al muro",secondary:"Knee-to-wall"},"Squat dinamico con rialzo talloni":{primary:"Squat dinamico con talloni rialzati",secondary:"Heel-elevated dynamic squat"},"Hip Hinge con bastone":{primary:"Hip hinge con bastone",secondary:"Dowel hip hinge"},"Hamstring Sweep dinamico":{primary:"Mobilit\xE0 dinamica femorali",secondary:"Dynamic hamstring sweep"},"Scapular Push-up":{primary:"Push-up scapolare",secondary:"Scapular push-up"},"Wall Slide":{primary:"Scivolamento al muro",secondary:"Wall slide"},"Row tecnico leggero":{primary:"Rematore tecnico leggero",secondary:"Light technical row"},"Scapular Row":{primary:"Rematore scapolare",secondary:"Scapular row"},"Pulldown tecnico leggero":{primary:"Pulldown tecnico leggero",secondary:"Light technical pulldown"},"Scapular Pulldown":{primary:"Pulldown scapolare",secondary:"Scapular pulldown"},"Squat con rialzo talloni":{primary:"Squat con talloni rialzati",secondary:"Heel-elevated squat"},"Panca piana con manubri":{primary:"Panca piana con manubri",secondary:"Dumbbell bench press"},"Rematore su panca inclinata":{primary:"Rematore su panca inclinata",secondary:"Chest-supported dumbbell row"},"Alzate laterali":{primary:"Alzate laterali",secondary:"Lateral raises"},"Stacco rumeno con manubri":{primary:"Stacco rumeno con manubri",secondary:"Dumbbell Romanian deadlift"},"Lat machine presa neutra":{primary:"Lat machine presa neutra",secondary:"Neutral-grip lat machine"},"Affondi indietro":{primary:"Affondi indietro",secondary:"Reverse lunges"},"Curl con manubri":{primary:"Curl con manubri",secondary:"Dumbbell curl"},"Shoulder press con manubri":{primary:"Shoulder press con manubri",secondary:"Dumbbell shoulder press"},"Pulley basso":{primary:"Rematore al cavo basso",secondary:"Seated cable row"},"Pushdown ai cavi":{primary:"Pushdown ai cavi",secondary:"Cable pushdown"}};var oe={generalWarmup:{primary:"Riscaldamento generale",secondary:"General warm-up"},movementPreparation:{primary:"Preparazione al movimento",secondary:"Movement preparation"},rampUp:{primary:"Serie di avvicinamento",secondary:"Specific warm-up / ramp-up"},workingSets:{primary:"Serie allenanti",secondary:"Working sets"},deloadWeek:{primary:"Settimana di scarico",secondary:"Deload week"}};function fe(r){return Xr[r]??{primary:r}}var Zr=[1,2,3,4,5,6],ie="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),Yr=12,ei=[["technical","Tecnica"],["strength","Forza"],["hypertrophy","Ipertrofia"],["volume","Volume"],["intensity","Intensit\xE0"],["density","Densit\xE0"],["advanced","Avanzate"],["reset","Reset"]],ri=[["fundamental","Fondamentale"],["complementary","Complementare"],["isolation","Isolamento"],["technical","Tecnico"],["power","Power"]],ii={technical:"Tecnica",strength:"Forza",hypertrophy:"Ipertrofia",volume:"Volume",intensity:"Intensit\xE0",density:"Densit\xE0",advanced:"Avanzate",reset:"Reset",other:"Altro"},ti={fundamental:"Fondamentale",complementary:"Complementare",isolation:"Isolamento",technical:"Tecnico",power:"Power",other:"Altro"},ai={fundamental:"Fondamentale",compound:"Multiarticolare",complementary:"Complementare",isolation:"Isolamento",technical:"Tecnico",power:"Power",core:"Core",conditioning:"Conditioning",mobility:"Mobilit\xE0",other:"Altro"},Ke=[["chest","Petto"],["lats_back","Dorsali"],["shoulders","Spalle"],["biceps","Bicipiti"],["triceps","Tricipiti"],["quadriceps","Quadricipiti"],["hamstrings","Femorali"],["glutes","Glutei"],["calves","Polpacci"],["core","Core"],["full_body","Full body"]],Ve=[["squat","Accosciata"],["hinge","Estensione d\u2019anca"],["horizontal_push","Spinta orizzontale"],["vertical_push","Spinta verticale"],["horizontal_pull","Tirata orizzontale"],["vertical_pull","Tirata verticale"],["isolation","Isolamento"],["core","Core"],["power","Power"],["conditioning","Conditioning"],["mobility","Mobilit\xE0"],["carry","Carry"],["other","Altro"]],oi=[["bodyweight","Corpo libero"],["barbell","Bilanciere"],["dumbbell","Manubri"],["kettlebell","Kettlebell"],["cable","Cavi"],["machine","Macchina"],["smith_machine","Smith machine"],["rack","Rack"],["bench","Panca"],["pullup_bar","Sbarra trazioni"],["bands","Elastici"],["trx","TRX"],["landmine","Landmine"],["medicine_ball","Medicine ball"],["sled","Sled"],["cardio_machine","Cardio machine"],["other","Altro"]],ni={chest:"Petto",lats_back:"Dorsali",shoulders:"Spalle",biceps:"Bicipiti",triceps:"Tricipiti",quadriceps:"Quadricipiti",hamstrings:"Femorali",glutes:"Glutei",calves:"Polpacci",core:"Core",full_body:"Full body",mobility:"Mobilit\xE0",other:"Altro"},si=Object.fromEntries(Ve),li={bodyweight:"Corpo libero",barbell:"Bilanciere",dumbbell:"Manubri",kettlebell:"Kettlebell",cable:"Cavi",machine:"Macchina",smith_machine:"Smith machine",rack:"Rack",bench:"Panca",pullup_bar:"Sbarra trazioni",bands:"Elastici",trx:"TRX",landmine:"Landmine",medicine_ball:"Medicine ball",sled:"Sled",cardio_machine:"Cardio machine",club:"Clubbell",fitball:"Fitball",other:"Altro"},pi=[...U].sort((r,i)=>r.name.localeCompare(i.name,"it"));function ne(r){return r.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it").trim()}function di(r,i){return i?[r.name,...r.aliases].some(a=>ne(a).includes(i)):!0}function ci(r,i){let a=ne(r);return pi.filter(o=>di(o,a)&&(!i.muscleGroup||o.primaryMuscleGroup===i.muscleGroup)&&(!i.pattern||o.pattern===i.pattern)&&(!i.equipment||o.equipment.includes(i.equipment)))}function Ce(r){let i=new Set(U.filter(a=>!r||a.primaryMuscleGroup===r).map(a=>a.pattern));return Ve.filter(([a])=>i.has(a))}function qe(r,i){let a=new Set(U.filter(o=>(!r||o.primaryMuscleGroup===r)&&(!i||o.pattern===i)).flatMap(o=>o.equipment));return oi.filter(([o])=>a.has(o))}function Re(r){let i=Ce(r.muscleGroup);r.pattern&&!i.some(([o])=>o===r.pattern)&&(r.pattern="");let a=qe(r.muscleGroup,r.pattern);r.equipment&&!a.some(([o])=>o===r.equipment)&&(r.equipment="")}function l(r){return r.replace(/[&<>'"]/g,i=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"})[i]??i)}function Y(r,i){return`
    <span class="localized-term${i?` localized-term--${i}`:""}">
      <span class="localized-term__primary">${l(r.primary)}</span>
      ${r.secondary?`<span class="localized-term__secondary">${l(r.secondary)}</span>`:""}
    </span>
  `}function be(r){let i=r.trim().match(/^\d+/);return i?Math.max(0,Number.parseInt(i[0],10)):0}function Oe(r){return{sourceId:r.id,title:r.title,weeks:[...r.weeks],days:r.days.map((i,a)=>({key:`day-${i.id}-${a}`,letter:i.id,name:i.name,generalWarmup:[...i.generalWarmup],preparation:i.preparation.map((o,s)=>({key:`preparation-${i.id}-${s}`,name:o.name,setsReps:o.setsReps,cue:o.cue})),rampUp:i.specificWarmup.map((o,s)=>({key:`ramp-${i.id}-${s}`,exercise:o.exercise,steps:[...o.steps]})),exercisesByWeek:Object.fromEntries(r.weeks.map(o=>[o,i.exercises.map((s,c)=>{let p=s.progression[o-1],b=p.structuredPrescription??p.structure,x=Q.find(v=>v.id===s.progressionId)?.name;return{key:`exercise-${i.id}-${c}`,name:s.name,sets:String(p.sets),reps:p.reps,rir:p.rir,rest:p.rest,note:[s.note,p.note].filter(Boolean).join(`
`),progressionBase:x??"",techniqueId:"",techniqueName:"",techniqueNote:"",exerciseOrder:c,sessionId:`day-${i.id}-${a}`,...s.canonicalExerciseId?{canonicalExerciseId:s.canonicalExerciseId}:{},...s.role?{role:s.role}:{},...s.progressionId?{progressionId:s.progressionId}:{},...x?{progressionName:x}:{},...b?{structuredPrescription:structuredClone(b),realSetCount:we(p),prescriptionMode:"structured"}:{realSetCount:we(p),prescriptionMode:"manual"}}})])),groupsByWeek:r.weeks.reduce((o,s)=>(o[s]=[],o),{}),notes:[...i.notes]}))}}function mi(r){let i=structuredClone(r);return i.weeks=[...r.weeks??Zr],i.days.forEach(a=>{i.weeks.forEach(o=>{a.exercisesByWeek[o].forEach((s,c)=>{s.exerciseOrder=c,s.sessionId=a.key})})}),i}function gi(r){let i=structuredClone(r);return i.sets=String(i.realSetCount??i.structuredPrescription?.setGroups.reduce((a,o)=>a+o.sets,0)??be(i.sets)),i.structuredPrescription=void 0,i.realSetCount=be(i.sets),i.prescriptionMode="manual",i}function Ue(r){return r.filter(i=>i.trim().length>0)}function Je(r,i=1,a,o,s=async c=>window.confirm(c)){let c=[...r.weeks],p=Oe(r),b=structuredClone(p),x=i,v=p.days[0]?.key??"",E=p.days.reduce((t,e)=>Math.max(t,ie.indexOf(e.letter)+1),0),m=!1,z=!1,k=!1,y=0,$=new Set,M=new Map,S=new Map,f=null,L=null,W=null,B=document.createElement("section");B.className="manual-program-editor";let H=t=>(y+=1,`${t}-${Date.now()}-${y}`),X=t=>p.days.find(e=>e.key===t),de=t=>$.has(t)?" open":"",ye=structuredClone(p),A=()=>{De(ye,p,x),ye=structuredClone(p),z=!0,o?.(!0);let t=B.querySelector("[data-editor-local-state]");t&&(t.hidden=!1);let e=B.querySelector("[data-editor-toolbar-state]");e&&(e.textContent="Modifiche alla scheda")},ve=t=>{let e=M.get(t)??{muscleGroup:"",pattern:"",equipment:""};return M.set(t,e),e},Z=(t,e,n)=>`
    <option value="">${l(n)}</option>
    ${t.map(([d,u])=>`<option value="${l(d)}"${d===e?" selected":""}>${l(u)}</option>`).join("")}
  `,$e=()=>{if(!f)return[];let t=ne(f.query),n=X(f.dayKey)?.exercisesByWeek[x].find(C=>C.key===f?.exerciseKey),d=re(n?.name??"");return(f.showAll?Q.filter(C=>le(C.id)==="progression"):Ge(d)).filter(C=>(!t||ne(C.name).includes(t))&&(!f?.category||C.category===f.category)&&(!f?.suitableFor||C.suitableFor.includes(f.suitableFor)))},ir=t=>`
    <div class="progression-week-grid">
      ${t.weeks.map((e,n)=>`
        <article class="progression-week-card">
          <strong>W${n+1}</strong>
          <dl>
            ${e.sets?`<div><dt>Serie</dt><dd>${l(e.sets)}</dd></div>`:""}
            ${e.reps?`<div><dt>Reps</dt><dd>${l(e.reps)}</dd></div>`:""}
            ${e.rirRpe?`<div><dt>RIR/RPE</dt><dd>${l(e.rirRpe)}</dd></div>`:""}
            ${e.recovery?`<div><dt>Recupero</dt><dd>${l(e.recovery)}</dd></div>`:""}
            ${e.note?`<div class="progression-week-card__note"><dt>Nota</dt><dd>${l(e.note)}</dd></div>`:""}
          </dl>
        </article>
      `).join("")}
    </div>
  `,Me=t=>t.length>0?t.map(e=>`
        <button class="progression-picker-result${f?.selectedId===e.id?" progression-picker-result--selected":""}" type="button" data-progression-library-id="${l(e.id)}" aria-pressed="${f?.selectedId===e.id}">
          <strong>${l(e.name)}</strong>
          <span>${l(ii[e.category])} \xB7 ${l(e.suitableFor.map(n=>ti[n]).join(", "))}</span>
          <small>${l(e.description)}</small>
        </button>
      `).join(""):'<p class="progression-picker__empty">Nessuna progressione corrisponde ai filtri selezionati.</p>',Le=()=>{let t=Q.find(e=>e.id===f?.selectedId);return t?`
      <div class="progression-picker__preview-heading">
        <div><span>Anteprima 6 settimane</span><strong>${l(t.name)}</strong></div>
        <button type="button" data-editor-action="apply-progression" data-day-key="${l(f?.dayKey??"")}" data-item-key="${l(f?.exerciseKey??"")}">Applica questa progressione</button>
      </div>
      ${ir(t)}
    `:'<p class="progression-picker__empty">Seleziona una progressione per vedere l\u2019anteprima W1-W6.</p>'},tr=()=>{let t=$e(),n=X(f?.dayKey??"")?.exercisesByWeek[x].find(u=>u.key===f?.exerciseKey),d=se(re(n?.name??""));return`
      <section class="progression-picker" data-progression-panel>
        <header class="progression-picker__header">
          <div><span>Progression Library</span><strong>${f?.showAll?"Tutte le progressioni":"Compatibili con questo esercizio"}</strong></div>
          <button type="button" data-editor-action="close-progression" aria-label="Chiudi Progression Library">\xD7</button>
        </header>
        <p class="progression-picker__compatibility">Classe: ${l(d.map(u=>ai[u]).join(" \xB7 "))}</p>
        <label class="progression-picker__show-all"><input type="checkbox" data-progression-show-all${f?.showAll?" checked":""}> <span>Mostra tutte le progressioni</span></label>
        <div class="progression-picker__filters">
          <label><span>Ricerca</span><input type="search" data-progression-search value="${l(f?.query??"")}" placeholder="Nome progressione"></label>
          <label><span>Categoria</span><select data-progression-filter="category">${Z(ei,f?.category??"","Tutte")}</select></label>
          <label><span>Adatta a</span><select data-progression-filter="suitableFor">${Z(ri,f?.suitableFor??"","Tutti")}</select></label>
        </div>
        <p class="progression-picker__count" data-progression-count>${t.length} ${t.length===1?"progressione":"progressioni"}</p>
        <div class="progression-picker__results" data-progression-results>${Me(t)}</div>
        <div class="progression-picker__preview" data-progression-preview>${Le()}</div>
        <p class="progression-picker__freedom">Il preset non \xE8 un vincolo: dopo l\u2019applicazione ogni settimana resta modificabile.</p>
      </section>
    `},ar=(t,e)=>{let n=Ne(re(e.name)),d=xe.find(u=>u.id===L?.selectedId);return`
      <section class="technique-picker" data-technique-panel>
        <header class="progression-picker__header">
          <div><span>Tecniche d\u2019intensit\xE0</span><strong>Compatibili con questo esercizio</strong></div>
          <button type="button" data-editor-action="close-technique" aria-label="Chiudi tecniche">\xD7</button>
        </header>
        <div class="technique-picker__results">
          ${n.length>0?n.map(u=>`
            <button class="progression-picker-result${d?.id===u.id?" progression-picker-result--selected":""}" type="button" data-technique-id="${l(u.id)}" aria-pressed="${d?.id===u.id}">
              <strong>${l(u.name)}</strong>
              <small>${u.sourceProgressionIds.length} ${u.sourceProgressionIds.length===1,"record sorgente"}</small>
            </button>
          `).join(""):'<p class="progression-picker__empty">Nessuna tecnica compatibile classificata per questo esercizio.</p>'}
        </div>
        ${d?`
          <div class="technique-picker__apply">
            <label><span>Nota facoltativa</span><textarea rows="2" data-technique-note placeholder="Indicazione del coach">${l(L?.note??"")}</textarea></label>
            <button type="button" data-editor-action="apply-technique" data-day-key="${l(t.key)}" data-item-key="${l(e.key)}">Applica ${l(d.name)}</button>
          </div>
        `:""}
      </section>
    `},or=(t,e)=>`
    <section class="grouping-picker" data-grouping-panel>
      <header class="progression-picker__header">
        <div><span>Raggruppamento</span><strong>Scegli il tipo di blocco</strong></div>
        <button type="button" data-editor-action="close-grouping" aria-label="Chiudi raggruppamenti">\xD7</button>
      </header>
      <div class="grouping-picker__options">
        ${ae.map(n=>`
          <button type="button" data-editor-action="create-group" data-group-type="${n.type}" data-day-key="${l(t.key)}" data-item-key="${l(e.key)}">
            <strong>${l(n.name)}</strong>
            <span>${n.maximumExerciseCount===n.minimumExerciseCount?`${n.minimumExerciseCount} esercizi`:`minimo ${n.minimumExerciseCount}${n.maximumExerciseCount?` \xB7 massimo ${n.maximumExerciseCount}`:""}`}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `,Te=t=>{if(!t.structuredPrescription)return"";let e={working:"Working set",top_set:"Top Set",back_off:"Back-off",accessory:"Accessory set"};return`
      <div class="structured-prescription" data-structured-prescription>
        <div class="structured-prescription__heading"><strong>Prescrizione strutturata</strong><span>${t.realSetCount??t.structuredPrescription.setGroups.reduce((n,d)=>n+d.sets,0)} set reali</span></div>
        <dl>
          ${t.structuredPrescription.setGroups.map(n=>{let d=n.intensity?n.reps.replace(n.intensity,"").trim():n.reps;return`<div><dt>${e[n.kind]}</dt><dd>${n.sets}\xD7${l(d||n.reps)}${n.intensity?` ${l(n.intensity)}`:""}</dd></div>`}).join("")}
          <div><dt>RIR / RPE</dt><dd>${l(t.rir||"\u2014")}</dd></div>
          <div><dt>Recupero</dt><dd>${l(t.rest||"\u2014")}</dd></div>
        </dl>
      </div>
    `},nr=(t,e)=>`
    <tr>
      <th scope="row">
        ${Y(fe(t.name),"exercise")}
        ${e?`<small class="exercise-technique-label">${l(ae.find(n=>n.type===e.type)?.name||e.type)}${e.rounds?` \xB7 ${l(e.rounds)} giri`:""}${e.restBetweenRounds?` \xB7 recupero ${l(e.restBetweenRounds)}`:""}${e.note?` \xB7 ${l(e.note)}`:""}</small>`:""}
        ${t.progressionBase?`<small class="exercise-progression-base">Base: ${l(t.progressionBase)}</small>`:""}
        ${t.techniqueName?`<small class="exercise-technique-label">Tecnica: ${l(t.techniqueName)}${t.techniqueNote?` \xB7 ${l(t.techniqueNote)}`:""}</small>`:""}
        ${Te(t)}
        ${t.note?`<small>${l(t.note).replaceAll(`
`,"<br>")}</small>`:""}
      </th>
      <td data-label="Serie">${t.structuredPrescription?String(t.realSetCount??t.structuredPrescription.setGroups.reduce((n,d)=>n+d.sets,0)):l(t.sets)}</td>
      <td data-label="Ripetizioni">${l(t.reps)}</td>
      <td data-label="RIR / RPE">${l(t.rir)}</td>
      <td data-label="Recupero">${l(t.rest)}</td>
    </tr>
  `,Ie=(t,e,n,d,u,C=!1)=>{let F=ve(e.key);Re(F);let K=Ce(F.muscleGroup),D=qe(F.muscleGroup,F.pattern),_=`pt-movement-${e.key}`,I=`exercise-results-${e.key}`;return`
    <article class="exercise-editor-card" data-exercise-card="${l(e.key)}">
      <header class="exercise-editor-card__header">
        <span class="exercise-editor-card__number">${l(u??String(n+1))}</span>
        <div class="exercise-editor-card__identity"><strong>${l(e.name||"Nuovo esercizio")}</strong>${e.progressionBase?`<small>Base: ${l(e.progressionBase)}</small>`:""}${e.techniqueName?`<small class="exercise-editor-card__technique">Tecnica: ${l(e.techniqueName)}</small>`:""}</div>
        <div class="exercise-editor-card__mini-actions">
          <span class="exercise-editor-card__state">Locale</span>
          <button type="button" title="Sposta su" data-editor-action="move-exercise-up" data-day-key="${t.key}" data-item-key="${e.key}" aria-label="Sposta ${l(e.name||"esercizio")} in alto"${n===0?" disabled":""}>\u2191</button>
          <button type="button" title="Sposta gi\xF9" data-editor-action="move-exercise-down" data-day-key="${t.key}" data-item-key="${e.key}" aria-label="Sposta ${l(e.name||"esercizio")} in basso"${n===d-1?" disabled":""}>\u2193</button>
          <button type="button" title="Duplica" data-editor-action="duplicate-exercise" data-day-key="${t.key}" data-item-key="${e.key}" aria-label="Duplica ${l(e.name||"esercizio")}">Duplica</button>
          <button type="button" title="Rimuovi" data-editor-action="remove-exercise" data-day-key="${t.key}" data-item-key="${e.key}" aria-label="Rimuovi ${l(e.name||"esercizio")}">\xD7</button>
        </div>
      </header>
      <div class="exercise-editor-card__body">
        <div class="exercise-editor-card__fields">
          <div class="exercise-editor-field exercise-editor-field--name exercise-picker" data-exercise-picker="${l(e.key)}">
            <label for="${l(_)}">Esercizio</label>
            <input id="${l(_)}" data-editor-field="exercise" data-field="name" data-day-key="${t.key}" data-item-key="${e.key}" data-exercise-library-input value="${l(e.name)}" placeholder="Cerca nella Library o scrivi un nome libero" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${l(I)}">
            <div class="exercise-picker__panel" data-exercise-picker-panel hidden>
              <div class="exercise-picker__filters" aria-label="Filtri Exercise Library">
                <label><span>Gruppo muscolare</span><select data-exercise-picker-filter="muscleGroup" data-item-key="${e.key}">${Z(Ke,F.muscleGroup,"Tutti")}</select></label>
                <label><span>Pattern</span><select data-exercise-picker-filter="pattern" data-item-key="${e.key}">${Z(K,F.pattern,"Tutti")}</select></label>
                <label><span>Attrezzatura</span><select data-exercise-picker-filter="equipment" data-item-key="${e.key}">${Z(D,F.equipment,"Tutte")}</select></label>
              </div>
              <div class="exercise-picker__summary">
                <span data-exercise-picker-count></span>
                <span data-exercise-picker-status></span>
              </div>
              <div class="exercise-picker__results" id="${l(I)}" data-exercise-picker-results role="listbox" aria-label="Risultati Exercise Library"></div>
              <p class="exercise-picker__freedom">Puoi sempre mantenere o scrivere un nome libero.</p>
            </div>
          </div>
          ${Te(e)}
          ${e.structuredPrescription?'<p class="structured-prescription__notice">Serie e ripetizioni appartengono alla struttura. Per cambiarle, converti esplicitamente questa settimana in prescrizione manuale.</p>':""}
          <label class="exercise-editor-field"><span>Serie</span><input data-editor-field="exercise" data-field="sets" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.sets)}" inputmode="numeric"${e.structuredPrescription?' readonly aria-readonly="true"':""}></label>
          <label class="exercise-editor-field"><span>Ripetizioni</span><input data-editor-field="exercise" data-field="reps" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.reps)}"${e.structuredPrescription?' readonly aria-readonly="true"':""}></label>
          <label class="exercise-editor-field"><span>RIR / RPE</span><input data-editor-field="exercise" data-field="rir" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.rir)}"></label>
          <label class="exercise-editor-field"><span>Recupero</span><input data-editor-field="exercise" data-field="rest" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.rest)}"></label>
          <label class="exercise-editor-field exercise-editor-field--note"><span>Nota</span><textarea data-editor-field="exercise" data-field="note" data-day-key="${t.key}" data-item-key="${e.key}" rows="1">${l(e.note)}</textarea></label>
          ${e.techniqueName?`<label class="exercise-editor-field exercise-editor-field--note"><span>Nota tecnica \xB7 ${l(e.techniqueName)}</span><textarea data-editor-field="exercise" data-field="techniqueNote" data-day-key="${t.key}" data-item-key="${e.key}" rows="2" placeholder="Nota facoltativa">${l(e.techniqueNote)}</textarea></label>`:""}
        </div>
        <div class="exercise-editor-card__apply-actions">
          ${e.structuredPrescription?`<button type="button" data-editor-action="convert-structured-to-manual" data-day-key="${t.key}" data-item-key="${e.key}">Converti in manuale</button>`:""}
          <button class="exercise-editor-card__apply" type="button" data-editor-action="apply-future" data-day-key="${t.key}" data-item-key="${e.key}"${x===c.at(-1)?" disabled":""}>Applica alle settimane successive</button>
          <button class="exercise-editor-card__progression" type="button" data-editor-action="open-progression" data-day-key="${t.key}" data-item-key="${e.key}">Applica progressione</button>
          <button type="button" data-editor-action="open-technique" data-day-key="${t.key}" data-item-key="${e.key}">Tecnica</button>
          ${e.techniqueName?`<button type="button" data-editor-action="remove-technique" data-day-key="${t.key}" data-item-key="${e.key}">Rimuovi tecnica</button>`:""}
          ${C?"":`<button type="button" data-editor-action="open-grouping" data-day-key="${t.key}" data-item-key="${e.key}">Raggruppa esercizi</button>`}
        </div>
        ${f?.dayKey===t.key&&f.exerciseKey===e.key?tr():""}
        ${L?.dayKey===t.key&&L.exerciseKey===e.key?ar(t,e):""}
        ${W?.dayKey===t.key&&W.exerciseKey===e.key?or(t,e):""}
      </div>
    </article>
  `},sr=(t,e,n,d)=>{let u=ae.find(D=>D.type===e.type),C=e.exerciseKeys.map(D=>n.find(_=>_.key===D)).filter(D=>!!D),F=String.fromCharCode(65+d),K=u?.maximumExerciseCount===void 0||C.length<u.maximumExerciseCount;return`
      <section class="exercise-group-card" data-exercise-group="${l(e.key)}">
        <header class="exercise-group-card__header">
          <div><span>Blocco ${F}</span><strong>${l(u?.name??e.type)}</strong></div>
          <div><span>${C.length} esercizi</span><button type="button" data-editor-action="break-group" data-day-key="${l(t.key)}" data-group-key="${l(e.key)}">Rompi gruppo</button></div>
        </header>
        <div class="exercise-group-card__settings">
          <label><span>Numero round</span><input data-editor-field="group" data-field="rounds" data-day-key="${l(t.key)}" data-group-key="${l(e.key)}" value="${l(e.rounds)}"></label>
          <label><span>Recupero tra round</span><input data-editor-field="group" data-field="restBetweenRounds" data-day-key="${l(t.key)}" data-group-key="${l(e.key)}" value="${l(e.restBetweenRounds)}"></label>
          <label class="exercise-group-card__note"><span>Nota</span><input data-editor-field="group" data-field="note" data-day-key="${l(t.key)}" data-group-key="${l(e.key)}" value="${l(e.note)}"></label>
        </div>
        <div class="exercise-group-card__exercises">
          ${C.map((D,_)=>Ie(t,D,n.indexOf(D),n.length,`${F}${_+1}`,!0)).join("")}
        </div>
        ${K?`<button class="editor-add-action" type="button" data-editor-action="add-group-exercise" data-day-key="${l(t.key)}" data-group-key="${l(e.key)}">+ Aggiungi esercizio al gruppo</button>`:""}
      </section>
    `},lr=(t,e)=>{let n=t.groupsByWeek[x],d=new Set;return e.map((u,C)=>{let F=n.find(K=>K.exerciseKeys.includes(u.key));return F?d.has(F.key)?"":(d.add(F.key),sr(t,F,e,n.indexOf(F))):Ie(t,u,C,e.length)}).join("")},ke=()=>{let t=B.querySelector("[data-progression-panel]");if(!t||!f)return;let e=$e(),n=t.querySelector("[data-progression-count]"),d=t.querySelector("[data-progression-results]"),u=t.querySelector("[data-progression-preview]");n&&(n.textContent=`${e.length} ${e.length===1?"progressione":"progressioni"}`),d&&(d.innerHTML=Me(e)),u&&(u.innerHTML=Le())},ce=t=>{let e=t.querySelector("[data-exercise-picker-panel]"),n=t.querySelector("[data-exercise-library-input]");e&&(e.hidden=!0),n?.setAttribute("aria-expanded","false")},Ae=t=>{B.querySelectorAll("[data-exercise-picker]").forEach(e=>{e!==t&&ce(e)})},me=t=>{let e=t.closest("[data-exercise-picker]"),n=t.dataset.itemKey??"";if(!e||!n)return;let d=e.querySelector("[data-exercise-picker-panel]"),u=e.querySelector("[data-exercise-picker-count]"),C=e.querySelector("[data-exercise-picker-status]"),F=e.querySelector("[data-exercise-picker-results]"),K=e.querySelector('[data-exercise-picker-filter="muscleGroup"]'),D=e.querySelector('[data-exercise-picker-filter="pattern"]'),_=e.querySelector('[data-exercise-picker-filter="equipment"]');if(!d||!u||!C||!F||!K||!D||!_)return;let I=ve(n);Re(I);let R=Ce(I.muscleGroup),q=qe(I.muscleGroup,I.pattern);K.innerHTML=Z(Ke,I.muscleGroup,"Tutti"),D.innerHTML=Z(R,I.pattern,"Tutti"),_.innerHTML=Z(q,I.equipment,"Tutte");let O=ci(S.get(n)??"",I),V=O.slice(0,Yr),g=ne(t.value),P=g.length>0&&U.some(T=>[T.name,...T.aliases].some(j=>ne(j)===g));u.textContent=O.length>V.length?`${V.length} di ${O.length} risultati`:`${O.length} ${O.length===1?"risultato":"risultati"}`,C.textContent=g&&!P?"Esercizio personalizzato":"",F.innerHTML=V.length>0?V.map(T=>`
          <button class="exercise-picker-result" type="button" data-exercise-library-id="${l(T.id)}" data-day-key="${l(t.dataset.dayKey??"")}" data-item-key="${l(n)}" role="option">
            <strong>${l(T.name)}</strong>
            <span>${l(si[T.pattern])} \xB7 ${l(ni[T.primaryMuscleGroup])} \xB7 ${l(T.equipment.map(j=>li[j]).join(", "))}</span>
          </button>
        `).join(""):`
          <p class="exercise-picker__empty">
            <strong>Nessun esercizio della Library corrisponde ai filtri selezionati.</strong>
            <span>Puoi modificare i filtri oppure inserire liberamente il nome dell'esercizio.</span>
          </p>
        `,d.hidden=!1,t.setAttribute("aria-expanded","true")},Be=t=>{let e=U.find(K=>K.id===t.dataset.exerciseLibraryId),d=X(t.dataset.dayKey??"")?.exercisesByWeek[x].find(K=>K.key===t.dataset.itemKey),u=t.closest("[data-exercise-picker]"),C=u?.querySelector("[data-exercise-library-input]");if(!e||!d||!u||!C)return;d.name=e.name,d.canonicalExerciseId=e.id,C.value=e.name,S.set(d.key,"");let F=C.closest("[data-exercise-card]")?.querySelector(".exercise-editor-card__header > strong");F&&(F.textContent=e.name),A(),C.focus(),ce(u)},pr=t=>`
    <p class="editor-guidance">Indicazione NEACEA: preparation essenziale, generalmente massimo 2 esercizi.</p>
    <div class="support-editor-list">
      ${t.preparation.map((e,n)=>`
        <article class="support-editor-card">
          <div class="support-editor-card__heading"><strong>Preparation ${n+1}</strong><button type="button" data-editor-action="remove-preparation" data-day-key="${t.key}" data-item-key="${e.key}">Rimuovi</button></div>
          <div class="support-editor-grid support-editor-grid--preparation">
            <label><span>Esercizio</span><input data-editor-field="preparation" data-field="name" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.name)}"></label>
            <label><span>Serie / reps</span><input data-editor-field="preparation" data-field="setsReps" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.setsReps)}"></label>
            <label class="support-editor-grid__wide"><span>Cue</span><textarea rows="2" data-editor-field="preparation" data-field="cue" data-day-key="${t.key}" data-item-key="${e.key}">${l(e.cue)}</textarea></label>
          </div>
        </article>
      `).join("")}
      ${t.preparation.length===0?'<p class="editor-empty-state">Nessun esercizio di preparation.</p>':""}
      <button class="editor-add-action" type="button" data-editor-action="add-preparation" data-day-key="${t.key}">+ Aggiungi esercizio</button>
    </div>
  `,dr=t=>`
    <div class="support-editor-list">
      ${t.rampUp.map((e,n)=>`
        <article class="support-editor-card">
          <div class="support-editor-card__heading"><strong>Ramp-up ${n+1}</strong><button type="button" data-editor-action="remove-ramp" data-day-key="${t.key}" data-item-key="${e.key}">Rimuovi ramp-up</button></div>
          <label class="support-editor-single"><span>Esercizio</span><input data-editor-field="ramp" data-field="exercise" data-day-key="${t.key}" data-item-key="${e.key}" value="${l(e.exercise)}"></label>
          <div class="ramp-step-editor-list">
            ${e.steps.map((d,u)=>`
              <label class="ramp-step-editor"><span>Serie ${u+1}</span><input data-editor-field="ramp-step" data-day-key="${t.key}" data-item-key="${e.key}" data-step-index="${u}" value="${l(d)}"><button type="button" data-editor-action="remove-ramp-step" data-day-key="${t.key}" data-item-key="${e.key}" data-step-index="${u}" aria-label="Elimina serie di avvicinamento ${u+1}">\u2212</button></label>
            `).join("")}
            ${e.steps.length===0?'<p class="editor-empty-state">Nessuna serie di avvicinamento.</p>':""}
          </div>
          <button class="editor-add-action" type="button" data-editor-action="add-ramp-step" data-day-key="${t.key}" data-item-key="${e.key}">+ Aggiungi serie</button>
        </article>
      `).join("")}
      ${t.rampUp.length===0?'<p class="editor-empty-state">Nessun ramp-up configurato.</p>':""}
      <button class="editor-add-action" type="button" data-editor-action="add-ramp" data-day-key="${t.key}">+ Aggiungi ramp-up</button>
    </div>
  `,cr=t=>{let e=t.exercisesByWeek[x];return`
      <article class="program-day${m?" program-day--editing":""}">
        <header class="program-day__header">
          <span>${l(t.letter)}</span>
          <div class="program-day__identity">
            <p>Sessione ${l(t.letter)} \xB7 Settimana ${x}</p>
            ${m?`<label><span>Nome seduta</span><input data-editor-field="day" data-field="name" data-day-key="${t.key}" value="${l(t.name)}"></label>`:`<h2>${l(t.name)}</h2>`}
          </div>
        </header>
        <details class="session-disclosure" data-editor-disclosure="warmup-${t.key}"${de(`warmup-${t.key}`)}>
          <summary>${Y(oe.generalWarmup,"section")}</summary>
          <div class="session-disclosure__content">
            ${m?`<label class="support-editor-single"><span>Indicazioni</span><textarea rows="4" data-editor-field="day" data-field="generalWarmup" data-day-key="${t.key}" placeholder="Una indicazione per riga">${l(t.generalWarmup.join(`
`))}</textarea></label>`:`<ul>${Ue(t.generalWarmup).map(n=>`<li>${l(n)}</li>`).join("")}</ul>`}
          </div>
        </details>
        ${m?"":`
        <details class="session-disclosure session-disclosure--preparation" data-editor-disclosure="preparation-${t.key}"${de(`preparation-${t.key}`)}>
          <summary>${Y(oe.movementPreparation,"section")}</summary>
          <div class="session-disclosure__content">
            ${m?pr(t):`<p class="preparation-meta">${t.preparation.length} ${t.preparation.length===1?"esercizio":"esercizi"}</p><ul class="preparation-list">${t.preparation.map(n=>`<li><div><strong>${Y(fe(n.name),"exercise")}</strong><span class="preparation-prescription">${l(n.setsReps)}</span></div><p>${l(n.cue)}</p></li>`).join("")}</ul>`}
          </div>
        </details>
        <details class="session-disclosure" data-editor-disclosure="ramp-${t.key}"${de(`ramp-${t.key}`)}>
          <summary>${Y(oe.rampUp,"section")}</summary>
          <div class="session-disclosure__content">
            ${m?dr(t):`<div class="rampup-list">${t.rampUp.map(n=>`<article><h4>${Y(fe(n.exercise),"exercise")}</h4><ol>${n.steps.map(d=>`<li>${l(d)}</li>`).join("")}</ol><p>Poi ${Y(oe.workingSets,"compact")}</p></article>`).join("")}</div>`}
          </div>
        </details>
        `}
        <div class="session-block session-block--workout">
          <h3>${Y(oe.workingSets,"section")}</h3>
          ${m?`<div class="exercise-editor-list">${lr(t,e)}${e.length===0?'<p class="editor-empty-state">Nessun esercizio in questa seduta.</p>':""}<button class="editor-add-action" type="button" data-editor-action="add-exercise" data-day-key="${t.key}">+ Aggiungi esercizio</button></div>`:`<div class="exercise-table-wrap"><table class="exercise-table"><thead><tr><th scope="col">Esercizio</th><th scope="col">Serie</th><th scope="col">Ripetizioni</th><th scope="col">RIR / RPE</th><th scope="col">Recupero</th></tr></thead><tbody>${e.map(n=>nr(n,t.groupsByWeek[x]?.find(d=>d.exerciseKeys.includes(n.key)))).join("")}</tbody></table></div>`}
        </div>
        <details class="session-disclosure" data-editor-disclosure="notes-${t.key}"${de(`notes-${t.key}`)}>
          <summary>Note della seduta</summary>
          <div class="session-disclosure__content">${m?`<label class="support-editor-single"><span>Note</span><textarea rows="4" data-editor-field="day" data-field="notes" data-day-key="${t.key}" placeholder="Una nota per riga">${l(t.notes.join(`
`))}</textarea></label>`:`<ul>${Ue(t.notes).map(n=>`<li>${l(n)}</li>`).join("")}</ul>`}</div>
        </details>
      </article>
    `},w=()=>{let t=ge(B);S.clear();let e=X(v)??p.days[0];e&&(v=e.key),B.classList.toggle("manual-program-editor--active",m),B.innerHTML=`
      <div class="program-editor-toolbar">
        <div><p class="eyebrow">Editor programma</p><strong data-editor-toolbar-state>${z||m?"Modifiche alla scheda":"Il coach mantiene il controllo finale"}</strong></div>
        <div class="program-editor-toolbar__actions">
          <span class="program-editor-future-action"><button type="button" disabled aria-describedby="brain-placeholder-help" title="Disponibile in una fase successiva.">Consulta Cervello</button><small id="brain-placeholder-help">Disponibile in una fase successiva.</small></span>
          ${m?'<button class="program-editor-toolbar__danger" type="button" data-editor-action="clear-program">Svuota programma</button><button type="button" data-editor-action="reset-program">Ripristina programma</button>':""}
          ${k?'<span class="program-editor-readonly">Sola lettura</span>':`<button class="program-editor-toolbar__primary" type="button" data-editor-action="toggle-edit">${m?"Termina modifica":"Modifica programma"}</button>`}
        </div>
      </div>
      <p class="program-editor-local-state" data-editor-local-state role="status"${z?"":" hidden"}>Modifiche alla scheda</p>
      ${m?`<div class="program-editor-sheet-toolbar"><div class="program-editor-tabs" aria-label="Sedute">${p.days.map(n=>`<button class="program-editor-tab${n.key===v?" program-editor-tab--active":""}" type="button" data-editor-action="select-day" data-day-key="${n.key}" aria-pressed="${n.key===v}">Allenamento ${l(n.letter)}</button>`).join("")}</div><div class="program-editor-sheet-actions">${e?`<button type="button" data-editor-action="add-day"${p.days.length>=6?" disabled":""}>+ Aggiungi seduta</button><button class="program-editor-sheet-actions__danger" type="button" data-editor-action="remove-day" data-day-key="${v}">Elimina seduta</button><button class="program-editor-sheet-actions__primary" type="button" data-editor-action="add-exercise" data-day-key="${v}">+ Aggiungi esercizio</button>`:""}</div></div>`:""}
      ${p.days.length===0?`<div class="program-editor-empty"><strong>Nessuna seduta presente.</strong>${m?'<button type="button" data-editor-action="add-day">+ Aggiungi seduta</button>':""}</div>`:`<div class="program-days">${(m?e?[e]:[]:p.days).map(cr).join("")}</div>`}
    `,je(B),t()},mr=t=>{let e=X(t.dataset.dayKey??"");if(!e)return;let n=t.dataset.editorField;if(n==="day"){t.dataset.field==="name"&&(e.name=t.value),t.dataset.field==="generalWarmup"&&(e.generalWarmup=t.value.split(`
`)),t.dataset.field==="notes"&&(e.notes=t.value.split(`
`)),A();return}if(n==="exercise"){let d=e.exercisesByWeek[x].find(C=>C.key===t.dataset.itemKey),u=t.dataset.field;d&&u&&(d[u]=t.value,u==="sets"&&(d.realSetCount=be(t.value)),u==="name"&&(d.canonicalExerciseId=re(t.value)?.id),A());return}if(n==="group"){let d=e.groupsByWeek[x].find(C=>C.key===t.dataset.groupKey),u=t.dataset.field;d&&u&&(d[u]=t.value,A());return}if(n==="preparation"){let d=e.preparation.find(C=>C.key===t.dataset.itemKey),u=t.dataset.field;d&&u&&(d[u]=t.value,A());return}if(n==="ramp"){let d=e.rampUp.find(u=>u.key===t.dataset.itemKey);d&&t.dataset.field==="exercise"&&(d.exercise=t.value,A());return}if(n==="ramp-step"){let d=e.rampUp.find(C=>C.key===t.dataset.itemKey),u=Number(t.dataset.stepIndex);d&&Number.isInteger(u)&&d.steps[u]!==void 0&&(d.steps[u]=t.value,A())}};return B.addEventListener("toggle",t=>{let e=t.target;!(e instanceof HTMLDetailsElement)||!e.dataset.editorDisclosure||(e.open?$.add(e.dataset.editorDisclosure):$.delete(e.dataset.editorDisclosure))},!0),B.addEventListener("input",t=>{let e=t.target;if(m&&e instanceof HTMLTextAreaElement&&e.hasAttribute("data-technique-note")){L&&(L.note=e.value);return}if(m&&e instanceof HTMLInputElement&&e.hasAttribute("data-progression-search")){f&&(f.query=e.value,ke());return}if(m&&(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement)&&e.dataset.editorField&&(mr(e),e instanceof HTMLInputElement&&e.hasAttribute("data-exercise-library-input"))){S.set(e.dataset.itemKey??"",e.value);let n=e.closest("[data-exercise-card]")?.querySelector(".exercise-editor-card__identity > strong");n&&(n.textContent=e.value||"Nuovo esercizio"),me(e)}}),B.addEventListener("focusin",t=>{let e=t.target;if(!m||!(e instanceof HTMLInputElement)||!e.hasAttribute("data-exercise-library-input"))return;let n=e.closest("[data-exercise-picker]");n&&(S.has(e.dataset.itemKey??"")||S.set(e.dataset.itemKey??"",""),Ae(n),me(e))}),B.addEventListener("focusout",t=>{let e=t.target;if(!(e instanceof HTMLElement))return;let n=e.closest("[data-exercise-picker]"),d=t.relatedTarget;!n||d===null||d instanceof Node&&n.contains(d)||ce(n)}),B.addEventListener("keydown",t=>{let e=t.target;if(!(e instanceof HTMLInputElement)||!e.hasAttribute("data-exercise-library-input"))return;let n=e.closest("[data-exercise-picker]");if(n){if(t.key==="Escape"){ce(n);return}if(t.key==="ArrowDown"){let d=n.querySelector("[data-exercise-library-id]");d&&(t.preventDefault(),d.focus())}}}),B.addEventListener("change",t=>{let e=t.target;if(e instanceof HTMLInputElement&&e.hasAttribute("data-progression-show-all")&&f){f.showAll=e.checked,f.selectedId="",w(),B.querySelector("[data-progression-show-all]")?.focus();return}if(e instanceof HTMLSelectElement&&e.dataset.progressionFilter&&f){e.dataset.progressionFilter==="category"&&(f.category=e.value),e.dataset.progressionFilter==="suitableFor"&&(f.suitableFor=e.value),ke();return}if(!(e instanceof HTMLSelectElement)||!e.dataset.exercisePickerFilter)return;let n=e.dataset.itemKey??"",d=ve(n);e.dataset.exercisePickerFilter==="muscleGroup"&&(d.muscleGroup=e.value),e.dataset.exercisePickerFilter==="pattern"&&(d.pattern=e.value),e.dataset.exercisePickerFilter==="equipment"&&(d.equipment=e.value),Re(d);let u=e.closest("[data-exercise-picker]")?.querySelector("[data-exercise-library-input]");u&&me(u)}),B.addEventListener("pointerdown",t=>{let e=t.target;if(!(e instanceof HTMLElement))return;if(e.closest('[data-editor-action="open-progression"], [data-editor-action="open-technique"], [data-editor-action="open-grouping"]')){t.preventDefault();return}let n=e.closest("[data-exercise-library-id]");n&&(t.preventDefault(),Be(n))}),B.addEventListener("click",async t=>{let e=t.target;if(!(e instanceof HTMLElement))return;let n=e.closest("[data-exercise-picker]");Ae(n??void 0);let d=e.closest("[data-exercise-library-input]"),u=n?.querySelector("[data-exercise-picker-panel]");if(d&&u?.hidden){S.set(d.dataset.itemKey??"",""),me(d);return}let C=e.closest("[data-progression-library-id]");if(C&&f){f.selectedId=C.dataset.progressionLibraryId??"",ke();return}let F=e.closest("[data-technique-id]");if(F&&L){L.selectedId=F.dataset.techniqueId??"",w();return}let K=e.closest("[data-exercise-library-id]");if(K){t.detail===0&&Be(K);return}let D=e.closest("[data-editor-action]");if(!D||D.disabled)return;let _=D.dataset.editorAction;if(_==="toggle-edit"){if(k)return;m=!m,a?.(m),w();return}if(_==="reset-program"){await s("Ripristinare il programma originale? Tutte le modifiche locali verranno perse.")&&(p=structuredClone(b),v=p.days[0]?.key??"",E=p.days.reduce((g,P)=>Math.max(g,ie.indexOf(P.letter)+1),0),z=!1,o?.(!1),$.clear(),M.clear(),S.clear(),f=null,L=null,W=null,w());return}if(_==="clear-program"){await s("Svuotare il programma? Tutte le sedute e il loro contenuto verranno eliminate.")&&(p.days=[],v="",E=0,z=!0,$.clear(),M.clear(),S.clear(),f=null,L=null,W=null,w());return}if(_==="close-progression"){f=null,w();return}if(_==="close-technique"){L=null,w();return}if(_==="close-grouping"){W=null,w();return}if(!m||k)return;if(_==="select-day"){v=D.dataset.dayKey??v,f=null,L=null,W=null,w();return}if(_==="add-day"){if(p.days.length>=6)return;let g=new Set(p.days.map(j=>j.letter)),P=ie[E]??ie.find(j=>!g.has(j));if(!P)return;E=Math.max(E+1,ie.indexOf(P)+1);let T={key:H("day"),letter:P,name:`Allenamento ${P}`,generalWarmup:[],preparation:[],rampUp:[],exercisesByWeek:c.reduce((j,N)=>(j[N]=[],j),{}),groupsByWeek:c.reduce((j,N)=>(j[N]=[],j),{}),notes:[]};p.days.push(T),v=T.key,A(),w();return}if(_==="remove-day"){let g=p.days.findIndex(P=>P.key===D.dataset.dayKey);g>=0&&await s(`Eliminare l'allenamento ${p.days[g].letter} con tutto il suo contenuto?`)&&(p.days.splice(g,1),p.days.length===0&&(E=0),v=p.days[Math.min(g,p.days.length-1)]?.key??"",A(),w());return}let I=X(D.dataset.dayKey??"");if(!I)return;let R=I.exercisesByWeek[x],q=R.findIndex(g=>g.key===D.dataset.itemKey),O=I.groupsByWeek[x];if(_==="add-exercise"){R.push({key:H("exercise"),name:"",sets:"",reps:"",rir:"",rest:"",note:"",progressionBase:"",techniqueId:"",techniqueName:"",techniqueNote:"",realSetCount:0,prescriptionMode:"manual"}),A(),w();let g=B.querySelector(`[data-exercise-library-input][data-item-key="${R.at(-1)?.key}"]`);g?.focus({preventScroll:!0}),g?.scrollIntoView({block:"nearest",inline:"nearest"});return}if(_==="add-preparation"){I.preparation.push({key:H("preparation"),name:"",setsReps:"",cue:""}),A(),w();return}if(_==="break-group"){let g=O.findIndex(P=>P.key===D.dataset.groupKey);g>=0&&(O.splice(g,1),A(),w());return}if(_==="add-group-exercise"){let g=O.find(N=>N.key===D.dataset.groupKey),P=ae.find(N=>N.type===g?.type);if(!g||P?.maximumExerciseCount!==void 0&&g.exerciseKeys.length>=P.maximumExerciseCount)return;let T={key:H("exercise"),name:"",sets:"",reps:"",rir:"",rest:"",note:"",progressionBase:"",techniqueId:"",techniqueName:"",techniqueNote:"",realSetCount:0,prescriptionMode:"manual"},j=Math.max(...g.exerciseKeys.map(N=>R.findIndex(G=>G.key===N)));R.splice(Math.max(0,j+1),0,T),g.exerciseKeys.push(T.key),A(),w();return}if(_==="remove-preparation"){let g=I.preparation.findIndex(P=>P.key===D.dataset.itemKey);g>=0&&(I.preparation.splice(g,1),A(),w());return}if(_==="add-ramp"){I.rampUp.push({key:H("ramp"),exercise:"",steps:[]}),A(),w();return}let V=I.rampUp.find(g=>g.key===D.dataset.itemKey);if(_==="remove-ramp"&&V){I.rampUp=I.rampUp.filter(g=>g.key!==V.key),A(),w();return}if(_==="add-ramp-step"&&V){V.steps.push(""),A(),w();return}if(_==="remove-ramp-step"&&V){let g=Number(D.dataset.stepIndex);Number.isInteger(g)&&V.steps[g]!==void 0&&(V.steps.splice(g,1),A(),w());return}if(!(q<0)){if(_==="open-progression"){f={dayKey:I.key,exerciseKey:R[q].key,query:"",category:"",suitableFor:"",selectedId:"",showAll:!1},L=null,W=null,w(),B.querySelector("[data-progression-search]")?.focus();return}if(_==="open-technique"){L={dayKey:I.key,exerciseKey:R[q].key,selectedId:"",note:R[q].techniqueNote},f=null,W=null,w();return}if(_==="apply-technique"){let g=xe.find(T=>T.id===L?.selectedId),P=R[q];if(!g||L?.dayKey!==I.key||L.exerciseKey!==P.key)return;P.techniqueId=g.id,P.techniqueName=g.name,P.techniqueNote=L.note,L=null,A(),w();return}if(_==="remove-technique"){R[q].techniqueId="",R[q].techniqueName="",R[q].techniqueNote="",A(),w();return}if(_==="open-grouping"){W={dayKey:I.key,exerciseKey:R[q].key},f=null,L=null,w();return}if(_==="create-group"){let g=ae.find(j=>j.type===D.dataset.groupType),P=R[q];if(!g||O.some(j=>j.exerciseKeys.includes(P.key)))return;let T=Array.from({length:g.initialExerciseCount-1},()=>({key:H("exercise"),name:"",sets:"",reps:"",rir:"",rest:"",note:"",progressionBase:"",techniqueId:"",techniqueName:"",techniqueNote:"",realSetCount:0,prescriptionMode:"manual"}));R.splice(q+1,0,...T),O.push({key:H("group"),type:g.type,exerciseKeys:[P.key,...T.map(j=>j.key)],restBetweenRounds:"",rounds:"",note:""}),W=null,A(),w();return}if(_==="apply-progression"){let g=Q.find(T=>T.id===f?.selectedId),P=R[q];if(!g||f?.dayKey!==I.key||f.exerciseKey!==P.key)return;c.filter(T=>T>=x).forEach((T,j)=>{let N=I.exercisesByWeek[T],G=N.find(gr=>gr.key===P.key);G||(G={...P},N.splice(Math.min(q,N.length),0,G));let J=g.weeks[Math.min(j,g.weeks.length-1)];J.sets&&(G.sets=J.sets),J.reps&&(G.reps=J.reps),J.rirRpe&&(G.rir=J.rirRpe),J.recovery&&(G.rest=J.recovery),J.note&&(G.note=J.note),G.progressionBase=g.name,G.progressionId=g.id,G.progressionName=g.name,G.structuredPrescription=void 0,G.realSetCount=be(G.sets),G.prescriptionMode="manual"}),f=null,A(),w();return}if(_==="convert-structured-to-manual"){let g=R[q];Object.assign(g,gi(g)),A(),w();return}if(_==="remove-exercise"){if(await s("Rimuovere questo esercizio?")){let g=O.find(P=>P.exerciseKeys.includes(R[q].key));g&&(g.exerciseKeys=g.exerciseKeys.filter(P=>P!==R[q].key),g.exerciseKeys.length===0&&O.splice(O.indexOf(g),1)),R.splice(q,1),A(),w()}return}if(_==="move-exercise-up"&&q>0){[R[q-1],R[q]]=[R[q],R[q-1]],A(),w();return}if(_==="move-exercise-down"&&q<R.length-1){[R[q],R[q+1]]=[R[q+1],R[q]],A(),w();return}if(_==="duplicate-exercise"){R.splice(q+1,0,{...structuredClone(R[q]),key:H("exercise"),name:`${R[q].name} copia`.trim()}),A(),w();return}if(_==="apply-future"&&await s("Applicare questa prescrizione alle settimane successive?")){let g=R[q];c.filter(P=>P>x).forEach(P=>{let T=I.exercisesByWeek[P],j=T.findIndex(G=>G.key===g.key),N=structuredClone(g);j>=0?T[j]=N:T.splice(Math.min(q,T.length),0,N)}),A(),w()}}}),w(),{element:B,setProgram:t=>{c=[...t.weeks],p=Oe(t),b=structuredClone(p),x=1,v=p.days[0]?.key??"",E=p.days.reduce((e,n)=>Math.max(e,ie.indexOf(n.letter)+1),0),m=!1,z=!1,k=!1,o?.(!1),$.clear(),M.clear(),S.clear(),f=null,L=null,W=null,a?.(!1),w()},getSnapshot:()=>({format:"neacea-program-editor-v1",program:mi(p)}),setSnapshot:t=>{c=[...t.program.weeks??[1,2,3,4,5,6]],p=structuredClone(t.program),ye=structuredClone(p),b=structuredClone(p),x=1,v=p.days[0]?.key??"",E=p.days.reduce((e,n)=>Math.max(e,ie.indexOf(n.letter)+1),0),m=!1,z=!1,k=!1,$.clear(),M.clear(),S.clear(),f=null,L=null,W=null,a?.(!1),o?.(!1),w()},setReadOnly:t=>{k=t,k&&(m=!1,a?.(!1)),w()},isDirty:()=>z,markSaved:()=>{z=!1,b=structuredClone(p),o?.(!1),w()},setWeek:t=>{x=t,w()}}}var ee=r=>structuredClone(r),Qe=r=>r.sessions.map((i,a)=>a+1),ui=r=>JSON.stringify((r||[]).map(i=>[i.reps,i.rir,i.note]));function Xe(r,i,a){let o=ee(r);return o.program.sourceId=a("program-copy"),o.program.title=i.trim().slice(0,120),o.program.days.forEach(s=>{let c=new Map;s.key=a("day"),Object.values(s.exercisesByWeek).flat().forEach(p=>{c.has(p.key)||c.set(p.key,a("exercise")),p.key=c.get(p.key),p.sessionId&&(p.sessionId=s.key)}),Object.values(s.groupsByWeek).flat().forEach(p=>{p.key=a("group"),p.exerciseKeys=p.exerciseKeys.map(b=>c.get(b)).filter(Boolean)}),s.preparation.forEach(p=>{p.key=a("preparation")}),s.rampUp.forEach(p=>{p.key=a("ramp")})}),o}function Ze(r,i,a){let o=pe(r),s=o.program.days.find(b=>b.letter===r.currentSheet);if(!s)throw new Error("Seleziona un allenamento da duplicare.");let c=ee(s),p=new Map;return c.key=a("day"),c.letter=i,c.name=`${s.name} \xB7 copia`,Object.values(c.exercisesByWeek).flat().forEach(b=>{p.has(b.key)||p.set(b.key,a("exercise")),b.key=p.get(b.key)}),Object.values(c.groupsByWeek).flat().forEach(b=>{b.key=a("group"),b.exerciseKeys=b.exerciseKeys.map(x=>p.get(x)).filter(Boolean)}),c.preparation.forEach(b=>{b.key=a("preparation")}),c.rampUp.forEach(b=>{b.key=a("ramp")}),o.program.days.push(c),o}function Ye(r,i){let a=r.weekSets?.[i]||[],o=a.length&&a.every(s=>s.reps===a[0].reps);return{key:r.id,name:r.name||"",canonicalExerciseId:re(r.name||"")?.id,sets:String(a.length||""),reps:o?a[0].reps:a.map(s=>s.reps).join(" / "),rir:a[0]?.rir||"",rest:r.recovery||"",note:r.notes||"",progressionBase:r.progressionName||"",techniqueId:"",techniqueName:"",techniqueNote:"",prescriptionMode:"manual"}}function pe(r){let i=r.coachingEditorSnapshot,a=Qe(r);return{format:"neacea-program-editor-v1",program:{sourceId:r.draftProgramId||"pt-manual",title:r.meta.name||"Scheda di allenamento",weeks:a,settings:{...Object.fromEntries(["goal","level","frequency","warmup"].map(o=>[o,String(r.meta[o]||"")])),...r.meta.studioNotes!==void 0?{studioNotes:String(r.meta.studioNotes||"")}:{}},days:r.sheetOrder.map(o=>{let s=i?.program?.days.find(b=>b.letter===o),c=r.sheets[o]||[],p=s?ee(s):{key:`pt-day-${o}`,letter:o,name:`Allenamento ${o}`,generalWarmup:[],preparation:[],rampUp:[],notes:[],exercisesByWeek:{},groupsByWeek:{}};return p.exercisesByWeek=Object.fromEntries(a.map(b=>{let x=p.exercisesByWeek[b]||[],v=x.map(m=>m.key),E=c.filter(m=>!m.coachingActiveWeeks||m.coachingActiveWeeks.includes(b));return E.sort((m,z)=>{let k=v.indexOf(m.id),y=v.indexOf(z.id);return(k<0?9999:k)-(y<0?9999:y)}),[b,E.map(m=>{let z=x.find($=>$.key===m.id);if(!z)return Ye(m,b-1);let k=ee(z),y=m.coachingProjection;return y&&y.name!==m.name&&(k.name=m.name),y&&y.notes!==m.notes&&(k.note=m.notes),y&&y.recovery!==m.recovery&&(k.rest=m.recovery),k})]})),p.groupsByWeek=Object.fromEntries(a.map(b=>[b,(p.groupsByWeek[b]||[]).map(x=>({...x,exerciseKeys:x.exerciseKeys.filter(v=>p.exercisesByWeek[b].some(E=>E.key===v))})).filter(x=>x.exerciseKeys.length>1)])),p})}}}function he(r,i,a={}){r.forwardWeeksVersion=1;let o=Qe(r),s={};for(let c of i.program.days){let p=r.sheets[c.letter]||[],b=Array.from(new Set(o.flatMap(x=>(c.exercisesByWeek[x]||[]).map(v=>v.key))));s[c.letter]=b.map(x=>{let v=p.find(z=>z.id===x),E=o.map(z=>c.exercisesByWeek[z]?.find(k=>k.key===x)).find(Boolean),m=v?ee(v):{id:x,type:"Single",group:"Full body",feedback:[],previousFeedback:[],previousPlan:[],previousPeriod:"",effort:"",recoveryNote:"",effortNote:"",weekSets:[]};return m.name=E.name,m.notes=E.note,m.recovery=E.rest,m.progressionName=E.progressionName||E.progressionBase,m.coachingActiveWeeks=o.filter(z=>c.exercisesByWeek[z]?.some(k=>k.key===x)),m.coachingRetiredSets=m.coachingRetiredSets||{},m.weekSets=o.map((z,k)=>{let y=c.exercisesByWeek[z]?.find(W=>W.key===x),$=m.weekSets[k]||m.coachingRetiredSets[z]||[];if(!y)return $.length&&(m.coachingRetiredSets[z]=$),[];let M=r.coachingEditorSnapshot?.program.days.find(W=>W.key===c.key)?.exercisesByWeek[z]?.find(W=>W.key===x)||(v?Ye(v,k):void 0);if(!a.resetPrescription&&M&&JSON.stringify([M.sets,M.reps,M.rir,M.structuredPrescription])===JSON.stringify([y.sets,y.reps,y.rir,y.structuredPrescription]))return $;let S=y.structuredPrescription?.setGroups,f=Math.min(100,Math.max(0,parseInt(y.sets,10)||0)),L=S?.length?S.flatMap(W=>Array.from({length:Math.min(100,W.sets)},()=>W.reps)):Array.from({length:f},(W,B)=>{let H=y.reps.split(/\s*\/\s*/);return H.length===f?H[B]:y.reps});return $.length>L.length&&(m.coachingRetiredSets[z]=$),L.map((W,B)=>{let H=$[B]||m.coachingRetiredSets[z]?.[B]||{},X=H.recorded||H.load||H.sessionNote||r.workoutDates?.[c.letter]?.[k];return{...H,id:H.id||`${x}-${z}-${B}`,reps:X?H.reps??W:W,load:H.load||"",rir:X?H.rir??y.rir:y.rir,note:H.note||"",sessionNote:H.sessionNote||"",previousLoad:H.previousLoad||""}})}),m.plan=o.map((z,k)=>m.weekSets[k].map(y=>y.reps).join(" / ")),m.feedback=o.map((z,k)=>m.feedback[k]||""),m.coachingProjection={name:m.name,notes:m.notes,recovery:m.recovery,sets:m.weekSets.map(ui)},m})}r.coachingEditorSnapshot=ee(i),r.sheets=s,r.sheetOrder=i.program.days.map(c=>c.letter),r.sheetOrder.includes(r.currentSheet)||(r.currentSheet=r.sheetOrder[0]||"")}function er(r){if(r.forwardWeeksVersion===1)return;let i=pe(r);for(let a of i.program.days)for(let o=1;o<i.program.weeks.length;o++){let s=i.program.weeks[o-1],c=i.program.weeks[o],p=a.exercisesByWeek[c];for(let[b,x]of a.exercisesByWeek[s].entries())p.some(v=>v.key===x.key)||p.splice(Math.min(b,p.length),0,ee(x));for(let b of a.groupsByWeek[s]||[])a.groupsByWeek[c].some(x=>x.key===b.key)||a.groupsByWeek[c].push(ee(b))}he(r,i),r.forwardWeeksVersion=1}var rr=`:host {
  --blue: #17314a;
  --blue-2: #244860;
  --blue-3: #2f6f95;
  --bg: #eef6fb;
  --panel: #ffffff;
  --line: #d8e7ef;
  --text: #17314a;
  --muted: #668195;
  --faint: #94abba;
  --gold: #c9a84c;
  --green: #2f7d6d;
  --red: #c0392b;
  --soft: #edf4f8;
  --gold-soft: #fdf8ee;
  --shadow: 0 10px 28px rgba(23, 49, 74, 0.08);
  --shadow-soft: 0 2px 10px rgba(23, 49, 74, 0.06);
  color: var(--text);
  background: var(--bg);
  font-family: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: var(--text);
  background: var(--bg);
}

button, input, select, textarea { font: inherit; }
button, a, select { -webkit-tap-highlight-color: transparent; }

button:focus-visible,
a:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 3px solid rgba(47, 111, 149, 0.24);
  outline-offset: 2px;
}

h1, h2, h3, h4, p { margin-top: 0; }

.app-layout { min-height: 100vh; }

.app-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 24px;
  color: #fff;
  background: var(--blue);
  box-shadow: 0 10px 28px rgba(16, 45, 69, 0.18);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.app-brand__mark {
  width: 36px;
  height: 36px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.88);
  border-radius: 8px;
  font-weight: 800;
}

.app-brand__identity {
  display: grid;
  line-height: 1.08;
}

.app-brand__identity strong {
  font-size: 16px;
  letter-spacing: 0.04em;
}

.app-brand__identity span,
.app-topbar__title span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
}

.app-topbar__title {
  display: grid;
  gap: 2px;
  padding-left: 18px;
  border-left: 1px solid rgba(255, 255, 255, 0.22);
}

.app-topbar__title strong {
  font-size: 14px;
  font-weight: 800;
}

.app-tabs {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: 7px;
  margin-left: auto;
}

.app-tab {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.86);
  background: rgba(255, 255, 255, 0.08);
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

.app-tab:hover { color: #fff; background: rgba(255, 255, 255, 0.14); }
.app-tab--active, .app-tab--active:hover { color: var(--blue); background: #fff; }

.page-shell {
  width: min(1280px, calc(100% - 36px));
  margin: 0 auto;
  padding: 26px 0 52px;
}

.page-shell--home { width: min(1120px, calc(100% - 36px)); }
.page-shell--knowledge { width: min(1180px, calc(100% - 36px)); }
.page-shell--anamnesis { width: min(980px, calc(100% - 36px)); }
.page-shell--dashboard { width: min(1180px, calc(100% - 36px)); }

.eyebrow {
  margin: 0 0 6px;
  color: var(--faint);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.localized-term {
  display: inline-flex;
  max-width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}

.localized-term__primary,
.localized-term__secondary { display: block; }

.localized-term__secondary {
  color: var(--faint);
  font-size: 0.72em;
  font-style: italic;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.25;
  text-transform: none;
}

/* Pagina iniziale */
.hero {
  min-height: 205px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding: 30px 34px;
  border-radius: 16px;
  color: #fff;
  background: var(--blue);
  box-shadow: var(--shadow);
}

.hero h1,
.knowledge-hero h1,
.program-hero h1 {
  font-family: 'DM Serif Display', serif;
  font-weight: 400;
  letter-spacing: -0.02em;
}

.hero h1 { margin: 0 0 8px; font-size: clamp(34px, 5vw, 48px); }
.hero .eyebrow { color: rgba(255, 255, 255, 0.58); }
.hero__subtitle { margin: 0; color: rgba(255, 255, 255, 0.78); font-size: 15px; font-weight: 700; }

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.hero__meta span {
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 700;
}

.direction { padding: 20px 0 8px; }

.direction__intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.direction__intro h2 { margin: 0; font-size: 22px; }
.direction__intro > p { max-width: 540px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }

.placeholder-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }

.placeholder-card {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--text);
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

a.placeholder-card { text-decoration: none; }
.placeholder-card--active:hover { border-color: var(--blue-3); box-shadow: inset 4px 0 0 var(--blue-3), var(--shadow-soft); }

.placeholder-card__marker {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: var(--blue);
  font-size: 11px;
  font-weight: 800;
}

.placeholder-card h2 { margin: 22px 0 7px; font-size: 18px; }
.placeholder-card p { margin: 0 0 18px; color: var(--muted); font-size: 13px; line-height: 1.5; }

.placeholder-card__status {
  align-self: flex-start;
  margin-top: auto;
  padding: 5px 9px;
  border-radius: 999px;
  color: var(--blue);
  background: var(--soft);
  font-size: 11px;
  font-weight: 800;
}

/* Dashboard Coach */
.coach-dashboard { display: grid; gap: 14px; }
.dashboard-hero { padding: 22px 24px; border-radius: 14px; color: #fff; background: var(--blue); box-shadow: var(--shadow); }
.dashboard-hero h1 { margin: 0 0 5px; font-family: 'DM Serif Display', serif; font-size: clamp(30px, 4vw, 42px); font-weight: 400; line-height: 1; }
.dashboard-hero .eyebrow { color: rgba(255, 255, 255, 0.58); }
.dashboard-hero p:last-child { margin: 0; color: rgba(255, 255, 255, 0.76); font-size: 13px; font-weight: 700; }
.dashboard-session-note { margin: 0; padding: 10px 13px; border: 1px solid #ead7a0; border-radius: 9px; color: #73530c; background: var(--gold-soft); font-size: 11px; font-weight: 700; line-height: 1.45; }
.dashboard-counters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.dashboard-counters article { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 18px; border: 1px solid var(--line); border-radius: 12px; background: #fff; box-shadow: var(--shadow-soft); }
.dashboard-counters span { color: var(--muted); font-size: 11px; font-weight: 800; }
.dashboard-counters strong { color: var(--blue); font-family: 'DM Serif Display', serif; font-size: 28px; font-weight: 400; }
.dashboard-list-section { padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: #fff; box-shadow: var(--shadow-soft); }
.dashboard-list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; padding-bottom: 13px; border-bottom: 1px solid var(--line); }
.dashboard-list-heading h2 { margin: 0; font-size: 19px; }
.dashboard-list-heading > span { padding: 6px 9px; border-radius: 999px; color: var(--blue); background: var(--soft); font-size: 10px; font-weight: 800; }
.dashboard-filters { display: grid; grid-template-columns: repeat(2, minmax(0, 240px)); gap: 10px; margin-bottom: 14px; }
.dashboard-filters label { display: grid; gap: 5px; }
.dashboard-filters label > span { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.dashboard-filters select { min-height: 40px; width: 100%; padding: 8px 32px 8px 10px; border: 1px solid #c9dde8; border-radius: 8px; color: var(--text); background: #fff; font-size: 11px; font-weight: 700; }
.dashboard-client-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.dashboard-client-card { width: 100%; padding: 15px; border: 1px solid var(--line); border-radius: 11px; color: var(--text); background: #fff; font: inherit; text-align: left; cursor: pointer; }
.dashboard-client-card--new { border-color: #b9ded3; box-shadow: inset 3px 0 0 #3f907e; }
.dashboard-client-card:hover { border-color: #9fc0d2; box-shadow: inset 4px 0 0 var(--blue-3), var(--shadow-soft); }
.dashboard-client-card:focus-visible { outline: 3px solid rgba(47, 111, 149, 0.22); outline-offset: 2px; }
.dashboard-client-card__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.dashboard-client-card__heading p { margin: 0 0 3px; color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: .08em; }
.dashboard-client-card__heading h3 { margin: 0; font-size: 17px; }
.dashboard-client-card__badges { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.dashboard-client-card__badges > span { padding: 5px 7px; border-radius: 999px; color: var(--blue); background: var(--soft); font-size: 9px; font-weight: 800; }
.dashboard-client-card__badges > .dashboard-new-pill { color: #1f6557; background: #e7f5f0; }
.dashboard-client-card dl { display: grid; gap: 7px; margin: 0; }
.dashboard-client-card dl > div { display: grid; grid-template-columns: 88px 1fr; gap: 8px; }
.dashboard-client-card dt { color: var(--muted); font-size: 10px; font-weight: 800; }
.dashboard-client-card dd { margin: 0; color: var(--text); font-size: 11px; line-height: 1.4; }
.dashboard-client-card__states { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.path-state { display: inline-flex; align-items: center; padding: 5px 7px; border-radius: 999px; font-size: 9px; font-weight: 800; font-style: normal; }
.path-state--received { color: #1f6557; background: #e7f5f0; }
.path-state--action { color: #73530c; background: #fbf0cf; }
.path-state--active { color: #244f73; background: #e8f1f8; }

.dashboard-detail { overflow: hidden; border: 1px solid #b8d1df; border-left: 4px solid var(--blue-3); border-radius: 13px; background: #fff; box-shadow: var(--shadow-soft); }
.dashboard-detail[hidden] { display: none; }
.dashboard-detail__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 18px 20px; border-bottom: 1px solid var(--line); background: #f7fbfd; }
.dashboard-detail__heading h2 { margin: 0; font-family: 'DM Serif Display', serif; font-size: 27px; font-weight: 400; }
.dashboard-detail__heading button { min-height: 36px; padding: 0 11px; border: 1px solid #bdd4e0; border-radius: 8px; color: var(--blue); background: #fff; font-size: 10px; font-weight: 800; cursor: pointer; }
.dashboard-detail__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 16px 18px; }
.dashboard-detail__grid article { padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #fff; }
.dashboard-detail__grid h3 { margin: 0 0 10px; color: var(--blue); font-size: 12px; }
.dashboard-detail__grid p { margin: 0; color: var(--text); font-size: 12px; line-height: 1.5; }
.dashboard-detail__grid dl { display: grid; gap: 7px; margin: 0; }
.dashboard-detail__grid dl > div { display: grid; grid-template-columns: minmax(105px, .42fr) 1fr; gap: 10px; }
.dashboard-detail__grid dt { color: var(--muted); font-size: 10px; font-weight: 800; }
.dashboard-detail__grid dd { margin: 0; color: var(--text); font-size: 11px; line-height: 1.4; }
.dashboard-detail__grid .dashboard-detail__warning { margin-top: 8px; padding: 8px; border-radius: 7px; color: #74410c; background: #fff4df; }
.dashboard-detail__path { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 18px; border-top: 1px solid var(--line); background: #f8fbfd; }
.dashboard-detail__path > div { display: grid; gap: 6px; }
.dashboard-detail__path > div > span { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
.dashboard-detail__path > div > div { display: flex; flex-wrap: wrap; gap: 5px; }
.dashboard-detail__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.dashboard-detail__actions button { min-height: 42px; padding: 0 16px; border: 0; border-radius: 8px; color: #fff; background: var(--blue); font-size: 11px; font-weight: 800; cursor: pointer; }
.dashboard-detail__actions button:hover { background: var(--blue-2); }
.dashboard-detail__actions > .dashboard-detail__secondary-action { border: 1px solid #bdd4e0; color: var(--blue); background: #fff; }
.dashboard-detail__actions > .dashboard-detail__secondary-action:hover { background: #edf6fb; }
.dashboard-anamnesis { margin: 0 18px 16px; padding: 16px; border: 1px solid #c9dde8; border-radius: 10px; background: #f8fbfd; }
.dashboard-anamnesis[hidden] { display: none; }
.dashboard-anamnesis__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
.dashboard-anamnesis__heading h3 { margin: 0; color: var(--blue); font-size: 17px; }
.dashboard-anamnesis__heading > span { color: var(--muted); font-size: 10px; font-weight: 700; }
.dashboard-anamnesis__sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dashboard-anamnesis__sections article { padding: 13px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.dashboard-anamnesis__sections h4 { margin: 0 0 9px; color: var(--blue); font-size: 12px; }
.dashboard-anamnesis__sections dl { display: grid; gap: 7px; margin: 0; }
.dashboard-anamnesis__sections dl > div { display: grid; grid-template-columns: minmax(110px, .42fr) 1fr; gap: 9px; }
.dashboard-anamnesis__sections dt { color: var(--muted); font-size: 10px; font-weight: 800; }
.dashboard-anamnesis__sections dd { min-width: 0; margin: 0; overflow-wrap: anywhere; color: var(--text); font-size: 11px; line-height: 1.4; }
.dashboard-empty { grid-column: 1 / -1; margin: 0; padding: 26px 18px; border: 1px dashed #bdd4e0; border-radius: 9px; color: var(--muted); background: #f8fbfd; font-size: 12px; text-align: center; }

/* Anamnesi */
.anamnesis-prototype { display: grid; gap: 14px; }

.anamnesis-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 26px;
  border-radius: 14px;
  color: #fff;
  background: var(--blue);
  box-shadow: var(--shadow);
}

.anamnesis-hero h1 {
  margin: 0 0 7px;
  font-family: 'DM Serif Display', serif;
  font-size: clamp(30px, 4vw, 42px);
  font-weight: 400;
  line-height: 1;
}

.anamnesis-hero .eyebrow { color: rgba(255, 255, 255, 0.62); }
.anamnesis-hero p:last-child { margin: 0; color: rgba(255, 255, 255, 0.76); font-size: 13px; }

.anamnesis-hero__version {
  padding: 7px 11px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 800;
}

.anamnesis-progress,
.anamnesis-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.anamnesis-progress { padding: 14px 18px; }
.anamnesis-progress__labels { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; }
.anamnesis-progress__labels span { color: var(--muted); }
.anamnesis-progress__track { height: 6px; margin-top: 9px; overflow: hidden; border-radius: 99px; background: var(--soft); }
.anamnesis-progress__track span { display: block; height: 100%; border-radius: inherit; background: var(--blue-3); }

.anamnesis-card { overflow: hidden; }
.anamnesis-card__heading { display: flex; align-items: center; gap: 13px; padding: 20px 22px; border-bottom: 1px solid var(--line); }
.anamnesis-card__heading > span { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 9px; color: #fff; background: var(--blue); font-size: 11px; font-weight: 800; }
.anamnesis-card__heading h2 { margin: 0; font-size: 22px; }
.anamnesis-card__body { min-height: 330px; }
.anamnesis-grid { display: grid; gap: 14px; padding: 22px; }
.anamnesis-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.anamnesis-grid--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.anamnesis-grid--flush { padding: 0; }
.anamnesis-grid--nested { padding: 16px 0 0; }
.anamnesis-field { display: grid; gap: 7px; color: var(--text); font-size: 12px; font-weight: 800; }
.anamnesis-field--wide { width: 100%; }

.anamnesis-field input,
.anamnesis-field select,
.anamnesis-field textarea {
  min-height: 46px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #c9dde8;
  border-radius: 9px;
  color: var(--text);
  background: #fff;
  outline: 0;
}

.anamnesis-field textarea { min-height: 94px; resize: vertical; line-height: 1.5; }
.anamnesis-field select { padding-right: 34px; }

.anamnesis-field input:focus,
.anamnesis-field select:focus,
.anamnesis-field textarea:focus {
  border-color: var(--blue-3);
  box-shadow: 0 0 0 3px rgba(47, 111, 149, 0.12);
}

.anamnesis-input-wrap { position: relative; }
.anamnesis-input-wrap > small {
  position: absolute;
  top: 50%;
  right: 11px;
  translate: 0 -50%;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  pointer-events: none;
}

.anamnesis-input-wrap:has(> small) input { padding-right: 96px; }

.anamnesis-section-block {
  display: grid;
  gap: 18px;
  padding: 22px;
  border-top: 1px solid var(--line);
}

.anamnesis-section-block--separated { background: #fbfdfe; }

.anamnesis-subpanel,
.anamnesis-conditional,
.anamnesis-lift-card {
  margin: 0 22px 22px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #f8fbfd;
}

.anamnesis-subpanel h3,
.anamnesis-lift-card h3 { margin: 0 0 14px; font-size: 15px; }

.anamnesis-question { min-width: 0; margin: 0; padding: 0; border: 0; }
.anamnesis-question + .anamnesis-question { margin-top: 4px; padding-top: 18px; border-top: 1px solid var(--line); }

.anamnesis-question legend,
.anamnesis-range > span {
  margin-bottom: 10px;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

.anamnesis-choice-grid { display: grid; gap: 9px; }
.anamnesis-choice-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.anamnesis-choice-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.anamnesis-choice-grid--compact { gap: 7px; }

.anamnesis-choice {
  position: relative;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #cfe0e9;
  border-radius: 9px;
  color: var(--text);
  background: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  cursor: pointer;
}

.anamnesis-choice:hover { border-color: #9fc0d2; }

.anamnesis-choice:has(input:checked) {
  border-color: var(--blue-3);
  background: #edf6fb;
  box-shadow: inset 3px 0 0 var(--blue-3);
}

.anamnesis-choice input {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  margin: 0;
  accent-color: var(--blue-3);
}

.anamnesis-help {
  display: block;
  margin: -4px 0 10px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
}

.anamnesis-info,
.anamnesis-medical-note,
.anamnesis-complete,
.anamnesis-validation {
  margin: 0 22px 22px;
  padding: 12px 14px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 1.5;
}

.anamnesis-info { border: 1px solid #cfe0e9; color: var(--blue-2); background: #edf6fb; }
.anamnesis-medical-note { border: 1px solid #ead7a0; color: #73530c; background: var(--gold-soft); }
.anamnesis-validation { border: 1px solid #efc2bd; color: #8e2f25; background: #fff4f2; }
.anamnesis-complete { display: grid; gap: 3px; border: 1px solid #b9ded3; color: #1f6557; background: #edf8f4; }
.anamnesis-complete strong { font-size: 13px; }
.anamnesis-complete span { font-weight: 600; }

.anamnesis-conditional { display: grid; gap: 18px; margin: 4px 0 0; }
.anamnesis-range { display: grid; gap: 9px; }
.anamnesis-range > span { display: flex; justify-content: space-between; margin: 0; }
.anamnesis-range input { width: 100%; accent-color: var(--blue-3); }

.anamnesis-explanation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.anamnesis-explanation-grid p {
  display: grid;
  gap: 3px;
  margin: 0;
  padding: 11px 12px;
  border-left: 3px solid var(--gold);
  border-radius: 7px;
  color: var(--muted);
  background: var(--gold-soft);
  font-size: 11px;
  line-height: 1.45;
}

.anamnesis-explanation-grid strong { color: #73530c; }
.anamnesis-lift-list { display: grid; gap: 10px; padding: 0 22px 22px; }
.anamnesis-lift-card { margin: 0; background: #fff; }
.anamnesis-lift-card .anamnesis-field--wide { margin-top: 14px; }

.anamnesis-summary-intro { margin: 0; padding: 20px 22px 0; color: var(--muted); font-size: 12px; line-height: 1.55; }
.anamnesis-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 18px 22px 22px; }

.anamnesis-summary-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.anamnesis-summary-card header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 12px; border-bottom: 1px solid var(--line); background: #f8fbfd; }
.anamnesis-summary-card h3 { margin: 0; font-size: 13px; }
.anamnesis-summary-card header button { padding: 5px 8px; border: 1px solid #bdd4e0; border-radius: 7px; color: var(--blue-2); background: #fff; font-size: 10px; font-weight: 800; cursor: pointer; }
.anamnesis-summary-card dl { display: grid; gap: 8px; margin: 0; padding: 12px; }
.anamnesis-summary-card dl > div { display: grid; grid-template-columns: minmax(90px, 0.42fr) 1fr; gap: 10px; }
.anamnesis-summary-card dt { color: var(--muted); font-size: 10px; font-weight: 800; }
.anamnesis-summary-card dd { margin: 0; overflow-wrap: anywhere; color: var(--text); font-size: 11px; line-height: 1.4; }

.anamnesis-actions { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 14px 22px; border-top: 1px solid var(--line); background: #f8fbfd; }
.anamnesis-actions span { color: var(--muted); font-size: 11px; }
.anamnesis-actions button { min-height: 44px; padding: 0 22px; border: 0; border-radius: 9px; color: #fff; background: var(--blue); font-weight: 800; cursor: pointer; }
.anamnesis-button--secondary { border: 1px solid #c9dde8 !important; color: var(--blue) !important; background: #fff !important; }
.anamnesis-button:disabled { opacity: 0.42; cursor: not-allowed; }
.anamnesis-privacy-note { margin: -2px 0 0; color: var(--muted); font-size: 10px; text-align: center; }

/* Generatore */
.program-hero {
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-left: 4px solid var(--blue-3);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.program-hero__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.program-hero h1 { margin: 0 0 5px; font-size: clamp(31px, 4vw, 44px); line-height: 1; }
.program-hero__subtitle { margin: 0; color: var(--muted); font-size: 14px; font-weight: 700; }

.program-hero__status,
.program-profile span {
  border-radius: 999px;
  color: var(--blue);
  background: var(--soft);
  font-size: 11px;
  font-weight: 800;
}

.program-hero__status {
  max-width: 330px;
  margin: 0;
  padding: 7px 11px;
  line-height: 1.35;
  text-align: right;
}

.program-variant-control {
  display: grid;
  grid-template-columns: auto minmax(260px, 440px);
  align-items: center;
  justify-content: start;
  gap: 10px;
  margin-top: 16px;
}

.program-variant-control > span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.program-variant-control select {
  width: 100%;
  min-height: 40px;
  padding: 8px 36px 8px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--text);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}
.program-profile { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.program-profile[hidden] { display: none; }
.program-profile span { padding: 6px 9px; }
.program-profile strong { color: var(--blue-3); }

.program-hero__notice {
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.generation-launch-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.generation-launch-row button,
.generation-panel__run,
.generation-proposal__actions button { min-height: 42px; padding: 9px 15px; border: 1px solid var(--blue); border-radius: 8px; color: #fff; background: var(--blue); font-size: 11px; font-weight: 900; cursor: pointer; }
.generation-launch-row span { color: var(--muted); font-size: 10px; font-weight: 700; }

.generation-panel { display: grid; gap: 13px; padding: 18px; border: 1px solid #9fc6d8; border-left: 4px solid var(--blue); border-radius: 12px; background: #fff; box-shadow: var(--shadow-soft); }
.generation-panel[hidden] { display: none; }
.generation-panel__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.generation-panel__heading h2 { margin: 0; color: var(--text); font-size: 20px; }
.generation-panel__heading > button { width: 34px; min-height: 34px; padding: 0; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); background: #fff; font-size: 18px; cursor: pointer; }
.new-program-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.new-program-options button { min-height: 104px; display: grid; align-content: center; gap: 6px; padding: 15px; border: 1px solid #c9dce7; border-radius: 10px; color: var(--text); background: #f8fbfd; text-align: left; cursor: pointer; }
.new-program-options button:hover { border-color: var(--blue); background: var(--soft); }
.new-program-options strong { color: var(--blue); font-size: 14px; }
.new-program-options span { color: var(--muted); font-size: 10px; font-weight: 700; line-height: 1.45; }
.new-program-mode { display: grid; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 10px; background: #fbfdfe; }
.new-program-mode[hidden] { display: none; }
.new-program-mode__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.new-program-mode__heading h3 { margin: 0; color: var(--text); font-size: 17px; }
.new-program-mode__heading > span { max-width: 300px; color: var(--muted); font-size: 10px; font-weight: 700; line-height: 1.4; text-align: right; }
.generation-input-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.generation-input-grid--core { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.generation-input-grid label { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 7px; align-items: center; }
.generation-input-grid label > span { grid-column: 1 / -1; color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.generation-input-origin { justify-self: end; padding: 3px 6px; border-radius: 999px; color: #1f6557 !important; background: #e7f5ef; font-size: 8px !important; line-height: 1.2; }
.generation-input-origin--manual { color: var(--muted) !important; background: var(--soft); }
.generation-input-confirm { justify-self: end; padding: 4px 7px; border: 1px solid #d7b565; border-radius: 6px; color: #73530c; background: #fff8e8; font-size: 8px; font-weight: 800; cursor: pointer; }
.generation-input-grid select,
.generation-input-grid input { grid-column: 1 / -1; min-width: 0; width: 100%; min-height: 42px; border: 1px solid #c9dce7; border-radius: 8px; padding: 8px 10px; color: var(--text); background: #f8fbfd; font-size: 11px; font-weight: 700; }
.generation-input-grid .generation-input-origin { justify-self: start; }
.generation-input-grid small { color: var(--muted); font-size: 9px; font-weight: 700; }
.generation-suggested-structure { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 15px 16px; border: 1px solid #a8d5c2; border-radius: 11px; background: #edf8f2; }
.generation-suggested-structure > div { min-width: 0; display: grid; gap: 4px; }
.generation-suggested-structure small { color: #37715f; font-size: 9px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
.generation-suggested-structure strong { color: var(--text); font-size: 17px; }
.generation-suggested-structure span { color: var(--muted); font-size: 10px; font-weight: 700; }
.generation-suggested-structure button { flex: 0 0 auto; min-height: 36px; padding: 7px 10px; border: 1px solid #8bbfa9; border-radius: 8px; color: #1f6557; background: #fff; font-size: 9px; font-weight: 900; cursor: pointer; }
.generation-advanced-options { border: 1px solid var(--line); border-radius: 9px; background: #fff; }
.generation-advanced-options summary { padding: 11px 13px; color: var(--blue); font-size: 10px; font-weight: 900; cursor: pointer; }
.generation-advanced-options > p { margin: 0; padding: 0 13px 10px; color: var(--muted); font-size: 9px; font-weight: 700; }
.generation-input-grid--advanced { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 13px 13px; }
.generation-fixed-inputs { display: flex; flex-wrap: wrap; gap: 6px; }
.generation-fixed-inputs span { padding: 6px 8px; border-radius: 999px; color: #1f6557; background: #e7f5ef; font-size: 9px; font-weight: 800; }
.generation-input-feedback { display: grid; gap: 7px; }
.generation-input-feedback[hidden] { display: none; }
.generation-input-feedback > div { padding: 10px 12px; border: 1px solid #e7c98d; border-radius: 8px; color: #74410c; background: #fff8ea; font-size: 11px; line-height: 1.45; }
.generation-input-feedback__errors { border-color: #e4a29a !important; color: #8a2d25 !important; background: #fff1ef !important; }
.generation-input-feedback strong { display: block; margin-bottom: 4px; }
.generation-input-feedback ul { margin: 0; padding-left: 18px; }
.generation-input-feedback p { margin: 6px 0 0; }
.generation-panel__run { justify-self: start; min-width: 180px; background: var(--green); border-color: var(--green); }
.program-editor-context { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid #b8d6c8; border-radius: 9px; background: #edf8f2; }
.program-editor-context[hidden] { display: none; }
.program-editor-context strong { margin-right: auto; color: var(--text); font-size: 13px; }
.program-editor-context span, .program-editor-context small { padding: 4px 7px; border-radius: 6px; color: #1f6557; background: #fff; font-size: 9px; font-weight: 800; }

.generation-proposal { min-width: 0; display: grid; gap: 12px; padding-top: 14px; border-top: 1px solid var(--line); }
.generation-proposal[hidden] { display: none; }
.generation-proposal__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.generation-proposal__heading h2 { margin: 0; color: var(--text); font-size: 22px; }
.generation-proposal__heading > span { padding: 6px 8px; border-radius: 999px; color: var(--blue); background: var(--soft); font-size: 9px; font-weight: 900; }
.generation-strategy { display: grid; gap: 9px; padding: 12px; border: 1px solid #9fc6d8; border-radius: 9px; background: #f3f8fb; }
.generation-strategy h3 { margin: 0; color: var(--text); font-size: 15px; }
.generation-strategy__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.generation-strategy__grid span { min-width: 0; display: grid; gap: 2px; padding: 8px; border: 1px solid #c9dce7; border-radius: 7px; background: #fff; }
.generation-strategy__grid small { color: var(--muted); font-size: 8px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
.generation-strategy__grid strong { overflow-wrap: anywhere; color: var(--text); font-size: 10px; }
.generation-strategy__policies { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.generation-strategy__policies article { display: grid; gap: 4px; padding: 9px; border: 1px solid #c9dce7; border-radius: 7px; background: #fff; }
.generation-strategy__policies small { color: var(--muted); font-size: 8px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
.generation-strategy__policies strong { color: var(--text); font-size: 10px; }
.generation-strategy__policies p,
.generation-strategy__policies span { margin: 0; color: var(--muted); font-size: 9px; line-height: 1.4; }
.generation-proposal__structure { padding: 11px 12px; border: 1px solid #c9dce7; border-radius: 9px; background: #f8fbfd; }
.generation-proposal__structure strong { color: var(--blue); font-size: 10px; text-transform: uppercase; }
.generation-proposal__structure--simple strong { font-size: 13px; text-transform: none; }
.generation-simple-warning { padding: 12px 14px; border: 1px solid #e7c98d; border-radius: 9px; color: #74410c; background: #fff8ea; }
.generation-simple-warning--fail { border-color: #e4a29a; color: #8a2d25; background: #fff1ef; }
.generation-simple-warning h3 { margin: 0 0 7px; font-size: 12px; }
.generation-simple-warning ul { margin: 0; padding-left: 18px; font-size: 10px; line-height: 1.5; }
.generation-simple-warning p { margin: 8px 0 0; font-size: 10px; line-height: 1.5; }
.generation-simple-ok { margin: 0; padding: 10px 12px; border-radius: 8px; color: #1f6557; background: #edf8f2; font-size: 10px; font-weight: 800; }
.generation-technical-details { border: 1px solid var(--line); border-radius: 8px; background: #fbfdfe; }
.generation-technical-details summary { padding: 10px 12px; color: var(--muted); font-size: 9px; font-weight: 800; cursor: pointer; }
.generation-technical-details > p,
.generation-technical-details > ul { margin: 0 12px 10px; color: var(--muted); font-size: 9px; line-height: 1.45; }
.generation-proposal__structure p { margin: 5px 0 0; color: var(--text); font-size: 12px; font-weight: 800; }
.generation-proposal__structure small { display: block; margin-top: 5px; color: var(--muted); font-size: 9px; font-weight: 700; line-height: 1.4; }
.generation-proposal__explanation { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.generation-proposal__explanation section { min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 9px; background: #fbfdfe; }
.generation-proposal__explanation h3 { margin: 0 0 8px; color: var(--text); font-size: 12px; }
.generation-proposal__explanation ul { display: grid; gap: 5px; margin: 0; padding-left: 17px; color: var(--muted); font-size: 9px; line-height: 1.4; }
.generation-proposal__warnings { border-color: #ead7a0 !important; background: var(--gold-soft) !important; }
.generation-proposal__warnings--empty { border-color: #b9ded3 !important; background: #f3faf7 !important; }
.generation-proposal__warnings p { margin: 0; color: #1f6557; font-size: 10px; font-weight: 800; }
.generation-quality__status { padding: 6px 8px; border-radius: 999px; font-size: 9px; font-weight: 900; }
.generation-quality__status--pass { color: #1f6557; background: #e7f5ef; }
.generation-quality__status--warning { color: #6f5412; background: var(--gold-soft); }
.generation-quality__status--fail { color: #8c2f35; background: #fbeaec; }
.generation-quality__evaluation { padding: 10px 12px; border: 1px solid var(--line); border-radius: 9px; background: #fff; }
.generation-quality__evaluation p { margin: 0; color: #1f6557; font-size: 10px; font-weight: 800; }
.generation-quality__evaluation ul { display: grid; gap: 5px; margin: 0; padding-left: 17px; color: var(--muted); font-size: 9px; line-height: 1.4; }
.generation-quality__evaluation small { display: block; margin-top: 7px; color: var(--muted); font-size: 8px; font-weight: 700; }
.generation-proposal__days { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.generation-proposal__days article { min-width: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 9px; background: #fff; }
.generation-proposal__days header { padding: 9px 10px; border-bottom: 1px solid var(--line); background: var(--soft); }
.generation-proposal__days header span { color: var(--blue-3); font-size: 8px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
.generation-proposal__days h3 { margin: 3px 0 0; color: var(--text); font-size: 13px; }
.generation-proposal__days ol { display: grid; gap: 7px; margin: 0; padding: 10px 10px 10px 30px; }
.generation-proposal__days li { padding-left: 2px; color: var(--blue-3); font-size: 9px; }
.generation-proposal__days li strong,
.generation-proposal__days li span { display: block; overflow-wrap: anywhere; }
.generation-proposal__days li strong { color: var(--text); font-size: 10px; }
.generation-proposal__days li span { margin-top: 2px; color: var(--muted); font-size: 8px; }
.generation-proposal__actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px; border: 1px solid #b9ded3; border-radius: 9px; background: #f3faf7; }
.generation-proposal__actions p { margin: 0; color: #1f6557; font-size: 10px; font-weight: 700; line-height: 1.4; }
.generation-proposal__actions button { flex: 0 0 auto; border-color: var(--green); background: var(--green); }

.generation-quality { display: grid; gap: 10px; padding: 13px; border: 1px solid #b9ded3; border-radius: 10px; background: #f6fbf9; }
.generation-quality__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.generation-quality__heading h3 { margin: 0; color: var(--text); font-size: 16px; }
.generation-quality__heading > span { padding: 5px 8px; border-radius: 999px; color: #1f6557; background: #dff1eb; font-size: 9px; font-weight: 900; }
.generation-quality__sessions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.generation-quality__sessions article { min-width: 0; display: grid; gap: 3px; padding: 9px 10px; border: 1px solid #d4e9e2; border-radius: 8px; background: #fff; }
.generation-quality__sessions strong { overflow-wrap: anywhere; color: var(--text); font-size: 11px; }
.generation-quality__sessions span { color: #1f6557; font-size: 10px; font-weight: 800; }
.generation-quality__sessions small { color: var(--muted); font-size: 8px; line-height: 1.35; }

.program-hero__dashboard-notice {
  margin: 9px 0 0;
  padding: 10px 12px;
  border: 1px solid #ead7a0;
  border-radius: 8px;
  color: #73530c;
  background: var(--gold-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.45;
}

.generator-client-banner {
  padding: 16px 18px;
  border: 1px solid #b9ded3;
  border-left: 4px solid #3f907e;
  border-radius: 12px;
  background: #f3faf7;
  box-shadow: var(--shadow-soft);
}

.generator-client-banner__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.generator-client-banner__heading h2 { margin: 0; color: var(--blue); font-size: 20px; }
.generator-client-banner__heading > strong { color: #1f6557; font-size: 16px; }
.generator-client-banner dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
.generator-client-banner dl > div { padding: 9px 10px; border: 1px solid #d4e9e2; border-radius: 8px; background: #fff; }
.generator-client-banner dt { margin-bottom: 3px; color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.generator-client-banner dd { margin: 0; overflow-wrap: anywhere; color: var(--text); font-size: 11px; font-weight: 700; line-height: 1.4; }
.generator-client-banner > p { margin: 11px 0 0; padding-top: 10px; border-top: 1px solid #d4e9e2; color: #1f6557; font-size: 11px; font-weight: 800; line-height: 1.45; }

.program-rationale {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid #ead7a0;
  border-radius: 12px;
  background: var(--gold-soft);
  box-shadow: var(--shadow-soft);
}

.program-rationale[hidden] { display: none; }

.program-rationale > summary {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 16px;
  color: #73530c;
  font-size: 12px;
  font-weight: 800;
  list-style: none;
  cursor: pointer;
}

.program-rationale > summary::-webkit-details-marker { display: none; }

.program-rationale > summary::after {
  content: '+';
  width: 24px;
  height: 24px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #ead7a0;
  border-radius: 7px;
  color: #73530c;
  background: #fff;
  font-size: 16px;
}

.program-rationale[open] > summary {
  border-bottom: 1px solid #ead7a0;
}

.program-rationale[open] > summary::after { content: '\u2212'; }
.program-rationale__content { padding: 12px 16px 14px; }

.program-rationale__content ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 20px;
  margin: 0;
  padding-left: 18px;
  color: #73530c;
  font-size: 11px;
  line-height: 1.45;
}

.program-section,
.selection-matrix {
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.program-section { padding: 18px; }
.program-section[hidden] { display: none; }

.week-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.week-heading h2 { margin: 0; font-size: 17px; }

.week-selector {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f5f8fa;
}

.week-selector__button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  padding: 0 12px;
  color: var(--muted);
  background: transparent;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
}

.week-selector__button:hover { color: var(--blue); }
.week-selector__button--active { color: var(--blue); background: #fff; box-shadow: 0 1px 4px rgba(19, 50, 73, 0.12); }

.program-days { display: grid; gap: 14px; }

.program-client-context {
  margin: 6px 0;
  color: var(--muted);
  font-size: 14px;
}

.program-client-context strong { color: var(--text); }

.manual-program-editor { min-width: 0; display: grid; gap: 12px; }

.program-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f8fbfd;
}

.program-editor-toolbar .eyebrow { margin-bottom: 3px; }
.program-editor-toolbar > div > strong { font-size: 13px; }
.program-editor-toolbar__actions { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }

.program-editor-toolbar button,
.program-editor-sheet-toolbar button,
.support-editor-card button,
.exercise-editor-card button,
.editor-add-action {
  min-height: 36px;
  border: 1px solid #c9dce7;
  border-radius: 8px;
  padding: 7px 10px;
  color: var(--blue);
  background: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.program-editor-toolbar button:disabled { cursor: not-allowed; opacity: 0.55; }
.program-editor-toolbar__primary { color: #fff !important; border-color: var(--blue) !important; background: var(--blue) !important; }
.program-editor-toolbar__danger { color: var(--red) !important; }
.program-editor-local-state { margin: 0; padding: 9px 12px; border: 1px solid #ead7a0; border-radius: 8px; color: #73530c; background: var(--gold-soft); font-size: 11px; font-weight: 800; }
.program-editor-future-action { display: grid; gap: 2px; }
.program-editor-future-action small { color: var(--faint); font-size: 9px; text-align: center; }

.program-editor-sheet-toolbar {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.program-editor-tabs,
.program-editor-sheet-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }

.program-editor-tab { min-width: 92px; }
.program-editor-tab--active { color: #fff !important; border-color: var(--blue) !important; background: var(--blue) !important; }
.program-editor-sheet-actions__primary { color: #fff !important; border-color: var(--green) !important; background: var(--green) !important; }
.program-editor-sheet-actions__danger { color: var(--red) !important; }
.program-editor-sheet-toolbar button:disabled { cursor: not-allowed; opacity: 0.48; }

.program-editor-empty {
  min-height: 150px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 24px;
  border: 1px dashed #b7ceda;
  border-radius: 10px;
  color: var(--muted);
  background: #f8fbfd;
  text-align: center;
}
.program-editor-empty strong { color: var(--text); font-size: 15px; }
.program-editor-empty button { min-height: 40px; padding: 8px 14px; border: 1px solid var(--green); border-radius: 8px; color: #fff; background: var(--green); font-size: 11px; font-weight: 900; cursor: pointer; }

.exercise-editor-list { display: grid; gap: 10px; padding: 0 12px 12px; }
.exercise-editor-card { overflow: hidden; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
.exercise-editor-card__header {
  min-height: 48px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  color: #fff;
  background: #53606b;
}

.exercise-editor-card__identity { min-width: 0; display: grid; gap: 2px; }
.exercise-editor-card__identity strong { min-width: 0; overflow-wrap: anywhere; font-size: 13px; }
.exercise-editor-card__identity small { color: rgba(255, 255, 255, 0.76); font-size: 9px; font-weight: 700; }
.exercise-editor-card__number { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: rgba(255, 255, 255, 0.18); font-size: 11px; font-weight: 900; }
.exercise-editor-card__mini-actions { display: flex; align-items: center; gap: 5px; }
.exercise-editor-card__mini-actions button { width: 32px; min-height: 32px; padding: 0; color: #fff; border-color: rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.13); }
.exercise-editor-card__mini-actions button:last-child { background: rgba(192, 57, 43, 0.68); }
.exercise-editor-card__mini-actions button:disabled { cursor: not-allowed; opacity: 0.36; }
.exercise-editor-card__state { padding: 4px 7px; border-radius: 999px; color: #fff; background: rgba(255, 255, 255, 0.15); font-size: 9px; font-weight: 800; }
.exercise-editor-card__body { display: grid; gap: 8px; padding: 10px; background: #f6f9fc; }
.exercise-editor-card__fields { display: grid; grid-template-columns: minmax(220px, 1.6fr) repeat(4, minmax(90px, 0.65fr)); gap: 8px; }
.exercise-editor-field { display: grid; gap: 4px; min-width: 0; }
.exercise-editor-field > span,
.exercise-editor-field--name > label { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.exercise-editor-field input,
.exercise-editor-field textarea { min-width: 0; width: 100%; min-height: 38px; border: 1px solid #c9dce7; border-radius: 7px; padding: 7px 8px; color: var(--text); background: #fff; font-size: 12px; }
.exercise-editor-field--name { grid-column: 1 / -1; }
.exercise-editor-field--note { grid-column: 1 / -1; }
.exercise-editor-field textarea { resize: vertical; }
.structured-prescription { grid-column: 1 / -1; display: grid; gap: 7px; padding: 9px 10px; border: 1px solid #b9ded3; border-radius: 8px; background: #f0faf6; }
.structured-prescription__heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #145945; font-size: 10px; }
.structured-prescription__heading span { padding: 3px 6px; border-radius: 999px; color: #fff; background: var(--green); font-size: 8px; font-weight: 800; }
.structured-prescription dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin: 0; }
.structured-prescription dl > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 7px; border-radius: 6px; background: #fff; }
.structured-prescription dt { color: var(--muted); font-size: 8px; font-weight: 800; text-transform: uppercase; }
.structured-prescription dd { margin: 0; color: var(--text); font-size: 10px; font-weight: 800; }
.structured-prescription__notice { grid-column: 1 / -1; margin: 0; color: #73530c; font-size: 9px; line-height: 1.4; }
.exercise-editor-field input[readonly] { color: var(--muted); background: #eef3f5; cursor: not-allowed; }
.exercise-table .structured-prescription { margin-top: 7px; }
.exercise-picker__panel {
  min-width: 0;
  display: grid;
  gap: 9px;
  margin-top: 3px;
  padding: 10px;
  border: 1px solid #b9d2e0;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(25, 57, 79, 0.1);
}
.exercise-picker__panel[hidden] { display: none; }
.exercise-picker__filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.exercise-picker__filters label { min-width: 0; display: grid; gap: 4px; }
.exercise-picker__filters label > span { color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.exercise-picker__filters select {
  min-width: 0;
  width: 100%;
  min-height: 38px;
  border: 1px solid #c9dce7;
  border-radius: 7px;
  padding: 7px 28px 7px 8px;
  color: var(--text);
  background: #f8fbfd;
  font-size: 11px;
  font-weight: 700;
}
.exercise-picker__summary { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 5px 12px; color: var(--faint); font-size: 9px; font-weight: 700; }
.exercise-picker__summary [data-exercise-picker-status] { color: var(--green); }
.exercise-picker__results { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.exercise-picker-result {
  min-width: 0;
  min-height: 52px !important;
  display: grid;
  align-content: center;
  gap: 3px;
  padding: 8px 10px !important;
  color: var(--text) !important;
  border-color: var(--line) !important;
  background: #fbfdfe !important;
  text-align: left;
}
.exercise-picker-result:hover,
.exercise-picker-result:focus-visible { border-color: var(--blue-3) !important; background: var(--soft) !important; outline: none; }
.exercise-picker-result strong { min-width: 0; font-size: 11px; overflow-wrap: anywhere; }
.exercise-picker-result span { min-width: 0; color: var(--muted); font-size: 9px; font-weight: 500; line-height: 1.35; overflow-wrap: anywhere; }
.exercise-picker__empty { grid-column: 1 / -1; margin: 0; padding: 12px; border: 1px dashed var(--line); border-radius: 7px; color: var(--muted); background: #f8fbfd; font-size: 10px; text-align: center; }
.exercise-picker__empty strong, .exercise-picker__empty span { display: block; }
.exercise-picker__empty strong { margin-bottom: 4px; color: var(--text); font-size: 11px; }
.exercise-picker__freedom { margin: 0; color: var(--faint); font-size: 9px; line-height: 1.4; }
.exercise-editor-card__apply-actions { display: flex; flex-wrap: wrap; gap: 7px; }
.exercise-editor-card__apply { justify-self: start; }
.exercise-editor-card__apply:disabled { cursor: not-allowed; opacity: 0.48; }
.exercise-editor-card__progression { color: #fff !important; border-color: var(--blue) !important; background: var(--blue) !important; }
.exercise-progression-base { color: var(--blue-3) !important; font-weight: 800 !important; }
.exercise-editor-card__technique,
.exercise-technique-label { color: #167054 !important; font-weight: 800 !important; }

.progression-picker {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #b9d2e0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(25, 57, 79, 0.08);
}
.progression-picker__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.progression-picker__header > div { display: grid; gap: 2px; }
.progression-picker__header span { color: var(--blue-3); font-size: 8px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.progression-picker__header strong { color: var(--text); font-size: 13px; }
.progression-picker__header > button { width: 32px; min-height: 32px; padding: 0; color: var(--muted); }
.progression-picker__filters { display: grid; grid-template-columns: minmax(190px, 1.4fr) repeat(2, minmax(135px, 1fr)); gap: 8px; }
.progression-picker__filters label { min-width: 0; display: grid; gap: 4px; }
.progression-picker__filters label > span { color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.progression-picker__filters input,
.progression-picker__filters select { min-width: 0; width: 100%; min-height: 40px; border: 1px solid #c9dce7; border-radius: 7px; padding: 7px 9px; color: var(--text); background: #f8fbfd; font-size: 11px; }
.progression-picker__count { margin: 0; color: var(--faint); font-size: 9px; font-weight: 700; }
.progression-picker__compatibility { margin: 0; color: var(--blue-2); font-size: 10px; font-weight: 800; }
.progression-picker__show-all { min-height: 38px; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #c9dce7; border-radius: 7px; color: var(--text); background: #f8fbfd; font-size: 10px; font-weight: 800; }
.progression-picker__show-all input { width: 16px; height: 16px; margin: 0; accent-color: var(--blue); }
.progression-picker__results { min-width: 0; max-height: 280px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; overflow-y: auto; }
.progression-picker-result { min-width: 0; min-height: 70px !important; display: grid; align-content: center; gap: 3px; padding: 9px 10px !important; color: var(--text) !important; border-color: var(--line) !important; background: #fbfdfe !important; text-align: left; }
.progression-picker-result:hover,
.progression-picker-result:focus-visible,
.progression-picker-result--selected { border-color: var(--blue-3) !important; background: var(--soft) !important; outline: none; }
.progression-picker-result strong { font-size: 11px; overflow-wrap: anywhere; }
.progression-picker-result span { color: var(--blue-3); font-size: 8px; font-weight: 800; text-transform: uppercase; }
.progression-picker-result small { color: var(--muted); font-size: 9px; line-height: 1.35; }
.progression-picker__empty { margin: 0; padding: 14px; border: 1px dashed var(--line); border-radius: 8px; color: var(--muted); background: #f8fbfd; font-size: 10px; text-align: center; }
.progression-picker__preview { min-width: 0; display: grid; gap: 9px; padding-top: 10px; border-top: 1px solid var(--line); }
.progression-picker__preview-heading { display: flex; align-items: end; justify-content: space-between; gap: 10px; }
.progression-picker__preview-heading > div { display: grid; gap: 2px; }
.progression-picker__preview-heading span { color: var(--faint); font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.progression-picker__preview-heading strong { color: var(--text); font-size: 13px; }
.progression-picker__preview-heading button { color: #fff !important; border-color: var(--green) !important; background: var(--green) !important; }
.progression-week-grid { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.progression-week-card { min-width: 0; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: #f8fbfd; }
.progression-week-card > strong { display: block; margin-bottom: 6px; color: var(--blue); font-size: 11px; }
.progression-week-card dl { display: grid; gap: 4px; margin: 0; }
.progression-week-card dl > div { min-width: 0; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px; }
.progression-week-card dt { color: var(--faint); font-size: 8px; font-weight: 800; text-transform: uppercase; }
.progression-week-card dd { min-width: 0; margin: 0; color: var(--text); font-size: 10px; overflow-wrap: anywhere; }
.progression-week-card__note { grid-template-columns: 1fr !important; }
.progression-picker__freedom { margin: 0; color: var(--faint); font-size: 9px; line-height: 1.4; }
.technique-picker,
.grouping-picker { min-width: 0; display: grid; gap: 10px; padding: 12px; border: 1px solid #b9d2e0; border-radius: 10px; background: #fff; box-shadow: 0 8px 22px rgba(25, 57, 79, 0.08); }
.technique-picker { border-color: #9bcdbb; }
.technique-picker__results,
.grouping-picker__options { min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.technique-picker__apply { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid var(--line); }
.technique-picker__apply label { min-width: 0; display: grid; gap: 4px; }
.technique-picker__apply label > span { color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.technique-picker__apply textarea { min-width: 0; width: 100%; border: 1px solid #c9dce7; border-radius: 7px; padding: 8px 9px; color: var(--text); background: #f8fbfd; font: inherit; font-size: 11px; line-height: 1.4; resize: vertical; }
.technique-picker__apply button { justify-self: start; color: #fff !important; border-color: var(--green) !important; background: var(--green) !important; }
.grouping-picker__options button { min-width: 0; min-height: 66px; display: grid; align-content: center; gap: 4px; padding: 10px !important; color: var(--text) !important; border-color: var(--line) !important; background: #fbfdfe !important; text-align: left; }
.grouping-picker__options button:hover,
.grouping-picker__options button:focus-visible { border-color: var(--blue-3) !important; background: var(--soft) !important; outline: none; }
.grouping-picker__options strong { font-size: 11px; }
.grouping-picker__options span { color: var(--muted); font-size: 9px; line-height: 1.35; }

.exercise-group-card { min-width: 0; display: grid; gap: 10px; padding: 12px; border: 2px solid #9fc6d8; border-radius: 12px; background: #edf6fa; }
.exercise-group-card__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.exercise-group-card__header > div { min-width: 0; display: flex; align-items: center; gap: 8px; }
.exercise-group-card__header span { color: var(--blue-3); font-size: 9px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
.exercise-group-card__header strong { color: var(--text); font-size: 14px; }
.exercise-group-card__header button { min-height: 30px; padding: 5px 8px; color: var(--red); background: #fff; }
.exercise-group-card__settings { display: grid; grid-template-columns: minmax(110px, 0.65fr) minmax(150px, 0.85fr) minmax(210px, 1.5fr); gap: 8px; padding: 9px; border: 1px solid #c9dce7; border-radius: 9px; background: rgba(255, 255, 255, 0.75); }
.exercise-group-card__settings label { min-width: 0; display: grid; gap: 4px; }
.exercise-group-card__settings label > span { color: var(--muted); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.exercise-group-card__settings input { min-width: 0; width: 100%; min-height: 38px; border: 1px solid #c9dce7; border-radius: 7px; padding: 7px 8px; color: var(--text); background: #fff; font-size: 11px; }
.exercise-group-card__exercises { min-width: 0; display: grid; gap: 8px; }
.exercise-group-card .exercise-editor-card { border-color: #b9d2e0; box-shadow: none; }
.editor-add-action { justify-self: start; }
.editor-empty-state { margin: 0; padding: 10px 12px; border: 1px dashed #c9dce7; border-radius: 8px; color: var(--muted); background: #f8fbfd; font-size: 11px; }
.editor-guidance { margin: 0 0 10px; color: var(--muted); font-size: 11px; line-height: 1.45; }

.program-day__identity { min-width: 0; flex: 1; }
.program-day__identity label { display: grid; gap: 4px; max-width: 420px; }
.program-day__identity label > span,
.support-editor-card label > span,
.support-editor-single > span { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.program-day__identity input,
.support-editor-card input,
.support-editor-card textarea,
.support-editor-single input,
.support-editor-single textarea,
.ramp-step-editor input { min-width: 0; width: 100%; min-height: 38px; border: 1px solid #c9dce7; border-radius: 7px; padding: 7px 8px; color: var(--text); background: #fff; font-size: 12px; }
.support-editor-card textarea,
.support-editor-single textarea { resize: vertical; line-height: 1.45; }

.support-editor-list { display: grid; gap: 9px; }
.support-editor-card { display: grid; gap: 9px; padding: 10px; border: 1px solid var(--line); border-radius: 9px; background: #f8fbfd; }
.support-editor-card__heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.support-editor-card__heading strong { color: var(--blue); font-size: 12px; }
.support-editor-card__heading button { min-height: 30px; padding: 5px 8px; color: var(--red); }
.support-editor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.support-editor-grid label,
.support-editor-single { min-width: 0; display: grid; gap: 4px; }
.support-editor-grid__wide { grid-column: 1 / -1; }
.ramp-step-editor-list { display: grid; gap: 6px; }
.ramp-step-editor { min-width: 0; display: grid; grid-template-columns: 58px minmax(0, 1fr) 36px; align-items: end; gap: 7px; }
.ramp-step-editor > span { align-self: center; color: var(--blue); font-size: 10px; font-weight: 800; }
.ramp-step-editor button { width: 36px; min-height: 38px; padding: 0; color: var(--red); background: #fff2f0; }

.program-day {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 0 rgba(23, 49, 74, 0.04);
}

.program-day__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  background: #f8fbfd;
}

.program-day__header > span {
  width: 34px;
  height: 34px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  color: #fff;
  background: var(--blue);
  font-size: 12px;
  font-weight: 800;
}

.program-day__header p { margin: 0 0 2px; color: var(--faint); font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.program-day__header h2 { margin: 0; font-size: 18px; }

.session-disclosure {
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.session-disclosure--preparation { background: rgba(237, 244, 248, 0.7); }
.session-disclosure:last-child { border-bottom: 0; }

.session-disclosure > summary {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px 16px;
  color: var(--blue-2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.07em;
  list-style: none;
  text-transform: uppercase;
  cursor: pointer;
}

.session-disclosure > summary::-webkit-details-marker { display: none; }

.session-disclosure > summary::after {
  content: '+';
  width: 24px;
  height: 24px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--blue-3);
  background: #fff;
  font-size: 16px;
  line-height: 1;
}

.session-disclosure[open] > summary { border-bottom: 1px solid var(--line); }
.session-disclosure[open] > summary::after { content: '\u2212'; }
.session-disclosure > summary .localized-term__secondary { margin-top: 2px; color: var(--faint); font-size: 0.88em; }

.session-disclosure__content { padding: 12px 16px 14px; }
.session-disclosure__content > ul { display: grid; gap: 5px; margin: 0; padding-left: 18px; color: var(--muted); font-size: 13px; line-height: 1.45; }

.session-block--workout {
  display: block;
  padding: 0;
  border-bottom: 1px solid var(--line);
}

.session-block--workout h3 {
  margin: 0;
  padding: 14px 16px 10px;
  color: var(--blue);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-block--workout h3 .localized-term__secondary { margin-top: 2px; color: var(--faint); font-size: 0.88em; }

.preparation-meta { margin: 0 0 8px; color: var(--faint); font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.preparation-list { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }

.preparation-list li {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
}

.preparation-list li > div { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.preparation-list strong { color: var(--text); font-size: 13px; }

.preparation-prescription {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 6px;
  color: var(--blue);
  background: var(--soft);
  font-size: 11px;
  font-weight: 800;
}

.preparation-list p { margin: 5px 0 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
.preparation-list .localized-term__secondary,
.rampup-list .localized-term__secondary,
.exercise-table .localized-term__secondary { margin-top: 1px; font-size: 0.76em; }

.rampup-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }

.rampup-list article {
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fbfdfe;
}

.rampup-list h4 { margin: 0 0 8px; color: var(--text); font-size: 13px; }

.rampup-list ol {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rampup-list ol li { min-width: 0; padding: 7px 8px; border-radius: 7px; color: var(--muted); background: var(--soft); font-size: 10px; line-height: 1.35; }
.rampup-list article > p { margin: 8px 0 0; color: var(--green); font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.rampup-note { margin: 9px 0 0; color: var(--faint); font-size: 11px; line-height: 1.4; }

.exercise-table-wrap { overflow: hidden; }
.exercise-table { width: 100%; border-collapse: collapse; color: var(--text); font-size: 12px; text-align: left; }
.exercise-table th, .exercise-table td { padding: 10px 12px; border-top: 1px solid var(--line); vertical-align: top; }
.exercise-table th:first-child, .exercise-table td:first-child { padding-left: 16px; }
.exercise-table th:last-child, .exercise-table td:last-child { padding-right: 16px; }

.exercise-table thead th {
  color: var(--muted);
  background: #f8fbfd;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.exercise-table tbody th { width: 48%; color: var(--text); font-size: 13px; font-weight: 800; }
.exercise-table tbody td { color: var(--blue-2); font-size: 13px; font-weight: 800; }
.exercise-table tbody small { display: block; max-width: 560px; margin-top: 3px; color: var(--muted); font-size: 10px; font-weight: 500; line-height: 1.4; }
.exercise-table tbody .exercise-note--week { color: var(--green); font-weight: 700; }

/* Exercise Selection Matrix */
.selection-matrix { padding: 0; }
.selection-matrix__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 18px;
  list-style: none;
  cursor: pointer;
}
.selection-matrix__heading::-webkit-details-marker { display: none; }
.selection-matrix__heading::after {
  content: '+';
  width: 28px;
  height: 28px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--blue-3);
  background: #fff;
  font-size: 18px;
}
.selection-matrix[open] > .selection-matrix__heading { border-bottom: 1px solid var(--line); }
.selection-matrix[open] > .selection-matrix__heading::after { content: '\u2212'; }
.selection-matrix__content { padding: 14px 18px 18px; }
.selection-matrix__heading h2 { margin: 0; font-size: 18px; }
.selection-matrix__technical-title { margin: 0 0 3px; color: var(--faint); font-size: 10px; font-style: italic; }
.selection-matrix__goal { margin: 0; color: var(--muted); font-size: 11px; text-align: right; }
.selection-matrix__goal > span { display: block; margin-bottom: 3px; color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.selection-matrix__goal .localized-term { align-items: flex-end; }

.selection-controls { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; max-width: 760px; margin-top: 14px; }
.selection-controls label, .filters label { display: grid; gap: 5px; }
.selection-control__label, .filters label > span { color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }

.selection-controls select,
.filters select {
  width: 100%;
  min-height: 40px;
  padding: 8px 36px 8px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--text);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}

.selection-control__technical { min-height: 13px; color: var(--faint); font-size: 10px; font-style: italic; }
.selection-matrix blockquote, .test-panel blockquote { margin: 14px 0 0; padding: 11px 13px; border: 1px solid #ead7a0; border-left: 4px solid var(--gold); border-radius: 8px; color: #73530c; background: var(--gold-soft); font-size: 11px; line-height: 1.45; }
.selection-results { margin-top: 14px; }
.selection-results__summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.selection-summary-item { display: flex; align-items: center; gap: 7px; padding: 5px 8px; border-radius: 999px; color: var(--muted); background: var(--soft); font-size: 10px; }
.selection-summary-item .localized-term__primary { color: var(--blue); font-weight: 800; }
.selection-result-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.selection-card { padding: 13px; border: 1px solid var(--line); border-radius: 10px; background: #fbfdfe; }
.selection-card__topline { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; color: var(--blue-3); font-size: 10px; font-weight: 800; text-transform: uppercase; }
.selection-card__work-line { max-width: 62%; margin: 0; color: var(--muted); text-align: right; }
.selection-card__work-line > span { display: block; margin-bottom: 2px; color: var(--faint); font-size: 8px; }
.selection-card__work-line .localized-term { align-items: flex-end; }
.selection-card__main-label, .selection-card__alternatives > p:first-child { margin: 0 0 5px; color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.selection-card h3 { margin: 0 0 12px; color: var(--text); font-size: 15px; }
.selection-card__alternatives ul { display: flex; flex-wrap: wrap; gap: 5px; margin: 0; padding: 0; list-style: none; }
.selection-card__alternatives li { padding: 5px 7px; border: 1px solid var(--line); border-radius: 7px; color: var(--muted); background: #fff; font-size: 10px; }
.selection-card__empty { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.4; }

/* Priority Muscle Matrix */
.priority-matrix {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.priority-matrix__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 18px;
  list-style: none;
  cursor: pointer;
}

.priority-matrix__heading::-webkit-details-marker { display: none; }

.priority-matrix__heading::after {
  content: '+';
  width: 28px;
  height: 28px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--blue-3);
  background: #fff;
  font-size: 18px;
}

.priority-matrix[open] > .priority-matrix__heading {
  border-bottom: 1px solid var(--line);
}

.priority-matrix[open] > .priority-matrix__heading::after { content: '\u2212'; }
.priority-matrix__heading h2 { margin: 0; color: var(--text); font-size: 16px; }
.priority-matrix__content { padding: 14px 18px 18px; }

.priority-matrix__control {
  display: grid;
  max-width: 380px;
  gap: 5px;
}

.priority-matrix__control > span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.priority-matrix__control select {
  width: 100%;
  min-height: 40px;
  padding: 8px 36px 8px 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--text);
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}

.priority-matrix__note {
  margin: 9px 0 13px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.45;
}

.priority-guidance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.priority-guidance-card {
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: #fbfdfe;
}

.priority-guidance-card:last-child { grid-column: 1 / -1; }

.priority-guidance-card h3 {
  margin: 0 0 5px;
  color: var(--blue-3);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.priority-guidance-card p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

/* Cervello */
.knowledge-hero { padding: 24px 26px; border-radius: 14px; color: #fff; background: var(--blue); box-shadow: var(--shadow); }
.knowledge-hero__heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; }
.knowledge-hero .eyebrow { color: rgba(255, 255, 255, 0.58); }
.knowledge-hero h1 { margin: 0; font-size: clamp(32px, 4vw, 44px); line-height: 1; }
.knowledge-hero__intro { max-width: 680px; margin: 7px 0 0; color: rgba(255, 255, 255, 0.78); font-size: 13px; line-height: 1.45; }
.knowledge-total { margin: 0; color: rgba(255, 255, 255, 0.74); font-size: 11px; text-align: right; white-space: nowrap; }
.knowledge-total strong { display: block; color: #fff; font-size: 30px; line-height: 1; }

.knowledge-test-button {
  min-height: 38px;
  margin-top: 16px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--blue);
  background: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.test-panel { margin-top: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: var(--panel); box-shadow: var(--shadow-soft); }
.test-panel[hidden] { display: none; }
.test-panel h2 { margin: 0 0 12px; color: var(--text); font-size: 18px; }
.athlete-summary { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.athlete-summary li { padding: 6px 9px; border-radius: 999px; color: var(--blue); background: var(--soft); font-size: 11px; font-weight: 700; }
.test-results { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
.test-results__heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.test-results__heading h2, .test-results__heading > p { margin: 0; }
.test-results__heading > p { color: var(--muted); font-size: 11px; }
.match-group + .match-group { margin-top: 20px; }
.match-group h3 { display: flex; align-items: center; gap: 7px; margin: 0 0 9px; color: var(--text); font-size: 14px; }
.match-group h3 span { min-width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; color: #fff; background: var(--blue-3); font-size: 10px; }
.match-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.match-card { padding: 13px; border: 1px solid var(--line); border-radius: 10px; background: #fbfdfe; }
.match-card--relevant { border-left: 4px solid var(--green); }
.match-card__topline { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 9px; color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.match-card h4 { margin: 0 0 5px; color: var(--text); font-size: 14px; }
.match-card__classification { margin: 0 0 11px; color: var(--green); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.match-card--possibly_relevant .match-card__classification { color: #8a6715; }
.match-card dl, .knowledge-card__details { display: grid; gap: 10px; margin: 0; }
.match-card dl div, .knowledge-card__details div { display: grid; gap: 3px; }
.match-card dt, .knowledge-card__details dt { color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.match-card dd, .knowledge-card__details dd { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.45; }

.exercise-library-panel {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.exercise-library-panel > summary {
  min-height: 78px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  list-style: none;
  cursor: pointer;
}

.exercise-library-panel > summary::-webkit-details-marker { display: none; }
.exercise-library-panel > summary::after { content: '+'; width: 28px; height: 28px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid var(--line); border-radius: 8px; color: var(--blue-3); background: #fff; font-size: 18px; }
.exercise-library-panel[open] > summary { border-bottom: 1px solid var(--line); }
.exercise-library-panel[open] > summary::after { content: '\u2212'; }
.exercise-library-panel > summary h2 { margin: 0; color: var(--text); font-size: 19px; }
.exercise-library-panel > summary > p { margin: 0 0 0 auto; color: var(--muted); font-size: 11px; text-align: right; white-space: nowrap; }
.exercise-library-panel > summary > p strong { display: block; color: var(--blue); font-size: 22px; }
.exercise-library-panel__content { padding: 16px 18px 18px; }
.exercise-library-panel__note { margin: 0 0 12px; color: var(--muted); font-size: 11px; line-height: 1.45; }

.exercise-library-filters {
  display: grid;
  grid-template-columns: minmax(190px, 1.35fr) repeat(3, minmax(145px, 1fr)) auto;
  align-items: end;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f8fbfd;
}

.exercise-library-filters label { min-width: 0; display: grid; gap: 5px; }
.exercise-library-filters label > span { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.exercise-library-filters select,
.exercise-library-filters input { min-width: 0; width: 100%; min-height: 40px; border: 1px solid #c9dde8; border-radius: 8px; padding: 8px 10px; color: var(--text); background: #fff; font-size: 11px; }
.exercise-library-count { min-width: 112px; margin: 0 0 11px; color: var(--muted); font-size: 10px; text-align: right; }

.exercise-library-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.exercise-library-card { min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: #fbfdfe; }
.exercise-library-card__topline { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; color: var(--blue-3); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.exercise-library-card__topline span:last-child { color: var(--muted); text-align: right; }
.exercise-library-card h3 { margin: 0 0 8px; color: var(--text); font-size: 14px; line-height: 1.25; overflow-wrap: anywhere; }
.exercise-library-card__aliases { margin: -2px 0 9px; color: var(--muted); font-size: 10px; line-height: 1.4; }
.exercise-library-card__aliases > span { margin-right: 5px; color: var(--faint); font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.exercise-library-card dl { display: grid; gap: 7px; margin: 0; }
.exercise-library-card dl > div { display: grid; gap: 3px; }
.exercise-library-card dt { color: var(--faint); font-size: 8px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.exercise-library-card dd { margin: 0; }
.exercise-library-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.exercise-library-tags span { min-width: 0; padding: 3px 5px; border-radius: 5px; color: var(--blue-2); background: var(--soft); font-size: 8px; line-height: 1.3; overflow-wrap: anywhere; }

.progression-library-filters { grid-template-columns: minmax(190px, 1.4fr) repeat(2, minmax(145px, 1fr)) auto; }
.progression-library-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.progression-library-card { min-width: 0; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: #fbfdfe; }
.progression-library-card__topline { display: flex; justify-content: space-between; gap: 8px; color: var(--blue-3); font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.progression-library-card__topline span:last-child { color: var(--muted); text-align: right; }
.progression-library-card h3 { margin: 7px 0 5px; color: var(--text); font-size: 14px; }
.progression-library-card > p { margin: 0 0 9px; color: var(--muted); font-size: 10px; line-height: 1.4; }
.progression-library-card__weeks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.progression-library-card__weeks div { min-width: 0; display: grid; gap: 2px; padding: 6px; border-radius: 6px; background: var(--soft); }
.progression-library-card__weeks strong { color: var(--blue); font-size: 9px; }
.progression-library-card__weeks span { color: var(--muted); font-size: 8px; line-height: 1.3; overflow-wrap: anywhere; }

.compatibility-layer-panel__content { display: grid; gap: 12px; }
.compatibility-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.compatibility-stats article { min-width: 0; display: grid; align-content: center; gap: 2px; min-height: 78px; padding: 10px; border: 1px solid var(--line); border-radius: 9px; background: #f8fbfd; }
.compatibility-stats strong { color: var(--blue); font-size: 22px; }
.compatibility-stats span { color: var(--text); font-size: 9px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.compatibility-stats small { color: var(--muted); font-size: 8px; }
.compatibility-class-distribution { display: flex; flex-wrap: wrap; gap: 5px; }
.compatibility-class-distribution > span,
.compatibility-test__classes span { padding: 5px 7px; border-radius: 6px; color: var(--blue-2); background: var(--soft); font-size: 9px; }
.compatibility-class-distribution strong { color: var(--blue); }
.compatibility-test { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: #f8fbfd; }
.compatibility-test > label { min-width: 0; display: grid; gap: 5px; }
.compatibility-test > label > span { color: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.compatibility-test select { min-width: 0; width: 100%; min-height: 42px; border: 1px solid #c9dce7; border-radius: 8px; padding: 8px 10px; color: var(--text); background: #fff; font-size: 11px; }
.compatibility-test__result { min-width: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.compatibility-test__result article { min-width: 0; padding: 11px; border: 1px solid var(--line); border-radius: 9px; background: #fff; }
.compatibility-test__result h3 { margin: 5px 0 9px; color: var(--text); font-size: 15px; }
.compatibility-test__result h4 { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px; color: var(--text); font-size: 11px; }
.compatibility-test__result h4 span { min-width: 24px; padding: 3px 5px; border-radius: 999px; color: #fff; background: var(--blue); font-size: 8px; text-align: center; }
.compatibility-test__result ul { max-height: 210px; margin: 0; padding-left: 17px; overflow-y: auto; color: var(--muted); font-size: 9px; line-height: 1.55; }
.compatibility-test__classes { display: flex; flex-wrap: wrap; gap: 4px; }

.knowledge-section { margin-top: 14px; }

.filters {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto;
  align-items: end;
  gap: 10px;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: var(--shadow-soft);
}

.results-count { min-width: 130px; margin: 0 0 11px; color: var(--muted); font-size: 11px; text-align: right; }
.knowledge-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.knowledge-card { padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); box-shadow: var(--shadow-soft); }
.knowledge-card__topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.knowledge-card__category, .knowledge-card__status { font-size: 9px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
.knowledge-card__category { color: var(--blue-3); }
.knowledge-card__status { padding: 5px 8px; border-radius: 999px; color: #73530c; background: #fff1d5; }
.knowledge-card h2 { margin: 0 0 13px; color: var(--text); font-size: 16px; line-height: 1.25; }
.knowledge-card__conditions { display: flex; flex-wrap: wrap; gap: 4px; }
.knowledge-card__conditions span { padding: 4px 6px; border-radius: 6px; color: var(--blue-2); background: var(--soft); font-size: 10px; font-weight: 700; }
.knowledge-empty { grid-column: 1 / -1; margin: 0; padding: 36px 18px; border: 1px dashed var(--line); border-radius: 12px; color: var(--muted); background: var(--panel); text-align: center; }

footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; padding: 18px 2px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.persistence-mode,
.persistence-error {
  margin: 0 0 1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  color: var(--blue-2);
  background: var(--panel);
}

.persistence-mode--remote {
  border-color: #b9ded3;
  color: #1f6557;
  background: #edf8f4;
}

.persistence-error,
.coaching-login__feedback {
  color: #8e2f25;
  border-color: #efc2bd;
  background: #fff4f2;
}

.coaching-auth-status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.coaching-auth-status button,
.coaching-login button,
.program-version-tools button {
  border: 1px solid var(--blue);
  border-radius: 0.65rem;
  padding: 0.55rem 0.8rem;
  color: #fff;
  background: var(--blue);
  cursor: pointer;
}

.auth-shell {
  display: grid;
  min-height: calc(100vh - 5rem);
  place-items: center;
}

.coaching-login {
  width: min(28rem, 100%);
  padding: 2rem;
  border: 1px solid var(--line);
  border-radius: 1rem;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.coaching-login form,
.coaching-login label {
  display: grid;
  gap: 0.55rem;
}

.coaching-login form {
  margin-top: 1.25rem;
  gap: 1rem;
}

.coaching-login input {
  width: 100%;
  border: 1px solid #c9dde8;
  border-radius: 0.65rem;
  padding: 0.75rem;
  color: var(--text);
  background: #fff;
}

.dashboard-client-grid {
  display: block;
}

.dashboard-client-group + .dashboard-client-group {
  margin-top: 1.5rem;
}

.dashboard-client-group > h3 {
  margin: 0 0 0.8rem;
  color: var(--text);
}

.dashboard-client-group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 19rem), 1fr));
  gap: 1rem;
}

.program-version-tools {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid var(--line);
  border-radius: 0.9rem;
  background: var(--panel);
}

.program-version-tools > div,
.program-version-tools__actions,
.program-version-row,
.program-version-row > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.program-version-tools details {
  margin-top: 1rem;
}

.program-version-row {
  margin-top: 0.65rem;
  padding: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 0.7rem;
}

.program-version-row > div:first-child {
  align-items: flex-start;
  flex-direction: column;
}

.program-version-row--current {
  border-color: rgba(52, 211, 153, 0.45);
}

.program-version-tools button:disabled { opacity: 0.48; cursor: not-allowed; }
.program-lifecycle { display: grid; gap: 0.85rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.program-lifecycle__heading, .program-lifecycle__dates { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.program-lifecycle__heading > div, .program-lifecycle__dates label { display: grid; gap: 0.3rem; }
.program-lifecycle__heading small, .program-lifecycle__dates span, .program-lifecycle__dates label span { color: var(--muted); font-size: 0.72rem; }
.program-lifecycle__dates { padding: 0.8rem; border: 1px solid var(--line); border-radius: 0.7rem; background: #f8fbfd; }
.program-lifecycle__dates input { min-height: 2.4rem; padding: 0.45rem 0.6rem; border: 1px solid #c9dde8; border-radius: 0.55rem; color: var(--text); background: #fff; }

.dashboard-detail__mesocycles { grid-column: 1 / -1; }
.dashboard-detail__roadmap { grid-column: 1 / -1; display: grid; gap: 0.85rem; }
.roadmap-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.roadmap-heading h3 { margin-bottom: 0.25rem; }
.roadmap-heading p { color: var(--muted); }
.roadmap-heading > strong { color: var(--blue); font-size: 0.78rem; }
.roadmap-progress { overflow: hidden; height: 0.45rem; border-radius: 999px; background: var(--soft); }
.roadmap-progress > span { display: block; height: 100%; border-radius: inherit; background: var(--green); }
.roadmap-blocks { display: grid; gap: 0.45rem; margin: 0; padding: 0; list-style: none; }
.roadmap-block { display: grid; grid-template-columns: 1.7rem minmax(0, 1fr) auto; align-items: center; gap: 0.55rem; padding: 0.65rem 0.7rem; border: 1px solid var(--line); border-radius: 0.65rem; background: #f8fbfd; }
.roadmap-block > div { display: grid; gap: 0.15rem; }
.roadmap-block > div small, .roadmap-block > small { color: var(--muted); font-size: 0.68rem; }
.roadmap-block > span:last-of-type { color: var(--blue-2); font-size: 0.68rem; font-weight: 800; }
.roadmap-block > small { grid-column: 2 / -1; }
.roadmap-block__marker { width: 1.55rem; height: 1.55rem; display: grid; place-items: center; border-radius: 999px; color: var(--blue); background: var(--soft); font-weight: 900; }
.roadmap-block--completed .roadmap-block__marker { color: #fff; background: var(--green); }
.roadmap-block--active .roadmap-block__marker, .roadmap-block--preparing .roadmap-block__marker, .roadmap-block--adapted .roadmap-block__marker { color: #fff; background: var(--blue-3); }
.roadmap-override { border-top: 1px solid var(--line); padding-top: 0.7rem; }
.roadmap-override > summary { color: var(--blue); font-size: 0.75rem; font-weight: 800; cursor: pointer; }
.roadmap-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65rem; margin-top: 0.7rem; }
.roadmap-form label { display: grid; gap: 0.3rem; }
.roadmap-form label > span, .roadmap-form legend { color: var(--muted); font-size: 0.68rem; font-weight: 800; }
.roadmap-form input, .roadmap-form select { min-width: 0; min-height: 2.35rem; width: 100%; border: 1px solid #c9dce7; border-radius: 0.5rem; padding: 0.45rem 0.55rem; color: var(--text); background: #fff; }
.roadmap-form fieldset { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; margin: 0; border: 1px solid var(--line); border-radius: 0.6rem; padding: 0.65rem; }
.roadmap-form legend { padding: 0 0.3rem; }
.roadmap-form button { justify-self: start; min-height: 2.4rem; border: 0; border-radius: 0.55rem; padding: 0.45rem 0.8rem; color: #fff; background: var(--blue); font-size: 0.72rem; font-weight: 800; cursor: pointer; }
.roadmap-form button:disabled { opacity: 0.55; }
.roadmap-form__status { grid-column: 1 / -1; color: var(--muted) !important; }
.mesocycle-history { display: grid; gap: 0.75rem; }
.mesocycle-history__item { display: grid; gap: 0.45rem; padding: 0.85rem; border: 1px solid var(--line); border-radius: 0.7rem; background: #f8fbfd; }
.mesocycle-history__heading, .mesocycle-history__heading > div, .mesocycle-history__actions { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
.mesocycle-history__heading { justify-content: space-between; }
.mesocycle-history__heading span, .mesocycle-check-state { padding: 0.25rem 0.45rem; border-radius: 999px; color: var(--blue-2); background: var(--soft); font-size: 0.68rem; font-weight: 800; }
.mesocycle-check-state--due, .mesocycle-check-state--overdue { color: #8e2f25; background: #fff0ed; }
.mesocycle-check-state--due_soon { color: #73530c; background: #fff4df; }
.mesocycle-check-state--completed { color: #1f6557; background: #e7f5ef; }
.mesocycle-history__item small { color: var(--muted); }
.mesocycle-history__actions button, .mesocycle-check-form button[type='submit'] { min-height: 2.3rem; padding: 0.45rem 0.7rem; border: 1px solid var(--blue); border-radius: 0.55rem; color: #fff; background: var(--blue); font-size: 0.72rem; font-weight: 800; cursor: pointer; }
.mesocycle-history__actions button:disabled { opacity: 0.5; }
.mesocycle-history__status { color: var(--muted) !important; }
.mesocycle-check-form { display: grid; gap: 1rem; margin-top: 1rem; padding: 1rem; border: 1px solid #b9ded3; border-radius: 0.8rem; background: #f5fbf8; }
.mesocycle-check-form__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.mesocycle-check-form__heading h3 { margin: 0.2rem 0 0; }
.mesocycle-check-form__heading > span { color: var(--muted); font-size: 0.72rem; }
.mesocycle-check-form form, .mesocycle-check-form__coach { display: grid; gap: 1rem; }
.mesocycle-check-form__grid, .mesocycle-check-form__text-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.mesocycle-check-form label { display: grid; gap: 0.35rem; color: var(--text); font-size: 0.72rem; font-weight: 800; }
.mesocycle-check-form input, .mesocycle-check-form select, .mesocycle-check-form textarea { width: 100%; min-height: 2.5rem; padding: 0.55rem 0.65rem; border: 1px solid #c9dde8; border-radius: 0.55rem; color: var(--text); background: #fff; }
.mesocycle-check-form textarea { min-height: 4.8rem; resize: vertical; }
.mesocycle-check-form__coach { padding: 0.85rem; border: 1px solid var(--line); border-radius: 0.7rem; background: #fff; }
.mesocycle-check-form__coach summary { color: var(--blue); font-weight: 800; cursor: pointer; }
.mesocycle-check-form__status { color: var(--muted) !important; }

.program-editor-readonly {
  padding: 0.55rem 0.75rem;
  border-radius: 999px;
  color: var(--blue-2);
  background: var(--soft);
}

@media (max-width: 980px) {
  .page-shell { width: min(100% - 28px, 1280px); padding-top: 20px; }
  .rampup-list ol { grid-template-columns: 1fr; }
  .placeholder-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  body { background: #f3f8fb; }

  .app-topbar {
    min-height: auto;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 9px 12px 0;
  }

  .app-brand__mark { width: 32px; height: 32px; }
  .app-topbar__title { display: none; }

  .app-tabs {
    order: 3;
    width: calc(100% + 24px);
    min-height: 46px;
    margin: 0 -12px;
    padding: 0 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    overflow-x: auto;
  }

  .app-tab { min-height: 34px; }

  .page-shell,
  .page-shell--home,
  .page-shell--knowledge,
  .page-shell--program,
  .page-shell--anamnesis,
  .page-shell--dashboard {
    width: min(100% - 16px, 1280px);
    padding: 12px 0 36px;
  }

  .hero { min-height: 0; align-items: flex-start; flex-direction: column; padding: 22px 20px; border-radius: 12px; }
  .hero h1 { font-size: 33px; }
  .hero__meta { justify-content: flex-start; }

  .direction__intro,
  .program-hero__heading,
  .knowledge-hero__heading,
  .test-results__heading,
  .selection-matrix__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .direction__intro { display: flex; padding: 15px; }

  .placeholder-grid,
  .knowledge-list,
  .exercise-library-list,
  .match-list,
  .selection-result-list,
  .selection-controls,
  .priority-guidance-grid,
  .rampup-list { grid-template-columns: 1fr; }

  .placeholder-card { min-height: 170px; }

  .dashboard-hero { padding: 20px; border-radius: 10px; }
  .dashboard-counters, .dashboard-client-grid { grid-template-columns: 1fr; }
  .dashboard-list-section { padding: 12px; border-radius: 10px; }
  .dashboard-list-heading { align-items: flex-start; }
  .dashboard-filters { grid-template-columns: 1fr; }
  .dashboard-filters select { min-height: 46px; }
  .dashboard-client-card { min-height: 50px; }
  .dashboard-detail { border-radius: 10px; }
  .dashboard-detail__heading, .dashboard-detail__path { align-items: stretch; flex-direction: column; }
  .dashboard-detail__grid { grid-template-columns: 1fr; padding: 12px; }
  .roadmap-heading { flex-direction: column; }
  .roadmap-form, .roadmap-form fieldset { grid-template-columns: 1fr; }
  .roadmap-block { grid-template-columns: 1.7rem minmax(0, 1fr); }
  .roadmap-block > span:last-of-type, .roadmap-block > small { grid-column: 2; }
  .dashboard-detail__actions { display: grid; grid-template-columns: 1fr; }
  .dashboard-detail__actions button { width: 100%; min-height: 46px; }
  .dashboard-anamnesis { margin: 0 12px 12px; padding: 12px; }
  .dashboard-anamnesis__heading { align-items: stretch; flex-direction: column; }
  .dashboard-anamnesis__sections { grid-template-columns: 1fr; }
  .mesocycle-check-form__heading { flex-direction: column; }
  .mesocycle-check-form__grid, .mesocycle-check-form__text-grid { grid-template-columns: 1fr; }
  .program-lifecycle__heading, .program-lifecycle__dates { align-items: stretch; flex-direction: column; }

  .anamnesis-hero { padding: 20px; border-radius: 10px; }
  .anamnesis-hero__version { flex: 0 0 auto; }
  .anamnesis-progress, .anamnesis-card { border-radius: 10px; }
  .anamnesis-grid--two,
  .anamnesis-grid--four,
  .anamnesis-choice-grid--two,
  .anamnesis-choice-grid--three,
  .anamnesis-explanation-grid,
  .anamnesis-summary-grid { grid-template-columns: 1fr; }
  .anamnesis-card__heading { padding: 16px; }
  .anamnesis-card__body { min-height: 0; }
  .anamnesis-grid, .anamnesis-section-block { padding: 16px; }
  .anamnesis-grid--flush { padding: 0; }
  .anamnesis-grid--nested { padding: 14px 0 0; }
  .anamnesis-subpanel, .anamnesis-lift-card { margin: 0 16px 16px; padding: 14px; }
  .anamnesis-lift-list { padding: 0 16px 16px; }
  .anamnesis-lift-list .anamnesis-lift-card { margin: 0; }
  .anamnesis-choice { min-height: 50px; }
  .anamnesis-info, .anamnesis-medical-note, .anamnesis-validation, .anamnesis-complete { margin: 0 16px 16px; }
  .anamnesis-summary-grid { padding: 16px; }
  .anamnesis-summary-intro { padding: 16px 16px 0; }
  .anamnesis-actions { align-items: stretch; flex-direction: column; }
  .anamnesis-actions button { width: 100%; }
  .anamnesis-actions span { order: -1; text-align: center; }

  .program-hero,
  .knowledge-hero,
  .program-section,
  .selection-matrix,
  .test-panel { border-radius: 10px; }

  .program-hero, .knowledge-hero { padding: 18px; }
  .exercise-library-panel { border-radius: 10px; }
  .exercise-library-panel > summary { min-height: 0; align-items: flex-start; padding: 14px; }
  .exercise-library-panel > summary > p { text-align: left; }
  .exercise-library-panel__content { padding: 12px; }
  .exercise-library-filters { grid-template-columns: 1fr; }
  .exercise-library-count { margin: 2px 0 0; text-align: left; }
  .progression-library-list { grid-template-columns: 1fr; }
  .program-hero__status { align-self: flex-start; }
  .program-hero__status { max-width: none; text-align: left; }
  .program-variant-control { grid-template-columns: 1fr; }
  .program-rationale__content ul { grid-template-columns: 1fr; }
  .program-profile { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .program-profile span { border-radius: 7px; }
  .generator-client-banner { padding: 14px; border-radius: 10px; }
  .generator-client-banner__heading { align-items: stretch; flex-direction: column; gap: 4px; }
  .generator-client-banner dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .generation-launch-row { align-items: stretch; flex-direction: column; }
  .generation-launch-row button { width: 100%; }
  .generation-panel { padding: 13px; }
  .new-program-options { grid-template-columns: 1fr; }
  .new-program-options button { min-height: 82px; }
  .new-program-mode { padding: 12px; }
  .new-program-mode__heading { flex-direction: column; }
  .new-program-mode__heading > span { max-width: none; text-align: left; }
  .generation-input-grid { grid-template-columns: 1fr; }
  .generation-input-grid select, .generation-input-grid input { min-height: 44px; }
  .generation-suggested-structure { align-items: stretch; flex-direction: column; }
  .generation-suggested-structure button { width: 100%; }
  .program-editor-context { align-items: stretch; flex-direction: column; }
  .program-editor-context strong { margin-right: 0; }
  .generation-panel__run { width: 100%; }
  .generation-proposal__heading,
  .generation-proposal__actions { align-items: stretch; flex-direction: column; }
  .generation-proposal__heading > span { align-self: flex-start; }
  .generation-proposal__explanation,
  .generation-proposal__days,
  .generation-strategy__grid,
  .generation-strategy__policies,
  .generation-quality__sessions { grid-template-columns: 1fr; }
  .generation-quality { padding: 11px; }
  .generation-quality__heading { align-items: flex-start; flex-direction: column; }
  .generation-proposal__actions button { width: 100%; }
  .program-section, .selection-matrix, .test-panel { padding: 12px; }
  .selection-matrix, .priority-matrix { padding: 0; }
  .priority-matrix__content { padding: 12px; }
  .priority-guidance-card:last-child { grid-column: auto; }

  .week-heading { align-items: flex-start; flex-direction: column; gap: 10px; }
  .week-selector { width: 100%; overflow-x: auto; overscroll-behavior-x: contain; }
  .week-selector__button { flex: 1 0 auto; min-width: 40px; }
  .program-day__header { padding: 12px; }
  .program-editor-toolbar { align-items: stretch; flex-direction: column; }
  .program-editor-toolbar__actions { justify-content: flex-start; }
  .program-editor-future-action small { text-align: left; }
  .program-editor-sheet-actions button { flex: 1 1 140px; }
  .program-editor-tab { flex: 1 1 92px; }
  .exercise-editor-card__header { grid-template-columns: auto minmax(0, 1fr); }
  .exercise-editor-card__mini-actions { grid-column: 1 / -1; justify-content: flex-end; flex-wrap: wrap; }
  .exercise-editor-card__fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .exercise-editor-field--name, .exercise-editor-field--note { grid-column: 1 / -1; }
  .exercise-picker__filters, .exercise-picker__results { grid-template-columns: 1fr; }
  .exercise-picker__filters select { min-height: 44px; }
  .exercise-picker-result { min-height: 56px !important; }
  .exercise-editor-card__apply-actions { display: grid; grid-template-columns: 1fr; }
  .exercise-editor-card__apply-actions button { width: 100%; }
  .progression-picker { padding: 10px; }
  .progression-picker__filters, .progression-picker__results { grid-template-columns: 1fr; }
  .progression-picker__filters input, .progression-picker__filters select { min-height: 44px; }
  .progression-picker__preview-heading { align-items: stretch; flex-direction: column; }
  .progression-picker__preview-heading button { width: 100%; }
  .progression-week-grid { grid-template-columns: 1fr; }
  .technique-picker, .grouping-picker { padding: 10px; }
  .technique-picker__results, .grouping-picker__options { grid-template-columns: 1fr; }
  .technique-picker__apply button { width: 100%; }
  .exercise-group-card { padding: 8px; }
  .exercise-group-card__header { align-items: stretch; flex-direction: column; }
  .exercise-group-card__header > div { justify-content: space-between; }
  .exercise-group-card__settings { grid-template-columns: 1fr; }
  .compatibility-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .compatibility-test__result { grid-template-columns: 1fr; }
  .support-editor-grid { grid-template-columns: 1fr; }
  .support-editor-grid__wide { grid-column: auto; }

  .session-disclosure > summary { padding-inline: 12px; }
  .session-disclosure__content { padding: 10px 12px 12px; }
  .session-block--workout h3 { padding: 12px 12px 8px; }
  .preparation-list li > div { display: grid; gap: 6px; }
  .preparation-prescription { justify-self: start; }
  .rampup-list ol { grid-template-columns: repeat(3, minmax(0, 1fr)); }

  .exercise-table-wrap { overflow: visible; }
  .exercise-table, .exercise-table tbody, .exercise-table tr, .exercise-table th, .exercise-table td { display: block; width: 100%; }
  .exercise-table thead { display: none; }
  .exercise-table tbody { display: grid; gap: 7px; padding: 0 10px 10px; }

  .exercise-table tbody tr {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: #fff;
  }

  .exercise-table tbody th {
    grid-column: 1 / -1;
    padding: 10px !important;
    border-top: 0;
    border-bottom: 1px solid var(--line);
    background: #f8fbfd;
  }

  .exercise-table tbody td {
    display: grid;
    gap: 2px;
    padding: 8px 6px !important;
    border-top: 0;
    color: var(--text);
    font-size: 12px;
  }

  .exercise-table tbody td::before {
    content: attr(data-label);
    color: var(--muted);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .selection-matrix__goal, .knowledge-total { text-align: left; }
  .selection-matrix__goal .localized-term { align-items: flex-start; }
  .selection-card__topline { display: grid; }
  .selection-card__work-line { max-width: none; text-align: left; }
  .selection-card__work-line .localized-term { align-items: flex-start; }
  .filters { grid-template-columns: 1fr; align-items: stretch; padding: 12px; }
  .results-count { margin: 2px 0 0; text-align: left; }
  footer { flex-direction: column; gap: 5px; }
}

.mesocycle-delivery-state { padding: 0.25rem 0.45rem; border-radius: 999px; color: #6f4b00; background: #fff2cf; font-size: 0.68rem; font-weight: 800; }
.mesocycle-delivery-state--delivered { color: #145945; background: #dff5ed; }
.mesocycle-history__heading > div:last-child { display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; flex-wrap: wrap; }
.workflow-notice { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; margin: 0 0 1rem; padding: 0.8rem 1rem; border: 1px solid #b9ded3; border-radius: 0.75rem; color: #145945; background: #f0faf6; }
.workflow-notice a { color: var(--blue); font-weight: 800; }
.public-check-page { min-height: 100vh; padding: 2rem 1rem; color: var(--text); background: #eef4f7; }
.public-check-shell { width: min(100%, 780px); margin: 0 auto; }
.public-check-header { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1rem; padding: 1rem 1.2rem; border: 1px solid var(--line); border-radius: 0.9rem; background: #fff; box-shadow: var(--shadow); }
.public-check-header h1 { margin: 0.15rem 0 0; font-size: clamp(1.45rem, 5vw, 2rem); }
.public-check-content { display: grid; gap: 1rem; }
.public-check-intro, .public-check-result { padding: 1.1rem 1.2rem; border: 1px solid var(--line); border-radius: 0.9rem; background: #fff; box-shadow: var(--shadow); }
.public-check-intro h2, .public-check-result h2 { margin: 0 0 0.45rem; }
.public-check-result--error { border-color: #e0b7b7; color: #7d2424; background: #fff7f7; }

.client-portal-entry { margin: -1rem 0 1.5rem; text-align: right; }
.client-portal-entry a { color: var(--blue); font-weight: 800; }
.client-login-page, .client-portal { min-height: 100vh; color: #17272c; background: #edf3f2; }
.client-login-page *, .client-portal * { box-sizing: border-box; }
.client-login-shell { display: grid; min-height: 100vh; place-items: center; padding: 1rem; }
.client-login-card { width: min(100%, 430px); padding: 2rem; border: 1px solid #d4e0de; border-radius: 1rem; background: #fff; box-shadow: 0 18px 55px rgb(20 57 52 / 10%); }
.client-login-brand, .client-portal-topbar a { display: flex; align-items: center; gap: 0.65rem; color: inherit; text-decoration: none; }
.client-login-brand span, .client-portal-topbar a > span { display: grid; width: 2.25rem; height: 2.25rem; border-radius: 0.55rem; color: #fff; background: #126c5b; font-weight: 900; place-items: center; }
.client-login-card > p { margin: 2rem 0 0.3rem; color: #126c5b; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
.client-login-card h1 { margin: 0 0 1.5rem; font-size: clamp(1.8rem, 8vw, 2.6rem); line-height: 1.04; }
.client-login-card form { display: grid; gap: 0.9rem; }
.client-login-card label, .client-session-note { display: grid; gap: 0.35rem; color: #52696b; font-size: 0.78rem; font-weight: 800; }
.client-login-card input, .client-login-card button, .client-program-picker select, .client-program-picker button { min-height: 3rem; border: 1px solid #c5d5d2; border-radius: 0.65rem; font: inherit; }
.client-login-card input { width: 100%; padding: 0 0.8rem; background: #fbfdfc; }
.client-login-card button, .client-program-picker button { border-color: #126c5b; color: #fff; background: #126c5b; font-weight: 900; }
.client-login-card form p { margin: 0; color: #a03434; font-size: 0.82rem; }
.client-login-card > small { display: block; margin-top: 1rem; color: #6d8182; line-height: 1.45; }
.client-portal-topbar { position: sticky; z-index: 20; top: 0; display: flex; align-items: center; justify-content: space-between; min-height: 4rem; padding: 0.7rem max(1rem, calc((100vw - 900px) / 2)); border-bottom: 1px solid #d3dfdd; background: rgb(255 255 255 / 94%); backdrop-filter: blur(12px); }
.client-portal-topbar button { padding: 0.55rem 0.8rem; border: 1px solid #c6d4d2; border-radius: 0.55rem; color: #385456; background: #fff; font: inherit; font-size: 0.78rem; font-weight: 800; }
.client-portal-shell { display: grid; width: min(100% - 2rem, 900px); margin: 0 auto; padding: 1.3rem 0 4rem; gap: 1rem; }
.client-hero, .client-current-program, .client-next-workout, .client-mesocycle-progress, .client-week-navigation, .client-session, .client-portal-section, .client-empty { border: 1px solid #d5e0de; border-radius: 0.9rem; background: #fff; box-shadow: 0 8px 25px rgb(21 66 59 / 6%); }
.client-hero { padding: 1.2rem; background: linear-gradient(135deg, #123d37, #126c5b); color: #fff; }
.client-hero > p { margin: 0 0 0.2rem; opacity: 0.75; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.09em; text-transform: uppercase; }
.client-hero h1 { margin: 0; font-size: clamp(1.8rem, 6vw, 2.6rem); }
.client-program-picker { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 0.7rem; margin-top: 1.2rem; }
.client-program-picker label { display: grid; gap: 0.3rem; min-width: 0; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.client-program-picker select { width: 100%; padding: 0 0.75rem; color: #173b37; background: #fff; }
.client-program-picker button { padding: 0 1rem; border-color: #fff; color: #123d37; background: #fff; }
.client-global-feedback, .client-readonly { margin: 0; padding: 0.75rem 0.9rem; border: 1px solid #c6dcd7; border-radius: 0.7rem; color: #195b50; background: #f5fbf9; font-size: 0.82rem; font-weight: 700; }
.client-current-program { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.1rem; }
.client-current-program span, .client-next-workout > span { color: #617778; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.07em; text-transform: uppercase; }
.client-current-program h2 { margin: 0.15rem 0; }
.client-current-program p { margin: 0; color: #657879; font-size: 0.82rem; }
.client-current-program > div:last-child { display: grid; gap: 0.25rem; text-align: right; }
.client-current-program > div:last-child span { letter-spacing: 0; text-transform: none; }
.client-next-workout { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0.25rem 1rem; padding: 1rem 1.1rem; }
.client-next-workout > span { grid-column: 1 / -1; }
.client-next-workout button, .client-session__open, .client-session__finish { min-height: 2.6rem; padding: 0.55rem 0.9rem; border: 0; border-radius: 0.6rem; color: #fff; background: #126c5b; font: inherit; font-size: 0.78rem; font-weight: 900; text-transform: uppercase; }
.client-mesocycle-progress { display: grid; padding: 1rem 1.1rem; gap: 0.8rem; }
.client-mesocycle-progress h2 { margin: 0; font-size: 1.05rem; }
.client-mesocycle-progress > p { margin: 0; color: #5d7475; font-size: 0.82rem; }
.client-progress { display: grid; gap: 0.35rem; }
.client-progress > div:first-child { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.78rem; }
.client-progress > div:first-child span { color: #607677; }
.client-progress__track { overflow: hidden; height: 0.55rem; border-radius: 999px; background: #e5eeec; }
.client-progress__track span { display: block; height: 100%; border-radius: inherit; background: #1c8a74; transition: width 180ms ease; }
.client-week-navigation { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; padding: 0.8rem 1rem; }
.client-week-navigation > div:first-child { display: grid; }
.client-week-navigation > div:first-child span { color: #667b7c; font-size: 0.68rem; text-transform: uppercase; }
.client-week-navigation > div:last-child { display: flex; overflow-x: auto; gap: 0.35rem; }
.client-week-navigation button { flex: 0 0 2.4rem; height: 2.4rem; border: 1px solid #cedbd9; border-radius: 0.55rem; color: #365354; background: #fff; font-weight: 900; }
.client-week-navigation button.is-active { border-color: #126c5b; color: #fff; background: #126c5b; }
.client-session-list { display: grid; gap: 0.8rem; }
.client-session { overflow: hidden; }
.client-session--open { border-color: #9bc6bc; }
.client-session__summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.1rem 0.7rem; }
.client-session__summary span:first-child { color: #126c5b; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; }
.client-session__summary h3 { margin: 0.15rem 0 0; }
.client-status { flex: 0 0 auto; padding: 0.3rem 0.5rem; border-radius: 999px; color: #5b7071; background: #edf2f1; font-size: 0.68rem; font-weight: 900; }
.client-status--in_progress { color: #755d16; background: #fff2c9; }
.client-status--completed { color: #12604f; background: #dff4ed; }
.client-session > .client-progress { padding: 0 1.1rem 0.8rem; }
.client-session__open { width: 100%; border-radius: 0; background: #edf6f3; color: #126c5b; }
.client-session__content { display: grid; padding: 0.9rem; background: #f8fbfa; gap: 0.75rem; }
.client-support { border: 1px solid #d9e4e2; border-radius: 0.65rem; background: #fff; }
.client-support summary, .client-portal-section summary { cursor: pointer; padding: 0.85rem 1rem; font-weight: 900; }
.client-support > div { display: grid; padding: 0 1rem 1rem; gap: 0.6rem; }
.client-support p { margin: 0; color: #536b6d; font-size: 0.82rem; line-height: 1.45; }
.client-support article { display: grid; gap: 0.2rem; padding: 0.65rem; border-radius: 0.5rem; background: #f2f7f6; }
.client-support article span { color: #126c5b; font-size: 0.78rem; font-weight: 800; }
.client-support ol { margin: 0.4rem 0 0; padding-left: 1.25rem; color: #536b6d; font-size: 0.8rem; }
.client-working-sets { display: grid; gap: 0.7rem; }
.client-working-sets > h3 { margin: 0.2rem 0; font-size: 1rem; }
.client-exercise { overflow: hidden; border: 1px solid #d3dfdd; border-radius: 0.75rem; background: #fff; }
.client-exercise > header { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; padding: 0.85rem 0.9rem; border-bottom: 1px solid #e0e8e6; }
.client-exercise > header span { color: #126c5b; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; }
.client-exercise h4 { margin: 0.15rem 0 0; font-size: 1rem; }
.client-exercise > header a { flex: 0 0 auto; color: #126c5b; font-size: 0.69rem; font-weight: 900; text-transform: uppercase; }
.client-prescription { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; border-bottom: 1px solid #e2e9e8; }
.client-prescription > div { display: grid; padding: 0.65rem; border-right: 1px solid #e2e9e8; text-align: center; }
.client-prescription > div:last-child { border-right: 0; }
.client-prescription dt { color: #667b7c; font-size: 0.63rem; font-weight: 900; text-transform: uppercase; }
.client-prescription dd { margin: 0.15rem 0 0; font-weight: 900; }
.client-prescription dt span { display: inline-grid; width: 1rem; height: 1rem; border-radius: 50%; color: #fff; background: #60827d; place-items: center; }
.client-structured-prescription { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; padding: 0.75rem 0.9rem; border-bottom: 1px solid #d7e8e3; background: #f0faf6; }
.client-structured-prescription article { display: grid; gap: 0.18rem; padding: 0.6rem; border: 1px solid #cce2dc; border-radius: 0.55rem; background: #fff; }
.client-structured-prescription strong { color: #126c5b; font-size: 0.7rem; text-transform: uppercase; }
.client-structured-prescription span { color: #173f39; font-size: 0.92rem; font-weight: 900; }
.client-structured-prescription small { color: #607576; font-size: 0.66rem; }
.client-exercise__meta, .client-exercise__note { margin: 0; padding: 0.55rem 0.9rem 0; color: #536b6d; font-size: 0.77rem; }
.client-set-list { display: grid; padding: 0.8rem; gap: 0.55rem; }
.client-set-row { display: grid; grid-template-columns: 3.4rem repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: 0.45rem; padding: 0.65rem; border: 1px solid #dce5e3; border-radius: 0.6rem; background: #fbfdfd; }
.client-set-row--saved { border-color: #aed4cb; background: #f2faf7; }
.client-set-row__number { align-self: center; font-size: 0.75rem; }
.client-set-row__number small { display: block; margin-top: 0.15rem; color: #126c5b; font-size: 0.58rem; line-height: 1.2; }
.client-set-row label { display: grid; min-width: 0; gap: 0.2rem; }
.client-set-row label span { color: #657b7c; font-size: 0.61rem; font-weight: 900; text-transform: uppercase; }
.client-set-row input { width: 100%; min-width: 0; height: 2.4rem; padding: 0 0.5rem; border: 1px solid #cbd9d6; border-radius: 0.45rem; background: #fff; font: inherit; }
.client-set-row__note { grid-column: 2 / 5; }
.client-set-row button { min-height: 2.4rem; padding: 0.45rem 0.65rem; border: 0; border-radius: 0.45rem; color: #fff; background: #126c5b; font-size: 0.67rem; font-weight: 900; text-transform: uppercase; }
.client-set-row__state { grid-column: 1 / -1; color: #687d7e; font-size: 0.67rem; }
.client-set-row__state--saved { color: #126c5b; }
.client-set-row__state--error { color: #a03434; }
.client-session-note textarea { min-height: 5rem; padding: 0.65rem; border: 1px solid #ccd9d7; border-radius: 0.55rem; resize: vertical; font: inherit; }
.client-session__finish { justify-self: end; background: #173f39; }
.client-finish-warning { padding: 0.9rem; border: 1px solid #dfc371; border-radius: 0.65rem; background: #fff9e8; }
.client-finish-warning p { margin: 0.25rem 0 0.7rem; color: #6f652f; font-size: 0.78rem; }
.client-finish-warning > div { display: flex; gap: 0.5rem; }
.client-finish-warning button { min-height: 2.5rem; padding: 0.45rem 0.7rem; border: 1px solid #c5aa57; border-radius: 0.5rem; background: #fff; font: inherit; font-size: 0.72rem; font-weight: 800; }
.client-portal-section { overflow: hidden; }
.client-portal-section > div { padding: 0 1rem 1rem; }
.client-legend, .client-progress-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
.client-legend article, .client-progress-list article { padding: 0.7rem; border-radius: 0.55rem; background: #f2f7f6; }
.client-legend p, .client-progress-list span { display: block; margin: 0.25rem 0 0; color: #5a7071; font-size: 0.76rem; line-height: 1.4; }
.client-empty { padding: 2rem; }

@media (max-width: 600px) {
  .client-portal-shell { width: min(100% - 1rem, 900px); padding-top: 0.55rem; }
  .client-portal-topbar { min-height: 3.5rem; padding: 0.55rem 0.75rem; }
  .client-hero, .client-current-program, .client-next-workout, .client-mesocycle-progress, .client-week-navigation, .client-session, .client-portal-section { border-radius: 0.7rem; box-shadow: none; }
  .client-program-picker { grid-template-columns: 1fr; }
  .client-program-picker button { width: 100%; }
  .client-current-program { align-items: flex-start; flex-direction: column; }
  .client-current-program > div:last-child { text-align: left; }
  .client-next-workout { grid-template-columns: 1fr; }
  .client-next-workout button { width: 100%; }
  .client-week-navigation { align-items: flex-start; flex-direction: column; }
  .client-week-navigation > div:last-child { width: 100%; }
  .client-week-navigation button { flex: 1 0 2.4rem; }
  .client-prescription { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .client-prescription > div:nth-child(2) { border-right: 0; }
  .client-prescription > div:nth-child(-n+2) { border-bottom: 1px solid #e2e9e8; }
  .client-set-row { grid-template-columns: 2.8rem repeat(3, minmax(0, 1fr)); }
  .client-set-row button { grid-column: 1 / -1; width: 100%; }
  .client-set-row__note { grid-column: 1 / -1; }
  .client-session__finish { width: 100%; }
  .client-finish-warning > div { flex-direction: column; }
  .client-legend, .client-progress-list { grid-template-columns: 1fr; }
}

@media (max-width: 420px) {
  .program-profile { grid-template-columns: 1fr; }
  .rampup-list ol { grid-template-columns: 1fr; }
  .exercise-table tbody tr { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .public-check-page { padding: 0.65rem; }
  .public-check-header, .public-check-intro, .public-check-result, .public-check-content .mesocycle-check-form { border-radius: 0.7rem; box-shadow: none; }
  .public-check-header { align-items: flex-start; padding: 0.85rem; }
  .public-check-content .mesocycle-check-form { margin-top: 0; padding: 0.8rem; }
  .public-check-content .mesocycle-check-form button[type='submit'] { width: 100%; min-height: 2.75rem; }
  .workflow-notice { align-items: stretch; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; }
}

:host { display:block; background:transparent; } .pt-editor-weeks { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; } .pt-editor-weeks button { padding:10px 14px; border:1px solid var(--line); border-radius:8px; background:white; color:var(--text); cursor:pointer; } .pt-editor-weeks button[aria-pressed="true"] { background:var(--blue); color:white; } .program-editor-local-state, [data-editor-toolbar-state], [data-editor-action="reset-program"] { display:none; }
.program-editor-future-action { display:none; }

/* PT editor: compact controls, with layout based on the available card width. */
:host {
  --blue: #173f70;
  --blue-2: #245a96;
  --blue-3: #245a96;
  --bg: #f5f7fa;
  --line: #e5e7eb;
  --text: #1f2937;
  --muted: #6b7280;
  --faint: #6b7280;
  --soft: #f5f7fa;
  container-type: inline-size;
}
.manual-program-editor { gap: 10px; }
.pt-editor-weeks { gap: 6px; margin-bottom: 10px; }
.pt-editor-weeks button { min-height: 38px; padding: 7px 12px; font-size: 13px; }
.program-editor-toolbar { padding: 8px 12px; background: #fff; }
.program-editor-sheet-toolbar { padding: 10px 12px; gap: 8px; }
.program-editor-sheet-actions__primary, .program-editor-empty button {
  background: var(--blue) !important; border-color: var(--blue) !important;
}
.program-editor-sheet-actions__danger { margin-left: auto; order: 2; }
.program-editor-toolbar button, .program-editor-sheet-toolbar button,
.exercise-editor-card button, .editor-add-action { font-size: 12px; font-weight: 600; }
button:not(:disabled):hover { filter: brightness(.96); box-shadow: inset 0 0 0 1px var(--blue-2); }
button:disabled { cursor: not-allowed; }
input:focus-visible, textarea:focus-visible { outline: 2px solid var(--blue-2); outline-offset: 2px; }
.program-day { border-color: var(--line); box-shadow: none; }
.program-day__header { padding: 10px 12px; background: #fff; }
.program-day__header p { font-size: 10px; letter-spacing: .04em; }
.program-day__header > span { width: 30px; height: 30px; }
.session-disclosure, .session-disclosure--preparation { background: #fff; }
.session-disclosure > summary { padding: 9px 12px; font-size: 11px; }
.session-disclosure__content { padding: 10px 12px; }
.exercise-editor-list { gap: 10px; padding: 0 10px 10px; }
.exercise-editor-card { border-radius: 8px; }
.exercise-editor-card__header {
  min-height: 44px; padding: 6px 10px; gap: 8px;
  color: var(--text); background: #fff; border-bottom: 1px solid var(--line);
  border-left: 3px solid var(--blue);
}
.exercise-editor-card__identity strong { font-size: 14px; line-height: 1.3; }
.exercise-editor-card__identity small { color: var(--muted); font-size: 11px; font-weight: 400; }
.exercise-editor-card__number { width: 26px; height: 26px; color: var(--blue); background: #eef3f9; }
.exercise-editor-card__mini-actions { gap: 5px; }
.exercise-editor-card__state { display: none; }
.exercise-editor-card__mini-actions button {
  width: 34px; min-height: 34px; color: var(--blue); background: #fff; border-color: var(--line);
}
.exercise-editor-card__mini-actions [data-editor-action="duplicate-exercise"] { width: auto; padding: 0 9px; }
.exercise-editor-card__mini-actions button:last-child { color: var(--red); background: #fff; }
.exercise-editor-card__body { padding: 10px; gap: 9px; background: #fff; }
.exercise-editor-card__fields { grid-template-columns: 84px 104px 104px 120px minmax(0, 1fr); gap: 8px 10px; }
.exercise-editor-field { gap: 4px; }
.exercise-editor-field > span, .exercise-editor-field--name > label { font-size: 10px; font-weight: 600; letter-spacing: .03em; }
.exercise-editor-field input, .exercise-editor-field textarea {
  min-height: 36px; padding: 7px 9px; border-color: var(--line); font-size: 13px; line-height: 20px;
}
.exercise-editor-field textarea { field-sizing: content; min-height: 36px; max-height: 180px; }
.exercise-editor-card__apply-actions { gap: 6px; border-top: 1px solid var(--line); padding-top: 8px; }
.exercise-editor-card__apply-actions button { min-height: 36px; padding: 6px 10px; }
.exercise-editor-card__technique { color: var(--muted) !important; }
.exercise-group-card__header { background: var(--soft); color: var(--text); }
.exercise-group-card__settings { background: #fff; }
@container (max-width: 600px) {
  .exercise-editor-card__fields { grid-template-columns: repeat(2, minmax(0, 120px)); }
  .exercise-editor-card__header { grid-template-columns: 26px minmax(0, 1fr); }
  .exercise-editor-card__mini-actions { grid-column: 1 / -1; justify-content: flex-end; }
  .exercise-editor-card__mini-actions button { min-height: 40px; min-width: 40px; }
  .exercise-editor-card__apply-actions button { min-height: 42px; }
  .exercise-editor-field input, .exercise-editor-field textarea { font-size: 16px; min-height: 40px; }
  .program-editor-toolbar { align-items: flex-start; flex-wrap: wrap; }
  .program-editor-toolbar__actions { justify-content: flex-start; }
  .program-editor-sheet-toolbar button, .pt-editor-weeks button { min-height: 42px; }
  .program-editor-sheet-actions__danger { margin-left: 0; }
  .exercise-group-card__settings { grid-template-columns: 1fr; }
  .exercise-editor-list { padding: 0 6px 6px; }
  .exercise-editor-card__body { padding: 8px; }
}
`;function fi(r,i){let a=r.attachShadow({mode:"open"}),o=document.createElement("style");o.textContent=rr;let s=document.createElement("nav");s.className="pt-editor-weeks",s.setAttribute("aria-label","Settimane della scheda");let c=Je({id:"pt",athleteId:"",title:"Scheda di allenamento",weeks:[1],days:[]},1,void 0,y=>{y&&queueMicrotask(()=>k())},i.confirm);a.append(o,s,c.element);let p="",b="",x,v=1,E=()=>{let y=i.getState();return JSON.stringify([y.draftClientId,y.draftProgramId,y.meta,y.sessions,y.sheetOrder,y.sheets,y.coachingEditorSnapshot,y.currentSheet,y.activeWeekIndex])},m=()=>{s.replaceChildren(...i.getState().sessions.map((y,$)=>{let M=document.createElement("button");return M.type="button",M.textContent=y,M.setAttribute("aria-pressed",String(v===$+1)),M.onclick=()=>{v=$+1,i.getState().activeWeekIndex=$,c.setWeek(v),p=E(),m(),i.onSelectionChange?.()},M}))},z=()=>{let y=ge(r),$=i.getState().currentSheet,M=E();if(M!==p){let f=pe(i.getState());c.setSnapshot(f),v=Math.min((Number(i.getState().activeWeekIndex)||0)+1,i.getState().sessions.length),c.setWeek(v),b=JSON.stringify(c.getSnapshot()),p=M,x=void 0,m()}let S=!i.canEdit();if(x!==S){c.setReadOnly(S),x=S,x||c.element.querySelector('[data-editor-action="toggle-edit"]')?.click();let f=c.getSnapshot().program.days.find(L=>L.letter===$);f&&!x&&Array.from(c.element.querySelectorAll('[data-editor-action="select-day"]')).find(L=>L.dataset.dayKey===f.key)?.click()}y()},k=()=>{if(!i.canEdit())return;let y=c.getSnapshot(),$=JSON.stringify(y),M=c.element.querySelector('[data-editor-action="select-day"][aria-pressed="true"]')?.dataset.dayKey,S=y.program.days.find(f=>f.key===M);if(S&&(i.getState().currentSheet=S.letter),i.getState().activeWeekIndex=v-1,$===b){p=E(),i.onSelectionChange?.();return}he(i.getState(),y),b=$,p=E(),i.onChange(),p=E()};return["input","change","click","pointerdown"].forEach(y=>c.element.addEventListener(y,k)),z(),{sync:z,capture:k}}return yr(bi);})();
