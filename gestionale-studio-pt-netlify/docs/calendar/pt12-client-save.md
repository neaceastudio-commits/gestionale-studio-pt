# Salvataggio pacchetto e seduta PT 1:2

Il form cliente attende la conferma del gateway audit prima di chiudersi e aggiornare la cache. Un errore resta nel form, che consente di riprovare. Il cambio a un unico pacchetto allinea `package_types` e `tipo_servizio`; un aggiornamento del solo tipo non invia totale, residuo, decorrenza o altri campi invariati. La risposta remota resta autorevole anche se nel frattempo viene registrata una seduta Fatto.

Per una seduta PT 1:2 il form mostra due selettori distinti. Entrambi i clienti appartengono allo stesso appuntamento, ciascuno con il proprio pacchetto e residuo. Lo stesso cliente non può essere selezionato due volte. Il salvataggio usa la RPC e il gateway audit esistenti.

Il cambio pacchetto da solo non cambia il servizio degli appuntamenti. Per correggere esplicitamente sedute esistenti, incluse quelle passate, usare il nuovo percorso [Correzione sedute PT e ore](pt-session-correction.md), che richiede la propria migrazione e il rilascio coordinato Calendario/worker Apple.

Verifiche locali (nessuna richiesta a servizi reali):

- `tests/calendar-client-pair-browser.cjs`: salvataggio differenziale e confermato, persistenza dopo reload, errore visibile, residuo concorrente non sovrascritto, nessuna scrittura su form invariato, selezione dei due clienti e una sola seduta PT 1:2.
- `tests/calendar-client-pair-postgres.test.cjs`: migrazioni correnti su PostgreSQL temporaneo, aggiornamento pacchetto auditato, Fatto e ripristino dei residui di entrambi i clienti.
- Suite release, disponibilità, audit e Flex esistenti.

Runtime browser: `PLAYWRIGHT_MODULE` e `CHROME_PATH` opzionali. Runtime PostgreSQL: `EMBEDDED_POSTGRES_MODULE`.

## Regole PT 1:1 / PT 1:2 — modifica locale del 9 ottobre 2026

**Stato: implementata e verificata localmente; migrazione e pubblicazione non eseguite. Nessun rinnovo o correzione dei dati reali.**

- PT 1:1: 10 €/ora maturata; PT 1:2: 15 €/ora complessivi per il PT. Le durate sono conteggiate una sola volta, con compenso proporzionale ai minuti.
- PT 1:2 richiede due persone distinte in un unico appuntamento. Presenze, pacchetti, residui e incassi restano individuali.
- Alla chiusura PT 1:2 vengono scalate entrambe le sedute anche con una o entrambe le persone assenti. Una persona assente non rende la seduta PT 1:1. Solo la Direzione può cambiare tipologia.
- Le sedute prenotate sono separate da ore/compensi maturati. Le sedute annullate non maturano compensi; un annullamento restituisce le sedute dei pacchetti correnti. Il riepilogo non registra bonifici o pagamenti al personale.
- Le vecchie righe sovrapposte o PT 1:2 con una sola persona sono escluse dal totale e segnalate come conteggio incompleto. Non vengono unite automaticamente né vengono ricostruiti retroattivamente residui.

### Rinnovo della coppia

Dal Quadro pacchetto scegliere **Rinnovo e calendario coppia PT 1:2**, selezionare il partner e indicare esplicitamente quali persone rinnovano. Il partner non è preselezionato per il rinnovo. Importo, incasso e numero di sedute sono indipendenti. È anche possibile usare i pacchetti correnti e programmare altre sedute condivise tramite **Genera sedute mancanti**.

Chiudere o annullare prima le sedute ancora prenotate delle persone da rinnovare, comprese quelle passate: non vengono trasferite automaticamente al nuovo ciclo. Il residuo precedente è conservato nello storico, non sommato al nuovo pacchetto. Il numero di appuntamenti comuni non può superare il residuo disponibile di nessuno dei due. Eventuali sedute eccedenti del pacchetto più lungo rimangono da programmare.

L’anteprima precede un unico salvataggio transazionale. Snapshot delle versioni cliente impediscono rinnovi su dati superati; un UUID stabile e una ricevuta server impediscono il doppio rinnovo dopo una risposta persa. Un errore su una sola seduta annulla l’intera operazione. L’annullamento individuale di un rinnovo con sedute condivise è bloccato: richiede una correzione coordinata. Gli spostamenti si effettuano sulla seduta comune dal Calendario e valgono per entrambi.

### Persistenza e rilascio

La migrazione `20261009070726_calendar_pt_pair_rules.sql` estende le RPC con metadati operativi `NEACEA-PT-SESSION-V1` nelle note dell’appuntamento, senza cambiare il tipo di `client_ids` o riscrivere righe esistenti. Contiene stato individuale e collegamento al ciclo di ciascuno. Il registro attività mostra le presenze individuali. Le note mostrate nei moduli non espongono questo blocco.

Il gateway ammette `renew_pt_pair` soltanto alla Direzione verificata. La nuova tabella di ricevute è RLS e accessibile solo al servizio; nessuna autorizzazione pubblica di scrittura. I consumatori Portale/Apple riconoscono i due cicli; il cliente assente non resta nell’elenco temporaneo del PT per una scheda da compilare.

Per Cristiano e Silvia, la verifica del 9 ottobre ha rilevato PT 1:2 nei pacchetti ma righe individuali PT 1:1 in agenda. Patrizia e Vincenza hanno righe PT 1:2 separate: lo storico va esaminato prima di liquidare il riepilogo mensile. Il presente intervento non modifica questi dati reali.

Dopo autorizzazione esplicita, rilasciare nell’ordine: migrazione Studio; gateway e dipendenze condivise; asset Calendario e funzione Portale `pt-data` con il nuovo adattatore. Verificare la versione effettivamente online. Il Calendario è un sito distinto dal Portale PT e non rientra nell’autorizzazione di pubblicazione automatica del repository. Non distribuire indiscriminatamente le altre lavorazioni presenti nel checkout.

### Verifiche

`bash scripts/check-calendar-pt-pair.sh`: regole compensi, sovrapposizioni, scope temporaneo, audit/autorizzazione, cicli e regressioni pacchetti/Apple.

Con `PGLITE_MODULE`: test PostgreSQL locale sia con partecipanti JSONB (schema produzione) sia con array SQL; presenze miste, doppia assenza, ritentativi, annullamento/ripristino, cicli distinti, rinnovo di uno o entrambi, rollback e accesso riservato.

Con `CALENDAR_BROWSER_TEST=1`, `PLAYWRIGHT_MODULE` e `CHROME_PATH`: Chrome con tutte le richieste intercettate, anteprima, errore/ritentativo con UUID invariato, presenze, reload e riepilogo. Nessun dato reale viene scritto.

La suite generale `check-calendar-release.sh` supera i test funzionali ma termina al controllo Git che richiede i file critici in un commit: il checkout comprende numerose lavorazioni preesistenti non committate. Non è una conferma di rilascio.
