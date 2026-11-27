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

## Stato del rilascio — 27 novembre 2026

- Migrazione additiva applicata a `cdywqyqqmjhgkzwrrixc`: colonne `clients.nascita` e `operators.nascita` di tipo date; entrambi i vincoli validati. Nessuna modifica di date esistenti, grant o RLS. Un primo tentativo ha incontrato un deadlock senza modifiche; la versione applicata acquisisce entrambi i lock con timeout 750 ms.
- Netlify Calendario allineato a `release/calendar-birthdays-20261127`, discendente della release live `8271c8a`. La protezione che consente soltanto deploy Git è rimasta attiva. La prima build `6b09add573da39aa596a24ce` è riuscita, con asset identici al commit e accesso anonimo all'endpoint privato rifiutato (POST HTTP 401). Il commit successivo corregge solo l'ordine del parametro cache per mantenere riconoscibile la revisione del protocollo.
- `scripts/check-calendar-release.sh` eseguito integralmente con esito zero e messaggio finale «OK: pacchetto Calendario completo e verificato». Comprende test funzionali, browser desktop/mobile isolati, concorrenza SQL, Apple, cicli/rinnovi, storico, doppio PT e filtro firmato. I test browser usano dati simulati e database locali, senza scrivere dati reali.
- Test compleanni 10/10 e perimetro/paginazione privati 7/7. Il database PostgreSQL locale dei test usa solo TCP loopback, evitando la creazione di socket Unix non consentita nell'ambiente. Installati nell'ambiente di prova Chromium Playwright e libicu60; non sono dipendenze di produzione.

## Collegamento Apple ancora da attivare

Il feed Apple include i compleanni con questa release. Il worker diretto per iCloud rimane DISATTIVATO: non è ancora stato verificato su eventi reali Apple.

Sul solo sito Calendario, Functions/production, sono stati preparati `APPLE_BIRTHDAYS_URL`, `APPLE_BIRTHDAYS_USER`, una chiave casuale segreta `BIRTHDAYS_WORKER_SECRET` e `APPLE_BIRTHDAYS_ENABLED=false`. `APPLE_BIRTHDAYS_PASSWORD` è vuota: Netlify non permette di recuperare la password segreta già salvata sul vecchio servizio CalDAV. Occorre inserirla direttamente nel pannello protetto. Non pubblicare credenziali nel repository o nei log.

Dopo l'inserimento: verificare account e destinazione `NEACEA — Operativo`, attivare il flag, ricostruire via Git, verificare l'esatto deploy, eseguire il worker autorizzato e controllare `calendar-birthdays-v1/last-run` e gli eventi Apple effettivi. Ripetere senza variazioni per controllare zero duplicati. Il worker è orario (minuto 17); l'app aggiorna i compleanni ogni cinque minuti.

Il servizio CalDAV delle sedute non è stato modificato o ridistribuito. Nessun appuntamento, contatore, compenso, messaggio o evento Apple è stato modificato durante questi test. La pubblicazione dell'app e l'attivazione iCloud sono verifiche distinte: non dichiarare iCloud attivo prima del controllo reale.
