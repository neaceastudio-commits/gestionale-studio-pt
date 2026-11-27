# Portale PT: alleggerimento e isolamento dei salvataggi

## Origine e perimetro

Baseline pubblicata verificata: deploy `6b09c15ad37b00f111899622`, frontend del commit
`69027a43ff52cfed989cc115513521d9bbfceeac` sul ramo `fix/pt-explicit-completion-20261127`.
L'HTML e tutti i 12 script esterni scaricati dal sito corrispondono al commit.
Il ramo `main` non è la sorgente della release corrente. Il backend di questo
checkout è precedente alla produzione: NON distribuire l'intero repository.

Cambiano soltanto tre asset pubblici:

- `index.html`
- `js/data-reader.js`
- `js/session-log.js`

Nessuna modifica di database, permessi, API server, dati reali, Coaching o Calendario.

## Comportamento

- Editor, scheda operativa, catalogo esercizi, elenco programmi e Hand Grip si
  disegnano quando la relativa schermata è aperta. Non si sincronizza due volte
  l'editor durante lo stesso aggiornamento. L'apertura della vista prepara i dati
  visivi aggiornati; il formato dei programmi e le conversioni storiche restano.
- Rimosso il renderer alternativo delle schede: se manca l'editor corrente viene
  mostrato un messaggio, senza aprire un editor differente sullo stesso programma.
- Le letture contemporanee identiche condividono la richiesta soltanto durante
  il caricamento, separatamente per token e parametri. Ogni chiamante riceve una
  copia indipendente; non c'è cache persistente e le scritture non sono accorpate.
- Il refresh del cliente è sospeso nelle viste non pertinenti. L'apertura della
  scheda attende un refresh già iniziato e può riusarne il risultato appena ricevuto.
- Le bozze delle sedute impediscono il refresh solo del cliente interessato;
  restano recuperabili anche se il PT passa ad altro cliente.
- Risposte definitive 4xx ai salvataggi del programma interrompono i retry
  automatici. Il messaggio chiede di verificare accesso/dati e riprovare manualmente.
  Rete, timeout, 429 e 5xx mantengono il retry. Le ricevute già ottenute vengono
  conservate, così una verifica fallita non riemette una scrittura confermata.
- Richiesta codice, verifica codice e verifica sessione usano un unico percorso
  con timeout di 15 secondi. Un controllo di avvio segnala asset critici mancanti
  e mantiene disponibile la ricarica, senza cancellare bozze locali.

## Verifica riproducibile

Dalla radice del repository:

```sh
npm ci
npm run test:pt
```

Esito: 53 test superati, zero fallimenti, zero test saltati; sintassi valida per
15 script frontend. Prove JSDOM eseguono il frontend completo con dati sintetici:
avvio, asset mancante, rendering delle viste al bisogno e assenza del fallback
precedente. Test dedicati coprono letture concorrenti/token diversi, risposta
frammentata, timeout accesso, errori 401/422/5xx, bozze offline tra clienti,
riapertura e completamento esplicito durante un salvataggio. Sono inclusi i
controlli esistenti su modelli, assegnazioni, carichi, note, Hand Grip e mesocicli.
Le prove PostgreSQL usano PGlite locale. Nessuna richiesta di scrittura ai clienti reali.

Limiti: nessun collaudo su iPad/Safari fisico, nessuna misura di latenza reale;
nessuna attribuzione del guasto precedente a una causa non dimostrata.

## Pacchetto e rilascio

Dopo il commit:

```sh
node gestionale-studio-pt-netlify/scripts/prepare-pt-release.cjs HEAD /tmp/pt-release-candidate
```

Il comando legge il commit, rifiuta modifiche frontend non committate o fuori
perimetro, verifica che server/configurazione siano invariati e produce i soli
tre asset con SHA-1/SHA-256 e commit sorgente. Non pubblica nulla.

Per pubblicare, acquisire con accesso Netlify un inventario completo del deploy
baseline (file, funzioni, pianificazioni, header e redirect), verificare che sia
ancora in produzione, sostituire soltanto i tre asset e creare un deploy di prova.
Confrontare l'inventario e gli hash, verificare avvio e percorsi autenticati senza
scritture su clienti reali, quindi effettuare il rilascio isolato autorizzato.
Una produzione diversa dalla baseline richiede riconciliazione, non sovrascrittura.

Stato di questa consegna: candidato verificato, non pubblicato. Il connettore
Netlify disponibile nella sessione espone lettura dei deploy ma non creazione/
caricamento, e non è presente una credenziale CLI Netlify. Non usare come scorciatoia
il build dell'intero ramo: potrebbe sostituire funzioni server più recenti.
