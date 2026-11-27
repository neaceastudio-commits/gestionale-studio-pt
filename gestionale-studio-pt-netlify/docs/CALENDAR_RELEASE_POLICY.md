# Pubblicazione sicura del Calendario

Il Calendario di produzione deve provenire esclusivamente dal repository GitHub
`neaceastudio-commits/gestionale-studio-pt`, branch `release/calendar-birthdays-20261127`, cartella
`gestionale-studio-pt-netlify/app/calendario-studio`.

Il ramo del 27 novembre 2026 prosegue esattamente la release già pubblicata
`release/calendar-studio-access-20261125` (commit `8271c8a`), aggiungendo i
compleanni richiesti dall'utente. `main` contiene una linea diversa e non va
pubblicato indiscriminatamente. Netlify è stato allineato a questo ramo;
restano obbligatori Git, i controlli e la verifica dell'esatto deploy prima
della pubblicazione. Le altre applicazioni del repository restano separate.

Regole obbligatorie:

1. non eseguire deploy Netlify manuali della cartella Calendario;
2. salvare prima ogni modifica in un commit Git;
3. eseguire `scripts/check-calendar-release.sh`;
4. pubblicare soltanto tramite il collegamento GitHub di Netlify;
5. il controllo deve confermare insieme Apple Calendar, cicli e rinnovi,
   storico clienti, doppio PT controllato e filtro PT firmato.

Netlify deve mantenere attiva l'opzione che impedisce deploy di produzione non
provenienti da Git. Se un controllo fallisce, il deploy è bloccato.
