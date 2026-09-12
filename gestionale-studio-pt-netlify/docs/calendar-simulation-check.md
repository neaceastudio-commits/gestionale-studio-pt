# PR #8 — verifiche pre-rilascio del 12 settembre 2026

Branch: `feature/apple-calendar-import-step1`. Nessun merge, deploy o accesso in scrittura al Supabase dello Studio. Questo resoconto sostituisce quello della prima prova del commit 3363497.

## Esito

| Area | Correzione | Verifica |
| --- | --- | --- |
| Disponibilità PT | Ruolo compatibile, operatore attivo, orari dichiarati in `operator_availability`, copertura dell'intera seduta e orario Studio 07–21. Disponibilità assente: nessuna prenotazione automatica. | Fasce adiacenti, buchi tra fasce, PT inattivo/non abilitato, sovrapposizione e blocchi agenda. |
| Capienza sala | Conteggio dei partecipanti attivi effettivi per PT 1:2/Circuit e massimo contemporaneo, senza sommare due gruppi in intervalli disgiunti. | Sala da 6 persone, gruppi parziali, clienti inattivi e annullati. Stessa regola nel Calendario e nel pianificatore. |
| Concorrenza pianificazione | Snapshot coerente del database e controllo della sua revisione sotto lock prima dell'inserimento atomico dell'intero pacchetto. Una modifica a clienti, appuntamenti, operatori o disponibilità invalida il piano. | Due connessioni PostgreSQL concorrenti, chiamate concorrenti al vero handler, scrittura esterna equivalente a REST, cambiamento disponibilità, rollback del batch. Esattamente 8 sedute; ripetizione: 0 aggiunte. |
| Recupero attivazione | Intenzione salvata localmente prima dell'attivazione; riconciliazione del cliente e pulsante “Completa le sedute” per riprendere anche dopo ricarica. Non ripete l'attivazione se il cliente è già presente. | Browser Chrome: errore prima del commit e risposta persa dopo il commit, ricarica e ripresa. Un cliente e 8 sedute, senza duplicati. |
| Stato Fatto | Appuntamento e variazione del residuo in una transazione. Controllo della versione precedente, retry idempotente, aggiornamento locale solo dopo conferma valida. | Codice reale `App` → `SupabaseSync` → adattatore REST locale → PostgreSQL → nuova sessione e rilettura. Fatto 8→7; doppio invio resta 7; no-show/annullamento ripristinano 8. |

I comandi rapidi, la modale e la riga del quadro pacchetto usano il salvataggio atomico. Il test della creazione dalla modale copre anche la perdita della risposta: l'ID della bozza resta uguale e il retry non crea un secondo appuntamento.

Un errore nella scrittura del residuo o dell'appuntamento annulla tutta la transazione. Risposta vuota/non valida, errore di connessione e risposta persa non producono un falso messaggio di successo. I cicli precedenti e i servizi non PT non consumano sedute del ciclo corrente. Il contatore salvato conserva le sedute già usate prima dell'importazione: il salvataggio applica soltanto la variazione effettiva della seduta.

## Prove eseguite

- `scripts/check-package-calendar.sh`: sintassi, regressioni di integrazione, pianificatore, ruoli, disponibilità, capienza e protocollo del server.
- `tests/calendar-postgres.test.cjs`: migrazione SQL eseguita su PostgreSQL 18.4 temporaneo, due connessioni indipendenti, conflitti, rollback, cicli, privilegi/RLS e vero handler del pianificatore. Nessun mock delle transazioni SQL.
- `tests/calendar-status-persistence.test.cjs`: comandi dell'applicazione e conversioni reali dei dati; soltanto il trasporto HTTP viene sostituito da query al database locale. La rilettura usa una nuova istanza dello stato del Calendario. Non assegna manualmente il residuo per simulare Fatto.
- `tests/acquisition-calendar-browser.cjs`: pagina reale di test nel browser, tutte le richieste intercettate; scenari normale, errore pre-commit, risposta persa post-commit. Il controllo storico delle metriche in questo test resta in memoria; la prova di persistenza completa è quella PostgreSQL separata.
- `scripts/check-calendar-release.sh`: regressioni del Calendario. Il controllo del workspace segnala le modifiche preesistenti non committate; il controllo del contenuto committato viene eseguito separatamente.

Esecuzione base:

```sh
bash scripts/check-package-calendar.sh
```

Per includere PostgreSQL locale impostare `CALENDAR_POSTGRES_TEST=1` e `EMBEDDED_POSTGRES_MODULE` al file `embedded-postgres/dist/index.js` di un'installazione locale della versione `18.4.0-beta.17`. Il test crea un cluster temporaneo su `127.0.0.1`, con soli dati fittizi, e lo arresta al termine.

Per il browser impostare `CALENDAR_BROWSER_TEST=1`, `PLAYWRIGHT_MODULE` al pacchetto Playwright disponibile e, se necessario, `CHROME_PATH`. Lo script esegue automaticamente i tre scenari. Screenshot configurabile con `CALENDAR_QA_SCREENSHOT` (default `/tmp/neacea-calendar-simulation.png`).

