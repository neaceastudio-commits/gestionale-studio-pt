# Portale PT e Calendario — condivisione decisa dal proprietario

Stato: implementato e collaudato localmente il 28 settembre 2026. Non pubblicato;
la nuova migrazione non è stata applicata. Nessun dato reale è stato modificato.
Branch: `feature/whatsapp-agenda-pt-v1`.

## Flusso

Nel Calendario, Quadro pacchetto → **Condividi cliente con PT** (solo proprietario).
Il PT referente è già abilitato. Per ciascun altro PT il proprietario può abilitare
oppure revocare la condivisione. I cambi sono registrati nel Registro attività.
Non vengono create condivisioni iniziali né dedotte dalle vecchie sedute.

Il Portale restituisce solo clienti del referente e clienti esplicitamente condivisi.
La registrazione carichi/ripetizioni/note richiede sia accesso al cliente sia
assegnazione della specifica seduta al PT. Il programma resta modificabile dal
referente. La revoca blocca i salvataggi anche con sessione già aperta; l'elenco si
riallinea al successivo caricamento del Portale. I dati storici non vengono cancellati.
Lo storico riepilogativo del Registro sedute è visibile solo all'owner
`nutrizione.gianlucapirisi@gmail.com`; gli altri PT recuperano solo i propri record
per compilare/correggere le proprie sedute.

## Regressioni corrette

- Eliminato il filtro che nascondeva programmi oltre 14 giorni, anche dall'archivio.
- Salva nell'Archivio spostato fuori dai dettagli chiusi dell'editor.
- Filtro PT della Direzione ripristinato; default sui propri clienti.
- Barra mobile nascosta durante la compilazione dei campi e nei dialoghi aperti.

## File principali

- `app/portale-personal-trainer/index.html`, `js/pt-mobile.css`, `js/session-log.js`.
- `netlify/functions/pt-data.js`, `lib/pt-client-sharing.js`, `lib/pt-session-log.js`.
- `app/calendario-studio/js/{app,calendar-audit,calendar-audit-view}.js`.
- `netlify/functions/lib/calendar-audit-endpoint.js`.
- `supabase/migrations/20260928105818_owner_controlled_pt_sharing.sql`.

La nuova tabella ha RLS e sola lettura service-role. Scrittura esclusivamente tramite
RPC autenticata lato server, vincolata al proprietario e con audit transazionale.
La funzione di salvataggio sedute ricontrolla il grant anche prima dei retry idempotenti;
revoca e scrittura usano il lock del cliente. Mancanza della tabella non autorizza
collaboratori. Le altre anomalie di lettura non sono silenziate.

## Verifiche

- 32 test Node su accessi, filtro clienti, archiviazione, persistenza, conflitti,
  template, Hand Grip, condivisione, API e autenticazione Calendario: passati.
- 2 test PGlite con transazioni reali: grant/revoca, ruoli, autore seduta, retry,
  concorrenza/versioni e rollback in caso di errore audit: passati.
- Test adapter ed esecuzione build dell'editor: passati.
- Sintassi JS e `git diff --check`: passati.
- UI sintetica: scheda di giugno visibile; salvataggio modello → cestino → ripristino
  → assegnazione a secondo cliente; carico salvato; a 390px barra nascosta con campo
  carico focalizzato. Nessun errore console.
- UI condivisione sintetica: referente riconosciuto, abilita/revoca funzionanti,
  nessun errore console. Nessun grant su clienti reali.

## Pubblicazione ancora necessaria

Serve autorizzazione specifica per applicare la migrazione e pubblicare le modifiche
coordinate del Calendario e Portale PT: l'AGENTS.md del repository esclude migrazioni,
cambi permessi e altri siti dall'autorizzazione automatica del solo Portale PT.
Usare manifest di deploy correnti e pubblicazione isolata dei file/funzioni elencati;
non pubblicare indiscriminatamente le numerose lavorazioni preesistenti nel repository.
Verificare dipendenze e baseline online prima di applicare il rilascio, poi API e asset.
Nessuna modifica a residui, pacchetti, dati clinici o calendari Apple prevista.
Stato Git: modifiche locali e file non tracciati presenti; nessun commit eseguito.
