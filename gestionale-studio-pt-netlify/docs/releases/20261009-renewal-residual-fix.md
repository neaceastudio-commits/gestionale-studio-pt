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
