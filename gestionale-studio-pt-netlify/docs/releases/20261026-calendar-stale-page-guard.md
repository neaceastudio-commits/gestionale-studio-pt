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
