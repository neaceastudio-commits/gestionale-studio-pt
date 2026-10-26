# Calendario e Portale PT — verifica salvataggi, trasferimento e gruppi clienti

## Verifica del caso reale dopo la pubblicazione — 26 ottobre, 15:45 UTC

Due tentativi delle 15:33–15:34 UTC mostrano ancora la vecchia sequenza
`codice_fiscale` / `contatto_emergenza` e audit cliente con referente invariato.
La pagina Safari aperta non mostrava i nuovi filtri gruppi; dopo ricarica li
mostra. Produzione Netlify confermata sul deploy `6adf69f5f0d7ca2465d67586`.
Evidenze coerenti con la precedente versione JavaScript rimasta nella pagina
aperta; non è stato necessario un ulteriore rilascio.

Dopo conferma esplicita dell'utente sono state trasferite le due clienti
indicate da Martina ad Alessandro usando l'operazione esistente `assignment`
di `calendar_audit_write`, in una sola transazione con lock e controllo del
referente precedente. Una prima richiesta di modifica era stata respinta
dalla revisione automatica; nessuna scrittura prima dell'autorizzazione.

Commit riuscito alle 15:45:25 UTC. Rilettura in una richiesta separata:
entrambe assegnate ad Alessandro, una sola relazione PT attiva per cliente,
nessuna relazione attiva con altri PT. Assert transazionale: tutti i campi
cliente, esclusi referente e timestamp, identici al precedente stato.
Due eventi audit prima/dopo presenti. Zero appuntamenti delle due clienti
aggiornati dal trasferimento. Nessun cambio di schema, permessi o codice.
Calendario Safari ricaricato dopo il commit: il Registro attività mostra
entrambi i nuovi eventi «Assegnazione PT» con i nomi delle due clienti.

Ramo locale `feature/whatsapp-agenda-pt-v1`, HEAD `65cfcc6`; conservate tutte
le modifiche preesistenti, aggiunto solo questo aggiornamento al rapporto.
`git diff --check` superato. Prossimo intervento distinto: eventuale gestione
del trasferimento congiunto delle sedute PT 1:2; la conferma ricevuta in questo
passo esclude esplicitamente la modifica degli appuntamenti programmati.

26 ottobre 2026. Repository Gestionale Studio PT, branch
`feature/whatsapp-agenda-pt-v1`, HEAD di partenza `65cfcc6`.
**Pubblicato e verificato il 26 ottobre 2026**, commit applicativo `5c3c2b5`,
deploy `6adf69f5f0d7ca2465d67586`. Migrazione applicata; dati sintetici rimossi.
Le sezioni iniziali documentano le prove prima dell’autorizzazione. Le lavorazioni
preesistenti restano conservate.

## Verifica della produzione esistente

- Portale PT: Netlify conferma ancora il deploy `6adcb77f21b4e65852fd19f0`,
  ready e locked, pubblicato il 24 ottobre. I sei asset del salvataggio coincidono
  byte per byte con il candidato Git `015970b`. Il bundle `pt-data` ricostruito
  con esbuild dichiarato ha digest
  `0a088ef019e23dc7746a35aded103330a7e9e00026064a95ca38c0af85b014a2`,
  uguale a quello online. Le altre 19 funzioni e le due pianificazioni sono
  identiche alla baseline; accesso anonimo API respinto con 401.
- Supabase: migrazione `20261023214210_pt_assigned_session_trigger_alignment`
  presente, trigger abilitato e funzione corretta. Funzioni di salvataggio non
  eseguibili da anon/authenticated. Tutte le 43 schede conservano schema 8 e
  snapshot moderno; presenti le 22 revisioni originali della normalizzazione.
- La riproduzione gestita `pt-managed-db-repro.sql`, ripetuta con rollback,
  conferma salvataggio referente/sostituto e conservazione del record referente.
  Nessun record sintetico residuo nel controllo successivo.
- Dopo il rilascio risultano aggiornati una scheda, una registrazione seduta
  e 144 righe carichi: conteggi di dati persistiti, non prova che ogni tentativo
  dell'utente sia riuscito né che 144 righe siano 144 sedute.
- Calendario: ancora online il deploy `6ad91785fd911ad109a6344c`, commit
  `c191a363a07a920390209c5f0f80654cf60da8a5`, locked. I tre asset della
  correzione cambio PT/sedute coincidono con il commit pubblicato.

