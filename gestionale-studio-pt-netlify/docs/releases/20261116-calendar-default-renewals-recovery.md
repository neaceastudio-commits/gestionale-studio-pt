# Calendario — rinnovi predefiniti e recuperi

Richiesta del 16 novembre 2026: prenotare il pacchetto successivo per tutti i
clienti PT attivi senza attendere il pagamento, lasciare conferma/Non rinnova
alla Direzione, permettere la modifica della singola seduta anche se di rinnovo,
ripristinare Loi/Cherchi senza riscrivere lo storico e pubblicare.

Base produzione rilevata: sito 28855faa-de52-4e4c-b1c2-e2db4965670f,
deploy 6af5a709d19df69b4dc7f94f, commit 0f5e5428aa080df6c2a816986c104fd428d8859c.
Il checkout ordinario resta feature/whatsapp-agenda-pt-v1, HEAD 233e240;
indice e lavorazioni precedenti vengono conservati.

La generazione non attende più il residuo di due lezioni. Prepara un successore
per ciclo; Non rinnova e clienti ibernati/archiviati restano esclusi. Date e
stati dei partecipanti si modificano dai normali comandi della seduta, senza
confermare il pacchetto o registrare incassi. Il feed Apple include le
prenotazioni pending come TENTATIVE e OPAQUE, con il PT assegnato.

La nuova funzione SQL calendar_restore_empty_renewal ripristina in una
transazione soltanto un rinnovo aperto completamente svuotato: nuove righe,
storico annullato intatto, stessi piano/ID/importi/stato commerciale, nessuna
modifica ai clienti. SECURITY INVOKER, search_path vuoto, ACL solo service_role,
ruolo Direzione attuale verificato, lock e versione. Riusa il validatore auditato.
Errore all'ultima scrittura provoca rollback anche dell'audit; retry e
scheduler concorrenti non duplicano le lezioni.

Annullata da recuperare passa sempre dalla RPC atomica, anche quando si richiede
il recupero da una seduta già annullata. Nel dettaglio è disponibile Genera
recupero. Rimangono i controlli su ciclo, residui, clienti attivi e PT; un
pacchetto esaurito non ottiene lezioni aggiuntive. Normalizzazione dell'orario
per non scambiare un cambio presenza di coppia per uno spostamento.

Riproduzioni precedenti alla correzione: cinque test falliti per rinnovi vuoti
e recupero da annullata; ulteriore test fallito per soglia residuo; browser
fallito per assenza della modifica accanto all'etichetta Rinnovo.
Test nuovi: calendar-empty-renewal-recovery.test.cjs e
calendar-empty-renewal-browser.cjs. Comprendono SQL locale reale tramite PGlite,
UI/gateway, diniego permessi, rollback, risposta persa, retry, riapertura,
modifica singola e feed Apple. Le scritture dei test sono sintetiche.

Loi/Cherchi: durante il lavoro il recupero del 16 novembre alle 17 è stato
segnato fatto per entrambi alle 17:42 dalla sessione Gianluca. Residuo corrente
zero su 12: le due vecchie cancellazioni del 4/5 non vanno trasformate in nuove
lezioni del pacchetto già completato. La proposta pending del 19 novembre aveva
12 date annullate dall'ibernazione di Silvia dell'11 novembre. Si ripristinano
le date del successore, conservando tali righe e tutti gli stati storici.

Angelo Mura: il giovedì configurato non ha alcun orario documentato. Il rinnovo
usa martedì/venerdì effettivi e segnala il giorno da completare nella proposta;
nessun orario viene inventato e il profilo cliente resta invariato.

Stato di preparazione: candidato e verifiche di pubblicazione in corso.
Gli esiti finali, i riferimenti Git/Netlify e la rilettura del database saranno
registrati qui al termine. Nessuna pubblicazione dichiarata prima della verifica.
