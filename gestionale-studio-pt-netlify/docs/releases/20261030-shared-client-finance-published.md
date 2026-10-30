# Calendario e Scadenze — pubblicazione del 30 ottobre 2026

**Attivato e verificato.** Calendario pubblicato alle 20:12:44 Europe/Rome;
provider Nutrizione alle 20:09:56. Le due quote PT/nutrizione e il nuovo incasso
condiviso sono disponibili nel quadro pacchetto → Pagamenti. L'incasso esistente
in Scadenze si associa al ciclo, senza inserirlo di nuovo. Fatturazione e Aruba
restano nei loro flussi precedenti.

## Versioni effettive

| Applicazione | Branch del candidato | Commit sorgenti online | Deploy effettivamente pubblicato |
|---|---|---|---|
| Calendario | `release/calendar-shared-finance-20261030` | `e989f58311b6b094de1b81c361d771203e865a70` | `6ae4ec1ad7e2511834092478` |
| Provider Portale Nutrizione | `release/shared-payments-20261030` | `74e8812678cb45e0969db645a93eb6779fd5b026` | `6ae4eb827445f0950a655592` |

Il Calendario è stato costruito da Git sulla base online `eab8411`; non è stata
pubblicata la bozza indipendente di riprogrammazione rinnovi. Il provider parte
dal commit `3aadea7`, associato al precedente deploy manuale `6aca204c8528b3ece78988ff`
dai rapporti del 10 ottobre; il nuovo deploy conserva bit per bit otto funzioni
precedenti e tutti e tre gli asset. Cambia soltanto l'archivio di `gas`, compilato
da quel commit più la nuova azione e l'helper, con dipendenze bloccate.

Netlify ha avviato due build del medesimo commit Calendario al cambio temporaneo
del branch di produzione. È stata verificata la versione realmente pubblicata,
non soltanto il deploy richiesto esplicitamente. Entrambi i candidati sorgenti
sono salvati e inviati a GitHub; eventuali commit successivi di documentazione
non cambiano il commit sorgente indicato in tabella.

## File e configurazione

Calendario: `shared-finance.js`, `package-ledger.js`, `app.js`, `calendar-audit.js`,
`supabase.js`, HTML/CSS; nuova funzione `calendar-client-finance` e servizio
corrispondente. Revisione salvataggi `20261030-shared-finance-v1` nel frontend e
nel gateway; pagine della versione precedente rifiutate prima della scrittura.
`tools/prepare-calendar-shared-function.cjs` prepara l'entry point Netlify
preservando i percorsi delle dipendenze verso il registro economico condiviso.
Il manifest e il lockfile del candidato dichiarano anche PostgreSQL locale.

Provider: nuova azione `addPagamentoCondiviso` in `netlify/functions/gas.js` e
`_shared-payment.cjs`, senza includere la lavorazione locale sulle foto.
Nessun nuovo scheduler o servizio a pagamento, nessuna modifica al frontend
Gestione Scadenze o agli altri siti del repository.

Applicata la sola migrazione `20261030183151_calendar_shared_client_finance.sql`
al progetto Studio. La nuova funzione usa `security invoker`, è eseguibile solo
da `service_role`, ricontrolla la Direzione e mantiene audit e controllo di
concorrenza nella transazione. Nessuna nuova tabella o policy pubblica.

Configurate sul solo server Calendario `SCADENZE_API_URL` e `SCADENZE_API_TOKEN`.
Il token è segreto e limitato alle Functions nei contesti production, branch-deploy
 e deploy-preview. Il trasferimento fra le variabili Netlify è avvenuto soltanto
in memoria, senza stamparlo o salvarlo in sorgenti, rapporti o browser.

Ripristinata la configurazione Calendario: branch `main`, build fermate,
allowed branches `[main]`, deploy corrente bloccato. Il provider resta su `main`
con il nuovo deploy bloccato, così un push successivo non sostituisce la versione
manuale verificata.

## Prove sul candidato e online