Prima delle nuove modifiche superati 53 test del salvataggio, 33 test su timer,
anamnesi, formati e salvataggi Calendario e tre test SQL sui rinnovi. Superate
sei suite browser principali, due aggiuntive su refresh/caricamento progressivo,
due sugli asset PT online e una sul cambio PT della seduta (11 esecuzioni).
Le prove browser usano database sintetici. Le due prove sugli asset online
leggono il frontend pubblico ma scrivono solo sulla fixture locale.
Il primo tentativo confinato del runner era fallito su `listen EPERM`; la
successiva esecuzione con server locale consentito è riuscita, senza saltare test.

## Difetto trovato nell'assegnazione del cliente

I log PostgreSQL del 26 ottobre riportano due coppie di errori alle 10:05 e
10:06 Europe/Rome: colonne `codice_fiscale` e `contatto_emergenza` assenti in
`clients`. Segue un evento audit per ciascuna sequenza. Non sono errori delle
nuove schede PT e non dimostrano da soli perdita di dati reali.

La riproduzione sintetica sul codice Calendario online ha dimostrato che
`pushClient`, dopo il secondo errore schema, eliminava anche colonne presenti:
`pt_assegnato`, `package_types`, `stato_abbonamento`, `updated_at`. Il terzo invio
riusciva mantenendo però il vecchio PT e il vecchio pacchetto nel database
simulato. Il nuovo caso in `supabase-client-fallback.test.cjs` è fallito prima
della correzione con assegnazione assente e riesce dopo.

Ora il recupero elimina soltanto le colonne esplicitamente rifiutate dal server;
un errore non riconosciuto resta un errore. Il trasferimento usa un PATCH mirato
su assegnazione e note, poi una lettura separata del cliente prima del successo.
Non reinvia pacchetto, residuo o anagrafica completa. Le sedute individuali usano
salvataggi con snapshot precedente; quelle condivise e lo storico restano
invariati. Doppio clic bloccato. In errore vengono ripristinate solo le scritture
confermate, con la versione server; una risposta incerta sul cliente non causa
un ripristino cieco dell'intera anagrafica. Un errore resta visibile.

Limite esplicito: il trasferimento di più sedute non è una singola transazione
server. Se la connessione impedisce anche il recupero, il messaggio richiede
di verificare lo stato corrente; non viene dichiarato un rollback completo.

Provato inoltre su Supabase gestito, in una transazione con soli ID
`ptqa-20261026-*` e successivo rollback, il PATCH esatto tramite
`calendar_audit_write`: nuovo referente salvato, relazione PT attiva, pacchetto,
residuo e stato attivo conservati. Questa prova non è un ciclo browser con
commit e riapertura sul database gestito. Nessuna modifica a clienti reali.

## Gruppi manuali richiesti

Filtri **Tutti / Abituali / Occasionali / Da classificare** nella vista attivi.
La Direzione sceglie il gruppo nel selettore del cliente. Lo storico resta
separato; nessuna classificazione automatica e nessuna archiviazione implicita.

Proposta SQL in `client-groups.sql`: nuova colonna nullable `clients.client_group`
con valori `regular` / `occasional`. I clienti precedenti restano null, mostrati
come Da classificare. Nessun backfill. La RPC è eseguibile solo dal servizio,
ricontrolla Direzione e cliente attivo, conserva note/pacchetti e respinge una
scelta concorrente differente. Retry identico senza ulteriore scrittura.
Il gateway ricava l'autore dalla sessione e impedisce di modificare il gruppo
tramite l'operazione generica client. Il salvataggio attende una rilettura
indipendente. Gli aggiornamenti cliente ordinari non inviano il campo nuovo.

Compatibilità: i consumatori esistenti continuano a usare gli stessi ID e campi;
la colonna è additiva, non cambia identità, assegnazioni, stato attivo o formato
dei programmi. Il registro audit esistente registra l'aggiornamento cliente;
la sua proiezione attuale non include il dettaglio del gruppo prima/dopo.

## Verifiche delle modifiche e riproducibilità

Node 24.14.1, Playwright 1.56.1 e PGlite 0.3.10 dichiarati in package/lockfile
di `tools/coaching-editor`. Comando dalla radice web:

```sh
node tools/coaching-editor/check-calendar-clients.cjs
```

