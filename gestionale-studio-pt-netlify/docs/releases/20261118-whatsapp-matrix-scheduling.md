# WhatsApp — programmazione delle matrici PT

Richiesta: scelta di cadenza, giorno e ora con attivazione esplicita di ciascuna matrice. Tutte le matrici esistenti e nuove restano disattivate fino all’abilitazione dell’utente. Nessun invio di prova, PDF agenda o attivazione durante il rilascio.

## Baseline e comportamento

Baseline effettivamente pubblicata: commit `db5a92185e445ec3fdd50652e5c548170526a2ce`, deploy `6afcdb11b5fd8bfb268d4c82`, ramo `codex/private-studio-tables-calendar-20261117`. Il candidato discende da questa versione e conserva le correzioni degli accessi ai dati e del calendario. Il vecchio main e il precedente ramo WhatsApp non sono usati come sorgente di rilascio.

Ramo candidato: `codex/whatsapp-matrix-scheduling-20261118`. Destinazione: https://calendario.neacea.com, sito Netlify `28855faa-de52-4e4c-b1c2-e2db4965670f`.

- Automazioni PT: giorno della settimana oppure ogni giorno, ora nel fuso Europe/Rome, agenda del giorno/settimana precedente, corrente o successiva.
- Salvataggio sempre disattivato; un’azione distinta Attiva richiede Direzione e una conferma riferita alla singola matrice. Nessuna attivazione collettiva. Le matrici legacy senza autorizzazione esplicita vengono considerate disattivate.
- Attivazione consentita soltanto sul deploy pubblicato in produzione, con modello approvato e mittente verificati. Prima scadenza strettamente futura; visualizzazione del prossimo invio.
- La modifica salvata mette in pausa la matrice. Disattiva impedisce i messaggi successivi; una richiesta già trasmessa a Meta può completarsi.
- Ora legale italiana: nessun doppio invio nell’ora ripetuta; un orario inesistente viene saltato. Nessun recupero automatico oltre 15 minuti dalla scadenza.
- Cron ogni minuto: coordina occorrenze persistenti; worker in background con firma HMAC a scadenza breve usando il segreto server esistente. Nessun nuovo segreto o cambiamento alle variabili del provider. Scheduler legacy invariato e disabilitato.
- Per ogni parte: ruoli Direzione e stato corrente della matrice ricontrollati; agenda ricostruita dal calendario server; claim atomico e ricevuta persistente. Un esito incerto interrompe l’occorrenza e non viene ritentato automaticamente. Aggiornamenti concorrenti protetti da revisioni.
- Destinatari esclusivamente PT attivi con agenda; Clienti resta separato. Modello `neacea_agenda_pt_testo_v1`, solo testo, anche oltre le 24 ore, suddivisione in parti senza tagliare sedute. Nessun PDF o caricamento media.
- Esiti per scadenza e comando Controlla consegna basato sugli eventi webhook, distinguendo accettazione, consegna e lettura.

## Verifiche del candidato

Node 24.14.1 e dipendenze dichiarate nei lockfile. Test automatici con storage/Meta/calendario sintetici: orari e DST, regole legacy, inattività predefinita, attivazione singola/idempotente, revoche, pause, errori, concorrenza, manifesti e claim persistenti, calendario cambiato fra parti, esito incerto e callback consegna. Test browser: salvataggio, errore con dati conservati, conferma/annullamento attivazione, isolamento fra matrici, riapertura, pausa, conflitto, modifica con disattivazione, mobile e nessun invio automatico provocato dalle operazioni di configurazione.

La suite di confezionamento verifica tutte le 21 funzioni, incluse le 19 della baseline. L’attesa del vecchio test elencava ancora 17 funzioni e non includeva le due già aggiunte dalla baseline di produzione; ora è allineata all’inventario reale, senza rimuovere funzioni. Le pianificazioni precedenti vengono preservate.

