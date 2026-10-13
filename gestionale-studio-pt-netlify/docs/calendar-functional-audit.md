# Calendario — Controllo funzionale del 13 ottobre 2026

Ambito: Gestionale Studio PT, Calendario e servizi amministrativi del Cruscotto
che passano dal gateway del Calendario. Portale PT e altre applicazioni non
vengono pubblicati da questo intervento. Il controllo distingue prove funzionali,
letture dei dati reali e consegna sui provider esterni. Non certifica una funzione
che non è stata provata o una consegna email/WhatsApp mai effettuata.

## Esito e copertura

Controllati sintassi dei 28 script Calendar, tutte le 8 viste principali,
16 finestre (appuntamenti, clienti, pacchetti, finanza, trasferimento, Staff,
Apple, dati, ore), 79 riferimenti ad azioni inline risolti. Sono state eseguite
75 suite pertinenti; il controllo finale e le riprove sono dettagliati sotto.
Le prove browser e SQL usano dati simulati; la diagnosi di fatturazione usa
solo copie locali di informazioni economiche lette dal database.

| Funzione | Esito | Prova / limite |
|---|---|---|
| Dashboard, Giorno, Settimana, Sale, Clienti, Staff | Verificata | Navigazione e controlli delle finestre; nessun errore JS |
| Nuovo appuntamento PT 1:1, coppia, Circuit | Corretto | Il modello dereferenziava una seduta nulla quando apriva la finestra |
| Modifica data, ora, durata, PT e stato | Verificata | Browser, controllo conflitti, salvataggio atomico, vecchie versioni |
| Prenotazione esistente a residuo zero | Corretto e pubblicato | Correzione/cancellazione possibile; nuove lezioni restano soggette al residuo |
| Fatto, cancellazione recuperabile, assenza scalata | Verificata | Residui, risposta persa, ripetizione, rimborso, storico |
| Assenza scalata riconosciuta al PT | Regola aggiornata | PT assegnato alla seduta: 10 €/h individuale, 15 €/h coppia; nessuna falsa presenza |
| Assenza non scalata | Verificata | Nessuna ora remunerata; vecchi no-show senza prova di addebito non sono trasformati in scalati |
| Coppie e presenze indipendenti | Verificata | Due partecipanti, una seduta e un compenso; correzione di due vecchie righe in una coppia |
| Pacchetti, giorni, generazione, rigenerazione | Verificata | Planner e vincoli, nessuna generazione parziale dichiarata come successo |
| Rinnovi previsti | Verificata con difetto aperto | Conferma, modifica e attivazione; mostra la vecchia prenotazione che blocca. Difetto del residuo se si scala un’assenza prima dell’attivazione, descritto sotto |
| Incasso Calendario, importo, rettifica e storno | Verificata nel flusso ordinario | Incasso parziale, virgola decimale, errore/retry, saldo, storico; limite simultaneità sotto |
| Incassi / amministrazione Cruscotto | Corretto | Endpoint riservato alla Direzione non richiede la revisione del protocollo appuntamenti; autenticazione e autorizzazione SQL conservate |
| Incasso con importo zero o ciclo saldato | Chiarito | Pulsante disabilitato con motivo esplicito, non silenziosamente |
| Archiviazione, ibernazione e storico | Verificata | Sedute chiuse e ore restano; solo prenotazioni future aperte vengono cambiate |
| Assegnazione e condivisione PT | Verificata | Ruoli, salvataggi confermati e storico; prove simulate |
| Disponibilità dichiarata, ricerca settimanale / periodo | Corretta e verificata | Conserva sezioni aperte; evita ricostruzione mentre si compila un campo |
| Riepilogo ore / tabella per giorno | Verificata | Contributi delle righe sommano al mese, clienti archiviati inclusi, coppie una volta |
| Pagamenti PT effettuati e rettifica | Verificata in simulazione | Idempotenza, importi, ruoli e storico. Nessun pagamento reale creato |
| Situazione clienti / tempi del pacchetto | Verificata | Stime di durata e dati incompleti; nessuna penalità reintrodotta sugli stacchi |
| Lettura dello storico oltre 1.000 righe | Corretta | Paginazione con ordinamento stabile, 1.234 sedute in test; errore su seconda pagina non sovrascrive la cache con dati parziali |
| Registro azioni e identità | Verificata | Registro append-only, attribuzione owner/PT, accessi rifiutati, dati privati esclusi dal log |
| Apple / CalDAV | Logica verificata in simulazione | Orari, riconciliazione, autenticazione, eventi, monitor. Nessuna scrittura iCloud reale in questo audit |
| Email agenda / riepilogo / promemoria | Logica verificata in simulazione | Nessun invio reale; recapito provider non certificato |
| WhatsApp agenda | Logica verificata in simulazione | Preparazione, preview, autorizzazione e deduplicazione; nessun messaggio reale inviato |
| Importazione locale e sincronizzazione massiva | Disabilitate intenzionalmente | Non sono errori: non devono riscrivere il database da una vecchia cache |

