# Portale PT — Elenco clienti e conteggio programmi

Pubblicato il 28/09/2026: `6aba6b19e59580573a59b8b5`.
Branch: `feature/whatsapp-agenda-pt-v1`.

Rimossa dalla pagina Clienti la sezione Compila la tua seduta. La compilazione
del PT condiviso rimane in Usa scheda; il registro riservato alla Direzione
rimane accessibile nel profilo del cliente, non sotto l'elenco generale.

Il conteggio nei riquadri cliente esclude ora i programmi eliminati nel
Cestino, che prima venivano inclusi. Quando non restano programmi compare
Nessun programma salvato; il singolare è 1 programma salvato.
Lo storico delle programmazioni non eliminate continua a essere conteggiato.

File pubblicati: `app/portale-personal-trainer/index.html` e
`app/portale-personal-trainer/js/session-log.js`.

Verifiche: 10 test Node passati; test Chrome del conteggio dopo eliminazione,
nuovo accesso e ripristino; test Chrome della compilazione condivisa, retry
offline, permessi dello storico e assenza del modulo nella pagina Clienti.
Sintassi JavaScript e git diff --check superati.
Il simulatore locale include risposte vuote per appuntamenti e registrazioni;
i test utilizzano soltanto clienti fittizi.

Rilascio isolato dalla versione `6aba67b618c1d94d65aadcdd`, con verifica degli
hash prima e dopo la pubblicazione. Tutti gli altri asset e tutte le 19
funzioni invariati; blocco dei deploy automatici mantenuto. Nessuna migrazione
o modifica dei dati reali. Nessun passaggio esterno necessario.

Stato Git: index.html modificato; session-log.js, test e documento non
tracciati nel branch corrente. Lavorazioni preesistenti preservate, nessun
commit o reset.
