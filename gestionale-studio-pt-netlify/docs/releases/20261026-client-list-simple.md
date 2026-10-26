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


## Esito finale

Candidato `500b359b9fec77ea7541f346bce86c6f5726ac05`, sul ramo esistente
`release/calendar-save-guard-20261026`. Suite completa
`bash scripts/check-calendar-release.sh` superata nel checkout pulito,
compreso il gate Git; dipendenze dal lockfile con npm ci --ignore-scripts.

Anteprima `6adf8a3f831646598b839d77` verificata e prova browser remota
superata. Produzione effettiva `6adf8a670077cb546c3caa82`, pubblicata
`2026-10-26T17:14:30.871Z`, stesso commit. La build richiesta esplicitamente
`6adf8a68d35ab8d2c9d95a0f` è distinta dalla build automatica effettivamente
pubblicata: entrambe sul medesimo commit candidato.

Manifesto intero 43 file confrontato: cambiano solo index.html e js/clients.js.
Entrambi confrontati byte per byte con Git. Tutte le 15 funzioni hanno digest,
runtime e configurazioni identici; due pianificazioni invariate; anonimo 401.
Prova browser sugli asset realmente pubblicati e API sintetiche superata,
inclusi riapertura, Attivi/Storico, trasferimento PT e assenza dei controlli.
Nessuna modifica a dati reali, schema, permessi o altri siti.
Netlify finale locked, ramo main, build sospese, soli rami main ammessi.

Stato Git: checkout locale ancora feature/whatsapp-agenda-pt-v1 / 65cfcc6,
lavorazioni precedenti conservate. Candidato e prove salvati nel ramo di
rilascio; git diff --check superato. Per vedere il nuovo elenco nelle pagine
già aperte basta ricaricare il Calendario. Nessun altro passaggio esterno.
