# Gestionale Studio PT — Integratori

Stato: database, Portale PT e collegamenti Cruscotto pubblicati il 28 settembre 2026. Branch `feature/whatsapp-agenda-pt-v1`.

## Audit e integrazione

Sorgente: `gestionale-studio-pt-netlify`. Il Cruscotto PT è la dashboard amministrativa presente in questo repository; il Portale Personal Trainer contiene l’area PT. È stata aggiunta una route del Portale, non una nuova applicazione o un nuovo sito. Dashboard PT/Launcher negli altri repository non sono stati modificati.

L’accesso riusa le sessioni HMAC di `pt-access-email`, i ruoli correnti di `operator_effective_roles` e la versione/revoca di `operators.portal_access_*`. L’API controlla nuovamente i permessi per ogni richiesta. I collegamenti trasferiscono il token nel frammento URL, rimosso subito dopo la lettura. In sessionStorage resta solo la sessione; nessun dato prodotto o economico viene persistito nel browser.

## Brand verificato

Il sito confermato dall’utente è https://www.neacea.com/. Aperto e ispezionato nel browser il 28 settembre 2026:

- logotipo: https://www.neacea.com/wp-content/uploads/2026/01/logotipo-NEACEA-1.svg
- pittogramma: https://www.neacea.com/wp-content/uploads/2026/02/Logo-neacea-bianco-pittogramma.png
- immagine Studio: https://www.neacea.com/wp-content/uploads/2026/01/Immagine-cta-neacea.webp
- titoli: Space Grotesk; corpo: Montserrat; verde rilevato: `#033d27`.

Loghi, immagine e font latini sono locali in `app/portale-personal-trainer/integratori/assets`. Nessun logo ricreato. La matrice è HTML/CSS, con testi selezionabili e stampa A4 dalla stessa scheda; può proseguire su più pagine per contenuti lunghi, senza ridurre arbitrariamente il corpo del testo. Non è un bitmap generato con logo o testo incorporati.

La scheda campione Powerbar usa la fotografia reale e dati della pagina ufficiale https://www.powerbar.com/de-de/products/creatine-monohydrate. Include le avvertenze sugli allergeni che mancavano nel riferimento allegato. Il campione è una fixture di verifica, non prova di giacenza reale.

## Funzioni implementate

- Catalogo comune Direzione/PT, ricerca e tag combinabili amministrabili.
- Scheda generica con varianti, contenuti comuni e override per gusto/formato, fotografia e font originali, stampa/Salva PDF tramite browser.
- Magazzino Direzione con KPI, tabella, prezzi suggeriti −20%, eccezioni di prezzo e soglie riordino.
- Carico, vendita, rettifica, reso collegato alla vendita, danneggiamento, altro; quantità, costo, prezzo effettivo, autore, data, documento, lotto e note.
- Giacenza e costo medio ponderato derivati dal registro immutabile. Il valore del movimento conserva l’arrotondamento; l’ultimo scarico azzera esattamente il valore residuo.
- Lock della variante durante il movimento, rifiuto di giacenza negativa, idempotenza della richiesta di vendita, limite quantitativo sui resi.
- Salvataggio schede con verifica di concorrenza, audit e pubblicazione dopo approvazione.
- Acquisizione da URL ufficiale: metadati Product/JSON-LD, fotografia e testo fonte proposti come bozza. Nessun dato mancante viene inventato. Host consentiti e redirect controllati; limite dimensione/timeout; nessun HTML remoto eseguito.
- DDT: caricamento righe JSON, abbinamento EAN/SKU, verifica umana in caso di ambiguità, importazione atomica e non ripetibile. I prodotti nuovi vanno creati come bozze prima di confermare le righe.

## Modello e sicurezza

Migrazione: `supabase/migrations/20260928202452_supplement_catalog_inventory.sql` (creata con CLI).

Tabelle: `supplement_products`, `supplement_variants`, `supplement_prices`, `supplement_tags`, `supplement_product_tags`, `supplement_sources`, `supplement_documents`, `supplement_inventory_movements`, `supplement_audit`. La vista `supplement_inventory` calcola quantità, valore, costo medio, ricavi e utile. Le vendite sono movimenti SALE: nessuna seconda copia del ricavo.

RLS abilitata su tutte le tabelle; revocati tutti i privilegi browser `anon`/`authenticated`. Questo è coerente con sessioni custom PT, che non sono JWT Supabase Auth. Il catalogo viene letto dall’API autenticata e restituito con proiezione esplicita: niente prezzi, costi, SKU/EAN, quantità, movimenti, documenti, note amministrative o proprietà arbitrarie del JSON.

Il ruolo server dispone solo di SELECT sulle tabelle. Le scritture passano dalla funzione interna `supplement_write`, con EXECUTE revocato a PUBLIC/anon/authenticated e con controllo del ruolo Direzione corrente anche in SQL. Registro e audit non sono direttamente modificabili dal gateway.

