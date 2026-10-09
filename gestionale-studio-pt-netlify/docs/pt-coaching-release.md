# Portale PT — Editor Coaching

## Copie nominate, archivio e lista clienti — 18 settembre 2026

Rilascio pubblicato `6aad4a2ef09963c925fa0fd8` (`ready`, `locked: true`), precedente produzione
`6aad4075d3d661d64f46529d`. Pubblicazione richiesta esplicitamente dall'utente,
in sostituzione della precedente preferenza di mantenere queste modifiche locali.

- «Nuovo programma» consente di partire da zero, da un programma assegnato a un
  cliente del PT o da un modello dell'archivio generale. La copia ha un nome
  obbligatorio e modificabile, visibile anche nello storico e nei riepiloghi.
- Duplicazione del singolo allenamento con nome; copia dell'intero programma con
  identificativi indipendenti, progressioni e gruppi conservati, senza trasferire
  carichi, feedback, note interne o date delle sedute del cliente sorgente.
- «Elimina dall'archivio» ritira il modello per nuove assegnazioni ma mantiene
  tutte le copie già assegnate e il relativo storico. Autorizzazioni immutate:
  autore o Direzione. Nessuna cancellazione definitiva né migrazione aggiunta.
- La lista iniziale mostra i clienti operativi. Un filtro separato permette di
  consultare Storico e Tutti i clienti assegnati. Non vengono modificati clienti,
  abbonamenti o assegnazioni. I clienti legacy senza data di conferma non sono
  esclusi se il loro stato operativo è valido.
- Corretto il doppio inserimento possibile quando il salvataggio iniziale lento
  si sovrapponeva all'autosave: salvataggi manuali e automatici usano la stessa
  coda e conservano l'identificativo anche dopo una risposta persa.

Verifiche: build editor, test adattatore e copia completa, persistenza/conflitti,
Hand Grip, accessi, archivio, visibilità clienti e nuovo test `pt-save-queue.test.cjs`
(primo inserimento lento, clic concorrenti, identità stabile dopo errore), sintassi
JS e `git diff --check`: superati. UI su dati esclusivamente fittizi: lista attiva,
copia da cliente storico creata una sola volta, nome preservato, duplicazione
allenamento e nuovo programma da archivio. L'ultimo clic di conferma eliminazione
UI è rimasto non verificato per blocco del browser sulla finestra nativa; API e
permessi di ritiro verificati con test automatici. Nessun dato reale di prova.
Test browser completo desktop/mobile non rieseguito in questo rilascio.

Anteprima pronta e controllata: hash identici per i cinque file frontend
(`index.html`, `coaching-editor.js`, `program-templates.js`,
`program-templates.css`, nuovo `program-workflow.js`); tutte le sei funzioni,
gli altri file e le pianificazioni conservati con hash identici alla produzione.
Bootstrap e operazioni archivio senza sessione rifiutati con `401`.
Gli stessi confronti dei cinque file e rifiuti `401` sono stati ripetuti con
successo sul dominio pubblico dopo la pubblicazione.
Nessuna verifica autenticata di produzione con un account PT reale.

Branch `feature/whatsapp-agenda-pt-v1`. File sorgenti principali:
`app/portale-personal-trainer/index.html`, `js/program-workflow.js`,
`js/program-templates.js`, `js/program-templates.css`,
`tools/coaching-editor/src/adapter.ts`, `tools/coaching-editor/src/index.ts`.
Modifiche Git preesistenti conservate; nessun commit, nessun altro repository
modificato e nessuna pubblicazione del Calendario.

## Correzione visibilità schede — 18 settembre 2026

Diagnosi in sola lettura sul database: 17 programmi presenti, di cui 7 associati
a clienti con `active = false`. Il bootstrap del Portale escludeva questi clienti
e quindi anche i relativi programmi, revisioni, carichi e misurazioni. Questo
lasciava alcuni PT senza storico visibile o senza alcun cliente selezionabile.
Tutti gli accessi PT esistenti risultavano abilitati; nessuna assegnazione non
riconosciuta e nessun programma privo di cliente nel censimento.

Correzioni limitate a `app/portale-personal-trainer/index.html` e
`netlify/functions/pt-data.js`:

- Il bootstrap include anche i clienti assegnati non attivi. Restano immutati
  autorizzazioni, assegnazioni, stato dei clienti e abbonamenti; la Direzione
  mantiene la sola lettura sui clienti degli altri PT.
- Pulsante «Nuovo programma» anche in Clienti e Crea programma, protetto dagli
  stessi controlli di modifica; nessuna riscrittura dei programmi esistenti.
