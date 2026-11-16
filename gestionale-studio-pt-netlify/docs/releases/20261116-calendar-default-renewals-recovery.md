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

## Controllo successivo — incrocio pacchetti Boi e censimento generale

Su richiesta successiva del titolare, sola lettura del database e del codice
pubblicato; nessuna rettifica di appuntamenti, presenze, cicli o incassi.
Il precedente controllo di copertura (151 date presenti nel feed) non dimostra
la correttezza della successione fra i cicli. Questo controllo aggiunge tale
verifica e rileva un difetto non risolto dal rilascio sopra.

Censiti 37 clienti: 21 attivi (uno Non rinnova), 16 archiviati. Incrociati tutti
i rinnovi registrati con i collegamenti dei cicli e le prenotazioni residue;
approfonditi i 20 clienti PT rinnovabili e i rispettivi rinnovi aperti.

**Davide Boi:** vecchio pacchetto di otto, sette lezioni fatte, residuo uno.
Il rinnovo successivo è stato creato il 27 ottobre e confermato il 5 novembre;
la prima seduta del nuovo è già fatta il 5 novembre. Il vecchio pacchetto ha
invece l'ultima lezione prenotata al 15 dicembre: questo impedisce l'attivazione
del rinnovo confermato. Nessuna modifica a Boi registrata dopo il rilascio del
16 novembre; l'ultima è del 12 novembre alle 15:19, ora italiana.

Tracce del recupero vecchio: evento 3713, creato il 5 novembre per il 3 dicembre
con ID ciclo vecchio. Eventi 4285/4286 del 12 novembre: annullato ed eliminato.
Evento 4287: nuova lezione del vecchio ciclo al 10 dicembre. Eventi 4288/4289:
annullamento e recupero automatico al 15 dicembre. Si tratta di creazioni e
annullamenti registrati, non di una conversione generale di stati in Fatto.

Difetto riprodotto con la funzione effettiva del commit 31780e0, Node 24.14.1,
orologio sintetico del 5 novembre e rinnovo già prenotato fino al 1 dicembre:
`_suggestPackageDates` propone il 3 dicembre per il residuo del vecchio ciclo.
La funzione usa `_packageAppointments` senza limitare l'insieme al ciclo da
pianificare. Il registro non identifica il pulsante premuto nell'evento 3713;
la riproduzione dimostra il difetto e il risultato coincide con la data
registrata, senza attribuire al log una prova del chiamante che non contiene.

**Altri casi da verificare:**

| Cliente | Vecchie sedute passate ancora prenotate | Residuo | Prenotate future del ciclo corrente |
|---|---|---:|---:|
| Aurora Margini | 6 novembre | 0 | 0 |
| Gabriele Cauli | 5 novembre | 8 | 8 |
| Angelo Mura | 3, 6 e 10 novembre | 3 | 3 |
| Luciana Pibiri | 5 novembre | 3 | 2 |
| Dario Pirodda | 11 novembre | 5 | 4 |
| Mauro Usala | 30 ottobre | 1 | 1 |

Queste otto righe passate possono bloccare la chiusura anche con residuo zero.
Per Luciana e Dario manca inoltre una prenotazione futura rispetto al residuo:
un rinnovo pronto in agenda non garantisce quindi la completa pianificazione
delle lezioni precedenti. Nessun altro incrocio del tipo Boi trovato sui
collegamenti dei cicli verificati. I casi archiviati non sono stati riattivati.

### Regola operativa proposta, non ancora implementata

- Tenere un'unica sequenza di appuntamenti reali per cliente. I posti del
  pacchetto successivo rimangono già prenotati e visibili ai PT/Apple anche
  prima della conferma commerciale e del pagamento.
- Consumare prima il credito del pacchetto precedente. La pianificazione di un
  residuo consulta il suo ciclo, mentre un controllo distinto considera gli
  altri appuntamenti per evitare conflitti: non usarne la coda come fine ciclo.
- Per un annullamento da recuperare, usare la prima prenotazione futura utile
  già presente come recupero del credito precedente; riallocare soltanto i
  collegamenti delle prenotazioni future e aggiungere in coda l'eventuale lezione
  necessaria a mantenere completo il nuovo pacchetto. Conservare ID, date e PT
  delle lezioni già comunicate quando possibile, con anteprima degli effetti.
  Operazione atomica, controllo di versione e ricevuta idempotente; vietare
  doppie prenotazioni automatiche dello stesso cliente per lo stesso slot.
- Nelle coppie gestire credito e ciclo separatamente per persona, mantenendo
  un solo appuntamento fisico e un solo compenso della seduta.
- Non rinnova cancella le sole prenotazioni del successore rifiutato. I recuperi
  del pacchetto precedente restano da completare. Conferma e incasso restano
  eventi distinti dalla prenotazione e dal consumo della lezione.
- Mettere in evidenza le sedute passate ancora prenotate. Non attribuire una
  presenza o un'assenza senza riscontro. Se una presenza già registrata è
  associata al ciclo errato, richiedere una rettifica esplicita e tracciata,
  mantenendo il prima/dopo e i riferimenti a programma e dati della seduta.

Prima di applicare questa regola: test di confine fra vecchio/nuovo ciclo,
annullamento prima/dopo la prima seduta del rinnovo, casi individuali e coppie
con residui diversi, Non rinnova, conferma e incasso indipendenti, perdita di
risposta/concorrenza e rilettura server. Per le rettifiche reali servono gli
esiti effettivi delle otto sedute passate sopra, non una conversione automatica
in Fatto. Il controllo attuale registra il problema e la logica proposta;
non dichiara tali ulteriori difetti risolti o pubblicati.

Stato Git del controllo: feature/whatsapp-agenda-pt-v1, HEAD 233e240;
solo questo rapporto aggiornato rispetto alla precedente consegna, modifiche
preesistenti preservate. Verifiche: query SQL in sola lettura, ricostruzione
registro, riproduzione sintetica sulla funzione di produzione, git diff --check.