**Migrazione applicata al Supabase remoto `cdywqyqqmjhgkzwrrixc` il 28 settembre 2026, versione registrata `20260928205202`.** Verificati 15 prodotti, 19 varianti, zero movimenti e zero prodotti pubblicati. RLS attiva sulle nove tabelle; SELECT anon/authenticated ed EXECUTE della funzione di scrittura negati. Il controllo sicurezza segnala soltanto l’informazione attesa “RLS senza policy”: l’accesso browser è intenzionalmente negato e passa dall’API server.

Gli importi richiedono base IVA esplicita (`gross` oppure `net`) prima dei movimenti. La base non si può cambiare dopo il primo movimento. Il sistema non deduce aliquote mancanti e sospende i totali aggregati quando le basi differiscono. L’utile visualizzato è la differenza tra vendita e costo registrato sulla stessa base, prima di altri oneri.

## Dataset e limiti da risolvere

Sono predisposti 15 prodotti / 19 varianti in bozza dall’elenco utente, senza quantità, EAN/SKU, prezzi o costi inventati. La creatina ha già foto e contenuti ufficiali proposti, ancora in bozza.

**Manca il DDT degli integratori.** I due PDF STIV Tech trovati in Download sono copie della fattura 288 del 13/05/2026 riferita ad attrezzature (plyo box, materassini, rastrelliera): non sono stati usati come carico integratori.

Per completare il catalogo e iniziare la gestione delle giacenze reali:

1. Ricevere il DDT corretto e verificare codici, marche, formati, quantità, prezzo pubblico, costo −50%, base IVA e arrotondamenti.
2. Completare le foto e i contenuti verificati delle altre varianti. Il recupero attuale richiede l’URL ufficiale e non garantisce estrazione completa di ingredienti/tabelle da siti senza dati strutturati; la ricerca automatica a partire dal solo nome e l’interpretazione delle etichette non sono ancora implementate.
3. Implementare l’estrazione automatica/OCR da foto/PDF per il futuro flusso DDT. Al momento l’importatore accetta righe JSON estratte e verificate, non direttamente immagini/PDF. Nessun documento viene mandato a provider AI.
4. Verificare il flusso completo con una sessione Direzione reale e con il primo DDT corretto; i test automatici non hanno inserito movimenti dimostrativi nel database online.

Il requisito di un’immagine finale per ciascun integratore non è ancora soddisfatto: è pronta la matrice web/stampa e un campione; non sono state prodotte 19 immagini raster. La stampa usa la stessa scheda, senza contenuti PDF duplicati.

## Ambiente e percorsi

Riusa `SUPABASE_URL`, `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`, `PT_ACCESS_SECRET` del Portale. Nessuna nuova chiave client/server e nessuna variabile VITE.

Percorsi online:

- Catalogo: https://neacea-portale-personal-trainer.netlify.app/integratori/
- Magazzino: https://neacea-portale-personal-trainer.netlify.app/integratori/?view=inventory
- API: `/.netlify/functions/supplements` (POST).

Portale pubblicato: deploy `6abad5b2e833b39a12ac0662`, a partire da `6abaa3a93eba94b33094d629`. Conservati per hash 11 file preesistenti e tutte le 19 funzioni; modificato solo index.html per il pulsante, aggiunti directory Integratori e funzione supplements. Blocco dei deploy automatici conservato. Nessun commit o push generale.

Cruscotto: deploy `6abad55d18fa3d589f3ff899` pubblicato e verificato a partire da `6ab16458d8bb91009245e906`; contiene solo i due pulsanti e il relativo script. Blocco dei deploy automatici conservato; i due altri file statici sono identici per hash. Pubblicazione autorizzata esplicitamente dall’utente dopo il blocco della revisione automatica, che aveva rilevato l’esclusione degli altri siti dall’autorizzazione permanente del Portale.

Preview locale isolata: `node tests/supplements-preview.cjs`, poi http://127.0.0.1:8846/integratori/#access=preview-owner oppure `#access=preview-pt`. Nessuna autenticazione reale o scrittura Supabase; dati e giacenze sono dimostrativi.

## Verifiche eseguite

