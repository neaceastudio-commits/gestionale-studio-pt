# Prova Acquisizione → Calendario con dati simulati

Verifica del 12 settembre 2026 sul branch `feature/apple-calendar-import-step1`, PR #8 ancora Draft.

## Risultato

Il test apre in Chrome la pagina reale `app/acquisizione/index-calendar-test.html`, configura un cliente simulato PT 1:1 da 8 sedute (martedì 17:00 / giovedì 18:00) e preme “Attiva e trasferisci”. Esegue la funzione `schedule-client-package` con il database sostituito da dati in memoria. Ogni richiesta del browser è intercettata e ogni fetch del backend è sostituita: nessuna scrittura o lettura del database reale.

Verificati:
- un solo cliente attivato e acquisizione archiviata;
- esattamente 8 appuntamenti assegnati al PT scelto;
- residuo salvato ancora 8 dopo la pianificazione;
- metriche reali del Calendario: 7 residue dopo aver impostato una seduta Fatto;
- spostamento senza variazione del residuo;
- annullamento che libera una sola seduta programmabile, residuo sempre 7;
- creazione della sostituzione e blocco di ulteriori sedute, anche scegliendo una data iniziale successiva;
- conteggio degli appuntamenti anche oltre la prima pagina REST;
- rifiuto delle date impossibili e delle sessioni senza segreto server configurato.

Il completamento e lo spostamento sono simulati sullo stato in memoria; viene eseguito il calcolo del Calendario, ma questa prova non certifica la persistenza remota del comando Fatto. Il valore salvato del residuo viene aggiornato esplicitamente nella fixture prima di ripianificare.

## Esecuzione

Controlli senza dipendenze aggiuntive:

```sh
bash scripts/check-package-calendar.sh
```

Prova completa nel browser, con Playwright già installato:

```sh
CALENDAR_BROWSER_TEST=1 PLAYWRIGHT_MODULE=/percorso/node_modules/playwright CHROME_PATH='/percorso/Chrome' bash scripts/check-package-calendar.sh
```

Lo screenshot viene salvato in `/tmp/neacea-calendar-simulation.png`; il percorso è configurabile con `CALENDAR_QA_SCREENSHOT`.

## Stato del rilascio

Nessun deploy, merge o cambiamento a Supabase eseguito durante questa verifica. Le modifiche preesistenti al Portale PT e all'Anamnesi restano fuori da questo intervento.

Netlify `new-calendar-neacea` pubblica soltanto `app/calendario-studio`; i branch deploy sono disabilitati. La pagina Acquisizione di test appartiene a una cartella diversa e non è inclusa nel publish del Calendario. Inoltre entrambe le pagine usano ancora il database Studio: una preview non costituisce un database isolato.

Prima del rilascio reale restano da verificare disponibilità PT e regole di sala rispetto al calendario corrente, richieste concorrenti (la lettura seguita da inserimento non è una transazione atomica), ripresa dopo errore successivo all'attivazione e persistenza completa dello stato Fatto. Questi casi non sono coperti dalla prova simulata e la PR resta Draft.
