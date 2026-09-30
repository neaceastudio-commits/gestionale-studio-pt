# Quadro pacchetto — orari multipli e pagamenti

30 settembre 2026. Applicazione Gestionale Studio PT.
Branch feature/whatsapp-agenda-pt-v1, modifiche locali non pubblicate.

In Singole sedute, la Direzione può selezionare appuntamenti prenotati futuri
del ciclo corrente, filtrando dal giorno e per giorno della settimana.
Può preparare un orario comune o correggere le righe singolarmente e confermare
un riepilogo unico. Date, PT, durata, servizio, stato e identità sono conservati.
Le sedute con più clienti sono escluse per non spostare altri clienti implicitamente.
Controlli disponibilità e calendario flex restano quelli esistenti. Ogni scrittura
usa il salvataggio atomico già auditato con snapshot atteso, senza rigenerazioni.
Il gruppo non è una transazione unica: al primo errore si interrompe mostrando
il numero confermato, senza dichiarare completate le restanti sedute.

Pagamento corrente e Registra incasso restano aperti. Rettifiche, nuovo rinnovo,
annullamento e storico sono richiudibili. Nessun dato contabile eliminato.
Il vecchio pulsante Salva solo giorni è rinominato per dichiarare che aggiorna
anche orario e PT delle future; la sua logica preesistente non è stata cambiata.

Cliente prestato: test confermano che servono sia condivisione owner sia
appuntamento assegnato al collaboratore. Il collaboratore compila risultati,
non struttura scheda; revoca immediata, storico riepilogativo owner-only.
Aggiunta spiegazione nel Quadro per distinguere prestito da trasferimento referente.

Verifiche: 5 test nuovi su 12 appuntamenti, conflitti, errore parziale,
doppio invio, esclusioni e filtro giorno. 11 test accessi e uso scheda passati.
2 test PGlite su grant/revoca, audit, concorrenza e assegnazione passati.
Regressione Calendario e controlli funzionali check-calendar-release passati;
gate finale release fermo per modifiche locali non committate (anche preesistenti).
Sintassi app.js e git diff --check passati. Nessuna prova UI live autenticata.
Nessuna modifica ai dati produzione, migrazione o deploy effettuato.
