# Cruscotto PT — accessi, pagina compatta e anamnesi essenziale

Pubblicato il 17 settembre 2026: Cruscotto, Portale PT e launcher. Migrazione remota applicata come `20260917140043_pt_portal_access_control`.

## Comportamento

- Il launcher `neacea-launcher` perde soltanto la scheda Centrale PT. Il repository
  Git era precedente al sito live: `apps/neacea-launcher/index.html` è stato
  riallineato al documento effettivamente pubblicato prima della rimozione.
- Cruscotto: sezioni Clienti, Pagamenti, Anamnesi, Statistiche, Accessi Portale PT;
  massimo 8 elementi per pagina nelle liste principali, ricerca e filtro PT.
- La Direzione può attivare/disattivare il solo portale di un PT. Non si cambiano
  ruoli, email, stato Staff, clienti o appuntamenti. Gli accessi Direzione sono
  protetti da questo pannello. Il comando non invia email automaticamente.
- Disabilitazione: rifiuto di login, richiesta codice e accessi API successivi;
  incremento versione sessione. Riattivazione: serve un nuovo login, le vecchie
  sessioni non tornano valide. Le informazioni già visualizzate nel browser
  non possono essere cancellate a distanza.
- Anamnesi: estrazione deterministica dei fatti registrati (obiettivo, condizioni
  e terapie, infortuni/limitazioni, esperienza, frequenza, indicazioni esplicite).
  Nessuna diagnosi o consiglio generato. Testo originale preservato e richiudibile;
  i valori lunghi sono segnalati con “Leggi tutto”, non cancellati.
- Portale PT: la sintesi compare nel contesto cliente dei programmi e delle schede;
  le nuove schede ricevono note essenziali invece dell'intera visita. Le schede
  già salvate non vengono riscritte.

## File e dipendenze

- Frontend Cruscotto: `app/cruscotto-pt/{index.html,studio-audit-access.js,pt-essentials.js}`.
- Frontend Portale: `app/portale-personal-trainer/{index.html,pt-essentials.js}`.
- API Portale: `netlify/functions/pt-portal-admin.js`, `pt-access-email.js`, `lib/pt-auth.js`.
- Auth condivisa: `netlify/functions/lib/calendar-audit-auth.js`.
- SQL: `supabase/migrations/20260917133826_pt_portal_access_control.sql`.

Gli operatori esistenti conservano l'accesso (`true`, versione `0`) finché la
Direzione non lo disattiva. Nessun dato clinico entra nel registro accessi.
La migrazione richiede il gateway/audit calendario già presente.

## Ordine del rilascio

1. Salvare e verificare il candidato: nel repository ci sono modifiche precedenti
   a questa attività; non pubblicarle indiscriminatamente insieme al Cruscotto.
2. Applicare **solo** la migrazione accessi e verificare colonne, trigger e audit.
3. Pubblicare API Portale e librerie dipendenti, compresa `pt-portal-admin` con
   `PT_ACCESS_SECRET` e la chiave server già configurate. La nuova auth dipende
   dalle colonne SQL: non distribuirla prima della migrazione.
4. Aggiornare i consumatori del modulo `calendar-audit-auth` per invalidare anche
   i vecchi token negli accessi al Calendario (Calendario/Acquisizione).
5. Pubblicare frontend Portale, Cruscotto e launcher nei rispettivi siti.
6. Verificare in sola lettura il caricamento e il pannello Direzione. Eventuali
   prove di blocco con account reali vanno concordate sul PT specifico; nessuna
   email o disabilitazione reale è stata eseguita durante lo sviluppo.

Il rollback del solo frontend mantiene le colonne compatibili. Non ripristinare
la vecchia autenticazione dopo aver disabilitato dei PT: ignorerebbe il blocco.

## Verifiche

- `node --test tests/pt-portal-access.test.cjs tests/calendar-audit-auth.test.cjs tests/calendar-production-census.test.cjs`
- `node tests/pt-portal-access-postgres.test.cjs` con `EMBEDDED_POSTGRES_MODULE`
  verso un runtime locale embedded-postgres (nessun database remoto).
- `node tests/cruscotto-compact-browser.cjs` con `PLAYWRIGHT_MODULE` e
  `CHROME_PATH` opzionali: 42 clienti simulati, pagine, ricerca, note, accessi,
  viewport desktop e mobile.
- `node tests/pt-essential-notes-browser.cjs`: login e apertura scheda con anamnesi
  essenziale, originali richiusi e nessun errore JavaScript; backend simulato.
- `bash scripts/check-calendar-release.sh`: suite funzionali superate;
  gate finale bloccato dalle modifiche locali non committate preesistenti.

## Esito del rilascio autorizzato

- `neacea-portale-personal-trainer`: `6aabf3e5f849cb00fa87fa6c` — https://neacea-portale-personal-trainer.netlify.app/
- `cruscotto-pt`: `6aabf3f465725675e5d52123` — https://cruscotto-pt.netlify.app/
- `neacea-launcher`: `6aabf427023bca00a2a30aaf` — https://neacea-launcher.netlify.app/

File pubblici confrontati byte per byte con il candidato. Test del candidato isolato:
8 test auth/sintesi e prova browser Portale superati; suite corrente complessiva
12 test superati. Nessuna email inviata e nessun operatore disattivato:
6 operatori abilitati, versione sessione 0 dopo la migrazione.

Il Portale pubblica solo sintesi anamnesi e compattezza richieste sopra alla pagina
precedentemente live; le modifiche locali precedenti alla duplicazione programmi,
al bundle editor e ai template sono escluse. Apple Calendar, foto e form-notify
nel Portale mantengono esattamente gli hash delle funzioni precedenti.

**Limite esterno:** Calendario e Acquisizione hanno accettato i deploy di verifica,
ma Netlify vieta la promozione di preview e la pubblicazione production tramite API
(`Production deploys from API are disabled ... use a git-based deployment`).
La produzione di questi due siti è rimasta invariata e i blocchi di pubblicazione
sono stati ripristinati. Non è stata alterata questa policy. La revoca è effettiva
nel Portale PT; le sessioni già aperte in Calendario/Acquisizione non ricevono ancora
il nuovo controllo versione. Per estenderlo occorre il loro flusso di rilascio Git.

Git: Gestionale `feature/whatsapp-agenda-pt-v1`, launcher `main`;
modifiche locali non committate conservate. Il gate finale della suite release
richiede commit dei file critici; le verifiche funzionali passano.
