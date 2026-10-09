# Portale PT — Spostamento programmi e creazione pulita

Pubblicato il 7 ottobre 2026: `6ac6080390999e7b9ec0ff32`.
Baseline: `6ac6045e0b42da68c22cadd4`.
Branch: `feature/whatsapp-agenda-pt-v1`.

## Comportamento

- Ogni programma gestibile offre **Sposta in…**, con tutte le cartelle e
  sottocartelle, e **Togli dalla cartella**, con destinazione Archivio generale.
- Checkbox sui programmi, selezione dei visibili e **Sposta selezionati**
  consentono spostamenti multipli. **Mostra programmi di tutte le cartelle**
  permette di selezionare programmi provenienti da cartelle diverse.
- Lo spostamento aggiorna solo cartella e identificativo della richiesta:
  nome, descrizione, contenuto e copie cliente non vengono riscritti. Restano
  gli stessi permessi: autore del modello o Direzione.
- Ogni spostamento controlla la versione e supporta retry. Nei trasferimenti
  multipli un errore lascia visibili quantità completata e programmi rimanenti;
  riprovare non ripete quelli già confermati. Nessuna promessa di atomicità del
  gruppo: ogni programma ha una propria transazione.
- **Crea programma** dalla navigazione apre una nuova creazione. Obiettivo e
  note interne partono vuoti, anche copiando la struttura da una scheda cliente;
  cambiare cliente non importa informazioni personali né sovrascrive i campi.
- Le bozze cliente non importano più obiettivo e note operative dall'anagrafica.
  I programmi già salvati conservano i propri dati.
- La destinazione archivio apre una bozza modificabile e funziona anche senza
  cliente assegnato. I nuovi programmi vuoti possono quindi essere completati
  nell'editor prima del salvataggio, senza tentare una creazione server prematura.
- Nell'editor archivio è disponibile **Note interne studio**, campo esplicito del
  modello (`settings.studioNotes`), distinto dalle note personali del cliente.
  L'adapter e il server continuano a escludere `generalNotes` dai modelli.
- Preparazione al movimento e serie di avvicinamento non compaiono nell'editor
  durante la creazione/modifica. I valori storici già salvati non vengono
  cancellati e restano consultabili nella visualizzazione delle vecchie schede.

## File principali

- `app/portale-personal-trainer/index.html`
- `app/portale-personal-trainer/js/program-templates.js` e `.css`
- `app/portale-personal-trainer/js/program-workflow.js`
- `tools/coaching-editor/src/adapter.ts`
- `tools/coaching-editor/src/vendor/components/program-editor.ts`
- Bundle rigenerato `app/portale-personal-trainer/js/coaching-editor.js`
- `netlify/functions/pt-data.js` e `lib/pt-templates.js`
- Test `pt-library.test.cjs`, `pt-clean-creation.test.cjs`,
  `pt-archive-movement-browser.cjs`, `pt-client-visibility.test.cjs`.

## Verifiche e rilascio

21 test Node superati, suite adapter e persistenza programmi superate, build
editor riuscita, sintassi JS/script inline e `git diff --check` superati.
Collaudo Chrome mobile a 390 px con API reale collegata esclusivamente a dati
sintetici: cartelle annidate, ritorno alla radice, movimento multiplo con errore
parziale/retry, contenuto immutato, obiettivo e note vuoti o compilati a mano,
salvataggio/riapertura, assenza di dati cliente e creazione senza clienti.
Query Supabase esclusivamente in lettura per verificare i campi esistenti.

Cinque asset aggiornati e sola funzione `pt-data`; altre 19 funzioni identiche
per hash e configurazione, pianificazioni conservate. Hash e API anonima 401
verificati su anteprima e dominio principale. Blocco deploy automatici mantenuto.
Nessuna migrazione, operazione sui programmi reali o modifica degli altri siti.
Ricaricare il Portale per usare la nuova interfaccia; nessun passaggio esterno.

Stato Git finale: `index.html` modificato; script, sorgenti editor, API, test e
nota release non tracciati nel branch corrente. Lavorazioni preesistenti
preservate; nessun commit, reset, nuovo task o worktree.
