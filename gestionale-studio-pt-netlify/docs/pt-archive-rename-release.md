# Portale PT — Rinomina schede dell’archivio

Pubblicato il 28/09/2026: `6abaa3a93eba94b33094d629`.
Branch: `feature/whatsapp-agenda-pt-v1`.

Pulsante Rinomina dedicato sulle schede già salvate nell’Archivio Programmi,
separato dal comando Sposta. Finestra con il nome attuale selezionato,
Annulla e Salva nome. I nomi vuoti non sono accettati. Durante il salvataggio
il modulo impedisce invii ripetuti; un errore mantiene la bozza disponibile.

Riutilizzata l’API update_template con controllo concorrenza e retry.
Nessuna variazione ai permessi: creatore della scheda e Direzione possono
rinominare. Identità, esercizi, descrizione, cartella e copie cliente restano
invariati; non viene creata una copia nell’archivio.

File: `app/portale-personal-trainer/index.html` e
`app/portale-personal-trainer/js/program-templates.js`.

Verifiche: test API della libreria (2 passati), collaudo Chrome con dati
fittizi di salvataggio in archivio e rinomina, nome persistente dopo
aggiornamento, validazione, annullamento, stessa identità e cartella,
stessi esercizi e nessuna variazione delle schede cliente; sintassi JS e
git diff --check superati.

Rilascio isolato dalla versione `6aba6b19e59580573a59b8b5`: due asset
aggiornati, tutti gli altri asset e le 19 funzioni invariati. Hash verificati
sul dominio principale e blocco dei deploy automatici mantenuto.
Nessuna migrazione o modifica di dati reali per i test.

Git: index.html modificato; program-templates.js e questo documento non
tracciati nel branch corrente. Lavorazioni preesistenti preservate, nessun
commit o reset. Nessun passaggio esterno necessario.
