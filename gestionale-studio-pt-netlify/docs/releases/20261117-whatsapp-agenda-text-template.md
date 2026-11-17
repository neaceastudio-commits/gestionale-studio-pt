# Agenda PT testuale — modello approvato e pubblicato

## Rilascio del 17 novembre 2026

- Dominio: https://calendario.neacea.com.
- Sito: new-calendar-neacea, `28855faa-de52-4e4c-b1c2-e2db4965670f`.
- Ramo: `release/whatsapp-panel-production-20261117`, PR #19.
- Codice pubblicato: `4a8e6e209f587fdc323f9241f7b64b3e6645300d`.
- Deploy: `6afccda15ba5d1373414fa17`, pubblicato alle 22:57:06 Europe/Rome, protetto con lock.
- Baseline preservata: deploy `6afcc6d8a2f0ed7fb36cb5b2`, codice `16be70c79b8920e33a9668d2c3b7b5d78d5d9c91`.

## Modello Meta

`neacea_agenda_pt_testo_v1`, ID `29372335675731970`, lingua italiana, categoria UTILITY: APPROVED. Creazione e successiva lettura del modello autorizzate dall'utente; nessun messaggio inviato.

La definizione completa e gli esempi sintetici sono in `config/whatsapp-agenda-text-template.json`. Corpo senza header media, footer “Agenda personale PT · NEACEA”. Ogni parte include nome PT, periodo, numero della parte e fino a sei sedute su righe distinte; le righe inutilizzate sono indicate con —. Nessuna variabile contiene a capo o tabulazioni. Ogni corpo resta entro 1024 caratteri: il numero di sedute per parte diminuisce quando occorre, senza troncare nomi o appuntamenti.

Il testo effettivamente approvato è stato riletto da Meta e confrontato con il contratto condiviso fra browser e server: corrispondenza esatta.

## Comportamento del pannello

Personal Trainer → Agenda dal calendario propone il modello approvato, utilizzabile anche fuori dalla finestra di 24 ore. Il testo libero resta una scelta esplicita per la finestra aperta; il pannello avverte che non determina automaticamente l'ultimo messaggio ricevuto.

L'anteprima mostra tutte le parti per ciascun PT e il totale dei messaggi WhatsApp. La conferma manuale elenca destinatari e numero di messaggi per persona. Un'agenda lunga genera più messaggi di testo, senza PDF o altri allegati.

Il server ricostruisce ogni parte dai dati del calendario, verifica revisione, destinatario, indice e numero totale delle parti, e controlla nuovamente l'approvazione e il testo del modello. Se il modello non è disponibile, non è approvato o non corrisponde all'anteprima, l'invio è bloccato senza fallback automatico a testo libero.

Ogni parte ha una protezione contro i duplicati e una riga autonoma nel registro. Il tentativo ripetuto non invia nuovamente una parte già accettata. Un errore o esito incerto interrompe le parti successive. Eventuali allegati/template delle vecchie bozze agenda vengono ignorati; il generatore PDF agenda inutilizzato è stato rimosso.

Clienti e PT conservano rubriche e selezioni separate. Nessuna matrice viene attivata salvando o aprendo il pannello.

## Verifiche

- Riproduzione sul codice precedente: il test dell'agenda fuori finestra falliva perché il payload non usava un modello.
- Otto test server/contratto passati: partizionamento, conservazione completa delle sedute, nomi lunghi, limiti, payload reale del compositore con provider simulato, deduplicazione concorrente e per parte, modello pending/rejected/alterato, calendario cambiato, indici falsificati, destinatario cliente e vecchi allegati.
- Test browser isolato desktop/mobile passato: blocco PENDING, passaggio APPROVED senza invio automatico, anteprima completa, conteggio esatto nella conferma, annullamento, richieste simulate, registro per parte e interruzione dopo errore.
- Stesso test browser ripetuto con gli asset del candidato Netlify, mantenendo endpoint e contatti simulati.
- Suite completa Calendario conclusa con “OK: pacchetto Calendario completo e verificato.” su Node 24.14.1 e dipendenze dichiarate.
- Test endpoint produzione e gestione esiti passati; servizi esterni simulati.
- Manifesto completo verificato: 52 file; cambiano solo comunicazioni.html, js/comunicazioni.js e il nuovo js/whatsapp-agenda-text.js. Gli asset del calendario restano identici.
- Diciassette funzioni presenti; pianificazioni invariate; richieste anonime agli esiti rifiutate con 403 e percorso webhook errato con 404.
- Browser reale con sessione Direzione: modello approvato, anteprima effettiva suddivisa in parti, tre PT selezionabili e cinque messaggi previsti per il periodo controllato, nessun allegato, matrici non attive. I destinatari sono stati poi deselezionati; pulsante di invio disabilitato.
- Ispezione in sola lettura dello store dopo il rilascio: sempre 22 eventi storici su 16 messaggi, zero matrici abilitate e interruttore scheduler precedente disabilitato. Nessun nuovo invio.

Nessuna migrazione, modifica delle credenziali o variazione della configurazione webhook è stata necessaria. Non sono stati generati PDF né inviati messaggi di prova. Le verifiche di dispatch sono esclusivamente locali con Meta simulata; nessuna nuova consegna reale è stata collaudata.

## Stato Git e seguito

Checkout del candidato pulito al commit del codice pubblicato. Questo rapporto è una registrazione successiva e non cambia il codice online. I checkout originari con lavorazioni preesistenti sono rimasti intatti. Il prossimo invio dovrà essere scelto e confermato esplicitamente dalla Direzione; il registro distinguerà la presa in carico dagli effettivi eventi di consegna.
