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

## Pubblicato e verificato

Pubblicazione del 16 novembre alle 18:09:35, ora italiana. Commit applicativo
`31780e032d00a75ede40ec111ba083bad6d15f3b`, branch
`release/calendar-renewals-recovery-20261116`; produzione
`6afb38b6dd6b7cfc61bdf50d`, anteprima `6afb3815ddd6d43f5f89619e`.
Migrazione remota `20261116170557`, nome `calendar_restore_empty_renewal`:
confermati SECURITY INVOKER, search_path vuoto e accesso esclusivo service_role.
Nessun nuovo rilievo dagli advisor sicurezza rispetto alla base.

Suite completa passata sul checkout pulito del commit applicativo, incluse le
16 funzioni compilate. Otto nuovi test SQL/comportamentali passati; browser
con dati sintetici riuscito sia con asset locali sia con asset reali di
anteprima e produzione. Passati anche il test con due connessioni PostgreSQL
indipendenti per il recupero, il browser esistente per il recupero automatico
e i tre test SQL/generazione dei rinnovi. Nessun test saltato in questi controlli.

Netlify: verificato il manifesto completo di 47 file, i cinque asset modificati,
le dipendenze delle cinque funzioni ricompilate, gli altri 11 archivi funzione
invariati, runtime/configurazione e due pianificazioni conservati, accesso anonimo
rifiutato con 401. Impostazioni precedenti ripristinate (branch main, stop_builds
false, rami ammessi originali), nuova produzione bloccata contro pubblicazioni
automatiche. Non è stato dichiarato un blocco automatico dei test di rilascio.

Il cron pubblicato ha eseguito il primo popolamento reale alle 18:10:
**20 clienti PT attivi, 18 proposte (due coppie), 151 prenotazioni di rinnovo;
zero clienti eleggibili senza date.** Le conferme precedenti restano confermate;
i nuovi rinnovi sono pending, non generano incassi. Il Non rinnova precedente
è stato rispettato. Per Angelo è visibile il giorno da completare, senza
aggiungere un orario inventato.

Loi/Cherchi: 12 nuove prenotazioni dal 19 novembre ore 19 al 16 dicembre ore 9,
stessa proposta pending, importi/registri/saldi invariati. Rilettura indipendente:
tutti i 54 appuntamenti preesistenti coincidono integralmente con la base
rilevata prima del rilascio (cutoff UTC 17:05:13.671142;
MD5 ordinato `3e7ac7c91c0cd16962310cce613e2cbc`). Anche le due righe cliente
coincidono integralmente (`0d7a7be0848c2d785bf9a576eda95dde`). Le vecchie 12 date
annullate restano nello storico; nessuna assenza è stata convertita in presenza.

Feed Apple reale interrogato in sola lettura con la credenziale esistente
mantenuta soltanto in memoria: 151 rinnovi presenti nel feed Studio; presenti
anche nei feed individuali dei quattro PT (115, 16, 12 e 8), nessun UID mancante.
Questo dimostra il contenuto del feed server. Non attesta che ogni dispositivo
Apple abbia già completato il proprio aggiornamento; il servizio CalDAV
esistente continua la sua sincronizzazione, senza modifiche alla configurazione.

Stato Git finale: checkout ordinario `feature/whatsapp-agenda-pt-v1`, HEAD
`233e240`, 35 file modificati e 129 non tracciati; indice e lavorazioni
preesistenti preservati. Il candidato di rilascio
è salvato sul branch dedicato; il successivo commit documentale non cambia
l'applicazione pubblicata. Nessun intervento esterno necessario per attivare
le correzioni. Prossimo controllo: verificare dal registro le prossime conferme,
Non rinnova e recuperi effettivi senza cambiare lo storico preesistente.
