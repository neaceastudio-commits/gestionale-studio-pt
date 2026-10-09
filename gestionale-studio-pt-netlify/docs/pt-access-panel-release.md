# Accesso personale PT nel Cruscotto — 21 settembre 2026

Applicazione: Cruscotto PT, con trasferimento del pannello da Centrale PT e aggiornamento della funzione amministrativa del Portale PT.
Branch: `feature/whatsapp-agenda-pt-v1`.

## Risultato

In `https://cruscotto-pt.netlify.app/#access` la Direzione seleziona il personal trainer, modifica l’email login, spunta o deseleziona «Abilita portale personale» e preme «Salva accesso». Lo stato visualizzato cambia soltanto dopo il salvataggio riuscito. L’invio della mail è un’azione separata, disponibile per accessi attivi e salvati. Nessuna email è stata inviata durante le verifiche.

Il server autorizza esclusivamente la Direzione, protegge gli account Direzione, valida email e duplicati, registra la modifica tramite il gateway di audit esistente e non cambia ruoli, stato Staff o assegnazioni. Il controllo esistente della versione accesso invalida le vecchie sessioni del Portale alla successiva richiesta e le mantiene invalide dopo la riattivazione.

La Centrale contiene ora un collegamento al nuovo pannello. Il Cruscotto aggiorna gli accessi dopo la verifica Direzione e supporta l’apertura diretta `#access`, inclusi i cambi di hash nella stessa pagina.

## File principali

- `app/cruscotto-pt/index.html`
- `app/cruscotto-pt/studio-audit-access.js`
- `app/portale-pt-fase1/index.html`
- `app/portale-pt-fase1/js/portal.js`
- `netlify/functions/pt-portal-admin.js`
- `tests/pt-portal-access.test.cjs`
- `tests/cruscotto-compact-browser.cjs`
- `tests/centrale-restored-browser.cjs`

## Verifiche

- 8 test Node superati: autorizzazione, disattivazione, revoca sessioni e riattivazione, email valide/duplicate, invio simulato solo al destinatario registrato.
- Browser Cruscotto: attivazione/disattivazione, errore di salvataggio, invio simulato, login Direzione dal pannello aperto, assegnazioni e impaginazione con 42 clienti, viewport mobile 390px senza overflow orizzontale.
- Browser Centrale: caricamento e filtro PT, collegamenti assegnazioni/accessi al Cruscotto, scritture anonime negate.
- Controllo sintassi e `git diff --check` superati.
- Nessun accesso reale modificato nei test, nessuna migrazione.

## Pubblicazione verificata

- Portale backend: `6ab1641d37cac600d11f2418`.
- Cruscotto: `6ab16458d8bb91009245e906`.
- Centrale: `6ab164ba20588b00b7684c63`.

File online confrontati con gli artefatti di rilascio; endpoint senza sessione restituisce 403. Funzioni non interessate conservate tramite hash e blocchi dei deploy ripristinati. Nessun passaggio esterno ancora necessario.

Stato Git finale: working tree con modifiche precedenti e file non tracciati già presenti; modifiche di questo intervento lasciate nel branch indicato, senza commit o reset delle altre lavorazioni.
