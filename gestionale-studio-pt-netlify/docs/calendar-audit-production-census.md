# Censimento dopo adattamento production — 13 settembre 2026

Ambito: contenuto committato del branch audit, cinque entità operative (`appointments`, `clients`, `operators`, `operator_availability`, `trainer_client_assignments`), RPC e componenti effettivamente pubblicati. Nessuna modifica ai servizi reali. Le modifiche locali estranee non committate non sono un candidato release.

La scansione comprende tutti i file tracciati JS/HTML/SQL/script, wrapper REST generici e relativi chiamanti, RPC, Functions, pagine legacy e configurazioni. Le evidenze production sono quelle del censimento in sola lettura: non costituiscono un nuovo deploy.

| Componente | File/funzione | Scrittura | Identità | Audit dopo migration | Classificazione | Azione |
|---|---|---|---|---|---|---|
| Calendario | js/calendar.js, app.js, session-fixes.js → supabase.js → calendar-audit.js | appuntamenti creazione/spostamento/stato/PT/servizio/delete | sessione verificata + ruoli live | sì, gateway e trigger atomici | OK_AUDITED | rilasciare codice e Functions coordinati |
| Calendario | js/clients.js, package-ledger.js, nutrition-fixes.js → supabase.js | clienti/pacchetti/residui/dati editor | sessione verificata | sì; whitelist operativa, dettagli privati omessi | OK_AUDITED | rollout coordinato |
| Calendario | js/operators.js → supabase.js | operatori | Direzione verificata | sì | OK_AUDITED | rollout coordinato |
| Calendario | js/pt-availability-overview.js, startAvailabilitySync | disponibilità solo modifiche esplicite | PT proprio/Direzione | sì, confronto normalizzato e no-op | OK_AUDITED | apertura GET, cache mai caricata sul DB |
| Calendario | app.js _importFile/syncLocalToSupabase; supabase.js pushLocalSnapshot | vecchio import e bulk sync | nessuna | nessuna scrittura consentita | BLOCKED_BY_DESIGN | mantenere disabilitati |
| Calendario | js/state.js, services.js, backup/reset locale | stato UI/letture | locale | nessuna scrittura delle entità censite | READ_ONLY | nessuna |
| Acquisizione | index.html gateway client, activation-calendar-integration.js | attivazione/aggiornamento cliente | Direzione verificata | sì, client audit | OK_AUDITED | rilasciare pagina e Functions |
| Acquisizione/Pianifica pacchetto | schedule-client-package.js, app/pianifica-pacchetto | calendar_audit_write(package) → calendar_commit_package | Direzione verificata | sì, intero pacchetto atomico | OK_AUDITED | dry-run resta sola lettura |
| Portale PT production | app/portale-personal-trainer/index.html openCalendar | delega scritture al Calendario | token trasportato anche da Direzione | sì nel Calendario | OK_AUDITED | rilasciare link aggiornato |
| Portale PT production | sb/archivio esercizi/schede | tabelle programmi/esercizi, non entità censite | accesso esistente | fuori ambito di questa migration | READ_ONLY | rispetto alle cinque entità; non è un audit generale dei programmi |
| Cruscotto | app/cruscotto-pt/index.html saveClientAdmin/savePayment/quickPay | clients PATCH e assegnazione PT | Direzione verificata, server ricava attore | sì via StudioAudit | OK_AUDITED | pubblicare questo root, incluso studio-audit-access.js |
| Centrale | app/portale-pt-fase1/index.html stessi tre chiamanti | clients PATCH e assegnazione PT | Direzione verificata | sì via StudioAudit | OK_AUDITED | pubblicare root corretto con studio-audit-access.js |
| Studio gateway | netlify/functions/studio-calendar-activity.js | client/assignment attraverso endpoint comune | ownerOnly server | sì | OK_AUDITED | Function nel sito Calendario; CORS con token, nessun segreto nei siti statici |
| Gateway | calendar-activity.js, acquisition-calendar-activity.js, lib/calendar-audit-endpoint.js | save/delete/client/operator/availability/assignment | HMAC + identità/ruoli DB | sì | OK_AUDITED | chiave server e segreto sessione coerenti già censiti |
| Assegnazioni | calendar_audit_write + calendar_audit_set_assignment | trainer_client_assignments e clients.pt_assegnato | Direzione/segretaria; aggiornamento cliente autorizzato | sì, unica transazione | OK_AUDITED | nessun POST public; righe identiche invariate |
| RPC atomiche | calendar_save_appointment, calendar_commit_package | appuntamenti e residuo | chiamate dal gateway service con contesto | sì tramite trigger | OK_AUDITED | vecchio accesso anon revocato |
| RPC lettura/helper | calendar_planning_snapshot, helper overlap/revision | nessuna | lettura | non pertinente | READ_ONLY | nessuna |
| Sistema | calendar-system-activity.js | disponibilità/save/delete | segreto sistema dedicato | sì source=system | BLOCKED_BY_DESIGN | senza segreto resta disabilitato; nessun cron censito |
| Apple | apple-calendar.js, apple-calendar-dry-run.js e helper | GET dati / ICS | server | nessuna scrittura | READ_ONLY | nessuna modifica Apple in questo lavoro |
| Dashboard PT | dashboard/letture e collegamenti | nessuna entità operativa | esistente | non pertinente | READ_ONLY | nessuna |
| Altre Functions | pt-access-email, form-notify, foto-pt | autenticazione/email/storage foto | esistente | nessuna scrittura delle cinque entità | READ_ONLY | nessuna |
| Scheda Cliente | app/scheda-cliente/js/api.js | PATCH clients, assegnazione/residuo | chiave public | rifiutata | BLOCKED_BY_DESIGN | variante non pubblicata, non riattivare |
| Vecchio Portale PT | app/portale-personal-trainer/js/pt.js | PATCH appuntamenti | chiave public | rifiutata | BLOCKED_BY_DESIGN | non caricato dal Portale production |
| Vecchia Centrale Fase1 | app/portale-pt-fase1/js/portal.js | clients/operators/trainer_client_assignments | chiave public | rifiutata | BLOCKED_BY_DESIGN | non incluso nel nuovo index corrispondente alla production censita |
| Altre varianti | app/portale-pt, pagine storiche/non pubblicate | chiamanti legacy / storage | public | entità operative protette dal DB | LEGACY_UNUSED | non pubblicare senza nuova analisi |
| Sheets | js/sheets.js, CONFIG.USE_GOOGLE_SHEETS=false | archivio parallelo Apps Script | legacy | non attivo | BLOCKED_BY_DESIGN | mantenere disabilitato |
| Script SQL/tests | docs/*.sql, migrations, fixture test | DDL/DML amministrativi o simulati | amministratore / DB locale | non endpoint production | LEGACY_UNUSED | nessuna esecuzione automatica; non applicati da questa attività |
| REST/RPC pubblico generico | chiamate esterne POST/PATCH/PUT/DELETE | cinque entità operative | anon/authenticated/public | privilegi revocati; trigger richiede contesto | BLOCKED_BY_DESIGN | nessun bypass autorizzato |
| Ruoli soli Nutrizione/Valutazioni | accesso Calendar gateway | tentativi modifiche calendario | ruolo verificato non abilitato | rifiutati | BLOCKED_BY_DESIGN | nessun nuovo permesso |

## Production precedente al rollout

| Sito | Deploy censito | Stato rispetto al candidato |
|---|---|---|
| new-calendar-neacea | 6aa5c8da2b404d313c9d9b54, main fc3115f | disponibilità corretta; audit non ancora pubblicato |
| anamnesi-acquisizione-cliente | 6aa57c40e0cb0effcef06a88, main 860a7d0 | gateway audit non ancora pubblicato |
| neacea-portale-personal-trainer | 6a677adce8319f4a59bb9086, commit non dichiarato | link Direzione precedente senza token |
| cruscotto-pt | 6a58f1b8aa6ccc8285786680, manuale | REST client precedente; sorgente candidata riallineata alla UI effettiva |
| neacea-centrale-pt | 6a58f2d5f7275dd53c149aa9, manuale | stessa UI Cruscotto; vecchio portal.js non usato |

Le nuove pagine Studio chiamano la Function centrale sul Calendario: non richiedono nuove variabili nei due siti statici. Calendario, Acquisizione e Portale devono continuare a condividere il segreto sessione verificato (fallback RESEND_API_KEY censito) e usare chiavi server. Il vecchio HTML non deve restare in uso quando vengono revocati i privilegi pubblici.

## Esito e limiti

- NEEDS_ADAPTATION nei componenti production censiti: **zero** nel candidato.
- UNKNOWN bloccanti nel perimetro censito: **zero**. Non è possibile provare l'assenza di script esterni sconosciuti o credenziali amministrative fuori repository; dopo la migration le chiamate pubbliche non autorizzate vengono rifiutate.
- Le autorità DB privilegiate possono amministrare schema/trigger; il registro non è antimanomissione contro il proprietario DB. Le assegnazioni dei ruoli non costituiscono un registro sicurezza completo, ma non sono modificabili con public.
- **GO del candidato per un rilascio coordinato**, con autorizzazione separata e sospensione delle scritture durante il passaggio. **Non GO ad applicare soltanto SQL contro i vecchi deploy**: occorre coordinare migrazione, Functions e cinque pagine/root production, quindi smoke test autorizzati. Nessuna migrazione, deploy o merge eseguito qui.

## Verifiche riproducibili

`bash scripts/check-calendar-audit.sh` sul contenuto committato include availability, autenticazione/falsificazione, censimento dei root production, PostgreSQL audit/rollback/privilegi/privacy/assegnazioni, browser Cruscotto+Centrale, Acquisizione e release Calendario. Aggiungere i test PostgreSQL atomici e concorrenza del calendario. Tutte le mutazioni dei test usano PostgreSQL temporaneo o fetch simulato.

## Perimetro del candidato ripulito

Esclusi da entrambi i root gli sviluppi compensi/PT, incluse tariffe locali, UI onorari e compensation-engine.js. Restano i tre scrittori cliente autenticati e l’agenda production in sola lettura. Nessun backfill o trasferimento automatico dei dati esistenti: lo storico sarà trasferito manualmente da Gianluca. Nessuna modifica a migrazioni o servizi esterni durante questa pulizia.
