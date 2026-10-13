# Calendario — Resoconto giornaliero PT

Staff → Resoconto giornaliero: tabella per mese e PT, con orario, clienti,
numero della lezione, servizio, presenza, ore e compenso maturato.
Dal Riepilogo ore, “Vedi lezioni giorno per giorno” seleziona direttamente il PT.
Ogni giorno ha un subtotale. Le coppie occupano una sola riga, con presenze
indipendenti. Inclusi clienti archiviati, sospesi e mancanti dall’anagrafica.

Il filtro iniziale mostra sedute remunerate. Consultabili anche tutte,
prenotate, con assenze e annullate. Il totale mese resta completo; i subtotali
giornalieri sommano le sole righe mostrate. Regole di remunerazione invariate:
il modello condiviso restituisce i contributi individuali nello stesso
passaggio che calcola il mese. Nessuna scrittura in questo flusso.

N. lezione: numero salvato nella programmazione per il partecipante; altrimenti
# indica l’ordine delle lezioni registrate nello stesso ciclo, includendo
altri mesi e PT. Non certifica la completezza del vecchio storico. Senza ciclo
o numero salvato compare —; annullate e provvisorie non ricevono numeri nuovi.

Riscontro in sola lettura del 13 ottobre: Alessandro ha a ottobre 30 ore PT 1:1
svolte e 5 PT 1:2: totale 35 ore remunerate, 375 euro. Le assenze PT 1:1 non
maturano compenso secondo la regola attuale. L’utente ha chiarito che 41 è il
conteggio personale di Alessandro: per spiegare la differenza occorre il suo
elenco. Nessuna rettifica di presenze/compensi dal solo totale dichiarato.

Verifiche: pt-hours-report.test.cjs (contributi riconciliati, sovrapposizioni,
clienti archiviati/mancanti, numerazione); browser con dati simulati (coppie,
filtri, cambio PT, vuoto, mobile, zero scritture); suite generale Calendario.
Nessuna migrazione o modifica di dati reali.
