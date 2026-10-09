# Portale PT — Collaudo d'uso

Richiesta: verificare e correggere gestione schede, fedeltà dell'archivio,
cancellazione schede cliente e modelli, salvataggi e uso durante le sedute.
Pubblicazione autorizzata dopo le verifiche. Test con dati fittizi, nessuna
modifica a clienti reali, assegnazioni o ruoli.

Branch: `feature/whatsapp-agenda-pt-v1`. Baseline online:
`6aad4a2ef09963c925fa0fd8`. Worktree già modificato; nessun ripristino distruttivo.

## Percorsi da verificare

- Accesso valido/errato, PT senza clienti, sola lettura Direzione.
- Filtro attivi/storico, ricerca, cambio cliente e programma durante salvataggio.
- Creazione vuota, nome, esercizi, ordinamento, settimane, progressioni e gruppi.
- Salva ora/autosave, risposta lenta, errore, conflitto, riapertura da server.
- Archivio: confronto prescrizione completa, anteprima, nome, retry, importazione.
- Copia programma e seduta con identità nuove e senza registrazioni cliniche.
- Eliminazione cliente/modello: annulla, conferma, recupero cliente, copie intatte.
- Uso scheda: data, carichi, ripetizioni, RIR e note; storico e separazione dal modello.
- Hand Grip: salvataggio, storico, errore e cambio cliente.
- Layout desktop/tablet/mobile e nessun errore JavaScript.

## Correzioni verificate

- Prescrizione separata da ripetizioni/RIR/carichi/note effettivi. Lo snapshot
  programmato è autorevole per archivio e copie; i dati delle sedute rimangono
  nella scheda cliente. Le note tecniche condivise richiedono conferma privacy.
- Modelli conservano anche obiettivo, livello, frequenza e riscaldamento generale.
  Anteprima completa in sola lettura, settimane selezionabili e gruppi visibili.
- Cambio cliente/programma attende autosave e si ferma in caso di errore o conflitto.
  Eliminazione/ripristino serializzati, con versione aggiornata e UI protetta.
- Cestino schede cliente distinto dall'archivio generale. Conferme accessibili,
  annullamento e recupero; eliminare un modello non modifica le copie assegnate.
- Retry di schede e Hand Grip con identità stabile: una risposta persa non produce
  un secondo record o un falso conflitto sullo stesso salvataggio.
- Stato completo salvato autorevole anche per valori cancellati: la cache storica
  non reinserisce carichi/serie rimossi. Recupero storico legacy mantenuto.
- Bozze Hand Grip isolate per cliente; cambio cliente bloccato durante il salvataggio.
- Rimozione di una settimana riallinea progressioni, gruppi, date e serie.
- Mese successivo riparte dalla prescrizione; vecchi carichi soltanto come riferimento,
  senza riportare ripetizioni effettive, note di seduta o flag di registrazione.
- Contatore schede nella lista clienti aggiornato dopo il salvataggio.

## Verifiche eseguite il 18 settembre 2026

Test automatizzati tutti superati:

```sh
node --test tests/pt-client-visibility.test.cjs tests/pt-portal-access.test.cjs tests/pt-save-queue.test.cjs tests/pt-usage-safety.test.cjs tests/pt-templates.test.cjs
node tests/pt-program-persistence.test.cjs
node tests/pt-hand-grip.test.cjs
node tools/coaching-editor/test.mjs
node tools/coaching-editor/build.mjs
git diff --check
```

13 test Node, più suite a assertion per persistenza, Hand Grip e adapter.
Controlli sintattici degli script frontend/backend e degli script inline HTML.
Confronto canonico completo `scheda → archivio → assegnazione → riapertura`,
incluse impostazioni, settimane, gruppi e note tecniche.

Prove UI tramite browser controllato, con `visibility-fixture.cjs` su loopback
e backend reale dell'app collegato **esclusivamente a record fittizi**:

- Accesso errato/valido, PT senza clienti, Direzione in sola lettura.
- Creazione vuota rifiutata se manca il nome; creazione da modello anche per
  un secondo cliente, nome personalizzato e originale indipendente.
- Inserimento/modifica esercizi, ordine, copia esercizio e seduta, gruppo,
  settimane con prescrizioni differenti e applicazione alle successive.
- Registrazione 5 ripetizioni, carico 55, RIR 0 e nota di seduta; riapertura
  conserva i valori, modello mantiene le 8 ripetizioni e RIR 2 programmati.
- Anteprima completa, settimana 2 diversa dalla 1; retry modello dopo risposta
  persa produce un solo modello; cancellazione modello lascia le copie intatte.
- Cancellazione scheda annullata/confermata, cestino e ripristino; cancellazione
  dell'ultima scheda con salvataggio lento conserva anche l'ultima modifica.
- Risposta persa sul primo salvataggio: una sola scheda, retry riuscito.
- Offline: bozza conservata e cambio cliente bloccato; recupero riuscito.
- Conflitto concorrente esplicito e ricarica della versione server riuscita.
- Hand Grip: retry dopo risposta persa produce una sola misurazione; bozza
  separata per cliente (campo vuoto sul secondo, valore recuperato sul primo).
- Layout smartphone 390 px e tablet 768 px senza overflow della pagina o
  pulsanti fuori viewport; finestra Nuovo programma verificata visivamente.
- Riapertura da server verificata anche con altro operatore in sola lettura.

I log delle prove contengono gli errori di rete intenzionalmente simulati.
`test-browser.cjs` aggiornato per le conferme HTML, controllato sintatticamente
ma **non eseguito in questa sessione**: le prove browser sopra sono state
eseguite tramite CUA. Le prove SQL embedded non sono state rieseguite; nessuna
migrazione o modifica dello schema è inclusa.

## Esito finale

Collaudo locale superato sui percorsi elencati. Pubblicata e verificata online:
release `6aad61747fdfaa337a54d529`, baseline `6aad4a2ef09963c925fa0fd8`.
Sito: https://neacea-portale-personal-trainer.netlify.app/ — stato `ready`,
blocco pubblicazione automatica `locked: true` mantenuto.
Rilascio isolato: cinque file frontend e sola funzione `pt-data` aggiornata;
altre cinque funzioni e asset precedenti mantenuti identici.

Anteprima e produzione: hash di tutti i cinque file verificati; otto azioni API
senza autenticazione respinte con 401; pagina di accesso aperta nel browser senza
errori JavaScript. Nessuna scrittura di dati reali. Cache-buster `20260918-usage`.
File principali: `app/portale-personal-trainer/index.html`, relativi moduli
`js/program-{templates,workflow}.js`, CSS e bundle `js/coaching-editor.js`,
`tools/coaching-editor/src/adapter.ts`, `netlify/functions/pt-data.js` e
`netlify/functions/lib/pt-templates.js`.
Stato Git finale: branch invariato `feature/whatsapp-agenda-pt-v1`, modifiche
locali e file non tracciati presenti, incluse lavorazioni preesistenti preservate;
nessun commit, reset o modifica agli altri repository. `git diff --check` pulito.

Limiti: nessun test con password/sessioni reali dei PT e nessuna scrittura di
collaudo sui clienti in produzione. Non è una certificazione di assenza assoluta
di bug né un test di ogni dispositivo fisico, consegna email o servizio calendario.
I vecchi modelli già archiviati con contenuto errato non vengono riscritti
automaticamente: vanno verificati nell'anteprima e ricreati dalla scheda corretta.
