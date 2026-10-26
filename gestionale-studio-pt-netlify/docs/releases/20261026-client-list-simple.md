# Calendario — elenco clienti senza classificazione

Su richiesta esplicita dell'utente rimossi menu, etichette «Da classificare»
e filtri Abituali/Occasionali dalla vista clienti. Restano Attivi e Storico.
Dati storici di classificazione conservati senza scritture o migrazioni.
Nessuna modifica al trasferimento PT, alle protezioni di salvataggio o al server.

Produzione di partenza: `93f2b47`, deploy `6adf78c1f4bf11fc29104b82`.
Modifica applicativa limitata a `clients.js` e versione del suo URL in HTML.
Prova browser esistente adattata alla nuova richiesta: lista completa degli
attivi indipendente dai vecchi gruppi, assenza di menu/etichette/filtri,
riapertura, storico separato, cambio PT confermato e dati conservati;
verifica a 390 e 1440 pixel. API e dati browser sintetici.

Checkout locale `feature/whatsapp-agenda-pt-v1`, HEAD `65cfcc6`, modifiche
preesistenti conservate. Candidato sul ramo di rilascio esistente, senza
worktree. Verifiche e stato finale del rilascio da registrare sotto.
