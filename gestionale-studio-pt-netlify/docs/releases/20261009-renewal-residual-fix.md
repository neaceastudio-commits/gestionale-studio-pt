# Correzione rinnovo e residui — 9 ottobre 2026

Richiesta: «ok, sistemami tutto e ricontrollo», dopo i controlli su Luciana, Cristiano e Silvia.

## Problemi e correzioni

Luciana aveva una proposta automatica da otto sedute. Un tentativo dal vecchio percorso ha creato altre otto sedute, poi ripristinate quando il database ha rifiutato un secondo rinnovo. Il vecchio pacchetto è quindi rimasto corrente. La tabella classificava ogni seduta fuori ciclo come «Storico», incluse quelle del rinnovo previsto.

La tabella ora distingue il rinnovo previsto dallo storico. Il quadro pacchetto espone le lezioni della proposta e apre direttamente quella del cliente; quando esistono prenotazioni previste sostituisce il modulo per un secondo rinnovo. Errori di lettura bloccano il rinnovo, senza proseguire nel percorso precedente. La conferma restituisce lo stato realmente salvato, inclusa l'attivazione o un errore di attivazione.

Cristiano e Silvia erano stati riportati da uno a quattro residui con salvataggi del calendario alle 12:41. Il conteggio precedente escludeva tre sedute storiche senza identificativo esplicito del ciclo. La versione corretta le include già; ora il gateway Calendario rifiuta i salvataggi incompatibili dalle vecchie pagine aperte, invitando a ricaricare prima di scrivere. La revisione del protocollo non sostituisce autenticazione o autorizzazione.

La chiusura del residuo dichiarata dalla Direzione può essere conservata nel ciclo come `sessionAdjustments`, con quantità positiva, motivo e data: contribuisce al consumo del pacchetto, è distinta dalle presenze e non genera compensi. Il nuovo ciclo non eredita la rettifica.

## Rettifiche autorizzate

- Luciana: confermare e attivare la proposta esistente da otto lezioni; preservare gli otto appuntamenti e i loro ID, giorni, orario e PT. Nessun incasso nuovo dichiarato.
- Silvia: residuo zero sul vecchio ciclo, mediante rettifica motivata di una lezione. Le presenze storiche non vengono inventate o modificate.
- Cristiano: ripristinare una lezione residua; la lezione individuale del 12 ottobre e le presenze restano alla gestione della Direzione.
- Il rinnovo di coppia rimane da confermare, separato dai vecchi residui.

## Verifiche prima del rilascio

262 test automatici passati. Prova Chrome con dati simulati: otto prenotazioni previste distinte dallo storico, nessun secondo modulo di rinnovo, apertura della proposta dal cliente, modifica di giorni e quantità, errore concorrente recuperabile e conferma. Test regressione specifico: tutte le sedute storiche della coppia contate, rettifica solo sul cliente interessato, invariati compensi e presenze, rettifica non trasferita al nuovo pacchetto. Test gateway: vecchie pagine respinte prima di ogni scrittura di appuntamenti/pacchetti, sessione ancora leggibile.

Nessuna migrazione dello schema necessaria. Pubblicazione e verifiche reali da registrare dopo il rilascio.
