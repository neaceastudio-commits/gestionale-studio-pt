# Calendario — recuperi della coppia nel pacchetto corrente

Stato: **attivato e verificato online**, 29 ottobre 2026.
Preparazione iniziale: 28 ottobre 2026.
Applicazione: Gestionale Studio PT, Calendario Studio.
Branch: `feature/whatsapp-agenda-pt-v1`; HEAD iniziale `d242d2c`.
La preparazione locale del 28 ottobre e il rilascio del 29 ottobre sono documentati di seguito.

## Problema e comportamento corretto

Nel Quadro pacchetto, “Genera mancanti” per PT 1:2 chiamava
`PTPairSessions.open(id, false)`, ma il pannello apriva comunque la proposta
di rinnovo presente. Senza proposta, il modulo suggeriva il numero di sedute
del pacchetto intero. Anche “Modifica piano” ritornava alla modalità rinnovo.

Il percorso ora completa i pacchetti correnti. Il numero proposto è il minimo
fra i residui disponibili delle due persone, sottraendo le prenotazioni già
collegate ai rispettivi cicli correnti. Sono mostrati solo i dati per programmare
le sedute: data, ora, PT, giorni e quantità. I campi di rinnovo e pagamento non
sono presenti in questa modalità. L’anteprima e il ritorno al piano conservano
la scelta. La gestione commerciale continua ad aprire il rinnovo previsto.

Esempio collaudato: due pacchetti di otto sedute, sette svolte, una annullata e
otto date del prossimo rinnovo già prenotate. Si aggiunge un solo appuntamento
condiviso nei due cicli originali; la seduta annullata resta nello storico.
Date, quantità, stato e versione del rinnovo rimangono identici.

Si usa il gateway atomico già esistente con `renewal: null` per entrambi.
Nessuna nuova API, migrazione, autorizzazione o modifica ai consumatori.
Il caso coperto è il pacchetto originale ancora corrente con un successore
previsto/confermato in attesa; riaprire un ciclo già chiuso resta fuori ambito.
Se uno dei partecipanti non ha capacità disponibile, il recupero condiviso
viene fermato e occorre verificare i rispettivi conteggi.

## File principali

- `app/calendario-studio/js/pt-pair-sessions.js`: separazione recuperi/rinnovo.
- `app/calendario-studio/index.html`: versione dell’asset aggiornata.
- `tests/calendar-pair-recovery.test.cjs`: riproduzione del difetto e regressioni.
- `tests/calendar-pair-recovery-browser.cjs`: interfaccia, vero gateway e SQL locale.
- `scripts/check-calendar-pt-pair.sh`: nuovi controlli inclusi.
- `tests/package-early-session.test.cjs`: il DOM fittizio espone ora
  `getElementById`, richiesto dal salvataggio già presente nel workspace;
  nessuna aspettativa di comportamento modificata.

## Prove

Runtime Node 24.14.1, entro il vincolo `>=22 <25`; Playwright 1.56.1 e PGlite
0.3.10 dichiarati in `tools/coaching-editor/package.json` e installati nel repo.

```sh
bash scripts/check-calendar-pt-pair.sh
node tests/calendar-pair-recovery-browser.cjs
PGLITE_MODULE="$PWD/tools/coaching-editor/node_modules/@electric-sql/pglite" node --test tests/calendar-pt-pair-postgres.test.cjs tests/calendar-expected-renewals.test.cjs
bash scripts/check-calendar-release.sh
git diff --check
```

- Riproduzione: prima della correzione fallivano i due controlli su apertura
  e anteprima del recupero; il controllo sulla capacità esistente passava.
  Dopo la correzione passano tutti e quattro i casi mirati.
- Suite coppia: 30 test superati, oltre ai controlli registro economico e Apple.
- Integrazione SQL: cinque test superati, con partecipanti sia JSONB sia array SQL,
  rinnovi separati, attivazione, presenze, storico e permessi.
- Browser mobile 390×844: pagina reale → `CalendarAudit` → handler reale →
  funzioni SQL su PostgreSQL locale PGlite → rilettura e ricarica della pagina.
  Soltanto verifica identità e trasporti HTTP/database hanno adattatori di test.
  Tutte le richieste sono intercettate; non vengono contattati servizi reali.
  Coperti errore della transazione, rollback, risposta persa dopo commit,
  retry con stesso ID, ritorno al piano, rifiuto di un secondo recupero oltre
  il residuo, rifiuto del ruolo PT, registrazione presenza e successivo
  annullamento. Le otto date e la proposta successiva restano identiche.
  Screenshot ispezionati in `/tmp/neacea-pair-recovery-{form,current}.png`.
