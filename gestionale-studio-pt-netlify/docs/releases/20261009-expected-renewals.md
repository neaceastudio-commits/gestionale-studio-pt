# Rinnovi previsti — 9 ottobre 2026

## Regole approvate

A due lezioni residue viene preparato un solo pacchetto successivo per cliente o coppia associata. Il piano copia numero di lezioni, importo, giorni del ciclo corrente e orari/PT abituali. Gli orari mancanti o variabili richiedono revisione della Direzione; non vengono inventati. La generazione automatica gira ogni dieci minuti sul sito Calendario.

Le prenotazioni sono visibili nel Calendario e in Apple come «Rinnovo da confermare». Conservano gli identificativi durante modifiche e conferma. La Direzione trova «Rinnovi previsti» nella barra superiore: Conferma rinnovo, Modifica proposta, Non rinnova. Può cambiare giorni/frequenza, orari, PT, durata, quantità e importo prima della conferma. Le lezioni già svolte restano intatte.

La conferma può precedere la fine del vecchio ciclo. Il nuovo ciclo diventa corrente solo quando il residuo precedente è zero e non restano prenotazioni del vecchio ciclo da chiudere. Nel frattempo le presenze del nuovo ciclo non consumano il vecchio pacchetto; all'attivazione vengono riportate nel nuovo saldo. Nessun pagamento viene registrato dalla conferma.

Ogni PT 1:1 svolto matura €10/ora, anche se simultaneo ad altri PT 1:1; la coppia resta un appuntamento da €15/ora con consumi indipendenti e assenze scalate a entrambi. I PT temporanei vedono anche le prenotazioni del rinnovo e mantengono i permessi di sola compilazione della scheda.

«Non rinnova» annulla le prenotazioni da oggi in avanti, conservando storico e lezioni svolte. Un rinnovo rifiutato non viene rigenerato automaticamente per lo stesso ciclo. Clienti inattivi/ibernati non generano proposte. Una proposta non confermata non genera altri pacchetti.

Le coppie con quantità diverse vengono proposte alla Direzione per revisione della programmazione condivisa; nessun residuo viene uniformato automaticamente.

## Implementazione

- Migrazione `20261009095441_calendar_expected_renewals.sql`: proposte, partecipanti e appuntamenti collegati, idempotenza per ciclo, aggiornamenti atomici, controllo concorrenza, registro attività e blocco di rinnovi manuali duplicati. Tabelle service-only con RLS; accesso Direzione verificato nel gateway e nel database.
- `netlify/functions/lib/expected-renewals.js`: ricostruzione prudente della ricorrenza, generazione e attivazione.
- `expected-renewals-scheduled.mjs`: pianificazione automatica sul solo sito Calendario.
- Interfaccia `app/calendario-studio/js/expected-renewals.js`; etichette calendario, feed Apple e agenda PT.
- I moduli Apple di rappresentazione vengono aggiornati mantenendo invariati il resto del worker CalDAV, le credenziali, le pianificazioni e gli UID.

## Verifiche

260 test automatici passati, incluse transazioni reali simulate in PostgreSQL/PGlite. Nuovi casi: saldo corrente isolato, presenza prima della conferma, attivazione con consumi riportati, nessun incasso, permessi, retry, modifica date coppia, presenze miste, rifiuto con conservazione storico, feed Apple e visibilità PT.

Prove Chrome mobile: modifica da due a tre giorni, errore concorrente con dati del modulo conservati, conferma; regressione coppie e pagamenti PT. Verificata parità del calendario prodotto dai quattro bundle Apple con le sorgenti.

## Pubblicazione

Autorizzata dall'utente: «perfetto pubblichiamo anche ultima modifica». Identificativi delle release e verifica della prima generazione da completare dopo la pubblicazione.
