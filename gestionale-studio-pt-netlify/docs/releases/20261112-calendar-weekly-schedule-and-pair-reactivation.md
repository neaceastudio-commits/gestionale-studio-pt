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

## Stato alla preparazione del candidato (superato dalla pubblicazione sotto)

Nessuna migrazione di questa modifica è stata applicata al progetto Supabase di produzione e nessun deploy Calendario è stato eseguito. Silvia Cherchi resta invariata. Le due migrazioni necessarie sono:

- `20261112103135_calendar_package_schedule.sql`
- `20261112104008_calendar_reactivate_historical_pair.sql`

Dopo esplicita autorizzazione: ricontrollare la versione online, applicare le migrazioni verificate nell’ordine indicato e pubblicare soltanto il candidato Calendario; verificare sito, commit, asset e funzionamento essenziale senza modificare clienti reali. La conversione della coppia sarà una scelta esplicita dell’operatore nel nuovo flusso.

## Pubblicazione autorizzata — 12 novembre 2026

Pubblicato alle 12:19 ora italiana su [Calendario](https://new-calendar-neacea.netlify.app). Commit applicativo `1aa9aec066ce582ed622125016d53025a5473cee`, branch `codex/calendar-weekly-schedule`; deploy produzione `6af5a0b8472c604c445e6868`, anteprima verificata `6af5a0509cb2cfc6beed313d`. Il candidato iniziale `691457d` non è stato pubblicato: la prima anteprima ha rilevato una dipendenza mancante quando Netlify copia le funzioni. Corretto `tools/prepare-calendar-shared-function.cjs` per includere il modulo condiviso degli orari e aggiunto `tests/calendar-function-build.test.cjs`; riprodotto il fallimento precedente e superata la compilazione delle 16 funzioni. Suite completa rieseguita sul candidato pulito `1aa9aec`: passata.

Migrazioni applicate tramite Supabase MCP nel progetto `cdywqyqqmjhgkzwrrixc`, in ordine: `calendar_package_schedule` (versione remota `20261112111749`, file locale `20261112103135_calendar_package_schedule.sql`) e `calendar_reactivate_historical_pair` (versione remota `20261112111759`, file locale `20261112104008_calendar_reactivate_historical_pair.sql`). Controllate esistenza, SECURITY INVOKER, search_path, revoche ad anon/authenticated, accesso service_role, RLS delle ricevute e rifiuto di un attore non autorizzato. Le ricevute del nuovo piano restano vuote.

Verificati manifesto pubblico completo (47 file), sette asset modificati con hash corrispondenti, stessa configurazione delle 16 funzioni e delle due pianificazioni; 11 archivi funzione identici. I cinque ricompilati sono verificati tramite chiusura delle sorgenti; il solo scheduler WhatsApp è riconfezionato senza cambi alle sorgenti. Richiesta anonima al gateway: 401. Impostazioni ripristinate: branch di produzione `main`, build automatiche ferme, rami ammessi `[main]`, deploy pubblicato bloccato.

Browser reale con asset sia dell’anteprima sia dell’indirizzo pubblico Netlify: passati piano/anteprima, errore e retry, riapertura, modifica singola seduta e riattivazione/conversione coppia, usando database locale e persone sintetiche. Nessuna operazione reale sui clienti: Silvia resta ibernata con due lezioni residue; hash completi di Silvia, compagno e relativi appuntamenti invariati prima/dopo le migrazioni.

Il dominio personalizzato `calendario.neacea.com` riportato nella configurazione Netlify non risolve: ENOTFOUND locale e NXDOMAIN dal DNS pubblico (status 3). La verifica pubblica riuscita riguarda l’indirizzo Netlify sopra; non è stata modificata la configurazione DNS.

Confronto advisor sicurezza prima/dopo: nessun nuovo WARN/ERROR. Un solo nuovo INFO [RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) su `calendar_schedule_receipts` è intenzionale: tabella privata al gateway service_role, nessun permesso anon/authenticated. Segnalazioni precedenti fuori ambito invariate.

Il rapporto e il JSON di verifica sono registrati con un commit di sola documentazione successivo al commit applicativo pubblicato. Checkout ordinario preservato su `feature/whatsapp-agenda-pt-v1`, HEAD `233e240`; indice SHA256 `9337cf156cf663b4677f9e466eb3b3a2f84c96cfb11b4ef8cda395d56fff1d9d`, altre lavorazioni conservate. Il nuovo flusso è disponibile: l’operatore sceglie il partner alla riattivazione; nessuna conversione reale eseguita automaticamente dal rilascio.
