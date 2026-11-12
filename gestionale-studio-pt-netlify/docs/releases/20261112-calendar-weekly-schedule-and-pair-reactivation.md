# Calendario — piano settimanale e riattivazione in coppia

## Risultato

Elenco e piano conserva la modifica della singola seduta e sostituisce le sezioni duplicate con un cambio dei giorni e degli orari abituali da una data. L’anteprima server mostra le lezioni prima e dopo, segnala sovrapposizioni e capacità sala; la conferma sposta atomicamente le prenotazioni del ciclo corrente. Rimangono gli stessi identificativi, PT, durata, storico, lezioni residue, pagamenti e data d’inizio. Le proposte successive e i recuperi seguono il piano effettivo.

La riattivazione di un cliente PT 1:2 chiede il compagno attivo dello stesso PT. Il riepilogo mostra la riattivazione e l’eventuale conversione del compagno da PT 1:1 a PT 1:2; un’unica operazione conferma entrambi. Restano separati residui e dati economici. Gli appuntamenti esistenti mantengono servizio e orari; le nuove sedute condivise si pianificano dopo. Nessun cliente reale è stato convertito o riattivato per provare questo flusso.

## Candidato isolato

Base effettivamente pubblicata verificata: `d319a20537eae8a7dbe77b751f5c900bc8284535`, deploy Netlify `6af4421751ef5248e52c4899`, sito `28855faa-de52-4e4c-b1c2-e2db4965670f` (Calendario). Il candidato è registrato sul branch `codex/calendar-weekly-schedule` con questa base come unico genitore. Non include le altre lavorazioni locali. Il checkout ordinario resta su `feature/whatsapp-agenda-pt-v1`, HEAD `233e240`; indice conservato.

File principali: `app/calendario-studio/js/package-schedule.js`, `client-reactivation.js`, integrazioni `app.js`, `clients.js`, `supabase.js`, CSS dedicato; gateway `calendar-audit-endpoint.js`; `expected-renewals.js`; due migrazioni e quattro suite nuove. Il dettaglio esatto è nel diff Git del candidato.

## Verifiche

Runtime Node 24.14.1 e dipendenze dichiarate dal repository. Riproduzione della precedente associazione non reciproca e dell’assenza del nuovo flusso. Test SQL PGlite con record sintetici: piano individuale e coppia, anteprima senza scritture, persistenza con stessi ID e dati economici, retry senza duplicazioni, rollback completo, permessi, dati obsoleti, decorrenza/ciclo, sovrapposizioni e capacità sala. Test di concorrenza su PostgreSQL con due connessioni reali: una presenza registrata durante l’anteprima blocca il salvataggio obsoleto e resta intatta.

Browser reale con applicazione/gateway effettivi e database locale PGlite; autenticazione e trasporto adattati al test. Verificati errore, risposta persa e retry, rilettura indipendente, riapertura, cambio di piano e coppia, modifica singola seduta; controllo visivo desktop e mobile. Questi controlli non equivalgono a una prova su dati di produzione. Suite completa: `bash scripts/check-calendar-release.sh` nel checkout pulito del candidato.

## Stato esterno e prossimo passo

Nessuna migrazione di questa modifica è stata applicata al progetto Supabase di produzione e nessun deploy Calendario è stato eseguito. Silvia Cherchi resta invariata. Le due migrazioni necessarie sono:

- `20261112103135_calendar_package_schedule.sql`
- `20261112104008_calendar_reactivate_historical_pair.sql`

Dopo esplicita autorizzazione: ricontrollare la versione online, applicare le migrazioni verificate nell’ordine indicato e pubblicare soltanto il candidato Calendario; verificare sito, commit, asset e funzionamento essenziale senza modificare clienti reali. La conversione della coppia sarà una scelta esplicita dell’operatore nel nuovo flusso.