14 test Node/API/PGlite, script di regressione trasferimento e fallback, tre
suite browser (gruppi/trasferimento, pacchetti coppia, cambio PT seduta) superati.
Coperti permessi, client precedente senza gruppo, errore/riprova, riapertura,
isolamento dallo storico, conflitto fra scelte e rollback SQL su errore audit.
Verifica visiva a 390 px e prova a 1440 px; selettori leggibili, niente overflow
della pagina. L'API e il database dei browser sono simulati.

`bash scripts/check-calendar-release.sh` ha completato i controlli funzionali
e si è fermato al gate finale: file critici non tutti committati. Quindi il
comando completo **non è superato**. Il gate non è stato rimosso o aggirato.
Un controllo statico richiamava il vecchio metodo `pushAppointment`: aggiornato
al nuovo metodo con versione, conservando le attese funzionali e aggiungendo
prove eseguite su trasferimento, rifiuto e doppio clic.

## Stato Git e prossimi passi

Nessun commit, push, deploy o migrazione in questo passo. Branch invariato;
`git diff --check` superato. Preservati i dieci file modificati e le venti voci
non tracciate presenti all'inizio. Le modifiche applicative Calendario rispetto
al commit online sono circoscritte a index, app, clients, supabase e gateway.
Gli altri cambi riguardano prove, comando di verifica e questo rapporto.

Per attivare: autorizzazione esplicita alla proposta SQL e alla pubblicazione
del **Calendario**, preparazione del candidato Git isolato da `c191a36`, suite
sul candidato, applicazione migrazione con registrazione della versione e
rilascio dei soli asset/gateway coinvolti preservando gli altri bundle.
Poi verificare hash online, permessi e ciclo di scrittura/lettura/riapertura
con soli record sintetici e pulizia. Il Portale PT è un sito distinto e non
richiede una nuova pubblicazione per questi interventi.


## Autorizzazione e avvio del rilascio

L'utente ha autorizzato esplicitamente migrazione e pubblicazione del Calendario.
Applicata e riletta la migrazione `20261026141717_calendar_manual_client_groups`.
Tutti i 34 clienti esistenti sono rimasti non classificati; execute negato ad
anon/authenticated e consentito al servizio. La prova SQL con rollback sul
Supabase gestito conferma gruppo occasionale, note, pacchetto e residuo intatti.
Il file locale della migrazione riproduce il SQL effettivamente applicato; la
prova PGlite carica ora questo file definitivo.


## Pubblicazione completata — 26 ottobre 2026

- Migrazione: `20261026141717_calendar_manual_client_groups`.
- Candidato applicativo: `5c3c2b55e0da1cdb9153225cfc709ffd6005bab0`, derivato
  dall'effettivo commit Calendario online `c191a36` tramite indice Git separato.
  Branch: `release/calendar-client-groups-20261026`, pubblicato su GitHub.
  Nessun cambio branch o reset nel checkout di lavoro; nessun worktree creato.
- In una copia temporanea di collaudo fuori dal progetto sono state installate
  con `npm ci --ignore-scripts` le dipendenze del lockfile candidato, con Node
  24.14.1. Nessuna dipendenza globale o cartella occasionale usata come gate.
  La suite `check-calendar-release.sh` sul candidato pulito è interamente
  **superata, incluso il gate Git finale**. Prima dell'isolamento, il gate sul
  checkout di lavoro restava correttamente bloccato dai cambi preesistenti.
- Anteprima Git: `6adf6339889af55a283c3c9f`, stesso commit, manifesto 42 file,
  quattro asset confrontati byte per byte, configurazione delle 15 funzioni e
  due pianificazioni verificate; API anonima 401. Prova mobile gruppi,
  trasferimento, riapertura, errori e storico con asset remoti superata
  usando un backend sintetico intercettato.
- Collaudo autenticato gestito: deploy Git non pubblicato
  `6adf641ab6fbcdf1eacbb639`. La funzione `calendar-activity` ha lo stesso
  digest dell'anteprima e della produzione finale:
  `16bf9ba87346f087cffeeb8b39caed60c89fa5fb77aeffffc1c18d66b675d0bd`.
  Verificati gruppo/scrittura/rilettura, retry idempotente, conflitto rifiutato,
  PT non autorizzato a classificare, cambio referente e rilettura, pacchetto,
  residuo e note conservati, ritorno esplicito a non classificato.
  La prova usa i veri handler, autenticazione e Supabase con commit reali e
  letture separate; non è un browser che scrive sul database gestito.
  Il controllo è limitato a ID sintetici fissi, capacità casuale conservata
  solo in memoria e scadenza dieci minuti; nessun token restituito o salvato.
