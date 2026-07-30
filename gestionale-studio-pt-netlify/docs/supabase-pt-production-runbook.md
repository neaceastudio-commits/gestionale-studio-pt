# Migrazione PT — runbook di produzione

Stato: preparato, non eseguito.

## Perimetro

La migrazione aggiunge esclusivamente:

- `appointments.performed_by_operator_id`;
- indice parziale sul nuovo campo;
- FK `NOT VALID` verso `operators.id`;
- esposizione del nuovo campo in `pt_calendar_sessions`.

Non modifica `clients.pt_assegnato`, `appointments.operator_id`,
`pt_dashboard_metrics` o record esistenti. Non effettua backfill.

## Contratto remoto verificato il 29 luglio 2026

Le sonde REST sono state eseguite con `limit=0`, quindi senza recuperare record.
Il preflight SQL autenticato ha eseguito soltanto `SELECT` e aggregazioni:

- `appointments.performed_by_operator_id`: assente;
- FK e indice dell'esecutore: assenti;
- `appointments.id`, `appointments.operator_id` e `operators.id`: `text`;
- `appointments.client_ids`: `jsonb`;
- `pt_calendar_sessions.appointment_id`: presente;
- `pt_calendar_sessions.trainer_id`: presente;
- `pt_calendar_sessions.performed_by_operator_id`: assente;
- la vista calendario usa `jsonb_array_elements_text` e mappa
  `appointments.operator_id` su `trainer_id`;
- `pt_dashboard_metrics.trainer_id`: presente;
- `pt_dashboard_metrics.performed_by_operator_id`: assente;
- `trainer_client_assignments`: presente;
- `clients.pt_assegnato`: presente.
- grant `SELECT` per `anon` e `authenticated` presenti su entrambe le viste;
- appuntamenti: 231;
- righe calendario: 204;
- righe metriche: 5;
- appuntamenti senza PT programmato: 5;
- clienti senza PT responsabile: 0;
- clienti con PT responsabile non valido: 0;
- clienti con più assegnazioni parallele attive: 3.

Il contratto completo delle due viste coincide con la migrazione storica
`phase1_pt_foundations`.

## Ordine controllato

1. Salvare l'output di `supabase-pt-production-preflight.sql`.
2. Verificare che `operators.id` e `appointments.operator_id` siano `text`.
3. Verificare che la definizione delle viste coincida con il contratto registrato.
4. Applicare `supabase-pt-responsibility-execution.sql`.
5. Confermare che il nuovo campo sia `NULL` su tutte le righe.
6. Applicare `supabase-pt-calendar-view-performer.sql`.
7. Eseguire `supabase-pt-production-postflight.sql`.
8. Lasciare le applicazioni operative in sola lettura.
9. Solo dopo il collaudo applicativo coordinato, pubblicare il codice delle due PR.

Ogni punto deve essere concluso e verificato prima del successivo.

## Stop immediato

Non procedere se:

- il preflight mostra tipi diversi da `text` per gli ID coinvolti;
- `pt_calendar_sessions` non espone `appointment_id` e `trainer_id`;
- la definizione reale delle viste diverge dal contratto salvato;
- il nuovo campo contiene valori subito dopo l'aggiunta;
- il postflight trova mismatch tra vista e tabella;
- sono attive scritture non protette da autenticazione e RLS.

## Rollback

Prima dell'estensione della vista e finché il campo è vuoto può essere usato
`supabase-pt-responsibility-execution-rollback.sql`.

Dopo l'estensione della vista, il rollback sicuro è applicativo:

1. mantenere o ripristinare il codice precedente;
2. lasciare la colonna additiva e nullable inutilizzata;
3. non valorizzare né eliminare dati;
4. preparare separatamente un eventuale rollback strutturale usando le
   definizioni e i grant salvati dal preflight.

Non eliminare automaticamente la colonna dopo che la vista la espone.

## Riallineamento clienti

La migrazione dello schema è indipendente dal riallineamento dei 13 clienti.
Il CSV di approvazione deve restare separato e non può generare aggiornamenti
automatici. I casi ambigui richiedono conferma umana.

Il CSV precedente non deve essere usato come stato corrente: il preflight remoto
ora rileva zero responsabili mancanti o non validi, ma conferma tre duplicazioni
nelle assegnazioni parallele. Prima di un futuro riallineamento deve essere
rigenerata l'anteprima e confrontata riga per riga.
