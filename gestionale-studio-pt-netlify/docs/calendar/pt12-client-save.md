# Salvataggio pacchetto e seduta PT 1:2

Il form cliente attende la conferma del gateway audit prima di chiudersi e aggiornare la cache. Un errore resta nel form, che consente di riprovare. Il cambio a un unico pacchetto allinea `package_types` e `tipo_servizio`; un aggiornamento del solo tipo non invia totale, residuo, decorrenza o altri campi invariati. La risposta remota resta autorevole anche se nel frattempo viene registrata una seduta Fatto.

Per una seduta PT 1:2 il form mostra due selettori distinti. Entrambi i clienti appartengono allo stesso appuntamento, ciascuno con il proprio pacchetto e residuo. Lo stesso cliente non può essere selezionato due volte. Il salvataggio usa la RPC e il gateway audit esistenti.

Il cambio pacchetto da solo non cambia il servizio degli appuntamenti. Per correggere esplicitamente sedute esistenti, incluse quelle passate, usare il nuovo percorso [Correzione sedute PT e ore](pt-session-correction.md), che richiede la propria migrazione e il rilascio coordinato Calendario/worker Apple.

Verifiche locali (nessuna richiesta a servizi reali):

- `tests/calendar-client-pair-browser.cjs`: salvataggio differenziale e confermato, persistenza dopo reload, errore visibile, residuo concorrente non sovrascritto, nessuna scrittura su form invariato, selezione dei due clienti e una sola seduta PT 1:2.
- `tests/calendar-client-pair-postgres.test.cjs`: migrazioni correnti su PostgreSQL temporaneo, aggiornamento pacchetto auditato, Fatto e ripristino dei residui di entrambi i clienti.
- Suite release, disponibilità, audit e Flex esistenti.

Runtime browser: `PLAYWRIGHT_MODULE` e `CHROME_PATH` opzionali. Runtime PostgreSQL: `EMBEDDED_POSTGRES_MODULE`.