Suite completa `bash scripts/check-calendar-release.sh` sul candidato finale: PASS, conclusa con “OK: pacchetto Calendario completo e verificato.”. Ventuno controlli mirati WhatsApp/build passati. Browser locale e browser sugli asset effettivi del candidato Netlify e del dominio reale: PASS, tutte le API intercettate. Il collaudo dei servizi esterni non comprende invii reali né l’attivazione di matrici di produzione.

La prima regressione completa ha rilevato le fixture browser SQL e del controllo clienti non aggiornate al servizio calendar-private-data già online: una richiesta intercettata è stata rifiutata dal test perché rivolta al nuovo host. Le fixture ora eseguono il vero handler protetto contro lo SQL locale o agli stessi record sintetici preesistenti; nessun cambiamento al trasporto o alle autorizzazioni di produzione. Il rifiuto e la successiva verifica restano documentati; nessun controllo viene saltato.


## Pubblicazione e verifica reale

- Codice pubblicato: `4d9bf78271c80d4a6d0bf1ebf918a874d8d1a017`; implementazione `6cb4f7609ca5116fce691d6fb5aead222f3f8897`, seguita dagli aggiornamenti delle fixture.
- Candidato Netlify verificato senza pubblicazione: `6afdef368090af7a13ff5dc8`.
- Deploy pubblicato: `6afdeff71f1dfa5c28805ef0`, produzione su https://calendario.neacea.com, bloccato nuovamente dopo il rilascio. Nessun ripristino di deploy precedenti; nuovo build Git dell’esatto candidato.
- PR [#20](https://github.com/neaceastudio-commits/gestionale-studio-pt/pull/20), pronta per revisione, base `codex/private-studio-tables-calendar-20261117`. La precedente PR #19 rimane separata.
- Manifesto completo di 53 file uguale alla baseline eccetto `comunicazioni.html`, `js/comunicazioni.js` e il `netlify.toml` del candidato. Tutti gli asset del calendario e della protezione dati conservati.
- Ventuno funzioni presenti: le 19 precedenti più coordinatore e worker delle matrici. Cron precedenti invariati; nuovo `whatsapp-matrix-scheduled` ogni minuto. Scheduler WhatsApp legacy ancora disabilitato.
- HTML e JS serviti dal dominio reale corrispondono al candidato. Accessi senza sessione alle azioni matrici/esiti rifiutati con 403; callback con percorso errato rifiutato con 404.
- Browser reale, sessione Direzione: Clienti e PT separati; nuova sezione Automazioni visualizzata; matrice preesistente aperta e salvata disattivata senza cambiare nome o pianificazione. Conferma server osservata; dopo ricaricamento completo e riapertura la matrice resta disattivata.
- Lettura indipendente e forte dello storage reale Netlify: una matrice, zero abilitate; record versione 2 disattivato con `activation` e `nextRunAt` null. Nome “Lista lezioni Pt settimanali”, ogni lunedì 08:00 Europe/Rome, settimana corrente conservati. Zero occorrenze del nuovo motore e zero claim di invio programmato. Nessun record sintetico creato in produzione.
- Modello `neacea_agenda_pt_testo_v1` verificato APPROVED, UTILITY, italiano. Provider connected, qualità GREEN, tier 250; segnala ancora LIMITED senza codice di blocco. Webhook indirizzato al dominio reale. Non si deduce la consegna di nuovi messaggi da queste verifiche.

Nessun messaggio reale inviato, nessuna matrice abilitata, nessun PDF agenda generato. Nessuna migrazione o modifica di segreti, variabili provider o dati del calendario. Le prove di invio automatico, pausa durante le parti e consegna sono esclusivamente locali con servizi simulati; il salvataggio disattivato e la rilettura sono verificati anche nello storage reale.

Checkout temporaneo pulito al candidato verificato prima della registrazione documentale finale; checkout originari con lavorazioni preesistenti lasciati intatti. L’aggiornamento finale di questo rapporto non modifica il codice pubblicato. Prossimo passo dell’utente: scegliere le impostazioni desiderate e premere Attiva matrice soltanto sulle singole matrici da avviare; il primo invio sarà alla scadenza futura mostrata dal pannello.