- Lo script completo Calendario supera i controlli funzionali e termina con
  `BLOCCATO: i file critici del Calendario non sono tutti salvati in un commit.`
  Il workspace contieneva numerose modifiche preesistenti: non sono state
  committate insieme a questa correzione. Non è un rilascio validato su un commit.
  Il browser ha richiesto esecuzione fuori sandbox per il limite macOS sui
  processi Chromium; nessuna aspettativa o controllo è stato rimosso.

La persistenza è provata sul database locale con dati sintetici. Non sono state
eseguite scritture nel Supabase reale né cambiamenti agli appuntamenti delle sorelle.

## Stato Git e prossimo intervento

Modifiche locali non committate: i sei file elencati sopra (i due nuovi test e
questo rapporto sono non tracciati), con tutte le lavorazioni precedenti conservate.
`git diff --check` senza rilievi. Nessun deploy, push o migrazione effettuato.

Prossimo passo esterno: su richiesta di pubblicazione, identificare il commit
effettivamente online, preparare un candidato Git circoscritto, collaudarlo e
verificare gli asset pubblicati. Solo dopo il rilascio il nuovo percorso sarà
disponibile nel Calendario online: Quadro pacchetto → Genera mancanti →
Continua → scegliere il recupero → anteprima → conferma.


## Preparazione pubblicazione — 29 ottobre 2026

Pubblicazione richiesta esplicitamente dall’utente. Produzione verificata:
commit `500b359b9fec77ea7541f346bce86c6f5726ac05`, deploy
`6adf8a670077cb546c3caa82`. Manifesto di 43 file confrontato con Git,
comprese la configurazione root `netlify.toml` e le intestazioni. Quindici
funzioni Node 24 e due pianificazioni da preservare.

Candidato sul ramo `release/calendar-pair-recovery-20261029`, preparato con
indice Git separato e checkout temporaneo in `/tmp`, senza worktree né
modifiche al checkout di lavoro. Cambi pubblici limitati a `index.html`
e `js/pt-pair-sessions.js`. Dipendenze installate dai due lockfile
`tools/coaching-editor` e `tools/apple-caldav-production`, Node 24.14.1.

La suite completa supera anche il controllo Git nel candidato pulito.
La verifica estesa ha evidenziato un riferimento testuale obsoleto nel
test browser della coppia, già identico nella base pubblicata: cercava
«Ore PT prenotate», mentre il riepilogo online usa «Ore PT ancora prenotate».
Aggiornata soltanto la dicitura cercata; le attese restano un’ora prenotata,
un’ora PT 1:2 maturata e 15 euro. Nessuna modifica al riepilogo ore.

Il nuovo test browser può leggere gli asset dall’anteprima o dalla produzione
tramite `CALENDAR_RELEASE_ORIGIN`, mantenendo tutte le API applicative
intercettate e collegate ai soli dati sintetici del database locale.


## Estensione richiesta — PT assegnato nei comandi pacchetto

L’utente ha precisato che il problema dei tre nomi riguarda i moduli di
cambio orari e rinnovo, non gli elenchi del Portale o le singole lezioni,
e ha richiesto il controllo su tutti: «fa sempre capo il PT assegnato».
La prima interpretazione sugli elenchi PT è stata quindi scartata; nessuna
modifica agli accessi o agli elenchi del Portale.

Censimento read-only sul database reale: 26 clienti PT attivi, tutti con
un titolare valido e attivo; nessuna coppia con titolari differenti. Sei
rinnovi aperti; un rinnovo condiviso di due clienti contiene un altro PT
nei propri slot. Per il caso segnalato il titolare è Alessandro; Martina
e Gianluca risultano PT di singole lezioni, non ulteriori titolari. Nessuna
condivisione attiva sul cliente segnalato. Nessuna scrittura reale eseguita.

Correzione estesa a tutti i pacchetti tramite i moduli comuni:

- Cambio orari: mostra solo il PT assegnato; modificare l’orario conserva
  il PT effettivo di ciascuna lezione.
- Nuova programmazione, recuperi e rinnovo manuale: riferimento al PT assegnato,
  senza recuperare il nome da una seduta svolta da un sostituto.
