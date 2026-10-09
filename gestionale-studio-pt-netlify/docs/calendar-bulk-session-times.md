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


Pubblicazione 30 settembre 2026: commit `79011ae737f95c9c20c054bedc368778fa2f38fb`, branch `release/calendar-bulk-times`, deploy `6abd1f29e826bf340b6f8d96`. Dominio principale verificato; cambiato solo `/js/app.js`. Blocco dei deploy automatici ripristinato.

## Correzione del flusso — 1 ottobre 2026 (locale, non pubblicata)

Il campo Nuovo orario viene ora letto direttamente dal salvataggio multiplo:
non serve più il passaggio intermedio Imposta sulle selezionate. All'apertura
sono selezionate le sedute future ammissibili; cambiando data iniziale o giorno
la selezione si aggiorna automaticamente, con conteggio visibile. Le singole
sedute possono essere escluse togliendo la spunta. Dopo il salvataggio il quadro
si ricarica dallo stato aggiornato e mostra il numero di sedute salvate.

Verifiche: 8 test calendar-bulk-times, regressione calendar-release-regression
e controllo sintattico app.js superati. Nessuna scrittura su appuntamenti reali.

### Sedute mancanti: continuità degli orari
La proposta mostra anche orario e PT ricavati dall'ultima seduta dello stesso
giorno della settimana nel ciclo corrente, escludendo annullate e altri servizi.
Genera mancanti usa lo stesso riferimento, incluse durata e pausa. L'orario
manuale è facoltativo e prevale se compilato. Se manca il giorno di riferimento,
si usa una configurazione uniforme solo se tutte le sedute concordano; altrimenti
occorre indicare l'orario. Eliminato il valore arbitrario delle 09:00.
Verificati 3 casi aggiuntivi, 11 test complessivi superati e regressione calendario.
Modifica locale, da pubblicare insieme alla correzione del cambio multiplo.
