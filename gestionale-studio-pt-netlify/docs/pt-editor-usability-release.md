# Portale PT — usabilità editor, 18 settembre 2026

Branch: `feature/whatsapp-agenda-pt-v1`. Modifiche locali non committate; lavorazioni preesistenti preservate.

## Correzioni

- Conservazione dello scorrimento durante render e sincronizzazione dell’editor; nuovo esercizio focalizzato senza salto all’inizio.
- Dati iniziali, settimane e duplicazione raccolti in un pannello richiudibile, inizialmente chiuso.
- Pulsante Salva scheda anche in fondo all’editor e alla scheda operativa; stessa procedura di salvataggio esistente e stessi permessi.
- Campi di allenamento esclusi dall’autocompletamento dei contatti; login e ricerca esercizi mantenuti. Browser o estensioni possono ignorare gli attributi anti-autofill: non sono state alterate le impostazioni personali del browser.
- I miei clienti come vista iniziale per ogni PT, proprietario incluso. Altri clienti solo con scelta esplicita e permessi già esistenti; cambio filtro protegge il salvataggio del cliente uscente.

File principali: `app/portale-personal-trainer/index.html`, `js/program-templates.css`, `js/coaching-editor.js`; sorgenti `tools/coaching-editor/src/ui-state.ts`, `src/index.ts`, `src/vendor/components/program-editor.ts`; regressioni `tests/pt-editor-usability.test.cjs`.

## Verifiche

- Build editor e suite adapter: migrazione legacy, round-trip archivio, copie indipendenti, settimane, prescrizioni e misurazioni.
- 20 test Node superati: usability, visibility, save queue, usage safety, library, Hand Grip, persistence, templates e portal access.
- Sintassi JavaScript inline e `git diff --check`: superati.
- Browser locale autorizzato su `127.0.0.1:8830`, esclusivamente dati fittizi: cinque aggiunte senza ritorno a inizio pagina; salvataggio inferiore; riapertura dei cinque esercizi con serie/ripetizioni conservate; pannello apribile/richiudibile; salvataggio carico fittizio nella scheda operativa; proprietario inizialmente limitato ai propri clienti e passaggio esplicito tutti/propri.
- Non eseguiti login o modifiche su dati cliente reali in produzione.

## Pubblicazione

Sito: https://neacea-portale-personal-trainer.netlify.app/

Deploy verificato `6aada43a64d3963d3127855d`, stato ready; precedente `6aad9299b7561ccfd9f6c21f`.

Pubblicati soltanto index, bundle editor e CSS, con versione asset aggiornata. Sei funzioni server e tutti gli altri asset preservati byte per byte; nessuna migrazione e nessun cambiamento ai permessi. Procedura Netlify con anteprima verificata prima della promozione, blocco produzione preservato.

Verifiche online: hash dei tre file identici alla release testata; 13 richieste senza autenticazione rifiutate sia in anteprima sia in produzione. Nessun passaggio esterno necessario; ricaricare le schede browser già aperte per utilizzare la nuova interfaccia.
