# Calendario — Situazione clienti

Vista `?view=situation`, aggiunta al Calendario: tabella con una riga per cliente,
colonne affiancate e righe Top evidenziate. Su mobile scorre orizzontalmente con
il nome cliente sempre visibile. Il selettore Tabella/Schede conserva entrambe
le viste con gli stessi dati e filtri, come richiesto nella revisione. Legge clienti e appuntamenti
con paginazione per ID e usa un archivio separato dalla cache dell’agenda.
Non scrive dati, non assegna premi e non richiede migrazioni.

Mostra inizio registrato, anzianità in mesi compiuti, sedute svolte, presenze,
frequenza osservata negli ultimi 90 giorni, mesi con presenze negli ultimi 12,
rinnovi iniziati, ultima presenza, pause/riprese e prossima prenotazione.
Il dettaglio mostra le presenze per mese e le date delle pause. Il filtro PT
usa i clienti visibili al profilo secondo il contratto corrente del Calendario.

- Inizio: prima data non futura disponibile tra acquisizione, inizio pacchetto,
  cicli non annullati e prima presenza; non è una ricostruzione della data reale
  se manca lo storico. La fonte viene esplicitata nell’interfaccia.
- Percorso predefinito: PT 1:1 e PT 1:2; selezionabile anche tutto il Calendario.
- Presenze: svolte / (svolte + no-show). Nelle coppie usa l’esito del singolo.
  Annullate, date invalide, orari provvisori e presenze future non contano.
- Frequenza: svolte negli ultimi 90 giorni / settimane osservabili dalla prima
  presenza, con massimo 90 giorni e minimo un giorno. Non è frequenza concordata.
- Pause: distanze di almeno 30 giorni tra presenze, modificabili. La pausa attuale
  termina alla data di consultazione; per gli archiviati non viene estesa fino
  a oggi. Non si deduce il motivo, né si tratta come abbandono confermato.
- Rinnovi: `source: renewal`, non annullati, con decorrenza iniziata. Non si
  contano proposte future e non si inventano cicli mancanti dello storico legacy.
- Top: attivo, non sospeso/ibernato, ultima presenza entro la soglia pausa,
  almeno 6 mesi, 30 svolte, 90% presenze. Rinnovi minimi inizialmente 0.
  Tutte le soglie sono modificabili per la consultazione. Esiti passati ancora
  prenotati, presenze future o registro illeggibile escludono il cliente dai Top.
- Se una pagina del caricamento fallisce, non mostra risultati né Top basati
  su dati parziali. I filtri restano disponibili per la riprova.

## Verifiche

`node tests/client-journey.test.cjs` verifica indicatori, coppie, pause/riprese,
rinnovi annullati/futuri, date, Top, paginazione oltre 1.000 righe ed errori.
`tests/client-journey-browser.cjs` usa Playwright con richieste simulate per
mobile/desktop, ricerca, filtri, criteri, dettagli, errori/riprova, escape HTML e
ambito PT. Nessuna scrittura o modifica di dati reali.

Il controllo generale inizialmente si fermava sul test preesistente
`pt-program-persistence.test.cjs`: `Convertitore legacy individuato`. Il test
cercava esattamente `loadPortalData()` mentre la funzione ora accetta un
parametro. Aggiornata soltanto la delimitazione del test a `loadPortalData(`;
nessuna modifica al codice del Portale PT. Tutti i controlli funzionali della
suite generale e i test browser della nuova vista sono passati.

## Anteprima e pubblicazione

`node tests/helpers/client-journey-preview.cjs` apre su loopback, porta 4178,
`http://127.0.0.1:4178/?view=situation`. Usa soltanto clienti fittizi, devia tutte
le richieste dati verso localhost e blocca salvataggi/funzioni esterne.
Non viene incluso nel sito pubblicato e non contiene dati o chiavi reali.

L’utente ha approvato Tabella e Schede e autorizzato la pubblicazione l’11 ottobre
2026: «mi piace, pubblichiamo». Il rilascio riguarda soltanto il Calendario,
partendo dal suo commit attualmente pubblicato per preservare tutte le funzioni
e le pianificazioni esistenti. Nessuna migrazione necessaria.
