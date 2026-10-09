# Correzione rinnovo e residui — 9 ottobre 2026

Richiesta: «ok, sistemami tutto e ricontrollo», dopo i controlli su Luciana, Cristiano e Silvia.

## Problemi e correzioni

Luciana aveva una proposta automatica da otto sedute. Un tentativo dal vecchio percorso ha creato altre otto sedute, poi ripristinate quando il database ha rifiutato un secondo rinnovo. Il vecchio pacchetto è quindi rimasto corrente. La tabella classificava ogni seduta fuori ciclo come «Storico», incluse quelle del rinnovo previsto.

La tabella ora distingue il rinnovo previsto dallo storico. Il quadro pacchetto espone le lezioni della proposta e apre direttamente quella del cliente; quando esistono prenotazioni previste sostituisce il modulo per un secondo rinnovo. Errori di lettura bloccano il rinnovo, senza proseguire nel percorso precedente. La conferma restituisce lo stato realmente salvato, inclusa l'attivazione o un errore di attivazione.

Cristiano e Silvia erano stati riportati da uno a quattro residui con salvataggi del calendario alle 12:41. Il conteggio precedente escludeva tre sedute storiche senza identificativo esplicito del ciclo. La versione corretta le include già; ora il gateway Calendario rifiuta i salvataggi incompatibili dalle vecchie pagine aperte, invitando a ricaricare prima di scrivere. La revisione del protocollo non sostituisce autenticazione o autorizzazione.

La chiusura del residuo dichiarata dalla Direzione può essere conservata nel ciclo come `sessionAdjustments`, con quantità positiva, motivo e data: contribuisce al consumo del pacchetto, è distinta dalle presenze e non genera compensi. Il nuovo ciclo non eredita la rettifica.

## Rettifiche applicate e indicazione finale

- Luciana: proposta attivata, otto residue e otto prenotate dal 12 ottobre al 5 novembre, lunedì e giovedì alle 09:00 con Martina. Tutti gli ID delle prenotazioni conservati. Nessun nuovo incasso.
- Durante la verifica, la Direzione ha chiuso direttamente la seduta dell’8 ottobre della coppia. La rettifica predisposta si è fermata per il controllo di concorrenza: nessuna modifica parziale applicata. L’utente ha confermato di lasciare entrambi a zero sul vecchio pacchetto. Nessuna rettifica amministrativa del residuo è stata applicata.
- Indicazione finale: il nuovo pacchetto di Cristiano e Silvia parte mercoledì 14 ottobre alle 09:00 con Alessandro; questa indicazione sostituisce la precedente del 12 ottobre alle 11:00. Un errore di trasporto sul tentativo precedente è stato verificato prima di riprovare: la proposta era ancora pending e nessun cambiamento del 12 era stato applicato.
- Rinnovo condiviso confermato e attivato in un’unica transazione: dodici residue per ciascuno, dodici appuntamenti PT 1:2 complessivi dal 14 ottobre al 9 novembre. Giorni abituali: lunedì 17:00, mercoledì 09:00, giovedì 19:00. Importi precedenti preservati; nessun incasso nuovo. Tutti gli ID già sincronizzati conservati.
- La prenotazione individuale di Cristiano del 12 ottobre alle 11:00, rimasta sul vecchio ciclo concluso, è stata annullata con motivazione nel registro. Non sono state alterate le presenze storiche.

## Verifiche prima del rilascio

262 test automatici passati. Prova Chrome con dati simulati: otto prenotazioni previste distinte dallo storico, nessun secondo modulo di rinnovo, apertura della proposta dal cliente, modifica di giorni e quantità, errore concorrente recuperabile e conferma. Test regressione specifico: tutte le sedute storiche della coppia contate, rettifica solo sul cliente interessato, invariati compensi e presenze, rettifica non trasferita al nuovo pacchetto. Test gateway: vecchie pagine respinte prima di ogni scrittura di appuntamenti/pacchetti, sessione ancora leggibile.

## Pubblicazione e verifica reale

Commit codice `2fd18c0369f5e6aae5a4f6c90e7d7d5784a18c2c`, pubblicato tramite Git nel deploy Calendario `6ac8c85ca545c3069ad20dab`. Asset online confrontati integralmente con i file locali testati; pianificazioni invariate. Produzione nuovamente bloccata; collegamento Git ripristinato a `main` con build automatiche sospese. Nessuna migrazione dello schema necessaria.