- Una lettura SQL indipendente dopo il runtime conferma nuovo PT, note e
  residuo persistiti. Eliminati solo il cliente, tre operatori e le relazioni
  `ptqa-20261026-release-*`: conte finali zero in tutte queste entità.
  Gli eventi sintetici dell'audit immutabile restano conservati. Una richiesta
  di pulizia ha ricevuto `Invalid or expired requestState`; il successivo
  invio è riuscito e la verifica finale conferma la pulizia.

Produzione effettiva: **`6adf69f5f0d7ca2465d67586`**, ready, pubblicata alle
**16:56:11 Europe/Rome**. Il cambio temporaneo del ramo Netlify ha avviato una
build automatica; la build esplicita `6adf69f65d24fbafac367515` usa lo stesso
commit ma non è quella effettivamente pubblicata. Verificato il commit del
sito effettivo, senza presumere che l'ID dell'ultima richiesta fosse online.

Post-pubblicazione: manifesto completo 42 file, quattro asset identici al
candidato, 15 funzioni senza controlli temporanei, cron invariati, runtime e
configurazioni invariati, API anonima respinta con 401. Passata la prova
browser mobile con gli asset realmente online e API sintetiche. Nessuna
nuova pubblicazione del Portale PT o di altri siti.

Rispetto alla produzione precedente, dieci funzioni conservano il digest.
I tre gateway che condividono `calendar-audit-endpoint.js` sono ricompilati;
la nuova classificazione è ammessa solo dal Calendario e solo alla Direzione.
Per i due bundle pianificati i sorgenti sono identici, configurazioni e cron
immutati e dimensione maggiore di nove byte: l'attribuzione ai nove caratteri
aggiuntivi del nome del ramo nei metadati di build è un'inferenza, non una
comparazione del contenuto ZIP. Il solo file di libreria server modificato
nel candidato è quello del gateway audit, come verificabile nel diff Git.

Configurazione finale riletta: deploy corrente **locked true**, repository
su **main**, `stop_builds: true`, rami consentiti `main`. Il ramo Git temporaneo
di collaudo è stato rimosso dal remoto. Il draft manuale incompleto è stato
eliminato. Il controllo temporaneo non è compreso nel sito pubblico corrente.
Non è stata attivata né dichiarata una nuova protezione CI automatica.

### Dettagli operativi del canale di rilascio

Netlify rifiuta i deploy di produzione via API per questo sito con 403:
“Production deploys from API are disabled for this site. Please use a git-based deployment.”
Il tentativo non ha pubblicato nulla; il rilascio è passato dal canale Git.
Per cambiare `repo_branch` l'API richiede l'oggetto `repo` con la connessione
Git esistente; `build_settings.repo_branch` è ignorato. Per `stop_builds`
il campo efficace è invece `build_settings.stop_builds`. Tutti i valori finali
sono stati riletti e verificati, senza rimuovere il vincolo Git-only.
Documentazione: [Netlify API](https://open-api.netlify.com/),
[funzioni Supabase e privilegi](https://supabase.com/docs/guides/database/functions).
Gli advisory di sicurezza conservano gli stessi segnali precedenti: viste
security definer, tabelle server RLS senza policy e protezione password.
Nessuna impostazione di sicurezza è stata allargata per superare il collaudo.

### Stato finale e uso

Codice applicativo e migrazione salvati nel candidato Git e pubblicati.
Il checkout principale resta su `feature/whatsapp-agenda-pt-v1` con le
lavorazioni preesistenti e le copie locali delle modifiche conservate;
`git diff --check` superato. I successivi aggiornamenti del rapporto e degli
strumenti di verifica non cambiano il commit applicativo online.

**Nessun altro passaggio esterno necessario. Ricaricare il Calendario** per
usare la correzione e i gruppi. I clienti esistenti restano Da classificare;
nessun cliente reale è stato automaticamente assegnato a un gruppo.
Per il prossimo rilascio ripartire dal commit effettivamente online, non dal
main remoto né dall'intero checkout di lavoro.
