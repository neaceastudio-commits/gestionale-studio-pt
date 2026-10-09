# Calendario — PT per seduta e richieste puntuali

Modifica locale del 27 settembre 2026, branch `feature/whatsapp-agenda-pt-v1`.

Il referente `clients.pt_assegnato` resta responsabile della scheda cliente e dei programmi. La Direzione può assegnare ciascun appuntamento a un operatore diverso. Il PT della seduta può modificarla anche quando il referente del cliente è un altro PT. Non acquisisce diritti sul pacchetto o sulla scheda cliente, non può appropriarsi di una seduta altrui alterando il draft e non può aggiungere partecipanti non assegnati al proprio profilo. I partecipanti originali restano selezionabili durante la modifica.

Il Portale apre già questo Calendario con sessione firmata: non serve modificare il Portale né introdurre una nuova relazione cliente/PT. Il gateway `calendar_audit_mutate` esistente controlla già operatore originale e finale e limita i nuovi partecipanti ai clienti assegnati. Nessuna modifica a database, audit o integrazione Apple inclusa.

In Disponibilità la ricerca principale consente cliente, servizio e una lista di date indipendenti, ciascuna con ora precisa e durata supportata dal Calendario. Per ogni richiesta mostra PT compatibili e motivi di indisponibilità. Verifica copertura delle disponibilità settimanali anche su fasce contigue, occupazione del PT, sovrapposizione del cliente e capienza sala. Le cancellazioni non occupano gli slot. La cache non verificata è segnalata. Le righe sono una bozza di ricerca nella pagina, non prenotazioni persistenti.

“Prepara seduta” apre il modulo con cliente, data, ora, durata e PT scelti. Il normale salvataggio continua a verificare pacchetto, conflitti e concorrenza; la ricerca non scrive dati. Per 1:2 si aggiunge il secondo cliente nel modulo e si ricontrollano i vincoli. Il controllo della sala nella ricerca considera il singolo cliente selezionato. La ricerca generica precedente resta disponibile in una sezione richiudibile.

Verifiche:
- `node --test tests/calendar-multi-pt-requests.test.cjs tests/operator-availability-sync.test.cjs`
- `tests/calendar-exact-requests-browser.cjs` con Playwright: scelta cliente, ora non tonda, più date, PT differenti, preparazione e rimozione riga, layout mobile.
- `scripts/check-calendar-release.sh`: controlli funzionali superati; gate finale blocca il rilascio perché il repository contiene file critici non committati, anche preesistenti.
- Sintassi JavaScript e `git diff --check`.

Da pubblicare sul sito Calendario solo con richiesta esplicita. Conservare le lavorazioni preesistenti: `app.js` contiene già altre modifiche, da non includere indiscriminatamente nel rilascio. Nessun deploy o scrittura su dati reali effettuato.

## Pubblicazione autorizzata

Pubblicato e verificato su `https://new-calendar-neacea.netlify.app/`.
- Branch isolato: `release/calendar-multi-pt-requests`.
- Commit: `ed6f78f9a7ebe15447fbbe23fecd3eca44db25ce`.
- Deploy: `6ab9886b7d349f3127e14520`.
- 12 test e prova browser superati sul pacchetto isolato. I quattro asset pubblicati corrispondono byte per byte; tutti gli altri asset conservano gli hash precedenti.
- Impostazioni Git ripristinate su main, build automatiche ferme e deploy bloccato.
- La prima build su main non è stata pubblicata. Lavorazioni locali preesistenti conservate; nessuna scrittura sui dati dei clienti.

## Correzione richiesta: colloquio per giorni della settimana

La ricerca a date singole è sostituita da giorni lunedì–sabato selezionabili, ora comune e ora specifica per giorno. Risultati immediati senza anagrafica cliente obbligatoria. Controllo esplicito delle quattro ricorrenze successive dalla data di inizio (oggi come default); mostra copertura completa, parziale e dettaglio dei conflitti. Date e cliente esistente sono opzioni secondarie. Nessuna prenotazione viene creata dalla ricerca.

Branch di rilascio `release/calendar-weekday-availability`, commit `8780d01cf14f5feb5d5cc8fb760cd26d532a2338`. Test: 13 casi più browser con entrambi gli esempi lun/giov/ven alle 10 e mar/mer/sab alle 13, orario diverso per giorno, mantenimento selezione e mobile. File di prodotto: `pt-availability-overview.js`, relativo CSS, versioni asset in `index.html`. Regole PT per seduta preservate. Lavorazioni locali preesistenti conservate.
