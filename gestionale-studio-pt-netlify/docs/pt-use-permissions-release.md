# Portale PT — Compilazione e visibilità attività

Pubblicato il 28/09/2026: `6aba624ec21d23227a771c9f`.
Branch locale: `feature/whatsapp-agenda-pt-v1`.

- Usa scheda non offre aggiunta/rimozione delle serie prescritte. I gestori
  rifiutano queste operazioni anche se richiamati durante la compilazione.
- Il referente conserva la modifica della struttura. Per il PT condiviso,
  Usa scheda presenta la registrazione separata della propria seduta, con
  carichi, ripetizioni, RIR e note; nessuna scrittura sul programma generale.
- Rimossa dalla gestione programmi la lista delle revisioni ripristinabili.
  Nessuna cancellazione dello storico nel database.
- Monitoraggio e storico attività visibili solo alla Direzione con email
  nutrizione.gianlucapirisi@gmail.com. Hand Grip invariato.
- Restano i controlli server già pubblicati: grant esplicito, PT assegnato
  alla seduta, revoca immediata e modifica strutturale riservata al referente.

File modificati: `app/portale-personal-trainer/index.html`,
`app/portale-personal-trainer/js/session-log.js`; test in
`tests/pt-usage-safety.test.cjs`, `tests/pt-session-records-api.test.cjs`,
`tests/pt-session-records-browser.cjs`.

Verifiche: 13 test Node passati, browser Chrome a 390px con dati fittizi
(salvataggio, retry offline, spostamento del modulo in Usa scheda,
visibilità dello storico, isolamento cliente e blocco sedute future),
sintassi degli script e git diff --check.

Rilascio isolato basato su `6aba537a0cb8497315d20558`: aggiornati solo
index.html e session-log.js. Tutti gli altri asset e le 19 funzioni
conservati, compresi hash, memoria, regione e pianificazioni.
Il primo candidato draft non è stato pubblicato perché il confronto della
memoria differiva. Il candidato in contesto produzione ha passato tutti i
confronti. Hash verificati anche sul dominio principale dopo la pubblicazione;
blocco dei deploy automatici mantenuto. Nessuna migrazione o scrittura di
prova sui clienti reali, nessun passaggio esterno ancora necessario.

Stato Git: branch invariato, modifiche locali e file non tracciati preesistenti
preservati; nessun commit o reset.