- `bash scripts/check-supplements.sh` con `PGLITE_MODULE` puntato all’installazione locale di `@electric-sql/pglite`: 9 test passati, più parsing JS dei due HTML integrati.
- SQL realmente eseguito su PostgreSQL PGlite: permessi negati, vendite/carichi, costo medio, ricavi/utile, resi, idempotenza, rollback del DDT, conflitto aggiornamento, audit.
- API: PT respinto da tutte le operazioni amministrative, sessione alterata/revocata rifiutata, catalogo senza dati economici.
- `scripts/check-calendar-release.sh`: verifiche di regressione passate; uscita 1 sul controllo finale Git per modifiche non committate preesistenti e correnti. Non è un fallimento dei test, né motivo per committare insieme tutte le lavorazioni.
- `git diff --check`: passato.
- Verifica browser desktop e 390 px: catalogo, scheda, magazzino, modulo prodotto; font e immagini caricati, nessun overflow orizzontale della pagina mobile. Stampa A4 predisposta in CSS; esportazione PDF finale multipagina da verificare con il catalogo reale completo.
- Non esiste una build npm del sito statico principale. Funzione Netlify costruita con zip-it-and-ship-it, runtime Node 22, API v2 e invocation_mode stream. Anteprime verificate: HTML/manifest statici identici agli attesi, funzioni preesistenti identiche per SHA-256, API senza sessione restituisce 403. Schermata di login online verificata nel browser. Accesso autenticato reale non eseguito in questa sessione.

## Correzione visibilità bozze — 28 settembre 2026

Il primo catalogo applicava il filtro “pubblicato” anche alla Direzione: i 15 prodotti presenti, tutti in bozza, risultavano quindi invisibili. Il catalogo Direzione include ora bozze e pubblicati, esclude gli archiviati e mostra “Da completare” più il pulsante “Completa / modifica”. Il catalogo PT continua a mostrare soltanto i pubblicati. Le immagini mancanti hanno un segnaposto; non viene caricata per errore la pagina corrente come immagine.

Modificati `netlify/functions/supplements.mjs` e `app/portale-personal-trainer/integratori/integratori.js`, con regressione API in `tests/supplements-api.test.mjs` e preview aggiornata. Dieci test passati, inclusa la separazione bozze Direzione/pubblicati PT; apertura editor verificata nel browser. Nessuna modifica database o stato prodotto. Deploy mirato Portale `6abad77a98d4e443bf2b5b2c`: un file statico e una funzione, tutti gli altri hash conservati. Nessun commit/push; branch `feature/whatsapp-agenda-pt-v1`.

## Fotografie del catalogo — 28 settembre 2026

Inserite nel Supabase online le immagini ufficiali per tutti i 15 prodotti e tutte le 19 varianti; provenienza e abbinamenti in `docs/supplements-photos.json`. Le fotografie sono servite direttamente dai siti ufficiali WHYsport, WHYnature, WHYsport Professional e Powerbar. Verificato il caricamento nel browser e confrontate visivamente confezioni e gusti.

Per Hydro 90 BV 104 è stata usata la foto ufficiale rappresentativa della linea nel formato 900 g (etichetta crema biscotto); non erano disponibili fotografie affidabili specifiche per wafer nocciola, cioccolato fondente e cioccolato. La scheda mostra esplicitamente questa precisazione. Le altre foto sono abbinate al gusto/formato indicato; PW1 con e senza caffeina usa immagini distinte.

Aggiornamento atomico con controllo di concorrenza e 34 record di audit (15 prodotti + 19 varianti), più provenienza fotografica nelle fonti. Verifica SQL: 15 prodotti con foto, 19 varianti con foto, zero movimenti, zero prodotti pubblicati. Nessun prezzo, stock, dato nutrizionale o approvazione delle schede è stato modificato. Nessun nuovo deploy necessario: il catalogo legge le immagini dal database al caricamento. Branch `feature/whatsapp-agenda-pt-v1`; modifiche locali documentali non committate.

## DDT 515, prezzi interi e schede A4 — 28/09/2026

- Foto DDT ricevuta e riconciliata: 19 righe, 41 pezzi, imponibile 429,47 EUR,
  IVA 42,95 EUR, totale 472,42 EUR. Registrato atomicamente il documento e
  19 movimenti PURCHASE; codici SKU e costi reali assegnati alle varianti esistenti.
  Import protetto da hash/riferimento e richiesta deterministica per riga.
- La colonna Prezzo del DDT è il listino netto prima dello sconto acquisto 50%.
  Prezzi NEACEA IVA inclusa = round(listino netto × 0,80 × 1,10), all’euro.
  Esempi: creatina 35 EUR, Hydro 77 EUR, PW1 44 EUR, pancake 29 EUR.
  Costi e utile restano netti; vendite e listino nella UI includono IVA.
- Corretta la normalizzazione dei ruoli SQL: il ruolo reale «Direzione» è ora
  riconosciuto con le stesse regole dell’API. Nessun ruolo o privilegio nuovo.
  Migrazione `20260928213843_supplement_direction_role.sql` applicata e verificata.
  Prezzi effettivi netti conservati a 4 decimali per rappresentare, ad esempio,
  27 EUR IVA inclusa senza introdurre 0,01 EUR di errore. Vista inventario ricreata
  nella stessa transazione con security_invoker e privilegi originali.
