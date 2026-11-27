# Portale PT — correzioni 27 novembre 2026

Baseline produzione: 6b06a4346ba753931223f2d6. Il frontend iniziale è stato recuperato dalla produzione; il backend del ramo Git è precedente e NON viene ridistribuito.

- Autosave locale immediato e invio al server dopo 600 ms di inattività.
- Risultati e note non completano implicitamente una seduta. Solo «Completa seduta» e la conferma di rilettura aggiornano lo stato condiviso.
- Suggerimento della prossima seduta basato sul primo slot non completato; una registrazione parziale non salta le sedute precedenti.
- Riferimenti ai carichi filtrati per la data della seduta consultata, anche tra programmi.
- Nuovi programmi in preparazione; attivazione esplicita dalla data assegnata. Mese successivo con nome/data nuovi e prima settimana, senza sovrascrivere storico e carichi originali.

Validazione: 66 test Node superati, adapter editor superato, 14 script frontend con sintassi valida. Prove JSDOM sui moduli reali per autosave, reload, offline, retry di sola lettura e completamento concorrente; PostgreSQL locale per conflitti, permessi e attivazione mesocicli. Test legacy aggiornati nei mock per dipendenze del frontend realmente pubblicato.

Rilascio isolato: quattro asset frontend; 62 altri file e 22 funzioni con digest invariati, due pianificazioni preservate. Migrazione solo sulle due funzioni di selezione/attivazione programma, senza riscrittura storica o modifica dei privilegi. Non usare netlify.toml del ramo per pubblicare l'intero repository.

Limiti: prove con dati sintetici, nessuna modifica ai clienti reali. I completamenti storici generati dal comportamento precedente non vengono reinterpretati. Restano distinte chiusura del registro allenamenti e contabilizzazione dell'appuntamento in Calendario. Il singolo monitor «Conferma mancante» non prova la perdita dei dati: la relativa richiesta del programma di Nicola era presente sul server; non viene falsificata la conferma del dispositivo.
