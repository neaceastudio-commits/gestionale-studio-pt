# Calendario — Lezione non svolta con seduta scalata

Revisione del 12 ottobre 2026. Per l’utente conta distinguere soltanto recupero
oppure addebito della lezione, senza un pulsante generico “No-show”.

- **Annullata · da recuperare**: non consuma il pacchetto; la lezione resta da programmare.
- **Non svolta · seduta scalata**: assenza o annullamento fuori tempo; consuma una seduta, non registra una presenza e non propone una lezione sostitutiva.
- **Fatto**: lezione effettivamente svolta.

Nel PT 1:1 e Circuit l’assenza scalata conserva lo stato database `noshow` con
il marcatore `[ASSENZA-SCALATA]` nelle note tecniche. L’interfaccia lo nasconde e
lo preserva nelle modifiche. Le vecchie assenze senza marcatore non vengono
riclassificate né scalate automaticamente. Quando si modifica una di queste,
il suo esito precedente resta riconoscibile; si può scegliere esplicitamente
la voce nuova per addebitarla.

Nel PT 1:2 le regole già presenti continuano a scalare le assenze dei partecipanti.
Le presenze svolte restano distinte dalle assenze scalate nel quadro pacchetto.
Non vengono aggiunte ore svolte o cambiati i compensi PT per un’assenza PT 1:1.
Rigenerazione e modifica degli orari futuri toccano soltanto sedute prenotate,
preservando quelle già chiuse per assenza scalata.

La migrazione `20261012063548_calendar_charged_absence.sql` estende il predicato
server esistente del consumo di sedute e il campo audit. Usa il normale
salvataggio atomico e i collegamenti al ciclo già presenti: retry identici non
scalano due volte, annullamenti restituiscono una seduta, cicli vecchi e proposte
di rinnovo non attivate restano separati. Mantiene OID, ACL e SECURITY INVOKER
ed espone le copie interne solo a service_role. Non aggiorna righe storiche,
residui, permessi o pianificazioni.

## Verifica locale

- `node --test tests/calendar-charged-absence.test.cjs`: due esiti distinti,
  residuo, sedute da programmare e presenze separate, reversibilità.
- `PGLITE_MODULE=… node --test tests/calendar-charged-absence-postgres.test.cjs`:
  database locale per JSONB/array, normale gateway audit, nessun doppio addebito,
  rimborsi, concorrenza, cicli precedenti, rinnovi non attivi e privilegi.
- `tests/calendar-charged-absence-browser.cjs`: Chrome con dati simulati;
  pulsanti, dropdown quadro pacchetto/editor, ricarica e retry dopo errore.
- Suite generale `scripts/check-calendar-release.sh` e regressioni PT 1:2.

## Attivazione

Non pubblicare l’interfaccia prima di applicare la migrazione al progetto
Supabase Studio `cdywqyqqmjhgkzwrrixc`. L’applicazione della migrazione richiede
richiesta esplicita secondo le istruzioni AGENTS.md del progetto.
Successivamente pubblicare soltanto il Calendario con gli asset della revisione;
non modificare il Portale PT o altri siti.
