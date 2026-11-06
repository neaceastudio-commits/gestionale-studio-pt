# Calendario — annullamento con recupero automatico e alert di sovrapposizione

6 novembre 2026. Gestionale Studio PT / Calendario.
Branch `feature/whatsapp-agenda-pt-v1`, HEAD `105650c`.
Stato aggiornato: **pubblicato e verificato il 6 novembre 2026**.
[Versioni online e prove di pubblicazione](20261106-calendar-automatic-recovery-published.md).
Il seguito conserva lo stato e le prove della preparazione locale precedente al rilascio.

## Comportamento richiesto

Quando una seduta del pacchetto passa ad “Annullata · da recuperare”, il server
conserva l'originale annullato e crea il recupero nella stessa transazione.
Il nuovo appuntamento viene aggiunto dopo l'ultima seduta di quel ciclo, seguendo
i giorni acquistati, gli orari effettivi per giorno e il PT assegnato. Il controllo
usa il registro del ciclo e i dati attuali del database, non un piano del browser.
Se mancano indicazioni storiche, usa il giorno/orario della seduta originaria.
Per PT 1:2 conserva entrambi i partecipanti in un solo appuntamento.

Su successiva indicazione esplicita dell'utente, un orario occupato **non blocca
l'inserimento e non sposta il recupero**. PT, cliente e capacità della sala
producono avvisi. Questo vale anche per l'inserimento/spostamento manuale e
per la programmazione della coppia, indipendentemente dalla modalità Flex.
Restano applicati autorizzazioni, validità dei dati, compatibilità del pacchetto,
residui e controlli di concorrenza. I conteggi ore/compensi continuano a segnalare
le sovrapposizioni senza attribuire automaticamente compensi duplicati.

Il browser mostra data e ora del recupero e un avviso persistente in caso di
sovrapposizione, con “Apri recupero” e “Chiudi”. Gli errori restano visibili
nel modulo. Il normale messaggio temporaneo non è l'unica conferma.

## Persistenza e compatibilità

- Nuova RPC `calendar_cancel_and_recover`, solo `service_role`, con controllo
  dell'identità e del ruolo corrente nel database. Il PT può operare soltanto
  sulla propria seduta e sul pacchetto assegnato; nessun permesso viene ampliato.
- Lock delle tabelle nello stesso ordine dei writer esistenti, confronto dello
  snapshot originale, ID recupero deterministico per seduta. Doppio clic,
  risposta persa e retry restituiscono lo stesso appuntamento.
- Se la creazione fallisce, viene annullato anche l'annullamento dell'originale
  e l'eventuale rimborso della seduta. Nessun salvataggio parziale dal browser.
- Il recupero resta nel ciclo originario. Le prenotazioni di un rinnovo non
  attivato conservano invece la propria proposta, i propri orari e collegamenti,
  senza incidere sui residui del ciclo precedente.
- Nessun rinnovo o incasso automatico, nessuna conversione di dati storici.
  Le sedute di cicli precedenti e i clienti archiviati richiedono verifica;
  in questi casi la transazione non modifica l'originale.
- Il gateway intercetta anche il vecchio formato di richiesta di annullamento
  del Calendario. Le cancellazioni interne di pianificazione/rinnovo e gli altri
  servizi non generano recuperi. Modificare una riga già annullata conserva
  l'editing dello storico e non genera un nuovo recupero.
- Le sedute già annullate prima della pubblicazione non vengono riprogrammate
  retroattivamente. I due recuperi della segnalazione iniziale non sono stati
  inseriti su date inventate.

## File principali

- `app/calendario-studio/js/{app,supabase,services,pt-pair-sessions}.js`:
  conferma del recupero, aggiornamento cache solo dopo conferma server,
  avvisi persistenti, sovrapposizioni consultive.
- `app/calendario-studio/css/ui-fixes.css`, `index.html`: avvisi anche su mobile
  e parametri asset per la futura pubblicazione.
