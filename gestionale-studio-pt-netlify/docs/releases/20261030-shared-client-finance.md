# Calendario — quote PT/nutrizione e incassi condivisi con Scadenze

Stato al 30 ottobre 2026: **preparato e collaudato localmente**. Nessun deploy,
nessuna migrazione remota, nessuna scrittura su clienti reali, nessuna email.

## Comportamento

Nel quadro pacchetto → Pagamenti si salvano totale concordato, quota PT e quota
nutrizione del singolo ciclo. Le quote devono sommare al totale; zero è ammesso
per un servizio non previsto. I cicli precedenti non ricevono quote inventate.
La ripartizione non emette fatture, non calcola bollo/cassa e non cambia Aruba.
Il riepilogo Pagamenti mostra anche le due quote quando sono definite.

La sezione Riscontro legge gli incassi del cliente in Scadenze e le sue fatture
dell'anno scelto. Una fattura emessa non costituisce un incasso. Gli incassi
storici si associano esplicitamente al ciclo senza modificare i record originali;
lo stesso ID non è associabile a due cicli. L'associazione è conservata nel
registro del Calendario, senza metadati tecnici nelle note visibili in Scadenze.

Il nuovo incasso condiviso si può inserire dal Calendario: viene registrato una
sola volta nel provider di Scadenze e riletto prima della conferma. Il Calendario
ne conserva una copia nel registro economico. Aggiorna riscontro e la riapertura
rileggono gli importi, anche per i cicli condivisi precedenti; modifiche o rimozioni
in Scadenze si riflettono nella copia. Data dell'ultima verifica ed errori sono
visibili. In assenza di rete i valori salvati restano una copia non riverificata.

PT e nutrizione mantengono applicazioni e anagrafiche autonome. Non si crea un
cliente Nutrizione per registrare un cliente solo PT. Il vecchio registro locale
resta disponibile per chi non usa il collegamento. Un ciclo con incassi locali
attivi non viene convertito automaticamente: va prima riconciliato per evitare
un doppio saldo. Eventuali movimenti locali a saldo zero restano conservati in
`localPaymentsBeforeShared`. Un ciclo condiviso non accetta nuovi incassi,
rettifiche o storni dal vecchio modulo locale; si usa Scadenze e si aggiorna.

## Contratti e protezioni

- Provider: Portale Nutrizione, usato da Gestione Scadenze. API amministrativa
  esistente: `getCliente`, `getPagamenti`, `getFatture`; nuova azione
  `addPagamentoCondiviso`. Il vecchio `addPagamento` resta compatibile.
- La nuova azione inserisce soltanto su `neacea_payments`, con ID stabile e
  conflitto ignorato seguito da rilettura e confronto. Non chiama `ensureClient`,
  che nell'operazione legacy può riscrivere dati anagrafici. Non tocca fatture,
  numerazione, consensi, invii o profili. Richiede un cliente esistente e attivo.
- Calendario: `calendar-client-finance` verifica la sessione firmata e il ruolo
  Direzione corrente attraverso il gateway già esistente. L'email è letta dal
  cliente sul server; nessuna email o credenziale inviata dal browser decide la
  sorgente. Email mancanti o condivise da più clienti Studio impediscono il link.
  Le fatture di altre persone vengono filtrate sul server.
- Quote, riferimenti e copia degli incassi restano nel blocco versionato già
  esistente `NEACEA-PACKAGE-LEDGER-V1` in `clients.notes`. Nessuna nuova tabella.
- La funzione SQL `calendar_save_client_finance` blocca la riga, confronta note,
  importo, stato ed email attesi, modifica solo i campi economici e usa l'audit
  esistente nella stessa transazione. È eseguibile solo da `service_role` e
  ricontrolla la Direzione. Non amplia RLS o privilegi pubblici.
- Prima della chiamata esterna si salva l'incasso in attesa con ID e payload
  stabili. Dopo una risposta persa il retry rilegge l'ID e non sovrascrive il
  pagamento. Richieste diverse non scavalcano un incasso pendente. Rinnovo,
  modifica quote e annullamento locale sono protetti durante tale stato.
- I due database non condividono una transazione. Se Scadenze ha scritto e il
  Calendario non conferma, il pagamento resta nel provider: Aggiorna riscontro o
  Riprova conferma completano la copia. Dati diversi o cambio email richiedono
  verifica esplicita. Non si annulla un incasso presumendo che una risposta persa
  significhi mancata scrittura.

## File e stato Git

