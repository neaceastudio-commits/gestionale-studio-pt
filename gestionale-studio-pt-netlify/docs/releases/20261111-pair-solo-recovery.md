# Calendario — Recupero individuale con partner sospeso

## Comportamento

La sospensione di un componente della coppia conservava i pacchetti ma il comando
**Genera mancanti** richiedeva ancora un partner attivo: il selettore rimaneva vuoto.
Riproduzione automatizzata verificata in fallimento prima della correzione.

L'utente ha confermato recuperi da solo nello stesso pacchetto, con normale
compenso individuale **€10/ora**. La correzione presenta **Recupera da solo** quando
il proprio partner associato è sospeso. Data, orario, giorni e numero lezioni
restano scelte esplicite dell'utente, mostrate nell'anteprima prima di salvare.

- Le nuove prenotazioni sono sedute individuali `pt11`, un solo partecipante,
  60 minuti, collegate al ciclo corrente del suo pacchetto PT 1:2. Nessuna
  conversione del pacchetto, rinnovo, nuovo incasso o cambio del partner.
- Solo la presenza o assenza scalata di questa persona consuma il suo residuo.
  Il partner sospeso non compare come partecipante o assente, conserva tutto
  il proprio residuo e resta sospeso. Le prenotazioni non consumano lezioni.
- Le sedute precedenti, ore, compensi e pagamenti non vengono riscritti.
  I nuovi compensi seguono il servizio individuale già gestito da tutti i report
  e dal relativo calcolo SQL: €10 per 60 minuti, secondo le regole esistenti.
- Il normale contratto PT 1:2 continua a richiedere due persone; non vengono
  introdotte sedute PT 1:2 incomplete né un nuovo tipo di servizio.

## Salvataggio e consumatori

RPC `calendar_plan_pair_solo`, riservata al gateway server e alla Direzione
verificata. Controlla sotto lock cliente attivo, pacchetto PT 1:2, associazione
reciproca con il proprio partner sospeso, PT assegnato, timestamp, date future
e residuo libero dalle prenotazioni del ciclo corrente. Il collegamento al ciclo
viene ricostruito sul server, senza fidarsi delle note inviate dal browser.

Il batch è atomico e usa le ricevute esistenti `calendar_pt_pair_receipts` per il
retry con UUID stabile. Una richiesta identica non duplica le sedute e rilegge
stati e residui correnti, anche se una seduta è stata chiusa nel frattempo.
Una seconda pianificazione non può prenotare un residuo già occupato.

Consumatori preservati: Calendario, `PTSessionModel`, report ore e compensi,
Portale PT e feed Apple. Sono normali sedute individuali con il ciclo sorgente
esplicito; completamento e recupero automatico esistenti funzionano senza
modificare i modelli condivisi. Nessun cambio di tabelle, policy o permessi.

File principali: `pt-pair-sessions.js`, `supabase.js`, `index.html`, gateway
`calendar-audit-endpoint.js`, migrazione
`20261111100621_calendar_pair_solo_recovery.sql`.

## Prove

Runtime Node 24.14.1 e dipendenze dichiarate nel lockfile `tools/coaching-editor`.

- Cinque test dedicati: riproduzione della schermata vuota; piano individuale;
  salvataggio SQL e riapertura; consumo solo del cliente attivo; ore precedenti
  identiche e due nuove ore / €20; ruoli, partner, capacità, rollback, idempotenza
  e annullamento con recupero individuale. Database PGlite locale.
- PostgreSQL locale con due connessioni indipendenti: una sola pianificazione
  può occupare le due lezioni; i retry dello stesso UUID restituiscono gli stessi
  due appuntamenti. Partner sospeso invariato.
- Browser mobile con asset reali e gateway effettivo collegato al database
  locale: **Genera mancanti → Recupera da solo → anteprima → conferma**, errore
  persistente, risposta persa dopo commit, retry senza duplicati, ricarica,
  presenze, due ore a €10/ora. Identità autenticata simulata soltanto nel test.
- Controlli API: ruolo owner richiesto, identità non falsificabile, payload
  invalidi rifiutati, protocollo precedente respinto. Coppie ordinarie preservate.

Nessuna scrittura di prova nel database di produzione: resta valido il rifiuto
automatico già ricevuto per la creazione di record sintetici online. Le prove
di persistenza sono su database di test; online solo letture e controlli degli asset.

## Stato e rilascio

Checkout operativo `feature/whatsapp-agenda-pt-v1`, HEAD `105650c`, con le altre
lavorazioni conservate. Candidato da costruire sul commit realmente pubblicato
`b3bb4c3`, usando indice Git separato e senza worktree. La precedente istruzione
«pubblica e fai commit» rimane riferita a questo flusso del Calendario.

Non creare appuntamenti reali per il cliente: le due date e gli orari devono
essere scelti nel nuovo modulo. Verificare online pacchetti e storico invariati
prima e dopo il rilascio, e annotare commit, migrazione, prove e stato Git finale.
