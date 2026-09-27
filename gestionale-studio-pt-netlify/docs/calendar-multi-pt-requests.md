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