## Problemi ancora aperti

1. **Incassi simultanei:** il salvataggio del registro economico tramite PATCH
   delle note non ha un controllo atomico della versione. Riprodotto localmente
   con il vero SQL audit: due incassi simulati da 10 e 20 euro partendo dalla
   stessa versione lasciano solo il secondo, 20 euro invece di 30. Il blocco
   del pulsante protegge un singolo tab, non due finestre. Occorre un'operazione
   economica atomica e un controllo di concorrenza nel database; non si dichiara
   corretto questo punto e non viene applicata una migrazione non richiesta.
2. **Letture API senza login:** verificata risposta 200 alle letture di `clients`
   e `appointments` con la chiave pubblicabile, senza sessione personale.
   Le scritture sono protette dal gateway; le letture richiedono un intervento
   di controllo accessi/RLS dedicato, con verifica dei consumatori.
3. **Assenza scalata prima di attivare un rinnovo previsto:** riprodotto su
   SQL locale con le migrazioni effettive. Una proposta di 8 lezioni PT 1:1 con
   una assenza scalata si attiva con residuo memorizzato 8 anziché 7. La logica
   di attivazione conta le presenze e i no-show di coppia, ma omette la nuova
   assenza scalata individuale. Serve riallineare il calcolo server e il
   controllo SQL del residuo; nessuna correzione manuale dei residui reali.
4. **Provider esterni:** prove simulate superate non dimostrano recapito reale
   email/WhatsApp o sincronizzazione end-to-end con iCloud.
5. **Tre vecchie suite native PostgreSQL:** il runtime temporaneo installato
   non parte per una libreria ICU mancante. Le tre suite legacy di persistenza
   e concorrenza non sono dichiarate superate; le suite SQL moderne con PGlite
   sono state eseguite. Il problema di runtime non è un guasto dimostrato dell'app.

## Dati e pulizia autorizzata

L’utente ha scelto di chiudere le vecchie lezioni ancora `prenotato` fino al
30 settembre. Chiuse **13 sedute PT 1:1**, conservate come annullate nello storico,
con motivazione e normale registro audit. Nessuna cancellazione definitiva.
Il controllo nella stessa transazione ha confrontato hash dell’intera tabella
clienti e delle sedute già `fatto`/`noshow`, e il numero totale di appuntamenti:
nessun cliente, residuo, incasso, seduta svolta o assenza scalata è cambiato.
Richiesta audit `bd4c8093-8be3-4e10-975b-c3759815cb82`.
Verifica successiva: zero vecchie prenotazioni PT ancora aperte, 13 annullamenti
nel registro, rinnovo di Portas ora `activated` dopo l’azione utente sul normale
flusso. Nessun incasso reale è stato registrato da questo audit.

Controllati 22 clienti PT attivi: registri leggibili; incasso simulato riuscito
sui 5 con saldo aperto. Cinque
pacchetti hanno importo zero: serve
impostare l’importo concordato, non inventarlo. Le informazioni derivano dal
momento della lettura e possono cambiare mentre l’utente lavora.

## Evidenza di test

Prima passata sulla release online precedente: 48 suite superate, 8 fallimenti
(2 errori funzionali, 1 protocollo Cruscotto, 1 fixture vecchia e dipendenze Apple)
e 17 allora prive di runtime. Installate dipendenze solo in `/tmp`, ritentate
le suite; corretti il nuovo appuntamento, il protocollo Studio e la fixture
coppia che ometteva il partner obbligatorio.

Passata estesa finale: 74 PASS, 1 FAIL della ricerca disponibilità e 3 suite
native non disponibili, su 78 suite selezionate. Il fallimento disponibilità
ha mostrato il pannello richiudersi durante la ricostruzione iniziale: corretto
e la suite è stata riprovata con successo. Aggiunto poi il censimento UI,
superato (8 viste, 16 finestre, 79 target). I dati di risultato non sostituiscono
l’ispezione e la verifica online del candidato pubblicato.

Riprove successive: ricerca disponibilità superata dopo la correzione; censimento
UI superato con verifica delle finestre effettivamente aperte. Complessivamente
76 suite funzionali distinte superate e tre vecchie suite native non eseguibili.
Le tre criticità dati sopra restano aperte e sono state riprodotte, non dedotte
dalla sola mancata esecuzione dei vecchi test.
