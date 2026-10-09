# Portale PT — Verifica dei salvataggi, 8 ottobre 2026

Branch: `feature/whatsapp-agenda-pt-v1`.

La nota visibile nella foto di Giuliano Secchi non era presente nella scheda
salvata. Il controllo ha riprodotto correttamente il salvataggio ordinario delle
note, ma non ha dimostrato la causa storica della nota mancante. Nessuna modifica
ai dati dei clienti reali e nessuna migrazione.

## Correzioni

- Il valore visibile delle note della seduta viene acquisito anche prima del
  salvataggio, del cambio scheda e della chiusura. Il campo è vincolato allo
  stesso cliente, stato e oggetto della seduta: non trasferisce note dopo una
  rimozione o un riordino delle settimane.
- Le richieste API hanno un limite di 15 secondi, anche per la lettura della
  risposta. La coda può riprovare invece di rimanere bloccata indefinitamente.
- La scheda viene considerata sincronizzata solo con una riga server contenente
  identità, versione e identificativo della richiesta corretti. Una risposta
  vuota o incoerente conserva la bozza da sincronizzare.
- Messaggio di sincronizzazione visibile accanto al pulsante della seduta;
  le modifiche nuove durante un salvataggio non ricevono una falsa conferma.
- Alla riconnessione viene anticipato il tentativo di sincronizzazione.

## Verifiche

29 test Node superati, inclusa la suite API di persistenza, sui file:
`pt-save-queue`, `pt-workout-sessions`, `pt-usage-safety`,
`pt-program-persistence`, `pt-session-records-api`,
`pt-shared-session-prefill`, `pt-workout-handoff`, `pt-clean-creation`,
`pt-templates` (nella cartella `tests`, estensione `.test.cjs`).

`node tools/coaching-editor/test.mjs`: superati i confronti di prescrizioni,
archivio, copie, progressioni e conservazione dei dati effettivi.

Browser Chrome, viewport 390×844, portale completo e handler autenticato con
fixture locale e soli dati sintetici:

- `tests/pt-save-roundtrip-browser.cjs`: note generali, note seduta e serie,
  carichi, ripetizioni, RIR zero, date, completamento; riapertura senza cache;
  valore visibile prima dell'evento input; risposta lenta con due invii totali
  per modifiche accorpate; risposta persa e retry senza duplicati; offline e
  riconnessione; cancellazioni intenzionali; conflitto e cambio cliente bloccato.
- `tests/pt-workout-handoff-browser.cjs`: sedute condivise, carichi precedenti,
  errore rete, retry e separazione dalla struttura del programma.
- Controllo visivo della conferma mobile, sintassi degli script inline e
  `git diff --check` superati.

Non sono prove su iPhone fisico o con credenziali reali dei PT. La simulazione
locale esercita il vero handler con un database fittizio, non scrive su Supabase.
La nota storica di Giuliano non è stata ricostruita automaticamente.

## Rilascio

Baseline: `6ac660de602809285f4704e0`.
Nuova release: `6ac7c8428753bec9f9c26001`.
Unico asset aggiornato: `/index.html`. Tutti gli altri 52 asset e le 20 funzioni,
configurazioni e pianificazioni sono preservati tramite confronto dei manifest.
Anteprima verificata `ready`, hash HTML uguale al file locale.

Pubblicazione confermata e hash verificato anche sull'URL pubblico; blocco delle
pubblicazioni automatiche mantenuto (`locked: true`). Stato Git: branch invariato,
file modificati e non tracciati preesistenti preservati; nessun commit creato.
File toccati da questo intervento: HTML del Portale, tre suite esistenti
(`pt-save-queue`, `pt-usage-safety`, `pt-workout-sessions`), nuova suite browser e
questo resoconto. Nessun passaggio esterno necessario per attivare la correzione.