- `netlify/functions/lib/calendar-audit-endpoint.js`: identità verificata,
  instradamento alla transazione, protezione della revisione del protocollo.
- `supabase/migrations/20261106114015_calendar_automatic_recovery.sql`:
  nuova RPC e trasformazione dei soli conflitti di pianificazione in avvisi;
  firme, ACL e controlli delle funzioni precedenti conservati.
- `scripts/check-calendar-automatic-recovery.sh`, relativo collegamento a
  `scripts/check-calendar-release.sh`, test automatic-recovery e helper locale.
- `tests/calendar-exhausted-edit.test.cjs`: attesa della capacità sala aggiornata
  perché l'utente ha richiesto avviso e salvataggio consentito; restano le prove
  che impediscono prenotazioni senza residuo o cambi di ciclo indebiti.

## Prove eseguite

Node **24.14.1** nel range dichiarato; Playwright **1.56.1**, PGlite **0.3.10**
ed embedded-postgres **17.10.0-beta.17** dichiarati in `tools/coaching-editor`.
Nessuna dipendenza globale o credenziale reale usata dai test.

1. Riproduzione precedente alla correzione: i test falliscono perché manca
   la transazione automatica, e perché le coppie rifiutano le sovrapposizioni.
2. `bash scripts/check-calendar-automatic-recovery.sh`: **24 test superati**.
   Comprendono gateway/autorizzazioni, formato precedente, coppia, singolo,
   errore e rollback, retry, lettura separata della persistenza, conservazione
   di residui e importi, rinnovo previsto e pacchetti storici senza giorni.
3. `node --test tests/calendar-automatic-recovery-concurrency.test.cjs`:
   **1 test superato**, con due connessioni indipendenti a PostgreSQL locale.
   Due richieste simultanee producono una sola cancellazione e un solo recupero.
4. `node tests/calendar-automatic-recovery-browser.cjs`: **superato**.
   Pagina reale → gateway reale → PostgreSQL locale, trasporto e autenticazione
   simulati; errore prima della scrittura, risposta persa dopo commit, retry,
   una sola seduta condivisa anche nello slot occupato, alert persistente,
   apertura del recupero e reload. Screenshot mobile ispezionato.
5. `bash scripts/check-calendar-pt-pair.sh`: **37 test superati**, più registro
   pacchetti e aggiornamento Apple. Senza opzioni SQL/browser di quella suite;
   le nuove prove SQL/browser sono quelle distinte sopra.
6. `bash scripts/check-calendar-release.sh`: controlli funzionali completati;
   uscita **1 al controllo Git finale**, che rifiuta i file critici non committati.
   Non è dichiarato un controllo di rilascio superato né un blocco remoto attivo.
7. `git diff --check`: superato.

I browser e PostgreSQL locali sono stati avviati con il permesso necessario
al di fuori della sandbox macOS. Nessun controllo rimosso o ignorato.
Queste prove dimostrano persistenza locale; **non** sono prove di scrittura
nel database reale dell'applicazione.

## Git e attivazione ancora necessaria

Conservati indice e lavorazioni preesistenti. Nessun commit, push, worktree,
deploy o migrazione remota. Stato finale del checkout: **30 file tracciati
modificati e 84 percorsi non tracciati**, inclusi questo rapporto e materiale
preesistente. L'elenco completo è stato controllato con `git status --short`.

La produzione identificata nella diagnosi precedente rimane il deploy
`6aecaa91b88b57d167ca1f13` / sorgenti `701e4e9`; nessun rilascio in questa modifica.

Prossimo passo, dopo autorizzazione esplicita prevista dalle istruzioni Studio:
ricontrollare la produzione, preparare un candidato Git con le sole modifiche
richieste, collaudarlo, applicare la migrazione e pubblicare il Calendario.
Verificare poi commit, asset e configurazione online. Non usare le prenotazioni
reali dei clienti come record di prova.
