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

## Apple iCloud attivo — verifica reale del 27 novembre 2026

La password specifica Apple è stata inserita dall'utente direttamente su Netlify. Tutte le variabili APPLE_BIRTHDAYS_* sono configurate soltanto per Functions/production; APPLE_BIRTHDAYS_ENABLED=true. Nessun segreto nel repository o nei log.

Il primo avvio ha individuato un difetto di packaging Netlify v2: fast-xml-parser mancava nell'artefatto, anche se la compilazione esbuild passava. Corretto con included_files limitato alla funzione birthdays-sync-background, includendo package.json e il bundle CJS della libreria. Il test calendar-birthday-package.test.cjs usa il packager Netlify reale e carica l'artefatto in un processo isolato, senza dipendere dai node_modules della sorgente. Passati packaging reale, 10 test compleanni e packaging generale; dopo l'aggiunta del log di soli conteggi ripetuti e superati packaging reale e 10 test compleanni.

Produzione verificata: commit 3a683db96e46ce3ef0c831ae05b9016c273ce92a, deploy 6b09bf0be72a8be6bd8eb0fa, pubblicato e bloccato. Alle 18:36:07 Europe/Rome il worker ha riletto gli eventi reali iCloud nel calendario NEACEA — Operativo e registrato:

```json
{"checked":22,"created":0,"updated":0,"removed":0,"errors":0,"complete":true}
```

Questo controllo è successivo al primo trasferimento: conferma 22 risorse proprie già presenti, con UID e marker validi, e nessun duplicato o ulteriore PUT/DELETE al riesame. Nessuna modifica a sedute, pacchetti, compensi o messaggi. Il vecchio servizio CalDAV delle sedute rimane invariato.

La sincronizzazione è oraria, al minuto 17, anche con app chiusa. L'app aggiorna i compleanni ogni cinque minuti. Le date staff possono essere inserite da Staff; le persone senza una data valida restano escluse. Il worker aggiorna e ritira esclusivamente le proprie risorse.

Per controlli successivi: Functions > birthdays-scheduled > Run now; leggere birthdays-sync-background per il riepilogo di soli conteggi. Stato persistente privato in calendar-birthdays-v1/last-run. Non sono stati introdotti endpoint pubblici di diagnostica o dati personali nei log.