- Rinnovi già previsti: riferimento del pacchetto esplicito e unico. Il
  riepilogo giorni/orari non presenta i PT delle lezioni come titolari.
  L’aggiornamento degli orari conserva le sostituzioni già programmate; i
  nuovi giorni usano il PT assegnato.
- Nelle righe delle singole lezioni restano visibili e modificabili i loro
  PT effettivi. Assegnazioni cliente, storico, incassi e accessi invariati.

Asset pubblici previsti: `index.html`, `js/app.js`, `js/expected-renewals.js`
e `js/pt-pair-sessions.js`. Nessuna funzione server modificata: conservare
tutti e quindici i bundle e le due pianificazioni.

Nuove riproduzioni automatiche fallivano prima della correzione: il modulo
coppia esponeva il sostituto fra i titolari proposti e accettava la nuova
programmazione con quel PT. Dopo la correzione passano. Il test browser
include tre PT sintetici, sedute storiche con sostituti, un rinnovo con un
altro PT nelle lezioni e una futura seduta individuale con un sostituto.
Verifica riferimento al solo assegnato nei comandi, mantenimento dei PT
elle righe delle lezioni e cambio orario della proposta salvato e riletto
dal database locale senza riassegnare le lezioni o il cliente.


## Pubblicazione completata — 29 ottobre 2026

- Codice online: `eab841107014bdc3627421bb78dfad865588f77f`, ramo `release/calendar-save-guard-20261026`.
- Produzione: `6ae38464506569b29d227988`, pubblicata `2026-10-29T17:37:56.917Z`.
- Anteprima verificata: `6ae38437289de18637243278`.
- Manifesto completo: 43 file. Cambiano soltanto index.html, js/app.js,
  js/expected-renewals.js e js/pt-pair-sessions.js; confronto byte per byte
  dei quattro asset su anteprima e dominio di produzione.
- Tutte le 15 funzioni server conservano digest, runtime e configurazione.
  Le due pianificazioni restano identiche. Risposta anonima del gateway: 401.
- L’anteprima sul nuovo ramo aveva due digest differenti perché Netlify
  incorpora il nome del ramo nei metadati delle funzioni V2 pianificate.
  È stato quindi riusato il ramo di produzione esistente, con avanzamento
  Git senza forzature e preservando i documenti precedenti. I sorgenti e i
  test sono identici al candidato già collaudato `fa714c3b5e1fdba1781bb4bb59ded8c2bfcde4a1`.
- Sul commit finale, suite completa Calendario superata nel checkout pulito,
  incluso il controllo Git, più test del recupero con vero gateway e SQL
  locale. Superate anche suite estesa coppia (35 test), integrazione SQL,
  browser rinnovo, correzione coppia ed editor dei partecipanti sul codice
  equivalente, senza rimuovere controlli o allargare permessi.
- Prova browser sia sull’anteprima sia sugli asset realmente pubblicati,
  con tutte le API applicative intercettate e dati sintetici nel database
  locale: recupero singolo, ciclo originario, retry idempotente, riapertura,
  PT assegnato nei comandi, PT effettivi conservati nelle lezioni, cambio
  orario del rinnovo salvato e riletto senza riassegnare le lezioni.
- Nessun appuntamento o dato reale modificato, nessuna migrazione eseguita.
- Configurazione finale Netlify ripristinata: produzione locked, ramo main,
  build sospese e soli rami main ammessi.

Censimento globale read-only: 26 clienti PT attivi, tutti con titolare valido
e attivo; nessuna coppia con titolari diversi. Controllati sei rinnovi aperti;
il caso con un altro PT negli slot riguarda il rinnovo condiviso delle due
Mereu. La correzione dei moduli si applica a tutti. Le singole lezioni possono
continuare ad avere PT diversi dal titolare. Nessuna modifica agli elenchi o
agli accessi del Portale PT.

Stato Git finale del checkout di lavoro: ramo feature/whatsapp-agenda-pt-v1,
modifiche locali preesistenti e nuove conservate, indice principale invariato.
Candidato e prove salvati nel ramo di rilascio; git diff --check superato.
I file principali sono i quattro asset sopra, i test calendar-pair-recovery,
calendar-replacement-slot e calendar-expected-renewals-browser, lo script
check-calendar-pt-pair.sh e il helper calendar-pair-recovery-release.cjs.

Nessun passaggio esterno rimasto. Per le finestre già aperte ricaricare il
Calendario, poi usare Quadro pacchetto → Genera mancanti per il recupero.
