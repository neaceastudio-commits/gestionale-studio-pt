# Rinnovo incompleto nel Quadro pacchetto — 20 ottobre 2026

Applicazione: Gestionale Studio PT, Calendario. Branch:
`feature/whatsapp-agenda-pt-v1`.

Il Quadro riconosceva il rinnovo previsto dalla presenza dei suoi appuntamenti.
Una proposta incompleta, senza prenotazioni generate, lasciava invece visibile il
modulo per un secondo rinnovo. La proposta già aperta impediva poi quel rinnovo
nel gateway/database. Il dato incompleto diventava quindi un percorso senza
un'indicazione diretta per correggerlo.

Il Quadro ora consulta le proposte anche quando non ci sono appuntamenti e mostra
«Completa rinnovo», che apre la modifica della proposta esistente. Il modulo per
un nuovo rinnovo resta nascosto durante la verifica, in presenza di una proposta
e in caso di errore di lettura; un pulsante consente di riprovare la verifica.
Una risposta arrivata dopo la sostituzione del dialogo non cambia il nuovo Quadro.

Un orario mancante in un giorno già previsto resta vuoto, anziché diventare
09:00. Giorno abilitato, ora e PT richiedono una scelta valida prima del
salvataggio. I giorni esclusi non bloccano la validazione del modulo.

File: `app/calendario-studio/js/app.js`, `js/expected-renewals.js`,
`app/calendario-studio/index.html` e
`tests/calendar-expected-renewals-browser.cjs`. Le modifiche locali precedenti
agli stessi file e al Portale sono conservate.

Verifiche: quattro test su proposte, transazioni, idempotenza, permessi, coppie e
residui passati; regressione Chrome mobile con dati sintetici passata, compresa
proposta senza prenotazioni, correzione esplicita dell'ora, conferma della stessa
proposta, mancata creazione di duplicati/incassi, errore di lettura e recupero.
Sintassi e `git diff --check` passati. I controlli funzionali di
`scripts/check-calendar-release.sh` passano; il gate Git finale segnala i file
critici non committati, comprese le lavorazioni preesistenti.

Solo correzione locale: nessun deploy, migrazione o modifica dei pacchetti reali.
Restano da applicare i giorni/orari concordati della proposta del cliente e da
pubblicare il Calendario con richiesta esplicita dell'utente.
