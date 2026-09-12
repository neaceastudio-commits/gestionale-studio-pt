# Registro attività Calendario — preparazione, non rilasciato

Branch dedicato da main. Nessuna migrazione reale o pubblicazione eseguita. Non comprende il branch Apple né le altre modifiche locali al Portale.

## Identità e autorizzazioni

Le Functions verificano la firma HMAC della sessione già emessa da `pt-access-email` (PT_ACCESS_SECRET, oppure il fallback esistente RESEND_API_KEY), scadenza, ID e email contro `operator_effective_roles` attivo. Il database ricontrolla i ruoli e ricava nome/email dell'attore dalla vista: actor name/email/role/source/request_id inviati liberamente dal browser non vengono usati. Anche il link Direzione dal Portale trasporta la sessione verificata; `mode=admin` da solo non autentica nessuno.

Le operazioni PT sono limitate agli appuntamenti assegnati, alle proprie disponibilità e ai propri clienti. Direzione/segretaria possono gestire i clienti; solo Direzione gestisce gli operatori e legge il registro. I log non sono leggibili attraverso la chiave pubblica. Le identità delle automazioni usano un endpoint separato protetto da `CALENDAR_SYSTEM_AUDIT_SECRET`, senza fallback e disabilitato se il segreto manca. Non esiste una nuova automazione pianificata.

## Migration e schema

`supabase/migrations/20260912212042_calendar_activity_audit.sql` richiede lo schema calendario corrente, la precedente migrazione atomica e la vista `operator_effective_roles`.

`calendar_audit_log`: id bigint identity, created_at timestamptz, actor_operator_id/name/email/role, action, entity_type/id, client_ids JSONB, before_data/after_data JSONB, source, request_id UUID, metadata JSONB. Nessuna FK cancellabile elimina lo storico.

RLS attiva, privilegi diretti rimossi e trigger che rifiuta UPDATE/DELETE/TRUNCATE sul registro. L'inserimento avviene solo dai trigger; la lettura è una RPC service-only con verifica del ruolo Direzione. Filtri server per periodo, attore, cliente, azione, origine e cursore; pagine da 100 righe.

I trigger su appointments, operator_availability, clients e operators richiedono il contesto della RPC autenticata. Revoca delle scritture pubbliche e delle vecchie RPC anonime: un client vecchio viene bloccato, non continua a scrivere senza audit. Anche i ruoli operatore non sono più modificabili con la chiave pubblica.

## Operazioni coperte e atomicità

- Creazione, spostamento, cambio PT/servizio, Fatto, uscita da Fatto, annullamento, no-show, partecipanti e cancellazione appuntamenti.
- Fatto e ripristino residuo usano la RPC atomica preesistente; audit degli appuntamenti e dei contatori è nella stessa transazione.
- Cancellazione fisica: prima ripristino atomico del residuo tramite annullamento, poi DELETE nella medesima transazione.
- Creazione pacchetto da Acquisizione: tutte le sedute e i relativi audit nella transazione di commit del pacchetto. Attivazione cliente e creazione pacchetto restano transazioni distinte, con il recupero già presente.
- Upsert cliente, aggiornamenti operativi del pacchetto e gestione operatori passano dal gateway.
- Disponibilità: confronto degli slot normalizzati lato SQL; solo le righe differenti vengono aggiornate con nuovo timestamp. Un no-op di sistema viene registrato come `availability_noop`, con `automatic=true`, senza aggiornare disponibilità. Nessun upload automatico della cache al caricamento.
- `calendar-system-activity` attribuisce l'azione a Sistema, fonte system. Le richieste manuali conservano l'identità verificata.

Un errore di audit annulla la modifica, anche il residuo; un errore della modifica annulla i log generati nella transazione. Le operazioni idempotenti già confermate non generano un secondo Fatto.

## Privacy

Whitelist operativa: ID, data/ora/durata/buffer, servizio, PT, partecipanti, stato; per disponibilità operator_id/day_key/slots; per pacchetto totale/residuo/assegnazione/date/attivo/tipi pacchetto e soli ID/data del ciclo estratti dai marcatori o dal registro, senza informazioni economiche. Nessuna copia integrale dei record, notes, anamnesi, dati nutrizionali, farmaci, indirizzi o importi. Le note sensibili possono continuare a essere salvate dal client editor, ma non entrano nell'audit.

## Vie laterali e limiti espliciti

1. **Vecchi REST/RPC su appuntamenti e disponibilità:** bloccati dalla migration, anche usando service_role senza contesto. Non sono un bypass silenzioso.
2. **Altre pagine/Functions del Portale non aggiornate in questo branch:** eventuali scritture operative dirette su clients/operators vengono bloccate. Prima del rilascio coordinato serve censire e adattare quegli utilizzatori: non applicare la migration isolatamente.
3. **Dati cliente non operativi** (anagrafica, clinica, contabilità/notes senza cambi ai campi operativi): non vengono registrati in questo registro. Aggiornamenti server privilegiati di quei soli campi possono ancora avvenire senza audit calendario; richiedono un registro distinto se desiderato.
4. **Assegnazioni ruoli attraverso strumenti amministrativi/server privilegiati:** l'accesso pubblico è revocato, ma questi cambi non costituiscono ancora un registro sicurezza completo.
5. **Superuser/owner DB o credenziale service_role compromessa:** restano autorità fidate. Un amministratore può disabilitare trigger o passare una diversa identità al gateway; questo registro non è una prova antimanomissione contro l'amministratore del database.
6. **localStorage/import JSON e modifiche UI non confermate:** non sono transazioni del database e non generano log. Gli errori remoti vengono segnalati e viene tentata la rilettura; offline lo stato locale non va interpretato come salvataggio remoto.
7. **Google Sheets/Apps Script:** integrazione disabilitata in CONFIG, non strumentata da questo audit. Riattivarla aprirebbe un archivio parallelo non coperto.
8. **source è l'endpoint server attraversato**, non una prova crittografica della pagina aperta nel browser. Chi possiede una sessione valida può chiamare l'endpoint autorizzato, ma non falsificare actor name/email.
9. **Storico precedente alla migration:** non ricostruibile retroattivamente. Nessuna attribuzione inventata della vecchia riscrittura delle disponibilità.

## Verifica / rilascio futuro

Test locali con fetch intercettato e PostgreSQL temporaneo: firma/ruoli, falsificazione attore, atomici e rollback, pacchetti, disponibilità/no-op, privilegi, filtri, UI Direzione e regressioni. Nessun test scrive nel Supabase reale.

Il rollout richiede autorizzazione separata: allineare le Functions con chiave server e segreto sessione, coordinare Portale/Calendario/Acquisizione, adattare eventuali scrittori legacy, applicare solo dopo il controllo dei prerequisiti. `CALENDAR_SYSTEM_AUDIT_SECRET` serve solo se si abilita l'endpoint delle automazioni. Nessun deploy o merge incluso in questo lavoro.
