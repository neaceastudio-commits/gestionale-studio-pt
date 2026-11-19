# WhatsApp Clienti — matrici appuntamenti e pacchetti

## Richiesta e baseline

Aggiungere matrici Clienti per promemoria appuntamenti, sedute residue e fine/scadenza pacchetto, con giorno e ora configurabili. Creazione e salvataggi sempre disattivati, abilitazione individuale scelta dall’utente, nessun invio di prova. Clienti e PT restano separati.

Baseline verificata realmente online: commit `4d9bf78271c80d4a6d0bf1ebf918a874d8d1a017`, deploy `6afdeff71f1dfa5c28805ef0`, bloccato, sito Netlify `28855faa-de52-4e4c-b1c2-e2db4965670f`, dominio https://calendario.neacea.com. Il checkout riparte dal discendente documentale `edcc0235e9ae228e169ddab8097dcac3cd96c61e`; nessuna sorgente di main o dei checkout con lavorazioni preesistenti viene pubblicata.

Ramo: `codex/whatsapp-client-matrices-20261119`. Principali sorgenti: `comunicazioni.html`, `js/comunicazioni.js`, modello condiviso `js/whatsapp-client-models.js`, `whatsapp-client-service.mjs`, store delle matrici e worker persistente esistenti.

Lo storage reale iniziale contiene due matrici PT, una già attivata dall’utente, e nessuna Clienti. È stato chiesto se mantenere la PT attiva o disattivare anche le PT; in assenza di diversa indicazione si preserva la configurazione PT preesistente e si lasciano disattivate le nuove Clienti. Questo rilascio non attiva alcuna matrice.

## Regole e dati

- Cadenza giornaliera o settimanale, giorno e ora Europe/Rome, con gestione dell’ora legale già usata per le PT.
- Appuntamenti: anticipo configurabile da 0 a 30 giorni. Solo prenotazioni future effettive del cliente; esclusi annullati, già iniziati, orari provvisori, rinnovi non confermati e partecipanti annullati nelle coppie. Ogni testo contiene solo nome del destinatario, giorno, ora e servizio; mai i nomi degli altri partecipanti.
- Sedute residue: soglia da 0 a 100, confrontata con il residuo salvato dal gestionale. Le prenotazioni future non vengono sottratte. Identità del ciclo corrente condivisa con il calendario; una notifica per cliente, ciclo e soglia.
- Fine prevista: entro un anticipo da 0 a 90 giorni. Non esiste una scadenza contrattuale separata nel modello corrente. Viene usata l’ultima seduta del ciclo corrente soltanto se il residuo è interamente ed esattamente programmato, escludendo i rinnovi successivi e dati provvisori. Una notifica per cliente, ciclo, data prevista e anticipo. La distinzione fra fine prevista e scadenza contrattuale è mostrata nel pannello.
- Clienti inattivi, ibernati, archiviati o sospesi, numeri mancanti/non validi e dati incompleti esclusi. Nessuna modifica a presenze, credito, incassi o calendario.
- Anteprima lato server della prossima scadenza, disponibile anche prima dell’approvazione del modello; non abilita e non invia. Ogni destinatario e testo sono mostrati separatamente.
- Salvataggio sempre disattivato; audience immutabile su una matrice esistente. Attivazione solo Direzione su produzione pubblicata, con modello corrispondente esattamente al contratto APPROVED e UTILITY. Nessun fallback automatico a testo libero o modelli marketing. Ogni modifica salvata richiede una nuova attivazione esplicita.
- Worker e controlli cron preesistenti, senza nuove funzioni o nuove credenziali. Claim atomici anche fra matrici e scadenze diverse per la stessa condizione, ricevute e webhook riutilizzati. Nessun reinvio automatico dopo esito incerto.
- Dati, recapito e stato corrente riletti prima dell’invio. Una modifica al telefono dopo la risoluzione del destinatario blocca il POST al provider; la chiave di deduplicazione resta stabile anche dopo un cambio telefono.

## Modelli Meta

Definizioni e esempi sintetici in `config/whatsapp-client-templates.json`, coerenti con il modulo condiviso usato dal browser e dal server. Richiesta di approvazione eseguita senza inviare messaggi:

- `neacea_promemoria_appuntamento_v1`, italiano, UTILITY, id `4282557321983728`.
- `neacea_sedute_residue_v1`, italiano, UTILITY, id `1458329089741349`.
- `neacea_fine_pacchetto_v1`, italiano, UTILITY, id `2603147466830305`.

L’attivazione rimane bloccata finché il modello specifico è assente, PENDING, rifiutato, sospeso, riclassificato marketing o diverso dal testo previsto. Lo stato viene riletto con Aggiorna matrici ed esiti e verificato nuovamente sul server.

## Verifiche

Test mirati Clienti con storage e Meta simulati: selezione personale, esclusioni, contatori salvati, fine prevista soltanto completa, cicli successivi esclusi, audience immutabile, salvataggi e anteprima senza attivazione, approvazione/categoria/contenuto, controlli cron, concorrenza, deduplicazione fra giorni e matrici, cancellazioni e cambi dati, pausa, esito incerto e cambio telefono.

