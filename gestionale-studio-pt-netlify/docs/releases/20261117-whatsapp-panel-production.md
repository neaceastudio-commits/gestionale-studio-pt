# Pannello WhatsApp — rilascio produzione 17 novembre 2026

## Versione e destinazione

- Repository: neaceastudio-commits/gestionale-studio-pt; PR #19 pronta per revisione, non più draft.
- Ramo produzione: `release/whatsapp-panel-production-20261117`.
- Candidato iniziale: `b8713c69825fdbca9f97c336a10652129f1d7cd5`.
- Codice pubblicato: `16be70c79b8920e33a9668d2c3b7b5d78d5d9c91`, discendente del candidato iniziale.
- Deploy: `6afcc6d8a2f0ed7fb36cb5b2`, pubblicato il 17/11/2026 alle 22:28:03 Europe/Rome.
- Sito Netlify: `28855faa-de52-4e4c-b1c2-e2db4965670f`, new-calendar-neacea.
- Dominio verificato: https://calendario.neacea.com.
- Produzione precedente: deploy `6afb47b0b6f47709f098a601`, commit `d6ae3f5ee3780f9fb262fb14498cc61405ecc1c8`.

## Correzioni necessarie al rilascio

Il candidato originario presentava ancora un URL webhook riferito all'anteprima #18. Il callback mostrato dal pannello ora usa il dominio reale e la funzione whatsapp-messages. La dipendenza @netlify/blobs 11.0.3 è dichiarata alla radice con lockfile, dove Netlify installa le dipendenze. Il controllo del build verifica l'elenco esatto delle 17 funzioni e ne risolve tutte le dipendenze.

Il problema del callback è stato riprodotto con un test fallito prima della correzione. Il controllo di confezionamento ha riprodotto la dipendenza non risolta prima dell'aggiunta alla radice. Le verifiche successive sono passate.

Accesso Netlify confermato. La configurazione precedente usava main come ramo produzione, mentre il calendario pubblicato era bloccato a un ramo di rilascio. Ora il ramo produzione è quello WhatsApp sopra indicato. Il nuovo deploy è bloccato per impedire sostituzioni automatiche non controllate. Non è stato pubblicato main e non sono stati modificati altri siti.

## Verifiche del candidato e online

Runtime locale Node 24.14.1, compatibile con engines >=22 <25. Dipendenze dichiarate e lockfile installati nel candidato isolato. La prima installazione senza script richiedeva il completamento dello script di embedded-postgres; dopo npm rebuild il controllo di concorrenza è passato.

- Suite completa `bash scripts/check-calendar-release.sh`: terminata con “OK: pacchetto Calendario completo e verificato.”.
- Dieci test whatsapp-agenda: passati, servizi esterni simulati.
- Test whatsapp-messages-production: passati, accesso Direzione, isolamento sito, nessuna azione test legacy e salvataggio matrici sempre disabilitate.
- Test whatsapp-delivery-production: passati, challenge, numero errato, ordine degli stati, deduplicazione e distinzione fra accettazione e consegna. Eventi sintetici soltanto nel test locale.
- Test browser whatsapp-agenda: passato con Playwright delle dipendenze del repository; nessuna richiesta di invio.
- Build Netlify in contesto production prima verificato senza pubblicarlo; challenge del candidato riuscito.
- Manifesto completo di 51 file confrontato con produzione precedente e sorgenti Git: soltanto i sei asset WhatsApp previsti e il netlify.toml del candidato differiscono.
- Diciassette funzioni presenti; pianificazioni precedenti invariate.
- HTTP sul dominio reale: accesso anonimo agli esiti rifiutato con 403; callback con percorso errato rifiutato con 404.
- Browser reale con sessione Direzione: scheda Messaggi, rubriche Clienti/PT distinte, agenda personale in testo senza PDF, matrici in bozza e registro esiti verificati.
- Lettura dal pannello dei tre modelli APPROVED presenti in Meta riuscita. Compositore lasciato vuoto, senza destinatari selezionati.

Le correzioni del calendario sono conservate: il commit precedente è antenato del candidato e tutti gli asset non previsti dal cambiamento WhatsApp hanno lo stesso hash della produzione precedente. La suite SQL/browser verifica anche recuperi, rinnovi e concorrenza.

## Webhook e consegne

L'utente ha approvato esplicitamente due segreti dedicati al webhook di produzione e il collegamento al dominio reale. Sono configurati soltanto nell'ambiente esterno; nessun valore è riportato qui. Token WhatsApp, Phone Number ID e versione API preesistenti sono stati preservati.

easyCoexistence/Meta ha accettato il callback di produzione e confermato la sottoscrizione. Handshake registrato alle 22:28:21 Europe/Rome. Il pannello mostra l'URL del dominio reale.

Ispezione in sola lettura dello store esistente: 22 eventi relativi a 16 messaggi distinti; 14 eventi delivered, 6 sent, 2 failed con codice 131047. Sono conteggi di eventi storici, non nuovi invii di questo rilascio. Ultima notifica messaggi presente: 17/11/2026 alle 19:33:16 Europe/Rome. Nessun evento read disponibile nello storico controllato.

Il numero risulta connected, qualità GREEN, collegamento Coexistence valido; sending_health resta LIMITED e sending_block_code è assente. Il funzionamento della consegna di un nuovo messaggio dopo il cambio callback non è stato collaudato, rispettando il divieto di inviare prove. Il codice distingue Accettato da Meta, Inviato, Consegnato, Letto ed Errore.

## Stato e prossimo passo

Nessun messaggio inviato durante il rilascio. Nessuna matrice attivata; zero matrici abilitate nello store verificato, interruttore dello scheduler precedente ancora disabilitato. Nessun PDF agenda generato. Nessuna migrazione né modifica ai dati gestionali eseguita per questo rilascio.

Checkout del candidato pulito al commit pubblicato; checkout originari con lavorazioni preesistenti lasciati intatti. Questo rapporto è una registrazione documentale successiva al deploy e non cambia il codice pubblicato. I prossimi invii esplicitamente scelti dall'utente dovranno essere valutati sul loro effettivo esito webhook; la limitazione Meta resta da monitorare.