## Condizioni di rilascio ancora esterne

La persistenza è verificata end-to-end **sul database locale**, non sul Supabase online né sul suo PostgREST. Non è possibile certificare una scrittura remota reale senza eseguirla; il divieto dell'utente è stato rispettato.

È pronta, ma NON applicata, la migrazione `supabase/migrations/20260912151523_calendar_prerelease_atomic.sql`. Prima di un futuro rilascio occorrerà verificarne la compatibilità con lo schema e i privilegi effettivi dello Studio e applicarla con autorizzazione esplicita, prima di distribuire funzioni e interfaccia. In assenza delle RPC il nuovo codice segnala errore: non torna al vecchio inserimento non atomico.

Il pianificatore richiede `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` solo sul server, oltre al segreto delle sessioni già previsto. Le RPC di snapshot/commit sono riservate al ruolo server; il salvataggio dell'appuntamento usa `SECURITY INVOKER`, senza nuovi permessi sulle tabelle o modifiche alle policy RLS. Verificati anche rifiuto degli accessi anonimi al pianificatore e rollback quando RLS impedisce l'aggiornamento del cliente.

I lock serializzano le pianificazioni e impediscono che scritture concorrenti cambino i dati tra verifica e commit. Non aggiungono vincoli globali di prenotazione ai percorsi legacy che continuano a scrivere direttamente in `appointments` dopo la transazione: questi restano soggetti alle proprie validazioni. La migrazione usa lock brevi a livello tabella (timeout 5 secondi), adeguati al volume dello Studio ma da rivalutare se il traffico cresce.

La ripresa dell'attivazione è conservata nel browser e legata all'operatore: non è una coda condivisa tra dispositivi. La cancellazione dello storage locale elimina la richiesta pendente, non i dati già salvati. Il residuo/numero di sedute viene comunque riletto dal server a ogni tentativo.

Netlify non è stato modificato. La PR resta Draft; nessun push o pubblicazione è incluso in questa fase di verifica.


## Chiusura concorrenza dei salvataggi distinti

La stessa migrazione non ancora applicata ora riesegue in `calendar_save_appointment` i controlli PT, tutti i clienti e capienza, dopo il lock e prima di qualsiasi aggiornamento di appuntamento/residuo. Due salvataggi con ID distinti non possono superare insieme la validazione. Il perdente riceve SQLSTATE `23P01`, senza dati personali nel messaggio. La regola vale anche per spostamenti, cambi partecipanti e riattivazioni; una ripetizione identica già salvata resta una risposta idempotente senza scritture.

La capienza SQL riproduce la configurazione attuale: PT 6, Nutrizione 1, Visbody 1; Baiobit e blocchi senza carico sala. Conta i partecipanti attivi dei gruppi e il picco contemporaneo, ignora annullati/appuntamenti senza partecipanti attivi, mantiene i blocchi operatore e consente sedute adiacenti senza buffer. La mappa SQL va aggiornata insieme a `config.js` se cambiano servizi o capienze. Il precedente override JavaScript PT 1:1 non permette di aggirare il controllo SQL.

`tests/calendar-save-concurrency.test.cjs` usa due connessioni PostgreSQL e verifica l'attesa reale in `pg_locks`. Per ciascuno dei tre conflitti prova sia inserimento sia modifica: il primo salvataggio resta aperto, il secondo attende e, dopo il commit, viene rifiutato. Il confronto integrale di appuntamenti e clienti, timestamp inclusi, dimostra che il perdente non cambia nulla. I candidati usano Fatto per verificare anche l'assenza di consumi parziali. Coperti inoltre confini adiacenti, capienza esatta 6 su intervalli disgiunti, annullamento/riattivazione e blocchi.

Il controllo richiede READ COMMITTED, per rileggere dopo l'attesa del lock; altre modalità sono rifiutate. Non usa SECURITY DEFINER e non modifica privilegi o RLS. Se RLS è attiva, accetta soltanto una policy SELECT permissiva applicabile con `USING (true)` e nessuna policy SELECT restrittiva applicabile: senza questa prova di visibilità completa rifiuta il salvataggio, perché potrebbero esistere conflitti nascosti. Anche policy logicamente equivalenti ma non riconoscibili come `true` vengono rifiutate prudentemente. Testate visibilità completa, filtrata e restrittiva. La compatibilità delle policy reali resta una condizione prima del rilascio; non disabilitare RLS per aggirare il controllo.

Rieseguiti con successo suite base, nuovo test concorrente, suite PostgreSQL preesistente e persistenza UI→PostgreSQL. Le scritture legacy dirette restano fuori da questa RPC: la correzione garantisce i salvataggi atomici qui verificati, non aggiunge un trigger globale. Nessuna migrazione, merge o deploy eseguito.
