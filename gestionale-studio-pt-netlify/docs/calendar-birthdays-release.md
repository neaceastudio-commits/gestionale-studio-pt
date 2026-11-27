# Compleanni nel Calendario e in Apple

La release parte dal commit di produzione Calendario `8271c8a62087f6ef6fce4713d029c81b2943f73a`, non da `main`, che contiene una linea diversa. Destinazione: sito Netlify `28855faa-de52-4e4c-b1c2-e2db4965670f` (calendario.neacea.com).

## Comportamento

- Fascia compleanni in Dashboard, Giorno e Settimana, anche senza sedute.
- Clienti attivi: data esplicita nell'anagrafica, altrimenti acquisizione con email univoca o nome completo univoco. Date discordanti, impossibili o future non vengono indovinate. Le acquisizioni restano la fonte aggiornata, senza copie di massa nel database.
- Staff attivo: campo facoltativo Data di nascita nella modifica professionista; salvataggio confermato dal server prima di mostrare successo.
- Endpoint protetto dalla sessione esistente. Un PT riceve solo i clienti nel proprio perimetro e il proprio compleanno. La risposta compleanni contiene giorno e mese, senza anno di nascita, email o dati sanitari.
- Evento Apple annuale di tutta la giornata, trasparente alla disponibilità, senza allarmi aggiunti. Per il 29 febbraio: ultimo giorno di febbraio anche negli anni non bisestili, coerente tra app e RRULE.
- UID stabile per persona. Il worker aggiorna lo stesso evento e ritira solo i propri eventi quando la persona diventa inattiva o non ha più una data valida. ETag, marker, lease e checkpoint proteggono retry e concorrenza. Non scrive sedute, contatori, compensi o messaggi.
- Il feed Apple esistente include i compleanni. Per il calendario iCloud operativo viene aggiunto un worker distinto sul sito Calendario; il vecchio servizio CalDAV delle sedute non viene ridistribuito né modificato.

## Attivazione (non eseguita)

1. Eseguire i controlli della release, compresa la verifica UI nel browser autorizzato. `scripts/check-calendar-release.sh` è il controllo globale obbligatorio. I test specifici sono in `tests/calendar-birthdays.test.cjs`; la build testata include entrambi i nuovi entrypoint.
2. Riconciliare la policy storica `CALENDAR_RELEASE_POLICY.md` (main) con la release attualmente pubblicata `release/calendar-studio-access-20261125`. Pubblicare solo via Git, mantenendo intatte le altre release e funzioni. Entrambi i deploy osservati Calendario e CalDAV risultano bloccati alla pubblicazione automatica.
3. Applicare la migrazione additiva `20261127080000_calendar_birthdays.sql` al progetto `cdywqyqqmjhgkzwrrixc` prima di pubblicare codice che seleziona `nascita`. Non cambia grant, RLS o dati esistenti. Verificare che il gateway audit attuale persista il nuovo campo tramite il percorso operatore esistente.
4. Configurare sul solo sito Calendario, ambito Functions/production, `APPLE_BIRTHDAYS_URL`, `APPLE_BIRTHDAYS_USER`, `APPLE_BIRTHDAYS_PASSWORD` dagli omologhi valori `APPLE_CALDAV_*` già autorizzati sul servizio `305b1dd7-9d1e-4e96-87ef-5619de0f5130`. Non stampare o salvare segreti nel repository. Generare `BIRTHDAYS_WORKER_SECRET` casuale; impostare `APPLE_BIRTHDAYS_ENABLED=true`. Restano necessari `SUPABASE_SERVICE_ROLE_KEY` e le credenziali Blobs native. Verificare il limite totale delle env Functions.
5. Pubblicare il commit verificato via Git dal ramo di produzione riconciliato. Il plugin Netlify disponibile in questa sessione non espone deploy/sblocco; non è stata trovata una CLI autenticata o una connessione Safari controllabile. Non sostituire il browser scelto dall'utente.
6. Verificare asset e funzioni online, GET anonimo rifiutato dall'endpoint privato, salvataggio/rilettura di una data di test in ambiente isolato, filtro PT e feed. Eseguire il worker con autorizzazione server o attendere il minuto 17 dell'ora; controllare `calendar-birthdays-v1/last-run` e rileggere gli eventi reali Apple. Ripetere senza variazioni: zero nuovi PUT e nessun duplicato. Controllare una modifica e rimozione in test.

La pianificazione è oraria, anche ad app chiusa; la UI aggiorna i compleanni ogni cinque minuti durante i refresh. Non dichiarare l'integrazione attiva prima della migrazione, della configurazione e della verifica reale Apple.

## Verifica eseguita il 27 novembre 2026

Test specifici: 10/10 (incluse migrazione su PostgreSQL PGlite e simulazione dei salvataggi Apple). Superate anche le suite feed Apple, refresh, lettura completa, perimetro privato/paginazione e packaging delle funzioni.

Il controllo globale `check-calendar-release.sh` ha superato il primo gruppo di 26 test e il secondo di 31, più i controlli sintattici. Si è fermato al primo test browser: un wrapper locale ha impedito l'avvio di un browser alternativo a quello autorizzato. Non è un controllo globale superato; le verifiche UI e quelle successive restano da completare. Una suite aggiuntiva preesistente `operator-availability-sync.test.cjs` non completa il setup del mock (`window.addEventListener` assente); il file applicativo audit coinvolto non è stato modificato da questa release.

Nessuna migrazione, variabile di produzione, appuntamento o evento Apple è stato modificato durante questa preparazione. Il push Git CLI non dispone di autenticazione; la consegna del codice usa il connettore GitHub.
