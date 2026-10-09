# Correzione delle sedute PT e delle ore

Nel Calendario, aprire **Clienti → Modifica Cliente**, selezionare **Dopo il salvataggio, correggi anche le sedute PT già in calendario e il riepilogo ore**, quindi salvare. Il comando è riservato alla Direzione.

Nella schermata successiva:

1. Scegliere le date iniziale e finale, anche nel passato, e PT 1:1 o PT 1:2.
2. Per unire appuntamenti separati, scegliere il secondo cliente.
3. Mostrare l’anteprima e togliere la spunta alle sedute da escludere.
4. Controllare ore prima/dopo per ciascun trainer e confermare.

Due appuntamenti individuali possono diventare un’unica seduta PT 1:2 solo con clienti distinti, stesso trainer, giorno, orario, durata e stato. Si possono correggere prenotazioni, Fatto e No-show; gli annullati sono esclusi. La seconda riga viene annullata, senza cancellarla. Il trainer conta una sola durata, mentre ogni cliente conserva la propria partecipazione. Le note di entrambe le righe restano conservate, incluse quelle della riga annullata.

È possibile correggere soltanto il tipo quando la partecipazione è già corretta: un cliente per PT 1:1 o due per PT 1:2. Il comando non separa una coppia in due sedute individuali e non crea appuntamenti mancanti per il secondo cliente. Una scheda allenamento già compilata sulla seconda riga impedisce l’unione: non vengono spostati o persi i suoi riferimenti. Cambiare il solo pacchetto del cliente continua a non riscrivere gli appuntamenti.

## Salvataggio e conteggi

`calendar_correct_pt_sessions` è una RPC `SECURITY INVOKER`, eseguibile solo dal gateway service role. L’identità owner è verificata anche nel database. La richiesta contiene gli snapshot mostrati in anteprima, fino a 100 correzioni; qualsiasi modifica concorrente, riga duplicata o errore annulla tutta la transazione e i suoi log.

I contatori dei clienti non vengono ricalcolati né riscritti. La RPC verifica che il consumo del ciclo di ogni partecipante resti identico prima e dopo: cicli incompatibili impediscono l’unione. La funzione audit esistente registra anche `pt_sessions_corrected`; non sono concessi nuovi permessi di scrittura al registro. Una risposta di rete incerta richiede di ricaricare e verificare; uno snapshot vecchio non applica una seconda correzione.

La cache locale viene aggiornata solo con la risposta verificata. Il riepilogo Staff rilegge gli appuntamenti corretti e ignora quello annullato.

Per gli eventi già collegati ad Apple, il worker ammette modifiche di servizio/partecipanti soltanto se trova la catena di correzioni owner nel registro. Aggiorna l’evento originale preservando UID/href/marker; restano i controlli su modifiche simultanee Apple e scritture condizionali. La riga annullata segue la normale rimozione dell’evento Apple collegato.

## Verifiche locali

- `scripts/check-calendar-pt-correction.sh`: sintassi, pianificazione, autorizzazione del gateway, rendering/sync Apple.
- `CALENDAR_POSTGRES_TEST=1`: transazione su cluster PostgreSQL temporaneo, rollback completo, snapshot obsoleti, permessi, preservazione residui, blocco per schede compilate/cicli diversi, regressioni CalDAV.
- `CALENDAR_BROWSER_TEST=1`: percorso dalla schermata cliente all’anteprima, deselezione, errore/riprova, persistenza dopo ricarica e riepilogo di una sola ora PT 1:2; regressione del form pacchetto/coppia.

Runtime opzionali: `EMBEDDED_POSTGRES_MODULE`, `PLAYWRIGHT_MODULE`, `CHROME_PATH`. I browser test intercettano tutte le richieste; nessun dato reale viene modificato.

## Procedura di rilascio

1. Salvare in Git soltanto la modifica e le sue dipendenze, preservando le altre lavorazioni locali.
2. Applicare `20261004152442_calendar_pt_session_correction.sql` e `20261004155434_calendar_pt_correction_json_participants.sql` dopo le migrazioni calendario/audit già richieste. La seconda supporta i partecipanti JSONB di produzione e gli array SQL del vecchio schema.
3. Pubblicare il gateway `calendar-activity` con `lib/calendar-audit-endpoint.js` e il worker Apple CalDAV aggiornato (sito dedicato).
4. Pubblicare gli asset del Calendario, incluso `pt-session-correction.js` e i riferimenti versionati di `index.html`.
5. Verificare in produzione su dati di prova prima di correggere i clienti reali.

## Pubblicato il 4 ottobre 2026

- Branch di rilascio: `release/calendar-pt-correction`, commit applicativo `c12698f6e455786626b6b7eacb065405dfcec58e`.
- Calendario: deploy `6ac277ab2fc6c2cd188dae05` sul dominio principale. Verificati esattamente cinque asset modificati: index, app, supabase, etichette audit e nuovo comando. Tutte le 14 funzioni e le pianificazioni preesistenti conservate.
- Apple: deploy `6ac2813bd39d8e5280d6c23c` nel contesto `production`. Quattro funzioni, cron e monitor con le pianificazioni precedenti; endpoint protetti verificati. La prima pubblicazione manuale aveva conservato il contesto di anteprima: ripristinato temporaneamente il worker precedente e ripubblicato nel contesto di produzione. Nuovo ciclo automatico verificato alle 16:40:40 UTC: 171 appuntamenti elaborati, zero nuovi collegamenti in attesa e una segnalazione di revisione (`Pending link changed`).
- Entrambe le migrazioni applicate a `neacea-gestionale-pt`. RPC invoker, permessi solo service role e nessun nuovo rilievo di sicurezza rispetto alla situazione precedente.
- Verificata sullo schema reale l’unione di due sedute Fatto fittizie, in una transazione annullata: una sola seduta PT 1:2 e residui invariati. Nessuna riga TEST rimasta; nessuna correzione automatica dei clienti reali.
- Suite locale sul commit distribuito: unità, autorizzazione, PostgreSQL nei due schemi, browser simulato, monitor/sync Apple e regressione Calendario. Verifica byte per byte degli asset sul dominio principale superata. Il tentativo aggiuntivo di browser con asset remoti si è fermato all’avvio di Chrome; il flusso browser sul medesimo codice locale aveva superato i test.
- Ripristinati branch Netlify `main`, blocco build automatici e lock del deploy Calendario. Conservate le altre modifiche locali sul branch di lavoro `feature/whatsapp-agenda-pt-v1`.

La sincronizzazione riportava già prima del rilascio una segnalazione `Missing completed appointment requires review`: un mapping di seduta completata senza la riga corrispondente. Non sono stati eliminati eventi o mapping per aggirare questa segnalazione.
