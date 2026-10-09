# Portale PT — allenamenti condivisi per appuntamento

Pubblicato il 28/09/2026 sul Portale PT: deploy corretto `6aba0079c13832a4459b9936`, locked. Branch locale `feature/whatsapp-agenda-pt-v1` invariato, nessun commit in questa sessione.

## Accesso corretto — 28 settembre 2026

Il Registro sedute è operativo per tutti i PT autenticati e abilitati al Portale. Il cliente entra nell'elenco anche tramite una singola seduta assegnata al PT, indipendentemente dal referente. Ogni PT può scrivere soltanto sulle sedute assegnate a lui; la RPC ricontrolla l'assegnazione corrente ad ogni salvataggio. Lo storico del cliente è consultabile; il programma generale resta modificabile dal referente.

Il Registro attività rimane riservato alla Direzione: gli altri PT non possono leggerlo. Rimossa la limitazione erronea del Registro sedute al solo account Gianluca introdotta nel deploy `6ab9fd18e5118b21cc6c6910`.

La correzione aggiorna solo il modulo server `lib/pt-session-log.js` nella funzione `pt-data`; nessuna nuova migrazione né modifica dei dati cliente. Test API su PT collaboratore, identità autenticata e protezione del programma superati. Test PostgreSQL su riassegnazione, revoca al vecchio PT, nuova registrazione del nuovo PT, retry, concorrenza e audit atomico superati. Test del Registro attività: lettura PT negata.

Migrazione `20260928050451_pt_session_records_audit.sql` già applicata; `client_ids` JSONB. Flag attivo. Verifica online: asset/funzioni non coinvolti invariati e API senza sessione rifiutata. Login reale non simulato perché le chiavi Netlify sono mascherate.

## Comportamento

La Direzione assegna il PT alla singola seduta del Calendario. Il bootstrap autenticato del Portale include anche i clienti di appuntamenti Personal 1:1/1:2 assegnati al PT (prenotati o fatti). Quei clienti sono selezionabili anche se hanno un referente diverso. Il programma generale rimane in sola lettura per il collaboratore.

In Clienti compare “Registro sedute — carichi e ripetizioni”. Il PT seleziona una propria seduta e un programma del cliente, poi inserisce una riga per serie: esercizio, carico, ripetizioni, RIR, note. Il salvataggio è esplicito. Bozze in memoria separate per cliente, appuntamento e autore; errori di rete non le cancellano. Le registrazioni sono consultabili nello storico condiviso. Le registrazioni legacy del programma rimangono consultabili negli strumenti già esistenti: non vengono riscritte o fuse.

Ogni autore ha un record distinto per appuntamento/cliente. Un cambio PT non trasferisce la proprietà delle registrazioni già scritte. Il nuovo PT crea la propria registrazione; il vecchio non può più salvare sull'appuntamento. Sedute future, annullate e no-show non sono registrabili. Per le sedute 1:2 ogni cliente mantiene dati distinti.

## Persistenza e registro

`pt_session_records` conserva data/ora della seduta e nome autore oltre a programma, dati, versione e request ID. La RPC `pt_save_session_record`, invocabile soltanto dal server, ricontrolla operatore attivo e accesso al Portale, blocca la riga appuntamento, verifica PT/partecipante/programmazione e applica concorrenza ottimistica. Le richieste ripetute con lo stesso contenuto non creano doppioni.

La stessa transazione inserisce nel `calendar_audit_log` la voce `training_session_saved`: identità PT, cliente, appuntamento, programma, prima/dopo, timestamp e versione. Se l'audit fallisce anche il salvataggio viene annullato. Nel Calendario la voce è mostrata come “Registrati carichi e ripetizioni”; i dettagli tecnici contengono i valori completi. Questo vale per le nuove registrazioni operative: non estende retroattivamente il registro a tutte le vecchie operazioni del Portale.

## Procedura di rilascio (eseguita per il Portale)

1. Applicare la sola migrazione `20260928050451_pt_session_records_audit.sql` su Supabase Studio.
2. Pubblicare sul Portale solo `pt-data.js`, `lib/pt-session-log.js`, gli innesti necessari in `index.html` e `js/session-log.js`, preservando le release precedenti.
3. Impostare `PT_SESSION_LOG_ENABLED=true` nel servizio Portale; riaprire la sessione per aggiornare l'elenco.
4. Pubblicare sul Calendario le etichette in `calendar-audit.js`, `calendar-audit-view.js` e le rispettive versioni asset.
5. Smoke test con identità di prova: PT referente/collaboratore/estraneo, lettura storico, salvataggio e audit, cambio assegnazione. Non usare clienti reali come fixture.

Il flag è spento di default; prima dell'attivazione il bootstrap non consulta la nuova tabella e non allarga l'elenco clienti. Rollback: flag false e ripristino asset precedenti; conservare tabella e audit per non perdere registrazioni.

## Verifiche

- Test API: payload operativo, identità derivata dalla sessione firmata, accesso al cliente tramite appuntamento; modifica del programma altrui sempre rifiutata.
- Test PostgreSQL locale (PGlite): ruoli, record di autori diversi, appartenenza programma, annullamento, futuro, accesso disabilitato, versione obsoleta, retry, errore audit con rollback.
- Browser con dati fittizi: compilazione, salvataggio, errore di rete, retry con stesso ID, storico, isolamento cliente, blocco futuro, viewport mobile.
- Suite PT access/usage e persistenza programmi superate.
- Suite visibilità aggiornata: un collaboratore vede il cliente della propria seduta senza ricevere permessi sul programma; la creazione programmi resta disponibile solo se il PT ha almeno un cliente referente.
