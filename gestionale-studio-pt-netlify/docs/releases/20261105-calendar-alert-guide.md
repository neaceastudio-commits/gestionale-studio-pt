# Calendario — Spiegazioni e possibili soluzioni degli alert

Stato: **preparato e collaudato localmente**, non pubblicato.

Applicazione: Gestionale Studio PT, modulo Calendario.
Branch: `feature/whatsapp-agenda-pt-v1`.
HEAD rilevato all’avvio: `d242d2c`; alla verifica finale: `b174dc0`.
La chat non ha eseguito commit o push; il checkout conteneva già lavorazioni
locali e nel frattempo è stato aggiornato anche da attività esterne alla chat.

## Comportamento

Gli alert della lista Clienti e della dashboard sono pulsanti con una guida:
“Cosa significa”, “Cosa puoi fare” e collegamento alla schermata pertinente.
Il contatore “Alert gestione” apre tutti i clienti attivi visibili con avvisi;
il numero rappresenta i clienti, non la somma degli alert. La dashboard conserva
il limite di sei clienti e due etichette per cliente, con un pulsante per leggere
tutti gli avvisi del cliente. Il clic sul resto della riga mantiene l’accesso
alla lista Clienti.

| Alert | Percorso proposto |
|---|---|
| Sessioni totali mancanti | Modifica pacchetto, dopo riscontro delle sedute acquistate |
| Conferma il ciclo corrente | Quadro pacchetto: verifica e conferma della separazione dallo storico |
| Residuo da riallineare | Verifica sedute, ciclo, assenze scalate e rettifiche; poi eventuale Allinea residuo nella lista Clienti |
| Pacchetto quasi finito | Verifica della prosecuzione e dei rinnovi, distinta dall’incasso |
| Sedute da programmare | Controllo delle prenotazioni fuori ciclo prima di generare le mancanti |
| Sedute oltre pacchetto | Verifica delle singole sedute, duplicati, stati e rinnovi |
| Nessun prossimo appuntamento | Verifica agenda, prenotazioni passate e possibili pause |
| Pacchetto completato | Valutazione del rinnovo o archiviazione “Non rinnova” |
| Pagamento aperto | Riscontro incassi e associazioni Scadenze, evitando registrazioni duplicate |

I promemoria sono distinti dalle incongruenze: la guida non promette una
correzione automatica. I collegamenti aprono le funzioni già disponibili e non
salvano dati. Le condizioni, le etichette e l’ordine degli alert preesistenti
sono preservati; `metrics.alerts` rimane un elenco di stringhe, con
`alertDetails` aggiuntivo per la guida.

Restano applicati visibilità e controlli del Calendario: il PT vede i propri
clienti, può aprire le lezioni e modificare il pacchetto nei limiti esistenti;
pagamenti, rinnovi, archiviazione e riallineamento rinviano alla Direzione.
Gli alert finanziari restano esclusi dalla modalità PT. Nessuna modifica ad
API, autorizzazioni server, database, contratti condivisi o dati storici.

## File

- `app/calendario-studio/js/clients.js`: contenuti, riepilogo, guide e navigazione.
- `app/calendario-studio/css/ui-fixes.css`: pulsanti, focus e guide su mobile.
- `app/calendario-studio/index.html`: versioni degli asset CSS e JS aggiornate.
- `tests/calendar-alert-guide-browser.cjs`: prova sui nove tipi di alert.
- `tools/coaching-editor/check-calendar-clients.cjs`: aggiunta della prova al
  controllo clienti richiamato dalla suite di rilascio già esistente.

## Prove del 5 novembre 2026

Runtime Node `24.14.1`, conforme al range dichiarato, e Playwright `1.56.1`
dalle dipendenze del repository. Nessuna dipendenza aggiunta. Il Calendario usa
asset statici: verificati sintassi e caricamento nel browser, senza build del
Portale PT estraneo a questa modifica.

- `node --check app/calendario-studio/js/clients.js`: superato.
- `node tests/calendar-alert-guide-browser.cjs`: superato su asset reali e dati
  sintetici. Copre tutti i nove alert, riepilogo oltre il limite dashboard,
  apertura dalle righe senza attivare la modifica anagrafica, collegamenti a
  modifica pacchetto/lezioni/pagamenti, tastiera, viewport 1440 e 390 px,
  nomi con markup, isolamento della vista PT e assenza di scritture.
- Verifica visiva delle guide a 390 px: testo e azioni leggibili, corpo modale
  scorrevole, chiusura disponibile, nessuno scorrimento orizzontale della guida.
- `bash scripts/check-calendar-release.sh`: i controlli di comportamento prima
  del controllo Git finale sono superati, inclusa la nuova prova browser.
  **Il comando termina con exit 1** al controllo Git perché i file critici
  contengono modifiche non in commit. Non è una suite di rilascio interamente
  verde né la dimostrazione di una protezione remota attiva.
- `git diff --check`: superato.

Chromium non si avvia nella sandbox macOS; le prove browser sono state eseguite
con esecuzione estesa autorizzata dal controllo automatico. Nel nuovo test tutte
le richieste sono intercettate; i servizi esterni sono simulati. La prova non
dimostra persistenza su database remoti e non la richiede per questa modifica
di consultazione.

## Stato Git e prossimo passo

File tracciati modificati per questo passo: `clients.js`, `ui-fixes.css`,
`index.html` (quest’ultimo e `clients.js` avevano già modifiche locali).
Nuovi file: test browser e questo rapporto. Lo script
`tools/coaching-editor/check-calendar-clients.cjs` era già presente come file
non tracciato ed è stato esteso senza sostituirne i controlli.
Le altre lavorazioni del checkout sono conservate. Nessun commit, push, deploy,
migrazione o modifica di servizi esterni eseguiti da questa chat.

Prossimo passo, su richiesta esplicita di pubblicazione: individuare il commit
effettivamente online, preparare in Git il candidato limitato al Calendario,
ricollaudarlo, pubblicarlo e verificare gli asset e l’interfaccia online.
