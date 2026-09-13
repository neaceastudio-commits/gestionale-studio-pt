# Gianluca — CalDAV operativo

Servizio isolato `neacea-caldav-gianluca.netlify.app`; unico calendario autorizzato:
`NEACEA — Operativo`, account iCloud di Gianluca. Non distribuisce il Calendario
Studio, Acquisizione, feed ICS o funzioni dei PT.

Il worker cloud replica i tre flussi del worker Python TEST e gira ogni minuto.
Mapping, baseline e lease sono persistenti in Netlify Blobs con letture forti e
scritture condizionali. Gli href sono derivati dagli ID; un marcatore casuale
identifica gli eventi creati dal servizio, anche dopo un'interruzione durante la
creazione. Nessun evento Apple sconosciuto viene importato o riconosciuto per nome.

`APPLE_CALDAV_START_AT` è un confine di attivazione immutabile: vengono esportati
solo nuovi appuntamenti prenotati creati in NEACEA dopo quel momento, con data non
precedente all'attivazione. Non arretrare questo valore per trasferire lo storico.
Gli eventi già esistenti non vengono adottati. Il trasferimento storico resta
manuale. UID, titolo professionale, progresso da residuo salvato e filtri privacy
riusano il formatter approvato del feed. Il contenuto descrittivo è una fotografia
alla creazione: questa V1 sincronizza in seguito soltanto data, ora, durata e
annullamento, non titoli o contatori descrittivi.

Apple non può cambiare clienti, PT, servizio, pacchetto, residui, Fatto o no-show.
Entrambi questi stati bloccano la singola coppia. Modifiche concorrenti divergenti
vengono rifiutate; nessuna correzione automatica del residuo. I salvataggi usano
l'RPC audit esistente, snapshot atteso e identità Direzione ricontrollata nel DB.
L'origine audit resta `calendar`, già supportata dal database; non sono aggiunte
migrazioni. Un'operazione pianificata viene eseguita per delega esplicita di
Gianluca (`staff_1`), non come un utente browser fornito liberamente.

Lease globale di 120 secondi, budget di lavoro 23 secondi, timeout HTTP CalDAV
12 secondi, ETag su Apple e CAS sulle baseline. I batch ruotano per non affamare
le coppie successive. La periodicità è di un minuto, non una promessa di modifica
istantanea; batch estesi, errori o conflitti possono ritardare una coppia.
`last-run` conserva conteggi e timestamp, senza credenziali o note sensibili.

## Env (solo Functions)

- `APPLE_CALDAV_SYNC_ENABLED`: kill switch, inizialmente `false`.
- `APPLE_CALDAV_SITE_ID`: ID del solo sito personale.
- `APPLE_CALDAV_ACTOR_ID`: `staff_1`.
- `APPLE_CALDAV_USER`, `APPLE_CALDAV_PASSWORD`: solo env segrete.
- `APPLE_CALDAV_URL`: esatta collection iCloud dedicata, HTTPS.
- `APPLE_CALDAV_START_AT`: timestamp UTC impostato alla prima attivazione.
- `SUPABASE_SERVICE_ROLE_KEY` e `PT_ACCESS_SECRET`: env segrete del servizio.

Il cron non espone un endpoint pubblico invocabile. L'endpoint amministrativo
accetta solo sessione firmata Direzione di Gianluca: `status`, `run`, `provision`
(sempre soggetto al confine temporale), e pulizia di mapping esclusivamente TEST.
Chiavi e password non entrano nel repository, nel pubblico statico o nei log.

## Verifica

`EMBEDDED_POSTGRES_MODULE=… node tests/apple-caldav-production.test.cjs` dalla
radice dell'app verifica i tre casi con PostgreSQL effettivo locale, stato
persistente simulato e CalDAV simulato, più isolamento, audit, privacy, blocchi
Fatto/no-show, conflitti, ETag, DST e assenza di backfill/ricorrenze.

Deploy manuale dal contenuto committato, solo questa directory Functions e
`public`; nessun collegamento Git/build automatico ad altri siti. Per arrestare il
servizio impostare `APPLE_CALDAV_SYNC_ENABLED=false` e ridistribuire lo stesso
commit, poi verificare lo stato autenticato. Conservare i mapping durante pause
e deploy: cancellarli può perdere il collegamento operativo.

## Collegamento manuale dalla Direzione

Il pulsante ` Porta su NEACEA — Operativo` nel dettaglio PT usa esclusivamente
`appointment_id`. L'endpoint same-origin del Calendario verifica la sessione e
inoltra solo ID, operazione e token all'endpoint ristretto del servizio CalDAV.
Quest'ultimo verifica firma con `APPLE_CALDAV_CALENDAR_SECRET` (secret della
sessione Calendario, solo env Functions), identità corrente e ruolo di Gianluca.
Non espone le operazioni amministrative del worker.

`linkStatus` legge il mapping; `link` usa lease, UID, href, marcatore e store
esistenti. La sola scelta esplicita del singolo ID consente di collegare una
seduta creata prima dell'attivazione, purché PT, futura e non annullata. Nessun
elenco o import storico è accettato. Un mapping già collegato restituisce
successo senza PUT; un pending manuale conserva la provenienza per il recupero
dopo interruzione. Fatto/no-show restano protetti dalla sync. Nessuna scrittura
al DB per collegare un evento e nessun accesso ad altre collection iCloud.
