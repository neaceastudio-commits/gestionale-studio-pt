# Acquisizione: pianificazione uguale al Calendario

Branch `fix/acquisition-calendar-planning`, basato sul Calendario production con flex.

- Ogni giorno selezionato ha un orario e una durata (multipli di 15, da 15 a 240 minuti; default 60).
- La panoramica PT usa quelle coppie giorno/orario e la durata scelta, senza combinare tutti gli orari con tutti i giorni.
- «Mostra le sedute» richiede un'anteprima server autenticata prima di attivare il cliente. Non crea clienti né appuntamenti.
- L'anteprima elenca le date esatte, durata, prima/ultima data e warning. «Attiva e programma» conferma quell'elenco. Cambiare i campi invalida l'anteprima.
- Il server legge `flexMode` da `calendar_planning_snapshot`: è lo stesso `CALENDAR_FLEX_MODE` autorevole del Calendario. Il browser non può impostarlo. Con true i conflitti non saltano date; con false resta il pianificatore rigoroso e le date escluse sono segnalate nell'anteprima.
- Il server ricalcola prima di salvare e confronta le sedute con quelle confermate: se cambiano, non salva date alternative senza una nuova anteprima. Il recupero mantiene il cliente già attivato e non duplica pacchetti dopo una risposta persa.
- La revisione dello snapshot comprende il flag: se cambia tra pianificazione e commit, la transazione rifiuta il pacchetto senza scritture parziali.
- Il salvataggio resta `calendar_audit_write` → `calendar_commit_package`: audit e inserimento atomici. I residui salvati, pagamenti e logica Fatto non cambiano.
- Gli appuntamenti esistenti non vengono riscritti. Dopo l'attivazione il Calendario gestisce le variazioni effettive, che la sync Apple esistente continua a leggere.

## Rilascio (non eseguito da questo intervento)

1. Applicare soltanto `supabase/migrations/20260914141653_acquisition_calendar_flex_snapshot.sql`, dopo la migrazione flex già presente in production. Estende lo snapshot col flag e valida la durata nel commit; nessuna tabella/colonna nuova, nessun backfill o aggiornamento dei dati.
2. Pubblicare Acquisizione e le relative Functions da questo commit. La nuova Function rifiuta di pianificare se lo snapshot non contiene il flag, evitando un fallback incoerente.
3. Verificare anteprima in sola lettura e, se autorizzato, attivazione di una fixture TEST con pulizia successiva.

Nessun deploy del Calendario o del worker Apple è necessario: il Calendario già pubblicato supporta queste durate e legge gli appuntamenti creati.

I vecchi chiamanti senza `durationMin` mantengono 60 minuti; senza `confirmation` conservano il precedente contratto del pianificatore. Le bozze nuove salvano l'elenco confermato per recuperare gli errori. La riattivazione di un cliente già esistente mantiene il flusso preesistente.
