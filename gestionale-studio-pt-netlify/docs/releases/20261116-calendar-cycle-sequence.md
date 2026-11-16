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

## Rettifica Boi eseguita

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
Pubblicazione e prove finali registrate sotto.


## Esito verificato in produzione

- Applicazione online: `d6ae3f5ee3780f9fb262fb14498cc61405ecc1c8`, deploy
  `6afb47b0b6f47709f098a601`, sito `new-calendar-neacea.netlify.app`.
  Preview `6afb4739033ecaebe74ea858`. Manifest completo 47 file verificato,
  cinque asset modificati, 16 funzioni; 11 archivi invariati, cinque ricostruiti
  con chiusura degli import confrontata. Configurazione originaria ripristinata,
  deploy bloccato; accesso anonimo all'API rifiutato con 401.
- Migrazione sequenza remota `20261116180800`; SQL identico al candidato,
  MD5 `9a0eb112336b7cdf4688240e78984ba0`. La prima applicazione era stata
  interrotta dal controllo di compatibilità, senza oggetti o dati applicati.
  Aggiunta prova comportamentale anche sul vincolo originale online: ripristino
  di un rinnovo vuoto confermato e conservazione degli annullamenti precedenti.
- Protezione storico remota `20261116181935`, sorgente
  `20261116181624_calendar_preserve_cancelled_renewal_history.sql`, commit
  `8a46064b7749e5dca2d578e989505701be55adb6`. Nessun asset applicativo cambia
  rispetto a d6ae3f5: questa pubblicazione riguarda solo la funzione SQL.
  Due riproduzioni singolo/coppia falliscono prima della correzione e passano
  dopo, confrontando anche note e timestamp delle righe annullate.
- Boi: presenza del 5 novembre attribuita al credito vecchio, rinnovo confermato
  attivato dal 17 novembre, otto lezioni residue; nessun incasso nel nuovo ciclo.
  Importi e movimenti dei tre cicli precedenti identici. Otto date del nuovo
  pacchetto e otto del successore automatico già prenotate.
  Ricevuta rettifica `13799e6b-a53e-44ee-ad9c-89cf41b81967` con prima/dopo.
- Il confronto finale aveva rilevato che l'attivazione preesistente riscriveva
  i soli badge tecnici di due vecchi annullamenti di Boi. Ripristinate esattamente
  note e timestamp originali, con verifica di concorrenza e nuova registrazione
  audit `2bd5f993-2214-4918-a74e-30749f7713fb`. La nuova migrazione impedisce
  tale riscrittura nelle attivazioni successive.
- Luciana Pibiri: aggiunta la seduta residua mancante; fine ciclo 23 novembre,
  rinnovo dal 26 novembre. Dario Pirodda: aggiunta la seduta residua mancante;
  fine ciclo 4 dicembre, rinnovo dal 7 dicembre. Giorni/orari documentati.
- Otto esiti passati segnalati per Aurora Margini, Gabriele Cauli, Angelo Mura
  (tre), Luciana Pibiri, Dario Pirodda e Mauro Usala. Stato ancora prenotato;
  nessuna presenza o assenza attribuita. La segnalazione resta nel quadro cliente
  e nella sezione Rinnovi anche se cambia il ciclo corrente.
- Durante il lavoro è stato aggiunto esternamente un nuovo cliente (Renata
  Monni). Censimento finale 38 clienti; tutti i 21 PT attivi rinnovabili hanno
  residuo esattamente coperto dalle prenotazioni correnti e date del successore.
  Zero cicli incrociati e zero sovrapposizioni fra prenotazioni PT dello stesso
  cliente. Non rinnova escluso; archiviati non riattivati.
- Feed Apple globale e quattro feed PT: tutti i 248 appuntamenti PT futuri
  prenotati presenti con ID, data e ora corretti (183/19/11/35 nei feed PT).
  Prova del feed pubblicato, non della sincronizzazione di ciascun dispositivo.
- Esecuzione del servizio reale: prima passata completa 5,7 secondi; seconda
  e terza 4,0/4,3 secondi senza nuove operazioni. Nessuna duplicazione.
- Sicurezza: negati EXECUTE anon/auth sulle nuove funzioni e accesso anonimo
  a schema privato/log. Advisor confrontati: unica nuova voce informativa è
  RLS senza policy su calendar_sequence_events, intenzionalmente solo service.
  Segnalazioni precedenti sugli altri moduli conservate e fuori intervento.

### Prove di conservazione

Prima/dopo, con selezioni identiche:

- Campi reali di tutte le sedute passate (ID, servizio, partecipanti, PT, data,
  ora, durata, buffer, stato, creazione): MD5
  `bfd4758f3c3a3d726210cefafb2a0a91` invariato.
- Tutte le 369 righe annullate, intere e inclusi note/timestamp: MD5
  `f2e8eb234677106879ba7a9a1d31ee10` invariato.
- Tutte le 4.241 registrazioni di audit precedenti, fino a ID 4669: MD5
  `7187a903556aae951b941ff8b6d6f43f` invariato.
- Dei 37 clienti iniziali soltanto Boi modificato; gli altri 36 conservano
  aggiornamento, residuo, totale, importo, stato pagamento e hash note originali.

### Verifiche e stato Git finale

Node 24.14.1 e dipendenze del lockfile installate nel candidato pulito.
Suite completa `check-calendar-release.sh` superata sul candidato applicativo,
16 prove mirate sequenza/concorrenza/integrazione incluse; browser locale,
preview e asset produzione con SQL sintetico locale. PostgreSQL con due
connessioni indipendenti verificato separatamente dai servizi simulati.
Seconda correzione SQL: cinque prove pertinenti superate sul commit 8a46064,
comprese le due riproduzioni prima/dopo e integrazione rinnovi.
Database reale: conferma server, riletture, censimento e impronte sopra.
`git diff --check` superato; candidato pulito. Checkout operativo preservato su
feature/whatsapp-agenda-pt-v1, HEAD 233e240; rilascio sul branch
release/calendar-cycle-sequence-20261116. Lavorazioni preesistenti non incluse.

Resta da registrare l'esito effettivo delle otto sedute passate: è un dato
operativo da verificare, non una presenza ricostruibile automaticamente.
Gli orari del giovedì di Angelo Mura restano da concordare; nessun orario
inventato per quel giorno. Nessun ulteriore deploy applicativo necessario.
