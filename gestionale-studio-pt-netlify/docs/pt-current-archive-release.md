# Portale PT — Scheda attuale, storico e archivio

Pubblicato il 28/09/2026: `6aba67b618c1d94d65aadcdd`.
Branch: `feature/whatsapp-agenda-pt-v1`.

- La scheda attuale offre Salva in archivio: nome modificabile e destinazione
  Archivio generale oppure una cartella esistente. Viene creata una normale
  programmazione di archivio con esercizi, parametri e impostazioni; il
  programma cliente e il riferimento alla scheda attuale rimangono invariati.
- Autosave aggiorna la stessa scheda. Rimossi caricamento, ripristino e
  generazione delle revisioni automatiche. Le vecchie righe tecniche sono
  conservate nel database, senza interfaccia o funzione di ripristino.
- Assegnare una nuova programmazione mantiene quella precedente nello storico
  cliente. Ordinamento per periodo e data di assegnazione, non per ultima
  modifica; modificare una vecchia scheda non la rende automaticamente attuale.

File principali: `app/portale-personal-trainer/index.html`,
`app/portale-personal-trainer/js/program-templates.js`,
`netlify/functions/pt-data.js` e
`supabase/migrations/20260928130758_pt_current_state_without_revisions.sql`.

Migrazione applicata al progetto Supabase del gestionale: aggiornata solo
`pt_save_program`, conservando autorizzazioni, controllo concorrenza, lock,
retry e sincronizzazione atomica dei carichi. Verificato sul database che
non scriva revisioni e che resti eseguibile solo da service_role.
Advisory di sicurezza invariati rispetto alla verifica precedente.

Verifiche completate:

- 15 test Node su libreria, persistenza, coda salvataggi, utilizzo e sedute.
- Test PostgreSQL con PGlite: dodici salvataggi producono un solo programma e
  zero revisioni; sostituzione e storico, conflitti, atomicità dei carichi e
  permessi verificati.
- Test Chrome con dati fittizi: copia nella radice e in cartella, modifica
  nome, corrispondenza completa dei dati di programmazione, nessuna variazione
  della scheda cliente. Nessun test scrive sui clienti reali.
- Sintassi JavaScript e `git diff --check`.

Rilascio isolato dalla produzione precedente `6aba624ec21d23227a771c9f`:
aggiornati soltanto index.html, program-templates.js e la funzione pt-data.
Tutti gli altri asset e le altre 18 funzioni sono rimasti identici; verificati
anche memoria, regione e pianificazioni. Controllati gli hash dei due asset
sul dominio pubblico; blocco dei deploy automatici mantenuto.

Stato Git: branch invariato, modifiche locali e file non tracciati preesistenti
preservati; nessun commit o reset. Nessun passaggio esterno ancora necessario.
