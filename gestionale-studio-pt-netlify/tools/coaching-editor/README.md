# Editor manuale PT

Interfaccia di creazione scheda portata dal progetto NEACEA Coaching (14 settembre 2026), senza Generation Engine, dashboard Coaching o connessioni remote aggiuntive.

Le sorgenti dell'editor e delle librerie esercizi/progressioni sono in `src/vendor`; le differenze PT sono settimane da 1 a 12, lettere seduta fino a Z e rimozione dell'azione futura “Consulta Cervello”. Oltre le sei settimane dei preset viene ripetuta l'ultima prescrizione, modificabile manualmente. Lo stile è isolato in Shadow DOM.

`src/adapter.ts` conserva lo snapshot completo in `pt_studio_state.coachingEditorSnapshot` e aggiorna il formato operativo PT. Lo snapshot comprende anche ordine/presenza per settimana, gruppi, tecniche, preparazione e ramp-up. Identificativi delle serie, carichi, note di seduta e feedback rimangono nel modello PT; le serie rimosse sono conservate in `coachingRetiredSets` per un eventuale ripristino. Il salvataggio usa il flusso PT esistente, incluse revisioni, conflitti e cache offline. Non richiede una migrazione del database.

Collaudo del 18 settembre 2026: vedere `../../docs/pt-usage-audit.md` per correzioni,
comandi, percorsi UI realmente provati e limiti. La prescrizione dello snapshot
non viene più sovrascritta dai dati effettivi delle sedute. `applySnapshot` accetta
`resetPrescription: true` soltanto per avviare un nuovo ciclo con valori programmati;
i chiamanti ordinari preservano le registrazioni già effettuate.

Da questa cartella:

```sh
npm install
npm test
npm run build
```

Il bundle compilato è versionato in `app/portale-personal-trainer/js/coaching-editor.js`, perché il portale è pubblicato come sito statico. Dopo modifiche alle sorgenti rigenerarlo prima del deploy. La cartella `src/vendor` è una copia autonoma e non dipende dal repository Coaching a runtime.

Verifiche aggiuntive dalla cartella `gestionale-studio-pt-netlify`: `node tests/pt-program-persistence.test.cjs`, `node tests/pt-hand-grip.test.cjs` e `bash scripts/check-calendar-release.sh`.

## Interfaccia e duplicazione (16 settembre 2026)

Gli stili PT compatti sono isolati nell'ultima sezione di `src/editor.css`. I parametri Serie, Ripetizioni, RIR/RPE e Recupero usano colonne controllate (84/104/104/120 px), mentre esercizio e note occupano la larghezza della card. Le container query adattano le card anche quando sono annidate in un gruppo.

La sezione Duplica nel portale richiama la duplicazione già esistente del programma completo e `duplicateDaySnapshot` per la copia di un allenamento. Quest'ultima conserva tutte le prescrizioni, le settimane attive, i gruppi e la preparazione; genera nuovi identificativi e lascia carichi e note delle sedute sulla scheda originale.

`test-browser.cjs` verifica i comandi in Chrome con cliente e API interamente simulati (nessuna scrittura esterna). Eseguire `node test-browser.cjs` dopo il build, con Playwright disponibile; `PLAYWRIGHT_MODULE` può indicare il percorso del modulo installato, `CHROME_PATH` un eseguibile Chrome e `PT_UI_OUTPUT` la cartella temporanea per gli screenshot. Include desktop, tablet 768 px e telefoni 390/320 px, autosalvataggio, duplicazione, riapertura e autorizzazione in sola lettura.

## Archivio generale (17 settembre 2026)

`app/portale-personal-trainer/js/program-templates.js` gestisce l'archivio comune a tutti i PT, distinto dallo storico dei programmi mensili del cliente. Salva il programma aperto come modello dopo la sincronizzazione della bozza; il riutilizzo crea un programma indipendente e nuovi identificativi. Nomi, note interne, carichi, date e feedback del cliente non sono inclusi. Le note tecniche degli esercizi sono condivise: il salvataggio richiede la conferma che non contengano informazioni personali.

`netlify/functions/lib/pt-templates.js` applica un'allowlist allo snapshot, controlla i retry per ID e permette il ritiro soltanto all'autore o alla Direzione. `pt-data` verifica anche la proprietà della scheda sorgente. Il ritiro non cancella la riga né le copie già assegnate. Tabella server-only: `pt_program_templates`, migrazione `20260916140424_pt_shared_program_templates.sql`.

Verifiche aggiuntive: `node --test tests/pt-templates.test.cjs` e `node tests/pt-templates-postgres.test.cjs` (con `EMBEDDED_POSTGRES_MODULE` verso il file `dist/index.js` di embedded-postgres). La prova browser include retry dopo risposta persa, ricerca, anteprima, riutilizzo su un altro cliente, originali invariati e ritiro senza perdita delle copie. Il RIR programmato senza data o altri dati effettivi non genera righe di seduta.
