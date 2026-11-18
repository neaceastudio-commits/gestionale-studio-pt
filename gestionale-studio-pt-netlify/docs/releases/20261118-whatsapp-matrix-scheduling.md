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

Suite completa del calendario e verifica candidato/produzione: esiti da registrare a completamento. Il collaudo dei servizi esterni non comprende invii reali né l’attivazione di matrici di produzione.

La prima regressione completa ha rilevato quattro fixture browser non aggiornate al servizio calendar-private-data già online: una richiesta intercettata è stata rifiutata dal test perché rivolta al nuovo host. Le fixture ora eseguono il vero handler protetto contro lo stesso SQL locale; nessun cambiamento al trasporto o alle autorizzazioni di produzione. Il rifiuto e la successiva verifica restano documentati; nessun controllo viene saltato.
