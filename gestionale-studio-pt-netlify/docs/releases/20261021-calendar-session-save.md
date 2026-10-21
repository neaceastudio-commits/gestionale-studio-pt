# Calendario — salvataggio cambio PT e sedute da rinnovo

Richiesta del 21 ottobre 2026: pubblicare la correzione del cambio PT segnalato
per Aurora e cercare altri difetti nei salvataggi collegati. Branch di lavoro:
`feature/whatsapp-agenda-pt-v1`. Nessuna modifica manuale ai dati reali.

Il modulo appuntamento nasconde il blocco `NEACEA-PT-SESSION-V1`, ma prima
salvava le note senza reinserirlo. Il database rifiutava quindi la modifica di
una seduta registrata da un rinnovo per perdita del collegamento al ciclo.
Ora anteprima disponibilità e salvataggio conservano quel blocco quando
servizio e partecipanti restano gli stessi. Le note libere modificate rimangono
quelle dell'utente; cambio partecipanti o servizio non copia il vecchio ciclo.

Correzioni correlate:

- Note vuote: non viene più mostrato il JSON interno come testo modificabile.
- Salvataggio serializzato con pulsante occupato: il doppio clic non invia
  due richieste. Se il modulo viene chiuso o sostituito durante la verifica,
  i valori del nuovo modulo non vengono salvati sulla vecchia seduta.
- Verifica runtime limitata a otto secondi e condivisa fra richieste simultanee;
  dopo un errore è possibile riprovare. In caso di errore si applicano i
  controlli frontend restrittivi; il server continua a verificare ogni scrittura.
- Errori server persistenti nel modulo, bozza conservata e retry disponibile.

Verifiche locali: dieci test dedicati su metadati, presenze, concorrenza,
sostituzione modulo, timeout e retry; tre test PGlite con le funzioni SQL reali
su rinnovi singoli/coppie, residui, attivazione e permessi. La regressione SQL
dimostra il rifiuto del vecchio payload e il cambio PT riuscito con collegamento
preservato e residuo invariato. Prova Chrome mobile su dati sintetici: cambio
PT, riapertura dopo reload, note senza JSON, errore server e retry superati.
Controlli funzionali del release script superati nel checkout di lavoro;
gate Git finale segnala le modifiche non committate preesistenti.

Rilascio isolato dalla base online `ae9c61b84d633a518aa7134ca5a1812101fae86b`
(deploy `6ad7844dc181ff44392d6634`), senza includere le lavorazioni locali del
Portale. Nessuna migrazione o variazione a funzioni server, permessi, email,
appuntamenti o pacchetti reali. Il candidato committato ha superato tutta la suite di rilascio, compreso
il gate Git, e le due prove Chrome mobile (salvataggi e rinnovi).

## Pubblicazione autorizzata

- Branch di rilascio: `release/calendar-session-save`.
- Commit: `c191a363a07a920390209c5f0f80654cf60da8a5`.
- Deploy production: `6ad91785fd911ad109a6344c`, stato `ready`, pubblicato il
  21 ottobre 2026 alle 21:50 Europe/Rome.
- Sito: https://new-calendar-neacea.netlify.app/.
- Produzione bloccata sul nuovo deploy.

Verificati il manifesto di 42 file e i tre asset modificati (`index.html`,
`js/app.js`, `js/calendar-flex.js`) tramite SHA-256 direttamente dal sito
pubblico. Solo questi tre asset cambiano rispetto alla base. Tutte le 15
funzioni conservano runtime, regione e pianificazioni; 13 bundle hanno digest
identico, i due bundle pianificati ricompilati sono ciascuno più piccoli di sei
byte. I sorgenti delle funzioni e la configurazione di build sono identici alla
base; la differenza di dimensione coincide con quella del nome del branch
incluso nei metadati generati (questa attribuzione è un’inferenza).

Configurazione finale verificata: nuovo deploy `locked: true`, repository su
`main`, `stop_builds: true`. Nessun altro sito è stato pubblicato.

File principali: `app/calendario-studio/js/app.js`, `js/calendar-flex.js`,
`app/calendario-studio/index.html`, `scripts/check-calendar-release.sh`, test
`calendar-appointment-session-*`, `calendar-runtime-timeout.test.cjs` e
`calendar-expected-renewals.test.cjs`.
Le modifiche preesistenti nel checkout di lavoro sono conservate; il commit di
rilascio è disponibile anche nel repository locale sul branch dedicato.
L’utente deve ricaricare il Calendario per usare il nuovo frontend e ripetere il
cambio PT desiderato; non sono state salvate modifiche sulle sedute reali.