Integrazione con vero SQL locale: servizio di pianificazione letto tramite adapter JSON del Data API, operazioni di esempio effettuate attraverso il gateway audit, rilettura indipendente di appuntamenti e residui, nessuna scrittura causata dalle anteprime, cancellazione persistente rispettata dopo riapertura. Il primo allestimento del test ha rifiutato un update privo del contesto audit; la fixture ora usa il gateway autorizzato, senza disabilitare il controllo.

Browser con tutte le API intercettate: tre tipi Clienti, giorno/orario/anticipo/soglia, anteprima, modelli pending/approved, salvataggio e riapertura, annullamento conferma, attivazione singola, modifica con disattivazione, separazione Clienti/PT e layout mobile. Regressione PT e confezionamento delle 21 funzioni inclusi.

Suite completa `bash scripts/check-calendar-release.sh`: PASS sul candidato salvato, terminata con “OK: pacchetto Calendario completo e verificato.”. Trentuno test mirati passati. I test di invio sono esclusivamente simulati; nessuna matrice è stata attivata per collaudare gli invii.


## Pubblicazione e dati persistenti

- Commit di codice pubblicato: `98784c2cba49474298e74ca804733ee9b7edf7ce`.
- Candidato verificato senza pubblicazione: `6afebb26df4c4ddd09b9cdb3`.
- Nuovo build Git pubblicato: `6afebc5827d255ea319418aa`, produzione https://calendario.neacea.com, nuovamente bloccato. Ramo produzione `codex/whatsapp-client-matrices-20261119`; nessun main o deploy precedente ripristinato.
- [PR #21](https://github.com/neaceastudio-commits/gestionale-studio-pt/pull/21), pronta per revisione, base del rilascio delle matrici PT.
- Manifesto completo di 54 file confrontato con la baseline: soltanto `comunicazioni.html`, `js/comunicazioni.js` e il nuovo `js/whatsapp-client-models.js` costituiscono il cambiamento pubblico previsto. Tutte le 21 funzioni e tutte le pianificazioni preesistenti presenti, senza nuove funzioni o cron.
- Test browser passati anche sugli asset realmente serviti dal candidato Netlify e dal dominio reale, con ogni API di invio/configurazione intercettata. Contenuti live confrontati byte per byte con Git. Sessioni non valide rifiutate con 403 su matrici, anteprima, attivazione ed esiti; callback con percorso errato rifiutato con 404 nel candidato.
- Verifica read-only Supabase sul progetto Studio corretto `cdywqyqqmjhgkzwrrixc`: proiezioni esatte del lettore Clienti/Appuntamenti valide; 23 clienti attivi, 19 con recapito non vuoto. Nessuna migrazione, grant o modifica a dati gestionali.
- Tre modelli verificati APPROVED, UTILITY, italiano: promemoria appuntamenti, sedute residue e fine prevista. Nessun messaggio inviato per ottenerne l’approvazione.

Sono state preparate le tre matrici effettivamente richieste, non record sintetici di collaudo. Salvataggio mediante la validazione del servizio `agendaRules` e scritture condizionali nello store Netlify di produzione, dopo verifica del deploy bloccato. Impostazioni iniziali, tutte modificabili dall’utente:

| Matrice | ID | Controllo iniziale | Condizione | Stato |
|---|---|---|---|---|
| Promemoria appuntamenti | `cff109ea-78ad-40e5-8862-835206992c8c` | Ogni giorno, 08:00 Europe/Rome | Appuntamenti fra 1 giorno | Disattivata |
| Avviso sedute residue | `bbc94618-e8e4-4025-ac94-965faadbf2f6` | Ogni giorno, 08:00 Europe/Rome | Residuo ≤ 2 | Disattivata |
| Fine prevista pacchetto | `e10ad958-ec5d-48aa-ac36-64b25382e09c` | Ogni giorno, 08:00 Europe/Rome | Fine prevista entro 3 giorni | Disattivata |

Rilettura indipendente dello storage reale da un nuovo processo: tre Clienti, zero abilitate, `activation` e `nextRunAt` null, zero occorrenze Clienti e zero claim di invio Clienti. Le due matrici PT sono state confrontate prima/dopo e risultano invariate, inclusa quella già attivata dall’utente. Nessun record scritto nelle altre applicazioni.

## Limite della verifica autenticata e stato finale

La sessione Direzione aperta in Chrome il giorno precedente è scaduta. È stato aperto il modulo Accedi al Calendario e richiesto all’utente di rientrare con email/codice Portale PT, senza condividerli in chat. La verifica con sessione Direzione rinnovata e anteprima dei dati reali nel browser resta in attesa di questo accesso. Non viene riportata come superata: i test browser con backend simulato, il controllo del dominio e la rilettura dello storage sono prove distinte.

Nessun messaggio reale inviato, nessun PDF generato, nessuna nuova matrice attivata, nessuna modifica a credenziali/provider/webhook o al calendario. Checkout del candidato pulito prima della registrazione documentale finale; checkout originari con lavorazioni preesistenti preservati. Questo aggiornamento documentale non sostituisce il codice pubblicato e bloccato.

Prossimo passo utente: rientrare in Calendario per la verifica autenticata; poi in Messaggi → Clienti → Automazioni modificare le impostazioni desiderate, salvare disattivate e scegliere singolarmente Attiva matrice quando si vuole iniziare.