- Ricostruzione dei candidati con Node 24.14.1 e dipendenze dei rispettivi lockfile.
  Suite completa Calendario conclusa con `OK: pacchetto Calendario completo e
  verificato`, su checkout Git pulito del commit candidato; nessun controllo Git
  ignorato. Test mirati: 11 Calendario e 2 provider, più browser desktop/mobile e
  precedente incasso. Suite completa, sintassi e build pubblica Nutrizione superate.
- Ulteriori 13 test di rinnovi previsti e WhatsApp superati con le dipendenze
  dichiarate nel repository. I due archivi ESM degli scheduler sono stati
  ricompilati da Netlify con digest diversi: verificati identici a produzione
  tutti i sorgenti transitivi, runtime, memoria e i due orari già esistenti.
  Non sono state semplicemente allargate le attese del confronto dei digest;
  gli hash dei sorgenti e delle dipendenze sono registrati nel JSON collegato.
- Manifest online Calendario esatto: 44 file, 16 funzioni, sette asset UI più
  configurazione corrispondenti al commit; dieci archivi precedenti identici.
  I gateway interessati differiscono per la sola revisione del protocollo;
  nuova funzione autenticata presente, due scheduler preservati come sopra.
- Provider online: tre asset e otto funzioni precedenti identici, archivio `gas`
  esattamente uguale a quello compilato dal candidato; zero scheduler nuovi.
- Database Studio remoto: test con un record sintetico dentro una transazione;
  salvataggio confermato, sedute preservate, snapshot obsoleto rifiutato. Rollback
  completo e assenza del record verificati, senza modificare clienti reali.
- Anteprima e produzione: richieste anonime respinte con 401; autenticazione
  Calendario e accesso al database verificati con un ID cliente sintetico
  inesistente (404 atteso). Vecchia revisione respinta con 409. Provider con
  token amministrativo e payload sintetico invalido rifiutato prima della scrittura.
  Nessun pagamento, fattura o email creati; nessuna nota o dato finanziario di
  cliente reale letti da questi smoke test.
- Il controllo automatico aveva respinto una proposta di verifica su un cliente
  reale; quell'azione non è stata eseguita. È stata sostituita dai controlli
  esclusivamente sintetici sopra indicati, che sono passati. Nessuna approvazione
  aggiuntiva o azione rischiosa rimane necessaria per il rilascio.
- I controlli Supabase prima/dopo non hanno introdotto nuove segnalazioni:
  restano le sei [viste security definer già presenti](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view),
  le 33 [tabelle server con RLS senza policy pubbliche](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  e la [protezione password segnalata precedentemente](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  Non sono state modificate configurazioni o autorizzazioni estranee al rilascio.

La creazione completa di un pagamento tra i due database è collaudata con dati
sintetici negli ambienti SQL locali, non con un pagamento di produzione. Le prove
remote di salvataggio sono transazionali con rollback; gli smoke test HTTP reali
sono senza scritture. Questa distinzione non deve essere presentata come un
incasso reale già eseguito in produzione.

## Stato Git finale e prossimo passo

Checkout di lavoro preservati: Studio su `feature/whatsapp-agenda-pt-v1` / `d242d2c`,
Nutrizione su `release/consensi-pdf-20261010` / `3aadea7`, con modifiche e file non
tracciati preesistenti più quelli della lavorazione. Nessun reset, merge forzato
 o worktree del contenitore. I candidati di produzione sono nei branch separati
indicati in tabella; `git diff --check` superato in entrambi i repository.

Non restano deploy o migrazioni necessari per questo collegamento. Primo uso:
ricaricare il Calendario, aprire cliente → Pagamenti, salvare totale e quote,
quindi registrare l'incasso condiviso oppure associare quello già in Scadenze.
I cicli con incassi locali preesistenti richiedono la riconciliazione esplicita
prevista, senza conversioni o doppie registrazioni automatiche.

Prove macchina: [manifest e verifiche](20261030-shared-client-finance-published.json).