Gestionale Studio PT: branch `feature/whatsapp-agenda-pt-v1`, HEAD `d242d2c`,
invariati. File principali: `app/calendario-studio/js/shared-finance.js`,
`package-ledger.js`, `calendar-audit.js`, `app.js`, `index.html`, `css/calendar.css`,
`netlify/functions/calendar-client-finance.js` e `lib/calendar-client-finance.js`.
Migrazione creata con CLI, non applicata:
`supabase/migrations/20261030183151_calendar_shared_client_finance.sql`.
Test nuovi e `scripts/check-calendar-shared-finance.sh`; integrazione nel controllo
di rilascio. Tre fixture browser gestiscono esplicitamente la nuova dipendenza
Scadenze indisponibile, preservando i test del flusso precedente.

Portale Nutrizione: branch `release/consensi-pdf-20261010`, HEAD `3aadea7`, invariati.
Modificati solo per questo passo: una nuova azione in `netlify/functions/gas.js`,
nuovo `netlify/functions/_shared-payment.cjs`, `tests/shared-payment.test.cjs`,
registrazione dei controlli in `package.json` e rapporto dedicato.

Entrambi i repository avevano numerose modifiche e file non tracciati prima di
questo intervento; sono preservati. Stato finale: modifiche tracciate più file
nuovi non ancora in commit, nessun commit/push effettuato. Nessun worktree,
nessun altro task, nessuna modifica al frontend di Gestione Scadenze.

## Prove

Runtime usato: Node 24.14.1, conforme al range 22–24 dichiarato nel Gestionale.
PGlite e Playwright provengono dalle dipendenze dichiarate del repository;
Nutrizione usa il proprio PGlite dichiarato. Nessuna dipendenza di test globale.

- Riproduzioni prima della modifica: quote non disponibili nel registro e nuova
  azione provider inesistente; entrambi i test fallivano sul codice precedente.
- `bash scripts/check-calendar-shared-finance.sh`: 11 test superati, nessuno
  saltato, più prova browser desktop/mobile. Include quote/zero, storico,
  conferma/rilettura, ID stabile, risposta persa, nessun saldo da fatture, identità,
  permessi, errori, cliente solo PT e rinnovo durante incasso pendente.
- Il test SQL percorre anche il vero handler HTTP → servizio → transazione SQL
  → rilettura del cliente su PGlite, verificando note, quote, stato e sedute
  invariate. Test separati verificano ruolo anonimo/PT rifiutato, snapshot obsoleto
  rifiutato e rollback se l'audit fallisce. Il provider Nutrizione è simulato in
  questa prova, non è il database remoto.
- Provider Nutrizione: 2 test dedicati superati; uno verifica autenticazione e
  contratto HTTP con trasporto simulato, l'altro persistenza/rilettura e richieste
  concorrenti con SQL reale su PGlite. Un solo pagamento, importo originale
  preservato e nessuna modifica all'anagrafica.
- `npm test`, `npm run check` e build pubblica del Portale superati; il secondo
  test SQL nuovo è stato eseguito anche separatamente dopo l'aggiunta.
- Browser precedente incassi: superato. Censimento interfaccia: 8 viste,
  16 finestre, 79 azioni risolte, zero errori JavaScript. API simulate.
- Controllo completo `bash scripts/check-calendar-release.sh`: tutti i controlli
  di comportamento eseguiti prima del controllo Git finale sono passati; il
  comando termina con exit 1 perché i file critici non sono tutti in commit.
  Non è un rilascio approvato e non dimostra una protezione remota attiva.
- `git diff --check` superato in entrambi i repository; schermata quote verificata
  a 390 px. Nessun controllo sulla persistenza nel database remoto: non sono
  stati autorizzati né effettuati deploy o migrazioni reali per questo passo.

## Attivazione ancora da eseguire

1. Identificare i commit e gli asset realmente online per Calendario e provider,
   isolare le sole modifiche necessarie preservando le release già pubblicate e
   salvare/ricollaudare i candidati Git. Non pubblicare l'intero checkout sporco.
2. Dopo autorizzazione esplicita, applicare la sola migrazione Studio indicata.
   Pubblicare la nuova azione del provider Nutrizione e verificare l'esito.
3. Verificare/configurare sul server Calendario `SCADENZE_API_URL` verso il
   provider e `SCADENZE_API_TOKEN` corrispondente al segreto amministrativo già
   previsto. Non copiare valori nel codice o nel browser.
4. Pubblicare il candidato Calendario con la nuova funzione e gli asset;
   verificare versioni, permessi, cliente sintetico condiviso, incasso/rilettura,
   riapertura e quote, senza emettere fatture o email reali.

Prossimo intervento: preparazione del candidato di rilascio dopo confronto con
produzione; attivazione esterna soltanto su richiesta esplicita.