- Etichetta esplicita sui percorsi non attivi e conteggio delle schede comprensivo
  di quelle archiviate (già recuperabili da Programmi mensili).
- I comandi dell'editor precedente si nascondono soltanto dopo il caricamento
  del nuovo editor, non se il bundle manca.

Regressione riprodotta prima della modifica e superata dopo con
`tests/pt-client-visibility.test.cjs`. Verificati PT con clienti attivi e non
attivi, PT con soli clienti non attivi, PT senza assegnazioni e Direzione.
Superati anche test di persistenza/conflitti, Hand Grip, controllo accessi,
archivio condiviso, adattatore editor, sintassi JS e `git diff --check`.

Verifica UI con `tools/coaching-editor/visibility-fixture.cjs`, API autentica
ma database e credenziali esclusivamente fittizi: scheda storica visibile,
creazione dall'interfaccia, aggiunta esercizio, salvataggio, recupero da un'altra
origine locale priva di cache, originale conservato; verificati inoltre
Direzione in sola lettura e comandi disponibili con bundle editor mancante.
Nessun dato reale inserito o modificato. Login autenticato di produzione non
eseguito, non essendo disponibile una sessione PT autorizzata per la prova.

Deploy Netlify `6aad4075d3d661d64f46529d` pubblicato e verificato (`ready`,
`locked: true`): frontend cambiato
solo `/index.html`, unica funzione cambiata `pt-data`. Altri file, cinque altre
funzioni, pianificazioni e controlli accesso conservati con hash identici.
Precedente produzione `6aac4822e7adec09cf24f9bc`. Il limite temporaneo Netlify
aveva interrotto la conferma finale, non la pubblicazione: verifica successiva
del sito e del blocco completata. File pubblici confrontati byte per byte e
API senza sessione correttamente rifiutate con `401`, sia in anteprima sia in
produzione. Per ricevere il nuovo bootstrap occorre ricaricare il portale e
rifare l'accesso, senza cancellare la cache o le bozze locali.
Branch `feature/whatsapp-agenda-pt-v1`; worktree già modificato prima dell'intervento,
nessun commit o modifica ad altri repository, nessuna migrazione necessaria.

## Duplicazione e archivio generale — 17 settembre 2026

