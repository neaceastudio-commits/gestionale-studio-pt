# Calendario — Recuperi prima del rinnovo

Richiesta esplicita del 16 novembre 2026: applicare la sequenza concordata,
rettificare Boi conservando lo storico, sistemare le anomalie senza inventare
presenze, verificare e pubblicare. Recuperi nel pacchetto corrente; rinnovo
traslato sugli stessi giorni e orari registrati. Conferma e incasso separati.

## Comportamento

- La pianificazione manuale del residuo usa soltanto il ciclo corrente.
- Annullamento, recupero corrente e traslazione del rinnovo sono un'unica
  transazione. Stesso identificatore per il recupero nei retry; identità delle
  prenotazioni del rinnovo conservata. Giorni e orari del rinnovo rispettati;
  PT sostituti delle singole sedute conservati. Le presenze già registrate
  richiedono rettifica esplicita, mai riallocazione automatica.
- Manutenzione dei rinnovi: segnala gli esiti passati non registrati senza
  attribuirli; programma soltanto i crediti privi di prenotazioni future;
  usa gli orari documentati del ciclo corrente e trasla il rinnovo quando serve.
  Nessuna ora inventata per giorni senza orario. I residui diversi di una coppia
  richiedono la pianificazione delle sedute individuali e sono segnalati:
  nessuna falsa presenza del partner per pareggiare il credito.
- Il pacchetto esaurito può lasciare gli esiti passati nello storico senza
  bloccare il rinnovo. Il residuo del nuovo ciclo non incorpora presenze presunte.
- Non rinnova libera soltanto il successore: il cliente rimane operativo se
  ci sono lezioni dovute. Ibernazione ed eliminazione mantengono il loro flusso.
- Tutti gli spostamenti passano dal writer con audit. Variazioni delle proposte
  hanno eventi append-only dedicati, senza accesso anonimo o autenticato.

## Rettifica Boi preparata

Una funzione eccezionale riservata alla Direzione controlla versione cliente,
proposta e due appuntamenti, credito residuo uno e unica presenza del successore.
La presenza reale del 5 novembre passa al pacchetto precedente; la prenotazione
futura del 15 dicembre passa al rinnovo. ID, date, orari, PT, stati e compensi
rimangono; gli annullamenti storici non sono riscritti. Prima/dopo completo e
ricevuta idempotente conservati. Nessun incasso creato.
La funzione privilegiata è in schema privato, con ruolo service e Direzione
verificati; il privilegio serve soltanto alla rettifica del collegamento errato,
non concede cancellazione ordinaria dei collegamenti al gateway.

## Verifiche e rilascio

Riproduzione precedente: i quattro casi singolo/coppia e pendente/confermato
mantenevano il rinnovo sulla data del recupero. Nuove prove: transazione,
rollback con errore nel writer, retry, riapertura, rettifica con ricevuta,
esiti sconosciuti, Non rinnova, attivazione, ambito PT e negazione anon/auth.
Test browser usa dati sintetici e SQL locale; test concorrenza usa due vere
connessioni PostgreSQL. Nessun dato di produzione scritto dai test.

Il candidato sarà basato sul commit online 31780e0, con soli file pertinenti,
salvato sul branch release/calendar-cycle-sequence-20261116. Checkout ordinario
feature/whatsapp-agenda-pt-v1, HEAD 233e240, lavorazioni preesistenti conservate.
Esiti finali, migrazione, rettifiche e pubblicazione da registrare dopo verifica.
