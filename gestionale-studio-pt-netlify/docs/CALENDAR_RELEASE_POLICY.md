# Pubblicazione sicura del Calendario

Il Calendario di produzione deve provenire esclusivamente dal repository GitHub
`neaceastudio-commits/gestionale-studio-pt`, branch `main`, cartella
`gestionale-studio-pt-netlify/app/calendario-studio`.

Regole obbligatorie:

1. non eseguire deploy Netlify manuali della cartella Calendario;
2. salvare prima ogni modifica in un commit Git;
3. eseguire `scripts/check-calendar-release.sh`;
4. pubblicare soltanto tramite il collegamento GitHub di Netlify;
5. il controllo deve confermare insieme Apple Calendar, cicli e rinnovi,
   storico clienti, doppio PT controllato e filtro PT firmato.

Netlify deve mantenere attiva l'opzione che impedisce deploy di produzione non
provenienti da Git. Se un controllo fallisce, il deploy è bloccato.
