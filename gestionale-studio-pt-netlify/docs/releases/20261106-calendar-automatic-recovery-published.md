# Calendario — recupero automatico pubblicato

**Pubblicato e verificato il 6 novembre 2026 alle 15:20, ora italiana**,
dopo l'autorizzazione esplicita a migrazione e pubblicazione.

“Annullata · da recuperare” conserva la seduta annullata e genera automaticamente
il recupero seguendo il pacchetto. Per PT 1:2 crea un solo appuntamento con entrambi
i partecipanti. Se l'orario è occupato salva comunque e mostra un alert persistente.
L'annullamento e il recupero sono una transazione; il retry non duplica la seduta.
Ricaricare il Calendario una volta per usare la nuova interfaccia.

## Versioni effettive

| Elemento | Valore |
|---|---|
| Sito | `https://new-calendar-neacea.netlify.app/` |
| Produzione precedente | `701e4e90f7fa947c1d9886e28d79cfb64339906b`, deploy `6aecaa91b88b57d167ca1f13` |
| Branch di rilascio | `release/calendar-automatic-recovery-20261106` |
| Commit sorgenti collaudato e pubblicato | `53923f6a1dfd1f5811df81000df38ad4a361c8ff` |
| Anteprima collaudata | `6aede1727d389affca1bea32` |
| Produzione confermata | `6aede220376837392dd635d0` |
| Timestamp Netlify | `2026-11-06T14:20:34.491Z` |
| Migrazione applicata | `20261106141731`, `calendar_automatic_recovery` |
| Sorgente SQL nel commit | `20261106114015_calendar_automatic_recovery.sql` |

## Ambito e prove

Il candidato deriva dal commit effettivamente online, con indice Git isolato
e checkout temporaneo fuori da Studio. Il checkout principale e il suo indice
non sono stati usati per pubblicare file non pertinenti. Dipendenze installate
con `npm ci` dal lockfile del candidato; Node 24.14.1.

Cambiano sei asset: `index.html`, `css/ui-fixes.css` e i moduli JS `app`, `services`,
`supabase`, `pt-pair-sessions`. Unico sorgente server modificato:
`netlify/functions/lib/calendar-audit-endpoint.js`. Configurazione di build,
lockfile, registro economico, rinnovi e gli altri asset pubblici conservati.
La normalizzazione orari preparata in un'altra lavorazione non è inclusa.
Il precedente SQL di riprogrammazione rinnovi è registrato nel candidato
solo come dipendenza dei test: non è stato riapplicato sul database.

- 24 test dell'automatismo/gateway/recuperi superati sul candidato.
- Concorrenza: due connessioni PostgreSQL locali indipendenti, un solo recupero.
- Browser locale e anteprima: errore, risposta persa, retry, riapertura,
  residui e coppia conservati, alert nello slot occupato.
- Suite completa `check-calendar-release.sh` superata, compreso il controllo
  finale Git, sul commit isolato pulito. Un avvio aveva usato Node 26 ed era
  stato fermato dal controllo runtime; rieseguito correttamente con Node 24.
- Migrazione reale applicata e riletta: tre funzioni SECURITY INVOKER;
  esecuzione solo `postgres` e `service_role`, nessun nuovo accesso browser.
- Prova sulla struttura reale Supabase: operatore, clienti e sedute sintetici,
  recupero di coppia da una presenza, rimborso, sovrapposizione, retry e rilettura.
  L'intera sottotransazione è stata annullata e il database è stato riletto:
  nessun record sintetico rimasto. Nessun appuntamento o cliente reale modificato.
- Manifest online completo di 44 file confrontato con commit e anteprima:
  differenze limitate ai sei asset previsti. Verificati anche gli hash serviti
  dall'indirizzo pubblico e il commit del deploy tramite connettore Netlify.
- Undici archivi funzioni identici; tre gateway ricompilati per il solo modulo
  condiviso previsto. Due scheduler ricompilati da Netlify: verificata l'intera
  catena delle importazioni, identica alla produzione precedente. Frequenze,
  configurazione e numero delle funzioni conservati.
- API anonima rifiutata con HTTP 401. Test browser rieseguito con gli asset
  effettivi di produzione, mantenendo i salvataggi sul database locale sintetico.
- Avvisi di sicurezza Supabase invariati rispetto alla lettura precedente.
- `git diff --check` superato.

Le prove browser con servizi simulati e la prova transazionale sul database
reale sono distinte: non è stata creata una prenotazione di prova persistente
nella produzione dei clienti. Non è stato attivato alcun nuovo blocco CI remoto.

## Configurazione e Git finali

Ripristinati ramo Netlify `main`, build automatiche ferme e rami ammessi
`["main"]`; il deploy pubblicato è bloccato come nella configurazione iniziale.
Nessun altro sito pubblicato e nessun lavoro preesistente incluso nel candidato.

Checkout principale ancora su `feature/whatsapp-agenda-pt-v1`, HEAD `105650c`.
Indice principale invariato, SHA-256 dell'inventario:
`2329ae3e1cc938792a0e398ec937779ed6f1dbe7f7db657a608e1bdd921252be`.
Restano le modifiche e i file non tracciati delle lavorazioni precedenti;
il candidato di rilascio temporaneo è pulito. Prove e script di pubblicazione
sono conservati in Git sul ramo del rilascio senza spostare il checkout principale.

Nessun passaggio esterno ancora necessario per attivare questa modifica.
Le cancellazioni storiche non sono state riprogrammate retroattivamente.
Il prossimo controllo operativo è il primo annullamento reale deciso dall'utente.

[Manifest e prove strutturate](20261106-calendar-automatic-recovery-published.json).
[Implementazione e prove locali](20261106-calendar-automatic-recovery.md).
