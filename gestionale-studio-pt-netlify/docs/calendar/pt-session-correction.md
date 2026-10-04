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

## Rilascio ancora da eseguire

1. Salvare in Git soltanto la modifica e le sue dipendenze, preservando le altre lavorazioni locali.
2. Applicare `20261004152442_calendar_pt_session_correction.sql` dopo le migrazioni calendario/audit già richieste.
3. Pubblicare il gateway `calendar-activity` con `lib/calendar-audit-endpoint.js` e il worker Apple CalDAV aggiornato (sito dedicato).
4. Pubblicare gli asset del Calendario, incluso `pt-session-correction.js` e i riferimenti versionati di `index.html`.
5. Verificare in produzione su dati di prova prima di correggere i clienti reali.

Migrazione, deploy e correzioni dei dati reali non sono stati eseguiti in questa lavorazione. Lo script release generale supera i test funzionali, ma il controllo finale richiede file critici committati: il repository contiene modifiche locali preesistenti.