Pubblicato su Netlify: [`6aac4822e7adec09cf24f9bc`](https://app.netlify.com/projects/neacea-portale-personal-trainer/deploys/6aac4822e7adec09cf24f9bc).
Stato `ready`, pubblicazione confermata e blocco `locked: true` ripristinato.
Precedente produzione: `6aabf3e5f849cb00fa87fa6c`, che include controllo accessi e
sintesi anamnesi. Queste integrazioni sono conservate: le funzioni
`apple-calendar`, `form-notify`, `foto-pt`, `pt-access-email` e `pt-portal-admin`
mantengono esattamente gli hash già pubblicati. Cambiano soltanto la funzione
`pt-data` e quattro file frontend (HTML, bundle editor, JS/CSS archivio).

- Editor più compatto e sezione Duplica (programma intero o allenamento selezionato).
- Archivio schede comune a tutti i PT, ricerca, anteprima, salvataggio con nome e
  descrizione, utilizzo come nuovo programma sul cliente selezionato.
- Ogni copia ha nuovi identificativi; dati anagrafici, note interne, carichi,
  feedback e date delle sedute non entrano nel modello condiviso. Il PT conferma
  che nomi e note tecniche non contengano informazioni personali.
- Il ritiro di un modello è riservato all'autore o alla Direzione, è reversibile
  lato database e non elimina le copie già assegnate ai clienti.
- La prescrizione RIR non crea da sola una seduta storica senza data o dati effettivi.

Migrazione locale `20260916140424_pt_shared_program_templates.sql` applicata come
`20260917200200_pt_shared_program_templates`. Tabella `pt_program_templates`
con RLS: `anon` e `authenticated` senza lettura/scrittura; server con soli
SELECT/INSERT/UPDATE e nessun DELETE. Nessuna scheda cliente riscritta dalla migrazione.
La skill Supabase ha guidato la verifica dei permessi e il controllo dei consulenti:
l'unico nuovo avviso è [RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
intenzionale per una tabella server-only. Restano preesistenti sei avvisi sulle
[viste security-definer](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
e la protezione password Supabase Auth disattivata: non modificati da questo rilascio.

Verifiche completate: build e test adapter, persistenza e conflitti, Hand Grip,
accessi e anamnesi; test server dei modelli, autorizzazioni, whitelist dati,
retry idempotenti e ritiro; database PostgreSQL temporaneo per vincoli e permessi.
Chrome con API simulate: pulsanti editor, salvataggio e riapertura, duplica,
archivio, retry dopo risposta persa, copia su un altro cliente senza dati personali,
ritiro senza perdere le copie, desktop/tablet/mobile 320–1440 px, zero errori JS.
`git diff --check` superato. Suite generale Calendario: verifiche funzionali
superate, gate finale fermo sulle modifiche preesistenti non committate; nessun
deploy del Calendario incluso.

Verifica online dell'anteprima e della produzione: tutti i file aggiornati coincidono byte per byte
con il candidato e l'API rifiuta con `401` bootstrap e operazioni archivio senza
sessione. Login reale automatizzato non certificato: Netlify restituisce mascherata
la chiave di firma; il test iniziale con tale valore non era valido. L'utilizzo di
una credenziale alternativa è stato bloccato dal controllo di sicurezza e non
eseguito. Nessuna credenziale modificata, nessuna email inviata, nessun dato
cliente di prova inserito. L'utente può confermare l'accesso con il proprio codice.

Branch `feature/whatsapp-agenda-pt-v1`; modifiche locali e non tracciate mantenute,
nessun commit o intervento sugli altri repository.

## Rilascio iniziale

Rilascio del 15 settembre 2026 sul sito `neacea-portale-personal-trainer` (ID `3c87fb2e-525d-43b0-9a84-4699994352e4`).

Deploy di produzione: `6aa94c32dd82bb723e83af92`, [registro Netlify](https://app.netlify.com/projects/neacea-portale-personal-trainer/deploys/6aa94c32dd82bb723e83af92). Il deploy precedente `6aa5d45c4f4fd687fa6c5497` resta disponibile nella cronologia Netlify. Il blocco della pubblicazione è stato rimosso per il rilascio manuale e ripristinato sulla nuova versione (`locked: true`, `state: ready`); i build automatici restano disabilitati.

## Contenuto

La creazione manuale delle schede utilizza l'editor derivato dal Coaching, con snapshot completo e proiezione nel modello PT per l'uso durante le sedute. Il bundle è compilato da `tools/coaching-editor`; l'HTML usa il riferimento `js/coaching-editor.js?v=20260915`.

Il pacchetto pubblica solo `app/portale-personal-trainer` e le funzioni `pt-access-email`, `pt-data`, `apple-calendar`, `form-notify`, `foto-pt`, con i moduli `lib/pt-auth.js` e `lib/apple-calendar-package.js`. Non includere le funzioni cron WhatsApp o CalDAV nel sito PT: appartengono agli altri siti.

La migrazione locale `20260901094141_secure_pt_program_persistence.sql` è stata applicata nel database Studio come `20260915133411_secure_pt_program_persistence`. Non riapplicarla soltanto per allineare i timestamp. Crea revisioni, Hand Grip, archivio esercizi e la funzione atomica `pt_save_program`.

`PT_ACCESS_SECRET` è configurato su Netlify per le funzioni nei contesti production e deploy-preview, preservando il valore di firma già usato dal login legacy. Nessun valore è conservato nel repository.

## Verifiche

- Build e test dell'adattatore: prescrizioni settimanali, gruppi, carichi, serie rimosse e 12 settimane.
- Test PT: persistenza, autorizzazioni, conflitti, conversione delle schede precedenti e Hand Grip.
- Browser Chrome con API simulate: cliente senza schede, creazione esercizio, salvataggio e riapertura senza cache locale; nessun errore JavaScript.
- Database reale: creazione, aggiornamento, revisione e conflitto verificati in transazione con rollback; nessun dato di prova conservato.
- API del deploy di verifica: login, caricamento per PT assegnato e rifiuto delle richieste prive di sessione (`401`).
- Produzione: HTML aggiornato, hash del bundle uguale al compilato locale, login e caricamento clienti verificati; richieste senza sessione rifiutate con `401`.
- Suite `scripts/check-calendar-release.sh`: test funzionali passati; il controllo finale dei commit del Calendario segnala modifiche locali non committate. Questo rilascio riguarda il solo Portale PT e non pubblica il Calendario.

## Compatibilità e sicurezza

Le nuove tabelle hanno RLS e nessun accesso anonimo; l'assenza di policy è intenzionale perché le usa soltanto il server. Il relativo avviso informativo Supabase è documentato nella [guida del controllo RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

La Scheda Cliente legacy usa ancora direttamente le tabelle condivise `schede_allenamento` e `carichi_allenamento`. I loro permessi preesistenti non sono stati revocati da questo rilascio per non interrompere tale applicazione. La loro messa in sicurezza resta un intervento coordinato con i consumatori legacy; non va confusa con la protezione delle nuove API PT.
