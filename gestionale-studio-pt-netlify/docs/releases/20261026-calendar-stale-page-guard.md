# Calendario — impedire salvataggi da pagine precedenti

## Causa verificata

Produzione di partenza: commit `5c3c2b5`, deploy `6adf69f5f0d7ca2465d67586`.
La correzione del fallback cliente era online, ma la pagina Safari aperta
continuava a eseguire il codice precedente. Il fallback eliminava anche
`pt_assegnato` dopo gli errori sulle colonne assenti: il server accettava il
resto della scheda e il vecchio programma mostrava successo senza trasferire.
I log delle 15:33–15:34 UTC e i corrispondenti audit confermano il referente
invariato. Il caso reale è stato risolto separatamente dopo autorizzazione.

Il controllo di compatibilità server esisteva, ma il rilascio aveva conservato
`20261009s`: accettava quindi anche quel vecchio client. La nuova riproduzione
è fallita sul codice precedente: scrittura vecchia accettata (200 invece di
409), versione server assente dalla sessione, versione nuova rifiutata.

## Correzione

- Protocollo `20261026-client-save-v2` richiesto prima di tutte le operazioni
  modificative del Calendario. Le pagine precedenti ricevono 409 e
  `CALENDAR_RELOAD_REQUIRED` prima di qualunque RPC. Identità e permessi
  continuano a essere verificati prima; gli altri gateway conservano il loro
  contratto e i loro controlli.
- Sessione autenticata espone la versione richiesta. La pagina aperta controlla
  ogni 60 secondi quando visibile, al ritorno della finestra e della scheda.
  Avviso persistente con ricarica esplicita; nessuna ricarica automatica.
  Un rifiuto server sospende anche i tentativi successivi. Nessun refresh dei
  dati/render causato da questo rifiuto, così il modulo in compilazione resta.
- Il gateway browser controlla anche la versione effettiva di SupabaseSync:
  una combinazione di script di versioni diverse non abilita i salvataggi.
  Indirizzi degli asset aggiornati e HTML con rivalidazione esplicita.
- Restano il PATCH minimo del trasferimento, la rilettura separata prima del
  successo e il fallback che rimuove solo le colonne esplicitamente assenti.
  Nessun cambio a pacchetti, appuntamenti o assegnazioni reali in questo passo.

## Prove

Node 24.14.1 e dipendenze del lockfile `tools/coaching-editor`.
`node tools/coaching-editor/check-calendar-clients.cjs`: 18 test Node/API/SQL,
regressioni fallback e trasferimento, quattro suite browser superati.
Prova browser dedicata estesa a sei casi: focus, visibilità, timer di un
minuto, rifiuto server, script misti, rete assente. Conservazione della bozza,
nessun reload automatico e nessun falso successo. Dati/API browser sintetici.
Il primo Chromium confinato non si avviava; esecuzione consentita riuscita.

Il test server riproduce espressamente la revisione della vecchia pagina e
verifica zero chiamate RPC per tredici operazioni. Il test Studio verifica
che le altre origini mantengano salvataggio e autorizzazioni. Prova dei marker
fra HTML, gateway browser e SupabaseSync per impedire un insieme incoerente.

## Rilascio e manutenzione

Preparare dal commit effettivamente pubblicato, preservando le lavorazioni
locali. Usare rilascio Git, testare il candidato pulito e verificare asset e
bundle online. Nessuna migrazione richiesta. Per futuri cambi incompatibili
al salvataggio aggiornare insieme protocollo server, marker browser e URL
asset; mantenere la riproduzione della revisione precedente.

Stato al momento della preparazione: ramo locale
`feature/whatsapp-agenda-pt-v1`, HEAD `65cfcc6`; modifiche preesistenti
conservate. Il gate Git sul checkout con lavorazioni pendenti non equivale al
controllo del candidato isolato. Esiti del rilascio da annotare sotto.


## Esito pubblicato — 26 ottobre 2026

Candidato applicativo `a07c675`; candidato finale con fixture gestita
`93f2b47d82f8503d4aa8831431b09ea996ee9673`, branch
`release/calendar-save-guard-20261026`. Suite `check-calendar-release.sh`
interamente superata sul candidato finale pulito, incluso il gate Git.
Dipendenze installate con `npm ci --ignore-scripts` dal suo lockfile.

Anteprima `6adf78218813adf31c7dff9e`: manifesto completo confrontato,
quattro file modificati (_headers, HTML, audit, supabase), tre asset pubblici
uguali al commit, rivalidazione HTML verificata su / e /index.html,
API anonima 401, flusso browser mobile con backend sintetico superato.

Collaudo autenticato `6adf786564f5e0db267e7875`, commit temporaneo
`d01905d`: stesso digest della funzione Calendar dell'anteprima e della
produzione. Verificati sul vero Supabase: revisione vecchia respinta,
record identico prima/dopo il rifiuto, versione annunciata dal server,
cambio referente persistito/riletto, gruppo, conflitto, idempotenza,
autorizzazioni e pacchetto invariato. Il wrapper temporaneo richiede capacità
casuale tenuta solo in memoria e scade dopo dieci minuti; solo ID sintetici
fissi. I record sintetici sono stati rimossi: clienti, operatori e relazioni
conteggiati a zero; audit immutabile conservato. Ramo temporaneo remoto rimosso.

Produzione effettiva `6adf78c1f4bf11fc29104b82`, commit `93f2b47`,
pubblicata alle `2026-10-26T15:59:21.079Z`.
La build esplicita `6adf78c3fb6aea4ed5d20d1e` non è il deploy pubblicato:
il cambio ramo ha avviato una build automatica dello stesso commit.

Verifica online: 43 file, tre asset confrontati byte per byte, 15 funzioni,
due pianificazioni invariate, runtime/configurazioni conservati, dieci digest
funzioni invariati. Tre gateway ricompilati per la libreria comune; i sorgenti
delle due funzioni pianificate restano identici, con riconfezionamento dei
bundle. Digest Calendar collaudato e pubblicato:
`482ba69dead001721fb7749b47d8f2674316f2d8daf9e70b396aba7645b3acba`.
Prova browser su asset di produzione e API sintetiche superata. Rilettura
indipendente conferma entrambe le clienti reali ancora con Alessandro e
pacchetti/residui invariati. Nessun dato reale scritto da questi collaudi.

Netlify finale: deploy locked, ramo main, build sospese, soli rami main ammessi.
Il cambio della configurazione repository ha reimpostato `stop_builds` a false:
il controllo finale l'ha rilevato; ripristino esplicito a true e nuova verifica
riuscita. Lo script di rilascio conserva ora questo passaggio dopo il cambio ramo.
Nessuna migrazione, nessun altro sito pubblicato. Prove esportate nel JSON
`20261026-calendar-save-guard-published.json` e verificatore ripetibile
`tools/calendar-update-release-verify.cjs`.

Stato Git conclusivo: checkout ancora `feature/whatsapp-agenda-pt-v1` /
`65cfcc6`; lavorazioni precedenti conservate, candidato e prove salvati sul
ramo di rilascio. `git diff --check` superato. Prossimo passo operativo:
ricaricare una volta le pagine già aperte per caricare anche il nuovo avviso;
il server respinge già i loro salvataggi precedenti. Per i prossimi rilasci
mantenere la prova di rifiuto della revisione sostituita.