- Pubblicati i contenuti dei 15 prodotti / 19 varianti da fonti ufficiali.
  Creati 19 PDF A4 individuali + raccoglitore, con logo vettoriale originale,
  Montserrat e Space Grotesk. Tutte le 19 pagine renderizzate e ispezionate.
  Foto Hydro rappresentativa gusto crema biscotto, con didascalia esplicita.
  PW1 senza caffeina: scheda disponibile con avviso evidente di verifica
  dell’etichetta, perché la pagina ufficiale riporta caffeina nelle avvertenze.
  Le informazioni di variante non verificabili sono rimandate all’etichetta.
- Il pulsante «Apri PDF A4» verifica l’impronta dei contenuti: se una scheda viene
  modificata, il PDF precedente non viene proposto come aggiornato. La stampa web
  resta sempre disponibile con i dati correnti.
- Memoria permanente: `docs/supplements-ddt-workflow.md`, richiamata in AGENTS.md.
  Dati DDT: `docs/supplements-ddt-515.json`. Nessun dato economico nel PDF o nel
  DTO pubblico del catalogo.
- Controlli: 12 test API/ruoli/SQL/prezzi passati; simulazione DDT reale su PGlite con
  totale esatto e secondo import bloccato; controllo conversione net/gross per
  tutti i 19 prezzi; impronte dati/PDF tutte corrispondenti. Browser locale:
  Direzione vede 41 pezzi e prezzi interi, vendita creatina propone 35 EUR;
  PT vede 15 prodotti senza magazzino; PDF creatina collegato correttamente.
- Deploy isolato Portale PT: `6abae197fb679ab3c3b9e9d1`, 25 file statici,
  tutte le funzioni preesistenti preservate per hash. Tutti i file dell’anteprima
  verificati per checksum; pubblicazione e file principali online verificati.
  API anonima rifiutata con 403. Nessuna vendita dimostrativa nel database reale.
- Branch `feature/whatsapp-agenda-pt-v1`; nessun commit o push generale.
  Lavorazioni precedenti del repository preservate. `git diff --check` superato.

Controllo advisor Supabase post-migrazione: nessun avviso Integratori oltre alle
9 informazioni `rls_enabled_no_policy`, coerenti con il blocco completo delle
tabelle ai ruoli browser e l’accesso esclusivo via API autorizzata.

## «Cosa fa» approfondito e conferma prezzi — 29/09/2026

- L’utente conferma che la colonna Prezzo del DDT è prima dello sconto: nessun
  raddoppio del listino. Controllati i 19 prezzi finali, tutti interi e IVA inclusa.
  Avena 15 EUR, creatina 35 EUR, Hydro 77 EUR. Prezzi e movimenti sono identici
  prima/dopo l’intervento; nessun nuovo carico o vendita.
- Riscritti 15 testi prodotto più l’eccezione PW1 senza caffeina, applicati alle
  19 schede: funzione degli ingredienti, contesto sportivo, limiti degli effetti.
  Fonti produttori integrate con NIH ODS, NIH NCCIH, AIS e registro UE; riferimenti
  conservati in `supplements-editorial.json` e nella tabella delle fonti.
  La discordanza sulla caffeina della variante PW1 resta evidenziata.
- Aggiornamento DB limitato a `content.effects` e metadati editoriali, con
  controllo di concorrenza e 16 registrazioni audit `editorial_effects_detail`.
  Altri testi, prezzi, fotografie e movimenti preservati.
- Rigenerati 19 PDF A4 e il catalogo. Hero leggermente ridotto per dare spazio
  ai testi, font originali conservati e collegamento di approfondimento nel footer.
  Controllo visivo di tutte le pagine; nessun testo troncato; firme dei 19 PDF
  corrispondenti ai dati correnti; verifica estrazione integrale di «Cosa fa».
- Rilascio isolato: `6abae593da67596b668dc5b2`, baseline
  `6abae197fb679ab3c3b9e9d1`, 21 file statici (PDF e manifest).
  Funzioni e altri file preservati per hash. Anteprima, pubblicazione, manifest
  e catalogo live verificati; API anonima 403; blocco deploy ripristinato.
  Un primo tentativo ha ricevuto 429 Netlify; stato controllato prima della
  ripetizione, secondo tentativo riuscito.
- Verifiche: 12 test del modulo superati, `git diff --check` pulito.
  Branch `feature/whatsapp-agenda-pt-v1`; nessun commit/push. File principali:
  `docs/supplements-editorial.json`, `docs/supplements-ddt-workflow.md`,
  `scripts/build-supplement-pdfs.py`, `app/portale-personal-trainer/integratori/pdf/`
  e `pdf-manifest.json`. File Integratori ancora non tracciati, coerentemente
  con lo stato precedente; altre lavorazioni Git lasciate intatte.
  Nessun passaggio esterno residuo per questo aggiornamento.