Il browser sul sito pubblico conferma Luciana con 0 svolte, 8 residue, 8 prenotate e otto righe «Ciclo corrente»; le lezioni precedenti risultano «Storico». Nessun errore JavaScript. Verificate nel database le due proposte attivate, otto appuntamenti individuali per Luciana e dodici condivisi per la coppia.

## Veronica — vecchia prenotazione sostituita

Il rinnovo da otto lezioni era confermato, ma non attivato: la prenotazione del 30 settembre alle 10:00 restava aperta oltre alle otto sedute effettivamente svolte. L'utente ha chiarito «Era sostituita: annulla la vecchia prenotazione». La prenotazione è stata annullata e la proposta attivata nella stessa transazione auditata, con controllo dei dati concorrenti.

Verifica reale: otto residue, otto prenotate dal 14 ottobre al 6 novembre (mercoledì e venerdì 09:00, Gianluca); mantenuti tutti gli ID delle nuove prenotazioni. Nessuna presenza o pagamento aggiunto. Browser aggiornato: otto righe «Ciclo corrente», precedenti nello storico. Il precedente «Storico» dello screenshot apparteneva alla pagina rimasta aperta: prima della rettifica il sito aggiornato mostrava già «Rinnovo confermato». Nessuna nuova modifica al codice o pubblicazione necessaria.

## Controllo di tutti i clienti e segnaposto

Controllati 31 clienti (23 attivi e 8 inattivi), 811 appuntamenti e 7 proposte di rinnovo, confrontando database e browser pubblico. Per tutti i clienti attivi il residuo salvato coincide con il ricalcolo; nessun appuntamento senza cliente, PT o durata, nessun doppione dello stesso cliente alla stessa ora, nessuna coppia incompleta o associazione non reciproca. I rinnovi attivati di Luciana, Veronica e Cristiano/Silvia hanno rispettivamente 8, 8 e 12 appuntamenti correnti. Patrizia e Vincenza hanno entrambe 6 residue. Tre proposte sono ancora in attesa di conferma (Aurora, Leonard, Giuliano); quella di Emanuela risulta rifiutata.

Tamara e Giuseppe avevano rispettivamente 122 e 115 prenotazioni PT, comprese 111 future ciascuno. L'utente ha chiarito: «Sono segnaposto: escludili dai conteggi». Convertite le sole prenotazioni di questi due clienti nel servizio esistente «Blocco agenda», tramite `calendar_audit_write`, conservando identificativi, clienti, PT, date, orari e stato. Prova completa con rollback prima dell'applicazione; transazione con controllo delle quantità e dei saldi. Nessuna seduta svolta, residuo, pagamento o proposta modificati. Il primo tentativo effettivo non è partito per timeout della revisione automatica; verificati dati invariati prima dell'unico nuovo tentativo riuscito.

Browser dopo la rettifica: Tamara 16 residue, 0 sedute programmate e nessun esubero; Giuseppe 7 residue, 5 svolte, 0 sedute programmate e nessun esubero. I blocchi riservano l'orario ma non rappresentano lezioni programmate: una futura lezione effettiva va registrata come PT. Nessuna modifica al codice o migrazione necessaria. Ripetuti con esito positivo cinque test su rinnovi previsti, coppie, residui e conferma del ciclo.

Restano da ricostruire cinque prenotazioni aperte: Fabrizio 29 settembre e 6 ottobre alle 19; Giuliano 29 settembre alle 17; Leonard 29 settembre alle 16 e 5 maggio alle 16 (data anomala collegata al ciclo di settembre). L'utente non ricorda l'esito: nessuna presenza o cancellazione presunta. Michele, Angelo, Nicola e Gustavo hanno ciascuno una lezione residua da programmare. Tra gli inattivi, Marco Barracu ha 12 residue salvate contro 11 ricalcolate, Maria Mura 1 contro 0: nessuna rettifica automatica dello storico. Non è quindi una certificazione che ogni dato storico sia corretto.

Verifica conclusiva: 237 registrazioni di audit, tutte da PT 1:1 a blocco e nessuna variazione di data, ora, cliente o PT. Browser: tutti i 237 blocchi visibili e riepilogo compensi identico rimuovendoli dal campione. Apple ha recepito tutti i 236 segnaposto già collegati (nessun collegamento storico aggiunto): zero segnaposto ancora classificati PT. Dopo alcuni tentativi intermedi rifiutati e limiti di durata dei gruppi, ultimo passaggio alle 13:37 UTC con 240 elementi elaborati e zero errori.
