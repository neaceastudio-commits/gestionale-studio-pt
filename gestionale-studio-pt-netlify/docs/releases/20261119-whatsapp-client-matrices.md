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

Suite completa, candidato Netlify, produzione e matrici iniziali disattivate: esiti da completare dopo la pubblicazione autorizzata. I test di invio sono esclusivamente simulati; non verrà attivata alcuna matrice in produzione per collaudare gli invii.
