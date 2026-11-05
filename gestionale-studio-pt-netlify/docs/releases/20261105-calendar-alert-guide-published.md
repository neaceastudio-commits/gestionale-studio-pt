# Calendario — Alert con spiegazioni e possibili soluzioni, pubblicati

**Attivato e verificato il 5 novembre 2026**, dopo la richiesta “pubblica”.
Sul [Calendario](https://new-calendar-neacea.netlify.app/) gli alert di Clienti
e della dashboard aprono significato, possibili interventi e collegamenti alle
funzioni pertinenti. Il contatore “Alert gestione” mostra tutti i clienti attivi
visibili con avvisi. Nove tipi di alert coperti; i promemoria restano distinti
dalle incongruenze che richiedono una verifica.

## Versioni

| Elemento | Versione verificata |
|---|---|
| Produzione precedente | Commit `e989f58311b6b094de1b81c361d771203e865a70`, deploy `6ae4ec1ad7e2511834092478` |
| Branch del candidato | `release/calendar-alert-guide-20261105` |
| Commit sorgenti pubblicato | `701e4e90f7fa947c1d9886e28d79cfb64339906b` |
| Anteprima finale collaudata | `6aecaa2edc21e5f7f786d5ff` |
| Produzione effettiva | `6aecaa91b88b57d167ca1f13` |
| Timestamp di pubblicazione Netlify | `2026-11-05T16:11:19.400Z` |

Il primo candidato `8c1493f` conteneva già i tre asset definitivi. Il commit
successivo aggiunge una verifica più completa degli scheduler ricompilati da
Netlify, senza cambiare l’interfaccia o il codice server. Il candidato finale
è stato ricollaudato prima del rilascio.

La build di produzione richiesta esplicitamente era
`6aecaa92dabff5d4298e83b9`; Netlify ha pubblicato prima la build automatica
`6aecaa91b88b57d167ca1f13` dello stesso commit. Le prove riguardano il deploy
effettivamente attivo, confermato anche dal connettore Netlify.

## Ambito

Cambiano soltanto tre asset pubblici: `js/clients.js`, `css/ui-fixes.css` e
`index.html` (versioni degli URL di questi due asset). L’HTML del candidato parte
dalla produzione e non include gli aggiornamenti indipendenti di Supabase e
rinnovi presenti nel checkout di lavoro. Aggiunti test, rapporto, manifest
iniziale e procedura di rilascio; il test è collegato alla suite clienti già
richiamata dai controlli del Calendario.

L’intero manifest online di **44 file** è stato confrontato con la produzione
precedente e con il candidato Git: nessuna differenza fuori dai tre asset.
Tutti i sorgenti server, la configurazione di build, il registro economico
condiviso e il lockfile restano identici alla base pubblicata.

Quattordici archivi delle funzioni sono identici per digest. I due scheduler
ESM hanno archivi ricompilati: il primo confronto rigoroso dei digest ha
segnalato la differenza nell’anteprima e ha fermato la verifica, prima della
pubblicazione. È stato quindi verificato l’intero insieme dei moduli importati
contro il commit online, ricostruendolo con esbuild `0.25.12` dichiarato nel
lockfile. Sorgenti e dipendenze sono byte per byte uguali; gli hash sono nelle
prove JSON. Runtime, memoria, regione, metadati bootstrap e i due orari sono
identici. Superati inoltre i 13 test dedicati a rinnovi previsti e WhatsApp,
senza invii reali. Non si dichiara che i due archivi ricompilati siano identici.

## Prove

- Checkout temporaneo del candidato dalla stessa repository, senza worktree del
  progetto; dipendenze proprie installate con `npm ci --ignore-scripts --no-audit
  --no-fund` dal lockfile, Node `24.14.1` nel range dichiarato.
- Suite completa `bash scripts/check-calendar-release.sh` superata sul commit
  finale pulito, incluso il controllo Git: `OK: pacchetto Calendario completo
  e verificato`. Nessun controllo disattivato o saltato.
- `node --test --test-reporter=tap tests/calendar-expected-renewals.test.cjs
  tests/whatsapp-agenda.test.cjs`: 13 test superati, 0 falliti, 0 saltati.
- `calendar-alert-guide-browser.cjs` superato sul candidato, sull’anteprima
  finale e sul sito pubblico: nove alert, riepilogo completo, collegamenti,
  tastiera, desktop 1440 px, mobile 390 px, nomi con markup, visibilità PT e
  assenza di scritture. In anteprima e produzione gli asset provengono davvero
  da Netlify; tutte le API della prova browser usano dati sintetici intercettati.
- Manifest completo, hash dei tre asset e commit verificati sia in anteprima
  sia in produzione. Accesso anonimo reale a `calendar-activity` respinto con
  401. Nessuna lettura di clienti reali o modifica di dati tramite le verifiche.
- `git diff --check` superato. Nessuna migrazione, modifica di credenziali,
  invio email/WhatsApp o pubblicazione di altri siti effettuati dalla procedura.

## Configurazione e stato Git finale

Produzione bloccata sul deploy verificato. Ripristinati branch di produzione
`main`, build sospese e rami ammessi `[main]`, come all’avvio. Il rilascio è
avvenuto tramite build Git, senza pubblicare o ripristinare vecchi deploy.

Il checkout operativo resta su `feature/whatsapp-agenda-pt-v1` con modifiche e
file non tracciati preesistenti conservati; durante il lavoro è stato aggiornato
anche da altre chat (HEAD osservato alla verifica finale `105650c`). Il candidato
e le prove sono salvati nel branch dedicato: i commit documentali successivi non
cambiano il commit sorgente online indicato sopra. Nessun reset, stash globale
o spostamento delle lavorazioni locali.

Non restano passaggi esterni per questa modifica. Nelle pagine già aperte
ricaricare il Calendario e toccare un alert o “Alert gestione”.

[Manifest iniziale](20261105-calendar-alert-guide-baseline.json) ·
[Prove di anteprima e produzione](20261105-calendar-alert-guide-published.json) ·
[Dettagli funzionali](20261105-calendar-alert-guide.md)
